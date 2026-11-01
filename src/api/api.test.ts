import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './client'
import { loadModels } from './models'
import { streamChat } from './stream'

const request = {
  conversationId: 'conversation-1',
  model: 'opaque-model-id',
  messages: [{ role: 'user' as const, content: 'Explain the result.' }],
}
const connection = { provider: 'opencode-zen' as const, apiKey: 'test-key' }

function eventStream(...events: string[]) {
  const encoder = new TextEncoder()
  return new Response(new ReadableStream({
    start(controller) {
      for (const event of events) controller.enqueue(encoder.encode(event))
      controller.close()
    },
  }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

afterEach(() => vi.unstubAllGlobals())

describe('models API boundary', () => {
  it('loads models from the application API without interpreting ids', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      models: [{ id: 'provider-looking-but-opaque', name: 'Presented name', capabilities: { streaming: true } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadModels(connection)).resolves.toEqual([{
      id: 'provider-looking-but-opaque',
      name: 'Presented name',
      capabilities: { streaming: true },
    }])
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer test-key')
    expect(new Headers(init.headers).get('X-Kalam-Provider')).toBe('opencode-zen')
  })

  it('rejects malformed model payloads and maps authorization failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"items":[]}', { status: 200 })))
    await expect(loadModels(connection)).rejects.toThrow(/invalid model list/)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })))
    await expect(loadModels(connection)).rejects.toThrow(/not authorised/)
  })
})

describe('normalised chat stream', () => {
  it('accumulates SSE deltas and completes on a done event', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(eventStream(
      'data: {"type":"delta","text":"First "}\n\n',
      'data: {"type":"delta","text":"second."}\n\n',
      'data: {"type":"done"}\n\n',
    )))
    let accumulated = ''

    await streamChat({ request, connection, signal: new AbortController().signal, onToken: (text) => { accumulated += text } })

    expect(accumulated).toBe('First second.')
  })

  it('reports incomplete streams and malformed stream events', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(eventStream('data: {"type":"delta","text":"partial"}\n\n')))
    await expect(streamChat({ request, connection, signal: new AbortController().signal, onToken: () => undefined })).rejects.toThrow(/ended unexpectedly/)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(eventStream('data: {broken json}\n\n')))
    await expect(streamChat({ request, connection, signal: new AbortController().signal, onToken: () => undefined })).rejects.toThrow(/malformed response stream/)
  })

  it('cancels a live stream when its AbortSignal fires', async () => {
    const encoder = new TextEncoder()
    let streamController: ReadableStreamDefaultController<Uint8Array> | undefined
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({
      start(controller) {
        streamController = controller
        controller.enqueue(encoder.encode('data: {"type":"delta","text":"partial"}\n\n'))
      },
    }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })))
    const abort = new AbortController()
    let receivedToken!: () => void
    const received = new Promise<void>((resolve) => { receivedToken = resolve })
    const generation = streamChat({ request, connection, signal: abort.signal, onToken: receivedToken })
    await received
    abort.abort()

    await expect(generation).rejects.toMatchObject({ name: 'AbortError' })
    expect(streamController).toBeDefined()
  })

  it('maps request failures to readable errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'context_too_large' }), { status: 413 })))
    await expect(streamChat({ request, connection, signal: new AbortController().signal, onToken: () => undefined }))
      .rejects.toEqual(expect.objectContaining({ name: 'ApiError', message: expect.stringMatching(/too large/) }))

    expect(new ApiError('safe').message).toBe('safe')
  })
})
