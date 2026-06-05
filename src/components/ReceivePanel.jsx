import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const AUTO_SCROLL_THRESHOLD = 24
const encodingOptions = [
  { value: 'utf8', label: 'UTF-8' },
  { value: 'gbk', label: 'GBK' },
  { value: 'ascii', label: 'ASCII' },
  { value: 'hex', label: 'HEX' },
]

function isNearBottom(element) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= AUTO_SCROLL_THRESHOLD
}

function ReceivePanel({
  terminalText,
  hexText,
  displayMode,
  encoding,
  receiveStats,
  onDisplayModeChange,
  onEncodingChange,
  onClear,
  onSave,
}) {
  const outputRef = useRef(null)
  const shouldStickToBottomRef = useRef(true)
  const [autoScroll, setAutoScroll] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Sync auto-scroll ref with state
  useEffect(() => {
    shouldStickToBottomRef.current = autoScroll
  }, [autoScroll])

  useEffect(() => {
    const element = outputRef.current
    if (!element) return undefined

    const handleScroll = () => {
      const near = isNearBottom(element)
      shouldStickToBottomRef.current = near
      setAutoScroll(near)
    }

    handleScroll()
    element.addEventListener('scroll', handleScroll)
    return () => element.removeEventListener('scroll', handleScroll)
  }, [])

  useLayoutEffect(() => {
    const element = outputRef.current
    if (!element || !shouldStickToBottomRef.current) return undefined

    const frameId = window.requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [terminalText, hexText, displayMode])

  const content = displayMode === 'hex' ? hexText : terminalText

  // Search highlighting
  const highlightedContent = useCallback(() => {
    if (!searchQuery || displayMode === 'hex') return content
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    return content.replace(regex, '<mark>$1</mark>')
  }, [content, searchQuery, displayMode])

  const displayContent = searchQuery && displayMode !== 'hex'
    ? highlightedContent()
    : content

  const matchCount = searchQuery && displayMode !== 'hex'
    ? (content.match(new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
    : 0

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

          <div className="encoding-select">
            <select value={encoding} onChange={e => onEncodingChange(e.target.value)}>
              {encodingOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <button
            className={`icon-btn ${autoScroll ? 'active' : ''}`}
            title={autoScroll ? '关闭自动滚动' : '开启自动滚动'}
            onClick={() => setAutoScroll(!autoScroll)}
          >
            {autoScroll ? '⇳' : '⇲'}
          </button>
          <button className="icon-btn" title="搜索" onClick={() => setShowSearch(!showSearch)}>
            🔍
          </button>
          <button className="ghost-button" onClick={onSave} title="保存接收数据">
            保存
          </button>
          <button className="ghost-button" onClick={onClear}>清空</button>
        </div>
      </div>

      {/* Statistics bar */}
      <div className="stats-bar">
        <span>字节数：{receiveStats.byteCount}</span>
        <span>时长：{receiveStats.duration}</span>
        {searchQuery && (
          <span>匹配：{matchCount} 处</span>
        )}
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="search-bar">
          <input
            type="text"
            placeholder="输入搜索内容..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
          <span className="match-count">
            {searchQuery ? `${matchCount} 处匹配` : ''}
          </span>
          <button className="icon-btn" onClick={() => { setSearchQuery(''); setShowSearch(false) }}>✕</button>
        </div>
      )}

      <div ref={outputRef} className="terminal-output terminal-stream">
        {displayContent ? (
          displayMode === 'hex' ? (
            <pre>{displayContent}</pre>
          ) : (
            <pre dangerouslySetInnerHTML={{ __html: displayContent }} />
          )
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
