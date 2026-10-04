import { beforeEach, describe, expect, it } from 'vitest'
import { clearAllConversations, createConversation, deleteConversation, getConversation, listConversations, saveConversation } from './conversations'
import { createConversation as newConversation } from '../utils/conversations'

describe('IndexedDB conversation storage', () => {
  beforeEach(async () => clearAllConversations())

  it('creates, reads, lists, updates, and deletes conversations', async () => {
    const first = newConversation('one', 1)
    const second = newConversation('two', 2)
    await createConversation(first)
    await createConversation(second)

    expect(await getConversation(first.id)).toEqual(first)
    expect((await listConversations()).map((item) => item.id)).toEqual([second.id, first.id])

    const changed = { ...first, title: 'Renamed locally', updatedAt: 3 }
    await saveConversation(changed)
    expect((await getConversation(first.id))?.title).toBe('Renamed locally')
    await deleteConversation(second.id)
    expect((await listConversations()).map((item) => item.id)).toEqual([first.id])
  })
})
