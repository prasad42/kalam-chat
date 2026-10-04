import { ChevronDown, Circle, Eye, Paperclip } from 'lucide-react'
import type { Model } from '../types/domain'
import { capabilitySummary } from '../utils/models'

interface ModelSelectProps {
  models: Model[]
  value: string
  onChange: (modelId: string) => void
  disabled?: boolean
  compact?: boolean
  unavailable?: boolean
}

export function ModelSelect({ models, value, onChange, disabled, compact = false, unavailable = false }: ModelSelectProps) {
  const selected = models.find((model) => model.id === value)
  return (
    <label className={`model-select ${compact ? 'model-select-compact' : ''}`}>
      <span className="sr-only">Choose a model</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled || models.length === 0}>
        {models.length === 0 && <option value="">No models available</option>}
        {models.length > 0 && <option value="">{unavailable ? 'Saved model unavailable' : 'Choose a model'}</option>}
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}{model.description ? ` · ${model.description}` : ''}{capabilitySummary(model)}
          </option>
        ))}
      </select>
      <span className="model-select-label">
        <span>{selected?.name ?? (unavailable ? 'Saved model unavailable' : 'Choose model')}</span>
        {!compact && selected?.capabilities.streaming && <span className="model-capability"><Circle size={7} className="streaming-dot" aria-hidden="true" />Streaming</span>}
        {!compact && selected?.capabilities.vision && <span className="model-capability"><Eye size={12} />Vision</span>}
        {!compact && selected?.capabilities.attachments && <span className="model-capability"><Paperclip size={12} />Attachments</span>}
      </span>
      <ChevronDown size={14} className="model-chevron" aria-hidden="true" />
    </label>
  )
}
