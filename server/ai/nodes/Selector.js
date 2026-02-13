/**
 * Selector node — tries children in order, returns first success.
 * Like an OR gate: if any child succeeds, the selector succeeds.
 */
export class Selector {
    constructor(children) {
        this.children = children;
    }

    execute(char, ctx, engine) {
        for (const child of this.children) {
            const result = child.execute(char, ctx, engine);
            if (result !== null && result !== false) {
                return result;
            }
        }
        return null;
    }
}
