import { spawn } from 'node:child_process';

export class BackendCommandError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'BackendCommandError';
    this.details = details;
  }
}

export function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;

    function finish(code, errorMessage) {
      if (settled) return;
      settled = true;
      child.stdout.destroy();
      child.stderr.destroy();
      resolve({ stdout, stderr: errorMessage || stderr, code });
    }

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => {
      finish(127, error.message);
    });
    child.on('exit', (code) => {
      finish(code ?? 1);
    });
  });
}

export function parsePmsetBattery(raw) {
  const sourceMatch = raw.match(/Now drawing from '([^']+)'/);
  const percentMatch = raw.match(/(\d+)%/);
  const powerSource = sourceMatch ? sourceMatch[1] : 'Unknown';
  const acAttached = /AC attached/.test(raw) || powerSource === 'AC Power';
  const charging = /;\s*charging\b/.test(raw) && !/not charging/.test(raw);

  return {
    percent: percentMatch ? Number(percentMatch[1]) : null,
    powerSource,
    acAttached,
    charging,
    raw,
  };
}

function parseSigned64(value) {
  const numeric = BigInt(value);
  return Number(numeric > 0x7fffffffffffffffn ? numeric - 0x10000000000000000n : numeric);
}

export function parseIoregBattery(raw) {
  const voltageMatch = raw.match(/"Voltage"\s*=\s*(\d+)/);
  const currentMatch = raw.match(/"InstantAmperage"\s*=\s*(\d+)/);
  if (!voltageMatch || !currentMatch) {
    return {
      voltageVolts: null,
      currentAmps: null,
      powerWatts: null,
      powerFlow: 'unknown',
    };
  }

  const voltageVolts = Number(voltageMatch[1]) / 1000;
  const currentAmps = parseSigned64(currentMatch[1]) / 1000;
  const powerWatts = voltageVolts * currentAmps;
  const powerFlow = currentAmps > 0 ? 'charging' : (currentAmps < 0 ? 'discharging' : 'idle');
  return { voltageVolts, currentAmps, powerWatts, powerFlow };
}

function parseLimit(raw) {
  const trimmed = raw.trim();
  if (/^\d{1,3}$/.test(trimmed)) {
    return Number(trimmed);
  }

  const singleLimit = trimmed.match(/being maintained at\s+(\d{1,3})%/i);
  if (singleLimit) {
    return Number(singleLimit[1]);
  }

  const rangeLimit = trimmed.match(/being maintained between\s+(\d{1,3})%\s+(?:-|and)\s+(\d{1,3})%/i);
  if (rangeLimit) {
    return `${rangeLimit[1]}-${rangeLimit[2]}`;
  }

  return null;
}

async function checkedRun(runner, command, args) {
  const result = await runner(command, args);
  if (result.code !== 0) {
    const commandText = `${command} ${args.join(' ')}`;
    const detail = result.stderr || result.stdout || `exit code ${result.code}`;
    const message = result.code === 127
      ? `Backend command not found: ${command}. Install actuallymentor/battery or set backendCommand to the installed battery CLI path.`
      : `Command failed: ${commandText}. ${detail}`;
    throw new BackendCommandError(message, {
      command,
      args,
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
    });
  }
  return result;
}

export function createBatteryBackend({ backendCommand = 'battery', runner = runCommand } = {}) {
  return {
    async status() {
      const pmset = await checkedRun(runner, 'pmset', ['-g', 'batt']);
      let telemetry = parseIoregBattery('');
      try {
        const ioreg = await checkedRun(runner, 'ioreg', ['-l', '-n', 'AppleSmartBattery', '-r']);
        telemetry = parseIoregBattery(ioreg.stdout);
      } catch {
        telemetry = parseIoregBattery('');
      }
      let limit = null;
      try {
        const backendStatus = await checkedRun(runner, backendCommand, ['status']);
        limit = parseLimit(backendStatus.stdout);
      } catch {
        limit = null;
      }
      const battery = parsePmsetBattery(pmset.stdout.trim());
      const powerFlow = telemetry.powerFlow === 'idle' && battery.powerSource === 'Battery Power'
        ? 'discharging'
        : telemetry.powerFlow;
      return { ...battery, ...telemetry, powerFlow, limit };
    },

    async setLimit(limit) {
      const numericLimit = Number(limit);
      if (!Number.isInteger(numericLimit) || numericLimit < 20 || numericLimit > 100) {
        throw new Error('Limit must be between 20 and 100');
      }
      await checkedRun(runner, backendCommand, ['maintain', String(numericLimit)]);
      return this.status();
    },

    async stopLimit() {
      await checkedRun(runner, backendCommand, ['maintain', 'stop']);
      return this.status();
    },

    async enable() {
      await checkedRun(runner, backendCommand, ['charging', 'on']);
      return this.status();
    },

    async disable() {
      await checkedRun(runner, backendCommand, ['charging', 'off']);
      return this.status();
    },

    async adapterOn() {
      await checkedRun(runner, backendCommand, ['adapter', 'on']);
      return this.status();
    },

    async adapterOff() {
      await checkedRun(runner, backendCommand, ['adapter', 'off']);
      return this.status();
    },
  };
}
