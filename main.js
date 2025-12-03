// main.js — final, full
const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  nativeImage,
  screen,
  ipcMain,
  nativeTheme
} = require('electron');

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

//
// ------------------------- CONFIG: user custom_theme folder -------------------------
//
const userCustomThemeDir = path.join(app.getPath('userData'), 'custom_theme');

function ensureThemeDir() {
  try {
    if (!fs.existsSync(userCustomThemeDir)) {
      fs.mkdirSync(userCustomThemeDir, { recursive: true });
      console.log('[MAIN] Created custom_theme folder in userData:', userCustomThemeDir);
    }
  } catch (e) {
    console.error('[MAIN] ensureThemeDir error:', e);
  }
}

//
// ------------------------- Logging helper -------------------------
function logMain(...args) {
  console.log('[MAIN]', ...args);
}

//
// ------------------------- IPC: app path (for renderer) -------------------------
ipcMain.on('request-app-path', (event) => {
  const p = app.getAppPath();
  logMain('sending app-path:', p);
  event.reply('app-path', p);
});

//
// ------------------------- Config load/save -------------------------
const configPath = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    if (!fs.existsSync(configPath)) {
      const systemTheme = nativeTheme.shouldUseDarkColors ? 'Dark' : 'Light';
      const defaultConfig = {
        theme: systemTheme,
        mainColor: nativeTheme.shouldUseDarkColors ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)'
      };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    logMain('loadConfig error', err);
    return {
      theme: nativeTheme.shouldUseDarkColors ? 'Dark' : 'Light',
      mainColor: nativeTheme.shouldUseDarkColors ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)'
    };
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
  } catch (e) {
    logMain('saveConfig error', e);
  }
}

let config = loadConfig();

//
// ------------------------- Theme scanning -------------------------
// Scans two places:
//  - built-in themes: <app root>/theme/<name>
//  - user custom themes: %APPDATA%/PowerControl/custom_theme/<name>
//
function scanThemes() {
  const themes = [];

  // built-in
  const builtinDir = path.join(__dirname, 'theme');
  if (fs.existsSync(builtinDir)) {
    for (const name of fs.readdirSync(builtinDir)) {
      const full = path.join(builtinDir, name);
      if (fs.lstatSync(full).isDirectory()) {
        themes.push({ name, custom: false, path: full });
      }
    }
  } else {
    logMain('builtin theme folder not found:', builtinDir);
  }

  // user custom (AppData)
  ensureThemeDir();
  if (fs.existsSync(userCustomThemeDir)) {
    for (const name of fs.readdirSync(userCustomThemeDir)) {
      const full = path.join(userCustomThemeDir, name);
      if (fs.lstatSync(full).isDirectory()) {
        themes.push({ name, custom: true, path: full });
      }
    }
  } else {
    logMain('user custom_theme folder does not exist (created on startup):', userCustomThemeDir);
  }

  logMain('scanThemes ->', themes.map(t => `${t.name}${t.custom ? ':custom' : ''}`));
  return themes;
}

//
// ------------------------- Window creation & lifecycle -------------------------
let win = null;
let tray = null;
let isAnimating = false;

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;

  win = new BrowserWindow({
    width: 450,
    height: 250,
    x: Math.floor((sw - 450) / 2),
    y: Math.floor((sh - 250) / 2),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');

  win.webContents.on('did-finish-load', () => {
    logMain('did-finish-load -> sending themes and current theme:', config.theme);
    const themes = scanThemes();
    win.webContents.send('available-themes', themes, config.theme);
    // give renderer both the current theme name and later full object if requested
    win.webContents.send('update-theme', config.theme);
    win.webContents.send('update-color', config.mainColor);
  });

  // forward main logs to renderer for convenience (optional)
  const origLog = console.log;
  console.log = function(...args) {
    origLog(...args);
    try {
      if (win && win.webContents) {
        win.webContents.send('main-log', args.map(String).join(' '));
      }
    } catch (e) { /* ignore */ }
  };
}

function centerMainWindow() {
  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;
  const [w, h] = win.getSize();
  win.setPosition(Math.floor((sw - w) / 2), Math.floor((sh - h) / 2));
}

function fadeInWindow(targetWin) {
  if (!targetWin) return;
  isAnimating = true;
  let opacity = 0;
  targetWin.setOpacity(0);
  targetWin.show();
  const interval = setInterval(() => {
    opacity += 0.05;
    if (opacity >= 1) {
      targetWin.setOpacity(1);
      clearInterval(interval);
      isAnimating = false;
    } else {
      targetWin.setOpacity(opacity);
    }
  }, 16);
}

function fadeOutWindow(targetWin) {
  if (!targetWin) return;
  isAnimating = true;
  let opacity = targetWin.getOpacity();
  const interval = setInterval(() => {
    opacity -= 0.05;
    if (opacity <= 0) {
      targetWin.hide();
      clearInterval(interval);
      isAnimating = false;
    } else {
      targetWin.setOpacity(opacity);
    }
  }, 16);
}

function toggleMainWindow() {
  if (isAnimating) return;
  if (!win) return;
  if (win.isVisible()) fadeOutWindow(win);
  else {
    centerMainWindow();
    fadeInWindow(win);
  }
}

//
// ------------------------- IPC handlers -------------------------
ipcMain.on('change-main-color', (event, color) => {
  config.mainColor = color;
  saveConfig(config);
  if (win) win.webContents.send('update-color', color);
});

ipcMain.on('change-theme', (event, themeName) => {
  config.theme = themeName;
  saveConfig(config);
  logMain('change-theme ->', themeName);
  // find full theme info and send object if found
  const theme = scanThemes().find(t => t.name === themeName);
  if (theme && win) {
    win.webContents.send('update-theme-object', theme);
  } else if (win) {
    win.webContents.send('update-theme', themeName);
  }
});

ipcMain.on('request-themes', (e) => {
  e.sender.send('available-themes', scanThemes(), config.theme);
});

// perform-action (shutdown/restart/sleep)
ipcMain.on('perform-action', (event, action) => {
  logMain('perform-action:', action);
  const commands = {
    shutdown: 'shutdown /s /t 0',
    restart: 'shutdown /r /t 0',
    sleep: 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0'
  };
  if (commands[action]) {
    exec(commands[action], (err) => {
      if (err) logMain('exec error', err);
    });
  } else {
    logMain('Unknown action:', action);
  }
});

//
// ------------------------- Tray, settings window -------------------------
function createTray() {
  tray = new Tray(nativeImage.createEmpty());
  const menu = Menu.buildFromTemplate([
    { label: 'Настройки', click: openSettings },
    { label: 'Показать / Скрыть', click: toggleMainWindow },
    { label: 'Выход', click: () => app.quit() }
  ]);
  tray.setToolTip('PowerControl');
  tray.setContextMenu(menu);
  tray.on('click', toggleMainWindow);
}

let settingsWin = null;
function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 340,
    height: 460,
    resizable: false,
    title: 'Настройки',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  settingsWin.loadFile(path.join('settings', 'settings.html'));
}

//
// ------------------------- Startup -------------------------
app.whenReady().then(() => {
  ensureThemeDir();   // ensure user custom_theme exists
  createWindow();
  createTray();
  globalShortcut.register('Control+F12', toggleMainWindow);
  logMain('app ready, appPath:', app.getAppPath(), 'user custom_theme dir:', userCustomThemeDir);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
