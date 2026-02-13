/**
 * Character needs system.
 * Each need: 0 (desperate) to 100 (satisfied).
 * Decay rates are per game-minute.
 */
export class Needs {
    constructor() {
        this.hunger = 80 + Math.random() * 20;
        this.energy = 70 + Math.random() * 30;
        this.social = 50 + Math.random() * 30;
        this.comfort = 60 + Math.random() * 30;
        this.fun = 40 + Math.random() * 40;
        this.hygiene = 70 + Math.random() * 30;
        this.bladder = 60 + Math.random() * 40;
    }

    static DECAY_RATES = {
        hunger: 0.08,
        energy: 0.05,
        social: 0.03,
        comfort: 0.02,
        fun: 0.06,
        hygiene: 0.02,
        bladder: 0.1
    };

    static NEED_NAMES = Object.keys(Needs.DECAY_RATES);

    update(deltaMinutes) {
        for (const [need, rate] of Object.entries(Needs.DECAY_RATES)) {
            this[need] = Math.max(0, this[need] - rate * deltaMinutes);
        }
    }

    modify(need, amount) {
        if (this[need] === undefined) return;
        this[need] = Math.max(0, Math.min(100, this[need] + amount));
    }

    getLowestNeed() {
        let lowest = { name: null, value: 100 };
        for (const need of Needs.NEED_NAMES) {
            if (this[need] < lowest.value) {
                lowest = { name: need, value: this[need] };
            }
        }
        return lowest;
    }

    getOverallMood() {
        const weights = {
            hunger: 1.2, energy: 1.1, social: 0.8,
            comfort: 0.7, fun: 1.0, hygiene: 0.6, bladder: 0.9
        };
        let total = 0, weightSum = 0;
        for (const [need, weight] of Object.entries(weights)) {
            total += this[need] * weight;
            weightSum += weight * 100;
        }
        return (total / weightSum) * 100;
    }

    serialize() {
        return {
            hunger: Math.round(this.hunger),
            energy: Math.round(this.energy),
            social: Math.round(this.social),
            comfort: Math.round(this.comfort),
            fun: Math.round(this.fun),
            hygiene: Math.round(this.hygiene),
            bladder: Math.round(this.bladder)
        };
    }
}
