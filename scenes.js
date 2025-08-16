function filterKeys(originalKeys, filters) {
    let keys = structuredClone(originalKeys);
    let unchanged = undefined

    fields: for (let fieldName of Object.keys(keys ?? {})) {
        for (let filter of filters[fieldName] ?? []) {
            keys[fieldName] = filter.pass(keys[fieldName]);
            if (keys[fieldName] == null) {
                unchanged ??= true
                keys[fieldName] = originalKeys[fieldName];
                continue fields;
            } else {
                unchanged = false
            }
        }
    }

    return unchanged ? null : keys;
}

class EmptyScene {
    constructor(name) {
        if (typeof name != "string")
            throw new Error("Creating new scene without name specified");
        this.name = name;
        this.keyFilters = {};
    }

    onFrameRaw(keys, anchors) {
        keys = filterKeys(keys, this.keyFilters);
        if (keys != null) this.onFrame(keys, anchors);
    }

    onChangeRaw(keys, ...params) {
        if (keys == undefined) {
            this.onChange({});
            this.onFrame({});
            return;
        }

        let filteredKeys = filterKeys(keys, this.keyFilters);
        if (params[params.length - 1].force && filteredKeys == null)
            filteredKeys = keys;

        if (filteredKeys != null) {
            this.onChange(filteredKeys, ...params);
            this.onFrame(filteredKeys, ...params);
        }
    }

    onFrame(_keys, _anchors) {}
    onChange(_keys, _anchors) {}

    addKeyFilter(field, filter) {
        if (!(filter instanceof EmptyKeyFilter))
            throw new Error(
                "Attempting to add an object which is not an instanceof EmptyKeyFilter",
            );

        this.keyFilters[field] ??= [];
        this.keyFilters[field].push(filter);
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
    constructor(name) {
        super(name);

        function offsetMultiplier(anchor) {
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

        this.anchorTop = document.querySelector(
            `anchor[type='top'][scene='${name}']`,
        );
        if (this.anchorTop != null) {
            let multiplier = offsetMultiplier(
                this.anchorTop.getAttribute("anchor"),
            );
            this.anchorTopOffest = () => multiplier * window.innerHeight;
        }
        this.anchorBottom = document.querySelector(
            `anchor[type='bottom'][scene='${name}']`,
        );
        if (this.anchorBottom != null) {
            let multiplier =
                1 - offsetMultiplier(this.anchorBottom.getAttribute("anchor"));
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
                this.screen.style.top = `${anchorTop}px`;
                anchored = true;
            }
        }

        if (this.anchorBottom != null) {
            let anchorBottom =
                this.anchorBottom.getBoundingClientRect().top -
                this.anchorBottomOffest();
            if (anchorBottom < window.innerHeight) {
                this.screen.style.top = `${anchorBottom - window.innerHeight}px`;
                anchored = true;
            }
        }

        if (!anchored) {
            this.screen.style.top = 0;
        }
        super.onChangeRaw(...params);
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
        this.ctx.clearRect(0, 0, this.board.width, this.board.height);
    }
}
