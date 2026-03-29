import { useEffect, useRef } from 'react'

function ReceivePanel({ terminalText, hexText, displayMode, onDisplayModeChange, onClear }) {
  const outputRef = useRef(null)

  useEffect(() => {
    const element = outputRef.current
    if (!element) {
      return
    }

    element.scrollTop = element.scrollHeight
  }, [terminalText, hexText, displayMode])

  const content = displayMode === 'hex' ? hexText : terminalText

  return (
    <section className="panel terminal-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">数据接收</p>
          <h2>接收窗口</h2>
        </div>

        <div className="toolbar">
          <div className="segmented-control">
            <button
              className={displayMode === 'text' ? 'active' : ''}
              onClick={() => onDisplayModeChange('text')}
            >
              文本
            </button>
            <button
              className={displayMode === 'hex' ? 'active' : ''}
              onClick={() => onDisplayModeChange('hex')}
            >
              HEX
            </button>
          </div>
          <button className="ghost-button" onClick={onClear}>清空</button>
        </div>
      </div>

      <div ref={outputRef} className="terminal-output terminal-stream">
        {content ? (
          <pre>{content}</pre>
        ) : (
          <div className="empty-state">
            <p>还没有收到数据。</p>
            <span>连接串口后，接收内容会实时显示在这里。</span>
          </div>
        )}
      </div>
    </section>
  )
}

export default ReceivePanel
