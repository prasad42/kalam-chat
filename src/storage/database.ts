import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'kalam-chat'
const DB_VERSION = 1

let databasePromise: Promise<IDBPDatabase> | undefined

export function database(): Promise<IDBPDatabase> {
  databasePromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('conversations')) db.createObjectStore('conversations', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings')
    },
  })
  return databasePromise
}
