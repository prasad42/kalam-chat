import type { Model } from '../types/domain'

export function capabilitySummary(model: Model): string {
  const labels = [
    model.capabilities.streaming ? 'Streaming' : '',
    model.capabilities.vision ? 'Vision' : '',
    model.capabilities.attachments ? 'Attachments' : '',
  ].filter(Boolean)
  return labels.length > 0 ? ` · ${labels.join(' · ')}` : ''
}
