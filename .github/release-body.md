# codexui-server-bridge

把本机 Codex 变成可从手机和浏览器访问的稳定工作台，适合 Windows、Windows Server 和自托管远程访问。

## 这版适合谁升级

- 想把本机 Codex 放到手机上继续用的人
- 想在 Windows / Windows Server 上稳定跑一个浏览器入口的人
- 想用 Cloudflare Tunnel 或其他自托管方式做远程访问的人

## 本次版本重点

发布前请把这里替换成当前版本最值得说的 3 到 5 条“用户可感知变化”，建议优先从 `docs/changelog.zh-CN.md` 的最新内容整理：

- 更快上手：一条命令部署、启动输出更清晰、配置路径更明确
- 更稳使用：同步恢复、线程状态、消息回显、会话切换继续收口
- 更顺手：手机端输入区、技能选择、长会话滚动和图片查看继续优化
- 更易远程：Cloudflare Tunnel、自托管反代和状态诊断继续完善

## 快速安装

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; irm https://raw.githubusercontent.com/Qjzn/codexui-server-bridge/main/scripts/bootstrap-windows.ps1 | iex
```

如果你没有公网 IP，又想先从外网访问：

```powershell
& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/Qjzn/codexui-server-bridge/main/scripts/bootstrap-windows.ps1'))) -EnableCloudflareTunnel
```

## 文档入口

- 中文主文档: [README.md](./README.md)
- 更新日志: [docs/changelog.zh-CN.md](./docs/changelog.zh-CN.md)
- 路线图: [docs/roadmap.zh-CN.md](./docs/roadmap.zh-CN.md)
- Cloudflare Tunnel: [docs/cloudflare-tunnel.zh-CN.md](./docs/cloudflare-tunnel.zh-CN.md)
- GitHub 包装文案包: [docs/github-launch-kit.zh-CN.md](./docs/github-launch-kit.zh-CN.md)

## 隐私说明

Release 说明和资产默认只保留通用示例，不包含：

- 私人账号
- 本地密码
- 私有 IP
- 个人目录
- 机器专属路径
