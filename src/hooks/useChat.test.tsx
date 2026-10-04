import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChat } from './useChat'
import { clearAllConversations } from '../storage/conversations'
import type { Model } from '../types/domain'

const models: Model[] = [{ id: 'opaque-model', name: 'Research', capabilities: { streaming: true } }]

function streamResponse(text: string): Response {
  const encoder = new TextEncoder()
  return new Response(new ReadableStream({
    start(controller) {
      for (let index = 0; index < text.length; index += 4) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: text.slice(index, index + 4) })}\n\n`))
      }
      controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'))
      controller.close()
    },
  }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

describe('chat state', () => {
  beforeEach(async () => {
    vi.unstubAllGlobals()
    await clearAllConversations()
  })

  it('accumulates a stream and truncates later turns when a user message is edited', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(streamResponse('first answer'))
      .mockResolvedValueOnce(streamResponse('second answer'))
      .mockResolvedValueOnce(streamResponse('revised answer')))
    const { result } = renderHook(() => useChat(models, ''))
    await waitFor(() => expect(result.current.loaded).toBe(true))

    let sent = false
    await act(async () => { sent = await result.current.send('first question') })
    expect(sent).toBe(true)
    await act(async () => { sent = await result.current.send('follow up') })
    expect(sent).toBe(true)
    expect(result.current.activeConversation?.messages.map((message) => message.content)).toEqual([
      'first question', 'first answer', 'follow up', 'second answer',
    ])

    const firstUserMessage = result.current.activeConversation!.messages[0]!
    await act(async () => { sent = await result.current.send('revised question', firstUserMessage.id) })

    expect(sent).toBe(true)
    expect(result.current.activeConversation?.messages.map((message) => message.content)).toEqual([
      'revised question', 'revised answer',
    ])
    expect(result.current.activeConversation?.title).toBe('revised question')
  })
})
