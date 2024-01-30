// prepare stdout
var nodeConsole = require("console");
let cons = new nodeConsole.Console(process.stdout, process.stderr);

const cropElement = document.getElementsByClassName("crop")[0];
const videoElement = document.querySelector("video");
const marginElement = document.getElementsByClassName("margin")[0];
const maskElement = document.getElementsByClassName("mask")[0];

const { ipcRenderer, app } = require("electron");

async function selectSource(sourceId, display) {
  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: sourceId,
        minWidth: display.bounds.width,
        minHeight: display.bounds.height,
      },
    },
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  setTimeout(() => {
    cons.log("stream info:");
    stream.getVideoTracks().map((track) => {
      const s = track.getSettings();
      cons.log(`  ${s.deviceId}: ${s.width}x${s.height}`);
    });
  }, 100);
  videoElement.srcObject = stream;
  videoElement.play();
}

let dispx = 0;
let dispy = 0;
ipcRenderer.on(
  "update-screen-to-capture",
  async (event, { display, sourceId }) => {
    cons.log(`>> update display: ${display.id}, ${sourceId}`);
    const { x: x, y: y } = display.bounds;
    dispx = x ?? dispx;
    dispy = y ?? dispy;
    await selectSource(sourceId, display);
    ipcRenderer.send("update-main");
  }
);
ipcRenderer.on("update-capture-area", (event, pos, dim) => {
  //console.log(pos, dim)
  if (pos) {
    marginElement.style.left = dispx - pos[0] + "px";
    marginElement.style.top = dispy - pos[1] + "px";
  }
  if (dim) {
    cropElement.style.width = dim[0] + "px";
    cropElement.style.height = dim[1] + "px";
  }
});

ipcRenderer.on("window-move", (event, rect) => {
  maskElement.style.marginLeft = rect.x - dispx + "px";
  maskElement.style.marginTop = rect.y - dispy + "px";
});
ipcRenderer.on("window-resize", (event, rect) => {
  maskElement.style.width = rect.width + "px";
  maskElement.style.height = rect.height + "px";
});
ipcRenderer.on("window-focus", (event) => {
  // cons.log("focus");
  maskElement.style.display = "block";
});
ipcRenderer.on("window-blur", (event) => {
  // cons.log("blur");
  maskElement.style.display = "none";
});

window.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "Escape":
      window.close();
      break;
  }
});
