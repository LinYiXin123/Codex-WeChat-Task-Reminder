[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Message,
  [Parameter(Mandatory = $true)][string]$TargetName,
  [int]$SourceIndex = 0,
  [string]$SourceBinding = '',
  [string]$LogPath = ''
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$packageRoot = Split-Path -Parent $scriptDir
if (-not $LogPath) {
  $LogPath = Join-Path $packageRoot 'logs\desktop-wechat-send.log'
}

function Write-SendLog {
  param([string]$MessageText)
  $dir = Split-Path -Parent $LogPath
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  Add-Content -LiteralPath $LogPath -Value ((Get-Date -Format o) + ' ' + $MessageText) -Encoding UTF8
}

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

function Get-WindowDetailsByHandle {
  param([IntPtr]$Handle)

  if ($Handle -eq [IntPtr]::Zero) { return $null }

  $windowProcessId = [uint32]0
  [void][CodexUiUser32]::GetWindowThreadProcessId($Handle, [ref]$windowProcessId)
  $titleBuilder = New-Object System.Text.StringBuilder 512
  $classBuilder = New-Object System.Text.StringBuilder 256
  [void][CodexUiUser32]::GetWindowText($Handle, $titleBuilder, $titleBuilder.Capacity)
  [void][CodexUiUser32]::GetClassName($Handle, $classBuilder, $classBuilder.Capacity)

  return [pscustomobject]@{
    ProcessId = [int]$windowProcessId
    Handle = $Handle
    HandleHex = ('0x{0:X}' -f $Handle.ToInt64())
    Title = $titleBuilder.ToString()
    ClassName = $classBuilder.ToString()
    Visible = [CodexUiUser32]::IsWindowVisible($Handle)
  }
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

function Resolve-WeChatInstance {
  $allProcesses = @(Get-WeChatProcesses)
  $roots = @(Get-WeChatRootProcesses)
  if ($roots.Count -eq 0) {
    throw 'WeChat root instance not found.'
  }

  $binding = $SourceBinding.Trim()
  $rootIndex = 0
  if ($binding -match '^(?i)root:(\d+)$') {
    $rootIndex = [int]$Matches[1]
  } else {
    if ($SourceIndex -lt 0) { $SourceIndex = 0 }
    $rootIndex = $SourceIndex
  }

  if ($rootIndex -lt 0 -or $rootIndex -ge $roots.Count) {
    throw "Configured WeChat root instance index $rootIndex is unavailable. Found $($roots.Count) root instances."
  }

  $root = $roots[$rootIndex]
  $groupProcessIds = @(Get-WeChatProcessGroupIds -AllProcesses $allProcesses -RootProcessId ([int]$root.ProcessId))
  $groupProcesses = @(Get-Process -Id $groupProcessIds -ErrorAction SilentlyContinue | Sort-Object StartTime, Id)
  $visibleMainProcess = $groupProcesses | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if ($visibleMainProcess) {
    $visibleWindow = Get-WindowDetailsByHandle -Handle ([IntPtr]$visibleMainProcess.MainWindowHandle)
    if ($visibleWindow) {
      return [pscustomobject]@{
        RootIndex = $rootIndex
        RootProcessId = [int]$root.ProcessId
        Window = $visibleWindow
        RootCount = $roots.Count
        WindowCount = 1
      }
    }
  }

  $windows = @(Get-TopLevelWindowsForProcesses -ProcessIds $groupProcessIds)
  $selected = Select-WeChatMainWindow -Windows $windows
  if (-not $selected) {
    throw "No usable WeChat window was found for root instance index $rootIndex."
  }

  return [pscustomobject]@{
    RootIndex = $rootIndex
    RootProcessId = [int]$root.ProcessId
    Window = $selected.Window
    RootCount = $roots.Count
    WindowCount = $windows.Count
  }
}

$resolved = Resolve-WeChatInstance
Write-SendLog ('roots found=' + $resolved.RootCount + ' windows found=' + $resolved.WindowCount)
Write-SendLog ('selected binding=' + $SourceBinding + ' rootIndex=' + $resolved.RootIndex + ' rootPid=' + $resolved.RootProcessId + ' windowPid=' + $resolved.Window.ProcessId + ' handle=' + $resolved.Window.HandleHex + ' title=' + $resolved.Window.Title + ' class=' + $resolved.Window.ClassName + ' visible=' + $resolved.Window.Visible)

$shell = New-Object -ComObject WScript.Shell
$clipboardBackup = $null
try {
  $clipboardBackup = Get-Clipboard -Raw -ErrorAction Stop
} catch {}

[CodexUiUser32]::ShowWindowAsync($resolved.Window.Handle, 9) | Out-Null
Start-Sleep -Milliseconds 250
$activated = $shell.AppActivate($resolved.RootProcessId)
Write-SendLog ('AppActivate=' + $activated)
Start-Sleep -Milliseconds 350
$fg = [CodexUiUser32]::SetForegroundWindow($resolved.Window.Handle)
Write-SendLog ('SetForegroundWindow=' + $fg)
Start-Sleep -Milliseconds 350

Set-Clipboard -Value $TargetName
$shell.SendKeys('^{f}')
Start-Sleep -Milliseconds 240
$shell.SendKeys('^{a}')
Start-Sleep -Milliseconds 120
$shell.SendKeys('^{v}')
Start-Sleep -Milliseconds 650
$shell.SendKeys('~')
Start-Sleep -Milliseconds 700
Write-SendLog ('search submitted target=' + $TargetName)

Set-Clipboard -Value $Message
$shell.SendKeys('^{v}')
Start-Sleep -Milliseconds 180
$shell.SendKeys('~')
Start-Sleep -Milliseconds 160
Write-SendLog 'message submitted'

if ($null -ne $clipboardBackup) {
  try { Set-Clipboard -Value $clipboardBackup } catch {}
}
