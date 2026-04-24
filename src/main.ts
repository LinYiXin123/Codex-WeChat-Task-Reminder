import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { isWebAuthRequiredResponse } from './shared/webAuth'
import './style.css'

console.log('Welcome to codexapp. GitHub: https://github.com/Qjzn/codexui-server-bridge')

if (typeof window !== 'undefined') {
  const nativeFetch = window.fetch.bind(window)
  let authReloadScheduled = false

  const scheduleAuthReload = (): void => {
    if (authReloadScheduled) return
    authReloadScheduled = true
    window.setTimeout(() => {
      window.location.reload()
    }, 0)
  }

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await nativeFetch(input, init)
    if (isWebAuthRequiredResponse(response)) {
      scheduleAuthReload()
      return response
    }

    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url
    if (
      url.includes('/codex-api/')
      && response.ok
      && response.headers.get('content-type')?.toLowerCase().includes('text/html')
    ) {
      scheduleAuthReload()
    }
    return response
  }) as typeof window.fetch
}

createApp(App).use(router).mount('#app')
