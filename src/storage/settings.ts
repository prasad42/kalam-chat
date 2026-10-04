import { DEFAULT_SETTINGS, type Settings } from '../types/domain'
import { database } from './database'

const SETTINGS = 'settings'
const SETTINGS_KEY = 'preferences'

export async function getSettings(): Promise<Settings> {
  const saved = await (await database()).get(SETTINGS, SETTINGS_KEY) as Partial<Settings> | undefined
  return { ...DEFAULT_SETTINGS, ...saved }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await (await database()).put(SETTINGS, settings, SETTINGS_KEY)
}
