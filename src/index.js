var nodeConsole = require("console");
let cons = new nodeConsole.Console(process.stdout, process.stderr);

const { app, BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

// ignore dpi scaling as per https://stackoverflow.com/a/57924406
const considerScale = app.commandLine.hasSwitch('consider-scale')
if (!considerScale) {
  app.commandLine.appendSwitch('high-dpi-support', 1)
  app.commandLine.appendSwitch('force-device-scale-factor', 1)
}

ipcMain.on("set-ignore-mouse-events", (event, ...args) => {
  BrowserWindow.fromWebContents(event.sender).setIgnoreMouseEvents(...args);
});

const freeze = app.commandLine.hasSwitch('freeze')
const initCapRect = {
  x: app.commandLine.hasSwitch('cx') ? parseInt(app.commandLine.getSwitchValue('cx')) : null,
  y: app.commandLine.hasSwitch('cy') ? parseInt(app.commandLine.getSwitchValue('cy')) : null,
  width: app.commandLine.hasSwitch('cw') ? parseInt(app.commandLine.getSwitchValue('cw')) : 1280,
  height: app.commandLine.hasSwitch('ch') ? parseInt(app.commandLine.getSwitchValue('ch')) : 720,
}
const initRenderRect = {
  x: app.commandLine.hasSwitch('rx') ? parseInt(app.commandLine.getSwitchValue('rx')) : null,
  y: app.commandLine.hasSwitch('ry') ? parseInt(app.commandLine.getSwitchValue('ry')) : null,
  width: app.commandLine.hasSwitch('rw') ? parseInt(app.commandLine.getSwitchValue('rw')) : 1280,
  height: app.commandLine.hasSwitch('rh') ? parseInt(app.commandLine.getSwitchValue('rh')) : 720,
}

function checkWindowBounds(win) {
  const rect = win.getBounds();
  const dbounds = screen.getDisplayMatching(rect).bounds;
  rect.x = Math.max(rect.x, dbounds.x);
  rect.y = Math.max(rect.y, dbounds.y);
  rect.x = Math.min(rect.x, dbounds.x + dbounds.width - rect.width);
  rect.y = Math.min(rect.y, dbounds.y + dbounds.height - rect.height);
  win.setBounds(rect);
}

const createWindows = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      backgroundThrottling: false // continue playing <video> element https://stackoverflow.com/a/68685080
    },
    width: initCapRect.width,
    height: initCapRect.height,
    frame: false,
    autoHideMenuBar: true,
    resizable: false,
  });
  mainWindow.setPosition(initRenderRect.x ?? mainWindow.getPosition()[0], initRenderRect.y ?? mainWindow.getPosition()[1])
  mainWindow.loadFile(path.join(__dirname, "render.html"));
  mainWindow.on("closed", () => app.quit());
  //mainWindow.setMenuBarVisibility(false)
  //mainWindow.webContents.openDevTools();

  mainWindow.on("focus", (event) => mainWindow.send("window-focus"));
  mainWindow.on("blur", (event) => mainWindow.send("window-blur"));
  mainWindow.on("resize", (event) =>
    mainWindow.send("window-resize", mainWindow.getBounds())
  );
  mainWindow.on("move", (event) =>
    mainWindow.send("window-move", mainWindow.getBounds())
  );
  mainWindow.send("window-resize", mainWindow.getBounds());
  mainWindow.send("window-move", mainWindow.getBounds());
  mainWindow.on("moved", (event) => checkWindowBounds(mainWindow));

  // capture window
  const captureWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    width: initCapRect.width,
    height: initCapRect.height,
    transparent: true, // fancyzones only resizes non-transparent windows
    frame: false,
    opacity: freeze? 0 : 0.6
  });
  captureWindow.setPosition(initCapRect.x ?? captureWindow.getPosition()[0], initCapRect.y ?? captureWindow.getPosition()[1])
  captureWindow.loadFile(path.join(__dirname, "capture.html"));
  captureWindow.setContentProtection(true); // exclude from capture
  captureWindow.setAlwaysOnTop(true);
  captureWindow.setFocusable(false);  // fancyzones wants windows to be focusable
  captureWindow.on("closed", () => app.quit());
  captureWindow.setIgnoreMouseEvents(freeze)
  //captureWindow.webContents.openDevTools();

  captureWindow.on("resized", (event) => {
    checkWindowBounds(mainWindow);
    checkWindowBounds(captureWindow);
    determineScreenToCapture();
  });
  captureWindow.on("moved", (event) => {checkWindowBounds(captureWindow); determineScreenToCapture(); });
  captureWindow.on("resize", (event) =>
    updateMain(null, captureWindow.getSize())
  );
  captureWindow.on("move", (event) =>
    updateMain(captureWindow.getPosition(), null)
  );

  // determineScreenToCapture calls update-main at the end
  mainWindow.webContents.once('dom-ready', determineScreenToCapture);
  ipcMain.on("update-main", (event, ...args) => {
    updateMain(captureWindow.getPosition(), captureWindow.getSize());
  });

  function determineScreenToCapture() {
    const rect = captureWindow.getBounds();
    const display = screen.getDisplayMatching(rect);
    mainWindow.send("update-screen-to-capture", display);
  }
  function updateMain(pos, dim) {
    if (dim) {
      mainWindow.resizable = true;
      mainWindow.setSize(dim[0], dim[1]);
      mainWindow.resizable = false;
    }
    mainWindow.send("update-capture-area", pos, dim);
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindows);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindows();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
