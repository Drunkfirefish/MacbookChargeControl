import { execFile } from 'node:child_process';
import { access, cp, mkdir, rm, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSwitcherPaths } from './store.js';

export const LABEL = 'com.maccharge.switcher';
const LAUNCHCTL_RETRY_DELAY_MS = 1000;

function xml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function renderLaunchAgentPlist({
  nodePath,
  scriptPath,
  logPath,
  workingDirectory = dirname(dirname(scriptPath)),
}) {
  for (const path of [nodePath, scriptPath, logPath, workingDirectory]) {
    if (!isAbsolute(path)) throw new Error('LaunchAgent paths must be absolute');
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xml(nodePath)}</string>
    <string>${xml(scriptPath)}</string>
    <string>switcher</string>
    <string>run</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>${xml(workingDirectory)}</string>
  <key>StandardOutPath</key>
  <string>${xml(logPath)}</string>
  <key>StandardErrorPath</key>
  <string>${xml(logPath)}</string>
</dict>
</plist>
`;
}

export function runLaunchCommand(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, (error, stdout, stderr) => {
      resolve({
        code: error && typeof error.code === 'number' ? error.code : (error ? 1 : 0),
        stdout: stdout || '',
        stderr: stderr || '',
      });
    });
  });
}

export async function installRuntimeSnapshot({ sourceRoot, installRoot }) {
  await rm(installRoot, { recursive: true, force: true });
  await mkdir(installRoot, { recursive: true });
  await cp(join(sourceRoot, 'bin'), join(installRoot, 'bin'), { recursive: true });
  await cp(join(sourceRoot, 'src'), join(installRoot, 'src'), { recursive: true });
  await cp(join(sourceRoot, 'package.json'), join(installRoot, 'package.json'));
}

export function createLaunchAgentManager({
  env = process.env,
  uid = process.getuid(),
  nodePath = process.execPath,
  scriptPath,
  sourceRoot = fileURLToPath(new URL('../../', import.meta.url)),
  runtimeInstaller = installRuntimeSnapshot,
  runner = runLaunchCommand,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  const home = env.HOME || homedir();
  const installRoot = join(home, 'Library', 'Application Support', 'MacCharge');
  const installedScriptPath = scriptPath || join(installRoot, 'bin', 'maccharge.js');
  const plistPath = join(home, 'Library', 'LaunchAgents', `${LABEL}.plist`);
  const serviceTarget = `gui/${uid}/${LABEL}`;
  const domainTarget = `gui/${uid}`;
  const { logPath } = getSwitcherPaths(env);

  async function checkedLaunchctl(args) {
    const result = await runner('/bin/launchctl', args);
    if (result.code !== 0) {
      throw new Error(`launchctl ${args.join(' ')} failed: ${result.stderr || result.stdout || `exit code ${result.code}`}`);
    }
    return result;
  }

  return {
    plistPath,
    serviceTarget,

    async install() {
      if (!scriptPath) {
        await runtimeInstaller({ sourceRoot, installRoot });
      }
      await mkdir(dirname(plistPath), { recursive: true });
      await mkdir(dirname(logPath), { recursive: true });
      await writeFile(plistPath, renderLaunchAgentPlist({ nodePath, scriptPath: installedScriptPath, logPath }), 'utf8');
      const bootout = await runner('/bin/launchctl', ['bootout', serviceTarget]);
      if (bootout.code === 0) {
        await sleep(LAUNCHCTL_RETRY_DELAY_MS);
      }
      let bootstrapError;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          await checkedLaunchctl(['bootstrap', domainTarget, plistPath]);
          bootstrapError = undefined;
          break;
        } catch (error) {
          bootstrapError = error;
          if (attempt < 4) await sleep(LAUNCHCTL_RETRY_DELAY_MS);
        }
      }
      if (bootstrapError) throw bootstrapError;
      return { plistPath, serviceTarget };
    },

    async uninstall() {
      await runner('/bin/launchctl', ['bootout', serviceTarget]);
      await unlink(plistPath).catch((error) => {
        if (!error || error.code !== 'ENOENT') throw error;
      });
    },

    async isInstalled() {
      try {
        await access(plistPath);
        return true;
      } catch {
        return false;
      }
    },

    async isLoaded() {
      const result = await runner('/bin/launchctl', ['print', serviceTarget]);
      return result.code === 0;
    },
  };
}
