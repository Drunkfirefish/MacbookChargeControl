import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getConfigPath,
  loadConfig,
  saveConfig,
  redactConfig,
} from '../src/config.js';

test('getConfigPath uses MACCHARGE_CONFIG_DIR when set', () => {
  const configPath = getConfigPath({ MACCHARGE_CONFIG_DIR: '/tmp/maccharge-test' });
  assert.equal(configPath, '/tmp/maccharge-test/config.json');
});

test('loadConfig returns defaults when config file is missing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'maccharge-config-'));
  const config = await loadConfig({ env: { MACCHARGE_CONFIG_DIR: dir } });
  assert.deepEqual(config, {
    token: '',
    defaultLimit: 80,
    backendCommand: 'battery',
  });
});

test('saveConfig writes JSON that loadConfig can read', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'maccharge-config-'));
  await saveConfig({
    env: { MACCHARGE_CONFIG_DIR: dir },
    config: { token: 'secret', defaultLimit: 75, backendCommand: 'battery' },
  });

  const raw = await readFile(join(dir, 'config.json'), 'utf8');
  assert.match(raw, /"token": "secret"/);

  const loaded = await loadConfig({ env: { MACCHARGE_CONFIG_DIR: dir } });
  assert.deepEqual(loaded, {
    token: 'secret',
    defaultLimit: 75,
    backendCommand: 'battery',
  });
});

test('redactConfig hides token values', () => {
  assert.deepEqual(redactConfig({
    token: 'secret',
    defaultLimit: 80,
    backendCommand: 'battery',
  }), {
    tokenConfigured: true,
    defaultLimit: 80,
    backendCommand: 'battery',
  });
});
