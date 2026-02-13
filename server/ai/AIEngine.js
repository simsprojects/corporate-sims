import { Selector } from './nodes/Selector.js';
import { Sequence } from './nodes/Sequence.js';
import { Condition } from './nodes/Condition.js';
import { ActionNode } from './nodes/ActionNode.js';
import { getRandomPointInArea } from '../game/officeLayout.js';

/**
 * AI Engine — controls NPC decision-making.
 * Uses a hybrid Behavior Tree + Utility AI approach.
 *
 * Behavior tree handles priority structure (survival > social > schedule > emotion > general).
 * Utility scoring handles action selection within each priority level.
 */
export class AIEngine {
    constructor(character, actions, officeAreas) {
        this.character = character;
        this.actions = actions.filter(a => !a.isCoworkerAction);
        this.coworkerActions = actions.filter(a => a.isCoworkerAction);
        this.officeAreas = officeAreas;
        this.behaviorTree = this._buildBehaviorTree();
    }

    /**
     * Main entry point — called every AI_THINK_INTERVAL (3s).
     * Returns { moveTo?, action? } or null.
     */
    think(char, context) {
        // 25% chance NPCs do "makes you look bad" actions
        if (Math.random() < 0.25 && this.coworkerActions.length > 0) {
            const action = this.coworkerActions[Math.floor(Math.random() * this.coworkerActions.length)];
            // Check if area matches
            if (!action.requiresArea || action.requiresArea === context.area?.type) {
                return { action };
            }
        }

        return this.behaviorTree.execute(char, context, this);
    }

    // ========== BEHAVIOR TREE CONSTRUCTION ==========

    _buildBehaviorTree() {
        return new Selector([

            // Priority 1: Critical survival needs (any need < 15)
            new Sequence([
                new Condition((char) => char.needs.getLowestNeed().value < 15),
                new ActionNode((char, ctx, engine) => engine._handleCriticalNeed(char, ctx))
            ]),

            // Priority 2: Respond to nearby social interaction
            new Sequence([
                new Condition((char, ctx) =>
                    ctx.nearbyChars?.some(c => c.state === 'talking') &&
                    char.personality.extraversion > 0.4
                ),
                new ActionNode((char, ctx, engine) => engine._handleSocialResponse(char, ctx))
            ]),

            // Priority 3: Schedule-driven behavior (lunch time)
            new Sequence([
                new Condition((char, ctx) => {
                    const lunch = char.schedule.lunchTime;
                    return Math.abs(ctx.timeOfDay - lunch) < 30 && char.needs.hunger < 60;
                }),
                new ActionNode((char, ctx, engine) => {
                    const kitchen = engine.officeAreas.find(a => a.type === 'kitchen');
                    if (!kitchen) return null;
                    return { moveTo: getRandomPointInArea(kitchen) };
                })
            ]),

            // Priority 4: Emotional reactions (dominant emotion > 60)
            new Sequence([
                new Condition((char) => char.emotions.getDominantEmotion().intensity > 60),
                new ActionNode((char, ctx, engine) => engine._handleEmotionalReaction(char, ctx))
            ]),

            // Priority 5: General utility-based decision
            new ActionNode((char, ctx, engine) => engine._utilityBasedDecision(char, ctx))
        ]);
    }

    // ========== DECISION STRATEGIES ==========

    _handleCriticalNeed(char, ctx) {
        const lowest = char.needs.getLowestNeed();
        const needToArea = {
            hunger: 'kitchen', bladder: 'bathroom', energy: 'lounge',
            social: 'kitchen', fun: 'lounge', comfort: 'lounge', hygiene: 'bathroom'
        };

        const targetType = needToArea[lowest.name];
        const targetArea = this.officeAreas.find(a => a.type === targetType);
        if (!targetArea) return null;

        // Find best action for this need
        const areaActions = this.actions.filter(a =>
            (!a.requiresArea || a.requiresArea === targetType) &&
            a.needEffects?.[lowest.name] > 0
        );
        const best = this._scoreSortActions(char, areaActions, ctx)[0];

        return {
            moveTo: getRandomPointInArea(targetArea),
            action: best || null
        };
    }

    _handleSocialResponse(char, ctx) {
        const socialActions = this.actions.filter(a => a.category === 'social');
        const best = this._scoreSortActions(char, socialActions, ctx)[0];
        return best ? { action: best } : null;
    }

    _handleEmotionalReaction(char, ctx) {
        const dominant = char.emotions.getDominantEmotion();
        const emotionActions = {
            sadness: ['bathroom_cry', 'bean_bag_therapy', 'gossip'],
            anger: ['prank_coworker', 'microwave_fish', 'long_walk'],
            anxiety: ['supply_closet_hide', 'bathroom_break_extended', 'coffee'],
            boredom: ['browse_reddit', 'office_olympics', 'games', 'phone_scroll'],
            excitement: ['office_olympics', 'prank_coworker', 'gossip']
        };

        const preferredIds = emotionActions[dominant.emotion] || [];
        const preferred = this.actions.filter(a => preferredIds.includes(a.id));
        if (preferred.length === 0) return null;

        const picked = preferred[Math.floor(Math.random() * preferred.length)];

        if (picked.requiresArea) {
            const area = this.officeAreas.find(a => a.type === picked.requiresArea);
            if (area) {
                return { moveTo: getRandomPointInArea(area), action: picked };
            }
        }
        return { action: picked };
    }

    _utilityBasedDecision(char, ctx) {
        const area = char.getCurrentArea();
        const areaType = area?.type;

        const scored = this._scoreSortActions(char, this.actions, ctx);
        const topN = scored.slice(0, 5);
        if (topN.length === 0) return null;

        // Weighted random selection from top 5
        const totalScore = topN.reduce((s, a) => s + a._score, 0);
        if (totalScore <= 0) return null;

        let roll = Math.random() * totalScore;
        let picked = topN[0];
        for (const action of topN) {
            roll -= action._score;
            if (roll <= 0) { picked = action; break; }
        }

        // Navigate if needed
        if (picked.requiresArea && picked.requiresArea !== areaType) {
            const targetArea = this.officeAreas.find(a => a.type === picked.requiresArea);
            if (targetArea) {
                return { moveTo: getRandomPointInArea(targetArea), action: picked };
            }
        }

        return { action: picked };
    }

    // ========== UTILITY SCORING ==========

    _scoreSortActions(char, actions, ctx) {
        return actions
            .map(action => {
                let score = 0;
                const needs = char.needs;
                const personality = char.personality;
                const emotions = char.emotions;

                // Need fulfillment (weighted by urgency)
                if (action.needEffects) {
                    for (const [need, effect] of Object.entries(action.needEffects)) {
                        const current = needs[need] ?? 50;
                        const urgency = (100 - current) / 100;
                        score += effect > 0 ? effect * urgency * 2 : effect * 0.5;
                        if (current < 20 && effect > 0) score += effect * 3;
                    }
                }

                // Personality alignment
                if (action.category === 'work') {
                    score += (personality.conscientiousness - 0.5) * 20;
                    score -= (personality.extraversion - 0.5) * 10;
                }
                if (action.category === 'social') {
                    score += (personality.extraversion - 0.5) * 30;
                    score += (personality.agreeableness - 0.5) * 15;
                }
                if (action.category === 'slack' || action.category === 'fun') {
                    score -= (personality.conscientiousness - 0.5) * 25;
                    score += (personality.openness - 0.5) * 10;
                }

                // Emotional modifiers
                if (action.category === 'fun' && emotions.boredom > 50) {
                    score += emotions.boredom * 0.5;
                }
                if (action.category === 'social' && emotions.sadness > 30) {
                    score += 15;
                }

                // Social check
                if (action.requiresOther && (!ctx.nearbyChars || ctx.nearbyChars.length === 0)) {
                    score -= 50;
                }

                // Avoid repetition
                const recentSame = char.memory.shortTerm.find(
                    m => m.action === action.id &&
                         (Date.now() - (m.timestamp || 0)) < 30000
                );
                if (recentSame) score -= 20;

                // ±15% noise for variety
                score *= (0.85 + Math.random() * 0.3);

                return { ...action, _score: Math.max(0, score) };
            })
            .sort((a, b) => b._score - a._score);
    }
}
