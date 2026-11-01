import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequest } from './[[path]]'

afterEach(() => vi.unstubAllGlobals())

function apiRequest(path: 'models' | 'chat', options: {
  method?: 'GET' | 'POST'
  provider?: string
  apiKey?: string
  baseUrl?: string
  body?: unknown
  headers?: Record<string, string>
} = {}) {
  const headers = new Headers(options.headers)
  if (options.provider) headers.set('X-Kalam-Provider', options.provider)
  if (options.apiKey) headers.set('Authorization', `Bearer ${options.apiKey}`)
  if (options.baseUrl) headers.set('X-Kalam-Base-URL', options.baseUrl)
  if (options.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return new Request(`https://kalam.pages.dev/api/${path}`, {
    method: options.method ?? (path === 'models' ? 'GET' : 'POST'),
    headers,
    ...(options.body !== undefined ? { body: typeof options.body === 'string' ? options.body : JSON.stringify(options.body) } : {}),
  })
}

function context(request: Request, path: 'models' | 'chat') {
  return { request, params: { path } }
}

function eventStream(...events: string[]) {
  const encoder = new TextEncoder()
  return new Response(new ReadableStream({
    start(controller) {
      for (const event of events) controller.enqueue(encoder.encode(event))
      controller.close()
    },
  }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

describe('Pages provider API', () => {
  it('requires a provider and API key before making upstream requests', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const noKey = await onRequest(context(apiRequest('models', { provider: 'openai' }), 'models'))
    const unsupportedProvider = await onRequest(context(apiRequest('models', { provider: 'unknown', apiKey: 'secret' }), 'models'))

    expect(noKey.status).toBe(401)
    await expect(noKey.json()).resolves.toMatchObject({ code: 'api_key_required' })
    expect(unsupportedProvider.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches and normalizes OpenCode Zen models using a fixed provider host', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [
      { id: 'zen-chat', object: 'model' },
      { id: 'text-embedding-small', object: 'model' },
    ] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const response = await onRequest(context(apiRequest('models', {
      provider: 'opencode-zen', apiKey: 'user-secret', headers: { 'X-Forwarded-For': '198.51.100.2' },
    }), 'models'))
    const upstreamUrl = new URL(String(fetchMock.mock.calls[0]?.[0]))
    const upstreamInit = fetchMock.mock.calls[0]?.[1] as RequestInit

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ models: [{ id: 'opencode-zen::zen-chat', name: 'zen-chat' }] })
    expect(upstreamUrl.href).toBe('https://opencode.ai/zen/v1/models')
    expect(new Headers(upstreamInit.headers).get('Authorization')).toBe('Bearer user-secret')
    expect(new Headers(upstreamInit.headers).has('X-Forwarded-For')).toBe(false)
    expect(upstreamInit.redirect).toBe('manual')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('uses provider-specific API-key headers for Anthropic and Google', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 'claude-sonnet-4-5', display_name: 'Claude Sonnet' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: [{ name: 'models/gemini-2.5-flash', displayName: 'Gemini Flash', supportedGenerationMethods: ['generateContent'] }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const anthropic = await onRequest(context(apiRequest('models', { provider: 'anthropic', apiKey: 'anthropic-secret' }), 'models'))
    const google = await onRequest(context(apiRequest('models', { provider: 'google', apiKey: 'google-secret' }), 'models'))
    const anthropicInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    const googleInit = fetchMock.mock.calls[1]?.[1] as RequestInit | undefined
    const anthropicHeaders = new Headers(anthropicInit?.headers)
    const googleHeaders = new Headers(googleInit?.headers)

    expect(anthropicHeaders.get('x-api-key')).toBe('anthropic-secret')
    expect(anthropicHeaders.has('Authorization')).toBe(false)
    expect(anthropicHeaders.get('anthropic-version')).toBe('2023-06-01')
    expect(googleHeaders.get('x-goog-api-key')).toBe('google-secret')
    expect(new URL(String(fetchMock.mock.calls[1]?.[0])).href).toBe('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000')
    await expect(anthropic.json()).resolves.toMatchObject({ models: [{ id: 'anthropic::claude-sonnet-4-5' }] })
    await expect(google.json()).resolves.toMatchObject({ models: [{ id: 'google::gemini-2.5-flash' }] })
  })

  it('restricts custom compatible endpoints to HTTPS public hostnames', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 'custom-model' }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const unsafe = await onRequest(context(apiRequest('models', {
      provider: 'openai-compatible', apiKey: 'custom-secret', baseUrl: 'http://127.0.0.1/v1',
    }), 'models'))
    expect(unsafe.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()

    const valid = await onRequest(context(apiRequest('models', {
      provider: 'openai-compatible', apiKey: 'custom-secret', baseUrl: 'https://llm.example.org/v1',
    }), 'models'))
    expect(valid.status).toBe(200)
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).href).toBe('https://llm.example.org/v1/models')
  })

  it('maps OpenAI Responses streaming into Kalam events without exposing provider payloads', async () => {
    const fetchMock = vi.fn().mockResolvedValue(eventStream(
      'event: response.output_text.delta\ndata: {"delta":"Hello"}\n\n',
      'event: response.completed\ndata: {"type":"response.completed"}\n\n',
    ))
    vi.stubGlobal('fetch', fetchMock)
    const response = await onRequest(context(apiRequest('chat', {
      method: 'POST', provider: 'openai', apiKey: 'openai-secret',
      body: { conversationId: 'c1', model: 'openai::gpt-4.1-mini', messages: [{ role: 'user', content: 'Hi' }] },
    }), 'chat'))
    const upstreamUrl = String(fetchMock.mock.calls[0]?.[0])
    const upstreamInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    const body = await new Response(response.body).text()

    expect(response.status).toBe(200)
    expect(upstreamUrl).toBe('https://api.openai.com/v1/responses')
    expect(new Headers(upstreamInit.headers).get('Authorization')).toBe('Bearer openai-secret')
    expect(JSON.parse(String(upstreamInit.body))).toMatchObject({ model: 'gpt-4.1-mini', stream: true })
    expect(body).toContain('data: {"type":"delta","text":"Hello"}')
    expect(body).toContain('data: {"type":"done"}')
    expect(body).not.toContain('response.output_text.delta')
  })

  it('maps Anthropic Messages and Google Gemini streaming responses', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(eventStream(
        'event: content_block_delta\ndata: {"delta":{"type":"text_delta","text":"Anthropic"}}\n\n',
        'event: message_stop\ndata: {"type":"message_stop"}\n\n',
      ))
      .mockResolvedValueOnce(eventStream(
        'data: {"candidates":[{"content":{"parts":[{"text":"Gemini"}]},"finishReason":"STOP"}]}\n\n',
      ))
    vi.stubGlobal('fetch', fetchMock)

    const anthropic = await onRequest(context(apiRequest('chat', {
      method: 'POST', provider: 'anthropic', apiKey: 'anthropic-secret',
      body: { conversationId: 'c3', model: 'anthropic::claude-sonnet-4-5', messages: [{ role: 'user', content: 'Hello' }] },
    }), 'chat'))
    const google = await onRequest(context(apiRequest('chat', {
      method: 'POST', provider: 'google', apiKey: 'google-secret',
      body: { conversationId: 'c4', model: 'google::gemini-2.5-flash', messages: [{ role: 'user', content: 'Hello' }] },
    }), 'chat'))
    const anthropicInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    const googleInit = fetchMock.mock.calls[1]?.[1] as RequestInit | undefined
    const anthropicBody = JSON.parse(String(anthropicInit?.body)) as Record<string, unknown>
    const googleBody = JSON.parse(String(googleInit?.body)) as Record<string, unknown>
    const anthropicStream = await anthropic.text()
    const googleStream = await google.text()

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://api.anthropic.com/v1/messages')
    expect(new Headers(anthropicInit?.headers).get('x-api-key')).toBe('anthropic-secret')
    expect(anthropicBody).toMatchObject({ model: 'claude-sonnet-4-5', max_tokens: 4096, stream: true })
    expect(anthropicStream).toContain('data: {"type":"delta","text":"Anthropic"}')
    expect(anthropicStream).toContain('data: {"type":"done"}')

    expect(String(fetchMock.mock.calls[1]?.[0])).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse')
    expect(new Headers(googleInit?.headers).get('x-goog-api-key')).toBe('google-secret')
    expect(googleBody).toMatchObject({ contents: [{ role: 'user', parts: [{ text: 'Hello' }] }] })
    expect(googleStream).toContain('data: {"type":"delta","text":"Gemini"}')
    expect(googleStream).toContain('data: {"type":"done"}')
  })

  it('routes OpenAI-compatible chat to the user-selected endpoint and rejects oversized bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(eventStream('data: {"choices":[{"delta":{"content":"OK"}}]}\n\ndata: [DONE]\n\n'))
    vi.stubGlobal('fetch', fetchMock)

    const response = await onRequest(context(apiRequest('chat', {
      method: 'POST', provider: 'openai-compatible', apiKey: 'custom-secret', baseUrl: 'https://llm.example.org/v1',
      body: { conversationId: 'c2', model: 'openai-compatible::custom-model', messages: [{ role: 'user', content: 'Test' }] },
    }), 'chat'))
    const oversized = await onRequest(context(apiRequest('chat', {
      method: 'POST', provider: 'openai-compatible', apiKey: 'custom-secret', baseUrl: 'https://llm.example.org/v1',
      body: 'x'.repeat(1_000_001),
    }), 'chat'))

    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).href).toBe('https://llm.example.org/v1/chat/completions')
    expect(oversized.status).toBe(413)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await expect(oversized.json()).resolves.toMatchObject({ code: 'context_too_large' })
    const stream = await response.text()
    expect(stream).toContain('data: {"type":"delta","text":"OK"}')
    expect(stream).toContain('data: {"type":"done"}')
  })

  it('allows only declared API paths and expected methods', async () => {
    const unknown = await onRequest({ request: apiRequest('models'), params: { path: 'admin' } })
    const wrongMethod = await onRequest({ request: apiRequest('chat', { method: 'GET' }), params: { path: 'chat' } })

    expect(unknown.status).toBe(404)
    expect(wrongMethod.status).toBe(405)
    expect(wrongMethod.headers.get('allow')).toBe('POST')
  })
})
