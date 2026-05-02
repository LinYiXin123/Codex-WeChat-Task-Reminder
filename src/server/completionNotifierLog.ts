import { appendFile } from 'node:fs/promises'
import { join } from 'node:path'

const LOG_DIR = 'F:\\HermesData\\CodexUI\\logs'
const LOG_PATH = join(LOG_DIR, 'completion-notifier.log')

export async function writeCompletionNotifierLog(message: string, details: Record<string, unknown> = {}): Promise<void> {
  const line = JSON.stringify({
    atIso: new Date().toISOString(),
    message,
    ...details,
  }) + '\n'

  try {
    await appendFile(LOG_PATH, line, 'utf8')
  } catch {
    // Best-effort logging only.
  }
}
