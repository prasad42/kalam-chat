export type Role = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  role: Role
  content: string
  createdAt: number
}

export interface Conversation {
  id: string
  title: string
  modelId: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface ModelCapabilities {
  streaming: boolean
  vision?: boolean
  attachments?: boolean
}

export interface Model {
  id: string
  name: string
  description?: string
  capabilities: ModelCapabilities
}

export type Theme = 'system' | 'light' | 'dark'

export interface Settings {
  theme: Theme
  defaultModelId: string
  enterToSend: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  defaultModelId: '',
  enterToSend: true,
}

export interface KalamExport {
  format: 'kalam-conversations'
  version: 1
  exportedAt: string
  conversations: Conversation[]
}
