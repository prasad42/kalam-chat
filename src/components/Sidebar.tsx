import { useState } from 'react'
import { MessageSquarePlus, MoreHorizontal, Pencil, Settings2, Trash2, X } from 'lucide-react'
import type { Conversation } from '../types/domain'

interface SidebarProps {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onSettings: () => void
  onClose?: () => void
}

export function Sidebar({ conversations, activeId, onSelect, onNew, onRename, onDelete, onSettings, onClose }: SidebarProps) {
  const [menuId, setMenuId] = useState<string | null>(null)

  function rename(conversation: Conversation) {
    const title = window.prompt('Rename conversation', conversation.title)
    if (title?.trim()) onRename(conversation.id, title)
    setMenuId(null)
  }

  function remove(conversation: Conversation) {
    if (window.confirm(`Delete "${conversation.title}"? This only removes its local copy.`)) onDelete(conversation.id)
    setMenuId(null)
  }

  return (
    <aside className="sidebar" aria-label="Conversation sidebar">
      <div className="sidebar-topline">
        <a className="wordmark" href="/" aria-label="Kalam home">
          <span className="wordmark-mark" aria-hidden="true">k</span>
          <span>kalam</span>
        </a>
        {onClose && <button className="icon-button close-drawer" type="button" onClick={onClose} aria-label="Close menu"><X size={18} /></button>}
      </div>
      <button className="new-chat-button" type="button" onClick={() => { onNew(); onClose?.() }}>
        <MessageSquarePlus size={16} strokeWidth={1.8} />
        <span>New conversation</span>
        <span className="new-key" aria-hidden="true">⌘ K</span>
      </button>
      <div className="history-label">Recent</div>
      <nav className="conversation-list" aria-label="Recent conversations">
        {conversations.length === 0 ? (
          <p className="history-empty">Your conversations will appear here.</p>
        ) : conversations.map((conversation) => (
          <div className={`conversation-item ${activeId === conversation.id ? 'conversation-active' : ''}`} key={conversation.id}>
            <button
              className="conversation-select"
              type="button"
              onClick={() => { onSelect(conversation.id); onClose?.() }}
              aria-current={activeId === conversation.id ? 'page' : undefined}
              title={conversation.title}
            >
              <span className="conversation-title">{conversation.title}</span>
              <span className="conversation-date">{formatDate(conversation.updatedAt)}</span>
            </button>
            <button
              type="button"
              className="conversation-menu-trigger"
              onClick={() => setMenuId(menuId === conversation.id ? null : conversation.id)}
              aria-label={`Actions for ${conversation.title}`}
              aria-expanded={menuId === conversation.id}
            >
              <MoreHorizontal size={16} />
            </button>
            {menuId === conversation.id && (
              <div className="conversation-menu" role="group" aria-label="Conversation actions">
                <button type="button" onClick={() => rename(conversation)}><Pencil size={14} />Rename</button>
                <button type="button" onClick={() => remove(conversation)}><Trash2 size={14} />Delete</button>
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="privacy-note"><span className="privacy-dot" /> Stored only on this device</div>
        <button className="settings-button" type="button" onClick={() => { onSettings(); onClose?.() }}>
          <Settings2 size={16} strokeWidth={1.8} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  const sameDay = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
  return sameDay ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
