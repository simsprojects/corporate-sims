/**
 * Emotional state system.
 * Emotions influence behavior, expressions, and speech.
 */
export class EmotionalState {
    constructor() {
        this.happiness = 50;
        this.anger = 0;
        this.sadness = 0;
        this.anxiety = 20;
        this.boredom = 30;
        this.excitement = 20;
    }

    static EMOTIONS = ['happiness', 'anger', 'sadness', 'anxiety', 'boredom', 'excitement'];

    getDominantEmotion() {
        let dominant = { emotion: 'neutral', intensity: 0 };
        for (const emotion of EmotionalState.EMOTIONS) {
            if (this[emotion] > dominant.intensity && this[emotion] > 30) {
                dominant = { emotion, intensity: this[emotion] };
            }
        }
        return dominant;
    }

    getEmoji() {
        const dom = this.getDominantEmotion();
        const emojis = {
            happiness: '😊', anger: '😠', sadness: '😢',
            anxiety: '😰', boredom: '😑', excitement: '🤩', neutral: '😐'
        };
        return emojis[dom.emotion];
    }

    updateFromNeeds(needs) {
        // Low needs create negative emotions
        if (needs.hunger < 30) { this.anger += 0.5; this.happiness -= 0.3; }
        if (needs.energy < 30) { this.sadness += 0.3; this.happiness -= 0.2; }
        if (needs.social < 30) { this.sadness += 0.4; this.boredom += 0.3; }
        if (needs.fun < 30) { this.boredom += 0.5; this.happiness -= 0.3; }

        // High needs create positive emotions
        if (needs.hunger > 80) this.happiness += 0.2;
        if (needs.social > 70) { this.happiness += 0.3; this.excitement += 0.2; }
        if (needs.fun > 70) { this.happiness += 0.4; this.boredom -= 0.5; }

        // Clamp all values
        for (const emotion of EmotionalState.EMOTIONS) {
            this[emotion] = Math.max(0, Math.min(100, this[emotion]));
        }

        // Natural decay toward neutral
        for (const emotion of EmotionalState.EMOTIONS) {
            if (emotion === 'happiness') {
                this[emotion] += (50 - this[emotion]) * 0.01;
            } else {
                this[emotion] *= 0.99;
            }
        }
    }

    modify(emotion, amount) {
        if (this[emotion] === undefined) return;
        this[emotion] = Math.max(0, Math.min(100, this[emotion] + amount));
    }

    serialize() {
        return {
            dominant: this.getDominantEmotion(),
            emoji: this.getEmoji()
        };
    }
}
