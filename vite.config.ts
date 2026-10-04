import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function developmentApi(): Plugin {
  return {
    name: 'kalam-development-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
        if (pathname !== '/api/models' && pathname !== '/api/chat') return next()
        response.setHeader('Cache-Control', 'no-store')
        response.setHeader('X-Content-Type-Options', 'nosniff')

        if (pathname === '/api/models') {
          if (request.method !== 'GET') {
            response.writeHead(405, { Allow: 'GET', 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }
          response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({
            models: [
              { id: 'mock-reasoning', name: 'Reasoning (mock)', description: 'A development model for careful, step-by-step answers.', capabilities: { streaming: true, vision: false, attachments: false } },
              { id: 'mock-compact', name: 'Compact (mock)', description: 'A quicker development model for concise answers.', capabilities: { streaming: true, vision: false, attachments: false } },
              { id: 'mock-long-context', name: 'Long context (mock)', description: 'A development model for exploring longer prompts.', capabilities: { streaming: true, vision: true, attachments: false } },
            ],
          }))
          return
        }

        if (request.method !== 'POST') {
          response.writeHead(405, { Allow: 'POST', 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let payload: { model?: unknown; messages?: Array<{ role?: unknown; content?: unknown }> }
        try {
          const chunks: Buffer[] = []
          for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as typeof payload
        } catch {
          response.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Malformed request' }))
          return
        }

        if (!payload || typeof payload.model !== 'string' || !Array.isArray(payload.messages)) {
          response.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Malformed request' }))
          return
        }
        if (payload.model === 'unavailable') {
          response.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ code: 'model_unavailable' }))
          return
        }
        const prompt = [...payload.messages].reverse().find((message) => message.role === 'user')?.content
        if (typeof prompt !== 'string') {
          response.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'A user message is required' }))
          return
        }
        if (prompt.startsWith('!error')) {
          response.writeHead(503, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'mock generation failure' }))
          return
        }
        if (prompt.length > 80_000) {
          response.writeHead(413, { 'Content-Type': 'application/json' }).end(JSON.stringify({ code: 'context_too_large' }))
          return
        }

        const slow = prompt.startsWith('!slow')
        const responseText = [
          `You asked: **${prompt.replace(/^!(?:slow)\s*/, '').slice(0, 240)}**`,
          '',
          'For a one-dimensional harmonic oscillator, the energy levels are',
          '',
          '$$',
          'E_n = \\hbar\\omega\\left(n + \\frac{1}{2}\\right).',
          '$$',
          '',
          'A small TypeScript example:',
          '',
          '```ts',
          'const phase = Math.exp(-1i * omega * time);',
          '```',
          '',
          'This deterministic development response demonstrates streaming, Markdown, equations, and code. Connect a compatible Kalam application API for real conversations.',
        ].join('\n')
        response.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        })
        let closed = false
        response.on('close', () => { closed = true })
        const pieces = responseText.match(/.{1,5}/gs) ?? []
        for (const text of pieces) {
          if (closed) break
          response.write(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`)
          await new Promise((resolve) => setTimeout(resolve, slow ? 90 : 12))
        }
        if (!closed) response.end('data: {"type":"done"}\n\n')
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), developmentApi()],
})
