interface FunctionEnv {
  KALAM_API_ORIGIN?: string
}

interface FunctionContext {
  request: Request
  env: FunctionEnv
  params: Record<string, string | string[] | undefined>
}

const NO_STORE = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }

export async function onRequest({ request, env, params }: FunctionContext): Promise<Response> {
  const rawPath = params.path
  const segments = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : []
  if (segments.length !== 1 || !['models', 'chat'].includes(segments[0] ?? '')) {
    return json({ error: 'Not found' }, 404)
  }
  const endpoint = segments[0]!
  const expectedMethod = endpoint === 'models' ? 'GET' : 'POST'
  if (request.method !== expectedMethod) {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...NO_STORE, Allow: expectedMethod, 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const configuredOrigin = env.KALAM_API_ORIGIN
  if (!configuredOrigin) return json({ error: 'The Kalam application API is not configured.' }, 503)

  let origin: URL
  try {
    origin = new URL(configuredOrigin)
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
      return json({ error: 'The Kalam application API is not configured correctly.' }, 503)
    }
  } catch {
    return json({ error: 'The Kalam application API is not configured correctly.' }, 503)
  }

  const incomingUrl = new URL(request.url)
  const upstreamUrl = new URL(`/api/${endpoint}${incomingUrl.search}`, origin)
  const headers = new Headers(request.headers)
  for (const name of ['host', 'content-length', 'connection', 'cf-connecting-ip', 'cf-ipcountry', 'x-forwarded-for', 'x-real-ip']) {
    headers.delete(name)
  }

  try {
    const upstreamRequest = new Request(upstreamUrl, {
      method: request.method,
      headers,
      ...(request.method === 'GET' ? {} : { body: request.body }),
      redirect: 'manual',
      ...(request.method === 'GET' ? {} : { duplex: 'half' }),
    } as RequestInit & { duplex?: 'half' })
    const upstream = await fetch(upstreamRequest)
    const responseHeaders = new Headers(upstream.headers)
    for (const name of ['content-length', 'content-encoding', 'transfer-encoding']) responseHeaders.delete(name)
    for (const [name, value] of Object.entries(NO_STORE)) responseHeaders.set(name, value)
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders })
  } catch {
    return json({ error: 'The Kalam application server could not be reached.' }, 502)
  }
}

function json(payload: { error: string }, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...NO_STORE, 'Content-Type': 'application/json; charset=utf-8' },
  })
}
