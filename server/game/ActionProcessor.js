import { ACTIONS_BY_ID, getActionsForArea } from './actions.js';
import { OFFICE_AREAS, getRandomPointInArea } from './officeLayout.js';

/**
 * Validates and executes character actions.
 * Server-authoritative — clients cannot cheat.
 */
export class ActionProcessor {
    constructor() {
        this.officeAreas = OFFICE_AREAS;
    }

    /**
     * Try to perform an action for a character.
     * Returns { success, needsMove, targetX, targetY, error }
     */
    tryPerformAction(character, actionId, context) {
        const action = ACTIONS_BY_ID.get(actionId);
        if (!action) {
            return { success: false, error: 'Unknown action' };
        }

        // Check if character is already busy
        if (character.currentAction) {
            return { success: false, error: 'Already performing an action' };
        }

        // Check area requirement
        if (action.requiresArea) {
            const currentArea = character.getCurrentArea();
            const currentType = currentArea?.type;

            // Map similar areas
            const areaMap = {
                annex: ['annex', 'cubicle'],
            };
            const validTypes = areaMap[action.requiresArea] || [action.requiresArea];

            if (!currentType || !validTypes.includes(currentType)) {
                // Need to move to the right area
                const targetArea = this.officeAreas.find(a =>
                    validTypes.includes(a.type) && a.type !== 'hallway'
                );
                if (!targetArea) {
                    return { success: false, error: 'No suitable area found' };
                }
                const point = getRandomPointInArea(targetArea);
                return {
                    success: false,
                    needsMove: true,
                    targetX: point.x,
                    targetY: point.y,
                    targetArea: targetArea.type,
                    actionId
                };
            }
        }

        // Check social requirement
        if (action.requiresOther && (!context.nearbyChars || context.nearbyChars.length === 0)) {
            return { success: false, error: 'Need someone nearby' };
        }

        // All checks passed — execute
        this.executeAction(character, action, context);
        return { success: true };
    }

    /**
     * Directly execute an action on a character (bypasses checks).
     * Used by AI engine after its own validation.
     */
    executeAction(character, action, context) {
        character.startAction(action);

        // If social action with a target, affect relationship
        if (action.category === 'social' && context?.targetChar) {
            const friendDelta = action.emotionEffects?.happiness
                ? Math.round(action.emotionEffects.happiness * 0.3) : 3;
            character.memory.modifyRelationship(context.targetChar.id, friendDelta);
            context.targetChar.memory.modifyRelationship(character.id, friendDelta * 0.5);
        }
    }
}
