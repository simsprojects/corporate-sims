/**
 * Sequence node — runs children in order, fails on first failure.
 * Like an AND gate: all children must succeed for the sequence to succeed.
 */
export class Sequence {
    constructor(children) {
        this.children = children;
    }

    execute(char, ctx, engine) {
        let lastResult = null;
        for (const child of this.children) {
            const result = child.execute(char, ctx, engine);
            if (result === null || result === false) {
                return null;
            }
            lastResult = result;
        }
        return lastResult;
    }
}
