import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';

function stdout() {
  return { text: '', write(chunk) { this.text += chunk; } };
}

async function withServer(options, fn) {
  const server = await startServer({ host: '127.0.0.1', port: 0, stdout: stdout(), ...options });
  try {
    const address = server.address();
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('status API rejects missing token', async () => {
  await withServer({
    config: { token: 'secret' },
    backend: { status: async () => ({ percent: 85 }) },
  }, async (base) => {
    const response = await fetch(`${base}/api/status`);
    assert.equal(response.status, 401);
  });
});

test('status API returns backend status with valid token', async () => {
  await withServer({
    config: { token: 'secret' },
    backend: { status: async () => ({ percent: 85, charging: false }) },
  }, async (base) => {
    const response = await fetch(`${base}/api/status`, {
      headers: { Authorization: 'Bearer secret' },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { percent: 85, charging: false });
  });
});

test('limit API validates range', async () => {
  await withServer({
    config: { token: 'secret' },
    backend: { setLimit: async () => { throw new Error('should not run'); } },
  }, async (base) => {
    const response = await fetch(`${base}/api/limit`, {
      method: 'POST',
      headers: { Authorization: 'Bearer secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 10 }),
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /between 20 and 100/);
  });
});

test('enable API calls backend', async () => {
  let called = false;
  await withServer({
    config: { token: 'secret' },
    backend: { enable: async () => { called = true; return { percent: 85, charging: true }; } },
  }, async (base) => {
    const response = await fetch(`${base}/api/enable`, {
      method: 'POST',
      headers: { Authorization: 'Bearer secret' },
    });
    assert.equal(response.status, 200);
    assert.equal(called, true);
  });
});

test('web page includes token login and charge controls', async () => {
  await withServer({
    config: { token: 'secret' },
    backend: { status: async () => ({ percent: 85 }) },
  }, async (base) => {
    const response = await fetch(`${base}/`);
    const html = await response.text();
    assert.match(html, /MacCharge/);
    assert.match(html, /tokenInput/);
    assert.match(html, /limitInput/);
    assert.match(html, /switcherRange/);
    assert.match(html, /switcherAdapterRequest/);
    assert.match(html, /powerFlow/);
    assert.match(html, /powerWatts/);
    assert.match(html, /currentAmps/);
    assert.match(html, /voltageVolts/);
    assert.match(html, /}, 5000\);/);
    assert.match(html, /chargePauseButton/);
    assert.match(html, /limitEnabledInput/);
    assert.match(html, /switcherEnabledInput/);
    assert.doesNotMatch(html, /applyLimitButton/);
    assert.doesNotMatch(html, /disableButton/);
    assert.doesNotMatch(html, /enableButton/);
    assert.doesNotMatch(html, /switcherOnButton/);
    assert.doesNotMatch(html, /switcherOffButton/);
    assert.match(html, /恢复充电/);
    assert.match(html, /暂停充电/);
    assert.match(html, /languageZhButton/);
    assert.match(html, /languageEnButton/);
    assert.match(html, /maccharge\.language/);
    assert.match(html, /navigator\.language/);
    assert.match(html, /data-i18n=/);
    assert.match(html, /Battery status/);
    assert.match(html, /Charging policy/);
  });
});

test('switcher API rejects missing token', async () => {
  await withServer({
    config: { token: 'secret' },
    backend: {},
    switcher: { status: async () => ({ enabled: false }) },
  }, async (base) => {
    const response = await fetch(`${base}/api/switcher`);
    assert.equal(response.status, 401);
  });
});

test('switcher API returns floating mode status', async () => {
  await withServer({
    config: { token: 'secret' },
    backend: {},
    switcher: { status: async () => ({ enabled: true, upperLimit: 85, lowerLimit: 80 }) },
  }, async (base) => {
    const response = await fetch(`${base}/api/switcher`, {
      headers: { Authorization: 'Bearer secret' },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { enabled: true, upperLimit: 85, lowerLimit: 80 });
  });
});

test('switcher on API validates and applies the upper limit', async () => {
  let received;
  await withServer({
    config: { token: 'secret' },
    backend: {},
    switcher: {
      on: async (options) => {
        received = options;
        return { enabled: true, upperLimit: options.limit };
      },
    },
  }, async (base) => {
    const response = await fetch(`${base}/api/switcher/on`, {
      method: 'POST',
      headers: { Authorization: 'Bearer secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 85 }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(received, { limit: 85 });
  });
});

test('switcher off API restores ordinary limiting through the service', async () => {
  let called = false;
  await withServer({
    config: { token: 'secret' },
    backend: {},
    switcher: {
      off: async () => {
        called = true;
        return { enabled: false };
      },
    },
  }, async (base) => {
    const response = await fetch(`${base}/api/switcher/off`, {
      method: 'POST',
      headers: { Authorization: 'Bearer secret' },
    });
    assert.equal(response.status, 200);
    assert.equal(called, true);
  });
});

test('policy API returns shared charge policy status', async () => {
  await withServer({
    config: { token: 'secret' },
    backend: {},
    policy: { status: async () => ({ manualPause: false, limitEnabled: true, enabled: true }) },
  }, async (base) => {
    const response = await fetch(`${base}/api/policy`, {
      headers: { Authorization: 'Bearer secret' },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { manualPause: false, limitEnabled: true, enabled: true });
  });
});

test('policy pause API applies the top-level override', async () => {
  let called = false;
  await withServer({
    config: { token: 'secret' },
    backend: {},
    policy: { pause: async () => { called = true; return { manualPause: true }; } },
  }, async (base) => {
    const response = await fetch(`${base}/api/policy/pause`, {
      method: 'POST',
      headers: { Authorization: 'Bearer secret' },
    });
    assert.equal(response.status, 200);
    assert.equal(called, true);
  });
});

test('policy resume API restores the configured strategy', async () => {
  let called = false;
  await withServer({
    config: { token: 'secret' },
    backend: {},
    policy: { resume: async () => { called = true; return { manualPause: false }; } },
  }, async (base) => {
    const response = await fetch(`${base}/api/policy/resume`, {
      method: 'POST',
      headers: { Authorization: 'Bearer secret' },
    });
    assert.equal(response.status, 200);
    assert.equal(called, true);
  });
});

test('policy limit API updates the switch and upper bound', async () => {
  let received;
  await withServer({
    config: { token: 'secret' },
    backend: {},
    policy: {
      setLimitEnabled: async (options) => {
        received = options;
        return { limitEnabled: options.enabled, upperLimit: options.limit };
      },
    },
  }, async (base) => {
    const response = await fetch(`${base}/api/policy/limit`, {
      method: 'POST',
      headers: { Authorization: 'Bearer secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true, limit: 85 }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(received, { enabled: true, limit: 85 });
  });
});

test('policy switcher API updates the floating switch and upper bound', async () => {
  let received;
  await withServer({
    config: { token: 'secret' },
    backend: {},
    policy: {
      setSwitcherEnabled: async (options) => {
        received = options;
        return { enabled: options.enabled, upperLimit: options.limit };
      },
    },
  }, async (base) => {
    const response = await fetch(`${base}/api/policy/switcher`, {
      method: 'POST',
      headers: { Authorization: 'Bearer secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true, limit: 90 }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(received, { enabled: true, limit: 90 });
  });
});
