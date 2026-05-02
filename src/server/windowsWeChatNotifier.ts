import { spawn } from 'node:child_process'
import { writeCompletionNotifierLog } from './completionNotifierLog.js'

const WINDOWS_PLATFORM = 'win32'
const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on'])
const WECHAT_PATH_CANDIDATES = [
  'D:\\Wechat\\Weixin\\Weixin.exe',
  'C:\\Program Files\\Tencent\\WeChat\\WeChat.exe',
  'C:\\Program Files (x86)\\Tencent\\WeChat\\WeChat.exe',
]

let queue = Promise.resolve()

function encodePowerShell(script: string): string {
  return Buffer.from(script, 'utf16le').toString('base64')
}

function isEnabled(): boolean {
  const raw = process.env.CODEXUI_DESKTOP_WECHAT_NOTIFY_ON_COMPLETION?.trim().toLowerCase() ?? ''
  return process.platform === WINDOWS_PLATFORM && ENABLED_VALUES.has(raw)
}

function buildPowerShellScript(): string {
  const candidates = WECHAT_PATH_CANDIDATES.map((value) => `'${value.replace(/'/g, "''")}'`).join(",\n    ")
  return `
param(
  [string]$MessageBase64
)

$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class CodexUiUser32 {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int maxCount);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int maxCount);

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@

function Decode-Message {
  param([string]$Value)
  return [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($Value))
}

function Get-WeChatProcesses {
  return @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -in @('Weixin.exe', 'WeChat.exe') })
}

function Get-WeChatRootProcesses {
  $processes = @(Get-WeChatProcesses)
  if ($processes.Count -eq 0) { return @() }

  $processIdSet = @{}
  foreach ($process in $processes) {
    $processIdSet[[int]$process.ProcessId] = $true
  }

  return @(
    $processes |
      Where-Object { -not $processIdSet.ContainsKey([int]$_.ParentProcessId) } |
      Sort-Object CreationDate, ProcessId
  )
}

function Get-WeChatProcessGroupIds {
  param(
    [object[]]$AllProcesses,
    [int]$RootProcessId
  )

  $childrenByParent = @{}
  foreach ($process in $AllProcesses) {
    $parentId = [int]$process.ParentProcessId
    if (-not $childrenByParent.ContainsKey($parentId)) {
      $childrenByParent[$parentId] = New-Object System.Collections.Generic.List[int]
    }
    $childrenByParent[$parentId].Add([int]$process.ProcessId)
  }

  $seen = @{}
  $queue = New-Object System.Collections.Generic.Queue[int]
  $orderedIds = New-Object System.Collections.Generic.List[int]
  $queue.Enqueue($RootProcessId)

  while ($queue.Count -gt 0) {
    $currentId = $queue.Dequeue()
    if ($seen.ContainsKey($currentId)) { continue }

    $seen[$currentId] = $true
    $orderedIds.Add($currentId) | Out-Null

    if (-not $childrenByParent.ContainsKey($currentId)) { continue }
    foreach ($childId in $childrenByParent[$currentId]) {
      if (-not $seen.ContainsKey($childId)) {
        $queue.Enqueue($childId)
      }
    }
  }

  return $orderedIds.ToArray()
}

function Get-TopLevelWindowsForProcesses {
  param([int[]]$ProcessIds)

  $processIdSet = @{}
  foreach ($processId in $ProcessIds) {
    $processIdSet[[int]$processId] = $true
  }

  $windows = New-Object System.Collections.Generic.List[object]
  $callback = [CodexUiUser32+EnumWindowsProc]{
    param([IntPtr]$WindowHandle, [IntPtr]$LParam)

    $windowProcessId = [uint32]0
    [void][CodexUiUser32]::GetWindowThreadProcessId($WindowHandle, [ref]$windowProcessId)
    if (-not $processIdSet.ContainsKey([int]$windowProcessId)) {
      return $true
    }

    $titleBuilder = New-Object System.Text.StringBuilder 512
    $classBuilder = New-Object System.Text.StringBuilder 256
    [void][CodexUiUser32]::GetWindowText($WindowHandle, $titleBuilder, $titleBuilder.Capacity)
    [void][CodexUiUser32]::GetClassName($WindowHandle, $classBuilder, $classBuilder.Capacity)

    $windows.Add([pscustomobject]@{
      ProcessId = [int]$windowProcessId
      Handle = $WindowHandle
      HandleHex = ('0x{0:X}' -f $WindowHandle.ToInt64())
      Title = $titleBuilder.ToString()
      ClassName = $classBuilder.ToString()
      Visible = [CodexUiUser32]::IsWindowVisible($WindowHandle)
    }) | Out-Null

    return $true
  }

  [void][CodexUiUser32]::EnumWindows($callback, [IntPtr]::Zero)
  return $windows.ToArray()
}

function Select-WeChatMainWindow {
  param([object[]]$Windows)

  $rankedCandidates = @()
  foreach ($window in $Windows) {
    $className = [string]$window.ClassName
    $title = ([string]$window.Title).Trim()

    $ignoredClassNames = @(
      'IME',
      'MSCTFIME UI',
      'Chrome_SystemMessageWindow',
      'DisplayICC_SystemMessageWindow',
      'Base_PowerMessageWindow'
    )

    if (($ignoredClassNames -contains $className) -or $className -like '*TrayIconMessageWindowClass') {
      continue
    }

    $score = 0
    if ($title -eq '微信') {
      $score += 400
    } elseif ($title -eq 'Weixin') {
      $score += 300
    } elseif ($title.Length -gt 0) {
      $score += 60
    }

    if ($className -like 'Qt*QWindowIcon') {
      $score += 120
    }
    if ($window.Visible) {
      $score += 40
    }

    $rankedCandidates += [pscustomobject]@{
      Score = $score
      Window = $window
    }
  }

  return $rankedCandidates |
    Sort-Object -Property @{ Expression = 'Score'; Descending = $true }, @{ Expression = { $_.Window.Handle.ToInt64() }; Descending = $false } |
    Select-Object -First 1
}

function Start-WeChatIfNeeded {
  $roots = @(Get-WeChatRootProcesses)
  if ($roots.Count -gt 0) { return $roots }

  $paths = @(
    $env:CODEXUI_DESKTOP_WECHAT_PATH,
    ${candidates}
  ) | Where-Object { $_ -and $_.Trim().Length -gt 0 }

  foreach ($path in $paths) {
    if (-not (Test-Path -LiteralPath $path)) { continue }
    Start-Process -FilePath $path | Out-Null
    for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
      Start-Sleep -Milliseconds 400
      $roots = @(Get-WeChatRootProcesses)
      if ($roots.Count -gt 0) { return $roots }
    }
  }

  return @()
}

function Resolve-WeChatInstance {
  $allProcesses = @(Get-WeChatProcesses)
  $roots = @(Get-WeChatRootProcesses)
  if ($roots.Count -eq 0) {
    throw "WeChat root instance not found."
  }

  $binding = if ($env:CODEXUI_DESKTOP_WECHAT_SOURCE_BINDING) { $env:CODEXUI_DESKTOP_WECHAT_SOURCE_BINDING.Trim() } else { '' }
  $sourceIndexRaw = if ($env:CODEXUI_DESKTOP_WECHAT_SOURCE_INDEX) { $env:CODEXUI_DESKTOP_WECHAT_SOURCE_INDEX.Trim() } else { '' }

  $rootIndex = 0
  if ($binding -match '^(?i)root:(\\d+)$') {
    $rootIndex = [int]$Matches[1]
  } elseif ($sourceIndexRaw -match '^\\d+$') {
    $rootIndex = [int]$sourceIndexRaw
  }

  if ($rootIndex -lt 0 -or $rootIndex -ge $roots.Count) {
    throw "Configured WeChat root instance index $rootIndex is unavailable. Found $($roots.Count) root instances."
  }

  $root = $roots[$rootIndex]
  $groupProcessIds = @(Get-WeChatProcessGroupIds -AllProcesses $allProcesses -RootProcessId ([int]$root.ProcessId))
  $windows = @(Get-TopLevelWindowsForProcesses -ProcessIds $groupProcessIds)
  $selected = Select-WeChatMainWindow -Windows $windows
  if (-not $selected) {
    throw "No usable WeChat window was found for root instance index $rootIndex."
  }

  return [pscustomobject]@{
    RootIndex = $rootIndex
    RootProcessId = [int]$root.ProcessId
    Window = $selected.Window
  }
}

$message = Decode-Message -Value $MessageBase64
$targetName = if ($env:CODEXUI_DESKTOP_WECHAT_TARGET_NAME) { $env:CODEXUI_DESKTOP_WECHAT_TARGET_NAME } else { "新." }
$rootInstances = @(Start-WeChatIfNeeded)
if ($rootInstances.Count -eq 0) {
  throw "WeChat root instance not found."
}

$resolved = Resolve-WeChatInstance
$shell = New-Object -ComObject WScript.Shell
$clipboardBackup = $null
try {
  $clipboardBackup = Get-Clipboard -Raw -ErrorAction Stop
} catch {}

[CodexUiUser32]::ShowWindowAsync($resolved.Window.Handle, 9) | Out-Null
Start-Sleep -Milliseconds 300
$null = $shell.AppActivate($resolved.RootProcessId)
Start-Sleep -Milliseconds 350
[CodexUiUser32]::SetForegroundWindow($resolved.Window.Handle) | Out-Null
Start-Sleep -Milliseconds 450

Set-Clipboard -Value $targetName
$shell.SendKeys("^{f}")
Start-Sleep -Milliseconds 260
$shell.SendKeys("^{a}")
Start-Sleep -Milliseconds 120
$shell.SendKeys("^{v}")
Start-Sleep -Milliseconds 700
$shell.SendKeys("~")
Start-Sleep -Milliseconds 760

Set-Clipboard -Value $message
$shell.SendKeys("^{v}")
Start-Sleep -Milliseconds 220
$shell.SendKeys("~")
Start-Sleep -Milliseconds 180

if ($null -ne $clipboardBackup) {
  try { Set-Clipboard -Value $clipboardBackup } catch {}
}

[pscustomobject]@{
  Binding = if ($env:CODEXUI_DESKTOP_WECHAT_SOURCE_BINDING) { $env:CODEXUI_DESKTOP_WECHAT_SOURCE_BINDING } else { '' }
  SourceIndex = if ($env:CODEXUI_DESKTOP_WECHAT_SOURCE_INDEX) { $env:CODEXUI_DESKTOP_WECHAT_SOURCE_INDEX } else { '' }
  TargetName = $targetName
  RootIndex = $resolved.RootIndex
  RootProcessId = $resolved.RootProcessId
  WindowProcessId = [int]$resolved.Window.ProcessId
  WindowHandleHex = [string]$resolved.Window.HandleHex
  WindowTitle = [string]$resolved.Window.Title
  WindowClassName = [string]$resolved.Window.ClassName
  WindowVisible = [bool]$resolved.Window.Visible
} | ConvertTo-Json -Compress
`.trim()
}

function parsePowerShellJson(stdout: string): Record<string, unknown> | undefined {
  const trimmed = stdout.trim()
  if (!trimmed) return undefined

  try {
    const parsed = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { raw: trimmed }
    }
    return parsed as Record<string, unknown>
  } catch {
    return { raw: trimmed }
  }
}

function runPowerShell(script: string, message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const encodedMessage = Buffer.from(message, 'utf8').toString('base64')
    const proc = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; & ([ScriptBlock]::Create([System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String('${encodePowerShell(script)}')))) -MessageBase64 '${encodedMessage}'`,
      ],
      {
        env: {
          ...process.env,
          CODEXUI_DESKTOP_WECHAT_TARGET_NAME: process.env.CODEXUI_DESKTOP_WECHAT_TARGET_NAME?.trim() || '新.',
          ...(process.env.CODEXUI_DESKTOP_WECHAT_SOURCE_BINDING?.trim()
            ? { CODEXUI_DESKTOP_WECHAT_SOURCE_BINDING: process.env.CODEXUI_DESKTOP_WECHAT_SOURCE_BINDING.trim() }
            : {}),
          ...(process.env.CODEXUI_DESKTOP_WECHAT_SOURCE_INDEX?.trim()
            ? { CODEXUI_DESKTOP_WECHAT_SOURCE_INDEX: process.env.CODEXUI_DESKTOP_WECHAT_SOURCE_INDEX.trim() }
            : {}),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      },
    )

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString()
    })
    proc.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString()
    })
    proc.on('error', reject)
    proc.on('close', (exitCode) => {
      if (exitCode === 0) {
        void writeCompletionNotifierLog('desktop_wechat_notify_sent', {
          transport: 'desktop_wechat',
          details: parsePowerShellJson(stdout),
        })
        resolve()
        return
      }
      void writeCompletionNotifierLog('desktop_wechat_notify_failed', {
        transport: 'desktop_wechat',
        exitCode,
        stderr: stderr.trim(),
        stdout: stdout.trim(),
      })
      reject(new Error(stderr.trim() || `PowerShell exited with code ${String(exitCode)}`))
    })
  })
}

export function queueDesktopWeChatFileHelperMessage(message: string): Promise<void> {
  if (!isEnabled()) return Promise.resolve()

  const normalizedMessage = message.trim()
  if (!normalizedMessage) return Promise.resolve()

  queue = queue
    .catch(() => {})
    .then(() => runPowerShell(buildPowerShellScript(), normalizedMessage))

  return queue
}
