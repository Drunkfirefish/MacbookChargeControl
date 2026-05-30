export const pageHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MacCharge</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f6f7f9;
      --surface: #ffffff;
      --surface-2: #eef2f6;
      --text: #18202b;
      --muted: #647184;
      --border: #d8dee8;
      --primary: #2563eb;
      --primary-text: #ffffff;
      --danger: #b42318;
      --danger-soft: #fff0ed;
      --success: #087443;
      --success-soft: #eaf8ef;
      --shadow: 0 10px 30px rgba(24, 32, 43, 0.08);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111419;
        --surface: #1b2028;
        --surface-2: #252c36;
        --text: #eef2f7;
        --muted: #a5b0c0;
        --border: #354050;
        --primary: #6da2ff;
        --primary-text: #07111f;
        --danger: #ff8a7a;
        --danger-soft: #3a211f;
        --success: #63d993;
        --success-soft: #183225;
        --shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    }

    main {
      width: min(920px, calc(100% - 32px));
      margin: 0 auto;
      padding: 28px 0 40px;
    }

    header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }

    h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.15;
      letter-spacing: 0;
    }

    .subtitle {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 14px;
    }

    .status-pill {
      min-width: 112px;
      min-height: 36px;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      color: var(--muted);
      text-align: center;
      font-size: 13px;
      line-height: 18px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 16px;
      align-items: start;
    }

    section {
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .section-title {
      margin: 0;
      padding: 16px 18px;
      border-bottom: 1px solid var(--border);
      font-size: 15px;
      line-height: 20px;
    }

    .panel {
      padding: 18px;
    }

    .battery {
      display: grid;
      grid-template-columns: 126px 1fr;
      gap: 18px;
      align-items: center;
    }

    .gauge {
      width: 126px;
      aspect-ratio: 1;
      border: 1px solid var(--border);
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: conic-gradient(var(--success) 0deg, var(--success) var(--gauge-angle, 0deg), var(--surface-2) var(--gauge-angle, 0deg));
      position: relative;
    }

    .gauge::after {
      content: "";
      width: 96px;
      aspect-ratio: 1;
      border-radius: 50%;
      background: var(--surface);
      position: absolute;
    }

    .gauge strong {
      position: relative;
      z-index: 1;
      font-size: 30px;
      line-height: 1;
      letter-spacing: 0;
    }

    .facts {
      display: grid;
      gap: 10px;
    }

    .fact {
      display: flex;
      min-height: 38px;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 10px;
      border-radius: 8px;
      background: var(--surface-2);
    }

    .fact span {
      color: var(--muted);
      font-size: 13px;
    }

    .fact strong {
      font-size: 14px;
      text-align: right;
    }

    label {
      display: grid;
      gap: 8px;
      color: var(--muted);
      font-size: 13px;
    }

    input {
      width: 100%;
      min-height: 42px;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 9px 10px;
      background: var(--surface);
      color: var(--text);
      font: inherit;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: end;
      margin-bottom: 14px;
    }

    .buttons {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .top-action {
      width: 100%;
      margin-top: 14px;
    }

    .switcher-section {
      grid-column: 1 / -1;
    }

    .switcher-panel {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }

    .switcher-error {
      margin: 10px 0 0;
      color: var(--danger);
      font-size: 13px;
      line-height: 18px;
    }

    .policy-controls {
      display: grid;
      gap: 14px;
    }

    .switch-row {
      display: flex;
      min-height: 58px;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface-2);
    }

    .switch-copy {
      display: grid;
      gap: 4px;
    }

    .switch-copy strong {
      color: var(--text);
      font-size: 14px;
    }

    .switch-copy small {
      color: var(--muted);
      font-size: 12px;
      line-height: 16px;
    }

    .switch {
      appearance: none;
      width: 44px;
      min-width: 44px;
      min-height: 24px;
      height: 24px;
      padding: 2px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
      cursor: pointer;
      transition: background 160ms ease, border-color 160ms ease;
    }

    .switch::before {
      content: "";
      display: block;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--muted);
      transition: transform 160ms ease, background 160ms ease;
    }

    .switch:checked {
      border-color: var(--success);
      background: var(--success);
    }

    .switch:checked::before {
      background: var(--surface);
      transform: translateX(18px);
    }

    .switch:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    button {
      min-height: 42px;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 9px 12px;
      background: var(--surface);
      color: var(--text);
      font: inherit;
      font-weight: 650;
      cursor: pointer;
    }

    button:hover {
      border-color: var(--primary);
    }

    button:disabled {
      cursor: wait;
      opacity: 0.65;
    }

    .primary {
      border-color: var(--primary);
      background: var(--primary);
      color: var(--primary-text);
    }

    .danger {
      border-color: color-mix(in srgb, var(--danger), var(--border) 35%);
      background: var(--danger-soft);
      color: var(--danger);
    }

    .success {
      border-color: color-mix(in srgb, var(--success), var(--border) 35%);
      background: var(--success-soft);
      color: var(--success);
    }

    .message {
      min-height: 40px;
      margin-top: 14px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--muted);
      font-size: 13px;
      line-height: 18px;
      background: var(--surface-2);
    }

    .message.error {
      border-color: color-mix(in srgb, var(--danger), var(--border) 35%);
      color: var(--danger);
      background: var(--danger-soft);
    }

    .message.ok {
      border-color: color-mix(in srgb, var(--success), var(--border) 35%);
      color: var(--success);
      background: var(--success-soft);
    }

    @media (max-width: 760px) {
      main {
        width: min(100% - 20px, 920px);
        padding-top: 18px;
      }

      header,
      .grid,
      .battery,
      .form-row,
      .switcher-panel {
        grid-template-columns: 1fr;
      }

      header {
        display: grid;
        align-items: start;
      }

      .status-pill {
        width: 100%;
      }

      .gauge {
        margin: 0 auto;
      }

      .buttons {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>MacCharge</h1>
        <p class="subtitle">MacBook 充电控制</p>
      </div>
      <div class="status-pill" id="connectionState">未连接</div>
    </header>

    <div class="grid">
      <section>
        <h2 class="section-title">电池状态</h2>
        <div class="panel battery">
          <div class="gauge" id="batteryGauge" style="--gauge-angle: 0deg">
            <strong id="batteryPercent">--%</strong>
          </div>
          <div class="facts">
            <div class="fact"><span>电源</span><strong id="powerSource">--</strong></div>
            <div class="fact"><span>接入电源</span><strong id="acAttached">--</strong></div>
            <div class="fact"><span>充电中</span><strong id="charging">--</strong></div>
            <div class="fact"><span>当前状态</span><strong id="powerFlow">--</strong></div>
            <div class="fact"><span>电池功率</span><strong id="powerWatts">--</strong></div>
            <div class="fact"><span>电池电流</span><strong id="currentAmps">--</strong></div>
            <div class="fact"><span>电池电压</span><strong id="voltageVolts">--</strong></div>
            <div class="fact"><span>上限</span><strong id="currentLimit">--</strong></div>
          </div>
        </div>
      </section>

      <section>
        <h2 class="section-title">控制</h2>
        <div class="panel">
          <div class="form-row">
            <label>
              Token
              <input id="tokenInput" type="password" autocomplete="current-password">
            </label>
            <button id="saveTokenButton" class="primary" type="button">保存</button>
          </div>

          <div class="buttons">
            <button id="refreshButton" type="button">刷新</button>
            <button id="clearTokenButton" type="button">清除 Token</button>
          </div>

          <button id="chargePauseButton" class="danger top-action" type="button">暂停充电</button>

          <div id="message" class="message">等待 token</div>
        </div>
      </section>

      <section class="switcher-section">
        <h2 class="section-title">充电策略</h2>
        <div class="panel switcher-panel">
          <div class="facts">
            <div class="fact"><span>模式</span><strong id="switcherMode">--</strong></div>
            <div class="fact"><span>浮动范围</span><strong id="switcherRange">--</strong></div>
            <div class="fact"><span>适配器请求</span><strong id="switcherAdapterRequest">--</strong></div>
            <div class="fact"><span>后台控制器</span><strong id="switcherController">--</strong></div>
          </div>
          <div class="policy-controls">
            <label class="switch-row">
              <span class="switch-copy">
                <strong>充电限制</strong>
                <small>关闭后恢复 macOS 默认充电行为</small>
              </span>
              <input id="limitEnabledInput" class="switch" type="checkbox">
            </label>
            <label>
              充电上限
              <input id="limitInput" type="number" min="20" max="100" step="1" value="85">
            </label>
            <label class="switch-row">
              <span class="switch-copy">
                <strong>浮动充电</strong>
                <small>在上限与上限减 5% 之间循环</small>
              </span>
              <input id="switcherEnabledInput" class="switch" type="checkbox">
            </label>
            <p id="switcherError" class="switcher-error" hidden></p>
          </div>
        </div>
      </section>
    </div>
  </main>

  <script>
    const tokenKey = 'maccharge.token';
    const elements = {
      tokenInput: document.getElementById('tokenInput'),
      limitInput: document.getElementById('limitInput'),
      saveTokenButton: document.getElementById('saveTokenButton'),
      refreshButton: document.getElementById('refreshButton'),
      clearTokenButton: document.getElementById('clearTokenButton'),
      chargePauseButton: document.getElementById('chargePauseButton'),
      message: document.getElementById('message'),
      connectionState: document.getElementById('connectionState'),
      batteryGauge: document.getElementById('batteryGauge'),
      batteryPercent: document.getElementById('batteryPercent'),
      powerSource: document.getElementById('powerSource'),
      acAttached: document.getElementById('acAttached'),
      charging: document.getElementById('charging'),
      powerFlow: document.getElementById('powerFlow'),
      powerWatts: document.getElementById('powerWatts'),
      currentAmps: document.getElementById('currentAmps'),
      voltageVolts: document.getElementById('voltageVolts'),
      currentLimit: document.getElementById('currentLimit'),
      limitEnabledInput: document.getElementById('limitEnabledInput'),
      switcherEnabledInput: document.getElementById('switcherEnabledInput'),
      switcherMode: document.getElementById('switcherMode'),
      switcherRange: document.getElementById('switcherRange'),
      switcherAdapterRequest: document.getElementById('switcherAdapterRequest'),
      switcherController: document.getElementById('switcherController'),
      switcherError: document.getElementById('switcherError'),
    };
    let currentPolicy;

    elements.tokenInput.value = localStorage.getItem(tokenKey) || '';

    function setBusy(isBusy) {
      for (const button of document.querySelectorAll('button')) {
        button.disabled = isBusy;
      }
    }

    function setMessage(text, kind) {
      elements.message.textContent = text;
      elements.message.className = 'message' + (kind ? ' ' + kind : '');
    }

    function currentToken() {
      return elements.tokenInput.value.trim();
    }

    async function api(path, options = {}) {
      const token = currentToken();
      if (!token) {
        throw new Error('Token 未填写');
      }
      const response = await fetch(path, {
        ...options,
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '请求失败');
      }
      return data;
    }

    function renderStatus(status) {
      const percent = Number.isFinite(status.percent) ? status.percent : null;
      const angle = percent === null ? 0 : Math.max(0, Math.min(100, percent)) * 3.6;

      elements.batteryGauge.style.setProperty('--gauge-angle', angle + 'deg');
      elements.batteryPercent.textContent = percent === null ? '--%' : percent + '%';
      elements.powerSource.textContent = status.powerSource || '--';
      elements.acAttached.textContent = status.acAttached ? '是' : '否';
      elements.charging.textContent = status.charging ? '是' : '否';
      elements.powerFlow.textContent = {
        charging: '充电',
        discharging: '放电',
        idle: '空闲',
      }[status.powerFlow] || '--';
      elements.powerWatts.textContent = formatMetric(status.powerWatts, 1, ' W');
      elements.currentAmps.textContent = formatMetric(status.currentAmps, 3, ' A');
      elements.voltageVolts.textContent = formatMetric(status.voltageVolts, 3, ' V');
      elements.currentLimit.textContent = status.limit === null || status.limit === undefined ? '--' : status.limit + '%';
      elements.connectionState.textContent = '已连接';

    }

    function formatMetric(value, digits, suffix) {
      return Number.isFinite(value) ? value.toFixed(digits) + suffix : '--';
    }

    function renderPolicy(policy) {
      currentPolicy = policy;
      elements.chargePauseButton.textContent = policy.manualPause ? '恢复充电' : '暂停充电';
      elements.chargePauseButton.className = (policy.manualPause ? 'success' : 'danger') + ' top-action';
      elements.limitEnabledInput.checked = policy.limitEnabled;
      elements.switcherEnabledInput.checked = policy.enabled;
      elements.limitEnabledInput.disabled = policy.manualPause;
      elements.switcherEnabledInput.disabled = policy.manualPause || !policy.limitEnabled;
      elements.limitInput.disabled = policy.manualPause || !policy.limitEnabled;
      elements.limitInput.value = policy.upperLimit;
      elements.switcherMode.textContent = policy.manualPause ? '手动暂停' : policy.enabled ? '浮动充电' : policy.limitEnabled ? '上限限制' : '系统默认';
      elements.switcherRange.textContent = policy.limitEnabled ? policy.lowerLimit + '% - ' + policy.upperLimit + '%' : '--';
      elements.switcherAdapterRequest.textContent = policy.lastAdapterRequest === 'off' ? '关闭' : '开启';
      elements.switcherController.textContent = policy.controllerLoaded ? '运行中' : '未运行';
      elements.switcherError.hidden = !policy.lastError;
      elements.switcherError.textContent = policy.lastError || '';
    }

    async function refreshStatus() {
      setBusy(true);
      try {
        const [batteryStatus, policy] = await Promise.all([
          api('/api/status'),
          api('/api/policy'),
        ]);
        renderStatus(batteryStatus);
        renderPolicy(policy);
        setMessage('状态已更新', 'ok');
      } catch (error) {
        elements.connectionState.textContent = '未连接';
        setMessage(error.message, 'error');
      } finally {
        setBusy(false);
      }
    }

    async function postPolicyAction(path, body, successText) {
      setBusy(true);
      try {
        renderPolicy(await api(path, {
          method: 'POST',
          body: body ? JSON.stringify(body) : undefined,
        }));
        setMessage(successText, 'ok');
      } catch (error) {
        setMessage(error.message, 'error');
      } finally {
        setBusy(false);
      }
    }

    elements.saveTokenButton.addEventListener('click', () => {
      localStorage.setItem(tokenKey, currentToken());
      setMessage('Token 已保存', 'ok');
      refreshStatus();
    });

    elements.clearTokenButton.addEventListener('click', () => {
      localStorage.removeItem(tokenKey);
      elements.tokenInput.value = '';
      elements.connectionState.textContent = '未连接';
      setMessage('Token 已清除');
    });

    elements.refreshButton.addEventListener('click', refreshStatus);
    elements.chargePauseButton.addEventListener('click', () => {
      const isPaused = currentPolicy && currentPolicy.manualPause;
      postPolicyAction(isPaused ? '/api/policy/resume' : '/api/policy/pause', null, isPaused ? '已恢复原有充电策略' : '已暂停全部充电行为');
    });
    elements.limitEnabledInput.addEventListener('change', () => {
      postPolicyAction('/api/policy/limit', {
        enabled: elements.limitEnabledInput.checked,
        limit: Number(elements.limitInput.value),
      }, elements.limitEnabledInput.checked ? '充电限制已开启' : '充电限制已关闭，已恢复系统默认充电');
    });
    elements.limitInput.addEventListener('change', () => {
      postPolicyAction('/api/policy/limit', {
        enabled: elements.limitEnabledInput.checked,
        limit: Number(elements.limitInput.value),
      }, '充电上限已更新');
    });
    elements.switcherEnabledInput.addEventListener('change', () => {
      postPolicyAction('/api/policy/switcher', {
        enabled: elements.switcherEnabledInput.checked,
        limit: Number(elements.limitInput.value),
      }, elements.switcherEnabledInput.checked ? '浮动充电已开启' : '浮动充电已关闭');
    });

    if (currentToken()) {
      refreshStatus();
    }
    setInterval(() => {
      if (currentToken()) {
        refreshStatus();
      }
    }, 5000);
  </script>
</body>
</html>`;
