import { useEffect, useRef, type KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'

interface ComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  busy: boolean
  disabled?: boolean
  enterToSend: boolean
  editing: boolean
  onCancelEdit: () => void
}

export function Composer({ value, onChange, onSend, onStop, busy, disabled, enterToSend, editing, onCancelEdit }: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`
  }, [value])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && enterToSend) {
      event.preventDefault()
      if (!busy && !disabled && value.trim()) onSend()
    }
    if (event.key === 'Escape' && busy) onStop()
  }

  return (
    <div className="composer-shell">
      {editing && <div className="editing-note">Editing an earlier message · sending will replace everything after it <button type="button" onClick={onCancelEdit}>Cancel</button></div>}
      <div className="composer-box">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={editing ? 'Update your message…' : 'Ask a question or explore an idea…'}
          aria-label="Message Kalam"
          rows={1}
          disabled={disabled}
        />
        {busy ? (
          <button type="button" className="send-button stop-button" onClick={onStop} aria-label="Stop generating" title="Stop generating">
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            className="send-button"
            onClick={onSend}
            disabled={disabled || !value.trim()}
            aria-label={editing ? 'Update message and regenerate' : 'Send message'}
            title={editing ? 'Update and regenerate' : 'Send message'}
          >
            <ArrowUp size={18} strokeWidth={2.2} />
          </button>
        )}
      </div>
      <div className="composer-footnote">
        <span>{enterToSend ? 'Enter to send · Shift + Enter for a new line' : 'Enter for a new line · Use the send button to send'}</span>
        <span>Conversations are saved on this device</span>
      </div>
    </div>
  )
}
