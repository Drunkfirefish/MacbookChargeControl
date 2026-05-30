import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwitcherController } from '../src/switcher/controller.js';
import { withDerivedState } from '../src/switcher/store.js';

function memoryStore(initial) {
  let state = withDerivedState(initial);
  return {
    async load() {
      return withDerivedState(state);
    },
    async save(next) {
      state = withDerivedState(next);
      return state;
    },
    current() {
      return state;
    },
  };
}

function backendAt(percent, calls, overrides = {}) {
  return {
    status: async () => ({ percent }),
    adapterOn: async () => { calls.push(['adapter', 'on']); },
    adapterOff: async () => { calls.push(['adapter', 'off']); },
    setLimit: async (limit) => { calls.push(['maintain', limit]); },
    stopLimit: async () => { calls.push(['maintain', 'stop']); },
    enable: async () => { calls.push(['charging', 'on']); },
    disable: async () => { calls.push(['charging', 'off']); },
    ...overrides,
  };
}

test('switcher requests adapter off at the upper limit', async () => {
  const calls = [];
  const store = memoryStore({ enabled: true, upperLimit: 85, lastAdapterRequest: 'on' });
  const controller = createSwitcherController({ backend: backendAt(85, calls), store, log: async () => {} });

  await controller.evaluate();

  assert.deepEqual(calls, [['adapter', 'off']]);
  assert.equal(store.current().lastAdapterRequest, 'off');
});

test('switcher restores adapter and ordinary limiting at the lower limit', async () => {
  const calls = [];
  const store = memoryStore({ enabled: true, upperLimit: 85, lastAdapterRequest: 'off' });
  const controller = createSwitcherController({ backend: backendAt(80, calls), store, log: async () => {} });

  await controller.evaluate();

  assert.deepEqual(calls, [['adapter', 'on'], ['charging', 'on'], ['maintain', 85]]);
  assert.equal(store.current().lastAdapterRequest, 'on');
});

test('switcher does not write backend state inside the floating window', async () => {
  const calls = [];
  const store = memoryStore({ enabled: true, upperLimit: 85, lastAdapterRequest: 'off' });
  const controller = createSwitcherController({ backend: backendAt(83, calls), store, log: async () => {} });

  await controller.evaluate();

  assert.deepEqual(calls, []);
  assert.equal(store.current().lastAdapterRequest, 'off');
});

test('switcher suspends automatic transitions during manual pause', async () => {
  const calls = [];
  const store = memoryStore({
    enabled: true,
    upperLimit: 85,
    manualPause: true,
    manualPauseBootId: 'boot-a',
    lastAdapterRequest: 'on',
  });
  const controller = createSwitcherController({ backend: backendAt(85, calls), store, log: async () => {} });

  await controller.evaluate();

  assert.deepEqual(calls, []);
});

test('disabled switcher restores safe ordinary limiting once per controller run', async () => {
  const calls = [];
  const store = memoryStore({ enabled: false, upperLimit: 85, lastAdapterRequest: 'on' });
  const controller = createSwitcherController({ backend: backendAt(83, calls), store, log: async () => {} });

  await controller.evaluate();
  await controller.evaluate();

  assert.deepEqual(calls, [['adapter', 'on'], ['charging', 'on'], ['maintain', 85]]);
});

test('disabled limiting restores system default charging once per controller run', async () => {
  const calls = [];
  const store = memoryStore({
    enabled: false,
    limitEnabled: false,
    upperLimit: 85,
    lastAdapterRequest: 'on',
  });
  const controller = createSwitcherController({ backend: backendAt(83, calls), store, log: async () => {} });

  await controller.evaluate();
  await controller.evaluate();

  assert.deepEqual(calls, [['adapter', 'on'], ['maintain', 'stop'], ['charging', 'on']]);
});

test('switcher stores backend failures for inspection', async () => {
  const store = memoryStore({ enabled: true, upperLimit: 85, lastAdapterRequest: 'on' });
  const controller = createSwitcherController({
    backend: backendAt(85, [], { adapterOff: async () => { throw new Error('smc failed'); } }),
    store,
    log: async () => {},
  });

  await assert.rejects(() => controller.evaluate(), /smc failed/);
  assert.equal(store.current().lastError, 'smc failed');
});

test('safe restoration always turns adapter on and restores the limit', async () => {
  const calls = [];
  const store = memoryStore({ enabled: true, upperLimit: 90, lastAdapterRequest: 'off' });
  const controller = createSwitcherController({ backend: backendAt(85, calls), store, log: async () => {} });

  await controller.restoreSafeState();

  assert.deepEqual(calls, [['adapter', 'on'], ['charging', 'on'], ['maintain', 90]]);
  assert.equal(store.current().lastAdapterRequest, 'on');
});

test('safe restoration preserves manual pause during the same boot', async () => {
  const calls = [];
  const store = memoryStore({
    enabled: true,
    upperLimit: 90,
    manualPause: true,
    manualPauseBootId: 'boot-a',
    lastAdapterRequest: 'off',
  });
  const controller = createSwitcherController({ backend: backendAt(85, calls), store, log: async () => {} });

  await controller.restoreSafeState();

  assert.deepEqual(calls, [['adapter', 'on'], ['charging', 'off']]);
  assert.equal(store.current().lastAdapterRequest, 'on');
});

test('safe restoration preserves system default charging when limiting is disabled', async () => {
  const calls = [];
  const store = memoryStore({
    enabled: false,
    limitEnabled: false,
    upperLimit: 90,
    lastAdapterRequest: 'off',
  });
  const controller = createSwitcherController({ backend: backendAt(85, calls), store, log: async () => {} });

  await controller.restoreSafeState();

  assert.deepEqual(calls, [['adapter', 'on'], ['maintain', 'stop'], ['charging', 'on']]);
  assert.equal(store.current().lastAdapterRequest, 'on');
});
