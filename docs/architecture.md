# Architecture

## Frontend and application API boundary

Kalam models the user-facing concepts of a conversation, message, model, capability, and generation. The React UI calls `src/api/models.ts` and `src/api/chat.ts`; browser network requests stay in `src/api/`. The user selects a provider in Settings. Provider model IDs are namespaced by the Pages Function and treated as opaque by the chat UI.

`src/types/transport.ts` defines the API payloads. The API client normalises responses into the domain types in `src/types/domain.ts`; the UI does not consume transport payloads directly.

The application API contract is:

- `GET /api/models` returns `{ "models": [{ "id", "name", "description?", "capabilities" }] }`.
- `POST /api/chat` accepts a conversation id, opaque model id, and ordered role/content messages.
- Chat responds as `text/event-stream`. Each event is JSON on a `data:` line. `{ "type": "delta", "text": "..." }` adds text, `{ "type": "done" }` completes the response, and `{ "type": "error" }` fails it. `[DONE]` is also accepted for compatibility.

The Pages Function implements the application API and translates provider requests. Supported connections are OpenCode Zen, OpenAI, OpenRouter, Anthropic, Google Gemini, and custom OpenAI-compatible HTTPS endpoints. It holds fixed origins for named providers; only the custom-compatible option accepts a user-selected HTTPS origin on port 443, with common local/IP address forms rejected. The function uses provider-appropriate authentication and normalizes provider-specific streaming responses into Kalam's event format.

The user's API key exists in React memory for the active tab. It is sent in a same-origin request to the Pages Function, which forwards it to the selected provider. The key is not written to IndexedDB, local storage, conversation exports, or the public build. Cloudflare necessarily handles the incoming request and key; deployments must protect the frontend and `/api/*` with Cloudflare Access. Users should connect only providers/endpoints they trust and are responsible for their provider account's billing and limits.

## Streaming

`src/api/stream.ts` owns the wire parser. It reads SSE framing, validates normalised events, and calls `onToken`. The chat hook owns generation state and creates an `AbortController`; React components do not parse the stream. An interrupted or cancelled response keeps any received text. A stream that closes without a completion event is treated as incomplete, not successful.

The development-only Vite middleware in `vite.config.ts` mocks both API routes. `functions/api/[[path]].ts` is the production same-origin API. It accepts only the models and chat routes and their expected methods, requires a selected provider and API key, bounds chat request size, uses fixed upstreams for named providers, and returns generic upstream errors without relaying provider error bodies.

## Local storage

`src/storage/database.ts` opens one IndexedDB database named `kalam-chat`, with `conversations` and `settings` object stores. `src/storage/conversations.ts` provides create, read, list, save, delete, clear, and import operations. `src/storage/settings.ts` owns preference reads and writes. Components do not call IndexedDB directly.

Conversation export uses a versioned `kalam-conversations` JSON envelope. Imports validate the envelope and each message before writing. Imported model ids stay opaque and chat content remains local until a user sends a request.

## Privacy and security

Kalam has no analytics, telemetry, tracking pixels, advertising SDKs, or session replay. Conversation content is not sent for persistence. The user sends content to `/api/chat` when they ask a model to respond; the active API key is sent with requests to `/api/models` and `/api/chat`. The key is not persisted by Kalam, but it is visible to the browser and handled by Cloudflare before being forwarded to the provider. Errors shown in the interface do not include backend stack traces or provider response bodies. Markdown raw HTML stays disabled; the parsed syntax tree is sanitised, and unsafe link protocols are rejected.

The Pages `_headers` file sets a restrictive Content Security Policy and prevents caching API responses. Named provider origins are fixed in server-side code. The custom OpenAI-compatible option accepts a user-supplied HTTPS hostname, so it must only be used for a trusted endpoint. No shared provider secret is configured in Pages or included in the frontend build.

The initial deployment must use Cloudflare Access with a default-deny policy and an explicit list of no more than 10 authorised users. Protect the Pages hostname and `/api/*` paths, and any preview hostnames or disable previews. All production inference is reached through the same-origin Pages Function; there is no separate Kalam API origin to expose. See [deployment.md](deployment.md). Cloudflare identity setup is a deployment task, not a frontend feature.

## Explicit non-goals

Kalam does not implement provider OAuth, shared provider credentials, billing management, RAG, attachments, uploads, image generation, web search, tools, multi-user administration, or cloud history sync. Provider accounts and their billing remain the user's responsibility.
