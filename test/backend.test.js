import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn as spawnChild } from 'node:child_process';
import {
  parsePmsetBattery,
  parseIoregBattery,
  createBatteryBackend,
  BackendCommandError,
  runCommand,
} from '../src/backend/battery.js';

test('parseIoregBattery exposes signed discharge telemetry', () => {
  const raw = `    "InstantAmperage" = 18446744073709550921
    "Voltage" = 12585`;

  assert.deepEqual(parseIoregBattery(raw), {
    voltageVolts: 12.585,
    currentAmps: -0.695,
    powerWatts: -8.746575,
    powerFlow: 'discharging',
  });
});

test('parseIoregBattery exposes positive charging telemetry', () => {
  const raw = `    "InstantAmperage" = 2048
    "Voltage" = 12450`;

  assert.deepEqual(parseIoregBattery(raw), {
    voltageVolts: 12.45,
    currentAmps: 2.048,
    powerWatts: 25.4976,
    powerFlow: 'charging',
  });
});

test('parseIoregBattery reports idle telemetry when current is zero', () => {
  const raw = `    "InstantAmperage" = 0
    "Voltage" = 12500`;

  assert.deepEqual(parseIoregBattery(raw), {
    voltageVolts: 12.5,
    currentAmps: 0,
    powerWatts: 0,
    powerFlow: 'idle',
  });
});

test('parsePmsetBattery extracts battery state', () => {
  const raw = `Now drawing from 'AC Power'
 -InternalBattery-0 (id=21495907)\t85%; AC attached; not charging present: true`;
  const status = parsePmsetBattery(raw);

  assert.deepEqual(status, {
    percent: 85,
    powerSource: 'AC Power',
    acAttached: true,
    charging: false,
    raw,
  });
});

test('parsePmsetBattery treats AC Power source as attached while charging', () => {
  const raw = `Now drawing from 'AC Power'
 -InternalBattery-0 (id=21495907)\t95%; charging; 0:22 remaining present: true`;
  const status = parsePmsetBattery(raw);

  assert.equal(status.percent, 95);
  assert.equal(status.powerSource, 'AC Power');
  assert.equal(status.acAttached, true);
  assert.equal(status.charging, true);
});

test('backend status uses pmset output and battery limit output', async () => {
  const calls = [];
  const backend = createBatteryBackend({
    backendCommand: 'battery',
    runner: async (command, args) => {
      calls.push([command, args]);
      if (command === 'pmset') {
        return {
          stdout: `Now drawing from 'AC Power'\n -InternalBattery-0\t85%; AC attached; not charging present: true`,
          stderr: '',
          code: 0,
        };
      }
      if (command === 'ioreg') {
        return {
          stdout: `    "InstantAmperage" = 2048
    "Voltage" = 12450`,
          stderr: '',
          code: 0,
        };
      }
      return { stdout: '80\n', stderr: '', code: 0 };
    },
  });

  const status = await backend.status();
  assert.equal(status.percent, 85);
  assert.equal(status.limit, 80);
  assert.equal(status.powerFlow, 'charging');
  assert.equal(status.powerWatts, 25.4976);
  assert.deepEqual(calls, [
    ['pmset', ['-g', 'batt']],
    ['ioreg', ['-l', '-n', 'AppleSmartBattery', '-r']],
    ['battery', ['status']],
  ]);
});

test('backend status parses maintain limit from battery status output', async () => {
  const backend = createBatteryBackend({
    backendCommand: 'battery',
    runner: async (command) => {
      if (command === 'pmset') {
        return {
          stdout: `Now drawing from 'AC Power'\n -InternalBattery-0\t94%; charging; 0:25 remaining present: true`,
          stderr: '',
          code: 0,
        };
      }
      return {
        stdout: `05/29/26-14:00:00 [123]: Battery at 94% (0:25 remaining), 12.1V, smc charging enabled
05/29/26-14:00:00 [123]: Your battery is currently being maintained at 80%`,
        stderr: '',
        code: 0,
      };
    },
  });

  const status = await backend.status();
  assert.equal(status.percent, 94);
  assert.equal(status.limit, 80);
});

test('backend status preserves discharging flow when instantaneous current is zero on battery power', async () => {
  const backend = createBatteryBackend({
    backendCommand: 'battery',
    runner: async (command) => {
      if (command === 'pmset') {
        return {
          stdout: `Now drawing from 'Battery Power'\n -InternalBattery-0\t85%; discharging; 4:20 remaining present: true`,
          stderr: '',
          code: 0,
        };
      }
      if (command === 'ioreg') {
        return {
          stdout: `    "InstantAmperage" = 0
    "Voltage" = 12477`,
          stderr: '',
          code: 0,
        };
      }
      return { stdout: '', stderr: '', code: 0 };
    },
  });

  assert.equal((await backend.status()).powerFlow, 'discharging');
});

test('backend status leaves limit unknown when battery status has no maintain line', async () => {
  const backend = createBatteryBackend({
    backendCommand: 'battery',
    runner: async (command) => {
      if (command === 'pmset') {
        return {
          stdout: `Now drawing from 'AC Power'\n -InternalBattery-0\t94%; charging; 0:25 remaining present: true`,
          stderr: '',
          code: 0,
        };
      }
      return {
        stdout: '05/29/26-14:00:00 [123]: Battery at 94% (0:25 remaining), 12.1V, smc charging enabled',
        stderr: '',
        code: 0,
      };
    },
  });

  const status = await backend.status();
  assert.equal(status.percent, 94);
  assert.equal(status.limit, null);
});

test('backend limit validates range before running command', async () => {
  const backend = createBatteryBackend({
    backendCommand: 'battery',
    runner: async () => {
      throw new Error('runner should not be called');
    },
  });

  await assert.rejects(() => backend.setLimit(10), /Limit must be between 20 and 100/);
});

test('backend maps failed commands to BackendCommandError', async () => {
  const backend = createBatteryBackend({
    backendCommand: 'battery',
    runner: async () => ({ stdout: '', stderr: 'not allowed', code: 1 }),
  });

  await assert.rejects(() => backend.enable(), BackendCommandError);
});

test('backend reports missing command with install guidance', async () => {
  const backend = createBatteryBackend({
    backendCommand: 'battery',
    runner: async () => ({ stdout: '', stderr: 'spawn battery ENOENT', code: 127 }),
  });

  await assert.rejects(
    () => backend.setLimit(85),
    /Backend command not found: battery/
  );
});

test('backend turns adapter input on', async () => {
  const calls = [];
  const backend = createBatteryBackend({
    backendCommand: 'battery',
    runner: async (command, args) => {
      calls.push([command, args]);
      if (command === 'pmset') {
        return { stdout: `Now drawing from 'AC Power'\n -InternalBattery-0\t85%; AC attached; not charging present: true`, stderr: '', code: 0 };
      }
      return { stdout: '', stderr: '', code: 0 };
    },
  });

  await backend.adapterOn();
  assert.deepEqual(calls[0], ['battery', ['adapter', 'on']]);
});

test('backend turns adapter input off', async () => {
  const calls = [];
  const backend = createBatteryBackend({
    backendCommand: 'battery',
    runner: async (command, args) => {
      calls.push([command, args]);
      if (command === 'pmset') {
        return { stdout: `Now drawing from 'Battery Power'\n -InternalBattery-0\t85%; discharging; 4:30 remaining present: true`, stderr: '', code: 0 };
      }
      return { stdout: '', stderr: '', code: 0 };
    },
  });

  await backend.adapterOff();
  assert.deepEqual(calls[0], ['battery', ['adapter', 'off']]);
});

test('backend stops ordinary charge limiting', async () => {
  const calls = [];
  const backend = createBatteryBackend({
    backendCommand: 'battery',
    runner: async (command, args) => {
      calls.push([command, args]);
      if (command === 'pmset') {
        return { stdout: `Now drawing from 'AC Power'\n -InternalBattery-0\t85%; charging; 0:20 remaining present: true`, stderr: '', code: 0 };
      }
      return { stdout: '', stderr: '', code: 0 };
    },
  });

  await backend.stopLimit();
  assert.deepEqual(calls[0], ['battery', ['maintain', 'stop']]);
});

test('runCommand resolves when the command exits even if a background child keeps stderr open', async () => {
  const result = await Promise.race([
    runCommand(process.execPath, [
      '-e',
      `const { spawn } = require('node:child_process');
       spawn(process.execPath, ['-e', 'setTimeout(() => {}, 750)'], {
         stdio: ['ignore', 'ignore', 2],
       }).unref();`,
    ]),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('runCommand waited for inherited stderr to close')), 250);
    }),
  ]);

  assert.equal(result.code, 0);
});

test('runCommand releases inherited pipes so the calling process can exit', async () => {
  const moduleUrl = new URL('../src/backend/battery.js', import.meta.url).href;
  const backgroundScript = 'setTimeout(() => {}, 750)';
  const commandScript = `const { spawn } = require('node:child_process');
    spawn(process.execPath, ['-e', ${JSON.stringify(backgroundScript)}], {
      stdio: ['ignore', 'ignore', 2],
    }).unref();`;
  const callerScript = `import { runCommand } from ${JSON.stringify(moduleUrl)};
    await runCommand(process.execPath, ['-e', ${JSON.stringify(commandScript)}]);`;

  const code = await new Promise((resolve, reject) => {
    const caller = spawnChild(process.execPath, ['--input-type=module', '-e', callerScript], {
      stdio: 'ignore',
    });
    const timeout = setTimeout(() => {
      caller.kill();
      reject(new Error('calling process stayed open after command exit'));
    }, 250);
    caller.on('exit', (exitCode) => {
      clearTimeout(timeout);
      resolve(exitCode);
    });
  });

  assert.equal(code, 0);
});
