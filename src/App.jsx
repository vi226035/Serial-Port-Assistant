import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import ReceivePanel from './components/ReceivePanel'
import SendPanel from './components/SendPanel'
import SerialConfigPanel from './components/SerialConfigPanel'
import { bytesToHex, hexToBytes, textWithLineEndingToBytes } from './lib/hex'
import {
  closeSerialPort,
  isDesktopSerialSupported,
  listSerialPorts,
  onSerialData,
  onSerialError,
  onSerialStatus,
  openSerialPort,
  setDTR,
  setRTS,
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

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}秒`
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m < 60) return `${m}分${r}秒`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}时${rm}分`
}

function decodeBytes(bytes, encoding, decoderRef) {
  if (encoding === 'hex') {
    return bytesToHex(bytes)
  }
  if (encoding === 'ascii') {
    return Array.from(bytes)
      .map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('')
  }
  // utf8 / gbk: use streaming TextDecoder
  if (!decoderRef.current || decoderRef.current._encoding !== encoding) {
    try {
      decoderRef.current = new TextDecoder(encoding, { fatal: false })
      decoderRef.current._encoding = encoding
    } catch {
      decoderRef.current = new TextDecoder('utf-8', { fatal: false })
      decoderRef.current._encoding = 'utf-8'
    }
  }
  return decoderRef.current.decode(bytes, { stream: true })
}

function App() {
  // Theme
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('serial-theme') || 'light'
  })
  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('serial-theme', theme)
  }, [theme])
  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  // Connection state
  const [config, setConfig] = useState(defaultConfig)
  const [ports, setPorts] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [encoding, setEncoding] = useState('utf8')
  const [flowControl, setFlowControl] = useState('none')
  const [dtr, setDtrState] = useState(true)
  const [rts, setRtsState] = useState(true)

  // Send state
  const [sendMode, setSendMode] = useState('text')
  const [sendValue, setSendValue] = useState('')
  const [textLineEnding, setTextLineEnding] = useState('\r\n')
  const [timedSend, setTimedSend] = useState({ enabled: false, interval: 1000 })
  const [presetCommands, setPresetCommands] = useState([])
  const timedTimerRef = useRef(null)

  // Receive state
  const [displayMode, setDisplayMode] = useState('text')
  const [terminalText, setTerminalText] = useState('')
  const [hexText, setHexText] = useState('')
  const [status, setStatus] = useState('未连接')
  const [error, setError] = useState('')
  const [receiveStats, setReceiveStats] = useState({ byteCount: 0, startTime: null, duration: '0秒' })
  const receiveDecoderRef = useRef(null)
  const allBytesRef = useRef([])

  const supported = useMemo(() => isDesktopSerialSupported(), [])
  const unsupportedError = supported ? '' : '桌面串口 API 未注入，请确认通过 Electron 启动。'

  // Theme toggle handler
  const handleThemeToggle = () => toggleTheme()

  // Clear receive
  const clearReceiveOutput = () => {
    setTerminalText('')
    setHexText('')
    setReceiveStats({ byteCount: 0, startTime: null, duration: '0秒' })
    allBytesRef.current = []
    receiveDecoderRef.current = null
  }

  // Receive data
  const handleReceiveData = useCallback((bytes) => {
    allBytesRef.current.push(...bytes)
    const newByteCount = allBytesRef.current.length

    // Decode for terminal text
    const decoded = decodeBytes(bytes, encoding, receiveDecoderRef)
    setTerminalText(prev => prev + decoded)
    setHexText(prev => prev + bytesToHex(bytes) + '\n')
    setReceiveStats(prev => ({
      ...prev,
      byteCount: newByteCount,
    }))
  }, [encoding])

  // Duration timer
  useEffect(() => {
    if (!receiveStats.startTime) return undefined
    const timer = setInterval(() => {
      setReceiveStats(prev => ({
        ...prev,
        duration: formatDuration(Date.now() - prev.startTime),
      }))
    }, 1000)
    return () => clearInterval(timer)
  }, [receiveStats.startTime])

  // Refresh ports
  const refreshPorts = async ({ clearError = true } = {}) => {
    try {
      if (clearError) setError('')
      const nextPorts = await listSerialPorts()
      setPorts(nextPorts)
      setConfig(current => ({
        ...current,
        path: nextPorts.some(p => p.path === current.path)
          ? current.path
          : nextPorts[0]?.path || '',
      }))
      setStatus(nextPorts.length > 0 ? `串口列表已刷新 (${nextPorts.length})` : '未发现串口')
    } catch (e) {
      setError(e.message || '读取串口列表失败。')
    }
  }

  // Connection toggle
  const handleToggleConnection = async () => {
    if (!config.path && !isConnected) {
      setError('请先刷新并选择串口设备。')
      return
    }
    try {
      setError('')
      if (isConnected) {
        await closeSerialPort()
        setIsConnected(false)
        setStatus('已断开')
        setDtrState(true)
        setRtsState(true)
        return
      }
      clearReceiveOutput()
      setReceiveStats(prev => ({ ...prev, startTime: Date.now() }))
      await openSerialPort({
        ...config,
        encoding,
        flowControl,
        dtr,
        rts,
      })
      setIsConnected(true)
      setStatus(`已连接 ${config.path}`)
    } catch (e) {
      setError(e.message || '串口连接失败。')
      setIsConnected(false)
    }
  }

  // Send
  const handleSend = useCallback(async (value, mode) => {
    const val = value !== undefined ? value : sendValue
    const mod = mode !== undefined ? mode : sendMode
    if (!isConnected) {
      setError('请先连接串口。')
      return
    }
    try {
      setError('')
      const payload =
        mod === 'hex' ? hexToBytes(val) : textWithLineEndingToBytes(val, textLineEnding)
      await writeToPort(payload)
      setStatus('发送成功')
    } catch (e) {
      setError(e.message || '发送失败。')
    }
  }, [sendValue, sendMode, textLineEnding, isConnected])

  // Timed send
  useEffect(() => {
    if (timedSend.enabled && isConnected) {
      timedTimerRef.current = setInterval(() => {
        if (sendValue.trim()) {
          handleSend(sendValue, sendMode)
        }
      }, timedSend.interval)
    }
    return () => {
      if (timedTimerRef.current) clearInterval(timedTimerRef.current)
    }
  }, [timedSend.enabled, timedSend.interval, isConnected, sendValue, sendMode, handleSend])

  // DTR/RTS
  const handleDTRChange = async (value) => {
    try {
      await setDTR(value)
      setDtrState(value)
    } catch (e) {
      setError(e.message || 'DTR 控制失败。')
    }
  }
  const handleRTSChange = async (value) => {
    try {
      await setRTS(value)
      setRtsState(value)
    } catch (e) {
      setError(e.message || 'RTS 控制失败。')
    }
  }

  // Preset send
  const handlePresetSend = (cmd) => {
    handleSend(cmd.value, cmd.mode)
  }

  // Save receive data
  const handleSaveReceive = () => {
    const content = displayMode === 'hex' ? hexText : terminalText
    if (!content) return
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `serial_receive_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Serial listeners
  useEffect(() => {
    if (!supported) return undefined

    queueMicrotask(() => refreshPorts({ clearError: false }))

    const disposeData = onSerialData((bytes) => handleReceiveData(bytes))
    const disposeStatus = onSerialStatus((payload) => {
      setIsConnected(Boolean(payload.connected))
      setStatus(payload.status || '状态已更新')
      if (!payload.connected) {
        setDtrState(true)
        setRtsState(true)
      }
    })
    const disposeError = onSerialError((message) => {
      setError(message || '串口发生错误。')
    })

    return () => {
      disposeData?.()
      disposeStatus?.()
      disposeError?.()
      closeSerialPort()
    }
  }, [supported, handleReceiveData])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Electron Serial Tool</p>
          <h1>串口助手</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            className="icon-btn theme-toggle"
            onClick={handleThemeToggle}
            title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div className="topbar-status">
            <span className={`status-dot ${isConnected ? 'online' : ''}`}></span>
            <span>{status}</span>
          </div>
        </div>
      </header>

      <main className="layout-grid">
        <SerialConfigPanel
          config={config}
          ports={ports}
          dtr={dtr}
          rts={rts}
          flowControl={flowControl}
          onConfigChange={(e) => setConfig(prev => ({ ...prev, [e.target.name]: e.target.value }))}
          onBaudPresetChange={(e) => {
            const v = e.target.value
            setConfig(prev => ({ ...prev, baudPreset: v, baudRate: v === 'custom' ? prev.baudRate : v }))
          }}
          onFlowControlChange={setFlowControl}
          onDTRChange={handleDTRChange}
          onRTSChange={handleRTSChange}
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
            encoding={encoding}
            receiveStats={receiveStats}
            onDisplayModeChange={setDisplayMode}
            onEncodingChange={setEncoding}
            onClear={clearReceiveOutput}
            onSave={handleSaveReceive}
          />
          <SendPanel
            sendMode={sendMode}
            sendValue={sendValue}
            textLineEnding={textLineEnding}
            timedSend={timedSend}
            presetCommands={presetCommands}
            onSendModeChange={setSendMode}
            onSendValueChange={setSendValue}
            onTextLineEndingChange={setTextLineEnding}
            onTimedSendChange={setTimedSend}
            onPresetCommandsChange={setPresetCommands}
            onSend={() => handleSend()}
            onPresetSend={handlePresetSend}
          />
        </section>
      </main>

      {error || unsupportedError ? <div className="error-banner">{error || unsupportedError}</div> : null}
    </div>
  )
}

export default App
