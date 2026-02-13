/**
 * GameClient — receives server state via Socket.io, manages client-side
 * character objects with position interpolation between 100ms server ticks.
 * Renders at 60fps using ease-out interpolation for smooth movement.
 */

/**
 * Client-side representation of a character.
 * Holds server-authoritative data plus interpolated display positions.
 */
class ClientCharacter {
    constructor(data) {
        // Identity
        this.id = data.id;
        this.name = data.name;
        this.isPlayer = data.isPlayer || false;
        this.role = data.role || 'Employee';

        // Server-authoritative position
        this.serverX = data.x;
        this.serverY = data.y;
        this.prevX = data.x;
        this.prevY = data.y;

        // Interpolated display position
        this.displayX = data.x;
        this.displayY = data.y;

        // Interpolation timing
        this.interpStart = performance.now();
        this.interpDuration = 100; // matches server tick rate

        // State
        this.facingRight = data.facingRight !== undefined ? data.facingRight : true;
        this.state = data.state || 'idle';
        this.expression = data.expression || 'neutral';
        this.animFrame = data.animFrame || 0;

        // Appearance
        this.appearance = data.appearance || {
            skinTone: '#f5d0b0',
            hairColor: '#2a1a0a',
            hairStyle: 'short',
            shirtColor: '#3498db',
            pantsColor: '#2c3e50',
            eyeColor: '#4a3a2a'
        };

        // Needs (0-100 each)
        this.needs = data.needs || {
            hunger: 80, energy: 80, social: 50,
            comfort: 60, fun: 50, hygiene: 70, bladder: 60
        };

        // Emotion data
        this.emotion = data.emotion || { dominant: { emotion: 'neutral', intensity: 0 }, emoji: '\u{1F610}' };

        // Personality
        this.personality = data.personality || { traits: [] };

        // Action
        this.currentAction = data.currentAction || null;

        // Speech
        this.speechBubble = data.speechBubble || null;
        this.speechTimer = data.speechBubble ? 3000 : 0;

        // Slack points
        this.slackPoints = data.slackPoints || 0;

        // Memory (from snapshot)
        this.memory = data.memory || null;
    }

    /**
     * Update position target from server delta.
     * Stores previous display position for interpolation start.
     */
    setServerPosition(x, y) {
        this.prevX = this.displayX;
        this.prevY = this.displayY;
        this.serverX = x;
        this.serverY = y;
        this.interpStart = performance.now();
    }

    /**
     * Ease-out interpolation: fast start, smooth arrival.
     * t goes from 0 to 1 over interpDuration ms.
     */
    interpolate(now) {
        const elapsed = now - this.interpStart;
        let t = Math.min(elapsed / this.interpDuration, 1.0);

        // Ease-out cubic: 1 - (1-t)^3
        t = 1 - Math.pow(1 - t, 3);

        this.displayX = this.prevX + (this.serverX - this.prevX) * t;
        this.displayY = this.prevY + (this.serverY - this.prevY) * t;
    }

    /**
     * Apply compact delta fields from server.
     */
    applyDelta(compact) {
        if (compact.x !== undefined && compact.y !== undefined) {
            this.setServerPosition(compact.x, compact.y);
        }
        if (compact.f !== undefined) {
            this.facingRight = compact.f === 1;
        }
        if (compact.s !== undefined) {
            this.state = compact.s;
        }
        if (compact.ex !== undefined) {
            this.expression = compact.ex;
        }
        if (compact.af !== undefined) {
            this.animFrame = compact.af;
        }
        if (compact.ac !== undefined) {
            if (compact.ac === null) {
                this.currentAction = null;
            } else {
                // Keep existing action data, update progress
                if (!this.currentAction || this.currentAction.id !== compact.ac) {
                    this.currentAction = { id: compact.ac, name: compact.ac, progress: compact.ap || 0, duration: 100 };
                } else {
                    this.currentAction.progress = compact.ap || 0;
                }
            }
        }
        if (compact.sp !== undefined) {
            if (compact.sp !== null && compact.sp !== this.speechBubble) {
                this.speechBubble = compact.sp;
                this.speechTimer = 3000;
            } else if (compact.sp === null) {
                this.speechBubble = null;
                this.speechTimer = 0;
            }
        }
    }

    /**
     * Apply needs delta (compact format).
     */
    applyNeeds(needsData) {
        this.needs.hunger = needsData.h;
        this.needs.energy = needsData.e;
        this.needs.social = needsData.s;
        this.needs.comfort = needsData.c;
        this.needs.fun = needsData.f;
        this.needs.hygiene = needsData.y;
        this.needs.bladder = needsData.b;
    }

    /**
     * Full state update from snapshot.
     */
    applySnapshot(data) {
        this.name = data.name;
        this.isPlayer = data.isPlayer;
        this.role = data.role;
        this.facingRight = data.facingRight;
        this.state = data.state;
        this.expression = data.expression;
        this.animFrame = data.animFrame;
        this.appearance = data.appearance;
        this.needs = data.needs;
        this.emotion = data.emotion;
        this.personality = data.personality;
        this.currentAction = data.currentAction;
        this.slackPoints = data.slackPoints;

        if (data.speechBubble && data.speechBubble !== this.speechBubble) {
            this.speechBubble = data.speechBubble;
            this.speechTimer = 3000;
        } else if (!data.speechBubble) {
            this.speechBubble = null;
            this.speechTimer = 0;
        }

        // Only snap position if significantly different (avoid jitter)
        const dx = data.x - this.serverX;
        const dy = data.y - this.serverY;
        if (dx * dx + dy * dy > 2500) {
            // Big teleport: snap directly
            this.serverX = data.x;
            this.serverY = data.y;
            this.prevX = data.x;
            this.prevY = data.y;
            this.displayX = data.x;
            this.displayY = data.y;
        } else {
            this.setServerPosition(data.x, data.y);
        }
    }

    /**
     * Update speech timer each frame.
     */
    updateSpeechTimer(deltaMs) {
        if (this.speechTimer > 0) {
            this.speechTimer -= deltaMs;
            if (this.speechTimer <= 0) {
                this.speechBubble = null;
                this.speechTimer = 0;
            }
        }
    }

    /**
     * Compute overall mood from needs (0-100).
     */
    getOverallMood() {
        const n = this.needs;
        const weights = {
            hunger: 1.2, energy: 1.1, social: 0.8,
            comfort: 0.7, fun: 1.0, hygiene: 0.6, bladder: 0.9
        };
        let total = 0, weightSum = 0;
        for (const [need, weight] of Object.entries(weights)) {
            total += (n[need] || 0) * weight;
            weightSum += weight * 100;
        }
        return (total / weightSum) * 100;
    }
}


/**
 * GameClient — the main state manager.
 * Receives snapshots and deltas from server, maintains Map<id, ClientCharacter>.
 */
export class GameClient {
    constructor() {
        /** @type {Map<string, ClientCharacter>} */
        this.characters = new Map();

        // Game time
        this.gameDay = 1;
        this.gameTime = 540; // 9:00 AM in minutes
        this.gameSpeed = 1;

        // Player info
        this.playerId = null;
        this.selectedCharId = null;

        // Actions (populated from snapshot)
        this.actions = [];

        // Players list
        this.players = [];

        // Callbacks
        this.onSnapshot = null;
        this.onDelta = null;
        this.onCharacterUpdate = null;
        this.onWeeklySummary = null;
        this.onNotification = null;
    }

    /**
     * Bind to a Socket.io socket instance.
     */
    bindSocket(socket) {
        this.socket = socket;

        socket.on('state:snapshot', (data) => this._handleSnapshot(data));
        socket.on('state:delta', (data) => this._handleDelta(data));
        socket.on('event:weekly', (data) => this._handleWeeklySummary(data));
        socket.on('char:speech', (data) => this._handleSpeech(data));
        socket.on('room:playerJoined', (data) => this._handlePlayerJoined(data));
        socket.on('room:playerLeft', (data) => this._handlePlayerLeft(data));
        socket.on('error', (data) => {
            console.error('[GameClient] Server error:', data.message);
            if (this.onNotification) this.onNotification('Error: ' + data.message);
        });
    }

    /**
     * Handle full state snapshot from server.
     */
    _handleSnapshot(data) {
        // Update game state
        this.gameDay = data.game.day;
        this.gameTime = data.game.time;
        this.gameSpeed = data.game.speed;
        this.players = data.players || [];

        // Find our player ID
        if (!this.playerId && this.socket) {
            const us = data.players.find(p => p.id === `player_${this.socket.id}`);
            if (us) {
                this.playerId = us.characterId;
                this.selectedCharId = this.playerId;
            }
        }

        // Actions from snapshot (if included)
        if (data.actions) {
            this.actions = data.actions;
        }

        // Track which characters are in this snapshot
        const snapshotIds = new Set();

        for (const charData of data.characters) {
            snapshotIds.add(charData.id);

            if (this.characters.has(charData.id)) {
                // Update existing character
                this.characters.get(charData.id).applySnapshot(charData);
            } else {
                // New character
                this.characters.set(charData.id, new ClientCharacter(charData));
            }
        }

        // Remove characters no longer in snapshot
        for (const [id] of this.characters) {
            if (!snapshotIds.has(id)) {
                this.characters.delete(id);
            }
        }

        if (this.onSnapshot) this.onSnapshot(data);
    }

    /**
     * Handle compact delta from server.
     */
    _handleDelta(data) {
        // Update game time
        if (data.g) {
            this.gameDay = data.g.d;
            this.gameTime = data.g.m;
        }

        // Update character positions and states
        if (data.c) {
            for (const compact of data.c) {
                const char = this.characters.get(compact.i);
                if (char) {
                    char.applyDelta(compact);
                }
            }
        }

        // Update needs (sent less frequently)
        if (data.n) {
            for (const needsData of data.n) {
                const char = this.characters.get(needsData.i);
                if (char) {
                    char.applyNeeds(needsData);
                }
            }
        }

        if (this.onDelta) this.onDelta(data);
    }

    /**
     * Handle direct speech event.
     */
    _handleSpeech(data) {
        const char = this.characters.get(data.charId);
        if (char) {
            char.speechBubble = data.text;
            char.speechTimer = data.duration || 3000;
        }
    }

    /**
     * Handle weekly summary event.
     */
    _handleWeeklySummary(data) {
        if (this.onWeeklySummary) this.onWeeklySummary(data);
    }

    /**
     * Handle player join notification.
     */
    _handlePlayerJoined(data) {
        if (this.onNotification) {
            this.onNotification(`${data.characterName} joined the office!`);
        }
    }

    /**
     * Handle player leave notification.
     */
    _handlePlayerLeft(data) {
        // Character will be removed on next snapshot
        if (this.onNotification) {
            this.onNotification('A coworker left the office.');
        }
    }

    /**
     * Called each frame from the render loop.
     * Interpolates all character positions, updates speech timers.
     */
    update(deltaMs) {
        const now = performance.now();

        for (const [, char] of this.characters) {
            char.interpolate(now);
            char.updateSpeechTimer(deltaMs);
        }
    }

    /**
     * Get the player's character.
     */
    getPlayerCharacter() {
        if (!this.playerId) return null;
        return this.characters.get(this.playerId) || null;
    }

    /**
     * Get the currently selected character.
     */
    getSelectedCharacter() {
        if (!this.selectedCharId) return null;
        return this.characters.get(this.selectedCharId) || null;
    }

    /**
     * Select a character by ID.
     */
    selectCharacter(id) {
        this.selectedCharId = id;
    }

    /**
     * Get all characters sorted by Y position (for depth sorting).
     */
    getCharactersSortedByDepth() {
        return Array.from(this.characters.values())
            .sort((a, b) => a.displayY - b.displayY);
    }

    /**
     * Find character at canvas position (for click detection).
     */
    findCharacterAt(x, y) {
        // Check in reverse depth order (top-most first visually)
        const sorted = this.getCharactersSortedByDepth().reverse();
        for (const char of sorted) {
            const dx = x - char.displayX;
            const dy = y - char.displayY;
            // Hit test: rough bounding box around character sprite
            if (Math.abs(dx) < 18 && dy > -55 && dy < 5) {
                return char;
            }
        }
        return null;
    }
}
