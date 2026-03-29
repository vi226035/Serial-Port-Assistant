const { contextBridge, ipcRenderer } = require('electron')

const serialApi = {
  listPorts: () => ipcRenderer.invoke('serial:list'),
  openPort: (options) => ipcRenderer.invoke('serial:open', options),
  closePort: () => ipcRenderer.invoke('serial:close'),
  write: (data) => ipcRenderer.invoke('serial:write', data),
  onData: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('serial:data', listener)
    return () => ipcRenderer.removeListener('serial:data', listener)
  },
  onStatus: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('serial:status', listener)
    return () => ipcRenderer.removeListener('serial:status', listener)
  },
  onError: (callback) => {
    const listener = (_event, message) => callback(message)
    ipcRenderer.on('serial:error', listener)
    return () => ipcRenderer.removeListener('serial:error', listener)
  },
}

contextBridge.exposeInMainWorld('serialApi', serialApi)
contextBridge.exposeInMainWorld('desktopDebug', {
  hasSerialApi: true,
  keys: Object.keys(serialApi),
})
