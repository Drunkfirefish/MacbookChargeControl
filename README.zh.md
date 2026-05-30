# MacCharge

MacCharge 是一个用于 MacBook 充电控制的小型 Node.js CLI 和局域网 Web 控制页面。

它针对 Apple Silicon Mac 设计，因为直接限制充电需要更底层的 helper。MacCharge 本身并不直接执行 SMC 写入，而是包装开源项目 `actuallymentor/battery` 中的 `battery` 命令，并增加本地 CLI、令牌保护的 HTTP API 和 Web UI。

## 要求

- 运行 Apple Silicon 的 macOS。
- Node.js 18 或更新版本。
- 来自 <https://github.com/actuallymentor/battery> 的 `battery` CLI。

`battery` 命令不是与之无关的 npm 包 `battery`。请按照该项目说明安装 Mac 充电工具，例如通过 Homebrew：

```bash
brew install battery
```

上游项目还记录了一个命令行安装器：

```bash
curl -s https://raw.githubusercontent.com/actuallymentor/battery/main/setup.sh | bash
```

在安装前先阅读该项目说明。它使用特权 helper 行为来控制充电。

## 安装与配置

将本地项目链接为命令：

```bash
npm link
```

配置 Web 令牌：

```bash
maccharge config set-token your-token-here
```

检查脱敏后的配置：

```bash
maccharge config show
```

如果已安装 `battery` CLI 但未在 shell 路径中，请配置其确切位置：

```bash
maccharge config set-backend /usr/local/co.palokaj.battery/battery
```

## CLI 用法

显示状态：

```bash
maccharge status
```

启用充电维护上限：

```bash
maccharge limit on --limit 80
```

关闭限制并恢复 macOS 默认充电：

```bash
maccharge limit off
```

临时暂停全部充电行为：

```bash
maccharge pause
```

恢复暂停前配置的策略：

```bash
maccharge resume
```

手动暂停是最高优先级操作：保留适配器供电，但停止充电。它会在同一次开机期间跨控制器和 Web 服务重启保持有效，并在 Mac 重启后自动清除。旧的 `disable` 和 `enable` 命令仍分别作为 `pause` 和 `resume` 的别名保留。

启用浮动充电模式并设置 85% 上限：

```bash
maccharge switcher on --limit 85
```

在浮动模式下，MacCharge 会在达到上限时请求关闭适配器电源，并在低于上限 5 个百分点时恢复适配器电源及普通充电限制。该控制器独立于 Web 页面运行。

首次运行 `switcher on` 命令时，会自动安装并加载用户 LaunchAgent。你也可以显式管理它：

检查状态、停用或管理后台控制器：

```bash
maccharge switcher status
maccharge switcher off
maccharge switcher install
maccharge switcher uninstall
```

## Web UI

启动本地控制页面：

```bash
maccharge web
```

启动可在局域网访问的控制页面：

```bash
maccharge web --host 0.0.0.0 --port 8765
```

打开终端中打印的 URL。在同一 Wi-Fi 下的另一台设备上，使用 Mac 的局域网 IP 地址和相同端口，然后在页面中输入已配置的令牌。

页面会每五秒刷新一次。电池面板显示电池流向、电压、电流和功率。策略面板提供根据当前状态切换的暂停/恢复操作、充电限制开关、统一的上限输入框，以及浮动充电开关。正电流与正功率表示充电；负值表示放电。

所有 API 路由都需要：

```text
Authorization: Bearer <token>
```

浏览器页面会将令牌存储在该设备的本地存储中。

## 安全

此工具仅适用于受信任的局域网使用。

- 不要将 Web 服务器暴露到互联网。
- 使用不易猜测的令牌。
- 任何具有服务器网络访问权限和令牌的人都可以控制充电。
- 状态 API 也需要令牌保护，因为它会泄露本地机器状态。

## 配置

MacCharge 将配置存储在：

```text
~/.config/maccharge/config.json
```

测试可以通过以下方式覆盖该位置：

```bash
MACCHARGE_CONFIG_DIR=/tmp/maccharge-test
```

配置字段：

```json
{
  "token": "required-web-token",
  "defaultLimit": 80,
  "backendCommand": "battery"
}
```

浮动充电状态单独存储在：

```text
~/.config/maccharge/switcher.json
```

后台控制器将日志写入：

```text
~/.config/maccharge/switcher.log
```

LaunchAgent 从以下位置运行控制器的稳定快照：

```text
~/Library/Application Support/MacCharge
```

运行 `maccharge switcher install` 会在本地代码更改后刷新该快照。

## 文档

- [battery 安装事故与恢复](docs/operations/2026-05-30-battery-installation-incident.md)

## 开发

运行测试：

```bash
npm test
```

在不链接的情况下运行 CLI：

```bash
node bin/maccharge.js --help
```

## 故障排查

如果网页显示错误：

```text
Backend command not found: battery
```

说明 Mac 充电后端未安装或未在命令路径中。使用以下命令检查：

```bash
command -v battery
```

如果没有输出，请先安装 `actuallymentor/battery` CLI。安装后，重新打开终端或使用指向已安装 CLI 路径的 `backendCommand` 启动 MacCharge。

```bash
maccharge config set-backend /usr/local/co.palokaj.battery/battery
```

如果网页显示：

```text
Command failed: battery maintain 85
```

请运行此只读检查：

```bash
battery status
```

然后检查上游 `battery` 的安装和权限。首次安装可能需要打开其应用或完成特权 helper 设置，才能让 `maintain`、`charging on` 和 `charging off` 生效。
