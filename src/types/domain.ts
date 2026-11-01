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

export type ProviderId = 'opencode-zen' | 'openai' | 'openrouter' | 'anthropic' | 'google' | 'openai-compatible'

export interface Settings {
  theme: Theme
  defaultModelId: string
  enterToSend: boolean
  provider: ProviderId
  customBaseUrl: string
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  defaultModelId: '',
  enterToSend: true,
  provider: 'opencode-zen',
  customBaseUrl: '',
}

export interface KalamExport {
  format: 'kalam-conversations'
  version: 1
  exportedAt: string
  conversations: Conversation[]
}
