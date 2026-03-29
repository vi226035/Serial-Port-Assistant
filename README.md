<<<<<<< HEAD
# Serial Assistant

A desktop serial-port assistant built with React, Vite, Electron, and `serialport`.

## Stack

- React 19
- Vite 7
- Electron 36.4.0
- serialport 13

## Commands

- Install dependencies: `npm install`
- Run the web-only Vite dev server: `npm run dev` or `npm run dev:web`
- Run the Electron desktop app in development: `npm run dev:desktop`
- Build the frontend bundle: `npm run build`
- Build the Windows portable app: `npm run build:desktop`
- Run ESLint: `npm run lint`
- Preview the built frontend: `npm run preview`

## Architecture

The app is split into three layers:

1. **Renderer (`src/`)**
   - React UI for serial configuration, receive output, and send controls.
   - `src/App.jsx` coordinates connection state, send behavior, and receive display state.

2. **Preload bridge (`electron/preload.cjs`)**
   - Exposes `window.serialApi` to the renderer through `contextBridge`.
   - Bridges list/open/close/write actions and data/status/error events.

3. **Electron main process (`electron/main.js`, `electron/serial.js`)**
   - Creates the desktop window and loads either the Vite dev server or the built frontend.
   - Owns native serial-port access via `serialport` and forwards raw events back to the renderer.

## Runtime notes

- Desktop serial access depends on Electron; this project no longer relies on browser Web Serial for the main workflow.
- The packaged Windows build is configured as a portable x64 target and is written to `release/`.
- Electron is pinned to `36.4.0` because packaging and native rebuild behavior are sensitive to Electron version changes.
- `vite.config.js` uses a relative asset base so the packaged app can load built assets from local files.
=======
# Serial-Port-Assistant
基础串口功能
>>>>>>> b6da0e3070a18a0891cc0707a9f13019bf3caa61
