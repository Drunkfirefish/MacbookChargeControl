import { createFileLogger, createSwitcherController } from './controller.js';
import { createLaunchAgentManager } from './launch-agent.js';
import { createSwitcherStore } from './store.js';

export function createSwitcherService({ store, controller, launchAgent }) {
  async function status() {
    const [state, launchAgentInstalled, controllerLoaded] = await Promise.all([
      store.load(),
      launchAgent.isInstalled(),
      launchAgent.isLoaded(),
    ]);
    return { ...state, launchAgentInstalled, controllerLoaded };
  }

  return {
    status,

    async on({ limit } = {}) {
      const state = await store.load();
      await store.save({
        ...state,
        enabled: true,
        upperLimit: limit === undefined ? state.upperLimit : Number(limit),
        lastError: null,
      });
      await controller.evaluate();
      if (!(await launchAgent.isInstalled()) || !(await launchAgent.isLoaded())) {
        await launchAgent.install();
      }
      return status();
    },

    async off() {
      const state = await store.load();
      await store.save({ ...state, enabled: false, lastError: null });
      await controller.restoreSafeState();
      return status();
    },

    async run() {
      return controller.run();
    },

    async install() {
      await launchAgent.install();
      return status();
    },

    async uninstall() {
      await this.off();
      await launchAgent.uninstall();
      return status();
    },
  };
}

export function createDefaultSwitcherService({ backend, env = process.env } = {}) {
  const store = createSwitcherStore({ env });
  const log = createFileLogger(store.paths.logPath);
  const controller = createSwitcherController({ backend, store, log });
  const launchAgent = createLaunchAgentManager({ env });
  return createSwitcherService({ store, controller, launchAgent });
}
