import { ApiError, connectionHeaders, errorFromResponse, isAbortError } from './client'
import type { ApiConnection, ChatRequest, StreamEvent } from '../types/transport'

export interface StreamChatOptions {
  request: ChatRequest
  connection: ApiConnection
  signal: AbortSignal
  onToken: (text: string) => void
}

export async function streamChat({ request, connection, signal, onToken }: StreamChatOptions): Promise<void> {
  let response: Response
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      credentials: 'same-origin',
      headers: new Headers({
        ...Object.fromEntries(connectionHeaders(connection)),
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(request),
      signal,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError('The connection was interrupted before a response arrived.', { cause: error })
  }

  if (!response.ok) throw await errorFromResponse(response)
  if (!response.body) throw new ApiError('The application server did not provide a response stream.')
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('text/event-stream')) {
    throw new ApiError('The application server returned an unexpected response format.')
  }

  const reader = response.body.getReader()
  const cancelReader = () => { void reader.cancel().catch(() => undefined) }
  signal.addEventListener('abort', cancelReader, { once: true })
  const decoder = new TextDecoder()
  let buffer = ''
  let dataLines: string[] = []
  let finished = false

  const dispatch = () => {
    if (dataLines.length === 0) return
    const data = dataLines.join('\n')
    dataLines = []
    if (data === '[DONE]') {
      finished = true
      return
    }
    let event: StreamEvent
    try {
      event = JSON.parse(data) as StreamEvent
    } catch (error) {
      throw new ApiError('The application server sent a malformed response stream.', { cause: error })
    }
    if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
      throw new ApiError('The application server sent a malformed response stream.')
    }
    if (event.type === 'delta' && typeof event.text === 'string') {
      onToken(event.text)
    } else if (event.type === 'done') {
      finished = true
    } else if (event.type === 'error') {
      throw new ApiError('The model could not complete this response.')
    } else {
      throw new ApiError('The application server sent an unsupported response event.')
    }
  }

  try {
    while (!finished) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let newline = buffer.indexOf('\n')
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '')
        buffer = buffer.slice(newline + 1)
        if (line === '') dispatch()
        else if (!line.startsWith(':')) {
          const separator = line.indexOf(':')
          const field = separator < 0 ? line : line.slice(0, separator)
          const value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '')
          if (field === 'data') dataLines.push(value)
        }
        if (finished) break
        newline = buffer.indexOf('\n')
      }
    }
    if (!finished) {
      buffer += decoder.decode()
      for (const line of buffer.split(/\r?\n/)) {
        if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
      }
      dispatch()
    }
    if (!finished) throw new ApiError('The response stream ended unexpectedly. The partial answer has been kept; you can retry.')
  } catch (error) {
    if (signal.aborted) throw new DOMException('The request was cancelled.', 'AbortError')
    if (isAbortError(error)) throw error
    if (error instanceof ApiError) throw error
    throw new ApiError('The response stream was interrupted. The partial answer has been kept; you can retry.', { cause: error })
  } finally {
    signal.removeEventListener('abort', cancelReader)
    if (!finished) void reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
