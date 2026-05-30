import test from 'node:test';
import assert from 'node:assert/strict';
import { createChargePolicyService } from '../src/policy/service.js';
import { withDerivedState } from '../src/switcher/store.js';

function dependencies(initial = {}) {
  let state = withDerivedState(initial);
  const calls = [];
  const store = {
    async load() { return withDerivedState(state); },
    async save(next) {
      state = withDerivedState(next);
      return state;
    },
  };
  const backend = {
    async adapterOn() { calls.push(['adapter', 'on']); },
    async disable() { calls.push(['charging', 'off']); },
    async enable() { calls.push(['charging', 'on']); },
    async setLimit(limit) { calls.push(['maintain', limit]); },
    async stopLimit() { calls.push(['maintain', 'stop']); },
  };
  const controller = {
    async evaluate() { calls.push(['evaluate']); },
  };
  const launchAgent = {
    async isInstalled() { return true; },
    async isLoaded() { return true; },
    async install() { calls.push(['install']); },
  };
  return { store, backend, controller, launchAgent, calls, state: () => state };
}

test('policy pause overrides floating mode without discarding it', async () => {
  const deps = dependencies({ enabled: true, limitEnabled: true, lastAdapterRequest: 'off' });
  const policy = createChargePolicyService(deps);

  await policy.pause();

  assert.equal(deps.state().manualPause, true);
  assert.equal(deps.state().enabled, true);
  assert.equal(deps.state().lastAdapterRequest, 'on');
  assert.deepEqual(deps.calls, [['adapter', 'on'], ['charging', 'off']]);
});

test('policy resume immediately reevaluates configured floating mode', async () => {
  const deps = dependencies({ enabled: true, limitEnabled: true, manualPause: true, manualPauseBootId: 'boot-a' });
  const policy = createChargePolicyService(deps);

  await policy.resume();

  assert.equal(deps.state().manualPause, false);
  assert.deepEqual(deps.calls, [['charging', 'on'], ['evaluate']]);
});

test('policy disables floating mode and restores system default when charge limiting is disabled', async () => {
  const deps = dependencies({ enabled: true, limitEnabled: true, lastAdapterRequest: 'off' });
  const policy = createChargePolicyService(deps);

  await policy.setLimitEnabled({ enabled: false });

  assert.equal(deps.state().limitEnabled, false);
  assert.equal(deps.state().enabled, false);
  assert.equal(deps.state().manualPause, false);
  assert.equal(deps.state().lastAdapterRequest, 'on');
  assert.deepEqual(deps.calls, [
    ['adapter', 'on'],
    ['maintain', 'stop'],
    ['charging', 'on'],
  ]);
});

test('policy disables floating mode and immediately records the restored adapter', async () => {
  const deps = dependencies({ enabled: true, limitEnabled: true, upperLimit: 85, lastAdapterRequest: 'off' });
  const policy = createChargePolicyService(deps);

  await policy.setSwitcherEnabled({ enabled: false });

  assert.equal(deps.state().enabled, false);
  assert.equal(deps.state().lastAdapterRequest, 'on');
  assert.deepEqual(deps.calls, [
    ['adapter', 'on'],
    ['charging', 'on'],
    ['maintain', 85],
  ]);
});

test('manual pause remains the top-level override when charge limiting is disabled', async () => {
  const deps = dependencies({ enabled: true, limitEnabled: true, manualPause: true, manualPauseBootId: 'boot-a' });
  const policy = createChargePolicyService(deps);

  await policy.setLimitEnabled({ enabled: false });

  assert.equal(deps.state().limitEnabled, false);
  assert.equal(deps.state().enabled, false);
  assert.equal(deps.state().manualPause, true);
  assert.deepEqual(deps.calls, [['adapter', 'on'], ['charging', 'off']]);
});

test('policy enables floating mode and charge limiting together', async () => {
  const deps = dependencies({ enabled: false, limitEnabled: false });
  const policy = createChargePolicyService(deps);

  await policy.setSwitcherEnabled({ enabled: true, limit: 90 });

  assert.equal(deps.state().enabled, true);
  assert.equal(deps.state().limitEnabled, true);
  assert.equal(deps.state().upperLimit, 90);
  assert.deepEqual(deps.calls, [['charging', 'on'], ['evaluate']]);
});
