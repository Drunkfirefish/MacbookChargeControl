import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  LABEL,
  createLaunchAgentManager,
  renderLaunchAgentPlist,
} from '../src/switcher/launch-agent.js';

test('LaunchAgent plist uses absolute runtime paths and keeps the controller alive', () => {
  const plist = renderLaunchAgentPlist({
    nodePath: '/opt/homebrew/bin/node',
    scriptPath: '/Users/test/maccharge/bin/maccharge.js',
    logPath: '/Users/test/.config/maccharge/switcher.log',
  });

  assert.match(plist, /com\.maccharge\.switcher/);
  assert.match(plist, /<string>\/opt\/homebrew\/bin\/node<\/string>/);
  assert.match(plist, /<string>\/Users\/test\/maccharge\/bin\/maccharge\.js<\/string>/);
  assert.match(plist, /<key>WorkingDirectory<\/key>\s*<string>\/Users\/test\/maccharge<\/string>/);
  assert.match(plist, /<string>switcher<\/string>\s*<string>run<\/string>/);
  assert.match(plist, /<key>RunAtLoad<\/key>\s*<true\/>/);
  assert.match(plist, /<key>KeepAlive<\/key>\s*<true\/>/);
});

test('LaunchAgent install writes plist and bootstraps the user service', async () => {
  const home = await mkdtemp(join(tmpdir(), 'maccharge-home-'));
  const calls = [];
  const manager = createLaunchAgentManager({
    env: { HOME: home, MACCHARGE_CONFIG_DIR: join(home, '.config', 'maccharge') },
    uid: 501,
    nodePath: '/opt/homebrew/bin/node',
    scriptPath: '/Users/test/maccharge/bin/maccharge.js',
    runner: async (command, args) => {
      calls.push([command, args]);
      return { code: args[0] === 'bootout' ? 3 : 0, stdout: '', stderr: '' };
    },
  });

  await manager.install();

  const plist = await readFile(join(home, 'Library', 'LaunchAgents', `${LABEL}.plist`), 'utf8');
  assert.match(plist, /switcher\.log/);
  assert.deepEqual(calls.at(-1), [
    '/bin/launchctl',
    ['bootstrap', 'gui/501', join(home, 'Library', 'LaunchAgents', `${LABEL}.plist`)],
  ]);
});

test('LaunchAgent uninstall boots out and removes the plist', async () => {
  const home = await mkdtemp(join(tmpdir(), 'maccharge-home-'));
  const calls = [];
  const manager = createLaunchAgentManager({
    env: { HOME: home },
    uid: 501,
    nodePath: '/opt/homebrew/bin/node',
    scriptPath: '/Users/test/maccharge/bin/maccharge.js',
    runner: async (command, args) => {
      calls.push([command, args]);
      return { code: 0, stdout: '', stderr: '' };
    },
  });

  await manager.install();
  await manager.uninstall();

  assert.equal(await manager.isInstalled(), false);
  assert.deepEqual(calls.at(-1), ['/bin/launchctl', ['bootout', `gui/501/${LABEL}`]]);
});

test('default LaunchAgent install stages a runtime outside Documents', async () => {
  const home = await mkdtemp(join(tmpdir(), 'maccharge-home-'));
  let staged;
  const manager = createLaunchAgentManager({
    env: { HOME: home },
    uid: 501,
    nodePath: '/opt/homebrew/bin/node',
    sourceRoot: '/Users/test/Documents/maccharge',
    runtimeInstaller: async (options) => { staged = options; },
    runner: async () => ({ code: 0, stdout: '', stderr: '' }),
  });

  await manager.install();

  const installRoot = join(home, 'Library', 'Application Support', 'MacCharge');
  const plist = await readFile(join(home, 'Library', 'LaunchAgents', `${LABEL}.plist`), 'utf8');
  assert.deepEqual(staged, { sourceRoot: '/Users/test/Documents/maccharge', installRoot });
  assert.match(plist, new RegExp(`<string>${installRoot}/bin/maccharge\\.js</string>`));
  assert.match(plist, new RegExp(`<key>WorkingDirectory</key>\\s*<string>${installRoot}</string>`));
});

test('LaunchAgent install retries bootstrap while launchd finishes bootout', async () => {
  const home = await mkdtemp(join(tmpdir(), 'maccharge-home-'));
  const calls = [];
  const waits = [];
  let bootstrapAttempts = 0;
  const manager = createLaunchAgentManager({
    env: { HOME: home },
    uid: 501,
    nodePath: '/opt/homebrew/bin/node',
    scriptPath: '/Users/test/maccharge/bin/maccharge.js',
    sleep: async (milliseconds) => { waits.push(milliseconds); },
    runner: async (command, args) => {
      calls.push([command, args]);
      if (args[0] === 'bootstrap' && bootstrapAttempts++ === 0) {
        return { code: 5, stdout: '', stderr: 'Input/output error' };
      }
      return { code: 0, stdout: '', stderr: '' };
    },
  });

  await manager.install();

  assert.equal(calls.filter(([, args]) => args[0] === 'bootstrap').length, 2);
  assert.deepEqual(waits, [1000, 1000]);
});
