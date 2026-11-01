type ProviderId = 'opencode-zen' | 'openai' | 'openrouter' | 'anthropic' | 'google' | 'openai-compatible'
type ApiFamily = 'openai-chat' | 'openai-responses' | 'anthropic' | 'google'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatPayload {
  model: string
  messages: ChatMessage[]
}

interface ModelRecord {
  id: string
  name: string
  description?: string
  capabilities: { streaming: true }
}

interface ProviderConfig {
  provider: ProviderId
  apiKey: string
  baseUrl?: string
}

const MODEL_LIMIT = 250

export class ProviderRequestError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ProviderRequestError'
    this.status = status
    this.code = code
  }
}

export function readProviderConfig(request: Request): ProviderConfig {
  const provider = request.headers.get('x-kalam-provider')
  if (!isProviderId(provider)) throw new ProviderRequestError(400, 'invalid_provider_config', 'Choose a supported provider.')

  const authorization = request.headers.get('authorization') ?? ''
  const match = /^Bearer ([^\s].*)$/i.exec(authorization)
  if (!match?.[1] || match[1].length > 8192) {
    throw new ProviderRequestError(401, 'api_key_required', 'Add your provider API key in Settings.')
  }
  if (/[\r\n]/.test(match[1])) throw new ProviderRequestError(400, 'invalid_provider_config', 'The API key format is invalid.')

  const baseUrl = request.headers.get('x-kalam-base-url') ?? undefined
  if (provider === 'openai-compatible') validateCustomBaseUrl(baseUrl)

  return { provider, apiKey: match[1], ...(provider === 'openai-compatible' ? { baseUrl } : {}) }
}

export async function getModels(config: ProviderConfig, signal: AbortSignal): Promise<ModelRecord[]> {
  const url = providerUrl(config, modelListPath(config.provider))
  const response = await fetch(url, {
    method: 'GET',
    headers: providerHeaders(config),
    redirect: 'manual',
    signal,
  })
  if (!response.ok) throw mapUpstreamError(response.status)

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ProviderRequestError(502, 'provider_error', 'The provider returned an invalid model list.')
  }

  const records = modelRecords(payload, config.provider)
  if (records.length === 0) throw new ProviderRequestError(502, 'provider_error', 'The provider did not return any supported chat models.')
  return records.slice(0, MODEL_LIMIT)
}

export async function streamCompletion(request: Request, config: ProviderConfig, payload: ChatPayload): Promise<Response> {
  const rawModelId = payload.model.slice(config.provider.length + 2)
  if (!payload.model.startsWith(`${config.provider}::`) || !rawModelId) {
    throw new ProviderRequestError(400, 'unsupported_model', 'Choose a model from the selected provider.')
  }
  const family = modelFamily(config.provider, rawModelId)
  if (!family) throw new ProviderRequestError(400, 'unsupported_model', 'This model does not use a supported chat API.')

  const upstream = await fetch(providerUrl(config, chatPath(config.provider, family, rawModelId)), {
    method: 'POST',
    headers: providerHeaders(config, true),
    body: JSON.stringify(chatBody(family, rawModelId, payload.messages)),
    redirect: 'manual',
    signal: request.signal,
  })
  if (!upstream.ok) throw mapUpstreamError(upstream.status)
  if (!upstream.body || !(upstream.headers.get('content-type') ?? '').toLowerCase().includes('text/event-stream')) {
    throw new ProviderRequestError(502, 'provider_error', 'The provider did not return a response stream.')
  }

  return new Response(normalizeStream(upstream.body, family), {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Accel-Buffering': 'no',
    },
  })
}

function isProviderId(value: string | null): value is ProviderId {
  return value === 'opencode-zen' || value === 'openai' || value === 'openrouter'
    || value === 'anthropic' || value === 'google' || value === 'openai-compatible'
}

function validateCustomBaseUrl(rawUrl: string | undefined): asserts rawUrl is string {
  if (!rawUrl || rawUrl.length > 2048) {
    throw new ProviderRequestError(400, 'invalid_provider_config', 'Enter an API base URL for the custom provider.')
  }
  try {
    const url = new URL(rawUrl)
    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    const privateHost = host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')
      || host.endsWith('.internal') || host.startsWith('[') || /^\d+(?:\.\d+){3}$/.test(host)
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || privateHost || (url.port && url.port !== '443')) {
      throw new Error('unsafe base URL')
    }
  } catch {
    throw new ProviderRequestError(400, 'invalid_provider_config', 'Use a public HTTPS API base URL without credentials, query, or fragment.')
  }
}

function baseUrl(provider: ProviderId, customUrl?: string): string {
  if (provider === 'openai') return 'https://api.openai.com/v1'
  if (provider === 'openrouter') return 'https://openrouter.ai/api/v1'
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1'
  if (provider === 'google') return 'https://generativelanguage.googleapis.com/v1beta'
  if (provider === 'opencode-zen') return 'https://opencode.ai/zen/v1'
  validateCustomBaseUrl(customUrl)
  return customUrl
}

function providerUrl(config: ProviderConfig, path: string): URL {
  const base = new URL(baseUrl(config.provider, config.baseUrl))
  const [pathname, query = ''] = path.split('?', 2)
  base.pathname = `${base.pathname.replace(/\/+$/, '')}/${(pathname ?? '').replace(/^\/+/, '')}`
  base.search = query ? `?${query}` : ''
  base.hash = ''
  return base
}

function modelListPath(provider: ProviderId): string {
  return provider === 'google' ? 'models?pageSize=1000' : 'models'
}

function providerHeaders(config: ProviderConfig, streaming = false): Headers {
  const headers = new Headers({ Accept: streaming ? 'text/event-stream' : 'application/json' })
  if (streaming) headers.set('Content-Type', 'application/json')
  if (config.provider === 'anthropic') {
    headers.set('x-api-key', config.apiKey)
    headers.set('anthropic-version', '2023-06-01')
  } else if (config.provider === 'google') {
    headers.set('x-goog-api-key', config.apiKey)
  } else {
    headers.set('Authorization', `Bearer ${config.apiKey}`)
  }
  return headers
}

function modelRecords(payload: unknown, provider: ProviderId): ModelRecord[] {
  if (!payload || typeof payload !== 'object') return []
  const object = payload as { data?: unknown; models?: unknown }
  const items = Array.isArray(object.data) ? object.data : Array.isArray(object.models) ? object.models : []
  return items.flatMap((item): ModelRecord[] => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    const rawIdValue = typeof record.id === 'string' ? record.id : record.name
    if (typeof rawIdValue !== 'string') return []
    const rawId = provider === 'google' ? rawIdValue.replace(/^models\//, '') : rawIdValue
    const family = modelFamily(provider, rawId)
    if (!family) return []
    if (provider === 'google' && Array.isArray(record.supportedGenerationMethods)
      && !record.supportedGenerationMethods.includes('generateContent')) return []
    const name = [record.name, record.display_name, record.displayName].find((value): value is string => typeof value === 'string') ?? rawId
    return [{
      id: `${provider}::${rawId}`,
      name,
      ...(typeof record.description === 'string' ? { description: record.description } : {}),
      capabilities: { streaming: true },
    }]
  })
}

function modelFamily(provider: ProviderId, model: string): ApiFamily | null {
  if (provider === 'openai') return /^(gpt-|o[134](?:-|$)|chatgpt-)/.test(model) ? 'openai-responses' : null
  if (provider === 'openrouter' || provider === 'openai-compatible') return 'openai-chat'
  if (provider === 'anthropic') return 'anthropic'
  if (provider === 'google') return model.startsWith('gemini-') ? 'google' : null
  if (provider === 'opencode-zen') return /^(?:jev-.*|text-embedding-.*|.*-embedding.*)$/i.test(model) ? null : 'openai-chat'
  return null
}

function chatPath(provider: ProviderId, family: ApiFamily, model: string): string {
  if (provider === 'google' || (provider === 'opencode-zen' && family === 'google')) {
    return `models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`
  }
  if (family === 'anthropic') return 'messages'
  if (family === 'openai-responses') return 'responses'
  return 'chat/completions'
}

function chatBody(family: ApiFamily, model: string, messages: ChatMessage[]): Record<string, unknown> {
  if (family === 'openai-responses') {
    return {
      model,
      input: messages.map(({ role, content }) => ({
        role,
        content: [{ type: role === 'assistant' ? 'output_text' : 'input_text', text: content }],
      })),
      stream: true,
    }
  }
  if (family === 'anthropic') {
    const system = messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n\n')
    return {
      model,
      max_tokens: 4096,
      ...(system ? { system } : {}),
      messages: messages.filter((message) => message.role !== 'system').map(({ role, content }) => ({ role, content })),
      stream: true,
    }
  }
  if (family === 'google') {
    const system = messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n\n')
    return {
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: messages.filter((message) => message.role !== 'system').map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
    }
  }
  return { model, messages, stream: true }
}

function mapUpstreamError(status: number): ProviderRequestError {
  if (status === 401 || status === 403) return new ProviderRequestError(401, 'invalid_api_key', 'The provider rejected the API key.')
  if (status === 429) return new ProviderRequestError(429, 'provider_rate_limited', 'The provider is rate-limiting requests. Wait and try again.')
  if (status === 400 || status === 404 || status === 422) return new ProviderRequestError(400, 'provider_rejected', 'The provider rejected this model or request. Check the selected model and try again.')
  return new ProviderRequestError(502, 'provider_error', 'The provider could not complete the request.')
}

function normalizeStream(body: ReadableStream<Uint8Array>, family: ApiFamily): ReadableStream<Uint8Array> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''
  let dataLines: string[] = []
  let eventName = ''
  let finished = false

  const normalized = (payload: unknown) => encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
  const processEvent = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    if (dataLines.length === 0) {
      eventName = ''
      return
    }
    const data = dataLines.join('\n')
    const name = eventName
    dataLines = []
    eventName = ''
    if (data === '[DONE]' || (family === 'anthropic' && name === 'message_stop')) {
      controller.enqueue(normalized({ type: 'done' }))
      finished = true
      return
    }
    let payload: unknown
    try {
      payload = JSON.parse(data)
    } catch {
      controller.enqueue(normalized({ type: 'error' }))
      finished = true
      return
    }
    const delta = streamDelta(family, name, payload)
    if (delta) controller.enqueue(normalized({ type: 'delta', text: delta }))
    if (family === 'openai-responses' && name === 'response.completed') {
      controller.enqueue(normalized({ type: 'done' }))
      finished = true
    }
    if (family === 'openai-responses' && (name === 'response.failed' || name === 'response.incomplete')) {
      controller.enqueue(normalized({ type: 'error' }))
      finished = true
    }
    if (family === 'anthropic' && name === 'error') {
      controller.enqueue(normalized({ type: 'error' }))
      finished = true
    }
    if (family === 'google' && googleStreamComplete(payload)) {
      controller.enqueue(normalized({ type: 'done' }))
      finished = true
    }
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (!finished) {
          const { value, done } = await reader.read()
          if (done) {
            buffer += decoder.decode()
            for (const line of buffer.split(/\r?\n/)) consumeLine(line, processEvent, controller, setLineState)
            if (!finished) processEvent(controller)
            if (!finished) controller.enqueue(normalized({ type: 'error' }))
            controller.close()
            finished = true
            reader.releaseLock()
            return
          }
          buffer += decoder.decode(value, { stream: true })
          let newline = buffer.indexOf('\n')
          while (newline >= 0) {
            const line = buffer.slice(0, newline).replace(/\r$/, '')
            buffer = buffer.slice(newline + 1)
            consumeLine(line, processEvent, controller, setLineState)
            if (finished) break
            newline = buffer.indexOf('\n')
          }
          if (finished) {
            controller.close()
            reader.cancel().catch(() => undefined)
            reader.releaseLock()
            return
          }
          if (controller.desiredSize !== null && controller.desiredSize <= 0) return
        }
      } catch {
        if (!finished) controller.enqueue(normalized({ type: 'error' }))
        controller.close()
        finished = true
        reader.cancel().catch(() => undefined)
        reader.releaseLock()
      }
    },
    cancel(reason) {
      finished = true
      return reader.cancel(reason)
    },
  })

  function setLineState(field: 'data' | 'event', value: string) {
    if (field === 'data') dataLines.push(value)
    else eventName = value
  }
}

function consumeLine(
  line: string,
  processEvent: (controller: ReadableStreamDefaultController<Uint8Array>) => void,
  controller: ReadableStreamDefaultController<Uint8Array>,
  setLine: (field: 'data' | 'event', value: string) => void,
) {
  if (line === '') {
    processEvent(controller)
    return
  }
  if (line.startsWith(':')) return
  const separator = line.indexOf(':')
  const field = separator < 0 ? line : line.slice(0, separator)
  const value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '')
  if (field === 'data') setLine('data', value)
  if (field === 'event') setLine('event', value)
}

function streamDelta(family: ApiFamily, eventName: string, payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const value = payload as Record<string, unknown>
  if (family === 'openai-chat') {
    const choices = Array.isArray(value.choices) ? value.choices : []
    const delta = (choices[0] as { delta?: { content?: unknown } } | undefined)?.delta?.content
    if (typeof delta === 'string') return delta
    if (Array.isArray(delta)) return delta.flatMap((part) => part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string' ? [(part as { text: string }).text] : []).join('')
    return undefined
  }
  if (family === 'openai-responses') {
    return eventName === 'response.output_text.delta' && typeof value.delta === 'string' ? value.delta : undefined
  }
  if (family === 'anthropic') {
    const delta = value.delta as { type?: unknown; text?: unknown } | undefined
    return eventName === 'content_block_delta' && delta?.type === 'text_delta' && typeof delta.text === 'string' ? delta.text : undefined
  }
  const candidates = Array.isArray(value.candidates) ? value.candidates : []
  const text = candidates.flatMap((candidate) => {
    const parts = (candidate as { content?: { parts?: unknown[] } } | undefined)?.content?.parts ?? []
    return parts.flatMap((part) => part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string' ? [(part as { text: string }).text] : [])
  }).join('')
  return text || undefined
}

function googleStreamComplete(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  const candidates = (payload as { candidates?: unknown }).candidates
  return Array.isArray(candidates) && candidates.some((candidate) => candidate && typeof candidate === 'object'
    && typeof (candidate as { finishReason?: unknown }).finishReason === 'string')
}
