[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$packageRoot = Split-Path -Parent $scriptDir
$dataDir = Join-Path $packageRoot 'data'
$stopFlagPath = Join-Path $dataDir 'notifier.stop'
$monitorScript = Join-Path $scriptDir 'codex-completion-monitor.ps1'
$supervisorScript = Join-Path $scriptDir 'start-notifier.ps1'

function Get-MatchingProcessIds {
  param([string]$Needle)

  $pattern = [regex]::Escape($Needle)
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -match '^(pwsh|powershell)\.exe$' -and
      $_.CommandLine -match $pattern
    } |
    Select-Object -ExpandProperty ProcessId
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
New-Item -ItemType File -Path $stopFlagPath -Force | Out-Null

$monitorIds = @(Get-MatchingProcessIds -Needle $monitorScript)
$supervisorIds = @(Get-MatchingProcessIds -Needle $supervisorScript) | Where-Object { $_ -ne $PID }
$allIds = @($monitorIds + $supervisorIds | Select-Object -Unique)

foreach ($procId in $allIds) {
  try {
    Stop-Process -Id $procId -Force -ErrorAction Stop
  } catch {}
}

Write-Host ('Stopped notifier process IDs: ' + (($allIds | ForEach-Object { $_ }) -join ', '))
