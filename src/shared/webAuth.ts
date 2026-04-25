export const WEB_AUTH_REQUIRED_HEADER = 'x-codex-web-auth'
export const WEB_AUTH_REQUIRED_VALUE = 'required'
export const WEB_AUTH_REQUIRED_ERROR_CODE = 'web_auth_required'
export const WEB_AUTH_STATUS_STORAGE_KEY = 'codex-web-local.auth-status.v1'
export const WEB_AUTH_EXPIRED_STATUS = 'expired'
export const WEB_AUTH_EXPIRED_MESSAGE = '登录已失效，已自动暂停当前页面同步。重新输入密码后会恢复访问。'

export function isWebAuthRequiredResponse(response: Pick<Response, 'status' | 'headers'>): boolean {
  return (
    response.status === 401
    && response.headers.get(WEB_AUTH_REQUIRED_HEADER)?.trim().toLowerCase() === WEB_AUTH_REQUIRED_VALUE
  )
}
