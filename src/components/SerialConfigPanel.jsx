const baudRateOptions = ['9600', '19200', '38400', '57600', '115200']

function SerialConfigPanel({
  config,
  ports,
  onConfigChange,
  onBaudPresetChange,
  onRefreshPorts,
  onToggleConnection,
  isSupported,
  isConnected,
  connectionLabel,
}) {
  return (
    <section className="panel sidebar-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">连接管理</p>
          <h2>串口配置</h2>
        </div>
        <span className={`status-badge ${isConnected ? 'connected' : 'idle'}`}>
          {connectionLabel}
        </span>
      </div>

      <div className="stack">
        <button className="secondary-button" onClick={onRefreshPorts} disabled={!isSupported || isConnected}>
          刷新串口列表
        </button>

        <div className="form-grid">
          <label>
            <span>串口设备</span>
            <select name="path" value={config.path} onChange={onConfigChange} disabled={!isSupported || isConnected}>
              <option value="">请选择串口</option>
              {ports.map((port) => (
                <option key={port.path} value={port.path}>
                  {port.friendlyName}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>常用波特率</span>
            <select
              name="baudPreset"
              value={config.baudPreset}
              onChange={onBaudPresetChange}
              disabled={isConnected}
            >
              {baudRateOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
              <option value="custom">自定义</option>
            </select>
          </label>

          {config.baudPreset === 'custom' ? (
            <label>
              <span>自定义波特率</span>
              <input
                name="baudRate"
                type="number"
                min="300"
                step="1"
                value={config.baudRate}
                onChange={onConfigChange}
                disabled={isConnected}
              />
            </label>
          ) : null}

          <label>
            <span>数据位</span>
            <select name="dataBits" value={config.dataBits} onChange={onConfigChange} disabled={isConnected}>
              <option value="8">8</option>
              <option value="7">7</option>
            </select>
          </label>

          <label>
            <span>停止位</span>
            <select name="stopBits" value={config.stopBits} onChange={onConfigChange} disabled={isConnected}>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </label>

          <label>
            <span>校验位</span>
            <select name="parity" value={config.parity} onChange={onConfigChange} disabled={isConnected}>
              <option value="none">None</option>
              <option value="even">Even</option>
              <option value="odd">Odd</option>
            </select>
          </label>
        </div>

        <button className="primary-button" onClick={onToggleConnection} disabled={!isSupported}>
          {isConnected ? '断开连接' : '连接串口'}
        </button>
      </div>
    </section>
  )
}

export default SerialConfigPanel
