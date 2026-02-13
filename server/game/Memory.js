/**
 * Memory system — stores events and relationship data.
 */
export class Memory {
    constructor() {
        this.shortTerm = [];  // Recent events (last ~20)
        this.longTerm = [];   // Important/repeated events (last ~50)
        this.relationships = new Map(); // charId -> RelationshipData
    }

    addEvent(event) {
        event.timestamp = event.timestamp || 0;
        this.shortTerm.unshift(event);

        if (this.shortTerm.length > 20) {
            const old = this.shortTerm.pop();
            if (Math.abs(old.impact || 0) > 5) {
                this.longTerm.unshift(old);
                if (this.longTerm.length > 50) this.longTerm.pop();
            }
        }
    }

    getRelationship(charId) {
        if (!this.relationships.has(charId)) {
            this.relationships.set(charId, {
                friendship: 0,
                romance: 0,
                interactionCount: 0,
                lastInteraction: null,
                history: []
            });
        }
        return this.relationships.get(charId);
    }

    modifyRelationship(charId, friendshipDelta, romanceDelta = 0) {
        const rel = this.getRelationship(charId);
        rel.friendship = Math.max(-100, Math.min(100, rel.friendship + friendshipDelta));
        rel.romance = Math.max(0, Math.min(100, rel.romance + romanceDelta));
        rel.interactionCount++;
        rel.lastInteraction = Date.now();
    }

    getRecentMemoriesAbout(charId) {
        return this.shortTerm.filter(m => m.involvedChar === charId);
    }

    serialize() {
        const relationships = {};
        for (const [id, rel] of this.relationships) {
            relationships[id] = {
                friendship: rel.friendship,
                romance: rel.romance,
                interactionCount: rel.interactionCount
            };
        }
        return {
            recentEvents: this.shortTerm.slice(0, 5).map(e => ({
                type: e.type,
                action: e.action,
                impact: e.impact
            })),
            relationships
        };
    }
}
