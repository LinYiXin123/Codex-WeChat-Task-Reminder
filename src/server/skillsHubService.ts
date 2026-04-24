import { spawn } from 'node:child_process'

export type SkillHubEntry = {
  name: string
  owner: string
  description: string
  displayName: string
  publishedAt: number
  avatarUrl: string
  url: string
  installed: boolean
  path?: string
  enabled?: boolean
}

export type SkillsTreeEntry = {
  name: string
  owner: string
  url: string
}

export type InstalledSkillInfo = {
  name: string
  path: string
  enabled: boolean
}

type SkillsTreeCache = {
  entries: SkillsTreeEntry[]
  fetchedAt: number
}

type MetaJson = {
  displayName?: string
  owner?: string
  slug?: string
  latest?: { publishedAt?: number }
}

export const HUB_SKILLS_OWNER = 'openclaw'
export const HUB_SKILLS_REPO = 'skills'

const TREE_CACHE_TTL_MS = 5 * 60 * 1000
let skillsTreeCache: SkillsTreeCache | null = null
const metaCache = new Map<string, { description: string; displayName: string; publishedAt: number }>()

async function getGhToken(): Promise<string | null> {
  try {
    const proc = spawn('gh', ['auth', 'token'], { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    proc.stdout.on('data', (d: Buffer) => { out += d.toString() })
    return new Promise((resolve) => {
      proc.on('close', (code) => resolve(code === 0 ? out.trim() : null))
      proc.on('error', () => resolve(null))
    })
  } catch {
    return null
  }
}

async function ghFetch(url: string): Promise<Response> {
  const token = await getGhToken()
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'codex-web-local',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(url, { headers })
}

export async function fetchSkillsTree(): Promise<SkillsTreeEntry[]> {
  if (skillsTreeCache && Date.now() - skillsTreeCache.fetchedAt < TREE_CACHE_TTL_MS) {
    return skillsTreeCache.entries
  }

  const resp = await ghFetch(`https://api.github.com/repos/${HUB_SKILLS_OWNER}/${HUB_SKILLS_REPO}/git/trees/main?recursive=1`)
  if (!resp.ok) throw new Error(`GitHub tree API returned ${resp.status}`)
  const data = (await resp.json()) as { tree?: Array<{ path: string; type: string }> }

  const metaPattern = /^skills\/([^/]+)\/([^/]+)\/_meta\.json$/
  const seen = new Set<string>()
  const entries: SkillsTreeEntry[] = []

  for (const node of data.tree ?? []) {
    const match = metaPattern.exec(node.path)
    if (!match) continue
    const [, owner, skillName] = match
    const key = `${owner}/${skillName}`
    if (seen.has(key)) continue
    seen.add(key)
    entries.push({
      name: skillName,
      owner,
      url: `https://github.com/${HUB_SKILLS_OWNER}/${HUB_SKILLS_REPO}/tree/main/skills/${owner}/${skillName}`,
    })
  }

  skillsTreeCache = { entries, fetchedAt: Date.now() }
  return entries
}

async function fetchMetaBatch(entries: SkillsTreeEntry[]): Promise<void> {
  const toFetch = entries.filter((e) => !metaCache.has(`${e.owner}/${e.name}`))
  if (toFetch.length === 0) return
  const batch = toFetch.slice(0, 50)
  await Promise.allSettled(
    batch.map(async (entry) => {
      const rawUrl = `https://raw.githubusercontent.com/${HUB_SKILLS_OWNER}/${HUB_SKILLS_REPO}/main/skills/${entry.owner}/${entry.name}/_meta.json`
      const resp = await fetch(rawUrl)
      if (!resp.ok) return
      const meta = (await resp.json()) as MetaJson
      metaCache.set(`${entry.owner}/${entry.name}`, {
        displayName: typeof meta.displayName === 'string' ? meta.displayName : '',
        description: typeof meta.displayName === 'string' ? meta.displayName : '',
        publishedAt: meta.latest?.publishedAt ?? 0,
      })
    }),
  )
}

function buildHubEntry(entry: SkillsTreeEntry): SkillHubEntry {
  const cached = metaCache.get(`${entry.owner}/${entry.name}`)
  return {
    name: entry.name,
    owner: entry.owner,
    description: cached?.description ?? '',
    displayName: cached?.displayName ?? '',
    publishedAt: cached?.publishedAt ?? 0,
    avatarUrl: `https://github.com/${entry.owner}.png?size=40`,
    url: entry.url,
    installed: false,
  }
}

export async function searchSkillsHub(
  allEntries: SkillsTreeEntry[],
  query: string,
  limit: number,
  sort: string,
  installedMap: Map<string, InstalledSkillInfo>,
): Promise<SkillHubEntry[]> {
  const normalizedQuery = query.toLowerCase().trim()
  const filtered = normalizedQuery
    ? allEntries.filter((entry) => {
      if (entry.name.toLowerCase().includes(normalizedQuery) || entry.owner.toLowerCase().includes(normalizedQuery)) {
        return true
      }
      const cached = metaCache.get(`${entry.owner}/${entry.name}`)
      return Boolean(cached?.displayName?.toLowerCase().includes(normalizedQuery))
    })
    : allEntries

  const page = filtered.slice(0, Math.min(limit * 2, 200))
  await fetchMetaBatch(page)
  const results = page.map(buildHubEntry)

  if (sort === 'date') {
    results.sort((a, b) => b.publishedAt - a.publishedAt)
  } else if (normalizedQuery) {
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === normalizedQuery ? 1 : 0
      const bExact = b.name.toLowerCase() === normalizedQuery ? 1 : 0
      if (aExact !== bExact) return bExact - aExact
      return b.publishedAt - a.publishedAt
    })
  }

  return results.slice(0, limit).map((entry) => {
    const local = installedMap.get(entry.name)
    return local ? { ...entry, installed: true, path: local.path, enabled: local.enabled } : entry
  })
}

export async function buildInstalledHubEntries(
  allEntries: SkillsTreeEntry[],
  installedMap: Map<string, InstalledSkillInfo>,
): Promise<SkillHubEntry[]> {
  const installedHubEntries = allEntries.filter((entry) => installedMap.has(entry.name))
  await fetchMetaBatch(installedHubEntries)

  const installed: SkillHubEntry[] = []
  for (const [, info] of installedMap) {
    const hubEntry = allEntries.find((entry) => entry.name === info.name)
    const base = hubEntry ? buildHubEntry(hubEntry) : {
      name: info.name,
      owner: 'local',
      description: '',
      displayName: '',
      publishedAt: 0,
      avatarUrl: '',
      url: '',
      installed: false,
    }
    installed.push({ ...base, installed: true, path: info.path, enabled: info.enabled })
  }
  return installed
}

export function extractSkillDescriptionFromMarkdown(markdown: string): string {
  const lines = markdown.split(/\r?\n/)
  let inCodeFence = false
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.startsWith('```')) {
      inCodeFence = !inCodeFence
      continue
    }
    if (inCodeFence || line.length === 0) continue
    if (line.startsWith('#')) continue
    if (line.startsWith('>')) continue
    if (line.startsWith('- ') || line.startsWith('* ')) continue
    return line
  }
  return ''
}
