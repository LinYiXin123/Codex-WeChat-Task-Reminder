[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$packageRoot = Split-Path -Parent $scriptDir
$dataDir = Join-Path $packageRoot 'data'
$logDir = Join-Path $packageRoot 'logs'
$stopFlagPath = Join-Path $dataDir 'notifier.stop'
$supervisorLogPath = Join-Path $logDir 'notifier-supervisor.log'
$monitorScript = Join-Path $scriptDir 'codex-completion-monitor.ps1'
$supervisorScriptPath = $MyInvocation.MyCommand.Path

function Write-SupervisorLog {
  param([string]$MessageText)
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  Add-Content -LiteralPath $supervisorLogPath -Value ((Get-Date -Format o) + ' ' + $MessageText) -Encoding UTF8
}

function Get-ShellPath {
  $pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
  if ($pwsh -and $pwsh.Source) { return $pwsh.Source }
  return (Get-Command powershell.exe -ErrorAction Stop).Source
}

function Get-MonitorProcessIds {
  $pattern = [regex]::Escape($monitorScript)
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -match '^(pwsh|powershell)\.exe$' -and
      $_.CommandLine -match $pattern
    } |
    Select-Object -ExpandProperty ProcessId
}

function Get-SupervisorProcessIds {
  $pattern = [regex]::Escape($supervisorScriptPath)
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.ProcessId -ne $PID -and
      $_.Name -ieq 'powershell.exe' -and
      $_.CommandLine -match $pattern
    } |
    Select-Object -ExpandProperty ProcessId
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$otherSupervisors = @(Get-SupervisorProcessIds)
if ($otherSupervisors.Count -gt 0) {
  Write-SupervisorLog ('supervisor already running pids=' + ($otherSupervisors -join ','))
  exit 0
}

if (Test-Path -LiteralPath $stopFlagPath) {
  Remove-Item -LiteralPath $stopFlagPath -Force -ErrorAction SilentlyContinue
}

$managedIds = @(Get-MonitorProcessIds)
foreach ($managedId in $managedIds) {
  try {
    Stop-Process -Id $managedId -Force -ErrorAction Stop
  } catch {}
}

$shellPath = Get-ShellPath
Write-SupervisorLog ('supervisor starting shell=' + $shellPath)

while ($true) {
  if (Test-Path -LiteralPath $stopFlagPath) {
    Write-SupervisorLog 'stop flag found before launch; supervisor exiting'
    break
  }

  $process = Start-Process `
    -FilePath $shellPath `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $monitorScript) `
    -WindowStyle Hidden `
    -PassThru

  Write-SupervisorLog ('monitor started pid=' + $process.Id)

  while (-not $process.HasExited) {
    Start-Sleep -Seconds 2
    if (Test-Path -LiteralPath $stopFlagPath) {
      Write-SupervisorLog ('stop flag detected; stopping pid=' + $process.Id)
      try {
        Stop-Process -Id $process.Id -Force -ErrorAction Stop
      } catch {}
      break
    }
    $process.Refresh()
  }

  try {
    $process.WaitForExit()
  } catch {}

  $exitCode = if ($process.HasExited) { $process.ExitCode } else { -1 }
  Write-SupervisorLog ('monitor exited code=' + $exitCode)

  if (Test-Path -LiteralPath $stopFlagPath) {
    Remove-Item -LiteralPath $stopFlagPath -Force -ErrorAction SilentlyContinue
    Write-SupervisorLog 'stop flag honored; supervisor exiting'
    break
  }

  Start-Sleep -Seconds 5
}

Write-SupervisorLog 'supervisor stopped'
