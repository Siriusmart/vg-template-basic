class EmptyKeyFilter {
    constructor() {}

    pass(key) {
        return key;
    }
}

class LazyKeyFilter extends EmptyKeyFilter {
    constructor() {
        super();
    }

    pass(key) {
        if (this.previous == key) return null;
        else {
            this.previous = key;
            return key;
        }
    }
}

class SmoothedKeyFilter extends LazyKeyFilter {
    constructor(algorithm, params = {}) {
        super();

        switch (algorithm) {
            case "exponential":
                params.speed ??= 0.1;
                params.effectiveZero ??= 0.01;

                this.algorithm = (key) => {
                    let now = Date.now();
                    let res;
                    if (
                        this.previous == undefined ||
                        Math.abs(this.previous - key) < params.effectiveZero
                    ) {
                        res = key;
                    } else {
                        let factor =
                            params.speed * (now - this.previousTick) * 0.1;
                        res = factor * key + this.previous * (1 - factor);
                    }

                    this.previousTick = now;
                    return res;
                };
                break;
            default:
                throw new Error(`Unknown smoothing algorithm ${algorithm}`);
        }
    }

    pass(key) {
        return super.pass(this.algorithm(key));
    }
}
