import { BrowserWindow, ipcMain } from 'electron'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { SerialPort } from 'serialport'

let activePort = null
const isDev = process.env.NODE_ENV !== 'production'

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
    await new Promise((resolve, reject) => {
      activePort.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
    cleanupPort()
  }

  const port = new SerialPort({
    path: options.path,
    baudRate: Number(options.baudRate),
    dataBits: Number(options.dataBits),
    stopBits: Number(options.stopBits),
    parity: options.parity,
    autoOpen: false,
  })

  await new Promise((resolve, reject) => {
    port.open((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })

  port.on('data', (chunk) => {
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
  if (!activePort) {
    return true
  }

  const port = activePort
  await new Promise((resolve, reject) => {
    port.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
  cleanupPort()
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
      if (error) {
        reject(error)
        return
      }
      activePort.drain((drainError) => {
        if (drainError) {
          reject(drainError)
          return
        }
        resolve()
      })
    })
  })

  return true
})
