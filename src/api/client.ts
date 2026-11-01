import type { ApiConnection, ApiErrorPayload } from '../types/transport'

export class ApiError extends Error {
  readonly status?: number
  readonly code?: string

  constructor(message: string, options: { status?: number; code?: string; cause?: unknown } = {}) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code
  }
}

export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    const headers = new Headers(init.headers)
    if (!headers.has('Accept')) headers.set('Accept', 'application/json')
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError('The application server could not be reached. Check your connection and try again.', { cause: error })
  }

  if (!response.ok) throw await errorFromResponse(response)
  try {
    return await response.json() as T
  } catch (error) {
    throw new ApiError('The application server returned an unreadable response.', { status: response.status, cause: error })
  }
}

export async function errorFromResponse(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload = {}
  try {
    payload = await response.json() as ApiErrorPayload
  } catch {
    // Status codes below remain useful if an upstream did not return JSON.
  }
  const message = statusMessage(response.status, payload.code)
  return new ApiError(message, { status: response.status, code: payload.code })
}

export function statusMessage(status: number, code?: string): string {
  if (code === 'api_key_required') return 'Add your provider API key in Settings to load models and chat.'
  if (code === 'invalid_api_key') return 'The provider rejected this API key. Check it in Settings and try again.'
  if (code === 'invalid_provider_config') return 'Check the provider and API address in Settings, then try again.'
  if (code === 'unsupported_model') return 'This model is not supported by the selected provider connection.'
  if (status === 401 || status === 403) return 'The provider rejected this API key, or this application session is not authorised.'
  if (status === 404 && code === 'model_unavailable') return 'This model is currently unavailable. Choose another model and try again.'
  if (status === 413 || code === 'context_too_large') return 'This conversation is too large for the selected model. Start a new chat or remove earlier messages.'
  if (status === 429) return 'The provider is busy or rate-limiting requests. Wait a moment and try again.'
  if (status >= 500) return 'The provider could not complete the request. Your message is still saved locally; please try again.'
  if (status === 404) return 'The requested application API route was not found.'
  if (status === 400 || code === 'invalid_request') return 'The request was rejected. Check the message and try again.'
  if (status >= 400 && status < 500) return 'The request could not be completed. Check your session and conversation, then try again.'
  return 'The request could not be completed. Please try again.'
}

export function connectionHeaders(connection: ApiConnection): Headers {
  const headers = new Headers({ 'X-Kalam-Provider': connection.provider })
  if (connection.apiKey.trim()) headers.set('Authorization', `Bearer ${connection.apiKey.trim()}`)
  if (connection.provider === 'openai-compatible' && connection.baseUrl?.trim()) {
    headers.set('X-Kalam-Base-URL', connection.baseUrl.trim())
  }
  return headers
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError'
}
