# Architecture

## Frontend and application API boundary

Kalam models the user-facing concepts of a conversation, message, model, capability, and generation. The React UI calls `src/api/models.ts` and `src/api/chat.ts`; browser network requests stay in `src/api/`. Model identifiers are opaque. The frontend does not infer a provider, server location, endpoint, credential type, or authentication flow from them.

`src/types/transport.ts` defines the API payloads. The API client normalises responses into the domain types in `src/types/domain.ts`; the UI does not consume transport payloads directly.

The application API contract is:

- `GET /api/models` returns `{ "models": [{ "id", "name", "description?", "capabilities" }] }`.
- `POST /api/chat` accepts a conversation id, opaque model id, and ordered role/content messages.
- Chat responds as `text/event-stream`. Each event is JSON on a `data:` line. `{ "type": "delta", "text": "..." }` adds text, `{ "type": "done" }` completes the response, and `{ "type": "error" }` fails it. `[DONE]` is also accepted for compatibility.

The application API owns sessions and inference. The browser uses same-origin credentials so a compatible backend can use the user's existing secure HttpOnly application session. Kalam does not store auth credentials.

## Streaming

`src/api/stream.ts` owns the wire parser. It reads SSE framing, validates normalised events, and calls `onToken`. The chat hook owns generation state and creates an `AbortController`; React components do not parse the stream. An interrupted or cancelled response keeps any received text. A stream that closes without a completion event is treated as incomplete, not successful.

The development-only Vite middleware in `vite.config.ts` mocks both API routes. `functions/api/[[path]].ts` is the Pages same-origin proxy. It accepts only the models and chat routes, allows only their expected methods, and forwards to `KALAM_API_ORIGIN`. It returns a generic error if the API is unset or unreachable.

## Local storage

`src/storage/database.ts` opens one IndexedDB database named `kalam-chat`, with `conversations` and `settings` object stores. `src/storage/conversations.ts` provides create, read, list, save, delete, clear, and import operations. `src/storage/settings.ts` owns preference reads and writes. Components do not call IndexedDB directly.

Conversation export uses a versioned `kalam-conversations` JSON envelope. Imports validate the envelope and each message before writing. Imported model ids stay opaque and chat content remains local until a user sends a request.

## Privacy and security

Kalam has no analytics, telemetry, tracking pixels, advertising SDKs, or session replay. Conversation content is not sent for persistence. The user sends content to `/api/chat` when they ask a model to respond. Errors shown in the interface do not include backend stack traces. Markdown raw HTML stays disabled; the parsed syntax tree is sanitised, and unsafe link protocols are rejected.

The Pages `_headers` file sets a restrictive Content Security Policy and prevents caching API responses. The API proxy has a fixed upstream configured outside browser code, rather than accepting an origin from a request. Provider secrets and credentials do not belong in this frontend or its public build variables.

The initial deployment must use Cloudflare Access with a default-deny policy and an explicit list of no more than 10 authorised users. Protect the Pages hostname, its API paths, and any preview hostnames or disable previews. The application backend must enforce its own session and access rules, and its origin must not provide an unprotected route around the Access policy. See [deployment.md](deployment.md). Cloudflare identity setup is a deployment task, not a frontend feature.

## Explicit non-goals

Kalam does not implement provider integrations, provider OAuth, API keys, inference endpoint discovery, model loading, billing, RAG, attachments, uploads, image generation, web search, tools, multi-user administration, or cloud history sync. Those capabilities belong in the application backend or a later product milestone.
