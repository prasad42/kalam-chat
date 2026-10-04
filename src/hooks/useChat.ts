import { useCallback, useEffect, useRef, useState } from 'react'
import { streamChat } from '../api/chat'
import { ApiError, isAbortError } from '../api/client'
import {
  createMessage,
  createConversation as makeConversation,
  replaceUserMessage,
  titleFromMessage,
} from '../utils/conversations'
import type { Conversation, Message, Model } from '../types/domain'
import {
  clearAllConversations as clearStoredConversations,
  createConversation as persistNewConversation,
  deleteConversation as removeStoredConversation,
  importConversations as importStoredConversations,
  listConversations,
  saveConversation,
} from '../storage/conversations'

function friendlyError(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message.includes('invalid model')) return error.message
  return 'The response could not be completed. Your conversation is saved locally; you can retry.'
}

export function useChat(models: Model[], defaultModelId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const conversationsRef = useRef<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeIdRef = useRef<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const saveTimerRef = useRef<number | undefined>(undefined)
  const latestStreamingConversation = useRef<Conversation | null>(null)

  const setActive = useCallback((id: string | null) => {
    activeIdRef.current = id
    setActiveId(id)
    setError(null)
  }, [])

  const updateConversation = useCallback((conversation: Conversation) => {
    const next = [conversation, ...conversationsRef.current.filter((item) => item.id !== conversation.id)]
      .sort((a, b) => b.updatedAt - a.updatedAt)
    conversationsRef.current = next
    setConversations(next)
    return next
  }, [])

  const persist = useCallback(async (conversation: Conversation) => {
    updateConversation(conversation)
    try {
      await saveConversation(conversation)
      setStorageError(null)
    } catch {
      setStorageError('Local storage is unavailable. This conversation may not survive a refresh.')
    }
  }, [updateConversation])

  const flushScheduledSave = useCallback(async () => {
    if (saveTimerRef.current !== undefined) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = undefined
    const latest = latestStreamingConversation.current
    latestStreamingConversation.current = null
    if (latest) await persist(latest)
  }, [persist])

  useEffect(() => {
    let alive = true
    void listConversations().then((items) => {
      if (!alive) return
      conversationsRef.current = items
      setConversations(items)
      if (items[0]) setActive(items[0].id)
    }).catch(() => {
      if (alive) setStorageError('Local conversation storage could not be opened.')
    }).finally(() => {
      if (alive) setLoaded(true)
    })
    return () => {
      alive = false
      if (saveTimerRef.current !== undefined) window.clearTimeout(saveTimerRef.current)
      controllerRef.current?.abort()
    }
  }, [setActive])

  const activeConversation = conversations.find((conversation) => conversation.id === activeId) ?? null

  const newConversation = useCallback(async (modelId = defaultModelId || models[0]?.id || '') => {
    controllerRef.current?.abort()
    controllerRef.current = null
    busyRef.current = false
    setBusy(false)
    await flushScheduledSave()
    const conversation = makeConversation(modelId)
    await persistNewConversation(conversation).catch(() => setStorageError('Local conversation storage is unavailable.'))
    updateConversation(conversation)
    setActive(conversation.id)
    return conversation
  }, [defaultModelId, flushScheduledSave, models, setActive, updateConversation])

  const selectConversation = useCallback((id: string) => setActive(id), [setActive])

  const updateModel = useCallback(async (modelId: string) => {
    const conversation = conversationsRef.current.find((item) => item.id === activeIdRef.current)
    if (!conversation || conversation.modelId === modelId) return
    await persist({ ...conversation, modelId, updatedAt: Date.now() })
  }, [persist])

  const renameConversation = useCallback(async (id: string, title: string) => {
    const conversation = conversationsRef.current.find((item) => item.id === id)
    const cleanTitle = title.trim().slice(0, 80)
    if (!conversation || !cleanTitle) return
    await persist({ ...conversation, title: cleanTitle, updatedAt: Date.now() })
  }, [persist])

  const deleteConversation = useCallback(async (id: string) => {
    if (id === activeIdRef.current && controllerRef.current) {
      controllerRef.current.abort()
      controllerRef.current = null
      busyRef.current = false
      setBusy(false)
    }
    if (saveTimerRef.current !== undefined) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = undefined
    latestStreamingConversation.current = null
    try {
      await removeStoredConversation(id)
      const next = conversationsRef.current.filter((item) => item.id !== id)
      conversationsRef.current = next
      setConversations(next)
      if (activeIdRef.current === id) setActive(next[0]?.id ?? null)
      setError(null)
    } catch {
      setStorageError('This conversation could not be deleted from local storage.')
    }
  }, [setActive])

  const startGeneration = useCallback(async (conversation: Conversation, messages: Message[]): Promise<boolean> => {
    if (busyRef.current) return false
    let current = conversation
    if (!current.modelId) {
      const fallbackModel = models.find((model) => model.id === defaultModelId) ?? models[0]
      if (!fallbackModel) {
        setError('No models are available. Check the application API and try again.')
        return false
      }
      current = { ...current, modelId: fallbackModel.id }
    } else if (!models.some((model) => model.id === current.modelId)) {
      setError('The model saved for this conversation is unavailable. Choose another model to continue.')
      return false
    }
    busyRef.current = true
    setBusy(true)
    setError(null)
    const controller = new AbortController()
    controllerRef.current = controller
    latestStreamingConversation.current = current
    await persist(current)
    const assistantId = current.messages[current.messages.length - 1]?.id

    function clearPendingSave() {
      if (saveTimerRef.current !== undefined) window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = undefined
      latestStreamingConversation.current = null
    }

    try {
      await streamChat({
        request: {
          conversationId: current.id,
          model: current.modelId,
          messages: messages.map(({ role, content }) => ({ role, content })),
        },
        signal: controller.signal,
        onToken(text) {
          current = {
            ...current,
            messages: current.messages.map((message) => message.id === assistantId
              ? { ...message, content: message.content + text }
              : message),
            updatedAt: Date.now(),
          }
          latestStreamingConversation.current = current
          updateConversation(current)
          if (saveTimerRef.current !== undefined) window.clearTimeout(saveTimerRef.current)
          saveTimerRef.current = window.setTimeout(() => { void flushScheduledSave() }, 350)
        },
      })
      const assistant = current.messages.find((message) => message.id === assistantId)
      if (!assistant?.content.trim()) {
        clearPendingSave()
        current = { ...current, messages: current.messages.filter((message) => message.id !== assistantId) }
        await persist(current)
        setError('The model returned an empty response. You can retry generation.')
        return false
      }
      await flushScheduledSave()
      return true
    } catch (generationError) {
      if (isAbortError(generationError) || controller.signal.aborted) {
        clearPendingSave()
        const assistant = current.messages.find((message) => message.id === assistantId)
        if (!assistant?.content) current = { ...current, messages: current.messages.filter((message) => message.id !== assistantId) }
        if (conversationsRef.current.some((item) => item.id === current.id)) await persist(current)
        return false
      }
      clearPendingSave()
      const assistant = current.messages.find((message) => message.id === assistantId)
      if (!assistant?.content) current = { ...current, messages: current.messages.filter((message) => message.id !== assistantId) }
      await persist(current)
      setError(friendlyError(generationError))
      return false
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
        busyRef.current = false
        setBusy(false)
      }
    }
  }, [defaultModelId, flushScheduledSave, models, persist, updateConversation])

  const send = useCallback(async (content: string, editMessageId?: string): Promise<boolean> => {
    const cleanContent = content.trim()
    if (!cleanContent || busyRef.current) return false
    const modelId = defaultModelId || models[0]?.id || ''
    let conversation = conversationsRef.current.find((item) => item.id === activeIdRef.current)
    if (!conversation) conversation = await newConversation(modelId)

    let base = conversation
    if (editMessageId) {
      base = replaceUserMessage(conversation, editMessageId, cleanContent)
      if (base === conversation) return false
    } else {
      const userMessage = createMessage('user', cleanContent)
      base = {
        ...conversation,
        title: conversation.messages.length === 0 ? titleFromMessage(cleanContent) : conversation.title,
        messages: [...conversation.messages, userMessage],
        updatedAt: Date.now(),
      }
    }
    const assistantMessage = createMessage('assistant', '')
    const prepared = { ...base, messages: [...base.messages, assistantMessage], updatedAt: Date.now() }
    return startGeneration(prepared, base.messages)
  }, [defaultModelId, models, newConversation, startGeneration])

  const regenerateLast = useCallback(async (): Promise<boolean> => {
    if (busyRef.current) return false
    const conversation = conversationsRef.current.find((item) => item.id === activeIdRef.current)
    if (!conversation) return false
    let truncateAt = conversation.messages.length
    for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
      if (conversation.messages[index]?.role === 'assistant') {
        truncateAt = index
        break
      }
      if (conversation.messages[index]?.role === 'user') {
        truncateAt = index + 1
        break
      }
    }
    const messages = conversation.messages.slice(0, truncateAt)
    if (messages.at(-1)?.role !== 'user') return false
    const assistantMessage = createMessage('assistant', '')
    const prepared = { ...conversation, messages: [...messages, assistantMessage], updatedAt: Date.now() }
    return startGeneration(prepared, messages)
  }, [startGeneration])

  const stopGeneration = useCallback(() => controllerRef.current?.abort(), [])

  const clearAll = useCallback(async () => {
    controllerRef.current?.abort()
    controllerRef.current = null
    busyRef.current = false
    setBusy(false)
    if (saveTimerRef.current !== undefined) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = undefined
    latestStreamingConversation.current = null
    await clearStoredConversations()
    conversationsRef.current = []
    setConversations([])
    setActive(null)
    setError(null)
  }, [setActive])

  const importHistory = useCallback(async (imported: Conversation[]) => {
    await importStoredConversations(imported)
    const next = await listConversations()
    conversationsRef.current = next
    setConversations(next)
    if (next[0]) setActive(next[0].id)
  }, [setActive])

  return {
    conversations,
    activeConversation,
    loaded,
    busy,
    error,
    storageError,
    setError,
    newConversation,
    selectConversation,
    updateModel,
    renameConversation,
    deleteConversation,
    send,
    regenerateLast,
    stopGeneration,
    clearAll,
    importHistory,
  }
}
