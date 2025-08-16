const BlankTemplate = require("../blank/template");

class BasicTemplate extends BlankTemplate {
    constructor() {
        super();

        this.registerComponent("keydefs", ({ options, document }) => {
            let fragments = [];

            for (let [scene, properties] of Object.entries(options)) {
                for (let [propertyName, attributes] of Object.entries(
                    properties,
                )) {
                    let keydef = document.createElement("keydef");
                    keydef.setAttribute("scene", scene);
                    keydef.setAttribute("property", propertyName);

                    for (let [attrName, attrValue] of Object.entries(
                        attributes,
                    )) {
                        keydef.setAttribute(attrName, attrValue);
                    }

                    fragments.push(keydef);
                }
            }

            return fragments;
        });

        this.registerComponent("key", ({ options, document }) => {
            let fragments = [];

            for (let [scene, properties] of Object.entries(options)) {
                for (let [propertyName, attributes] of Object.entries(
                    properties,
                )) {
                    let key = document.createElement("key");
                    key.setAttribute("scene", scene);
                    key.setAttribute("property", propertyName);

                    if (typeof attributes == "object") {
                        for (let [attrName, attrValue] of Object.entries(
                            attributes,
                        )) {
                            key.setAttribute(attrName, attrValue);
                        }
                    } else {
                        key.setAttribute("value", attributes);
                    }

                    fragments.push(key);
                }
            }

            return fragments;
        });

        this.registerComponent("inline-js", ({ elem, document }) => {
            elem.parentNode.remove();

            let scriptElem = document.createElement("script");
            scriptElem.innerHTML = elem.innerHTML;
            document.body.appendChild(scriptElem);
        });

        this.registerComponent("inline-css", ({ elem, document }) => {
            elem.parentNode.remove();

            let styleElem = document.createElement("style");
            styleElem.innerHTML = elem.innerHTML;
            document.head.appendChild(styleElem);
        });

        this.registerComponent("include", ({ elem, document, options }) => {
            elem.parentNode.remove();

            options.js ??= [];
            options["defer-js"] ??= [];
            options.css ??= [];
            options["defer-css"] ??= [];

            for (let script of options.js) {
                let scriptElem = document.createElement("script");
                scriptElem.src = script;
                document.body.appendChild(scriptElem);
            }

            for (let script of options["defer-js"]) {
                let scriptElem = document.createElement("script");
                scriptElem.src = script;
                scriptElem.defer = true;
                document.body.appendChild(scriptElem);
            }

            for (let css of options.css) {
                let linkElem = document.createElement("link");
                linkElem.rel = "stylesheet";
                linkElem.type = "text/css";
                linkElem.href = css;
                document.body.appendChild(linkElem);
            }

            for (let css of options["defer-css"]) {
                let linkElem = document.createElement("link");
                linkElem.rel = "stylesheet";
                linkElem.type = "text/css";
                linkElem.defer = true;
                linkElem.href = css;
                document.body.appendChild(linkElem);
            }
        });

        this.registerComponent("settings", ({ options, document }) => {
            if (options.title !== undefined) {
                let titleElem = document.createElement("title");
                titleElem.innerHTML = options.title;
                document.head.appendChild(titleElem);
            }
        });

        this.registerComponent("anchor", ({ options, document }) => {
            options.top ??= {};
            options.bottom ??= {};

            let fragments = [];

            for (let [sceneName, sceneValue] of Object.entries(options.top)) {
                let anchor = document.createElement("anchor");
                anchor.setAttribute("type", "top");
                anchor.setAttribute("scene", sceneName);
                anchor.setAttribute("anchor", sceneValue);
                fragments.push(anchor);
            }

            for (let [sceneName, sceneValue] of Object.entries(
                options.bottom,
            )) {
                let anchor = document.createElement("anchor");
                anchor.setAttribute("type", "bottom");
                anchor.setAttribute("scene", sceneName);
                anchor.setAttribute("anchor", sceneValue);
                fragments.push(anchor);
            }

            return fragments;
        });
    }

    postProcess(dom) {
        super.postProcess(dom);

        // remove settings block
        dom.window.document
            .querySelectorAll("pre code.language-settings")
            .forEach((elem) => elem.parentNode.remove());

        // add header ID
        let headerFrequencies = {};
        let headerTree = { node: null, children: [] };

        function insertHeader(elem, tree) {
            if (
                tree.children.length == 0 ||
                tree.children[tree.children.length - 1].node.tagName >=
                    elem.tagName
            ) {
                tree.children.push({ node: elem, children: [] });
            } else {
                insertHeader(elem, tree.children[tree.children.length - 1]);
            }
        }
        dom.window.document
            .querySelectorAll("h1, h2, h3, h4, h5, h6")
            .forEach((elem) => {
                let name = elem.textContent.replace(" ", "-");
                headerFrequencies[name] ??= 0;
                headerFrequencies[name]++;

                insertHeader(elem, headerTree);
            });

        function headerAddId(tree, frequencies, parentName) {
            let name;
            if (tree.node != null) {
                name = tree.node.textContent.toLowerCase().replaceAll(" ", "-");
                if (parentName == undefined || frequencies[name] <= 1)
                    tree.node.id = name;
                else tree.node.id = `${parentName}_${name}`;
            }

            for (let child of tree.children) {
                headerAddId(
                    child,
                    frequencies,
                    parentName == undefined ? name : `${parentName}_${name}`,
                );
            }
        }
        headerAddId(headerTree, headerFrequencies);
    }
}

module.exports = BasicTemplate;
