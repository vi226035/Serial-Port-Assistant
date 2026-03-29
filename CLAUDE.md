# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Install dependencies: `npm install`
- Run the web-only Vite dev server: `npm run dev` or `npm run dev:web`
- Run the Electron desktop app against the Vite dev server: `npm run dev:desktop`
- Build the web frontend into `dist/`: `npm run build`
- Build the Windows portable Electron app into `release/`: `npm run build:desktop`
- Run ESLint: `npm run lint`
- Preview the built web app: `npm run preview`

## Architecture overview

This repository is a React + Vite serial assistant that now runs as an Electron desktop app for real serial-port access and Windows EXE packaging.

### Runtime split: renderer vs main process

The app is intentionally split into three layers:

1. **Renderer UI (`src/`)**
   - React owns the UI, connection state, send form state, and receive display state.
   - `src/App.jsx` is the orchestration layer: it wires the config sidebar, receive panel, send panel, serial status updates, and receive/send behavior together.
   - `src/components/` contains presentational panels, while `src/lib/hex.js` and `src/lib/serial.js` provide reusable data conversion and desktop-serial wrappers.

2. **Electron preload bridge (`electron/preload.cjs`)**
   - The renderer never imports Node/Electron APIs directly.
   - `preload.cjs` exposes a narrow `window.serialApi` surface via `contextBridge`, including list/open/close/write plus event subscriptions for data/status/error.
   - The project uses `preload.cjs` rather than the older `preload.js`; the CommonJS preload is the working path for API injection.

3. **Electron main process (`electron/main.js`, `electron/serial.js`)**
   - `electron/main.js` creates the BrowserWindow, loads Vite in dev and `dist/index.html` in packaged mode, and points to `preload.cjs`.
   - `electron/serial.js` is the actual serial-port backend. It owns the active `SerialPort` instance, registers IPC handlers, lists system ports, opens/closes the port, writes bytes, and forwards data/status/error events back to the renderer.

When changing serial behavior, keep the responsibility boundary intact: the main process should stay focused on raw serial I/O and IPC, while the renderer should own display formatting and user-facing state.

### Receive/send data flow

- Outbound data is encoded in the renderer:
  - text mode uses `textWithLineEndingToBytes()` from `src/lib/hex.js`
  - HEX mode uses `hexToBytes()`
  - encoded bytes are passed through `src/lib/serial.js` to `window.serialApi.write()`
- Inbound data originates in `electron/serial.js` from `SerialPort`'s `data` event and is forwarded unchanged to the renderer.
- The renderer is responsible for turning raw chunks into display content. The receive panel is now terminal-style rather than timestamped message cards, so receive formatting changes should usually happen in `src/App.jsx` / `src/components/ReceivePanel.jsx`, not in the main process.

### Packaging and build assumptions

- Electron packaging is configured in `package.json` under the `build` field.
- The Windows target is a **portable x64** build written to `release/`.
- `electron` is pinned to `36.4.0`; keep that in mind before casually upgrading because packaging behavior and native rebuilds were sensitive during setup.
- `vite.config.js` uses a relative base (`./`) so the packaged app can load built assets from local files. If the packaged app opens blank, check that first.

### Current UX shape

- The app is desktop-first now: serial support depends on Electron and the preload bridge, not browser Web Serial.
- The receive area is intended to behave like a serial terminal/log stream.
- The serial device dropdown currently uses `friendlyName` generated in the main process from the port path plus manufacturer when available.

## Files worth reading first

- `src/App.jsx` — top-level state and receive/send orchestration
- `src/components/ReceivePanel.jsx` — terminal-style receive UI
- `src/components/SendPanel.jsx` — text/HEX send UI and line-ending selection
- `src/components/SerialConfigPanel.jsx` — port configuration and connection controls
- `src/lib/hex.js` — byte/text/HEX conversions
- `src/lib/serial.js` — renderer-facing desktop serial wrapper
- `electron/main.js` — Electron window/bootstrap
- `electron/preload.cjs` — renderer bridge
- `electron/serial.js` — main-process serial I/O and IPC
