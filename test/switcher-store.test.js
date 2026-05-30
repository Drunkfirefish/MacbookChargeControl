import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DEFAULT_SWITCHER_STATE,
  createSwitcherStore,
  withDerivedState,
} from '../src/switcher/store.js';

async function tempStore({ bootId = 'boot-a' } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'maccharge-switcher-'));
  return {
    dir,
    store: createSwitcherStore({
      env: { MACCHARGE_CONFIG_DIR: dir },
      getBootId: async () => bootId,
    }),
  };
}

test('switcher store returns disabled defaults when state file is missing', async () => {
  const { store } = await tempStore();
  assert.deepEqual(await store.load(), {
    ...DEFAULT_SWITCHER_STATE,
    lowerLimit: 80,
  });
});

test('switcher store saves state and derives the lower limit', async () => {
  const { dir, store } = await tempStore();
  await store.save({ enabled: true, upperLimit: 90 });

  const saved = JSON.parse(await readFile(join(dir, 'switcher.json'), 'utf8'));
  assert.equal(saved.enabled, true);
  assert.equal(saved.upperLimit, 90);
  assert.equal(saved.lowerLimit, undefined);

  const loaded = await store.load();
  assert.equal(loaded.upperLimit, 90);
  assert.equal(loaded.lowerLimit, 85);
});

test('switcher store falls back to disabled defaults when JSON is invalid', async () => {
  const { dir, store } = await tempStore();
  await writeFile(join(dir, 'switcher.json'), '{broken', 'utf8');

  assert.deepEqual(await store.load(), {
    ...DEFAULT_SWITCHER_STATE,
    lowerLimit: 80,
    lastError: 'Invalid switcher state file; floating mode was disabled.',
  });
});

test('switcher store rejects invalid upper limits', () => {
  assert.throws(() => withDerivedState({ upperLimit: 19 }), /between 20 and 100/);
  assert.throws(() => withDerivedState({ upperLimit: 101 }), /between 20 and 100/);
});

test('switcher store preserves manual pause during the same boot', async () => {
  const { store } = await tempStore({ bootId: 'boot-a' });
  await store.save({ manualPause: true, manualPauseBootId: 'boot-a' });

  const loaded = await store.load();
  assert.equal(loaded.manualPause, true);
  assert.equal(loaded.manualPauseBootId, 'boot-a');
});

test('switcher store clears manual pause after reboot', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'maccharge-switcher-'));
  const store = createSwitcherStore({
    env: { MACCHARGE_CONFIG_DIR: dir },
    getBootId: async () => 'boot-b',
  });
  await writeFile(join(dir, 'switcher.json'), JSON.stringify({
    ...DEFAULT_SWITCHER_STATE,
    manualPause: true,
    manualPauseBootId: 'boot-a',
  }), 'utf8');

  const loaded = await store.load();
  assert.equal(loaded.manualPause, false);
  assert.equal(loaded.manualPauseBootId, null);
});
