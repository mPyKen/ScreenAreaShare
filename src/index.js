var nodeConsole = require("console");
let cons = new nodeConsole.Console(process.stdout, process.stderr);

const { app, BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

ipcMain.on("set-ignore-mouse-events", (event, ...args) => {
  BrowserWindow.fromWebContents(event.sender).setIgnoreMouseEvents(...args);
});

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
    },
    width: 1280,
    height: 720,
    frame: false,
    autoHideMenuBar: true,
    resizable: false,
  });
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
    width: 1280,
    height: 720,
    transparent: true,
    frame: false,
  });
  captureWindow.loadFile(path.join(__dirname, "capture.html"));
  captureWindow.setContentProtection(true); // exclude from capture
  captureWindow.setAlwaysOnTop(true);
  captureWindow.setFocusable(false);
  captureWindow.on("closed", () => app.quit());
  //captureWindow.webContents.openDevTools();

  captureWindow.on("resized", (event) => {
    checkWindowBounds(mainWindow);
    checkWindowBounds(captureWindow);
  });
  captureWindow.on("moved", (event) => checkWindowBounds(captureWindow));
  captureWindow.on("resize", (event) =>
    updateMain(null, captureWindow.getSize())
  );
  captureWindow.on("move", (event) =>
    updateMain(captureWindow.getPosition(), null)
  );
  updateMain(captureWindow.getPosition(), captureWindow.getSize());

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
