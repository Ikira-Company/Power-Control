// theme_loader.js
const fs = require("fs");
const path = require("path");

function listThemes(appDir) {
  const builtinDir = path.join(appDir, "theme");
  const customDir = path.join(appDir, "custom_theme");

  const ensureDir = dir => {
    try { return fs.existsSync(dir) && fs.statSync(dir).isDirectory(); }
    catch { return false; }
  };

  const read = dir => {
    if (!ensureDir(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .filter(name => {
        const mainCss = path.join(dir, name, "main.css");
        return fs.existsSync(mainCss);
      });
  };

  const builtin = read(builtinDir);
  const custom = read(customDir);

  return { builtin, custom };
}

function readConfig(appDir) {
  const cfgPath = path.join(appDir, "config.json");
  try {
    if (!fs.existsSync(cfgPath)) {
      // default config
      const def = {
        themeType: "builtin",    // 'builtin' or 'custom' - kept for compatibility
        builtinTheme: "Dark",    // default builtin
        customThemes: []         // array of names (can be multiple)
      };
      fs.writeFileSync(cfgPath, JSON.stringify(def, null, 2), "utf8");
      return def;
    }
    const raw = fs.readFileSync(cfgPath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read config.json:", e);
    return { themeType: "builtin", builtinTheme: "Dark", customThemes: [] };
  }
}

function writeConfig(appDir, config) {
  const cfgPath = path.join(appDir, "config.json");
  fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2), "utf8");
}

module.exports = { listThemes, readConfig, writeConfig };
