import { loadConfig as realLoadConfig, saveConfig as realSaveConfig, redactConfig } from './config.js';
import { createBatteryBackend } from './backend/battery.js';

const HELP = `Usage:
  maccharge status
  maccharge pause
  maccharge resume
  maccharge limit on [--limit <percent>]
  maccharge limit off
  maccharge enable                 Alias for resume
  maccharge disable                Alias for pause
  maccharge switcher on [--limit <percent>]
  maccharge switcher off
  maccharge switcher status
  maccharge switcher run
  maccharge switcher install
  maccharge switcher uninstall
  maccharge web [--host <host>] [--port <port>]
  maccharge config set-token <token>
  maccharge config set-backend <command-or-path>
  maccharge config show
`;

function parseFlag(args, name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
}

function writeStatus(stdout, status) {
  stdout.write(`Battery: ${status.percent ?? 'unknown'}%\n`);
  stdout.write(`Power: ${status.powerSource ?? 'Unknown'}\n`);
  stdout.write(`AC attached: ${status.acAttached ? 'yes' : 'no'}\n`);
  stdout.write(`Charging: ${status.charging ? 'yes' : 'no'}\n`);
  stdout.write(`Flow: ${status.powerFlow ?? 'unknown'}\n`);
  stdout.write(`Power: ${status.powerWatts === null || status.powerWatts === undefined ? 'unknown' : `${status.powerWatts.toFixed(1)} W`}\n`);
  stdout.write(`Current: ${status.currentAmps === null || status.currentAmps === undefined ? 'unknown' : `${status.currentAmps.toFixed(3)} A`}\n`);
  stdout.write(`Voltage: ${status.voltageVolts === null || status.voltageVolts === undefined ? 'unknown' : `${status.voltageVolts.toFixed(3)} V`}\n`);
  stdout.write(`Limit: ${status.limit ?? 'unknown'}\n`);
}

function validateLimit(value) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 20 || limit > 100) {
    throw new Error('Limit must be between 20 and 100');
  }
  return limit;
}

async function loadStartServer(deps) {
  if (deps.startServer) {
    return deps.startServer;
  }
  const serverModule = await import('./server.js');
  return serverModule.startServer;
}

async function loadSwitcherService(deps, options) {
  if (deps.switcherService) {
    return deps.switcherService;
  }
  if (deps.createSwitcherService) {
    return deps.createSwitcherService(options);
  }
  const switcherModule = await import('./switcher/service.js');
  return switcherModule.createDefaultSwitcherService(options);
}

async function loadPolicyService(deps, options) {
  if (deps.policyService) {
    return deps.policyService;
  }
  if (deps.createPolicyService) {
    return deps.createPolicyService(options);
  }
  const [{ createChargePolicyService }, { createSwitcherStore }, { createSwitcherController, createFileLogger }, { createLaunchAgentManager }] = await Promise.all([
    import('./policy/service.js'),
    import('./switcher/store.js'),
    import('./switcher/controller.js'),
    import('./switcher/launch-agent.js'),
  ]);
  const store = createSwitcherStore({ env: options.env });
  const controller = createSwitcherController({ backend: options.backend, store, log: createFileLogger(store.paths.logPath) });
  const launchAgent = createLaunchAgentManager({ env: options.env });
  return createChargePolicyService({ backend: options.backend, store, controller, launchAgent });
}

export async function main(args, deps = {}) {
  const env = deps.env || process.env;
  const stdout = deps.stdout || process.stdout;
  const stderr = deps.stderr || process.stderr;
  const loadConfig = deps.loadConfig || realLoadConfig;
  const saveConfig = deps.saveConfig || realSaveConfig;
  const createBackend = deps.createBackend || createBatteryBackend;
  const command = args[0];

  try {
    if (!command || command === '--help' || command === '-h') {
      stdout.write(HELP);
      return 0;
    }

    if (command === 'config') {
      const config = await loadConfig({ env });
      if (args[1] === 'set-token' && args[2]) {
        await saveConfig({ env, config: { ...config, token: args[2] } });
        stdout.write('Token configured.\n');
        return 0;
      }
      if (args[1] === 'set-backend' && args[2]) {
        await saveConfig({ env, config: { ...config, backendCommand: args[2] } });
        stdout.write('Backend command configured.\n');
        return 0;
      }
      if (args[1] === 'show') {
        stdout.write(`${JSON.stringify(redactConfig(config), null, 2)}\n`);
        return 0;
      }
      stderr.write(HELP);
      return 1;
    }

    if (!['status', 'pause', 'resume', 'limit', 'enable', 'disable', 'switcher', 'web'].includes(command)) {
      stderr.write(HELP);
      return 1;
    }

    const config = await loadConfig({ env });
    const backend = createBackend({ backendCommand: config.backendCommand });
    const policy = ['pause', 'resume', 'limit', 'enable', 'disable', 'switcher', 'web'].includes(command)
      ? await loadPolicyService(deps, { backend, env })
      : null;

    if (command === 'switcher') {
      const switcher = await loadSwitcherService(deps, { backend, env });
      const action = args[1];
      let result;
      if (action === 'on') {
        const limitValue = parseFlag(args, '--limit', undefined);
        result = await policy.setSwitcherEnabled({
          enabled: true,
          limit: limitValue === undefined ? undefined : validateLimit(limitValue),
        });
      } else if (action === 'off') {
        result = await policy.setSwitcherEnabled({ enabled: false });
      } else if (action === 'status') {
        result = await switcher.status();
      } else if (action === 'run') {
        await switcher.run();
        return 0;
      } else if (action === 'install') {
        result = await switcher.install();
      } else if (action === 'uninstall') {
        result = await switcher.uninstall();
      } else {
        stderr.write(HELP);
        return 1;
      }
      stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    }

    if (command === 'status') {
      writeStatus(stdout, await backend.status());
      return 0;
    }

    if (command === 'limit') {
      if (args[1] === 'on' || args[1] === 'off') {
        const limitValue = parseFlag(args, '--limit', undefined);
        stdout.write(`${JSON.stringify(await policy.setLimitEnabled({
          enabled: args[1] === 'on',
          limit: limitValue === undefined ? undefined : validateLimit(limitValue),
        }), null, 2)}\n`);
        return 0;
      }
      const limit = validateLimit(args[1]);
      stdout.write(`${JSON.stringify(await policy.setLimitEnabled({ enabled: true, limit }), null, 2)}\n`);
      return 0;
    }

    if (command === 'enable' || command === 'resume') {
      stdout.write(`${JSON.stringify(await policy.resume(), null, 2)}\n`);
      return 0;
    }

    if (command === 'disable' || command === 'pause') {
      stdout.write(`${JSON.stringify(await policy.pause(), null, 2)}\n`);
      return 0;
    }

    if (command === 'web') {
      const host = parseFlag(args, '--host', '127.0.0.1');
      const port = Number(parseFlag(args, '--port', '8765'));
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('Port must be between 1 and 65535');
      }
      const startServer = await loadStartServer(deps);
      const switcher = await loadSwitcherService(deps, { backend, env });
      await startServer({ host, port, config, backend, switcher, policy, stdout });
      return 0;
    }

    stderr.write(HELP);
    return 1;
  } catch (error) {
    stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}
