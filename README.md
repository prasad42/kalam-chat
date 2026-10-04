# Kalam Chat

A provider-agnostic chat frontend. Kalam calls the same-origin application API at `/api/models` and `/api/chat`; it does not know which service runs inference.

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

Build with `npm run build` and publish `dist`. Pages Functions route `/api/models` and `/api/chat` to a compatible application API using the server-side `KALAM_API_ORIGIN` setting. See [docs/deployment.md](docs/deployment.md) before connecting a production backend. Do not deploy until Cloudflare Access denies everyone except the explicitly authorised list of at most 10 users.

## Project notes

- [Architecture](docs/architecture.md)
- [Deployment and access control](docs/deployment.md)

Conversation history and preferences live in this browser's IndexedDB. Kalam does not add analytics or telemetry. Messages are sent to the application API only when the user requests inference.
