import { isWebAuthRequiredResponse } from '../shared/webAuth'
import { getMobileShellAuthConfig, isNativeAndroidShell } from './mobileShell'

let autoLoginInFlight: Promise<boolean> | null = null

export async function tryMobileShellAutoLogin(): Promise<boolean> {
  if (!isNativeAndroidShell()) return false

  if (!autoLoginInFlight) {
    autoLoginInFlight = (async () => {
      try {
        const config = await getMobileShellAuthConfig()
        const authKey = config.authKey?.trim() ?? ''
        if (!authKey) return false

        const response = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: authKey }),
        })
        return response.ok
      } catch {
        return false
      }
    })().finally(() => {
      autoLoginInFlight = null
    })
  }

  return await autoLoginInFlight
}

export function shouldAutoLoginForResponse(response: Response): boolean {
  return isWebAuthRequiredResponse(response)
}
