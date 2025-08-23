const BlankTemplate = require("../blank/template");

class BasicTemplate extends BlankTemplate {
    markdownProcessor(processor) {}

    htmlProcessor(processor) {}

    async toHTML(
        markdown,
        { unified, remarkParse, remarkRehype, rehypeStringify },
    ) {
        let basep = unified().use(remarkParse);
        let mdp = this.markdownProcessor(basep);
        let htmlp = this.htmlProcessor(
            (mdp ?? basep).use(remarkRehype, { allowDangerousHtml: true }),
        );

        if (mdp == undefined && htmlp == undefined) return;

        return String(
            await (mdp ?? htmlp ?? basep)
                .use(rehypeStringify, { allowDangerousHtml: true })
                .process(markdown),
        );
    }

    constructor() {
        super();

        this.registerComponent(
            "settings",
            ({ options, document }) => {
                if (options.title !== undefined) {
                    let titleElem = document.createElement("title");
                    titleElem.textContent = options.title;
                    document.head.appendChild(titleElem);
                }
            },
            { hasSettings: true },
        );

        this.registerComponent(
            "textarea",
            ({ options, document, content }) => {
                let taElem = document.createElement("textarea");
                taElem.classList.add("value-source");
                taElem.setAttribute("padding", "0px");
                taElem.setAttribute("source-type", "textarea");
                taElem.setAttribute("source-ident", options.id);
                taElem.id = options.id;
                taElem.setAttribute("height", options.height ?? "auto");
                if (options["min-height"] !== undefined)
                    taElem.style.minHeight = options["min-height"];
                if (options["max-height"] !== undefined)
                    taElem.style.maxHeight = options["max-height"];
                taElem.style.width = `calc(${options.width ?? "100%"} - 2em)`;
                if (options["min-width"] !== undefined)
                    taElem.style.minWidth = `calc(${options["min-width"]} - 2em)`;
                if (options["max-width"] !== undefined)
                    taElem.style.maxWidth = `calc(${options["max-width"]} - 2em)`;
                if (content.endsWith("\n")) content = content.slice(0, -1);
                taElem.textContent = content;
                return taElem;
            },
            { hasSettings: true },
        );

        this.registerComponent("vspace", ({ document, content }) => {
            let vspaceElem = document.createElement("div");
            vspaceElem.style.height = content ?? "1em";
            vspaceElem.style.margin = 0;
            vspaceElem.style.padding = 0;
            return vspaceElem;
        });

        this.registerComponent(
            "keydefs",
            ({ options, document }) => {
                let fragments = [];

                for (let [scene, properties] of Object.entries(options)) {
                    for (let [propertyName, attributes] of Object.entries(
                        properties,
                    )) {
                        let keydef = document.createElement("keydef");
                        keydef.setAttribute("scene", scene);
                        keydef.setAttribute("property", propertyName);

                        if (typeof attributes != "object") {
                            keydef.setAttribute("value", properties);
                            keydef.setAttribute("smooth", "nearest");
                        } else
                            for (let [attrName, attrValue] of Object.entries(
                                attributes,
                            )) {
                                keydef.setAttribute(attrName, attrValue);
                            }

                        fragments.push(keydef);
                    }
                }

                return fragments;
            },
            { hasSettings: true },
        );

        this.registerComponent(
            "key",
            ({ options, document }) => {
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
            },
            { hasSettings: true },
        );

        this.registerComponent("inline-css", ({ elem, document }) => {
            elem.parentNode.remove();

            let styleElem = document.createElement("style");
            styleElem.innerHTML = elem.textContent;
            document.head.appendChild(styleElem);
        });

        this.registerComponent(
            "include",
            ({ elem, document, options }) => {
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
            },
            { hasSettings: true },
        );

        this.registerComponent("inline-js", ({ elem, document }) => {
            elem.parentNode.remove();

            let scriptElem = document.createElement("script");
            scriptElem.innerHTML = elem.textContent;
            document.body.appendChild(scriptElem);
        });

        this.registerComponent(
            "anchor",
            ({ options, document }) => {
                options.begin ??= {};
                options.end ??= {};

                let fragments = [];

                for (let [sceneName, sceneValue] of Object.entries(
                    options.begin,
                )) {
                    let anchor = document.createElement("anchor");
                    anchor.setAttribute("type", "begin");
                    anchor.setAttribute("scene", sceneName);
                    anchor.setAttribute("anchor", sceneValue);
                    fragments.push(anchor);
                }

                for (let [sceneName, sceneValue] of Object.entries(
                    options.end,
                )) {
                    let anchor = document.createElement("anchor");
                    anchor.setAttribute("type", "end");
                    anchor.setAttribute("scene", sceneName);
                    anchor.setAttribute("anchor", sceneValue);
                    fragments.push(anchor);
                }

                return fragments;
            },

            { hasSettings: true },
        );
    }

    postProcess(params) {
        super.postProcess(params);

        let dom = params.dom;

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
                if (elem.id.length != 0) return;
                let name = elem.textContent.toLowerCase().replaceAll(" ", "-");
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

        return this.redo ?? false;
    }
}

module.exports = BasicTemplate;
