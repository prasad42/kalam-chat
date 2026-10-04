import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { clearAllConversations } from './storage/conversations'

function streamResponse(text: string): Response {
  const encoder = new TextEncoder()
  return new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`))
      controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'))
      controller.close()
    },
  }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

describe('Kalam chat UI', () => {
  afterEach(() => {
    cleanup()
    document.querySelector('meta[name="theme-color"]')?.remove()
  })

  beforeEach(async () => {
    vi.unstubAllGlobals()
    await clearAllConversations()
  })

  it('loads API models and displays a streamed local conversation', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      if (String(input) === '/api/models') {
        return Promise.resolve(new Response(JSON.stringify({
          models: [{ id: 'opaque-model', name: 'Research model', description: 'A short API-supplied description.', capabilities: { streaming: true } }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      }
      return Promise.resolve(streamResponse('The answer is **42**.'))
    }))
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findAllByText('A short API-supplied description.')).not.toHaveLength(0)
    const composer = screen.getByRole('textbox', { name: 'Message Kalam' })
    await user.type(composer, 'What is the answer?')
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    await waitFor(() => {
      const assistantContent = document.querySelector('.message-assistant .message-content')
      expect(assistantContent?.textContent).toContain('42')
    }, { timeout: 5000 })
    expect(screen.getAllByText('What is the answer?').length).toBeGreaterThan(0)
    expect(await screen.findByRole('button', { name: 'Regenerate response' })).toBeInTheDocument()
  })

  it('keeps browser chrome in sync with the selected theme', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ models: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))
    const themeColor = document.createElement('meta')
    themeColor.name = 'theme-color'
    themeColor.content = '#1c1e1b'
    document.head.append(themeColor)
    const user = userEvent.setup()
    render(<App />)

    await screen.findByText('No models are available from the application API.')
    expect(themeColor.content).toBe('#1c1e1b')
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: 'Light' }))
    expect(themeColor.content).toBe('#fbfaf7')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    themeColor.remove()
  })
})
