import test from 'node:test';
import assert from 'node:assert/strict';
import { main } from '../src/cli.js';

function streams() {
  return {
    stdout: { text: '', write(chunk) { this.text += chunk; } },
    stderr: { text: '', write(chunk) { this.text += chunk; } },
  };
}

test('status prints normalized backend status', async () => {
  const io = streams();
  const code = await main(['status'], {
    ...io,
    env: {},
    loadConfig: async () => ({ token: 'x', defaultLimit: 80, backendCommand: 'battery' }),
    createBackend: () => ({
      status: async () => ({
        percent: 85,
        powerSource: 'AC Power',
        acAttached: true,
        charging: false,
        limit: 80,
      }),
    }),
  });

  assert.equal(code, 0);
  assert.match(io.stdout.text, /Battery: 85%/);
  assert.match(io.stdout.text, /Charging: no/);
});

test('config set-token saves token', async () => {
  const io = streams();
  let saved;
  const code = await main(['config', 'set-token', 'abc123'], {
    ...io,
    env: {},
    loadConfig: async () => ({ token: '', defaultLimit: 80, backendCommand: 'battery' }),
    saveConfig: async ({ config }) => { saved = config; },
  });

  assert.equal(code, 0);
  assert.equal(saved.token, 'abc123');
  assert.match(io.stdout.text, /Token configured/);
});

test('config set-backend saves backend command path', async () => {
  const io = streams();
  let saved;
  const code = await main(['config', 'set-backend', '/usr/local/co.palokaj.battery/battery'], {
    ...io,
    env: {},
    loadConfig: async () => ({ token: 'abc123', defaultLimit: 80, backendCommand: 'battery' }),
    saveConfig: async ({ config }) => { saved = config; },
  });

  assert.equal(code, 0);
  assert.equal(saved.backendCommand, '/usr/local/co.palokaj.battery/battery');
  assert.match(io.stdout.text, /Backend command configured/);
});

test('limit rejects invalid percentages', async () => {
  const io = streams();
  const code = await main(['limit', '10'], {
    ...io,
    env: {},
    loadConfig: async () => ({ token: 'x', defaultLimit: 80, backendCommand: 'battery' }),
    createBackend: () => ({ setLimit: async () => { throw new Error('should not run'); } }),
  });

  assert.equal(code, 1);
  assert.match(io.stderr.text, /Limit must be between 20 and 100/);
});

test('unknown command prints help', async () => {
  const io = streams();
  const code = await main(['wat'], { ...io, env: {} });

  assert.equal(code, 1);
  assert.match(io.stderr.text, /Usage:/);
});

test('switcher on applies an optional upper limit', async () => {
  const io = streams();
  let received;
  const code = await main(['switcher', 'on', '--limit', '85'], {
    ...io,
    env: {},
    loadConfig: async () => ({ token: 'x', defaultLimit: 80, backendCommand: 'battery' }),
    createBackend: () => ({}),
    switcherService: {},
    policyService: {
      setSwitcherEnabled: async (options) => {
        received = options;
        return { enabled: true, upperLimit: 85 };
      },
    },
  });

  assert.equal(code, 0);
  assert.deepEqual(received, { enabled: true, limit: 85 });
  assert.match(io.stdout.text, /"enabled": true/);
});

test('switcher off restores ordinary limiting through the service', async () => {
  const io = streams();
  let called = false;
  const code = await main(['switcher', 'off'], {
    ...io,
    env: {},
    loadConfig: async () => ({ token: 'x', defaultLimit: 80, backendCommand: 'battery' }),
    createBackend: () => ({}),
    switcherService: {},
    policyService: {
      setSwitcherEnabled: async (options) => {
        called = true;
        assert.deepEqual(options, { enabled: false });
        return { enabled: false, upperLimit: 85 };
      },
    },
  });

  assert.equal(code, 0);
  assert.equal(called, true);
});

test('switcher status prints inspectable JSON', async () => {
  const io = streams();
  const code = await main(['switcher', 'status'], {
    ...io,
    env: {},
    loadConfig: async () => ({ token: 'x', defaultLimit: 80, backendCommand: 'battery' }),
    createBackend: () => ({}),
    switcherService: {
      status: async () => ({ enabled: true, upperLimit: 85, lowerLimit: 80 }),
    },
  });

  assert.equal(code, 0);
  assert.match(io.stdout.text, /"lowerLimit": 80/);
});

test('switcher on rejects invalid upper limits', async () => {
  const io = streams();
  const code = await main(['switcher', 'on', '--limit', '10'], {
    ...io,
    env: {},
    loadConfig: async () => ({ token: 'x', defaultLimit: 80, backendCommand: 'battery' }),
    createBackend: () => ({}),
    switcherService: {},
    policyService: { setSwitcherEnabled: async () => { throw new Error('should not run'); } },
  });

  assert.equal(code, 1);
  assert.match(io.stderr.text, /between 20 and 100/);
});

test('pause routes through the charge policy service', async () => {
  const io = streams();
  let called = false;
  const code = await main(['pause'], {
    ...io,
    env: {},
    loadConfig: async () => ({ token: 'x', defaultLimit: 80, backendCommand: 'battery' }),
    createBackend: () => ({}),
    policyService: { pause: async () => { called = true; return { manualPause: true }; } },
  });

  assert.equal(code, 0);
  assert.equal(called, true);
});

test('legacy enable aliases policy resume', async () => {
  const io = streams();
  let called = false;
  const code = await main(['enable'], {
    ...io,
    env: {},
    loadConfig: async () => ({ token: 'x', defaultLimit: 80, backendCommand: 'battery' }),
    createBackend: () => ({}),
    policyService: { resume: async () => { called = true; return { manualPause: false }; } },
  });

  assert.equal(code, 0);
  assert.equal(called, true);
});

test('limit off routes through the charge policy service', async () => {
  const io = streams();
  let received;
  const code = await main(['limit', 'off'], {
    ...io,
    env: {},
    loadConfig: async () => ({ token: 'x', defaultLimit: 80, backendCommand: 'battery' }),
    createBackend: () => ({}),
    policyService: {
      setLimitEnabled: async (options) => {
        received = options;
        return { limitEnabled: false };
      },
    },
  });

  assert.equal(code, 0);
  assert.deepEqual(received, { enabled: false, limit: undefined });
});
