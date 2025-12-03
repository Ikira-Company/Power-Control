const { ipcRenderer } = require("electron");

const themeList = document.getElementById("themeList");
let currentTheme = null;
let themesArr = [];

// --- RENDER THEMES ---
function renderThemeList() {
    themeList.innerHTML = "";

    themesArr.forEach(t => {
        const name = t.name;

        const div = document.createElement("div");
        div.classList.add("theme-item");
        if (name === currentTheme) div.classList.add("active");

        div.innerText = name;

        div.onclick = () => {
            ipcRenderer.send("change-theme", name);
            currentTheme = name;
            renderThemeList();
        };

        themeList.appendChild(div);
    });
}

// --- RECEIVE THEMES ---
ipcRenderer.on("available-themes", (event, themes, selectedTheme) => {
    currentTheme = selectedTheme;
    themesArr = themes;
    renderThemeList();
});

// --- REQUEST THEMES ON START ---
ipcRenderer.send("request-themes");
