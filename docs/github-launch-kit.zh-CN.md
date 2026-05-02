# GitHub 包装文案包

这份文案包用于统一 README、GitHub About、Release、Topics 和社交传播表达。

## 核心定位

推荐统一使用：

把本机 Codex 变成电脑运行、手机控制、微信提醒、中文技能可读的个人 AI 工作台，重点面向 Windows、Android、Tailscale 和自托管远程访问。

英文版：

Self-hosted Codex mobile workbench with Android access, WeChat task reminders, Chinese skills, and Windows-friendly deployment.

## GitHub About

中文短版：

电脑运行 Codex，手机远程控制，任务完成后微信提醒，技能列表优先显示中文。

英文短版：

Self-hosted Codex mobile workbench with WeChat task reminders and Chinese skill display.

更强调远程访问：

Run Codex locally, control it from your phone, receive WeChat completion reminders, and access it through LAN, Tailscale, VPN, tunnel, or reverse proxy.

## 仓库 Topics

建议至少配置：

- `codex`
- `openai-codex`
- `wechat`
- `wechat-reminder`
- `task-reminder`
- `codex-web`
- `codex-ui`
- `codex-android`
- `browser-ui`
- `remote-access`
- `self-hosted`
- `windows`
- `windows-server`
- `android`
- `mobile-browser`
- `cloudflare-tunnel`
- `tailscale`
- `frp`
- `lan`
- `remote-development`
- `ai-coding-agent`

## README 首屏结构

长期保持这个顺序：

1. 一句话定位
2. 产品海报
3. 核心卖点
4. 运行截图
5. 工作原理
6. 快速安装
7. 手机连接
8. 微信完成提醒
9. 中文技能说明
10. 文档入口

不要把首屏做成内部维护日志，也不要放带真实路径、真实会话或私人公网地址的截图。

## 当前截图资产

- [chat.png](./screenshots/chat.png): 桌面工作台
- [chat-mobile.png](./screenshots/chat-mobile.png): 手机会话
- [android-setup.png](./screenshots/android-setup.png): Android 首次连接
- [github-trending.png](./screenshots/github-trending.png): GitHub 热门项目模块
- [codex-wechat-mobile-workbench-hero.png](./posters/codex-wechat-mobile-workbench-hero.png): README 产品海报

截图必须使用演示数据。

## Release 标题模板

推荐格式：

- `2.1.x: Chinese skills for mobile Codex`
- `2.1.x: Codex mobile workbench with WeChat reminders`
- `2.1.x: Tailscale-ready Codex phone control`
- `2.2.0: stable Codex WeChat mobile workbench`

中文发布说明顺序：

1. 这版用户真正能感知到什么变化
2. 哪类用户最应该升级
3. 怎么安装或升级
4. 如果失败看哪里

模板：

- [release-template.zh-CN.md](./release-template.zh-CN.md)

## 对外介绍模板

中文：

`Codex-WeChat-Task-Reminder` 是一个把本机 Codex 变成手机工作台和微信完成提醒的自托管项目。它重点解决 Windows 部署、Android 手机控制、Tailscale 跨网访问、长任务完成提醒和中文技能展示这些日常问题。项目不试图替代官方 Codex，而是把“电脑跑任务、手机随时看、微信提醒我、技能看中文”这条链路做顺。

English:

`Codex-WeChat-Task-Reminder` is a self-hosted Codex mobile workbench with Android access, WeChat completion reminders, Tailscale-friendly remote access, and Chinese skill display.

## 推广切入点

优先讲这些问题：

1. 如何把本机 Codex 放到手机上继续用
2. Codex 长任务完成后如何用微信提醒自己
3. Windows 怎么稳定跑一个 Codex Web 入口
4. Tailscale 如何让手机跨网访问家里电脑
5. 中文技能包如何让新手更容易理解和选择技能

## 不推荐表达

避免：

- “又一个 Codex 客户端”
- “最强 AI 平台”
- “支持很多很多功能”
- “完全替代官方 Codex”

更稳的表达始终围绕：

- Local Codex
- Codex Web UI
- Android client
- WeChat task reminder
- Chinese Codex skills
- Tailscale access
- Self-hosted remote access
- Windows friendly
- Stable mobile sync
