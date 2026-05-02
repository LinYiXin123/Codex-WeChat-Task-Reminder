# Codex-WeChat-Task-Reminder 2.1.16

电脑运行 Codex，手机远程控制，任务完成后微信提醒，并在手机端优先显示中文技能名。

## 这版适合谁升级

- 已经用手机连接电脑 Codex，但技能列表仍显示英文名的人。
- 想把“Codex Web UI + Android + Tailscale + 微信提醒”整理成一套可复现方案的人。
- 想给朋友或另一台电脑部署，但希望 README 和安装入口都指向本仓库的人。

## 本次版本重点

- 手机端中文技能显示：
  - `skills/list` 会读取技能目录下 `agents/openai.yaml`。
  - 优先展示 `display_name` 和 `short_description`。
  - 搜索支持中文显示名、中文简介、原始英文名和原始英文简介。
  - 实际调用仍保留原始 `name/path`，避免破坏 Codex 技能调用。
- 产品化 README：
  - 新增产品海报和脱敏运行图。
  - 整合电脑端、手机端、Tailscale、微信提醒、中文技能和 20 句常用指令。
  - 新手可直接照着部署、测试和排障。
- 公开链接收口：
  - Windows bootstrap、Android 检查更新、CLI 提示、Issue 入口和 Release 文案指向 `LinYiXin123/Codex-WeChat-Task-Reminder`。

## 快速安装

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; irm https://raw.githubusercontent.com/LinYiXin123/Codex-WeChat-Task-Reminder/main/scripts/bootstrap-windows.ps1 | iex
```

## Android / 手机

Android APK 首次启动需要输入你自己的电脑服务地址，例如：

```text
http://100.x.y.z:7420
http://your-pc.tailxxxxx.ts.net:7420
```

推荐电脑和手机都加入同一个 Tailscale 网络，再通过 Tailscale IP 或 MagicDNS 访问。

## 微信提醒

独立提醒包见：

- `tools/codex-wechat-notifier/README.md`

先运行 `bin\test-send.ps1`，确认桌面微信能收到测试消息，再注册常驻和开机自启。

## 隐私说明

Release 说明和截图只使用通用演示数据，不包含私人账号、本地密码、Token、私有 IP、个人目录、真实公网地址或私人会话内容。
