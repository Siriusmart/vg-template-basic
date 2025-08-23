let scenes = {};
let keyCache = null;
let keyDefs = {};

let dependentValues = {};
let dependentValueExtractors = {};
let dependentValueListeners = {};
let sceneDependents = {};

Array.from(document.getElementsByTagName("keydef")).forEach((defElem) => {
    let sceneName = defElem.getAttribute("scene");
    let propertyName = defElem.getAttribute("property");
    keyDefs[sceneName] ??= {};
    keyDefs[sceneName][propertyName] ??= {};

    if (defElem.getAttribute("smooth") == null)
        defElem.setAttribute("smooth", "nearest");

    if (defElem.getAttribute("source") != null) {
        sceneDependents[sceneName] ??= {};
        sceneDependents[sceneName][defElem.getAttribute("source")] =
            propertyName;
    }

    for (let attrName of defElem.getAttributeNames()) {
        keyDefs[sceneName][propertyName][attrName] =
            defElem.getAttribute(attrName);
    }
});

Array.from(document.getElementsByTagName("key")).forEach((keyElem) => {
    let sceneName = keyElem.getAttribute("scene");
    let propertyName = keyElem.getAttribute("property");
    if (
        keyDefs[sceneName] == undefined ||
        keyDefs[sceneName][propertyName] == undefined
    ) {
        console.error(
            `Keyframe exist but definition for ${sceneName}.${propertyName} does not exist.`,
        );
    }
});

let vanillaGraphics = {
    addScene(scene) {
        if (!(scene instanceof EmptyScene))
            throw new Error(
                "Attempting to add an object which is not an instanceof EmptyScene",
            );

        if (keyCache == null) this.onChange();
        scene.buildFilters();
        // scene.onChangeRaw(...(keyCache[scene.name] ?? []));
        scenes[scene.name] = scene;
    },

    onFrame() {
        if (keyCache == null) this.onChange();
        for (let [sceneName, scene] of Object.entries(scenes)) {
            scene.onFrameRaw(...(keyCache[sceneName] ?? []));
        }

        requestAnimationFrame(vanillaGraphics.onFrame);
    },

    onChange(params = {}) {
        let keyframes = Array.from(document.getElementsByTagName("key")).map(
            (elem) => {
                let res = {
                    position:
                        elem.getBoundingClientRect().top -
                        window.innerHeight / 2,
                };

                for (let attrName of elem.getAttributeNames()) {
                    res[attrName] = elem.getAttribute(attrName);
                }

                return res;
            },
        );

        let orderedKeyframes = {};

        for (let key of keyframes) {
            orderedKeyframes[key.scene] ??= {};
            orderedKeyframes[key.scene][key.property] ??= [];
            orderedKeyframes[key.scene][key.property].push(key);
        }

        let interpolatedKeys = {};

        for (let [scene, sceneKeys] of Object.entries(orderedKeyframes)) {
            interpolatedKeys[scene] ??= [];
            for (let [property, keys] of Object.entries(sceneKeys)) {
                interpolation[keyDefs[scene][property].smooth](keys, {
                    type: keyDefs[scene][property].type,
                }).forEach((value, index) => {
                    interpolatedKeys[scene][index] ??= {};
                    interpolatedKeys[scene][index][property] = value;
                });
            }
        }

        for (let [scene, dependents] of Object.entries(sceneDependents)) {
            interpolatedKeys[scene] ??= [];
            interpolatedKeys[scene][0] ??= {};

            for (let [sourceName, propertyName] of Object.entries(
                dependents ?? {},
            )) {
                interpolatedKeys[scene][0][propertyName] =
                    dependentValues[sourceName];
            }
        }

        for (let [sceneName, scene] of Object.entries(scenes)) {
            scene.onChangeRaw(...(interpolatedKeys[sceneName] ?? [{}]), params);
        }

        keyCache = interpolatedKeys;
    },
};

function start() {
    for (let valueSource of Array.from(
        document.getElementsByClassName("value-source"),
    )) {
        let sourceIdent = valueSource.getAttribute("source-ident");
        let sourceType = valueSource.getAttribute("source-type");

        let value = dependentValueExtractors[sourceType](valueSource);
        dependentValues[sourceIdent] = value;

        dependentValueListeners[sourceType](valueSource, () => {
            let value = dependentValueExtractors[sourceType](valueSource);
            dependentValues[sourceIdent] = value;
            vanillaGraphics.onChange();
        });
    }

    vanillaGraphics.onChange({ force: true });
    addEventListener("scroll", vanillaGraphics.onChange);
    addEventListener("resize", () => vanillaGraphics.onChange({ force: true }));

    requestAnimationFrame(vanillaGraphics.onFrame);
}

addEventListener("load", start)
