dependentValueExtractors.textarea = (elem) => elem.value;
dependentValueListeners.textarea = (elem, updater) => {
    elem.addEventListener("input", () => {
        updater();
    });
};

function updateHeight(textarea) {
    textarea.style.height = "0px";
    textarea.style.height = `calc(${textarea.scrollHeight}px - ${textarea.getAttribute("padding")})`;
}

for (let textarea of Array.from(
    document.querySelectorAll("textarea.value-source"),
)) {
    let height = textarea.getAttribute("height");

    if (height == "auto") {
        updateHeight(textarea);
        textarea.addEventListener("input", () => updateHeight(textarea));
    } else {
        textarea.style.height = height;
    }
}
