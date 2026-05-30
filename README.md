# MacCharge

MacCharge is a small Node.js CLI and LAN web control page for MacBook charging control.

It is designed for Apple Silicon Macs where direct charge limiting requires a lower-level helper. MacCharge does not implement SMC writes itself. It wraps the `battery` command from the open-source `actuallymentor/battery` project and adds a local CLI, token-protected HTTP API, and web UI.

## Requirements

- macOS on Apple Silicon.
- Node.js 18 or newer.
- The `battery` CLI from <https://github.com/actuallymentor/battery>.

The `battery` command is not the unrelated npm package named `battery`. Install the Mac charging utility from its project instructions, for example with Homebrew:

```bash
brew install battery
```

The upstream project also documents a command-line installer:

```bash
curl -s https://raw.githubusercontent.com/actuallymentor/battery/main/setup.sh | bash
```

Read that project before installing it. It uses privileged helper behavior to control charging.

## Setup

Link this local project as a command:

```bash
npm link
```

Configure a web token:

```bash
maccharge config set-token your-token-here
```

Check the redacted config:

```bash
maccharge config show
```

If the `battery` CLI is installed but not on your shell path, configure its exact location:

```bash
maccharge config set-backend /usr/local/co.palokaj.battery/battery
```

## CLI Usage

Show status:

```bash
maccharge status
```

Enable a charge maintenance limit:

```bash
maccharge limit on --limit 80
```

Disable the limit and restore macOS default charging:

```bash
maccharge limit off
```

Temporarily pause all charging behavior:

```bash
maccharge pause
```

Resume the previously configured strategy:

```bash
maccharge resume
```

Manual pause is a top-level override. It keeps the adapter available while stopping charging, survives controller and web-server restarts during the same boot, and clears after the Mac reboots. The legacy `disable` and `enable` commands remain aliases for `pause` and `resume`.

Enable floating charge mode with an `85%` upper bound:

```bash
maccharge switcher on --limit 85
```

In floating mode, MacCharge requests adapter power off at the upper bound and restores adapter power plus ordinary charge limiting five percentage points below it. The controller runs independently from the web page.

The first `switcher on` command installs and loads a user LaunchAgent automatically. You can also manage it explicitly:

Inspect, disable, or explicitly manage the background controller:

```bash
maccharge switcher status
maccharge switcher off
maccharge switcher install
maccharge switcher uninstall
```

## Web UI

Start a local-only control page:

```bash
maccharge web
```

Start a LAN-accessible control page:

```bash
maccharge web --host 0.0.0.0 --port 8765
```

Open the URL printed in the terminal. From another device on the same Wi-Fi, use the Mac's LAN IP address with the same port, then enter the configured token in the page.

The page refreshes every five seconds. Its battery panel shows flow direction, voltage, current, and power. Its policy panel has a state-aware pause/resume action, a charge-limit switch, one shared upper-bound input, and a floating-charge switch. Positive current and power mean charging; negative values mean discharging.

All API routes require:

```text
Authorization: Bearer <token>
```

The browser page stores the token in local storage on that device.

## Security

This is for trusted local-network use only.

- Do not expose the web server to the internet.
- Use a token that is not easy to guess.
- Anyone with network access to the server and the token can control charging.
- The status API is also token-protected because it reveals local machine state.

## Configuration

MacCharge stores config at:

```text
~/.config/maccharge/config.json
```

Tests can override this location with:

```bash
MACCHARGE_CONFIG_DIR=/tmp/maccharge-test
```

Config fields:

```json
{
  "token": "required-web-token",
  "defaultLimit": 80,
  "backendCommand": "battery"
}
```

Floating charge state is stored separately at:

```text
~/.config/maccharge/switcher.json
```

The background controller writes logs at:

```text
~/.config/maccharge/switcher.log
```

The LaunchAgent runs a stable snapshot of the controller from:

```text
~/Library/Application Support/MacCharge
```

Running `maccharge switcher install` refreshes that snapshot after local code changes.

## Documentation

- [Battery helper installation incident and recovery](docs/operations/2026-05-30-battery-installation-incident.md)

## Development

Run tests:

```bash
npm test
```

Run the CLI without linking:

```bash
node bin/maccharge.js --help
```

## Troubleshooting

If the web page shows an error like:

```text
Backend command not found: battery
```

the Mac charging backend is not installed or not on the command path. Check it with:

```bash
command -v battery
```

If it prints nothing, install the `actuallymentor/battery` CLI first. After installing, reopen the terminal or start MacCharge with `backendCommand` pointing at the installed CLI path.

```bash
maccharge config set-backend /usr/local/co.palokaj.battery/battery
```

If the web page shows:

```text
Command failed: battery maintain 85
```

run this read-only check:

```bash
battery status
```

Then check the upstream `battery` installation and permissions. The first install may require opening its app or completing its privileged helper setup before `maintain`, `charging on`, and `charging off` work.
