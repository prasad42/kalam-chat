import type { Role } from './domain'

export interface ApiModel {
  id: string
  name: string
  description?: string
  capabilities?: {
    streaming?: boolean
    vision?: boolean
    attachments?: boolean
  }
}

export interface ModelsResponse {
  models: ApiModel[]
}

export interface ChatRequest {
  conversationId: string
  model: string
  messages: Array<{ role: Role; content: string }>
}

export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message?: string }

export interface ApiErrorPayload {
  error?: string
  message?: string
  code?: string
}
