/**
 * Condition node — evaluates a predicate, returns true or null.
 * Used as a gate in sequences.
 */
export class Condition {
    constructor(predicate) {
        this.predicate = predicate;
    }

    execute(char, ctx, engine) {
        return this.predicate(char, ctx, engine) ? true : null;
    }
}
