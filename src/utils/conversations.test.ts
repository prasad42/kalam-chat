import { describe, expect, it, vi } from 'vitest'
import { createConversation, createExport, createMessage, conversationForImport, replaceUserMessage } from './conversations'

describe('conversation helpers', () => {
  it('creates a conversation with an opaque id and local timestamps', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')
    const conversation = createConversation('arbitrary-model-id', 1234)

    expect(conversation).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      title: 'New conversation',
      modelId: 'arbitrary-model-id',
      messages: [],
      createdAt: 1234,
      updatedAt: 1234,
    })
    vi.restoreAllMocks()
  })

  it('edits a user message and truncates the later branch', () => {
    const conversation = {
      ...createConversation('model'),
      messages: [
        createMessage('user', 'first', 1),
        createMessage('assistant', 'answer', 2),
        createMessage('user', 'follow up', 3),
        createMessage('assistant', 'later answer', 4),
      ],
    }
    const edited = replaceUserMessage(conversation, conversation.messages[0]!.id, 'revised prompt', 5)

    expect(edited.messages).toHaveLength(1)
    expect(edited.messages[0]).toMatchObject({ role: 'user', content: 'revised prompt', createdAt: 5 })
    expect(edited.title).toBe('revised prompt')
    expect(edited.updatedAt).toBe(5)
  })

  it('round-trips Kalam JSON exports and rejects unknown formats', () => {
    const conversation = createConversation('opaque-model')
    const exported = createExport([conversation], '2026-10-04T00:00:00.000Z')
    const imported = conversationForImport(JSON.parse(JSON.stringify(exported)))

    expect(imported).toEqual([conversation])
    expect(() => conversationForImport({ format: 'other', version: 1, conversations: [] })).toThrow(/supported Kalam export/)
  })
})
