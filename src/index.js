var nodeConsole = require("console");
let cons = new nodeConsole.Console(process.stdout, process.stderr);

const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  desktopCapturer,
} = require("electron");
const path = require("path");

if (require("electron-squirrel-startup")) return app.quit();

// ignore dpi scaling as per https://stackoverflow.com/a/57924406
const considerScale = app.commandLine.hasSwitch("consider-scale");
if (!considerScale) {
  app.commandLine.appendSwitch("high-dpi-support", 1);
  app.commandLine.appendSwitch("force-device-scale-factor", 1);
}

ipcMain.on("set-ignore-mouse-events", (event, ...args) => {
  BrowserWindow.fromWebContents(event.sender).setIgnoreMouseEvents(...args);
});

const maxFrameRate = app.commandLine.hasSwitch("maxfps")
  ? parseInt(app.commandLine.getSwitchValue("maxfps"))
  : 60;
const freeze = app.commandLine.hasSwitch("freeze");
const initCapRect = {
  x: app.commandLine.hasSwitch("cx")
    ? parseInt(app.commandLine.getSwitchValue("cx"))
    : null,
  y: app.commandLine.hasSwitch("cy")
    ? parseInt(app.commandLine.getSwitchValue("cy"))
    : null,
  width: app.commandLine.hasSwitch("cw")
    ? parseInt(app.commandLine.getSwitchValue("cw"))
    : 1280,
  height: app.commandLine.hasSwitch("ch")
    ? parseInt(app.commandLine.getSwitchValue("ch"))
    : 720,
};
const initRenderRect = {
  x: app.commandLine.hasSwitch("rx")
    ? parseInt(app.commandLine.getSwitchValue("rx"))
    : null,
  y: app.commandLine.hasSwitch("ry")
    ? parseInt(app.commandLine.getSwitchValue("ry"))
    : null,
  width: app.commandLine.hasSwitch("rw")
    ? parseInt(app.commandLine.getSwitchValue("rw"))
    : 1280,
  height: app.commandLine.hasSwitch("rh")
    ? parseInt(app.commandLine.getSwitchValue("rh"))
    : 720,
};

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
  //
  // create and setup render window
  //

  const mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      backgroundThrottling: false, // continue playing <video> element https://stackoverflow.com/a/68685080
    },
    width: initRenderRect.width,
    height: initRenderRect.height,
    frame: false,
    autoHideMenuBar: true,
    resizable: false,
  });

  // start by setting initial window location starting at (0,0) and change it
  // later, when all other settings have been applied
  mainWindow.setPosition(0, 0);

  mainWindow.loadFile(path.join(__dirname, "render.html"));
  mainWindow.on("closed", () => app.quit());
  //mainWindow.setMenuBarVisibility(false)
  //mainWindow.webContents.openDevTools();

  mainWindow.on("focus", (event) => mainWindow.send("window-focus"));
  mainWindow.on("blur", (event) => mainWindow.send("window-blur"));
  mainWindow.on("resize", (event) =>
    mainWindow.send("window-resize", mainWindow.getBounds()),
  );
  mainWindow.on("move", (event) =>
    mainWindow.send("window-move", mainWindow.getBounds()),
  );
  mainWindow.send("window-resize", mainWindow.getBounds());
  mainWindow.send("window-move", mainWindow.getBounds());
  mainWindow.on("moved", (event) => checkWindowBounds(mainWindow));

  // now, set the "real" location of the render window after all other
  // settings have been done. hopefully, this eliminates electron's
  // aversity about negative window coordinates
  mainWindow.setPosition(
    initRenderRect.x ?? mainWindow.getPosition()[0],
    initRenderRect.y ?? mainWindow.getPosition()[1],
  );

  //
  // create and setup capture window
  //

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
    opacity: freeze ? 0 : 0.6,
  });

  // start by setting initial window location starting at (0,0) and change it
  // later, when all other settings have been applied
  captureWindow.setPosition(0, 0);

  captureWindow.loadFile(path.join(__dirname, "capture.html"));
  captureWindow.setContentProtection(true); // exclude from capture
  captureWindow.setAlwaysOnTop(true);
  captureWindow.setFocusable(false); // fancyzones wants windows to be focusable
  captureWindow.on("closed", () => app.quit());
  captureWindow.setIgnoreMouseEvents(freeze);
  //captureWindow.webContents.openDevTools();

  // now, set the "real" location after all other settings have been done.
  // hopefully, this eliminates electron's aversity about negative window
  // coordinates
  captureWindow.setPosition(
    initCapRect.x ?? captureWindow.getPosition()[0],
    initCapRect.y ?? captureWindow.getPosition()[1],
  );

  captureWindow.on("resized", (event) => {
    checkWindowBounds(mainWindow);
    checkWindowBounds(captureWindow);
    determineScreenToCapture();
  });
  captureWindow.on("moved", (event) => {
    checkWindowBounds(captureWindow);
    determineScreenToCapture();
  });
  captureWindow.on("resize", (event) =>
    updateMain(null, captureWindow.getSize()),
  );
  let moveTimer = undefined;
  captureWindow.on("move", (event) => {
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      checkWindowBounds(captureWindow);
      determineScreenToCapture();
    }, 100);
    updateMain(captureWindow.getPosition(), null);
  });

  // determineScreenToCapture calls update-main at the end
  mainWindow.webContents.once("dom-ready", determineScreenToCapture);
  ipcMain.on("update-main", (event, ...args) => {
    updateMain(captureWindow.getPosition(), captureWindow.getSize());
  });

  let currentDisplay = null;
  async function determineScreenToCapture() {
    const rect = captureWindow.getBounds();
    const display = screen.getDisplayMatching(rect);
    if (display?.toString() !== currentDisplay?.id.toString()) {
      currentDisplay = display;
      const sourceId = await getVideoSourceIdForDisplay(display);
      mainWindow.send("update-screen-to-capture", {
        display,
        sourceId,
        maxFrameRate,
      });
    }
  }

  async function getVideoSourceIdForDisplay(display) {
    const inputSources = await desktopCapturer.getSources({
      types: ["screen"],
    });

    cons.log(
      `find display ${display.id.toString()} @ ${JSON.stringify(
        display.bounds,
      )}`,
    );
    inputSources.map((is) =>
      cons.log(`  ${is.id}, ${is.name}: ${is.display_id}`),
    );
    let source = inputSources.find(
      (is) => is.display_id === display.id.toString(),
    );
    if (!source) {
      // the display_id property doesn't match up - time for plan B
      // see https://github.com/electron/electron/issues/15111#issuecomment-452346357
      // Note that this ONLY works if Screen 1 is your primary display; otherwise the list gets reordered
      const allDisplays = screen.getAllDisplays();
      const displayIndex = allDisplays.findIndex((d) => d.id === display.id);
      const sourceName = `Screen ${displayIndex + 1}`;
      cons.log(
        "display_id didn't match; Plan B: looking for input source named",
        sourceName,
      );
      source = inputSources.find((is) => is.name === sourceName);
    }
    if (!source) {
      throw new Error(
        `Cannot find source matching display ${
          display.id
        }. Candidates: ${JSON.stringify(inputSources, null, 2)}`,
      );
    }

    return source.id;
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
