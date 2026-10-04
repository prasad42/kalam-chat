import type { Conversation, KalamExport, Message, Role } from '../types/domain'

export function createId(): string {
  return crypto.randomUUID()
}

export function createConversation(modelId: string, now = Date.now()): Conversation {
  return {
    id: createId(),
    title: 'New conversation',
    modelId,
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function createMessage(role: Role, content: string, now = Date.now()): Message {
  return { id: createId(), role, content, createdAt: now }
}

export function titleFromMessage(content: string): string {
  const compact = content.trim().replace(/\s+/g, ' ')
  return compact.length > 48 ? `${compact.slice(0, 48).trimEnd()}…` : compact || 'New conversation'
}

export function createExport(conversations: Conversation[], exportedAt = new Date().toISOString()): KalamExport {
  return { format: 'kalam-conversations', version: 1, exportedAt, conversations }
}

export function replaceUserMessage(
  conversation: Conversation,
  messageId: string,
  content: string,
  now = Date.now(),
): Conversation {
  const index = conversation.messages.findIndex((message) => message.id === messageId)
  if (index < 0 || conversation.messages[index]?.role !== 'user') return conversation
  const messages = conversation.messages.slice(0, index + 1)
  messages[index] = { ...messages[index]!, content, createdAt: now }
  return {
    ...conversation,
    title: index === 0 ? titleFromMessage(content) : conversation.title,
    messages,
    updatedAt: now,
  }
}

export function conversationForImport(value: unknown): Conversation[] {
  if (!value || typeof value !== 'object') throw new Error('This file is not a Kalam export.')
  const data = value as Partial<{ format: string; version: number; conversations: unknown }>
  if (data.format !== 'kalam-conversations' || data.version !== 1 || !Array.isArray(data.conversations)) {
    throw new Error('This file is not a supported Kalam export.')
  }
  if (!data.conversations.every(isConversation)) throw new Error('The export contains an invalid conversation.')
  return data.conversations
}

function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<Conversation>
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.modelId === 'string' &&
    typeof item.createdAt === 'number' &&
    typeof item.updatedAt === 'number' &&
    Array.isArray(item.messages) &&
    item.messages.every(isMessage)
  )
}

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== 'object') return false
  const message = value as Partial<Message>
  return (
    typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'assistant' || message.role === 'system') &&
    typeof message.content === 'string' &&
    typeof message.createdAt === 'number'
  )
}
