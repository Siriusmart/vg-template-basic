class EmptyScene {
    filterKeys(originalKeys, params = {}) {
        let keys = structuredClone(originalKeys);
        let unchanged = true;

        for (let fieldName of Object.keys(keys ?? {})) {
            let keyChanged = true;

            for (let filter of this.keyFilters[fieldName] ?? []) {
                let res = filter.pass(keys[fieldName]);
                if (res == null) keyChanged = false;
                else keys[fieldName] = res;
            }

            if (keyChanged) unchanged = false;
        }

        return unchanged && params.force !== true ? null : keys;
    }

    buildFilters() {
        if (keyDefs[this.name] === undefined) return;

        for (let property of Object.keys(keyDefs[this.name])) {
            if (this.noLazy[property] !== true) {
                this.keyFilters[property] ??= [];
                this.keyFilters[property].push(new LazyKeyFilter());
            }
        }
    }

    constructor(name) {
        if (typeof name != "string")
            throw new Error("Creating new scene without name specified");
        this.name = name;
        this.keyFilters = {};
        this.noLazy = {};
    }

    onFrameRaw(keys, anchors) {
        keys = this.filterKeys(keys);
        if (keys != null) this.onFrame(keys, anchors);
    }

    onChangeRaw(keys, ...params) {
        let filteredKeys = this.filterKeys(keys, {
            force: params[params.length - 1].force,
        });

        if (filteredKeys != null) {
            this.onChange(filteredKeys, ...params);
            this.onFrame(filteredKeys, ...params);
        }
    }

    onFrame(_keys, _anchors) {}
    onChange(_keys, _anchors) {}

    addKeyFilter(field, ...filters) {
        for (let filter of filters) {
            if (!(filter instanceof EmptyKeyFilter))
                throw new Error(
                    "Attempting to add an object which is not an instanceof EmptyKeyFilter",
                );

            this.keyFilters[field] ??= [];
            this.keyFilters[field].push(filter);
        }
        return this;
    }

    withKeyFilter(field, ...filters) {
        for (let filter of filters) {
            if (!(filter instanceof EmptyKeyFilter))
                throw new Error(
                    "Attempting to add an object which is not an instanceof EmptyKeyFilter",
                );

            this.keyFilters[field] ??= [];
            this.keyFilters[field].push(filter);
            this.noLazy[field] = true;
        }
        return this;
    }
}

// Creates an element with sticky positioning when created
class FixedScene extends EmptyScene {
    constructor(name) {
        super(name);

        this.screen = document.createElement("scene");
        this.screen.style.width = "100vw";
        this.screen.style.height = "100vh";
        this.screen.style.display = "block";
        this.screen.style.position = "absolute";
        this.screen.style.top = "0";
        this.screen.style.left = "0";
        this.screen.id = name;
        document.getElementById("back").appendChild(this.screen);
    }
}

class VisibleRenderScene extends FixedScene {
    constructor(name) {
        super(name);
        document.getElementById(name).hidden = true;
    }

    onChange(keys, ...params) {
        if (keys.opacity != undefined && keys.opacity <= 0) {
            this.screen.style.display = "none";
        } else {
            this.screen.style.display = "block";
            if (keys.opacity) this.screen.style.opacity = keys.opacity;
            this.onVisibleChange(keys, ...params);
        }
    }

    onFrame(keys, ...params) {
        if (keys.opacity == undefined || keys.opacity > 0) {
            this.onVisibleFrame(keys, ...params);
        }
    }

    onVisibleChange(_keys, _anchors) {}
    onVisibleFrame(_keys, _anchors) {}
}

class AnchoredScene extends VisibleRenderScene {
    offsetMultiplier(anchor) {
        switch (anchor) {
            case "top":
                return 0;
            case "bottom":
                return 1;
            case "center":
                return 0.5;
            default:
                let parsed = parseFloat(anchor);
                if (isNaN(parsed)) return 0.5;
                else return parsed;
        }
    }

    constructor(name) {
        super(name);

        this.renderedBefore = false;
        this.top = 0;

        this.anchorTop = document.querySelector(
            `anchor[type='begin'][scene='${name}']`,
        );
        if (this.anchorTop != null) {
            let multiplier = this.offsetMultiplier(
                this.anchorTop.getAttribute("anchor"),
            );
            this.anchorTopOffest = () => multiplier * window.innerHeight;
        }
        this.anchorBottom = document.querySelector(
            `anchor[type='end'][scene='${name}']`,
        );
        if (this.anchorBottom != null) {
            let multiplier =
                1 -
                this.offsetMultiplier(this.anchorBottom.getAttribute("anchor"));
            this.anchorBottomOffest = () => multiplier * window.innerHeight;
        }
    }

    onChangeRaw(...params) {
        let anchored = false;
        if (this.anchorTop != null) {
            let anchorTop =
                this.anchorTop.getBoundingClientRect().top -
                this.anchorTopOffest();
            if (anchorTop > 0) {
                this.top = anchorTop;
                this.screen.style.top = `${anchorTop}px`;
                anchored = true;
            }
        }

        if (this.anchorBottom != null) {
            let anchorBottom =
                this.anchorBottom.getBoundingClientRect().top -
                this.anchorBottomOffest();
            if (anchorBottom < window.innerHeight) {
                this.top = anchorBottom;
                this.screen.style.top = `${anchorBottom - window.innerHeight}px`;
                anchored = true;
            }
        }

        if (!anchored) {
            this.screen.style.top = 0;
            this.top = 0;
        }
        super.onChangeRaw(...params);
    }

    onFrame(...params) {
        /*
        if (this.renderedBefore && Math.abs(this.top) > window.innerHeight)
            return;
        this.renderedBefore = true;
        */
        super.onFrame(...params);
    }
}

class AnchoredCanvasScene extends AnchoredScene {
    constructor(name) {
        super(name);
        this.canvas = document.createElement("canvas");
        this.canvas.id = `${name}-canvas`;
        this.ctx = this.canvas.getContext("2d");
        this.screen.appendChild(this.canvas);
    }

    onVisibleChange(...params) {
        super.onVisibleChange(...params);
        this.ctx.canvas.width = window.innerWidth;
        this.ctx.canvas.height = window.innerHeight;
    }

    onVisibleFrame(...params) {
        super.onVisibleFrame(...params);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

class CanvasScene extends VisibleRenderScene {
    constructor(name) {
        super(name);
        this.canvas = document.createElement("canvas");
        this.canvas.id = `${name}-canvas`;
        this.ctx = this.canvas.getContext("2d");
        this.screen.appendChild(this.canvas);
    }

    onVisibleChange(...params) {
        super.onVisibleChange(...params);
        this.ctx.canvas.width = window.innerWidth;
        this.ctx.canvas.height = window.innerHeight;
    }

    onVisibleFrame(...params) {
        super.onVisibleFrame(...params);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

class NormalisedCanvasScene extends CanvasScene {
    dimensions() {
        this.pixelSize = Math.min(
            this.widthBound() / this.width,
            this.heightBound() / this.height,
        );

        this.dim = {
            height: this.pixelSize * this.height,
            width: this.pixelSize * this.width,
        };
    }

    offsetMultiplier(anchor) {
        switch (anchor) {
            case "top":
                return 0;
            case "bottom":
                return 1;
            case "center":
                return 0.5;
            default:
                let parsed = parseFloat(anchor);
                if (isNaN(parsed)) return 0.5;
                else return parsed;
        }
    }

    constructor(name) {
        super(name);

        this.widthBound = () => window.innerWidth;
        this.heightBound = () => window.innerHeight;
        this.width = 100;
        this.height = 100;
        this.center = { x: 0, y: 0 };

        this.renderedBefore = false;
        this.top = 0;

        this.dimensions();

        this.anchorTop = document.querySelector(
            `anchor[type='begin'][scene='${name}']`,
        );
        if (this.anchorTop != null) {
            let multiplier = this.offsetMultiplier(
                this.anchorTop.getAttribute("anchor"),
            );
            this.anchorTopOffest = () => multiplier * this.dim.height;
        }
        this.anchorBottom = document.querySelector(
            `anchor[type='end'][scene='${name}']`,
        );
        if (this.anchorBottom != null) {
            let multiplier =
                1 -
                this.offsetMultiplier(this.anchorBottom.getAttribute("anchor"));
            this.anchorBottomOffest = () => multiplier * this.dim.height;
        }
    }

    onChangeRaw(...params) {
        let anchored = false;

        this.dimensions();

        if (this.anchorTop != null) {
            let anchorTop =
                this.anchorTop.getBoundingClientRect().top -
                this.anchorTopOffest() -
                (window.innerHeight - this.dim.height) / 2;
            if (anchorTop > 0) {
                this.top = anchorTop;
                this.screen.style.top = `${anchorTop}px`;
                anchored = true;
            }
        }

        if (this.anchorBottom != null) {
            let anchorBottom =
                this.anchorBottom.getBoundingClientRect().top -
                this.anchorBottomOffest() +
                (window.innerHeight - this.dim.height) / 2;
            if (anchorBottom < window.innerHeight) {
                this.top = anchorBottom;
                this.screen.style.top = `${anchorBottom - window.innerHeight}px`;
                anchored = true;
            }
        }

        if (!anchored) {
            this.screen.style.top = 0;
            this.top = 0;
        }
        super.onChangeRaw(...params);
    }

    onFrame(...params) {
        /*
        if (this.renderedBefore && Math.abs(this.top) > window.innerHeight)
            return;
        this.renderedBefore = true;
        */
        super.onFrame(...params);
    }

    onVisibleChange(...params) {
        super.onVisibleChange(...params);

        this.trueCenter = {
            x: this.ctx.canvas.width / 2 + this.pixelSize * this.center.x,
            y: this.ctx.canvas.height / 2 + this.pixelSize * this.center.y,
        };
    }

    getX(vx) {
        return this.trueCenter.x + vx * this.pixelSize;
    }

    getY(vy) {
        return this.trueCenter.y - vy * this.pixelSize;
    }

    getXY(vx, vy) {
        return [this.getX(vx), this.getY(vy)];
    }

    getLength(vd) {
        return vd * this.pixelSize;
    }

    fillRect(x, y, w, h) {
        this.ctx.fillRect(
            this.getX(x),
            this.getY(y),
            this.getLength(w),
            this.getLength(h),
        );
    }

    strokeRect(x, y, w, h) {
        this.ctx.strokeRect(
            this.getX(x),
            this.getY(y),
            this.getLength(w),
            this.getLength(h),
        );
    }

    clearRect(x, y, w, h) {
        this.ctx.clearRect(
            this.getX(x),
            this.getY(y),
            this.getLength(w),
            this.getLength(h),
        );
    }

    beginPath() {
        this.ctx.beginPath();
    }

    moveTo(x, y) {
        this.ctx.moveTo(this.getX(x), this.getY(y));
    }

    lineTo(x, y) {
        this.ctx.lineTo(this.getX(x), this.getY(y));
    }

    fill() {
        this.ctx.fill();
    }

    arc(x, y, radius, startAngle, endAngle) {
        this.ctx.arc(
            this.getX(x),
            this.getY(y),
            this.getLength(radius),
            startAngle,
            endAngle,
        );
    }

    stroke() {
        this.ctx.stroke();
    }

    closePath() {
        this.ctx.closePath();
    }

    lineTo(x, y) {
        this.ctx.lineTo(this.getX(x), this.getY(y));
    }

    arcTo(x1, y1, x2, y2, radius) {
        this.ctx.arcTo(
            this.getX(x1),
            this.getY(y1),
            this.getX(x2),
            this.getY(y2),
            this.getLength(radius),
        );
    }

    quadraticCurveTo(cpx, cpy, x, y) {
        this.ctx.quadraticCurveTo(
            this.getX(cpx),
            this.getY(cpy),
            this.getX(x),
            this.getY(y),
        );
    }

    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        this.ctx.bezierCurveTo(
            this.getX(cp1x),
            this.getY(cp1y),
            this.getX(cp2x),
            this.getY(cp2y),
            this.getX(x),
            this.getY(y),
        );
    }

    fillText(text, x, y, maxWidth) {
        this.ctx.fillText(
            text,
            this.getX(x),
            this.getY(y),
            maxWidth == undefined ? undefined : this.getLength(maxWidth),
        );
    }

    beginPath() {
        this.ctx.beginPath();
    }

    get fillStyle() {
        return this.ctx.fillStyle;
    }

    set fillStyle(s) {
        this.ctx.fillStyle = s;
    }

    get font() {
        return this.ctx.font;
    }

    set font(s) {
        this.ctx.font = s;
    }

    get globalAlpha() {
        return this.ctx.globalAlpha;
    }

    set globalAlpha(a) {
        this.ctx.globalAlpha = a;
    }

    get textAlign() {
        return this.ctx.textAlign;
    }

    set textAlign(v) {
        this.ctx.textAlign = v;
    }

    get textBaseline() {
        return this.ctx.textBaseline;
    }

    set textBaseline(v) {
        this.ctx.textBaseline = v;
    }
}
