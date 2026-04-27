# codexui-server-bridge 2.1.15

Self-hosted OpenAI Codex Web UI and Android client bridge.

把本机 Codex 变成可从浏览器、手机和远程入口访问的稳定工作台，适合 Windows、Android、局域网和自托管远程访问。

## 这版适合谁升级

- Android App 首次启动、输入连接地址或切后台恢复时不稳定的人。
- 遇到任务已经完成但页面仍显示“思考中”的人。
- 希望默认配置不包含任何本机地址、公网地址或私人密钥的人。
- 想通过 GitHub Release 获取最新版 Web 包和 Android APK 的人。

## 本次版本重点

- Android 启动更稳：
  - 未配置连接地址时先完成原生 Activity 初始化，再显示原生连接页。
  - APK 默认不内置私人服务地址，首次输入后保存在设备本地。
  - 已保存密钥可用于认证失效后的无感重登。
- 同步状态更可靠：
  - 前台恢复会重新校准线程状态、最新消息、执行队列和思考态。
  - 已完成任务不应继续显示停止按钮或“思考中”卡片。
  - 长会话默认优先显示最新内容，上滑再补历史。
- 公开文档更适合传播：
  - README 改为产品化介绍，突出 Codex Web UI、Android、self-hosted、Windows 和 remote access。
  - 旧截图已替换为脱敏浏览器截图。
  - Release、GitHub 包装文案和版本命名统一到 `2.1.x`。

## 快速安装

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; irm https://raw.githubusercontent.com/Qjzn/codexui-server-bridge/main/scripts/bootstrap-windows.ps1 | iex
```

## Android APK

如果本 Release 资产包含 `cx-codex-android-2.1.15.apk`，可下载后安装。

首次启动需要输入你自己的 Codex Web 服务地址；项目默认不内置任何私人地址。密钥登录成功后会保存在设备本地，用于后续无感重登。

## 文档入口

- README: [README.md](./README.md)
- 更新日志: [docs/changelog.zh-CN.md](./docs/changelog.zh-CN.md)
- Android 壳: [docs/android-shell.zh-CN.md](./docs/android-shell.zh-CN.md)
- 路线图: [docs/roadmap.zh-CN.md](./docs/roadmap.zh-CN.md)
- Cloudflare Tunnel: [docs/cloudflare-tunnel.zh-CN.md](./docs/cloudflare-tunnel.zh-CN.md)

## 隐私说明

Release 说明和截图只使用通用演示数据，不包含私人账号、本地密码、Token、私有 IP、个人目录、真实公网地址或私人会话内容。
