function SendPanel({
  sendMode,
  sendValue,
  textLineEnding,
  onSendModeChange,
  onSendValueChange,
  onTextLineEndingChange,
  onSend,
}) {
  return (
    <section className="panel composer-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">数据发送</p>
          <h2>发送窗口</h2>
        </div>

        <div className="segmented-control">
          <button className={sendMode === 'text' ? 'active' : ''} onClick={() => onSendModeChange('text')}>
            文本
          </button>
          <button className={sendMode === 'hex' ? 'active' : ''} onClick={() => onSendModeChange('hex')}>
            HEX
          </button>
        </div>
      </div>

      <textarea
        value={sendValue}
        onChange={(event) => onSendValueChange(event.target.value)}
        placeholder={sendMode === 'hex' ? '例如：48 65 6C 6C 6F' : '输入要发送的文本内容'}
      />

      {sendMode === 'text' ? (
        <label className="inline-field">
          <span>发送结尾</span>
          <select value={textLineEnding} onChange={(event) => onTextLineEndingChange(event.target.value)}>
            <option value="">无</option>
            <option value="\n">LF (\n)</option>
            <option value="\r">CR (\r)</option>
            <option value="\r\n">CRLF (\r\n)</option>
          </select>
        </label>
      ) : null}

      <div className="composer-footer">
        <span>
          {sendMode === 'hex'
            ? 'HEX 模式下以空格分隔字节。'
            : '连接命令行类设备时，通常建议选择 LF 或 CRLF。'}
        </span>
        <button className="primary-button" onClick={onSend}>发送</button>
      </div>
    </section>
  )
}

export default SendPanel
