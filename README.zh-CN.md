# codexui-server-bridge

OpenAI Codex 的浏览器 UI 和桥接服务，适合 Windows、Windows Server、Linux、Android、Termux 和局域网 / 远程访问场景。

英文说明见 [README.md](./README.md)。

- 英文部署提示词: [docs/deploy-with-codex.en.md](./docs/deploy-with-codex.en.md)
- 中文部署提示词: [docs/deploy-with-codex.zh-CN.md](./docs/deploy-with-codex.zh-CN.md)

## 最简单部署方式

如果目标机器上的 Codex 已经有终端权限，最简单的方式不是手动装，而是：

1. 让 Codex 访问这个仓库地址：

```text
https://github.com/Qjzn/codexui-server-bridge
```

2. 直接贴这段提示词：

```text
打开并检查 https://github.com/Qjzn/codexui-server-bridge 这个仓库。
请在这台机器上用最简单、最稳的方式部署这个项目。

要求：
- 创建一个稳定的 Codex Web UI 服务，端口固定为 7420
- 尽量优先使用仓库里自带的 bootstrap 或 setup 脚本
- 如果这台机器已经登录过 Codex，就尽量复用现有登录态
- 尽量开启本机浏览器访问和局域网访问
- 如果机器允许，配置开机或登录后自动启动
- 完成后输出：本机访问地址、局域网访问地址、密码、重启命令

直接执行部署，不要只给步骤说明。
```

## 这个项目解决什么问题

这个仓库把本地 `Codex app-server` 暴露成一个可自托管的 Web UI。

适合这些场景：

- 想在浏览器里使用 Codex，而不是只在官方桌面端里用
- 想在 Windows 或 Windows Server 上固定跑一个 `7420` 入口
- 想用手机浏览器访问同一台机器上的 Codex
- 想通过局域网、Tailscale、反向代理或远程环境访问 Codex
- 想要一个现成的 OpenAI Codex web UI，而不是自己重写 bridge

## 这个 fork 的重点

相比上游，这个 fork 更偏“可部署”和“可长期运行”：

- 一条命令安装 Windows / Windows Server
- 配置文件驱动启动
- 健康检查接口
- 更适合手机浏览器访问
- 支持本地文件浏览 / 编辑
- 适合和官方 Windows Codex App 配合使用

## 一条命令安装 Windows

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; irm https://raw.githubusercontent.com/Qjzn/codexui-server-bridge/main/scripts/bootstrap-windows.ps1 | iex
```

执行后会自动完成这些事：

- 安装可用的 Node.js
- 下载仓库到本地
- 创建默认工作目录
- 构建前端和 CLI
- 生成启动脚本
- 尝试放通 `7420`
- 立即启动 Web 服务

安装完成后，直接在浏览器或手机里打开输出的本机地址 / 局域网地址即可。

## 常见关键词

如果你在找下面这些内容，这个项目就是对应方案：

- OpenAI Codex web UI
- Codex 浏览器版
- Codex Windows Server 部署
- Codex 安卓浏览器访问
- Codex Termux Web UI
- 自托管 Codex bridge
- Codex 局域网访问
- Codex 远程访问

## 推荐使用场景

- Windows 电脑本机跑 Codex，手机浏览器访问
- Windows Server 常驻运行 `7420`
- Linux 开发机通过浏览器访问 Codex
- Tailscale / 内网 / 反代后对外访问

## 相关文档

- 英文主文档: [README.md](./README.md)
- Windows Server 安装: [docs/windows-server.md](./docs/windows-server.md)
- 发版说明: [RELEASE.md](./RELEASE.md)
