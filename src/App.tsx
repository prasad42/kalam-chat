import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Menu, PanelLeftClose, PenLine, RotateCcw } from 'lucide-react'
import { ApiError } from './api/client'
import { loadModels } from './api/models'
import { ChatMessage } from './components/ChatMessage'
import { Composer } from './components/Composer'
import { ModelSelect } from './components/ModelSelect'
import { SettingsPanel } from './components/SettingsPanel'
import { Sidebar } from './components/Sidebar'
import { useChat } from './hooks/useChat'
import { getSettings, saveSettings } from './storage/settings'
import { DEFAULT_SETTINGS, type Model, type Settings } from './types/domain'
import './App.css'

const SUGGESTIONS = [
  'Explain a difficult idea clearly',
  'Help me think through a result',
  'Draft a technical note',
]

function App() {
  const [models, setModels] = useState<Model[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [modelRequest, setModelRequest] = useState(0)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const chat = useChat(models, settings.defaultModelId)
  const scrollRef = useRef<HTMLDivElement>(null)
  const active = chat.activeConversation

  useEffect(() => {
    const controller = new AbortController()
    let alive = true
    void loadModels(controller.signal).then((loaded) => {
      if (alive) setModels(loaded)
    }).catch((error: unknown) => {
      if (!alive || controller.signal.aborted) return
      setModelsError(error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Models could not be loaded.')
    }).finally(() => {
      if (alive) setModelsLoading(false)
    })
    void getSettings().then((saved) => { if (alive) setSettings(saved) }).catch(() => undefined)
    return () => {
      alive = false
      controller.abort()
    }
  }, [modelRequest])

  useEffect(() => {
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const systemTheme = settings.theme === 'system' ? window.matchMedia('(prefers-color-scheme: dark)') : null
    const syncTheme = () => {
      if (settings.theme === 'system') document.documentElement.removeAttribute('data-theme')
      else document.documentElement.dataset.theme = settings.theme

      const dark = settings.theme === 'dark' || (settings.theme === 'system' && systemTheme?.matches === true)
      themeColor?.setAttribute('content', dark ? '#1c1e1b' : '#fbfaf7')
    }

    syncTheme()
    systemTheme?.addEventListener('change', syncTheme)
    return () => systemTheme?.removeEventListener('change', syncTheme)
  }, [settings.theme])

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [active?.messages])

  useEffect(() => {
    const createNewConversation = chat.newConversation
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        void createNewConversation()
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [chat.newConversation])

  const currentModelId = useMemo(() => {
    if (active?.modelId) return models.some((model) => model.id === active.modelId) ? active.modelId : ''
    if (models.some((model) => model.id === settings.defaultModelId)) return settings.defaultModelId
    return models[0]?.id ?? ''
  }, [active, models, settings.defaultModelId])

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next)
    void saveSettings(next).catch(() => undefined)
  }, [])

  async function sendDraft() {
    const content = draft.trim()
    if (!content) return
    setDraft('')
    const sent = await chat.send(content, editingMessageId ?? undefined)
    if (sent) setEditingMessageId(null)
    else setDraft((current) => current || content)
  }

  function beginEdit(message: { id: string; content: string }) {
    setEditingMessageId(message.id)
    setDraft(message.content)
  }

  function handleModelChange(modelId: string) {
    if (active) void chat.updateModel(modelId)
    else updateSettings({ ...settings, defaultModelId: modelId })
  }

  async function retryGeneration() {
    const draftAtRetry = draft.trim()
    const retried = await chat.regenerateLast()
    const lastUserMessage = [...(active?.messages ?? [])].reverse().find((message) => message.role === 'user')
    if (retried && !editingMessageId && lastUserMessage?.content === draftAtRetry) setDraft('')
  }

  const lastMessage = active?.messages.at(-1)
  const showWelcome = !active || active.messages.length === 0

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {menuOpen && <button className="drawer-scrim" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <div className={`sidebar-wrap ${menuOpen ? 'sidebar-wrap-open' : ''}`}>
        <Sidebar
          conversations={chat.conversations}
          activeId={active?.id ?? null}
          onSelect={(id) => { chat.selectConversation(id); setEditingMessageId(null) }}
          onNew={() => { void chat.newConversation(); setDraft(''); setEditingMessageId(null) }}
          onRename={(id, title) => { void chat.renameConversation(id, title) }}
          onDelete={(id) => { if (id === active?.id) { setEditingMessageId(null); setDraft('') }; void chat.deleteConversation(id) }}
          onSettings={() => setSettingsOpen(true)}
          onClose={menuOpen ? () => setMenuOpen(false) : undefined}
        />
      </div>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Open conversations menu"><Menu size={19} /></button>
            <button className="icon-button desktop-collapse-button" type="button" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} aria-label="Toggle conversation sidebar"><PanelLeftClose size={17} /></button>
            <div className="topbar-title">
              <span className="topbar-conversation-title">{active?.title ?? 'Kalam'}</span>
              <span className="topbar-subtitle">{models.find((model) => model.id === currentModelId)?.description ?? 'A quieter space to think'}</span>
            </div>
          </div>
          <div className="topbar-right">
            <ModelSelect models={models} value={currentModelId} onChange={handleModelChange} disabled={chat.busy} unavailable={Boolean(active?.modelId && !models.some((model) => model.id === active.modelId))} />
          </div>
        </header>

        {(modelsError || chat.error || chat.storageError) && (
          <div className="notice-stack" role="status">
            {modelsError && <div className="notice notice-error"><span>{modelsError}</span><button type="button" onClick={() => { setModelsLoading(true); setModelsError(null); setModelRequest((value) => value + 1) }}><RotateCcw size={14} />Retry models</button></div>}
            {chat.error && <div className="notice notice-error"><span>{chat.error}</span><div><button type="button" onClick={() => void retryGeneration()} disabled={chat.busy}><RotateCcw size={14} />Retry</button><button type="button" className="notice-dismiss" onClick={() => chat.setError(null)} aria-label="Dismiss error">×</button></div></div>}
            {chat.storageError && <div className="notice notice-warning"><span>{chat.storageError}</span></div>}
          </div>
        )}

        <div className={`conversation-scroll ${showWelcome ? 'conversation-scroll-welcome' : ''}`} ref={scrollRef}>
          {chat.loaded && !modelsLoading ? (
            showWelcome ? (
              <section className="welcome" aria-labelledby="welcome-title">
                <div className="welcome-mark"><PenLine size={17} strokeWidth={1.6} /></div>
                <h1 id="welcome-title">What would you like<br className="welcome-break" /> to understand?</h1>
                <p className="welcome-copy">A clear space for questions, ideas, and careful thinking.</p>
                {currentModelId && <p className="welcome-model"><strong>{models.find((model) => model.id === currentModelId)?.name}</strong><span>{models.find((model) => model.id === currentModelId)?.description}</span></p>}
                <div className="suggestion-list" aria-label="Suggested prompts">
                  {SUGGESTIONS.map((suggestion) => (
                    <button type="button" key={suggestion} onClick={() => setDraft(suggestion)}>{suggestion}<span aria-hidden="true">↗</span></button>
                  ))}
                </div>
              </section>
            ) : (
              <section className="message-list" aria-label="Conversation messages" role="log" aria-live="polite" aria-relevant="additions text">
                {active?.messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLastAssistant={!chat.busy && lastMessage?.id === message.id && message.role === 'assistant'}
                    onEdit={!chat.busy && message.role === 'user' ? beginEdit : undefined}
                    onRegenerate={!chat.busy && message.role === 'assistant' && lastMessage?.id === message.id ? () => { void chat.regenerateLast() } : undefined}
                  />
                ))}
                <div className="scroll-anchor" aria-hidden="true" />
              </section>
            )
          ) : (
            <div className="loading-state" role="status"><span className="loading-line" />Preparing your workspace…</div>
          )}
        </div>

        <footer className="composer-area">
          {!modelsLoading && models.length === 0 && !modelsError && <p className="model-empty-hint">No models are available from the application API.</p>}
          <Composer
            value={draft}
            onChange={setDraft}
            onSend={() => { void sendDraft() }}
            onStop={chat.stopGeneration}
            busy={chat.busy}
            disabled={models.length === 0 || modelsLoading}
            enterToSend={settings.enterToSend}
            editing={editingMessageId !== null}
            onCancelEdit={() => { setEditingMessageId(null); setDraft('') }}
          />
        </footer>
      </main>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          models={models}
          conversations={chat.conversations}
          onChange={updateSettings}
          onImport={async (items) => { await chat.importHistory(items); setEditingMessageId(null); setDraft('') }}
          onClear={async () => { await chat.clearAll(); setEditingMessageId(null); setDraft('') }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}

export default App
