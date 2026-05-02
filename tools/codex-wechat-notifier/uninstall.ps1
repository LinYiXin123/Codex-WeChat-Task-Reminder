[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $packageRoot 'config.json'
$stopScript = Join-Path $packageRoot 'bin\stop-notifier.ps1'

$runName = 'CodexWeChatNotifier'
if (Test-Path -LiteralPath $configPath) {
  try {
    $config = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($config.autostartEntryName) {
      $runName = [string]$config.autostartEntryName
    }
  } catch {}
}

try {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $stopScript | Out-Null
} catch {}

try {
  Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name $runName -ErrorAction Stop
} catch {}

Write-Host "Uninstalled Codex WeChat Notifier."
Write-Host "Run entry removed: $runName"
