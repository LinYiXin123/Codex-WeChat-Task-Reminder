# Release 文案模板

这份模板用于每次发 GitHub Release 时快速整理“用户真正关心的变化”，避免说明写成内部提交记录。

## 标题模板

推荐按“用户收益”命名，不要只写版本号：

- `v0.2.x：手机访问更顺、Windows 部署更省事`
- `v0.2.x：同步恢复更稳，远程入口更容易`
- `v0.2.x：长会话更流畅，移动端体验继续收口`

## 正文模板

~~~md
# codexui-server-bridge

把本机 Codex 变成可从手机和浏览器访问的稳定工作台，适合 Windows、Windows Server 和自托管远程访问。

## 这版适合谁升级

- 想把本机 Codex 放到手机上继续用的人
- 想在 Windows / Windows Server 上稳定跑一个浏览器入口的人
- 想继续减少同步延迟、会话卡顿和移动端操作负担的人

## 本次版本重点

- 重点 1：写用户看得懂的结果，不要写底层实现细节
- 重点 2：说明具体改善了哪个痛点
- 重点 3：说明升级后最明显的感知变化

## 建议从这些角度写

- 更快上手
- 更稳使用
- 更顺手
- 更适合手机
- 更容易远程访问

## 快速安装

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; irm https://raw.githubusercontent.com/Qjzn/codexui-server-bridge/main/scripts/bootstrap-windows.ps1 | iex
```

## 相关文档

- README: [README.md](./README.md)
- 更新日志: [docs/changelog.zh-CN.md](./docs/changelog.zh-CN.md)
- 路线图: [docs/roadmap.zh-CN.md](./docs/roadmap.zh-CN.md)
- Cloudflare Tunnel: [docs/cloudflare-tunnel.zh-CN.md](./docs/cloudflare-tunnel.zh-CN.md)
~~~

## 不推荐的写法

避免只写这些：

- “重构了若干模块”
- “优化了一些细节”
- “修复了部分问题”
- “更新了若干逻辑”

这些话没有传播价值，也没有升级理由。

## 推荐的写法

尽量改写成：

- “手机端技能选择不再容易被输入法遮挡”
- “长会话只加载最近 20 条消息，上滑继续自动补更多”
- “Cloudflare Tunnel 状态现在可直接在设置面板查看”
- “MCP 权限请求改成专用确认卡片，不再显示成误导输入框”
