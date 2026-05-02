# Codex WeChat Notifier

这是一个可以单独拎出来用的 Windows 常驻小工具。

它会盯着你电脑上的 Codex 任务，等任务一完成，就自动给你指定的微信联系人发一条提醒。

## 你可以拿它来做什么

- Codex 任务完成后，微信自动提醒你
- 电脑开机后自动启动，不用每次手动点
- 支持单独打包发给朋友一起用
- 支持多开微信时固定绑定到某一个微信实例

## 它怎么工作

1. 监听当前 Windows 用户的 `%USERPROFILE%\.codex\sessions`
2. 发现 `task_complete` 后，生成一条中文完成提醒
3. 自动找到你指定的微信窗口
4. 给你指定的联系人发送消息

## 先看懂这几个名字

- `发送给谁`
  也就是微信里要收消息的人，比如 `新.`
- `从哪个微信号发`
  如果你电脑登录了多个微信，就用 `root:0`、`root:1` 这种方式固定绑定
- `开机自启`
  指 Windows 登录后自动启动这个小工具

## 放在哪里最合适

建议直接放在：

```text
D:\CodexWeChatNotifier
```

这样最清楚，也方便打包给别人。

## 文件说明

- `config.json`：配置文件
- `install.ps1`：安装并注册开机自启
- `uninstall.ps1`：卸载并移除开机自启
- `bin\codex-completion-monitor.ps1`：监听 Codex 完成事件
- `bin\desktop-wechat-send.ps1`：给电脑微信发消息
- `bin\start-notifier.ps1`：常驻守护进程
- `bin\stop-notifier.ps1`：停止常驻
- `bin\test-send.ps1`：手动测试发消息
- `bin\status.ps1`：查看当前运行状态

## 配置方法

打开 `config.json`，重点只看这几个：

```json
{
  "desktopWeChatTargetName": "新.",
  "desktopWeChatSourceBinding": "root:0",
  "desktopWeChatSourceIndex": 0,
  "pollIntervalMs": 3000
}
```

说明：

- `desktopWeChatTargetName`
  你要收到提醒的微信联系人名
- `desktopWeChatSourceBinding`
  多开微信时，固定用哪个实例发消息，推荐直接填 `root:0`
- `desktopWeChatSourceIndex`
  备用写法，通常不用改
- `pollIntervalMs`
  轮询间隔，默认 `3000` 毫秒，别乱改太小

`codexHome`、`sessionsRoot`、`sessionIndexPath` 一般都留空就行。

## 一步一步安装

1. 把整个文件夹放到 `D:\CodexWeChatNotifier`
2. 确认电脑微信已经登录
3. 确认 `config.json` 里收消息的人写对了
4. 双击或在 PowerShell 里运行：

```powershell
powershell -ExecutionPolicy Bypass -File D:\CodexWeChatNotifier\install.ps1
```

安装后会自动：

- 注册当前用户开机自启
- 启动常驻守护进程
- 守护进程挂了会自动拉起

## 先做一次测试

运行：

```powershell
powershell -ExecutionPolicy Bypass -File D:\CodexWeChatNotifier\bin\test-send.ps1
```

如果你能在微信里收到消息，就说明已经通了。

## 看运行状态

```powershell
powershell -ExecutionPolicy Bypass -File D:\CodexWeChatNotifier\bin\status.ps1
```

## 卸载

```powershell
powershell -ExecutionPolicy Bypass -File D:\CodexWeChatNotifier\uninstall.ps1
```

## 多开微信怎么选

如果你电脑里登录了两个微信号，就用这个来固定：

- `root:0`
- `root:1`

建议先保持只开一个微信测试一次，确认成功后再处理多开。

## 常见问题

### 没有收到消息

先看：

1. 微信有没有登录
2. `config.json` 里的联系人名有没有写错
3. `bin\test-send.ps1` 能不能单独发出去
4. `logs\desktop-wechat-send.log` 有没有报错

### 重启后不工作

先确认：

1. `install.ps1` 有没有跑过
2. 当前登录的是同一个 Windows 用户
3. 微信是不是已经自动登录
4. `bin\status.ps1` 里有没有看到常驻进程

### 我想给朋友用

直接把整个 `D:\CodexWeChatNotifier` 文件夹打包发给朋友就行。

朋友拿到后只要：

1. 解压到本地
2. 改 `config.json`
3. 跑 `install.ps1`
4. 跑 `test-send.ps1`

## 日志文件

- `logs\completion-monitor.log`
- `logs\desktop-wechat-send.log`
- `logs\notifier-supervisor.log`

如果出问题，优先看 `desktop-wechat-send.log`。
