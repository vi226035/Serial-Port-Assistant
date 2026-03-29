function getSerialApi() {
  if (typeof window === 'undefined' || !window.serialApi) {
    const debugKeys = window?.desktopDebug?.keys?.join(', ') || 'none'
    throw new Error(`桌面串口 API 不可用。请通过 Electron 启动应用。debug=${debugKeys}`)
  }

  return window.serialApi
}

export function isDesktopSerialSupported() {
  return typeof window !== 'undefined' && Boolean(window.serialApi)
}

export async function listSerialPorts() {
  return getSerialApi().listPorts()
}

export async function openSerialPort(options) {
  if (!options?.path) {
    throw new Error('请先选择串口设备。')
  }

  await getSerialApi().openPort(options)
}

export async function closeSerialPort() {
  if (typeof window === 'undefined' || !window.serialApi) {
    return
  }

  await window.serialApi.closePort()
}

export async function writeToPort(data) {
  await getSerialApi().write(Array.from(data))
}

export function onSerialData(callback) {
  return window.serialApi?.onData?.((payload) => callback(new Uint8Array(payload)))
}

export function onSerialStatus(callback) {
  return window.serialApi?.onStatus?.(callback)
}

export function onSerialError(callback) {
  return window.serialApi?.onError?.(callback)
}
