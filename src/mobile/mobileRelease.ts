const LATEST_RELEASE_API_URL = 'https://api.github.com/repos/Qjzn/codexui-server-bridge/releases/latest'
const RELEASES_PAGE_URL = 'https://github.com/Qjzn/codexui-server-bridge/releases'

export type MobileReleaseAsset = {
  name: string
  downloadUrl: string
  size: number
  updatedAtIso: string
  contentType: string
}

export type MobileLatestRelease = {
  tagName: string
  releaseName: string
  publishedAtIso: string
  htmlUrl: string
  asset: MobileReleaseAsset | null
}

type GithubReleaseAsset = {
  name?: string
  browser_download_url?: string
  size?: number
  updated_at?: string
  content_type?: string
}

type GithubLatestReleaseResponse = {
  tag_name?: string
  name?: string
  published_at?: string
  html_url?: string
  assets?: GithubReleaseAsset[]
}

const APK_ASSET_PATTERNS = [
  /^cx-codex-android-.*\.apk$/iu,
  /^cx-codex.*\.apk$/iu,
  /^codexui-android-.*\.apk$/iu,
  /android.*release.*\.apk$/iu,
  /\.apk$/iu,
]

function normalizeText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeReleaseVersion(value: string): string {
  const normalized = normalizeText(value).toLowerCase()
  return normalized.startsWith('v') ? normalized.slice(1) : normalized
}

function resolveApkAsset(assets: GithubReleaseAsset[]): MobileReleaseAsset | null {
  const normalizedAssets = assets
    .map((asset) => ({
      name: normalizeText(asset.name),
      downloadUrl: normalizeText(asset.browser_download_url),
      size: Number.isFinite(asset.size) ? Number(asset.size) : 0,
      updatedAtIso: normalizeText(asset.updated_at),
      contentType: normalizeText(asset.content_type),
    }))
    .filter((asset) => asset.name && asset.downloadUrl)

  for (const pattern of APK_ASSET_PATTERNS) {
    const match = normalizedAssets.find((asset) => pattern.test(asset.name))
    if (match) return match
  }

  return null
}

export function isMobileReleaseUpdateAvailable(currentVersionName: string, latestTagName: string): boolean {
  const currentVersion = normalizeReleaseVersion(currentVersionName)
  const latestVersion = normalizeReleaseVersion(latestTagName)
  if (!latestVersion) return false
  if (!currentVersion) return true
  return currentVersion !== latestVersion
}

export function getMobileReleasesPageUrl(): string {
  return RELEASES_PAGE_URL
}

export async function fetchLatestMobileRelease(): Promise<MobileLatestRelease> {
  const response = await fetch(LATEST_RELEASE_API_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  })

  if (!response.ok) {
    throw new Error(`读取 GitHub 发布信息失败（HTTP ${response.status}）`)
  }

  const payload = (await response.json()) as GithubLatestReleaseResponse
  const assets = Array.isArray(payload.assets) ? payload.assets : []

  return {
    tagName: normalizeText(payload.tag_name),
    releaseName: normalizeText(payload.name),
    publishedAtIso: normalizeText(payload.published_at),
    htmlUrl: normalizeText(payload.html_url) || RELEASES_PAGE_URL,
    asset: resolveApkAsset(assets),
  }
}
