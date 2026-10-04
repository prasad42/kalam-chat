import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Download, HardDrive, Monitor, Moon, Sun, X } from 'lucide-react'
import type { Conversation, Model, Settings } from '../types/domain'
import { conversationForImport, createExport } from '../utils/conversations'
import { capabilitySummary } from '../utils/models'

interface SettingsPanelProps {
  settings: Settings
  models: Model[]
  conversations: Conversation[]
  onChange: (settings: Settings) => void
  onImport: (conversations: Conversation[]) => Promise<void>
  onClear: () => Promise<void>
  onClose: () => void
}

export function SettingsPanel({ settings, models, conversations, onChange, onImport, onClear, onClose }: SettingsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [message, setMessage] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => closeButtonRef.current?.focus(), [])

  function update(patch: Partial<Settings>) {
    onChange({ ...settings, ...patch })
  }

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
      const focusable = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([hidden]), select:not(:disabled)')
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
          <p className="privacy-copy">Chat contents stay in this browser unless sent to the application backend for inference.</p>
        </section>
        {message && <p className="settings-feedback" role="status">{message}</p>}
      </section>
    </div>
  )
}
