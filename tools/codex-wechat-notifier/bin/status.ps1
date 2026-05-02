[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$packageRoot = Split-Path -Parent $scriptDir
$configPath = Join-Path $packageRoot 'config.json'
$monitorScript = Join-Path $scriptDir 'codex-completion-monitor.ps1'
$supervisorScript = Join-Path $scriptDir 'start-notifier.ps1'
$logDir = Join-Path $packageRoot 'logs'

function Get-MatchingProcesses {
  param([string]$Needle)

  $pattern = [regex]::Escape($Needle)
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -match '^(pwsh|powershell)\.exe$' -and
      $_.CommandLine -match $pattern
    } |
    Select-Object ProcessId, Name, CreationDate, CommandLine
}

$runName = 'CodexWeChatNotifier'
try {
  $config = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($config.autostartEntryName) {
    $runName = [string]$config.autostartEntryName
  }
} catch {}

Write-Host "PackageRoot: $packageRoot"
Write-Host "ConfigPath:   $configPath"
Write-Host ''
Write-Host "Run Key:"
try {
  Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' |
    Select-Object $runName |
    Format-List
} catch {
  Write-Host '  (not found)'
}

Write-Host ''
Write-Host 'Supervisor Processes:'
$supervisors = @(Get-MatchingProcesses -Needle $supervisorScript)
if ($supervisors.Count -eq 0) {
  Write-Host '  (none)'
} else {
  $supervisors | Format-List
}

Write-Host ''
Write-Host 'Monitor Processes:'
$monitors = @(Get-MatchingProcesses -Needle $monitorScript)
if ($monitors.Count -eq 0) {
  Write-Host '  (none)'
} else {
  $monitors | Format-List
}

Write-Host ''
Write-Host 'Recent Logs:'
Get-ChildItem -Path $logDir -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 5 Name, LastWriteTime, Length |
  Format-Table -AutoSize
