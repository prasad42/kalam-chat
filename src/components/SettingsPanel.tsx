import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Download, HardDrive, Monitor, Moon, Sun, X } from 'lucide-react'
import type { Conversation, Model, Settings } from '../types/domain'
import { conversationForImport, createExport } from '../utils/conversations'
import { capabilitySummary } from '../utils/models'

interface SettingsPanelProps {
  settings: Settings
  models: Model[]
  conversations: Conversation[]
  apiKeyActive: boolean
  onChange: (settings: Settings) => void
  onConnectApiKey: (apiKey: string) => void
  onClearApiKey: () => void
  onImport: (conversations: Conversation[]) => Promise<void>
  onClear: () => Promise<void>
  onClose: () => void
}

export function SettingsPanel({ settings, models, conversations, apiKeyActive, onChange, onConnectApiKey, onClearApiKey, onImport, onClear, onClose }: SettingsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [message, setMessage] = useState('')
  const [importing, setImporting] = useState(false)
  const [apiKeyDraft, setApiKeyDraft] = useState('')

  useEffect(() => closeButtonRef.current?.focus(), [])

  function update(patch: Partial<Settings>) {
    if ((patch.provider !== undefined && patch.provider !== settings.provider)
      || (patch.customBaseUrl !== undefined && patch.customBaseUrl !== settings.customBaseUrl)) {
      setApiKeyDraft('')
      onClearApiKey()
    }
    onChange({ ...settings, ...patch })
  }

  function connectApiKey() {
    const key = apiKeyDraft.trim()
    if (!key) {
      setMessage('Paste an API key to connect this tab.')
      return
    }
    onConnectApiKey(key)
    setApiKeyDraft('')
    setMessage('API key active in this tab. It is not saved to this device.')
  }

  const providerHelp = {
    'opencode-zen': { label: 'OpenCode Zen', url: 'https://opencode.ai/console' },
    openai: { label: 'OpenAI', url: 'https://platform.openai.com/api-keys' },
    openrouter: { label: 'OpenRouter', url: 'https://openrouter.ai/keys' },
    anthropic: { label: 'Anthropic', url: 'https://console.anthropic.com/settings/keys' },
    google: { label: 'Google Gemini', url: 'https://aistudio.google.com/app/apikey' },
    'openai-compatible': { label: 'OpenAI-compatible', url: undefined },
  }[settings.provider]

  function exportHistory() {
    const data = createExport(conversations)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `kalam-conversations-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage('Export downloaded.')
  }

  async function importHistory(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImporting(true)
    try {
      let data: unknown
      try {
        data = JSON.parse(await file.text()) as unknown
      } catch {
        throw new Error('The selected file is not valid JSON.')
      }
      const imported = conversationForImport(data)
      await onImport(imported)
      setMessage(`Imported ${imported.length} conversation${imported.length === 1 ? '' : 's'}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The file could not be imported.')
    } finally {
      setImporting(false)
    }
  }

  async function clearHistory() {
    if (!window.confirm('Delete all conversations stored on this device? This cannot be undone.')) return
    try {
      await onClear()
      setMessage('Local history cleared.')
    } catch {
      setMessage('Local history could not be cleared.')
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') onClose()
    if (event.key === 'Tab') {
      const focusable = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([hidden]), select:not(:disabled), a[href]')
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" onKeyDown={handleKeyDown}>
        <header className="settings-header">
          <div>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button ref={closeButtonRef} className="icon-button" type="button" onClick={onClose} aria-label="Close settings"><X size={18} /></button>
        </header>

        <section className="settings-section" aria-labelledby="appearance-title">
          <div className="settings-section-title">
            <div><h3 id="appearance-title">Appearance</h3><p>Make the workspace comfortable to read.</p></div>
          </div>
          <div className="theme-options" role="group" aria-label="Theme">
            {(['system', 'light', 'dark'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                className={`theme-option ${settings.theme === theme ? 'theme-option-active' : ''}`}
                onClick={() => update({ theme })}
                aria-pressed={settings.theme === theme}
              >
                {theme === 'light' ? <Sun size={15} /> : theme === 'dark' ? <Moon size={15} /> : <Monitor size={15} />}
                <span>{theme[0]!.toUpperCase() + theme.slice(1)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section" aria-labelledby="connection-title">
          <div className="settings-section-title">
            <div><h3 id="connection-title">Model connection</h3><p>Use your own provider account and API key.</p></div>
          </div>
          <label className="settings-connection-field" htmlFor="api-provider">
            <strong>Provider</strong>
            <select
              id="api-provider"
              value={settings.provider}
              onChange={(event) => update({ provider: event.target.value as Settings['provider'] })}
            >
              <option value="opencode-zen">OpenCode Zen</option>
              <option value="openai">OpenAI</option>
              <option value="openrouter">OpenRouter</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google Gemini</option>
              <option value="openai-compatible">Custom OpenAI-compatible</option>
            </select>
          </label>
          {settings.provider === 'openai-compatible' && (
            <div className="settings-api-key-field">
              <label htmlFor="provider-base-url"><strong>API base URL</strong></label>
              <input
                id="provider-base-url"
                type="url"
                value={settings.customBaseUrl}
                onChange={(event) => update({ customBaseUrl: event.target.value })}
                placeholder="https://api.example.com/v1"
                autoComplete="url"
                spellCheck={false}
              />
              <small>Use a trusted public HTTPS endpoint on port 443. Do not include your API key in this address.</small>
            </div>
          )}
          <div className="settings-api-key-field">
            <label htmlFor="provider-api-key"><strong>{settings.provider === 'openai-compatible' ? 'API key' : `${providerHelp.label} API key`}</strong></label>
            <input
              id="provider-api-key"
              type="password"
              value={apiKeyDraft}
              onChange={(event) => setApiKeyDraft(event.target.value)}
              placeholder={apiKeyActive ? 'A key is active for this tab' : 'Paste your personal API key'}
              autoComplete="off"
              spellCheck={false}
              aria-describedby="api-key-privacy"
            />
            {providerHelp.url && <a href={providerHelp.url} target="_blank" rel="noreferrer">Get a key from {providerHelp.label}</a>}
          </div>
          <div className="history-actions">
            <button type="button" className="secondary-button" onClick={connectApiKey} disabled={!apiKeyDraft.trim()}>Use key in this tab</button>
            {apiKeyActive && <button type="button" className="secondary-button" onClick={() => { onClearApiKey(); setMessage('API key cleared from this tab.') }}>Forget key</button>}
          </div>
          <p id="api-key-privacy" className="privacy-copy">The key stays in this tab’s memory and is sent to Cloudflare and the selected provider when needed. It is never saved with your conversations and must be entered again after a reload.</p>
        </section>

        <section className="settings-section">
          <label className="settings-field" htmlFor="default-model">
            <span><strong>Default model</strong><small>Used for new conversations.</small></span>
            <select id="default-model" value={settings.defaultModelId} onChange={(event) => update({ defaultModelId: event.target.value })}>
              <option value="">First available model</option>
              {models.map((model) => <option value={model.id} key={model.id}>{model.name}{model.description ? ` · ${model.description}` : ''}{capabilitySummary(model)}</option>)}
            </select>
          </label>
          <label className="settings-toggle">
            <span><strong>Enter to send</strong><small>Use Shift + Enter for a new line.</small></span>
            <input type="checkbox" checked={settings.enterToSend} onChange={(event) => update({ enterToSend: event.target.checked })} />
          </label>
        </section>

        <section className="settings-section">
          <div className="settings-section-title">
            <div><h3>Local history</h3><p>{conversations.length} conversation{conversations.length === 1 ? '' : 's'} stored on this device.</p></div>
          </div>
          <div className="history-actions">
            <button type="button" className="secondary-button" onClick={exportHistory} disabled={conversations.length === 0}><Download size={15} />Export JSON</button>
            <button type="button" className="secondary-button" onClick={() => fileRef.current?.click()} disabled={importing}><HardDrive size={15} />Import JSON</button>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={importHistory} hidden aria-label="Choose a Kalam conversation export" />
          </div>
          <button type="button" className="clear-history-button" onClick={() => void clearHistory()} disabled={conversations.length === 0}>Clear all local history</button>
           <p className="privacy-copy">Chat history stays in this browser. Messages and your API key are sent through Cloudflare Pages to the selected provider only when needed for inference.</p>
        </section>
        {message && <p className="settings-feedback" role="status">{message}</p>}
      </section>
    </div>
  )
}
