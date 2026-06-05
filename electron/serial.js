import { BrowserWindow, app, ipcMain } from 'electron'
import { Buffer } from 'node:buffer'
import { SerialPort } from 'serialport'

let activePort = null
const isDev = !app.isPackaged

function sendToRenderer(channel, payload) {
  const [window] = BrowserWindow.getAllWindows()
  window?.webContents.send(channel, payload)
}

function devLog(...args) {
  if (isDev) {
    console.log('[serial]', ...args)
  }
}

function cleanupPort() {
  if (!activePort) {
    return
  }
  activePort.removeAllListeners('data')
  activePort.removeAllListeners('error')
  activePort.removeAllListeners('close')
  activePort = null
}

export function cleanupSerial() {
  if (!activePort?.isOpen) {
    cleanupPort()
    return
  }
  try {
    activePort.close()
  } catch {
    // ignore close errors during app shutdown
  }
  cleanupPort()
}

ipcMain.handle('serial:list', async () => {
  devLog('list ports')
  try {
    const ports = await SerialPort.list()
    devLog('ports found', ports.map((port) => port.path))
    return ports.map((port) => ({
      path: port.path,
      manufacturer: port.manufacturer || '',
      serialNumber: port.serialNumber || '',
      friendlyName: [port.path, port.manufacturer].filter(Boolean).join(' · ') || port.path,
    }))
  } catch (error) {
    devLog('list error', error)
    throw error
  }
})

ipcMain.handle('serial:open', async (_event, options) => {
  devLog('open port', options)

  if (activePort?.isOpen) {
    try {
      await new Promise((resolve, reject) => {
        activePort.close((error) => {
          if (error) { reject(error); return }
          resolve()
        })
      })
    } catch (error) {
      devLog('close existing port failed', error)
    } finally {
      cleanupPort()
    }
  }

  const portOptions = {
    path: options.path,
    baudRate: Number(options.baudRate),
    dataBits: Number(options.dataBits),
    stopBits: Number(options.stopBits),
    parity: options.parity,
    autoOpen: false,
  }

  if (options.flowControl === 'hardware') {
    portOptions.rtscts = true
  }

  const port = new SerialPort(portOptions)

  await new Promise((resolve, reject) => {
    port.open((error) => {
      if (error) { reject(error); return }
      resolve()
    })
  })

  // Set DTR/RTS defaults
  if (options.dtr !== undefined) {
    port.set({ dtr: options.dtr })
  }
  if (options.rts !== undefined) {
    port.set({ rts: options.rts })
  }

  port.on('data', (chunk) => {
    if (chunk.length === 0) return
    devLog('data received', chunk.length, 'bytes')
    // Send raw bytes only; renderer handles decoding based on selected encoding
    sendToRenderer('serial:data', Array.from(chunk))
  })

  port.on('error', (error) => {
    devLog('port error', error)
    sendToRenderer('serial:error', error.message)
  })

  port.on('close', () => {
    devLog('port closed')
    sendToRenderer('serial:status', { connected: false, status: '已断开' })
    cleanupPort()
  })

  activePort = port
  sendToRenderer('serial:status', { connected: true, status: `已连接 ${options.path}` })
  return true
})

ipcMain.handle('serial:close', async () => {
  devLog('close port')
  if (!activePort) return true
  const port = activePort
  try {
    await new Promise((resolve, reject) => {
      port.close((error) => {
        if (error) { reject(error); return }
        resolve()
      })
    })
  } catch (error) {
    devLog('close port failed', error)
  } finally {
    cleanupPort()
  }
  return true
})

ipcMain.handle('serial:write', async (_event, data) => {
  if (!activePort?.isOpen) {
    throw new Error('串口未连接，无法发送。')
  }
  const buffer = Buffer.from(data)
  devLog('write bytes', buffer.length)
  await new Promise((resolve, reject) => {
    activePort.write(buffer, (error) => {
      if (error) { reject(error); return }
      activePort.drain((drainError) => {
        if (drainError) { reject(drainError); return }
        resolve()
      })
    })
  })
  return true
})

ipcMain.handle('serial:setDTR', async (_event, value) => {
  if (!activePort?.isOpen) return
  activePort.set({ dtr: value })
})

ipcMain.handle('serial:setRTS', async (_event, value) => {
  if (!activePort?.isOpen) return
  activePort.set({ rts: value })
})

ipcMain.handle('serial:getSignals', async () => {
  if (!activePort?.isOpen) return null
  return await new Promise((resolve) => {
    activePort.get((error, signals) => {
      if (error) { resolve(null); return }
      resolve(signals)
    })
  })
})
