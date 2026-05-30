# Battery Helper Installation Incident

## Summary

While setting up the `actuallymentor/battery` backend for MacCharge on May 30, 2026, the Homebrew cask installation succeeded but the privileged CLI helper initialization failed. The failure left a partial installation: the app existed, `/usr/local/bin` symlinks existed, but the helper binaries they pointed to did not.

MacCharge could still read battery percentage through `pmset`, but control actions such as `battery maintain 85` failed.

## Environment

- Device: MacBook Air M2
- Architecture: Apple Silicon (`arm64`)
- macOS: 15.4
- Homebrew prefix: `/opt/homebrew`
- Battery app: `/Applications/battery.app`
- Battery helper target: `/usr/local/co.palokaj.battery`

## Symptoms

### MacCharge Web Error

```text
Backend command not found: battery.
Install actuallymentor/battery or set backendCommand to the installed battery CLI path.
```

### Battery App Error

```text
Battery limiter error: Command failed:
/usr/local/co.palokaj.battery/battery status_csv
/bin/bash: /usr/local/co.palokaj.battery/battery:
No such file or directory
```

### Filesystem State

The Homebrew cask installed the GUI app:

```text
/Applications/battery.app
```

The helper installer created dangling symlinks:

```text
/usr/local/bin/battery -> /usr/local/co.palokaj.battery/battery
/usr/local/bin/smc     -> /usr/local/co.palokaj.battery/smc
```

The target directory was empty:

```text
/usr/local/co.palokaj.battery/
```

The expected sudoers file was missing:

```text
/private/etc/sudoers.d/battery
```

## Homebrew Installation Issues

The first Homebrew installation attempts spent a long time inside auto-update and tap download operations.

Observed commands included:

```text
brew.sh update --auto-update
git fetch --tags --force -q origin refs/heads/master:refs/remotes/origin/master
git clone https://github.com/Homebrew/homebrew-cask
```

The user requested:

```bash
export HOMEBREW_NO_INSTALL_FROM_API=1
```

With API installation disabled, Homebrew needed a local `homebrew/cask` tap clone. The network repeatedly failed while cloning GitHub:

```text
Error in the HTTP2 framing layer
Recv failure: Operation timed out
```

We retried with:

```bash
HOMEBREW_NO_INSTALL_FROM_API=1 HOMEBREW_NO_AUTO_UPDATE=1 brew install --cask battery
```

We also retried GitHub traffic with HTTP/1.1:

```bash
GIT_CONFIG_COUNT=1 \
GIT_CONFIG_KEY_0=http.version \
GIT_CONFIG_VALUE_0=HTTP/1.1 \
HOMEBREW_NO_INSTALL_FROM_API=1 \
HOMEBREW_NO_AUTO_UPDATE=1 \
brew install --cask battery
```

Homebrew cask installation eventually completed through the user's terminal:

```text
Moving App 'battery.app' to '/Applications/battery.app'
battery was successfully installed!
```

## Root Cause

The Battery GUI initializes its CLI helper by running the upstream script with administrator privileges:

```bash
curl -s https://raw.githubusercontent.com/actuallymentor/battery/main/setup.sh | bash -s -- "$USER"
```

That upstream script downloads:

```text
https://github.com/actuallymentor/battery/archive/refs/heads/main.zip
```

Network access to GitHub was timing out. The upstream setup script does not stop immediately when the download fails. It continued into later installation steps, creating the helper directory, PATH file, and symlinks without installing the actual `battery` and `smc` files.

This produced a misleading partial installation.

## Proxy Detail

macOS system proxy settings were enabled:

```text
HTTPProxy  : 127.0.0.1
HTTPPort   : 7892
HTTPSProxy : 127.0.0.1
HTTPSPort  : 7892
SOCKSProxy : 127.0.0.1
SOCKSPort  : 7892
```

The Battery GUI launches its privileged installer through `osascript`. That shell did not reliably inherit terminal proxy environment variables. Explicitly supplying proxy environment variables to `curl` was reliable:

```bash
HTTPS_PROXY=http://127.0.0.1:7892 \
HTTP_PROXY=http://127.0.0.1:7892 \
ALL_PROXY=socks5h://127.0.0.1:7892 \
curl -fL \
  https://github.com/actuallymentor/battery/archive/refs/heads/main.zip \
  -o /tmp/battery-install/repo.zip
```

## Recovery Procedure Used

### 1. Download And Verify Official Upstream Files

Download the official GitHub archive through the local proxy:

```bash
tmpdir=$(mktemp -d /tmp/battery-install.XXXXXX)

HTTPS_PROXY=http://127.0.0.1:7892 \
HTTP_PROXY=http://127.0.0.1:7892 \
ALL_PROXY=socks5h://127.0.0.1:7892 \
curl --connect-timeout 5 --max-time 120 -fL \
  https://github.com/actuallymentor/battery/archive/refs/heads/main.zip \
  -o "$tmpdir/repo.zip"

unzip -tq "$tmpdir/repo.zip"
unzip -q "$tmpdir/repo.zip" -d "$tmpdir"
```

The verified archive contained:

```text
battery-main/battery.sh
battery-main/dist/smc
```

### 2. Install Verified Files With Visible macOS Administrator Authorization

The Codex background terminal password prompt was not visible to the user. We used a visible macOS authorization dialog through `osascript`.

Equivalent privileged operations:

```bash
rm -rf /usr/local/co.palokaj.battery
install -d -m 755 -o root -g wheel /usr/local/co.palokaj.battery
install -m 755 -o root -g wheel battery-main/dist/smc /usr/local/co.palokaj.battery/smc
install -m 755 -o root -g wheel battery-main/battery.sh /usr/local/co.palokaj.battery/battery

printf '%s\n' /usr/local/co.palokaj.battery > /etc/paths.d/50-battery
chown root:wheel /etc/paths.d/50-battery
chmod 644 /etc/paths.d/50-battery

ln -sf /usr/local/co.palokaj.battery/battery /usr/local/bin/battery
ln -sf /usr/local/co.palokaj.battery/smc /usr/local/bin/smc
chown -h root:wheel /usr/local/bin/battery /usr/local/bin/smc

/usr/local/co.palokaj.battery/battery visudo
```

### 3. Remove A Stale PID File

The failed installation left an empty file:

```text
~/.battery/battery.pid
```

This made `battery status` incorrectly report maintenance at `V ±V`. There was no real maintenance process or LaunchAgent at that point.

Remove only the stale file:

```bash
rm ~/.battery/battery.pid
```

### 4. Configure MacCharge To Use The Absolute Helper Path

```bash
maccharge config set-backend /usr/local/co.palokaj.battery/battery
```

## Verification

Verify helper files and permissions:

```bash
ls -la /usr/local/co.palokaj.battery
ls -la /private/etc/sudoers.d/battery
```

Expected helper files:

```text
/usr/local/co.palokaj.battery/battery
/usr/local/co.palokaj.battery/smc
```

Verify backend state:

```bash
battery status
```

Verify MacCharge state:

```bash
maccharge status
```

Verify the current ordinary maintenance policy:

```bash
battery maintain 85
battery status
```

Expected:

```text
Your battery is currently being maintained at 85%
```

## Additional MacCharge Fix

During real-device testing, `battery maintain 85` correctly started its background process, but MacCharge remained open. The upstream helper starts a detached maintenance process that inherits stdout or stderr file descriptors.

MacCharge originally waited for inherited streams to close. The backend runner was changed to:

- Resolve when the direct child exits.
- Explicitly destroy the parent-side stdout and stderr streams.

Regression tests were added so CLI and web actions return promptly while the upstream maintenance process continues running.

## Operational Notes

- The Battery GUI is not required for MacCharge after the CLI helper is installed.
- The Battery GUI may run update checks against GitHub. If GUI update checks stall behind proxy differences, keep the GUI closed and use the CLI helper directly.
- For routine operation, prefer the absolute helper path:

```text
/usr/local/co.palokaj.battery/battery
```

- When diagnosing, distinguish GUI installation from helper installation. `/Applications/battery.app` existing does not prove the CLI helper is usable.
