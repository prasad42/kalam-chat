import { requestJson } from './client'
import type { Model } from '../types/domain'
import type { ApiModel, ModelsResponse } from '../types/transport'

export async function loadModels(signal?: AbortSignal): Promise<Model[]> {
  const response = await requestJson<ModelsResponse>('/api/models', { signal })
  if (!response || !Array.isArray(response.models)) throw new Error('The application server returned an invalid model list.')
  return response.models.map(normalizeModel)
}

function normalizeModel(model: ApiModel): Model {
  if (!model || typeof model.id !== 'string' || typeof model.name !== 'string') {
    throw new Error('The application server returned an invalid model.')
  }
  return {
    id: model.id,
    name: model.name,
    ...(typeof model.description === 'string' ? { description: model.description } : {}),
    capabilities: {
      streaming: model.capabilities?.streaming === true,
      ...(typeof model.capabilities?.vision === 'boolean' ? { vision: model.capabilities.vision } : {}),
      ...(typeof model.capabilities?.attachments === 'boolean' ? { attachments: model.capabilities.attachments } : {}),
    },
  }
}
