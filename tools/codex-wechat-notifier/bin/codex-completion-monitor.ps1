[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$packageRoot = Split-Path -Parent $scriptDir
$configPath = Join-Path $packageRoot 'config.json'
$dataDir = Join-Path $packageRoot 'data'
$logDir = Join-Path $packageRoot 'logs'
$statePath = Join-Path $dataDir 'completion-monitor.state.json'
$logPath = Join-Path $logDir 'completion-monitor.log'
$desktopWeChatSendScript = Join-Path $scriptDir 'desktop-wechat-send.ps1'

$codexHome = ''
$sessionsRoot = ''
$sessionIndexPath = ''
$desktopWeChatTargetName = '文件传输助手'
$desktopWeChatSourceBinding = ''
$desktopWeChatSourceIndex = 0
$pollIntervalMs = 3000

function Write-MonitorLog {
  param([string]$MessageText)
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  Add-Content -LiteralPath $logPath -Value ((Get-Date -Format o) + ' ' + $MessageText) -Encoding UTF8
}

function Resolve-ConfiguredPath {
  param(
    [string]$Value,
    [string]$Fallback
  )

  $trimmed = $Value.Trim()
  if (-not $trimmed) { return $Fallback }
  if ([System.IO.Path]::IsPathRooted($trimmed)) { return $trimmed }
  return Join-Path $packageRoot $trimmed
}

function Load-NotifierConfig {
  $defaultCodexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
  $script:codexHome = $defaultCodexHome
  $script:sessionsRoot = Join-Path $script:codexHome 'sessions'
  $script:sessionIndexPath = Join-Path $script:codexHome 'session_index.jsonl'
  $script:desktopWeChatTargetName = '文件传输助手'
  $script:desktopWeChatSourceBinding = ''
  $script:desktopWeChatSourceIndex = 0
  $script:pollIntervalMs = 3000

  if (-not (Test-Path -LiteralPath $configPath)) { return }

  try {
    $config = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json

    if ($config.codexHome) {
      $script:codexHome = Resolve-ConfiguredPath -Value ([string]$config.codexHome) -Fallback $script:codexHome
    }

    $script:sessionsRoot = Resolve-ConfiguredPath -Value ([string]$config.sessionsRoot) -Fallback (Join-Path $script:codexHome 'sessions')
    $script:sessionIndexPath = Resolve-ConfiguredPath -Value ([string]$config.sessionIndexPath) -Fallback (Join-Path $script:codexHome 'session_index.jsonl')

    if ($config.desktopWeChatTargetName) {
      $script:desktopWeChatTargetName = [string]$config.desktopWeChatTargetName
    }
    if ($config.desktopWeChatSourceBinding) {
      $script:desktopWeChatSourceBinding = [string]$config.desktopWeChatSourceBinding
    }
    if ($null -ne $config.desktopWeChatSourceIndex -and [string]$config.desktopWeChatSourceIndex -ne '') {
      try { $script:desktopWeChatSourceIndex = [int]$config.desktopWeChatSourceIndex } catch {}
    }
    if ($null -ne $config.pollIntervalMs -and [string]$config.pollIntervalMs -ne '') {
      try {
        $parsedPoll = [int]$config.pollIntervalMs
        if ($parsedPoll -ge 1000) {
          $script:pollIntervalMs = $parsedPoll
        }
      } catch {}
    }
  } catch {
    Write-MonitorLog ('load config failed: ' + $_.Exception.Message)
  }
}

function Read-State {
  if (-not (Test-Path -LiteralPath $statePath)) {
    return [pscustomobject]@{
      initializedAtIso = ''
      fileOffsets = @{}
      notifiedTurnIds = @()
    }
  }
  try {
    return Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
  } catch {
    return [pscustomobject]@{
      initializedAtIso = ''
      fileOffsets = @{}
      notifiedTurnIds = @()
    }
  }
}

function Write-State {
  param([object]$State)
  New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
  $State | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $statePath -Encoding UTF8
}

function Get-ThreadTitles {
  $map = @{}
  if (-not (Test-Path -LiteralPath $sessionIndexPath)) { return $map }
  try {
    Get-Content -LiteralPath $sessionIndexPath -Encoding UTF8 | ForEach-Object {
      if (-not $_) { return }
      try {
        $row = $_ | ConvertFrom-Json
        if ($row.id -and $row.thread_name) {
          $map[[string]$row.id] = [string]$row.thread_name
        }
      } catch {}
    }
  } catch {}
  return $map
}

function Build-CompletionMessage {
  param(
    [string]$ThreadId,
    [string]$ThreadTitle,
    [string]$LastMessage,
    [string]$CompletedAt
  )

  $title = $ThreadTitle.Trim()
  $summary = ($LastMessage -replace '\s+', ' ').Trim()
  if ($summary.Length -gt 72) {
    $summary = $summary.Substring(0, 72).TrimEnd() + '...'
  }

  $lines = @('CX Codex 当前任务已完成')
  if ($title) { $lines += ('任务：' + $title) }
  if ($summary) { $lines += ('摘要：' + $summary) }
  if ($CompletedAt) { $lines += ('完成时间：' + $CompletedAt) }
  $lines += '可直接回到 Codex 查看结果。'
  if (-not $title) { $lines += ('线程：' + $ThreadId) }
  return ($lines -join "`n")
}

function Send-DesktopWeChatMessage {
  param([string]$MessageText)
  try {
    & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $desktopWeChatSendScript `
      -Message $MessageText `
      -TargetName $desktopWeChatTargetName `
      -SourceIndex $desktopWeChatSourceIndex `
      -SourceBinding $desktopWeChatSourceBinding
    return $LASTEXITCODE -eq 0
  } catch {
    Write-MonitorLog ('desktop send failed: ' + $_.Exception.Message)
    return $false
  }
}

function Get-ThreadIdFromRolloutPath {
  param([string]$Path)
  $name = [System.IO.Path]::GetFileNameWithoutExtension($Path)
  if ($name -match 'rollout-.+-(?<tid>[0-9a-f]{8,})$') {
    return $matches['tid']
  }
  return ''
}

function Initialize-StateBaseline {
  param([object]$State)

  $State.initializedAtIso = (Get-Date).ToUniversalTime().ToString('o')
  $State.fileOffsets = @{}

  $existingFiles = Get-ChildItem -LiteralPath $sessionsRoot -Recurse -Filter 'rollout-*.jsonl' -File -ErrorAction SilentlyContinue
  foreach ($existingFile in $existingFiles) {
    $State.fileOffsets | Add-Member -NotePropertyName $existingFile.FullName -NotePropertyValue ([int64]$existingFile.Length) -Force
  }

  Write-MonitorLog ('initialized baseline at ' + $State.initializedAtIso + ' existingFiles=' + $existingFiles.Count)
  return $State
}

Write-MonitorLog 'completion monitor starting'
Load-NotifierConfig
Write-MonitorLog ('desktop config target=' + $desktopWeChatTargetName + ' binding=' + $desktopWeChatSourceBinding + ' sourceIndex=' + $desktopWeChatSourceIndex)
$state = Read-State
if (-not $state.initializedAtIso) {
  $state = Initialize-StateBaseline -State $state
  Write-State -State $state
}

$notified = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($id in @($state.notifiedTurnIds)) {
  if ($id) { [void]$notified.Add([string]$id) }
}

while ($true) {
  try {
    $threadTitles = Get-ThreadTitles
    $files = Get-ChildItem -LiteralPath $sessionsRoot -Recurse -Filter 'rollout-*.jsonl' -File -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime

    foreach ($file in $files) {
      $path = $file.FullName
      $offset = 0
      if ($state.fileOffsets.PSObject.Properties.Name -contains $path) {
        try { $offset = [int64]$state.fileOffsets.$path } catch { $offset = 0 }
      }

      $currentLength = [int64]$file.Length
      if ($offset -gt $currentLength) { $offset = 0 }
      if ($offset -eq $currentLength) { continue }

      $fs = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
      try {
        $fs.Seek($offset, [System.IO.SeekOrigin]::Begin) | Out-Null
        $reader = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8)
        while (-not $reader.EndOfStream) {
          $line = $reader.ReadLine()
          if (-not $line) { continue }
          try {
            $row = $line | ConvertFrom-Json
          } catch {
            continue
          }
          if ($row.type -ne 'event_msg') { continue }
          $payload = $row.payload
          if (-not $payload -or $payload.type -ne 'task_complete') { continue }

          $turnId = [string]$payload.turn_id
          if (-not $turnId -or $notified.Contains($turnId)) { continue }

          $completedAtUnix = 0
          $completedAt = ''
          try {
            $completedAtUnix = [int64]$payload.completed_at
            $completedAt = [DateTimeOffset]::FromUnixTimeSeconds($completedAtUnix).ToLocalTime().ToString('yyyy/M/d HH:mm:ss')
          } catch {}

          if ($completedAtUnix -gt 0) {
            $initializedAtUnix = [DateTimeOffset]::Parse($state.initializedAtIso).ToUnixTimeSeconds()
            if ($completedAtUnix -lt $initializedAtUnix) {
              [void]$notified.Add($turnId)
              continue
            }
          }

          $threadId = Get-ThreadIdFromRolloutPath -Path $path
          $title = ''
          if ($threadId -and $threadTitles.ContainsKey($threadId)) {
            $title = [string]$threadTitles[$threadId]
          }

          $messageText = Build-CompletionMessage -ThreadId $threadId -ThreadTitle $title -LastMessage ([string]$payload.last_agent_message) -CompletedAt $completedAt
          $sent = Send-DesktopWeChatMessage -MessageText $messageText
          if ($sent) {
            [void]$notified.Add($turnId)
            Write-MonitorLog ('task_complete notified turn=' + $turnId + ' thread=' + $threadId)
          } else {
            Write-MonitorLog ('task_complete send failed turn=' + $turnId + ' thread=' + $threadId)
          }
        }
        $offset = $fs.Position
      } finally {
        $fs.Close()
      }

      $state.fileOffsets | Add-Member -NotePropertyName $path -NotePropertyValue $offset -Force
    }

    $state.notifiedTurnIds = @($notified)
    if ($state.notifiedTurnIds.Count -gt 300) {
      $state.notifiedTurnIds = @($state.notifiedTurnIds | Select-Object -Last 300)
    }
    Write-State -State $state
  } catch {
    Write-MonitorLog ('poll failed: ' + $_.Exception.Message)
  }

  Start-Sleep -Milliseconds $pollIntervalMs
}
