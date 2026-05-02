[CmdletBinding()]
param(
  [string]$Message = ''
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$packageRoot = Split-Path -Parent $scriptDir
$configPath = Join-Path $packageRoot 'config.json'
$sendScript = Join-Path $scriptDir 'desktop-wechat-send.ps1'

$targetName = '文件传输助手'
$sourceBinding = ''
$sourceIndex = 0

if (Test-Path -LiteralPath $configPath) {
  try {
    $config = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($config.desktopWeChatTargetName) { $targetName = [string]$config.desktopWeChatTargetName }
    if ($config.desktopWeChatSourceBinding) { $sourceBinding = [string]$config.desktopWeChatSourceBinding }
    if ($null -ne $config.desktopWeChatSourceIndex -and [string]$config.desktopWeChatSourceIndex -ne '') {
      try { $sourceIndex = [int]$config.desktopWeChatSourceIndex } catch {}
    }
  } catch {}
}

if (-not $Message) {
  $Message = 'Codex WeChat Notifier 测试 ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
}

& powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $sendScript `
  -Message $Message `
  -TargetName $targetName `
  -SourceBinding $sourceBinding `
  -SourceIndex $sourceIndex
