import { getModels, ProviderRequestError, readProviderConfig, streamCompletion } from './providers'

interface FunctionContext {
  request: Request
  params: Record<string, string | string[] | undefined>
}

const NO_STORE = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
const BODY_LIMIT = 1_000_000
const MESSAGE_LIMIT = 100
const MESSAGE_CHAR_LIMIT = 200_000

export async function onRequest({ request, params }: FunctionContext): Promise<Response> {
  const rawPath = params.path
  const segments = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : []
  if (segments.length !== 1 || !['models', 'chat'].includes(segments[0] ?? '')) {
    return json({ error: 'Not found', code: 'not_found' }, 404)
  }
  const endpoint = segments[0]!
  const expectedMethod = endpoint === 'models' ? 'GET' : 'POST'
  if (request.method !== expectedMethod) {
    return new Response(JSON.stringify({ error: 'Method not allowed', code: 'method_not_allowed' }), {
      status: 405,
      headers: { ...NO_STORE, Allow: expectedMethod, 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  try {
    const config = readProviderConfig(request)
    if (endpoint === 'models') {
      const models = await getModels(config, request.signal)
      return json({ models }, 200)
    }

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().startsWith('application/json')) {
      throw new ProviderRequestError(415, 'invalid_request', 'Chat requests must use JSON.')
    }
    const payload = parseChatPayload(await readLimitedBody(request))
    return await streamCompletion(request, config, payload)
  } catch (error) {
    if (error instanceof ProviderRequestError) {
      return json({ error: error.message, code: error.code }, error.status)
    }
    if (request.signal.aborted) return json({ error: 'Request cancelled.', code: 'request_cancelled' }, 499)
    return json({ error: 'The provider could not complete the request.', code: 'provider_error' }, 502)
  }
}

async function readLimitedBody(request: Request): Promise<string> {
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > BODY_LIMIT) {
    throw new ProviderRequestError(413, 'context_too_large', 'The chat request is too large.')
  }
  if (!request.body) throw new ProviderRequestError(400, 'invalid_request', 'The chat request body is missing.')

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > BODY_LIMIT) {
        await reader.cancel()
        throw new ProviderRequestError(413, 'context_too_large', 'The chat request is too large.')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new ProviderRequestError(400, 'invalid_request', 'The chat request must be UTF-8 JSON.')
  }
}

function parseChatPayload(body: string): { conversationId: string; model: string; messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> } {
  let value: unknown
  try {
    value = JSON.parse(body) as unknown
  } catch {
    throw new ProviderRequestError(400, 'invalid_request', 'The chat request is not valid JSON.')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ProviderRequestError(400, 'invalid_request', 'The chat request is invalid.')
  }
  const payload = value as Record<string, unknown>
  if (typeof payload.conversationId !== 'string' || payload.conversationId.length > 200
    || typeof payload.model !== 'string' || payload.model.length > 500
    || !Array.isArray(payload.messages) || payload.messages.length < 1 || payload.messages.length > MESSAGE_LIMIT) {
    throw new ProviderRequestError(400, 'invalid_request', 'The chat request is invalid.')
  }

  let totalCharacters = 0
  const messages = payload.messages.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new ProviderRequestError(400, 'invalid_request', 'The chat request contains an invalid message.')
    }
    const message = entry as Record<string, unknown>
    if ((message.role !== 'user' && message.role !== 'assistant' && message.role !== 'system')
      || typeof message.content !== 'string' || message.content.length > MESSAGE_CHAR_LIMIT) {
      throw new ProviderRequestError(400, 'invalid_request', 'The chat request contains an invalid message.')
    }
    totalCharacters += message.content.length
    if (totalCharacters > BODY_LIMIT) {
      throw new ProviderRequestError(413, 'context_too_large', 'The chat request is too large.')
    }
    return { role: message.role as 'user' | 'assistant' | 'system', content: message.content }
  })

  return { conversationId: payload.conversationId, model: payload.model, messages }
}

function json(payload: { error?: string; code?: string; models?: unknown }, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...NO_STORE, 'Content-Type': 'application/json; charset=utf-8' },
  })
}
