import type { Conversation } from '../types/domain'
import { database } from './database'

const CONVERSATIONS = 'conversations'

export async function createConversation(conversation: Conversation): Promise<void> {
  await (await database()).add(CONVERSATIONS, conversation)
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  return (await database()).get(CONVERSATIONS, id)
}

export async function listConversations(): Promise<Conversation[]> {
  const conversations = (await database()).getAll(CONVERSATIONS) as Promise<Conversation[]>
  return (await conversations).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveConversation(conversation: Conversation): Promise<void> {
  await (await database()).put(CONVERSATIONS, conversation)
}

export async function deleteConversation(id: string): Promise<void> {
  await (await database()).delete(CONVERSATIONS, id)
}

export async function clearAllConversations(): Promise<void> {
  await (await database()).clear(CONVERSATIONS)
}

export async function importConversations(conversations: Conversation[]): Promise<void> {
  const db = await database()
  const tx = db.transaction(CONVERSATIONS, 'readwrite')
  await Promise.all(conversations.map((conversation) => tx.store.put(conversation)))
  await tx.done
}
