import { TICK } from '../config.js';
import { ACTIONS } from '../game/actions.js';

/**
 * Serializes game state into snapshots and deltas for network transmission.
 * Snapshots: full state (on join + every 5s).
 * Deltas: compact changed fields (every tick).
 */

// Pre-build the client actions list (only fields the client needs)
const CLIENT_ACTIONS = ACTIONS.map(a => ({
    id: a.id,
    name: a.name,
    category: a.category,
    duration: a.duration,
    requiresArea: a.requiresArea || null,
    slackPoints: a.slackPoints || 0,
    isCoworkerAction: a.isCoworkerAction || false
}));

export class StateSerializer {
    constructor() {
        this.lastNeedsBroadcast = 0;
    }

    fullSnapshot(room) {
        const chars = [];
        for (const [, char] of room.characters) {
            chars.push(char.serialize());
        }

        return {
            type: 'snapshot',
            timestamp: Date.now(),
            game: {
                day: room.gameState.day,
                time: Math.round(room.gameState.time),
                speed: room.gameState.speed
            },
            characters: chars,
            players: Array.from(room.players.values()).map(p => ({
                id: p.playerId,
                characterId: p.characterId
            })),
            actions: CLIENT_ACTIONS
        };
    }

    buildDelta(room) {
        const now = Date.now();
        const delta = {
            type: 'delta',
            t: now,
            g: {
                d: room.gameState.day,
                m: Math.round(room.gameState.time)
            },
            c: []
        };

        // Character compact positions + state
        for (const [, char] of room.characters) {
            delta.c.push(char.serializeCompact());
        }

        // Needs (sent every ~500ms, not every tick)
        if (now - this.lastNeedsBroadcast >= TICK.NEEDS_BROADCAST_INTERVAL) {
            this.lastNeedsBroadcast = now;
            delta.n = [];
            for (const [, char] of room.characters) {
                delta.n.push(char.serializeNeeds());
            }
        }

        return delta;
    }
}
