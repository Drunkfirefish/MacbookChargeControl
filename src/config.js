import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const DEFAULT_CONFIG = {
  token: '',
  defaultLimit: 80,
  backendCommand: 'battery',
};

export function getConfigPath(env = process.env) {
  const dir = env.MACCHARGE_CONFIG_DIR || join(homedir(), '.config', 'maccharge');
  return join(dir, 'config.json');
}

export async function loadConfig({ env = process.env } = {}) {
  const configPath = getConfigPath(env);
  try {
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { ...DEFAULT_CONFIG };
    }
    throw error;
  }
}

export async function saveConfig({ env = process.env, config }) {
  const configPath = getConfigPath(env);
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify({ ...DEFAULT_CONFIG, ...config }, null, 2)}\n`, 'utf8');
}

export function redactConfig(config) {
  return {
    tokenConfigured: Boolean(config.token),
    defaultLimit: config.defaultLimit,
    backendCommand: config.backendCommand,
  };
}
