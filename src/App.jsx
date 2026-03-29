import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import ReceivePanel from './components/ReceivePanel'
import SendPanel from './components/SendPanel'
import SerialConfigPanel from './components/SerialConfigPanel'
import { bytesToHex, bytesToText, hexToBytes, textWithLineEndingToBytes } from './lib/hex'
import {
  closeSerialPort,
  isDesktopSerialSupported,
  listSerialPorts,
  onSerialData,
  onSerialError,
  onSerialStatus,
  openSerialPort,
  writeToPort,
} from './lib/serial'

const defaultConfig = {
  path: '',
  baudPreset: '115200',
  baudRate: '115200',
  dataBits: '8',
  stopBits: '1',
  parity: 'none',
}

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function appendWithNewline(current, next) {
  return current ? `${current}${next}` : next
}

function App() {
  const [config, setConfig] = useState(defaultConfig)
  const [ports, setPorts] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [sendMode, setSendMode] = useState('text')
  const [displayMode, setDisplayMode] = useState('text')
  const [sendValue, setSendValue] = useState('')
  const [textLineEnding, setTextLineEnding] = useState('\r\n')
  const [terminalText, setTerminalText] = useState('')
  const [hexText, setHexText] = useState('')
  const [status, setStatus] = useState('未连接')
  const [error, setError] = useState('')

  const supported = useMemo(() => isDesktopSerialSupported(), [])
  const textBufferRef = useRef('')

  const flushTextBuffer = () => {
    if (!textBufferRef.current) {
      return
    }

    setTerminalText((current) => appendWithNewline(current, textBufferRef.current))
    textBufferRef.current = ''
  }

  const handleReceiveData = (payload) => {
    const bytes = new Uint8Array(payload)
    const textChunk = normalizeText(bytesToText(bytes))

    setHexText((current) => appendWithNewline(current, bytesToHex(bytes)))

    const combinedText = `${textBufferRef.current}${textChunk}`
    const lastNewlineIndex = combinedText.lastIndexOf('\n')

    if (lastNewlineIndex >= 0) {
      const completeText = combinedText.slice(0, lastNewlineIndex + 1)
      setTerminalText((current) => appendWithNewline(current, completeText))
      textBufferRef.current = combinedText.slice(lastNewlineIndex + 1)
      return
    }

    textBufferRef.current = combinedText
  }

  const clearReceiveOutput = () => {
    textBufferRef.current = ''
    setTerminalText('')
    setHexText('')
  }

  const refreshPorts = async () => {
    try {
      setError('')
      const nextPorts = await listSerialPorts()
      setPorts(nextPorts)
      setConfig((current) => {
        const hasCurrent = nextPorts.some((port) => port.path === current.path)
        return {
          ...current,
          path: hasCurrent ? current.path : nextPorts[0]?.path || '',
        }
      })
      setStatus(nextPorts.length > 0 ? `串口列表已刷新 (${nextPorts.length})` : '未发现串口')
    } catch (refreshError) {
      setError(refreshError.message || '读取串口列表失败。')
    }
  }

  useEffect(() => {
    if (!supported) {
      setError('桌面串口 API 未注入，请确认通过 Electron 启动。')
      return undefined
    }

    refreshPorts()

    const disposeData = onSerialData((payload) => {
      handleReceiveData(payload)
    })

    const disposeStatus = onSerialStatus((payload) => {
      if (!payload.connected) {
        flushTextBuffer()
      }
      setIsConnected(Boolean(payload.connected))
      setStatus(payload.status || '状态已更新')
    })

    const disposeError = onSerialError((message) => {
      setError(message || '串口发生错误。')
    })

    return () => {
      flushTextBuffer()
      disposeData?.()
      disposeStatus?.()
      disposeError?.()
      closeSerialPort()
    }
  }, [supported])

  const handleConfigChange = (event) => {
    const { name, value } = event.target
    setConfig((current) => ({ ...current, [name]: value }))
  }

  const handleBaudPresetChange = (event) => {
    const { value } = event.target
    setConfig((current) => ({
      ...current,
      baudPreset: value,
      baudRate: value === 'custom' ? current.baudRate : value,
    }))
  }

  const handleToggleConnection = async () => {
    if (!config.path && !isConnected) {
      setError('请先刷新并选择串口设备。')
      return
    }

    try {
      setError('')

      if (isConnected) {
        await closeSerialPort()
        flushTextBuffer()
        setIsConnected(false)
        setStatus('已断开')
        return
      }

      textBufferRef.current = ''
      await openSerialPort(config)
      setIsConnected(true)
      setStatus(`正在连接 ${config.path}`)
    } catch (connectionError) {
      setError(connectionError.message || '串口连接失败。')
      setIsConnected(false)
    }
  }

  const handleSend = async () => {
    if (!isConnected) {
      setError('请先连接串口。')
      return
    }

    try {
      setError('')
      const payload =
        sendMode === 'hex' ? hexToBytes(sendValue) : textWithLineEndingToBytes(sendValue, textLineEnding)
      await writeToPort(payload)
      setStatus('发送成功')
    } catch (sendError) {
      setError(sendError.message || '发送失败。')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Electron Serial Tool</p>
          <h1>串口助手</h1>
        </div>
        <div className="topbar-status">
          <span className={`status-dot ${isConnected ? 'online' : ''}`}></span>
          <span>{status}</span>
        </div>
      </header>

      <main className="layout-grid">
        <SerialConfigPanel
          config={config}
          ports={ports}
          onConfigChange={handleConfigChange}
          onBaudPresetChange={handleBaudPresetChange}
          onRefreshPorts={refreshPorts}
          onToggleConnection={handleToggleConnection}
          isSupported={supported}
          isConnected={isConnected}
          connectionLabel={config.path || '未选设备'}
        />

        <section className="workspace">
          <ReceivePanel
            terminalText={terminalText}
            hexText={hexText}
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
            onClear={clearReceiveOutput}
          />
          <SendPanel
            sendMode={sendMode}
            sendValue={sendValue}
            textLineEnding={textLineEnding}
            onSendModeChange={setSendMode}
            onSendValueChange={setSendValue}
            onTextLineEndingChange={setTextLineEnding}
            onSend={handleSend}
          />
        </section>
      </main>

      {error ? <div className="error-banner">{error}</div> : null}
    </div>
  )
}

export default App
