import { EventEmitter } from 'events';
import { Character } from './Character.js';
import { ACTIONS } from './actions.js';
import { OFFICE_AREAS } from './officeLayout.js';
import { NPC_CONFIGS } from './npcConfigs.js';
import { AIEngine } from '../ai/AIEngine.js';
import { ActionProcessor } from './ActionProcessor.js';
import { StateSerializer } from '../network/StateSerializer.js';
import { TICK, GAME } from '../config.js';

const WEEKLY_QUOTES = [
    '"Another week of pretending to work. Nailed it."',
    '"I survived 40 hours of corporate America. Where\'s my medal?"',
    '"They say hard work pays off. They clearly haven\'t met you."',
    '"Your contribution this week was... present. You were present."',
    '"Work smarter, not harder. You chose option C: barely."',
    '"In a world of overachievers, you chose peace."',
    '"Your desk misses you. You were never there."',
    '"Productivity is overrated. You proved that this week."',
    '"If doing nothing was an Olympic sport..."',
    '"The office plant outperformed you. And it\'s fake."'
];

const PERFORMANCE_RANKS = [
    { min: -100, rank: 'Corporate Casualty', color: '#e94560' },
    { min: -50, rank: 'Warm Body', color: '#e97045' },
    { min: -10, rank: 'Suspiciously Quiet', color: '#e99545' },
    { min: 0, rank: 'Perfectly Adequate', color: '#ffd700' },
    { min: 30, rank: 'Professional Slacker', color: '#a0d060' },
    { min: 60, rank: 'Slack Artisan', color: '#60d080' },
    { min: 100, rank: 'Stealth Expert', color: '#40c0c0' },
    { min: 150, rank: 'Corporate Ninja', color: '#4090d0' },
    { min: 200, rank: 'Absolute Legend', color: '#9060d0' }
];

/**
 * GameRoom — one room = one office simulation instance.
 * Runs its own server-side tick loop.
 * Manages players, NPCs, game state, and broadcasting.
 */
export class GameRoom extends EventEmitter {
    constructor(roomId) {
        super();
        this.id = roomId;
        this.players = new Map();       // socketId → { socket, playerId, characterId }
        this.characters = new Map();    // charId → Character
        this.npcs = new Map();          // charId → { character, aiEngine }
        this.inputQueue = [];

        this.tickTimer = null;
        this.snapshotTimer = null;
        this.aiTimer = null;
        this.lastTickTime = Date.now();

        this.gameState = {
            day: 1,
            time: GAME.DAY_START,
            speed: 1,
            weeklyStats: new Map()
        };

        this.serializer = new StateSerializer();
        this.actionProcessor = new ActionProcessor();

        this._spawnDefaultNPCs();
    }

    get playerCount() { return this.players.size; }

    // ========== LIFECYCLE ==========

    start() {
        console.log(`[Room ${this.id}] Starting (${TICK.RATE} Hz, ${this.npcs.size} NPCs)`);
        this.lastTickTime = Date.now();
        this.tickTimer = setInterval(() => this.tick(), TICK.INTERVAL);
        this.snapshotTimer = setInterval(() => this.broadcastSnapshot(), TICK.SNAPSHOT_INTERVAL);
        this.aiTimer = setInterval(() => this.runAI(), TICK.AI_THINK_INTERVAL);
    }

    stop() {
        clearInterval(this.tickTimer);
        clearInterval(this.snapshotTimer);
        clearInterval(this.aiTimer);
        console.log(`[Room ${this.id}] Stopped`);
    }

    // ========== PLAYER MANAGEMENT ==========

    addPlayer(socket, playerId, charConfig) {
        const char = new Character({
            ...charConfig,
            id: playerId,
            isPlayer: true,
            x: 180 + Math.random() * 100,
            y: 260 + Math.random() * 40
        });

        this.characters.set(playerId, char);
        this.players.set(socket.id, {
            socket, playerId, characterId: playerId
        });
        this.gameState.weeklyStats.set(playerId, this._freshWeeklyStats());

        // Send full snapshot to joining player
        socket.emit('state:snapshot', this.serializer.fullSnapshot(this));

        // Notify others
        socket.to(this.id).emit('room:playerJoined', {
            playerId,
            characterName: char.name
        });

        console.log(`[Room ${this.id}] ${char.name} joined (${this.playerCount} players)`);
    }

    removePlayer(socketId) {
        const player = this.players.get(socketId);
        if (!player) return;

        const char = this.characters.get(player.characterId);
        this.characters.delete(player.characterId);
        this.gameState.weeklyStats.delete(player.playerId);
        this.players.delete(socketId);

        for (const [, p] of this.players) {
            p.socket.emit('room:playerLeft', { playerId: player.playerId });
        }

        console.log(`[Room ${this.id}] ${char?.name || '?'} left (${this.playerCount} players)`);

        if (this.playerCount === 0) {
            this.emit('empty');
        }
    }

    // ========== INPUT QUEUE ==========

    queueInput(socketId, input) {
        const player = this.players.get(socketId);
        if (!player) return;
        this.inputQueue.push({ playerId: player.playerId, ...input });
    }

    _processInputs() {
        while (this.inputQueue.length > 0) {
            const input = this.inputQueue.shift();
            const char = this.characters.get(input.playerId);
            if (!char) continue;

            switch (input.type) {
                case 'action:perform': {
                    const ctx = this._getContext(char);
                    const result = this.actionProcessor.tryPerformAction(char, input.actionId, ctx);
                    if (result.needsMove) {
                        char.queuedAction = input.actionId;
                        char.moveTo(result.targetX, result.targetY);
                    }
                    break;
                }
                case 'action:cancel':
                    char.currentAction = null;
                    char.actionProgress = 0;
                    char.state = 'idle';
                    break;

                case 'player:move':
                    if (!char.currentAction) {
                        char.moveTo(input.targetX, input.targetY);
                    }
                    break;

                case 'player:speak':
                    char.say(input.text, 3000);
                    this._broadcastToAll('char:speech', {
                        charId: char.id, text: input.text, duration: 3000
                    });
                    break;
            }
        }
    }

    // ========== CORE TICK ==========

    tick() {
        const now = Date.now();
        const realDeltaMs = Math.min(now - this.lastTickTime, 200); // Cap to avoid spiral
        this.lastTickTime = now;

        const realDeltaSec = realDeltaMs / 1000;
        const gameDeltaMinutes = realDeltaSec * GAME.MINUTES_PER_SECOND * this.gameState.speed;

        // 1. Process inputs
        this._processInputs();

        // 2. Advance clock
        this.gameState.time += gameDeltaMinutes;

        // 3. Day/week boundaries
        if (this.gameState.time >= GAME.DAY_END) {
            this.gameState.day++;
            this.gameState.time = GAME.DAY_START;

            // Week end check
            if (this.gameState.day % GAME.DAYS_PER_WEEK === 1 && this.gameState.day > 1) {
                this._triggerWeeklySummary();
            }
        }

        // 4. Update all characters
        for (const [, char] of this.characters) {
            char.needs.update(gameDeltaMinutes);
            char.emotions.updateFromNeeds(char.needs);
            char.updateMovement(gameDeltaMinutes);
            char.updateAction(gameDeltaMinutes);
            char.updateAnimation(realDeltaMs);

            // Track completed coworker actions
            if (!char.isPlayer && char.currentAction === null && char._lastCompletedAction) {
                const completed = char._lastCompletedAction;
                if (completed.makesYouLookBad) {
                    for (const [, stats] of this.gameState.weeklyStats) {
                        stats.coworkerShame.push(
                            `${char.name} ${completed.speech?.[0] || 'worked harder than you'}`
                        );
                        stats.slackPoints -= 5;
                    }
                }
                char._lastCompletedAction = null;
            }

            // Check queued actions for players
            if (char.isPlayer && char.queuedAction && char.state === 'idle') {
                const ctx = this._getContext(char);
                const result = this.actionProcessor.tryPerformAction(char, char.queuedAction, ctx);
                if (result.success) {
                    char.queuedAction = null;
                    // Track player stats
                    this._trackPlayerAction(char, result);
                }
            }

            // Track player action completion
            if (char.isPlayer && !char.currentAction && char._justCompleted) {
                this._trackPlayerActionComplete(char, char._justCompleted);
                char._justCompleted = null;
            }
        }

        // 5. Broadcast delta
        if (this.playerCount > 0) {
            const delta = this.serializer.buildDelta(this);
            if (delta) {
                this._broadcastToAll('state:delta', delta);
            }
        }
    }

    // ========== AI ==========

    runAI() {
        for (const [charId, npcData] of this.npcs) {
            const char = this.characters.get(charId);
            if (!char) continue;
            if (char.currentAction || char.state === 'walking') continue;

            const ctx = this._getContext(char);
            const decision = npcData.aiEngine.think(char, ctx);

            if (decision) {
                if (decision.moveTo) {
                    char.moveTo(decision.moveTo.x, decision.moveTo.y);
                }
                if (decision.action) {
                    this.actionProcessor.executeAction(char, decision.action, ctx);
                }
            }
        }
    }

    // ========== HELPERS ==========

    _getContext(char) {
        const allChars = Array.from(this.characters.values());
        const nearbyChars = allChars.filter(c =>
            c.id !== char.id &&
            Math.hypot(c.x - char.x, c.y - char.y) < 100
        );
        return {
            characters: allChars,
            nearbyChars,
            targetChar: nearbyChars[0] || null,
            area: char.getCurrentArea(),
            timeOfDay: this.gameState.time,
            day: this.gameState.day
        };
    }

    _broadcastToAll(event, data) {
        for (const [, player] of this.players) {
            player.socket.emit(event, data);
        }
    }

    broadcastSnapshot() {
        if (this.playerCount === 0) return;
        const snapshot = this.serializer.fullSnapshot(this);
        this._broadcastToAll('state:snapshot', snapshot);
    }

    _spawnDefaultNPCs() {
        for (const config of NPC_CONFIGS) {
            const char = new Character(config);
            this.characters.set(config.id, char);
            this.npcs.set(config.id, {
                character: char,
                aiEngine: new AIEngine(char, ACTIONS, OFFICE_AREAS)
            });
        }
    }

    _freshWeeklyStats() {
        return {
            slackPoints: 0, meetingsAvoided: 0, workDone: 0,
            coffeeDrunk: 0, bathroomTrips: 0, coworkerShame: []
        };
    }

    _trackPlayerAction(char, result) {
        // Called when player starts an action
    }

    _trackPlayerActionComplete(char, action) {
        const stats = this.gameState.weeklyStats.get(char.id);
        if (!stats) return;

        if (action.slackPoints) stats.slackPoints += action.slackPoints;
        if (action.category === 'work') stats.workDone++;
        if (action.requiresArea === 'meeting' && action.category === 'slack') stats.meetingsAvoided++;
        if (action.id === 'coffee') stats.coffeeDrunk++;
        if (action.requiresArea === 'bathroom') stats.bathroomTrips++;
    }

    _triggerWeeklySummary() {
        const quote = WEEKLY_QUOTES[Math.floor(Math.random() * WEEKLY_QUOTES.length)];
        const week = Math.ceil(this.gameState.day / GAME.DAYS_PER_WEEK);

        for (const [, player] of this.players) {
            const stats = this.gameState.weeklyStats.get(player.playerId);
            if (!stats) continue;

            // Calculate rank
            let rank = PERFORMANCE_RANKS[0];
            for (const r of PERFORMANCE_RANKS) {
                if (stats.slackPoints >= r.min) rank = r;
            }

            // Deduplicate shame
            const uniqueShame = [...new Set(stats.coworkerShame)].slice(0, 5);

            player.socket.emit('event:weekly', {
                week,
                quote,
                stats: { ...stats, coworkerShame: uniqueShame },
                rank: { name: rank.rank, color: rank.color }
            });

            // Reset for next week
            this.gameState.weeklyStats.set(player.playerId, this._freshWeeklyStats());
        }
    }
}
