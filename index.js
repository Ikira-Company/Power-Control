// index.js (diagnostic renderer)
const { ipcRenderer } = require("electron");
const path = require("path");

function logR(...args){ console.log("[RENDER]", ...args); }

// запросим путь к приложению и лог main-сообщений
ipcRenderer.send("request-app-path");
ipcRenderer.on("app-path", (e, v)=> { logR("app-path:", v); window.__APP_PATH__ = v; });

// также получим main logs forwarded
ipcRenderer.on("main-log", (e, msg)=> { console.log("[MAIN-FWD]", msg); });

// CSS links
let themeMainCSS = document.getElementById("theme-main");
let themeAnimCSS = document.getElementById("theme-anim");
if(!themeMainCSS){ themeMainCSS = document.createElement("link"); themeMainCSS.id="theme-main"; themeMainCSS.rel="stylesheet"; document.head.appendChild(themeMainCSS); }
if(!themeAnimCSS){ themeAnimCSS = document.createElement("link"); themeAnimCSS.id="theme-anim"; themeAnimCSS.rel="stylesheet"; document.head.appendChild(themeAnimCSS); }

const icons = {
    Power: document.querySelector(".Power img"),
    Restart: document.querySelector(".Restart img"),
    Sleep: document.querySelector(".Sleep img")
};

window.__IS_CUSTOM__ = {};
let scannedThemes = [];

function fileExistsSync(filePath){
    try { return require('fs').existsSync(filePath); }
    catch(e){ return false; }
}

// apply theme by object (full info) or by name fallback
function applyThemeObject(t){
    if(!t || !t.path){ logR("applyThemeObject: invalid", t); return; }
    const themePath = t.path;
    logR("Applying theme object:", t.name, "path:", themePath);

    // check files
    const mainCss = path.join(themePath, "main.css");
    const animCss = path.join(themePath, "animation.css");
    const icoPower = path.join(themePath, "ico", "power.png");

    logR("check files:", { mainCss, exists: fileExistsSync(mainCss), animCss, animExists: fileExistsSync(animCss), icoPower, icoExists: fileExistsSync(icoPower) });

    themeMainCSS.href = `file://${mainCss}`;
    themeAnimCSS.href = `file://${animCss}`;
    if(icons.Power) icons.Power.src = `file://${path.join(themePath,"ico","power.png")}`;
    if(icons.Restart) icons.Restart.src = `file://${path.join(themePath,"ico","restart.png")}`;
    if(icons.Sleep) icons.Sleep.src = `file://${path.join(themePath,"ico","sleep.png")}`;
}

function applyThemeByName(name){
    logR("applyThemeByName", name);
    const t = scannedThemes.find(x=>x.name===name);
    if(t) applyThemeObject(t);
    else logR("Theme not found in scannedThemes:", name, scannedThemes);
}

ipcRenderer.on("available-themes", (e, themes, currentTheme) => {
    logR("available-themes received:", themes.map(t=>t.name));
    scannedThemes = themes;
    // create quick mapping for custom flags
    themes.forEach(t => window.__IS_CUSTOM__[t.name] = t.custom);
    // if theme sent as object earlier, we'll receive update-theme-object; fallback to name:
    if(currentTheme) applyThemeByName(currentTheme);
});

ipcRenderer.on("update-theme-object", (e, themeObj) => {
    logR("update-theme-object:", themeObj && themeObj.name);
    applyThemeObject(themeObj);
});

ipcRenderer.on("update-theme", (e, themeName) => {
    logR("update-theme (name):", themeName);
    applyThemeByName(themeName);
});

// forward errors from renderer to main console (optional)
window.addEventListener("error", e => { ipcRenderer.send("renderer-error", { message: e.message, stack: e.error && e.error.stack }); });

// button handlers (ensure elements exist)
document.querySelector(".Power")?.addEventListener("click", ()=>ipcRenderer.send("perform-action","shutdown"));
document.querySelector(".Restart")?.addEventListener("click", ()=>ipcRenderer.send("perform-action","restart"));
document.querySelector(".Sleep")?.addEventListener("click", ()=>ipcRenderer.send("perform-action","sleep"));
