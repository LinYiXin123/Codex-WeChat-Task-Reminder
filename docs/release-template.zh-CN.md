# Release 文案模板

这份模板用于每次发 GitHub Release 时快速整理“用户真正关心的变化”，避免说明写成内部提交记录。

## 标题模板

版本号使用纯数字语义版本，不使用英文后缀：

- `2.1.x：手机端技能列表支持中文显示`
- `2.1.x：微信完成提醒和手机工作台文档收口`
- `2.1.x：Tailscale 手机跨网控制更容易配置`
- `2.2.0：Codex 微信提醒与手机工作台稳定版`

## 正文模板

~~~md
# Codex-WeChat-Task-Reminder

Self-hosted Codex mobile workbench with WeChat task reminders and Chinese skills.

把本机 Codex 变成电脑运行、手机控制、微信提醒、中文技能可读的个人 AI 工作台。

## 这版适合谁升级

- 想把本机 Codex 放到手机上继续用的人
- 想在任务完成后通过微信收到提醒的人
- 想让手机端技能列表显示中文的人
- 想在 Windows 上稳定跑一个浏览器入口的人

## 本次版本重点

- 写用户能感知到的结果
- 说明具体改善了哪个痛点
- 说明升级后最明显的变化

## 快速安装

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; irm https://raw.githubusercontent.com/LinYiXin123/Codex-WeChat-Task-Reminder/main/scripts/bootstrap-windows.ps1 | iex
```

## Android APK

如果 Release 资产包含 `cx-codex-android-<version>.apk`，可下载后安装。

首次启动需要输入自己的 Codex Web 服务地址；项目默认不内置私人地址。

## 微信提醒

独立提醒包见 `tools/codex-wechat-notifier/README.md`。先确认 `bin\test-send.ps1` 能发出测试消息，再注册常驻和开机自启。

## 相关文档

- README: [README.md](./README.md)
- 更新日志: [docs/changelog.zh-CN.md](./docs/changelog.zh-CN.md)
- 路线图: [docs/roadmap.zh-CN.md](./docs/roadmap.zh-CN.md)
- Android 壳: [docs/android-shell.zh-CN.md](./docs/android-shell.zh-CN.md)
- Cloudflare Tunnel: [docs/cloudflare-tunnel.zh-CN.md](./docs/cloudflare-tunnel.zh-CN.md)
~~~

## 推荐写法

- “Android 首次启动不再内置私人地址，用户输入后本机持久保存。”
- “密钥保存后可用于无感重登，减少 token 失效导致的同步中断。”
- “任务结束后会清理已完成思考态，降低‘已完成但仍思考中’的误导。”
- “长会话默认只加载最新内容，上滑再自动补历史，主内容优先出现。”
- “手机端技能列表优先展示中文名和中文简介，实际调用仍保留原始技能路径。”
- “微信完成提醒包支持放在非系统盘，并提供测试发送、状态查看和卸载脚本。”

## 不推荐写法

避免只写：

- “重构了若干模块”
- “优化了一些细节”
- “修复了部分问题”
- “更新了若干逻辑”
