[![Github All Releases](https://img.shields.io/github/license/mPyKen/ScreenAreaShare)](https://github.com/mPyKen/ScreenAreaShare)
[![Build](https://github.com/mPyKen/ScreenAreaShare/actions/workflows/build.yml/badge.svg)](https://github.com/mPyKen/ScreenAreaShare/actions/workflows/build.yml)
[![Github All Releases](https://img.shields.io/github/v/release/mPyKen/ScreenAreaShare)](https://github.com/mPyKen/ScreenAreaShare/releases)
[![Github All Releases](https://img.shields.io/github/downloads/mPyKen/ScreenAreaShare/total.svg)](https://github.com/mPyKen/ScreenAreaShare/releases)

# ScreenAreaShare

ScreenAreaShare allows sharing selected area of the screen in applications that do not natively support this feature such as Teams.

## How It Works
ScreenAreaShare creates 2 windows. The capture window is a click-through, transparent window indicating the recording area via a red border.
The rendering window displays the content of that area. In applications such as Teams, you can then share the rendering window.

## How To Run
### Via Release
You can download the executable for windows from the [Releases page](https://github.com/mPyKen/ScreenAreaShare/releases).
### Via Source Code
1. Clone or download the source code.
2. Run `npm install`
3. Either run directly or build an executable.
    1. Source: run `npm start`.
    2. Build executable: run `npm run make`.  
    Execute the built .exe file in the `out/` folder.

## Usage
1. Two windows should open: One border-window and one rendering window. These two windows can be moved via a drag-drop. The red borders can be resized.
2. With both windows open, start the sharing function of the application of your choice (e.g. Teams) by selecting the option to share a window. Select this application.

## Command Line Parameters
If you run from source: `npm start -- -- --cx=0 --cy=0 ...` (note the additional `--` required by electron-forge)  
If you run a prebuilt executable: `path/to/screen-area-share.exe --cx=0 --cy=0 ...`  

|Parameter|Description|
|-|-|
|`--freeze`|Hide capturing window|
|`--consider-scale`|Considers scale settings of the screen|
|`--maxfps=<fps>`|Set maximum frames per second during capture|
|`--cx=<x>`, `--cy=<y>`|Initial top left coordinate of the capturing window|
|`--cw=<w>`, `--ch=<h>`|Initial width and height of the capturing window|
|`--rx=<x>`, `--ry=<y>`|Initial top left coordinate of the rendering window|
