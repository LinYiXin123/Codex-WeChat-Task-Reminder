# codexui-server-bridge

OpenAI Codex 浏览器 UI 与桥接服务，适合 Windows、Linux、Android、Termux 与 Windows Server。

## v0.2.0-bridge.2

本次版本重点优化 Web 端真实使用体验，尤其是手机端与长会话场景：

- 发送消息后立即在会话框回显，真实消息同步后自动去重
- “思考中 / 执行命令”状态卡移动到会话底部，不再冻结占用顶部阅读区域
- 页面离开、断网恢复、重新进入时自动补同步，减少必须手动刷新的情况
- 支持展示 Codex 回复中的图片内容，并优化本地图片 / 本地文件浏览链路
- 默认 UI 密度调整为接近浏览器 `90%` 缩放效果，整体更紧凑
- 优化技能弹窗、输入区弹层、会话切换、长会话滚动与侧栏交互稳定性

## 快速链接

- 中文主文档: [README.md](./README.md)
- 中文更新日志: [docs/changelog.zh-CN.md](./docs/changelog.zh-CN.md)
- 中文发版说明: [RELEASE.md](./RELEASE.md)
- 中文部署提示词: [docs/deploy-with-codex.zh-CN.md](./docs/deploy-with-codex.zh-CN.md)
- English deploy prompt: [docs/deploy-with-codex.en.md](./docs/deploy-with-codex.en.md)

## 隐私说明

本次 Release 说明默认只保留通用示例，不包含：

- 私人账号
- 本地密码
- 私有 IP
- 个人目录
- 机器专属路径
