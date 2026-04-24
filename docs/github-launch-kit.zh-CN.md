# GitHub 包装文案包

这份文案包用于统一仓库对外表达，避免 README、About、Release 和社交传播各说各话。

## 核心定位

推荐统一使用这句话：

把本机 Codex 变成可从手机和浏览器访问的稳定工作台，5 分钟部署，Windows / Windows Server 友好。

英文版：

Turn your local Codex into a stable browser workspace for phone and remote access, with first-class Windows support.

## GitHub About

### 中文短版

把本机 Codex 变成可从手机和浏览器访问的稳定工作台，适合 Windows、Windows Server 和自托管远程访问。

### 英文短版

Stable browser workspace for local Codex, optimized for Windows, phone access, and self-hosted remote use.

### 更强调远程访问的版本

Run Codex locally, use it from your phone or browser, and expose it safely with self-hosted remote access options.

## 仓库 Topics

建议至少配置这些：

- `codex`
- `openai-codex`
- `codex-web`
- `codex-ui`
- `browser-ui`
- `remote-access`
- `self-hosted`
- `windows`
- `windows-server`
- `android`
- `mobile-browser`
- `cloudflare-tunnel`
- `lan`
- `remote-development`
- `ai-coding-agent`

如果想再收窄一点，可以加：

- `termux`
- `tailscale`
- `reverse-proxy`

## Social Preview 建议

建议统一主标题：

`Deploy Codex Web Bridge`

建议副标题：

`Use your local Codex from desktop, phone, and remote browser access.`

建议视觉元素：

- 左侧主文案强调 `One command`
- 中间放 PowerShell 一条命令
- 右侧放桌面和手机浏览器示意
- 右上角保留 `Windows friendly`
- 底部只保留 3 个短卖点：
  - `Phone-ready`
  - `Remote-ready`
  - `Self-hosted`

仓库里现成可用素材：

- [one-command-windows.svg](./one-command-windows.svg)
- [social-preview.svg](./social-preview.svg)
- [chat.png](./screenshots/chat.png)
- [chat-mobile.png](./screenshots/chat-mobile.png)

## README 首屏结构

建议长期保持这个顺序：

1. 一句话定位
2. 视觉图或 GIF
3. 一条命令安装
4. 典型使用场景
5. 为什么值得用
6. 详细文档入口

不要把首屏做成文档目录，不要一上来就塞太多内部维护细节。

## Release 标题模板

推荐格式：

- `v0.2.x: faster phone access and more stable Codex browser bridge`
- `v0.2.x: one-command Windows deploy and better mobile workflow`
- `v0.2.x: smoother threads, better sync recovery, easier remote access`

中文发布说明建议顺序：

1. 这版用户真正能感知到什么变化
2. 哪类用户最应该升级
3. 一条命令怎么装
4. 如果失败看哪里

现成模板：

- [release-template.zh-CN.md](./release-template.zh-CN.md)

## 对外介绍模板

### 中文版

`codexui-server-bridge` 是一个把本机 Codex 暴露到浏览器和手机上的自托管入口，重点解决 Windows / Windows Server 上部署麻烦、手机使用不顺、远程访问门槛高这几个问题。它不试图替代官方 Codex，而是补上“本地 Codex 如何稳定出现在浏览器里”这条链路。

### 英文版

`codexui-server-bridge` is a self-hosted browser bridge for local Codex. It focuses on fast Windows deployment, phone-friendly usage, and simple remote access, instead of trying to replace the official Codex experience.

## 推广切入点

最适合发内容的角度不是“我做了多少功能”，而是这几个问题：

1. 如何把本机 Codex 放到手机上继续用
2. Windows / Windows Server 怎么稳定跑一个 Codex Web 入口
3. 没有公网 IP，怎么先把 Codex 暴露出去给自己访问
4. 为什么这个项目不做复杂 SaaS，而是坚持一条命令和自托管

## 不要这样宣传

这些表达会让项目变得模糊：

- “又一个 Codex 客户端”
- “最强 AI 平台”
- “支持很多很多功能”
- “同时面向所有用户、所有平台、所有场景”

更稳的说法应该始终围绕：

- 本地 Codex
- 浏览器入口
- 手机可用
- Windows 友好
- 自托管远程访问
