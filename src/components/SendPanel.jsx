import { useState } from 'react'

function SendPanel({
  sendMode,
  sendValue,
  textLineEnding,
  timedSend,
  presetCommands,
  onSendModeChange,
  onSendValueChange,
  onTextLineEndingChange,
  onSend,
  onTimedSendChange,
  onPresetCommandsChange,
  onPresetSend,
}) {
  const [showPresets, setShowPresets] = useState(false)
  const [editingIndex, setEditingIndex] = useState(-1)
  const [editName, setEditName] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editMode, setEditMode] = useState('text')

  const handleSavePreset = () => {
    if (!editName.trim() || !editValue.trim()) return
    const updated = [...presetCommands]
    if (editingIndex >= 0) {
      updated[editingIndex] = { name: editName, value: editValue, mode: editMode }
    } else {
      updated.push({ name: editName, value: editValue, mode: editMode })
    }
    onPresetCommandsChange(updated)
    setEditingIndex(-1)
    setEditName('')
    setEditValue('')
  }

  const handleEditPreset = (index) => {
    setEditingIndex(index)
    setEditName(presetCommands[index].name)
    setEditValue(presetCommands[index].value)
    setEditMode(presetCommands[index].mode)
  }

  const handleDeletePreset = (index) => {
    const updated = presetCommands.filter((_, i) => i !== index)
    onPresetCommandsChange(updated)
  }

  const handlePresetSend = (cmd) => {
    onPresetSend(cmd)
  }

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

      {/* Main send area */}
      <textarea
        value={sendValue}
        onChange={(e) => onSendValueChange(e.target.value)}
        placeholder={sendMode === 'hex' ? '例如：48 65 6C 6C 6F' : '输入要发送的文本内容'}
        rows={4}
      />

      {sendMode === 'text' ? (
        <label className="inline-field">
          <span>发送结尾</span>
          <select value={textLineEnding} onChange={e => onTextLineEndingChange(e.target.value)}>
            <option value="">无</option>
            <option value="\n">LF (\n)</option>
            <option value="\r">CR (\r)</option>
            <option value="\r\n">CRLF (\r\n)</option>
          </select>
        </label>
      ) : null}

      {/* Timed send */}
      <div className="timed-send">
        <label className="inline-field">
          <input
            type="checkbox"
            checked={timedSend.enabled}
            onChange={e => onTimedSendChange({ ...timedSend, enabled: e.target.checked })}
          />
          <span>定时发送</span>
          <input
            type="number"
            min="100"
            step="100"
            value={timedSend.interval}
            onChange={e => onTimedSendChange({ ...timedSend, interval: Number(e.target.value) })}
            disabled={!timedSend.enabled}
            style={{ width: '80px' }}
          />
          <span>ms</span>
        </label>
      </div>

      <div className="composer-footer">
        <span>
          {sendMode === 'hex'
            ? 'HEX 模式下以空格分隔字节。'
            : '连接命令行类设备时，通常建议选择 LF 或 CRLF。'}
        </span>
        <div className="send-buttons">
          <button className="primary-button" onClick={onSend}>发送</button>
          <button className="secondary-button" onClick={() => setShowPresets(!showPresets)}>
            {showPresets ? '隐藏指令' : '快捷指令'}
          </button>
        </div>
      </div>

      {/* Preset commands panel */}
      {showPresets && (
        <div className="preset-panel">
          <div className="preset-header">
            <h3>快捷指令</h3>
            <button className="icon-btn" onClick={() => { setEditingIndex(-1); setEditName(''); setEditValue(''); setShowPresets(false) }}>✕</button>
          </div>

          {/* Edit form */}
          <div className="preset-edit">
            <input
              type="text"
              placeholder="指令名称"
              value={editName}
              onChange={e => setEditName(e.target.value)}
            />
            <div className="segmented-control small">
              <button className={editMode === 'text' ? 'active' : ''} onClick={() => setEditMode('text')}>文本</button>
              <button className={editMode === 'hex' ? 'active' : ''} onClick={() => setEditMode('hex')}>HEX</button>
            </div>
            <textarea
              placeholder="指令内容"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              rows={2}
            />
            <button className="primary-button small" onClick={handleSavePreset}>
              {editingIndex >= 0 ? '更新' : '添加'}
            </button>
          </div>

          {/* Preset list */}
          <div className="preset-list">
            {presetCommands.length === 0 ? (
              <div className="empty-state small">
                <span>暂无快捷指令，请在上方添加。</span>
              </div>
            ) : (
              presetCommands.map((cmd, index) => (
                <div key={index} className="preset-item">
                  <span className="preset-name">{cmd.name}</span>
                  <span className="preset-mode-tag">{cmd.mode === 'hex' ? 'HEX' : '文本'}</span>
                  <div className="preset-actions">
                    <button className="icon-btn small" onClick={() => handlePresetSend(cmd)} title="发送">➤</button>
                    <button className="icon-btn small" onClick={() => handleEditPreset(index)} title="编辑">✎</button>
                    <button className="icon-btn small" onClick={() => handleDeletePreset(index)} title="删除">✕</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default SendPanel
