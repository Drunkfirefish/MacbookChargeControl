import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwitcherService } from '../src/switcher/service.js';
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
  const controller = {
    async evaluate() { calls.push(['evaluate']); },
    async restoreSafeState() { calls.push(['restore']); },
    async run() { calls.push(['run']); },
  };
  const launchAgent = {
    async isInstalled() { return false; },
    async isLoaded() { return false; },
    async install() { calls.push(['install']); },
    async uninstall() { calls.push(['uninstall']); },
  };
  return { store, controller, launchAgent, calls, state: () => state };
}

test('switcher service enables floating mode, evaluates immediately, and installs the daemon', async () => {
  const deps = dependencies();
  const service = createSwitcherService(deps);

  await service.on({ limit: 90 });

  assert.equal(deps.state().enabled, true);
  assert.equal(deps.state().upperLimit, 90);
  assert.deepEqual(deps.calls, [['evaluate'], ['install']]);
});

test('switcher service disables floating mode and restores safe ordinary limiting', async () => {
  const deps = dependencies({ enabled: true, lastAdapterRequest: 'off' });
  const service = createSwitcherService(deps);

  await service.off();

  assert.equal(deps.state().enabled, false);
  assert.deepEqual(deps.calls, [['restore']]);
});

test('switcher service status reports derived range and daemon state', async () => {
  const deps = dependencies({ enabled: true, upperLimit: 85, lastAdapterRequest: 'off' });
  deps.launchAgent.isInstalled = async () => true;
  deps.launchAgent.isLoaded = async () => true;
  const service = createSwitcherService(deps);

  assert.deepEqual(await service.status(), {
    ...deps.state(),
    lowerLimit: 80,
    launchAgentInstalled: true,
    controllerLoaded: true,
  });
});
