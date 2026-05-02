[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $packageRoot 'config.json'
$binDir = Join-Path $packageRoot 'bin'
$dataDir = Join-Path $packageRoot 'data'
$logDir = Join-Path $packageRoot 'logs'
$autostartVbs = Join-Path $binDir 'notifier-autostart.vbs'
$startScript = Join-Path $binDir 'start-notifier.ps1'
$stopScript = Join-Path $binDir 'stop-notifier.ps1'
$legacyMonitorScript = 'F:\HermesData\CodexUI\bin\codex-completion-monitor.ps1'

if (-not (Test-Path -LiteralPath $configPath)) {
  throw "Config not found: $configPath"
}
if (-not (Test-Path -LiteralPath $autostartVbs)) {
  throw "Autostart VBS not found: $autostartVbs"
}
if (-not (Test-Path -LiteralPath $startScript)) {
  throw "Start script not found: $startScript"
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$runName = 'CodexWeChatNotifier'
try {
  $config = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($config.autostartEntryName) {
    $runName = [string]$config.autostartEntryName
  }
} catch {}

Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name $runName -Value ('wscript.exe "' + $autostartVbs + '"')

if ($runName -ne 'CodexCompletionMonitor') {
  try {
    Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'CodexCompletionMonitor' -ErrorAction Stop
  } catch {}
}

try {
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -match '^(pwsh|powershell)\.exe$' -and
      $_.CommandLine -like "*$legacyMonitorScript*"
    } |
    ForEach-Object {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
} catch {}

try {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $stopScript | Out-Null
} catch {}

Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $startScript) -WindowStyle Hidden

Write-Host "Installed Codex WeChat Notifier."
Write-Host "Autostart entry: $runName"
Write-Host "Package root: $packageRoot"
