/**
 * ActionNode — leaf node that produces a decision.
 * Returns { moveTo?, action? } or null.
 */
export class ActionNode {
    constructor(actionFn) {
        this.actionFn = actionFn;
    }

    execute(char, ctx, engine) {
        return this.actionFn(char, ctx, engine);
    }
}
