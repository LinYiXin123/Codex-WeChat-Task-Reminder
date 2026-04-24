import { computed, ref } from 'vue'
import {
  getFavoriteRecords,
  updateFavoriteRecords,
  type FavoriteRecord as GatewayFavoriteRecord,
} from '../api/codexGateway'

const FAVORITES_STORAGE_KEY = 'codex-web-local.favorites.v1'

export type FavoriteRecord = GatewayFavoriteRecord

function readStorage(): FavoriteRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const rows: FavoriteRecord[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const record = item as Record<string, unknown>
      const threadId = typeof record.threadId === 'string' ? record.threadId.trim() : ''
      const messageId = typeof record.messageId === 'string' ? record.messageId.trim() : ''
      const text = typeof record.text === 'string' ? record.text : ''
      if (!threadId || !messageId || !text.trim()) continue
      const role = record.role === 'user' || record.role === 'assistant' || record.role === 'system'
        ? record.role
        : 'assistant'
      rows.push({
        id: typeof record.id === 'string' && record.id.trim() ? record.id.trim() : `${threadId}:${messageId}`,
        threadId,
        messageId,
        threadTitle: typeof record.threadTitle === 'string' ? record.threadTitle : '',
        threadCwd: typeof record.threadCwd === 'string' ? record.threadCwd : '',
        role,
        text,
        preview: typeof record.preview === 'string' && record.preview.trim()
          ? record.preview
          : buildFavoritePreview(text),
        turnIndex: typeof record.turnIndex === 'number' ? record.turnIndex : null,
        favoritedAtIso: typeof record.favoritedAtIso === 'string' && record.favoritedAtIso.trim()
          ? record.favoritedAtIso
          : new Date().toISOString(),
      })
    }
    return rows.sort((first, second) => second.favoritedAtIso.localeCompare(first.favoritedAtIso))
  } catch {
    return []
  }
}

function writeStorage(records: FavoriteRecord[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore quota and private mode failures.
  }
}

export function favoriteRecordId(threadId: string, messageId: string): string {
  return `${threadId.trim()}:${messageId.trim()}`
}

export function buildFavoritePreview(text: string): string {
  const normalized = text.replace(/\s+/gu, ' ').trim()
  if (!normalized) return ''
  return normalized.length > 140 ? `${normalized.slice(0, 140).trimEnd()}...` : normalized
}

export function useFavorites() {
  const favorites = ref<FavoriteRecord[]>(readStorage())
  const hasHydratedFromServer = ref(false)
  let persistSequence = 0
  let hydrationPromise: Promise<void> | null = null

  const favoriteIdSet = computed(() => new Set(favorites.value.map((record) => record.id)))

  function isFavorited(threadId: string, messageId: string): boolean {
    return favoriteIdSet.value.has(favoriteRecordId(threadId, messageId))
  }

  function upsertFavorite(record: FavoriteRecord): void {
    const next = favorites.value.filter((row) => row.id !== record.id)
    next.unshift(record)
    favorites.value = next
    writeStorage(next)
    void persistFavorites(next)
  }

  function removeFavorite(threadId: string, messageId: string): void {
    const id = favoriteRecordId(threadId, messageId)
    const next = favorites.value.filter((record) => record.id !== id)
    if (next.length === favorites.value.length) return
    favorites.value = next
    writeStorage(next)
    void persistFavorites(next)
  }

  function toggleFavorite(record: Omit<FavoriteRecord, 'id' | 'preview' | 'favoritedAtIso'>): boolean {
    const id = favoriteRecordId(record.threadId, record.messageId)
    if (favoriteIdSet.value.has(id)) {
      removeFavorite(record.threadId, record.messageId)
      return false
    }

    upsertFavorite({
      ...record,
      id,
      preview: buildFavoritePreview(record.text),
      favoritedAtIso: new Date().toISOString(),
    })
    return true
  }

  async function hydrateFavorites(): Promise<void> {
    if (hydrationPromise) {
      await hydrationPromise
      return
    }

    hydrationPromise = (async () => {
      try {
        const serverFavorites = await getFavoriteRecords()
        if (serverFavorites.length === 0 && favorites.value.length > 0) {
          const migrated = await updateFavoriteRecords(favorites.value)
          favorites.value = migrated
          writeStorage(migrated)
        } else {
          favorites.value = serverFavorites
          writeStorage(serverFavorites)
        }
      } catch {
        // Keep local cache when server state is unavailable.
      } finally {
        hasHydratedFromServer.value = true
      }
    })()

    await hydrationPromise
  }

  async function persistFavorites(nextFavorites: FavoriteRecord[]): Promise<void> {
    const sequence = persistSequence + 1
    persistSequence = sequence
    try {
      const saved = await updateFavoriteRecords(nextFavorites)
      if (persistSequence !== sequence) return
      favorites.value = saved
      writeStorage(saved)
    } catch {
      // Keep local state when sync fails; the next hydration will reconcile.
    }
  }

  void hydrateFavorites()

  return {
    favorites,
    favoriteIdSet,
    hasHydratedFromServer,
    isFavorited,
    toggleFavorite,
    removeFavorite,
    refreshFavorites: hydrateFavorites,
  }
}
