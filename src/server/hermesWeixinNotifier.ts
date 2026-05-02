import { spawn } from 'node:child_process'

const WINDOWS_PLATFORM = 'win32'
const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on'])

let queue = Promise.resolve()

function encodePowerShell(script: string): string {
  return Buffer.from(script, 'utf16le').toString('base64')
}

function isEnabled(): boolean {
  const raw = process.env.CODEXUI_HERMES_WEIXIN_NOTIFY_ON_COMPLETION?.trim().toLowerCase() ?? ''
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

$message = Decode-Message -Value $MessageBase64

$python = @'
import asyncio
import os
import sys
from pathlib import Path

repo_root = Path(os.environ["CODEXUI_HERMES_WEIXIN_REPO_ROOT"])
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from dotenv import load_dotenv
load_dotenv(Path(os.environ["HERMES_HOME"]) / ".env", override=False)

from gateway.platforms.weixin import send_weixin_direct

chat_id = os.environ["CODEXUI_HERMES_WEIXIN_CHAT_ID"]
message = os.environ["CODEXUI_HERMES_WEIXIN_MESSAGE"]

async def main():
    result = await send_weixin_direct(
        extra={
            "account_id": os.environ.get("WEIXIN_ACCOUNT_ID", ""),
            "base_url": os.environ.get("WEIXIN_BASE_URL", ""),
            "cdn_base_url": os.environ.get("WEIXIN_CDN_BASE_URL", ""),
        },
        token=os.environ.get("WEIXIN_TOKEN", ""),
        chat_id=chat_id,
        message=message,
    )
    if result.get("error"):
        raise RuntimeError(result["error"])

asyncio.run(main())
'@

$env:CODEXUI_HERMES_WEIXIN_MESSAGE = $message
@"
$python
"@ | & "$env:CODEXUI_HERMES_WEIXIN_PYTHON" -
`.trim()
}

function runPowerShell(script: string, message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const hermesHome = process.env.CODEXUI_HERMES_WEIXIN_HOME?.trim() || 'F:\\HermesData\\WeixinOfficialWin'
    const repoRoot = process.env.CODEXUI_HERMES_WEIXIN_REPO_ROOT?.trim() || 'F:\\Apps\\HermesAgent-official'
    const pythonPath = process.env.CODEXUI_HERMES_WEIXIN_PYTHON?.trim() || 'F:\\Apps\\HermesAgent-official\\.venv-win\\Scripts\\python.exe'
    const chatId = process.env.CODEXUI_HERMES_WEIXIN_CHAT_ID?.trim() || process.env.WEIXIN_HOME_CHANNEL?.trim() || ''
    if (!chatId) {
      reject(new Error('Hermes Weixin home channel is not configured'))
      return
    }

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
          HERMES_HOME: hermesHome,
          CODEXUI_HERMES_WEIXIN_HOME: hermesHome,
          CODEXUI_HERMES_WEIXIN_REPO_ROOT: repoRoot,
          CODEXUI_HERMES_WEIXIN_PYTHON: pythonPath,
          CODEXUI_HERMES_WEIXIN_CHAT_ID: chatId,
          PYTHONUTF8: '1',
          PYTHONIOENCODING: 'utf-8',
          HTTP_PROXY: '',
          HTTPS_PROXY: '',
          NO_PROXY: process.env.NO_PROXY || '127.0.0.1,localhost,ilinkai.weixin.qq.com,novac2c.cdn.weixin.qq.com',
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

export function queueHermesWeixinCompletionMessage(message: string): Promise<void> {
  if (!isEnabled()) return Promise.resolve()

  const normalizedMessage = message.trim()
  if (!normalizedMessage) return Promise.resolve()

  queue = queue
    .catch(() => {})
    .then(() => runPowerShell(buildPowerShellScript(), normalizedMessage))

  return queue
}
