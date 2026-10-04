import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequest } from './[[path]]'

afterEach(() => vi.unstubAllGlobals())

describe('Pages API proxy', () => {
  it('fails closed when the application API origin is unset', async () => {
    const request = new Request('https://kalam.pages.dev/api/models')
    const response = await onRequest({ request, env: {}, params: { path: 'models' } })

    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('not configured') })
  })

  it('rejects an insecure application API origin without forwarding requests', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = await onRequest({
      request: new Request('https://kalam.pages.dev/api/models'),
      env: { KALAM_API_ORIGIN: 'http://api.example.net' },
      params: { path: 'models' },
    })

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('not configured correctly') })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('allows only declared API paths and methods', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const unknown = await onRequest({
      request: new Request('https://kalam.pages.dev/api/admin'),
      env: { KALAM_API_ORIGIN: 'https://api.example.net' },
      params: { path: 'admin' },
    })
    const wrongMethod = await onRequest({
      request: new Request('https://kalam.pages.dev/api/chat', { method: 'GET' }),
      env: { KALAM_API_ORIGIN: 'https://api.example.net' },
      params: { path: 'chat' },
    })

    expect(unknown.status).toBe(404)
    expect(wrongMethod.status).toBe(405)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards chat to the configured application API, not a browser-supplied host', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: {"type":"done"}\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const request = new Request('https://kalam.pages.dev/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.2' },
      body: JSON.stringify({ model: 'opaque-id', messages: [] }),
    })
    const response = await onRequest({
      request,
      env: { KALAM_API_ORIGIN: 'https://api.example.net' },
      params: { path: 'chat' },
    })
    const upstreamRequest = fetchMock.mock.calls[0]?.[0] as Request

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(upstreamRequest.url).toBe('https://api.example.net/api/chat')
    expect(upstreamRequest.headers.has('x-forwarded-for')).toBe(false)
    await expect(upstreamRequest.json()).resolves.toMatchObject({ model: 'opaque-id' })
  })
})
