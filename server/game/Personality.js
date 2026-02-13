/**
 * Big Five personality model.
 * Each trait ranges from 0.0 to 1.0.
 */
export class Personality {
    constructor(data = {}) {
        this.openness = data.openness ?? Math.random();
        this.conscientiousness = data.conscientiousness ?? Math.random();
        this.extraversion = data.extraversion ?? Math.random();
        this.agreeableness = data.agreeableness ?? Math.random();
        this.neuroticism = data.neuroticism ?? Math.random();
    }

    getTraitDescriptions() {
        const traits = [];
        if (this.openness > 0.7) traits.push('Creative');
        else if (this.openness < 0.3) traits.push('Practical');
        if (this.conscientiousness > 0.7) traits.push('Organized');
        else if (this.conscientiousness < 0.3) traits.push('Carefree');
        if (this.extraversion > 0.7) traits.push('Outgoing');
        else if (this.extraversion < 0.3) traits.push('Introverted');
        if (this.agreeableness > 0.7) traits.push('Friendly');
        else if (this.agreeableness < 0.3) traits.push('Competitive');
        if (this.neuroticism > 0.7) traits.push('Sensitive');
        else if (this.neuroticism < 0.3) traits.push('Confident');
        return traits;
    }

    serialize() {
        return {
            openness: this.openness,
            conscientiousness: this.conscientiousness,
            extraversion: this.extraversion,
            agreeableness: this.agreeableness,
            neuroticism: this.neuroticism
        };
    }
}
