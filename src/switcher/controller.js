import { appendFile, mkdir, open, readFile, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function createFileLogger(logPath) {
  return async (message) => {
    await mkdir(dirname(logPath), { recursive: true });
    await appendFile(logPath, `${new Date().toISOString()} ${message}\n`, 'utf8');
  };
}

async function acquireLock(lockPath) {
  await mkdir(dirname(lockPath), { recursive: true });
  try {
    const handle = await open(lockPath, 'wx');
    await handle.writeFile(`${process.pid}\n`, 'utf8');
    return async () => {
      await handle.close();
      await unlink(lockPath).catch(() => {});
    };
  } catch (error) {
    if (!error || error.code !== 'EEXIST') throw error;
    const existingPid = Number((await readFile(lockPath, 'utf8').catch(() => '')).trim());
    try {
      if (existingPid) process.kill(existingPid, 0);
      throw new Error(`Switcher controller is already running with PID ${existingPid || 'unknown'}`);
    } catch (pidError) {
      if (pidError && pidError.code !== 'ESRCH') throw pidError;
      await unlink(lockPath).catch(() => {});
      return acquireLock(lockPath);
    }
  }
}

export function createSwitcherController({
  backend,
  store,
  log = async () => {},
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  now = () => new Date().toISOString(),
} = {}) {
  let disabledStateRestored = false;

  async function saveAction(state, values, message) {
    const saved = await store.save({
      ...state,
      ...values,
      lastActionAt: now(),
      lastError: null,
    });
    await log(message);
    return saved;
  }

  async function storeFailure(state, error) {
    const message = errorMessage(error);
    await store.save({ ...state, lastError: message });
    await log(`error: ${message}`);
  }

  async function restoreConfiguredState(state) {
    if (state.manualPause) {
      await backend.adapterOn();
      disabledStateRestored = true;
      return await saveAction(
        state,
        { lastAdapterRequest: 'on' },
        'adapter on; manual pause preserved'
      );
    }

    if (!state.limitEnabled) {
      await backend.adapterOn();
      await backend.stopLimit();
      await backend.enable();
      disabledStateRestored = true;
      return await saveAction(
        state,
        { lastAdapterRequest: 'on' },
        'adapter on; system default charging restored'
      );
    }

    await backend.adapterOn();
    await backend.enable();
    await backend.setLimit(state.upperLimit);
    disabledStateRestored = true;
    return await saveAction(
      state,
      { lastAdapterRequest: 'on' },
      `adapter on; ordinary limit restored at ${state.upperLimit}%`
    );
  }

  async function restoreSafeState() {
    const state = await store.load();
    try {
      if (state.manualPause) {
        await backend.adapterOn();
        await backend.disable();
        disabledStateRestored = true;
        return await saveAction(
          state,
          { lastAdapterRequest: 'on' },
          'adapter on; manual pause preserved'
        );
      }
      return await restoreConfiguredState(state);
    } catch (error) {
      await storeFailure(state, error);
      throw error;
    }
  }

  async function restoreOrdinaryLimit(state) {
    try {
      await backend.adapterOn();
      await backend.enable();
      await backend.setLimit(state.upperLimit);
      disabledStateRestored = true;
      return await saveAction(
        state,
        { lastAdapterRequest: 'on' },
        `adapter on; ordinary limit restored at ${state.upperLimit}%`
      );
    } catch (error) {
      await storeFailure(state, error);
      throw error;
    }
  }

  async function evaluate() {
    const state = await store.load();
    try {
      const status = await backend.status();
      if (!Number.isInteger(status.percent)) {
        throw new Error('Battery percentage is unavailable');
      }

      if (state.manualPause) {
        return { ...state, battery: status };
      }

      if (!state.limitEnabled) {
        if (!disabledStateRestored || state.lastAdapterRequest !== 'on') {
          return await restoreConfiguredState(state);
        }
        return { ...state, battery: status };
      }

      if (!state.enabled) {
        if (!disabledStateRestored || state.lastAdapterRequest !== 'on') {
          return await restoreOrdinaryLimit(state);
        }
        return { ...state, battery: status };
      }

      disabledStateRestored = false;
      if (status.percent >= state.upperLimit && state.lastAdapterRequest !== 'off') {
        await backend.adapterOff();
        return await saveAction(
          state,
          { lastAdapterRequest: 'off' },
          `adapter off at ${status.percent}% (upper ${state.upperLimit}%)`
        );
      }

      if (status.percent <= state.lowerLimit && state.lastAdapterRequest !== 'on') {
        await backend.adapterOn();
        await backend.enable();
        await backend.setLimit(state.upperLimit);
        return await saveAction(
          state,
          { lastAdapterRequest: 'on' },
          `adapter on at ${status.percent}% (lower ${state.lowerLimit}%); ordinary limit restored at ${state.upperLimit}%`
        );
      }

      return { ...state, battery: status };
    } catch (error) {
      await storeFailure(state, error);
      throw error;
    }
  }

  async function run() {
    const releaseLock = await acquireLock(store.paths.lockPath);
    let stopped = false;
    let wake;
    const stop = () => {
      stopped = true;
      if (wake) wake();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    await log(`controller started with PID ${process.pid}`);
    try {
      while (!stopped) {
        try {
          await evaluate();
        } catch {
          // The next poll retries after the failure has been persisted and logged.
        }
        if (!stopped) {
          const state = await store.load();
          await Promise.race([
            sleep(state.pollIntervalSeconds * 1000),
            new Promise((resolve) => { wake = resolve; }),
          ]);
          wake = undefined;
        }
      }
    } finally {
      process.off('SIGINT', stop);
      process.off('SIGTERM', stop);
      try {
        await restoreSafeState();
      } catch {
        // The stored error and log preserve the failed safety attempt.
      }
      await releaseLock();
      await log('controller stopped');
    }
  }

  return { evaluate, restoreSafeState, run };
}
