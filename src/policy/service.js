import { getBootId } from '../switcher/store.js';

export function createChargePolicyService({
  backend,
  store,
  controller,
  launchAgent,
  readBootId = getBootId,
} = {}) {
  async function ensureController() {
    if (!(await launchAgent.isInstalled()) || !(await launchAgent.isLoaded())) {
      await launchAgent.install();
    }
  }

  async function status() {
    const [state, launchAgentInstalled, controllerLoaded] = await Promise.all([
      store.load(),
      launchAgent.isInstalled(),
      launchAgent.isLoaded(),
    ]);
    return { ...state, launchAgentInstalled, controllerLoaded };
  }

  async function applyConfiguredPolicy(state) {
    if (state.manualPause) {
      await backend.adapterOn();
      await backend.disable();
      return store.save({ ...state, lastAdapterRequest: 'on' });
    }
    if (state.enabled) {
      await backend.enable();
      await controller.evaluate();
      await ensureController();
      return;
    }
    await backend.adapterOn();
    if (state.limitEnabled) {
      await backend.enable();
      await backend.setLimit(state.upperLimit);
      return store.save({ ...state, lastAdapterRequest: 'on' });
    }
    await backend.stopLimit();
    await backend.enable();
    return store.save({ ...state, lastAdapterRequest: 'on' });
  }

  return {
    status,

    async pause() {
      const state = await store.load();
      const manualPauseBootId = await readBootId();
      const next = await store.save({ ...state, manualPause: true, manualPauseBootId });
      await backend.adapterOn();
      await backend.disable();
      await store.save({ ...next, lastAdapterRequest: 'on' });
      return status();
    },

    async resume() {
      const state = await store.load();
      const next = await store.save({ ...state, manualPause: false, manualPauseBootId: null });
      await applyConfiguredPolicy(next);
      return status();
    },

    async setLimitEnabled({ enabled, limit } = {}) {
      const state = await store.load();
      if (!enabled) {
        const next = await store.save({
          ...state,
          enabled: false,
          limitEnabled: false,
        });
        await applyConfiguredPolicy(next);
        return status();
      }
      const next = await store.save({
        ...state,
        limitEnabled: true,
        upperLimit: limit === undefined ? state.upperLimit : Number(limit),
      });
      await applyConfiguredPolicy(next);
      return status();
    },

    async setSwitcherEnabled({ enabled, limit } = {}) {
      const state = await store.load();
      const next = await store.save({
        ...state,
        enabled: Boolean(enabled),
        limitEnabled: enabled ? true : state.limitEnabled,
        upperLimit: limit === undefined ? state.upperLimit : Number(limit),
      });
      await applyConfiguredPolicy(next);
      return status();
    },
  };
}
