# ScreenAreaShare

ScreenAreaShare allows sharing selected area of the screen in applications that do not natively support this feature such as Teams.

## How It Works
ScreenAreaShare creates 2 windows. The capture window is a click-through, transparent window indicating the recording area via a red border.
The rendering window displays the content of that area. In applications such as Teams, you can then share the rendering window.

## How To Run
### Via Release
You can download the executable for windows form the Releases page.
### Via Source Code
1. Clone or download the source code.
2. Either run directly or build an executable.
    1. Source: run `npm start`.
    2. Build executable: run `npm run make`.  
    Execute the built .exe file in the `out/` folder.

## Usage
1. Two windows should open: One border-window and one rendering window. These two windows can be moved via a drag-drop. The red borders can be resized.
2. With both windows open, start the sharing function of the application of your choice (e.g. Teams) by selecting the option to share a window. Select this application.
