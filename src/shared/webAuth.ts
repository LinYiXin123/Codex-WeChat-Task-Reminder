export const WEB_AUTH_REQUIRED_HEADER = 'x-codex-web-auth'
export const WEB_AUTH_REQUIRED_VALUE = 'required'
export const WEB_AUTH_REQUIRED_ERROR_CODE = 'web_auth_required'

export function isWebAuthRequiredResponse(response: Pick<Response, 'status' | 'headers'>): boolean {
  return (
    response.status === 401
    && response.headers.get(WEB_AUTH_REQUIRED_HEADER)?.trim().toLowerCase() === WEB_AUTH_REQUIRED_VALUE
  )
}
