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

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .language-picker {
      display: flex;
      padding: 3px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
    }

    .language-option {
      min-height: 28px;
      border: 0;
      border-radius: 5px;
      padding: 4px 8px;
      color: var(--muted);
      background: transparent;
      font-size: 12px;
    }

    .language-option.active {
      color: var(--primary-text);
      background: var(--primary);
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

      .header-actions {
        display: grid;
        grid-template-columns: auto 1fr;
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
        <p class="subtitle" data-i18n="subtitle">MacBook 充电控制</p>
      </div>
      <div class="header-actions">
        <div class="language-picker" aria-label="Language">
          <button id="languageZhButton" class="language-option" type="button">中</button>
          <button id="languageEnButton" class="language-option" type="button">EN</button>
        </div>
        <div class="status-pill" id="connectionState">未连接</div>
      </div>
    </header>

    <div class="grid">
      <section>
        <h2 class="section-title" data-i18n="batteryStatus">电池状态</h2>
        <div class="panel battery">
          <div class="gauge" id="batteryGauge" style="--gauge-angle: 0deg">
            <strong id="batteryPercent">--%</strong>
          </div>
          <div class="facts">
            <div class="fact"><span data-i18n="powerSource">电源</span><strong id="powerSource">--</strong></div>
            <div class="fact"><span data-i18n="acAttached">接入电源</span><strong id="acAttached">--</strong></div>
            <div class="fact"><span data-i18n="charging">充电中</span><strong id="charging">--</strong></div>
            <div class="fact"><span data-i18n="currentState">当前状态</span><strong id="powerFlow">--</strong></div>
            <div class="fact"><span data-i18n="batteryPower">电池功率</span><strong id="powerWatts">--</strong></div>
            <div class="fact"><span data-i18n="batteryCurrent">电池电流</span><strong id="currentAmps">--</strong></div>
            <div class="fact"><span data-i18n="batteryVoltage">电池电压</span><strong id="voltageVolts">--</strong></div>
            <div class="fact"><span data-i18n="limit">上限</span><strong id="currentLimit">--</strong></div>
          </div>
        </div>
      </section>

      <section>
        <h2 class="section-title" data-i18n="controls">控制</h2>
        <div class="panel">
          <div class="form-row">
            <label>
              <span data-i18n="token">Token</span>
              <input id="tokenInput" type="password" autocomplete="current-password">
            </label>
            <button id="saveTokenButton" class="primary" type="button" data-i18n="save">保存</button>
          </div>

          <div class="buttons">
            <button id="refreshButton" type="button" data-i18n="refresh">刷新</button>
            <button id="clearTokenButton" type="button" data-i18n="clearToken">清除 Token</button>
          </div>

          <button id="chargePauseButton" class="danger top-action" type="button">暂停充电</button>

          <div id="message" class="message">等待 token</div>
        </div>
      </section>

      <section class="switcher-section">
        <h2 class="section-title" data-i18n="chargingPolicy">充电策略</h2>
        <div class="panel switcher-panel">
          <div class="facts">
            <div class="fact"><span data-i18n="mode">模式</span><strong id="switcherMode">--</strong></div>
            <div class="fact"><span data-i18n="floatingRange">浮动范围</span><strong id="switcherRange">--</strong></div>
            <div class="fact"><span data-i18n="adapterRequest">适配器请求</span><strong id="switcherAdapterRequest">--</strong></div>
            <div class="fact"><span data-i18n="controller">后台控制器</span><strong id="switcherController">--</strong></div>
          </div>
          <div class="policy-controls">
            <label class="switch-row">
              <span class="switch-copy">
                <strong data-i18n="chargeLimit">充电限制</strong>
                <small data-i18n="limitDescription">关闭后恢复 macOS 默认充电行为</small>
              </span>
              <input id="limitEnabledInput" class="switch" type="checkbox">
            </label>
            <label>
              <span data-i18n="upperLimit">充电上限</span>
              <input id="limitInput" type="number" min="20" max="100" step="1" value="85">
            </label>
            <label class="switch-row">
              <span class="switch-copy">
                <strong data-i18n="floatingCharging">浮动充电</strong>
                <small data-i18n="floatingDescription">在上限与上限减 5% 之间循环</small>
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
    const languageKey = 'maccharge.language';
    const translations = {
      zh: {
        subtitle: 'MacBook 充电控制',
        disconnected: '未连接',
        connected: '已连接',
        batteryStatus: '电池状态',
        powerSource: '电源',
        acAttached: '接入电源',
        charging: '充电中',
        currentState: '当前状态',
        batteryPower: '电池功率',
        batteryCurrent: '电池电流',
        batteryVoltage: '电池电压',
        limit: '上限',
        controls: '控制',
        token: 'Token',
        save: '保存',
        refresh: '刷新',
        clearToken: '清除 Token',
        pauseCharging: '暂停充电',
        resumeCharging: '恢复充电',
        waitingToken: '等待 token',
        chargingPolicy: '充电策略',
        mode: '模式',
        floatingRange: '浮动范围',
        adapterRequest: '适配器请求',
        controller: '后台控制器',
        chargeLimit: '充电限制',
        limitDescription: '关闭后恢复 macOS 默认充电行为',
        upperLimit: '充电上限',
        floatingCharging: '浮动充电',
        floatingDescription: '在上限与上限减 5% 之间循环',
        yes: '是',
        no: '否',
        flowCharging: '充电',
        flowDischarging: '放电',
        flowIdle: '空闲',
        modeManualPause: '手动暂停',
        modeFloating: '浮动充电',
        modeLimit: '上限限制',
        modeDefault: '系统默认',
        requestOff: '关闭',
        requestOn: '开启',
        controllerRunning: '运行中',
        controllerStopped: '未运行',
        tokenRequired: 'Token 未填写',
        requestFailed: '请求失败',
        statusUpdated: '状态已更新',
        tokenSaved: 'Token 已保存',
        tokenCleared: 'Token 已清除',
        strategyResumed: '已恢复原有充电策略',
        allChargingPaused: '已暂停全部充电行为',
        limitEnabled: '充电限制已开启',
        limitDisabled: '充电限制已关闭，已恢复系统默认充电',
        upperLimitUpdated: '充电上限已更新',
        floatingEnabled: '浮动充电已开启',
        floatingDisabled: '浮动充电已关闭',
      },
      en: {
        subtitle: 'MacBook charging control',
        disconnected: 'Disconnected',
        connected: 'Connected',
        batteryStatus: 'Battery status',
        powerSource: 'Power source',
        acAttached: 'AC attached',
        charging: 'Charging',
        currentState: 'Current state',
        batteryPower: 'Battery power',
        batteryCurrent: 'Battery current',
        batteryVoltage: 'Battery voltage',
        limit: 'Limit',
        controls: 'Controls',
        token: 'Token',
        save: 'Save',
        refresh: 'Refresh',
        clearToken: 'Clear token',
        pauseCharging: 'Pause charging',
        resumeCharging: 'Resume charging',
        waitingToken: 'Waiting for token',
        chargingPolicy: 'Charging policy',
        mode: 'Mode',
        floatingRange: 'Floating range',
        adapterRequest: 'Adapter request',
        controller: 'Background controller',
        chargeLimit: 'Charge limit',
        limitDescription: 'Turn off to restore default macOS charging',
        upperLimit: 'Charge limit',
        floatingCharging: 'Floating charge',
        floatingDescription: 'Cycle between the limit and 5% below it',
        yes: 'Yes',
        no: 'No',
        flowCharging: 'Charging',
        flowDischarging: 'Discharging',
        flowIdle: 'Idle',
        modeManualPause: 'Manually paused',
        modeFloating: 'Floating charge',
        modeLimit: 'Charge limited',
        modeDefault: 'System default',
        requestOff: 'Off',
        requestOn: 'On',
        controllerRunning: 'Running',
        controllerStopped: 'Stopped',
        tokenRequired: 'Token is required',
        requestFailed: 'Request failed',
        statusUpdated: 'Status updated',
        tokenSaved: 'Token saved',
        tokenCleared: 'Token cleared',
        strategyResumed: 'Previous charging policy restored',
        allChargingPaused: 'All charging behavior paused',
        limitEnabled: 'Charge limit enabled',
        limitDisabled: 'Charge limit disabled; default charging restored',
        upperLimitUpdated: 'Charge limit updated',
        floatingEnabled: 'Floating charge enabled',
        floatingDisabled: 'Floating charge disabled',
      },
    };
    const savedLanguage = localStorage.getItem(languageKey);
    let language = savedLanguage === 'zh' || savedLanguage === 'en'
      ? savedLanguage
      : (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    const elements = {
      languageZhButton: document.getElementById('languageZhButton'),
      languageEnButton: document.getElementById('languageEnButton'),
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
    let connected = false;
    let currentBatteryStatus;
    let currentPolicy;
    let currentMessage = { value: 'waitingToken', kind: '', raw: false };

    elements.tokenInput.value = localStorage.getItem(tokenKey) || '';

    function t(key) {
      return translations[language][key] || translations.en[key] || key;
    }

    function renderConnection() {
      elements.connectionState.textContent = t(connected ? 'connected' : 'disconnected');
    }

    function renderMessage() {
      elements.message.textContent = currentMessage.raw ? currentMessage.value : t(currentMessage.value);
      elements.message.className = 'message' + (currentMessage.kind ? ' ' + currentMessage.kind : '');
    }

    function applyLanguage(nextLanguage, persist = false) {
      language = nextLanguage === 'zh' ? 'zh' : 'en';
      if (persist) localStorage.setItem(languageKey, language);
      document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
      for (const element of document.querySelectorAll('[data-i18n]')) {
        element.textContent = t(element.dataset.i18n);
      }
      elements.languageZhButton.classList.toggle('active', language === 'zh');
      elements.languageEnButton.classList.toggle('active', language === 'en');
      elements.languageZhButton.setAttribute('aria-pressed', String(language === 'zh'));
      elements.languageEnButton.setAttribute('aria-pressed', String(language === 'en'));
      renderConnection();
      renderMessage();
      if (currentBatteryStatus) renderStatus(currentBatteryStatus);
      if (currentPolicy) renderPolicy(currentPolicy);
    }

    function setBusy(isBusy) {
      for (const button of document.querySelectorAll('button')) {
        button.disabled = isBusy;
      }
    }

    function setMessage(value, kind, raw = false) {
      currentMessage = { value, kind, raw };
      renderMessage();
    }

    function currentToken() {
      return elements.tokenInput.value.trim();
    }

    async function api(path, options = {}) {
      const token = currentToken();
      if (!token) {
        throw new Error('TOKEN_REQUIRED');
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
        throw new Error(data.error || 'REQUEST_FAILED');
      }
      return data;
    }

    function renderStatus(status) {
      currentBatteryStatus = status;
      const percent = Number.isFinite(status.percent) ? status.percent : null;
      const angle = percent === null ? 0 : Math.max(0, Math.min(100, percent)) * 3.6;

      elements.batteryGauge.style.setProperty('--gauge-angle', angle + 'deg');
      elements.batteryPercent.textContent = percent === null ? '--%' : percent + '%';
      elements.powerSource.textContent = status.powerSource || '--';
      elements.acAttached.textContent = status.acAttached ? t('yes') : t('no');
      elements.charging.textContent = status.charging ? t('yes') : t('no');
      elements.powerFlow.textContent = {
        charging: t('flowCharging'),
        discharging: t('flowDischarging'),
        idle: t('flowIdle'),
      }[status.powerFlow] || '--';
      elements.powerWatts.textContent = formatMetric(status.powerWatts, 1, ' W');
      elements.currentAmps.textContent = formatMetric(status.currentAmps, 3, ' A');
      elements.voltageVolts.textContent = formatMetric(status.voltageVolts, 3, ' V');
      elements.currentLimit.textContent = status.limit === null || status.limit === undefined ? '--' : status.limit + '%';
      connected = true;
      renderConnection();

    }

    function formatMetric(value, digits, suffix) {
      return Number.isFinite(value) ? value.toFixed(digits) + suffix : '--';
    }

    function renderPolicy(policy) {
      currentPolicy = policy;
      elements.chargePauseButton.textContent = policy.manualPause ? t('resumeCharging') : t('pauseCharging');
      elements.chargePauseButton.className = (policy.manualPause ? 'success' : 'danger') + ' top-action';
      elements.limitEnabledInput.checked = policy.limitEnabled;
      elements.switcherEnabledInput.checked = policy.enabled;
      elements.limitEnabledInput.disabled = policy.manualPause;
      elements.switcherEnabledInput.disabled = policy.manualPause || !policy.limitEnabled;
      elements.limitInput.disabled = policy.manualPause || !policy.limitEnabled;
      elements.limitInput.value = policy.upperLimit;
      elements.switcherMode.textContent = policy.manualPause ? t('modeManualPause') : policy.enabled ? t('modeFloating') : policy.limitEnabled ? t('modeLimit') : t('modeDefault');
      elements.switcherRange.textContent = policy.limitEnabled ? policy.lowerLimit + '% - ' + policy.upperLimit + '%' : '--';
      elements.switcherAdapterRequest.textContent = policy.lastAdapterRequest === 'off' ? t('requestOff') : t('requestOn');
      elements.switcherController.textContent = policy.controllerLoaded ? t('controllerRunning') : t('controllerStopped');
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
        setMessage('statusUpdated', 'ok');
      } catch (error) {
        connected = false;
        renderConnection();
        setErrorMessage(error);
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
        setErrorMessage(error);
      } finally {
        setBusy(false);
      }
    }

    function setErrorMessage(error) {
      if (error.message === 'TOKEN_REQUIRED') {
        setMessage('tokenRequired', 'error');
        return;
      }
      if (error.message === 'REQUEST_FAILED') {
        setMessage('requestFailed', 'error');
        return;
      }
      setMessage(error.message, 'error', true);
    }

    elements.saveTokenButton.addEventListener('click', () => {
      localStorage.setItem(tokenKey, currentToken());
      setMessage('tokenSaved', 'ok');
      refreshStatus();
    });

    elements.clearTokenButton.addEventListener('click', () => {
      localStorage.removeItem(tokenKey);
      elements.tokenInput.value = '';
      connected = false;
      renderConnection();
      setMessage('tokenCleared');
    });

    elements.languageZhButton.addEventListener('click', () => applyLanguage('zh', true));
    elements.languageEnButton.addEventListener('click', () => applyLanguage('en', true));
    elements.refreshButton.addEventListener('click', refreshStatus);
    elements.chargePauseButton.addEventListener('click', () => {
      const isPaused = currentPolicy && currentPolicy.manualPause;
      postPolicyAction(isPaused ? '/api/policy/resume' : '/api/policy/pause', null, isPaused ? 'strategyResumed' : 'allChargingPaused');
    });
    elements.limitEnabledInput.addEventListener('change', () => {
      postPolicyAction('/api/policy/limit', {
        enabled: elements.limitEnabledInput.checked,
        limit: Number(elements.limitInput.value),
      }, elements.limitEnabledInput.checked ? 'limitEnabled' : 'limitDisabled');
    });
    elements.limitInput.addEventListener('change', () => {
      postPolicyAction('/api/policy/limit', {
        enabled: elements.limitEnabledInput.checked,
        limit: Number(elements.limitInput.value),
      }, 'upperLimitUpdated');
    });
    elements.switcherEnabledInput.addEventListener('change', () => {
      postPolicyAction('/api/policy/switcher', {
        enabled: elements.switcherEnabledInput.checked,
        limit: Number(elements.limitInput.value),
      }, elements.switcherEnabledInput.checked ? 'floatingEnabled' : 'floatingDisabled');
    });

    applyLanguage(language);
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
