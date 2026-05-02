import { spawn } from 'node:child_process'
import { join } from 'node:path'

const WINDOWS_PLATFORM = 'win32'
const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on'])
const HERMES_HOME = process.env.HERMES_HOME?.trim() || 'F:\\HermesData\\UserHome\\.hermes'
const HERMES_STATE_DB = join(HERMES_HOME, 'state.db')
const HERMES_SOURCE = 'codexui'
const HERMES_TITLE_PREFIX = 'CodexUI 完成通知'

let queue = Promise.resolve()

function encodePowerShell(script: string): string {
  return Buffer.from(script, 'utf16le').toString('base64')
}

function isEnabled(): boolean {
  const raw = process.env.CODEXUI_HERMES_AGENT_NOTIFY_ON_COMPLETION?.trim().toLowerCase() ?? ''
  return process.platform === WINDOWS_PLATFORM && ENABLED_VALUES.has(raw)
}

function buildPowerShellScript(): string {
  return `
param(
  [string]$MessageBase64
)

$ErrorActionPreference = "Stop"

function Decode-Message {
  param([string]$Value)
  return [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($Value))
}

$dbPath = $env:CODEXUI_HERMES_STATE_DB
if (-not $dbPath) {
  throw "Hermes state db path missing."
}

$source = $env:CODEXUI_HERMES_SESSION_SOURCE
$message = Decode-Message -Value $MessageBase64

$python = @'
import os
import sqlite3
import time
import uuid
from datetime import datetime

db_path = os.environ["CODEXUI_HERMES_STATE_DB"]
title_prefix = os.environ.get("CODEXUI_HERMES_SESSION_TITLE_PREFIX", "CodexUI 完成通知")
source = os.environ.get("CODEXUI_HERMES_SESSION_SOURCE", "codexui")
message = os.environ["CODEXUI_HERMES_MESSAGE"]
title = f"{title_prefix} {datetime.now().strftime('%m-%d %H:%M:%S')}"
preview = "CX Codex 任务已完成"

conn = sqlite3.connect(db_path)
try:
    conn.execute("PRAGMA journal_mode=WAL")
    session_id = time.strftime("%Y%m%d_%H%M%S_") + uuid.uuid4().hex[:6]
    started_at = time.time()

    conn.execute(
        \"\"\"INSERT INTO sessions
        (id, source, model, started_at, message_count, tool_call_count, title)
        VALUES (?, ?, ?, ?, 0, 0, ?)\"\"\",
        (session_id, source, "codexui-notifier", started_at, title),
    )

    conn.execute(
        \"\"\"INSERT INTO messages
        (session_id, role, content, tool_call_id, tool_calls, tool_name, timestamp, token_count, finish_reason)
        VALUES (?, ?, ?, NULL, NULL, NULL, ?, NULL, NULL)\"\"\",
        (session_id, "user", preview, started_at),
    ).fetchone()

    conn.execute(
        \"\"\"INSERT INTO messages
        (session_id, role, content, tool_call_id, tool_calls, tool_name, timestamp, token_count, finish_reason)
        VALUES (?, ?, ?, NULL, NULL, NULL, ?, NULL, NULL)\"\"\",
        (session_id, "assistant", message, time.time()),
    )
    conn.execute(
        "UPDATE sessions SET message_count = message_count + 2 WHERE id = ?",
        (session_id,),
    )
    conn.commit()
finally:
    conn.close()
'@

$env:CODEXUI_HERMES_MESSAGE = $message
@"
$python
"@ | python -
`.trim()
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
          CODEXUI_HERMES_STATE_DB: HERMES_STATE_DB,
          CODEXUI_HERMES_SESSION_TITLE_PREFIX: HERMES_TITLE_PREFIX,
          CODEXUI_HERMES_SESSION_SOURCE: HERMES_SOURCE,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      },
    )

    let stderr = ''
    proc.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString()
    })
    proc.on('error', reject)
    proc.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve()
        return
      }
      reject(new Error(stderr.trim() || `PowerShell exited with code ${String(exitCode)}`))
    })
  })
}

export function queueHermesAgentCompletionMessage(message: string): Promise<void> {
  if (!isEnabled()) return Promise.resolve()

  const normalizedMessage = message.trim()
  if (!normalizedMessage) return Promise.resolve()

  queue = queue
    .catch(() => {})
    .then(() => runPowerShell(buildPowerShellScript(), normalizedMessage))

  return queue
}
