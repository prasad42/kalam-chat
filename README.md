# Kalam Chat

A browser-based chat app. Users connect their own API key for OpenCode Zen, OpenAI, OpenRouter, Anthropic, Google Gemini, or a custom OpenAI-compatible API. Provider credentials are used by the same-origin Cloudflare Pages Function; they are not included in the public frontend bundle.

## Run locally

```sh
npm install
npm run dev
```

The Vite development server supplies a deterministic mock API. It returns three sample models and streams a response with Markdown, LaTeX, and code. Start a message with `!slow` to slow the stream or `!error` to exercise the failure state. These controls exist only in the development mock.

## Checks

```sh
npm test
npm run lint
npm run build
```

## Cloudflare Pages

Build with `npm run build` and publish `dist`. Pages Functions implement `/api/models` and `/api/chat`, forwarding requests to the selected provider. Each user enters their own API key in Settings; it remains in tab memory and is sent through Cloudflare to the provider. See [docs/deployment.md](docs/deployment.md) before deployment. Do not deploy until Cloudflare Access denies everyone except the explicitly authorised list of at most 10 users.

## Project notes

- [Architecture](docs/architecture.md)
- [Deployment and access control](docs/deployment.md)

Conversation history and preferences live in this browser's IndexedDB. Provider selection and the optional custom API URL are saved there; API keys are not. Kalam does not add analytics or telemetry. Messages and the active user's key are sent through the Pages Function only when the user requests model access or inference.
