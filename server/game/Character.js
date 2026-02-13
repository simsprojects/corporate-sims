import { Personality } from './Personality.js';
import { Needs } from './Needs.js';
import { EmotionalState } from './EmotionalState.js';
import { Memory } from './Memory.js';
import { findAreaAt } from './officeLayout.js';

export class Character {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.isPlayer = config.isPlayer || false;

        // Appearance
        this.appearance = {
            skinTone: config.skinTone || '#f5d0b0',
            hairColor: config.hairColor || '#2a1a0a',
            hairStyle: config.hairStyle || 'short',
            shirtColor: config.shirtColor || '#3498db',
            pantsColor: config.pantsColor || '#2c3e50',
            eyeColor: config.eyeColor || '#4a3a2a'
        };

        // Position & Movement
        this.x = config.x || 300;
        this.y = config.y || 300;
        this.targetX = null;
        this.targetY = null;
        this.speed = 30; // pixels per game minute
        this.state = 'idle'; // idle, walking, sitting, working, talking, standing
        this.facingRight = true;

        // Core Systems
        this.personality = new Personality(config.personality);
        this.needs = new Needs();
        this.emotions = new EmotionalState();
        this.memory = new Memory();

        // Action System
        this.currentAction = null;
        this.actionProgress = 0;
        this.queuedAction = null;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.expression = 'neutral';

        // Speech
        this.speechBubble = null;
        this.speechTimer = 0;

        // Schedule
        this.schedule = this._generateSchedule();

        // Stats
        this.role = config.role || 'Employee';
        this.slackPoints = 0;
    }

    _generateSchedule() {
        return {
            wakeUp: 540 + Math.floor((1 - this.personality.conscientiousness) * 60),
            workStart: 540,
            lunchTime: 720 + Math.floor(Math.random() * 60),
            workEnd: 1020,
            preferredBreakSpots: this.personality.extraversion > 0.5
                ? ['lounge', 'kitchen'] : ['bathroom', 'cubicle']
        };
    }

    // ========== MOVEMENT ==========

    moveTo(targetX, targetY) {
        this.targetX = targetX;
        this.targetY = targetY;
        this.state = 'walking';
    }

    updateMovement(deltaMinutes) {
        if (this.targetX === null || this.targetY === null) return;

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.targetX = null;
            this.targetY = null;
            if (this.state === 'walking') this.state = 'idle';
        } else {
            const moveSpeed = this.speed * deltaMinutes;
            const step = Math.min(moveSpeed, dist);
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
            this.facingRight = dx > 0;
            this.state = 'walking';
        }
    }

    getCurrentArea(officeAreas) {
        if (officeAreas) return findAreaAt(this.x, this.y);
        return findAreaAt(this.x, this.y);
    }

    // ========== ACTIONS ==========

    startAction(action) {
        this.currentAction = action;
        this.actionProgress = 0;
        this.state = action.state || 'working';

        this.memory.addEvent({
            type: 'action_start',
            action: action.id,
            location: this.getCurrentArea()?.id,
            impact: 0,
            timestamp: Date.now()
        });

        if (action.speech && Math.random() < 0.5) {
            this.say(action.speech[Math.floor(Math.random() * action.speech.length)]);
        }
    }

    updateAction(deltaMinutes) {
        if (!this.currentAction) return;

        this.actionProgress += deltaMinutes;

        // Continuous effects
        if (this.currentAction.continuousEffects) {
            for (const [need, rate] of Object.entries(this.currentAction.continuousEffects)) {
                this.needs.modify(need, rate * deltaMinutes);
            }
        }

        // Check completion
        if (this.actionProgress >= this.currentAction.duration) {
            this.completeAction();
        }
    }

    completeAction() {
        const action = this.currentAction;
        if (!action) return;

        // Apply final need effects
        if (action.needEffects) {
            for (const [need, effect] of Object.entries(action.needEffects)) {
                this.needs.modify(need, effect);
            }
        }

        // Apply emotion effects
        if (action.emotionEffects) {
            for (const [emotion, effect] of Object.entries(action.emotionEffects)) {
                this.emotions.modify(emotion, effect);
            }
        }

        // Slack points
        if (action.slackPoints) {
            this.slackPoints += action.slackPoints;
        }

        // Memory
        this.memory.addEvent({
            type: 'action_complete',
            action: action.id,
            impact: action.slackPoints || 0,
            timestamp: Date.now()
        });

        // Reset state
        this.state = 'idle';
        this.currentAction = null;
        this.actionProgress = 0;

        return action; // Return completed action for stats tracking
    }

    // ========== SPEECH ==========

    say(text, duration = 3000) {
        this.speechBubble = text;
        this.speechTimer = duration;
    }

    // ========== ANIMATION ==========

    updateAnimation(deltaMs) {
        this.animTimer += deltaMs;
        if (this.animTimer > 200) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        if (this.speechTimer > 0) {
            this.speechTimer -= deltaMs;
            if (this.speechTimer <= 0) {
                this.speechBubble = null;
            }
        }

        const dom = this.emotions.getDominantEmotion();
        this.expression = dom.emotion;
    }

    // ========== SERIALIZATION ==========

    serialize() {
        return {
            id: this.id,
            name: this.name,
            isPlayer: this.isPlayer,
            role: this.role,
            x: Math.round(this.x),
            y: Math.round(this.y),
            facingRight: this.facingRight,
            state: this.state,
            expression: this.expression,
            animFrame: this.animFrame,
            appearance: { ...this.appearance },
            needs: this.needs.serialize(),
            emotion: this.emotions.serialize(),
            personality: { traits: this.personality.getTraitDescriptions() },
            currentAction: this.currentAction ? {
                id: this.currentAction.id,
                name: this.currentAction.name,
                progress: Math.round(this.actionProgress),
                duration: this.currentAction.duration
            } : null,
            speechBubble: this.speechBubble,
            slackPoints: this.slackPoints
        };
    }

    serializeCompact() {
        return {
            i: this.id,
            x: Math.round(this.x),
            y: Math.round(this.y),
            f: this.facingRight ? 1 : 0,
            s: this.state,
            ap: this.currentAction
                ? Math.round((this.actionProgress / this.currentAction.duration) * 100)
                : 0,
            ac: this.currentAction?.id || null,
            sp: this.speechBubble || null,
            ex: this.expression,
            af: this.animFrame
        };
    }

    serializeNeeds() {
        return {
            i: this.id,
            h: Math.round(this.needs.hunger),
            e: Math.round(this.needs.energy),
            s: Math.round(this.needs.social),
            c: Math.round(this.needs.comfort),
            f: Math.round(this.needs.fun),
            y: Math.round(this.needs.hygiene),
            b: Math.round(this.needs.bladder)
        };
    }
}
