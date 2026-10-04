import { useState } from 'react'
import { Check, Copy, Pencil, RotateCcw } from 'lucide-react'
import type { Message } from '../types/domain'
import { Markdown } from './Markdown'

interface ChatMessageProps {
  message: Message
  isLastAssistant: boolean
  onEdit?: (message: Message) => void
  onRegenerate?: () => void
}

export function ChatMessage({ message, isLastAssistant, onEdit, onRegenerate }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article className={`message-row ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="message-inner">
        <div className="message-label">{isUser ? 'You' : isAssistant ? 'Kalam' : 'System'}</div>
        <div className={`message-content ${isUser ? 'user-content' : ''}`}>
          {message.content ? <Markdown content={message.content} /> : <span className="stream-cursor" aria-label="Generating response" />}
        </div>
        <div className="message-actions" aria-label={`${isUser ? 'Your' : 'Kalam'} message actions`}>
          {isUser && onEdit && (
            <button type="button" className="icon-button" onClick={() => onEdit(message)} aria-label="Edit message" title="Edit message">
              <Pencil size={14} />
            </button>
          )}
          {isAssistant && isLastAssistant && onRegenerate && (
            <button type="button" className="icon-button" onClick={onRegenerate} aria-label="Regenerate response" title="Regenerate response">
              <RotateCcw size={14} />
            </button>
          )}
          <button type="button" className="icon-button" onClick={copyMessage} aria-label="Copy message" title="Copy message">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
    </article>
  )
}
