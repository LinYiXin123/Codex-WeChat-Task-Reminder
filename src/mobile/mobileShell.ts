import { Capacitor, registerPlugin } from '@capacitor/core'

export type MobileShellServerConfig = {
  serverUrl: string
  defaultServerUrl: string
  usingDefault: boolean
  restartScheduled?: boolean
}

export type MobileShellAppInfo = {
  appName: string
  packageName: string
  versionName: string
  versionCode: number
  canRequestPackageInstalls: boolean
}

export type MobileShellInstallResult = {
  status: 'started' | 'permission_required'
  fileName?: string
}

type MobileShellPlugin = {
  getServerConfig(): Promise<MobileShellServerConfig>
  setServerUrl(options: { serverUrl: string }): Promise<MobileShellServerConfig>
  resetServerUrl(): Promise<MobileShellServerConfig>
  getAppInfo(): Promise<MobileShellAppInfo>
  installApkFromUrl(options: { url: string; fileName?: string }): Promise<MobileShellInstallResult>
}

const MobileShell = registerPlugin<MobileShellPlugin>('MobileShell')

export function isNativeAndroidShell(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export async function getMobileShellServerConfig(): Promise<MobileShellServerConfig> {
  return await MobileShell.getServerConfig()
}

export async function setMobileShellServerUrl(serverUrl: string): Promise<MobileShellServerConfig> {
  return await MobileShell.setServerUrl({ serverUrl })
}

export async function resetMobileShellServerUrl(): Promise<MobileShellServerConfig> {
  return await MobileShell.resetServerUrl()
}

export async function getMobileShellAppInfo(): Promise<MobileShellAppInfo> {
  return await MobileShell.getAppInfo()
}

export async function installMobileShellApk(url: string, fileName = ''): Promise<MobileShellInstallResult> {
  return await MobileShell.installApkFromUrl({ url, fileName })
}
