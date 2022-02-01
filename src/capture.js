// prepare stdout
var nodeConsole = require("console");
let cons = new nodeConsole.Console(process.stdout, process.stderr);

// get main window
const { ipcRenderer } = require("electron");

// https://www.electronjs.org/docs/latest/api/frameless-window#click-through-window
const inner = document.getElementsByClassName("inner")[0];
inner.addEventListener("mouseenter", () => {
  ipcRenderer.send("set-ignore-mouse-events", true, { forward: true });
  // cons.log(`mouseenter, ignore: true`);
});
inner.addEventListener("mouseleave", () => {
  ipcRenderer.send("set-ignore-mouse-events", false);
  // cons.log(`mouseleave, ignore: false`);
});
