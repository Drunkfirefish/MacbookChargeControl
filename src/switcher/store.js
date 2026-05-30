import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const DEFAULT_SWITCHER_STATE = {
  enabled: false,
  limitEnabled: true,
  upperLimit: 85,
  hysteresis: 5,
  pollIntervalSeconds: 30,
  manualPause: false,
  manualPauseBootId: null,
  lastAdapterRequest: 'on',
  lastActionAt: null,
  lastError: null,
};

export function getBootId() {
  return new Promise((resolve, reject) => {
    execFile('/usr/sbin/sysctl', ['-n', 'kern.boottime'], (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export function getSwitcherPaths(env = process.env) {
  const dir = env.MACCHARGE_CONFIG_DIR || join(homedir(), '.config', 'maccharge');
  return {
    dir,
    statePath: join(dir, 'switcher.json'),
    logPath: join(dir, 'switcher.log'),
    lockPath: join(dir, 'switcher.lock'),
  };
}

export function withDerivedState(state = {}) {
  const value = { ...DEFAULT_SWITCHER_STATE, ...state };
  if (!Number.isInteger(value.upperLimit) || value.upperLimit < 20 || value.upperLimit > 100) {
    throw new Error('Switcher limit must be between 20 and 100');
  }
  if (value.hysteresis !== 5) {
    throw new Error('Switcher hysteresis must be 5');
  }
  if (!Number.isInteger(value.pollIntervalSeconds) || value.pollIntervalSeconds < 1) {
    throw new Error('Switcher poll interval must be a positive integer');
  }
  if (!['on', 'off'].includes(value.lastAdapterRequest)) {
    throw new Error('Switcher adapter request must be on or off');
  }
  return { ...value, lowerLimit: value.upperLimit - value.hysteresis };
}

function persistedState(state) {
  const { lowerLimit: _lowerLimit, ...value } = withDerivedState(state);
  return value;
}

export function createSwitcherStore({ env = process.env, getBootId: readBootId = getBootId } = {}) {
  const paths = getSwitcherPaths(env);
  return {
    paths,

    async load() {
      try {
        const parsed = JSON.parse(await readFile(paths.statePath, 'utf8'));
        const bootId = await readBootId();
        const state = parsed.manualPause && parsed.manualPauseBootId !== bootId
          ? { ...parsed, manualPause: false, manualPauseBootId: null }
          : parsed;
        return withDerivedState(state);
      } catch (error) {
        if (error && error.code === 'ENOENT') {
          return withDerivedState();
        }
        return withDerivedState({
          enabled: false,
          lastError: 'Invalid switcher state file; floating mode was disabled.',
        });
      }
    },

    async save(state) {
      const value = persistedState(state);
      await mkdir(dirname(paths.statePath), { recursive: true });
      await writeFile(paths.statePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
      return withDerivedState(value);
    },
  };
}
