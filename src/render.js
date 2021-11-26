// prepare stdout
var nodeConsole = require("console");
let cons = new nodeConsole.Console(process.stdout, process.stderr);

const cropElement = document.getElementsByClassName("crop")[0];
const videoElement = document.querySelector("video");
const marginElement = document.getElementsByClassName("margin")[0];
const maskElement = document.getElementsByClassName("mask")[0];

const { desktopCapturer, ipcRenderer, app } = require("electron");

async function getVideoSources() {
  const inputSources = await desktopCapturer.getSources({
    //types: ['window', 'screen']
    types: ["screen"],
  });

  cons.log(inputSources);
  selectSource(inputSources[0]);
}

async function selectSource(source) {
  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: source.id,
      },
    },
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  videoElement.srcObject = stream;
  videoElement.play();
}

getVideoSources();
//selectSource(0)

ipcRenderer.on("update-capture-area", (event, pos, dim) => {
  //console.log(pos, dim)
  if (pos) {
    marginElement.style.left = -pos[0] + "px";
    marginElement.style.top = -pos[1] + "px";
  }
  if (dim) {
    cropElement.style.width = dim[0] + "px";
    cropElement.style.height = dim[1] + "px";
  }
});

ipcRenderer.on("window-move", (event, rect) => {
  maskElement.style.marginLeft = rect.x + "px";
  maskElement.style.marginTop = rect.y + "px";
});
ipcRenderer.on("window-resize", (event, rect) => {
  maskElement.style.width = rect.width + "px";
  maskElement.style.height = rect.height + "px";
});
ipcRenderer.on("window-focus", (event) => {
  cons.log("focus");
  maskElement.style.display = "block";
});
ipcRenderer.on("window-blur", (event) => {
  cons.log("blur");
  maskElement.style.display = "none";
});

window.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "Escape":
      window.close();
      break;
  }
});
