# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, Vite, Cloudflare Pages, and IndexedDB. The user specified this stack.

## Users

Kalam Chat is for people who want to hold technical conversations in a browser. The initial deployment may admit at most 10 explicitly authorised users. Everyone else must be denied by default.

## Product Purpose

Kalam Chat provides a browser interface for conversations with models through a compatible Kalam application API. Success means people can exchange streamed messages, keep their history on their own device, and use a compatible backend without changing the interface.

## Positioning

The frontend handles conversations, models, and user-facing capabilities. The application API handles inference and any provider-specific routing or authentication. Kalam does not contain provider credentials or provider integrations.

## Operating Context

People use Kalam in a desktop or mobile browser. The initial product is a small, access-controlled deployment. Chat history stays in the browser's IndexedDB unless a message is sent to the application API for inference.

## Capabilities and Constraints

- Users can create, edit, regenerate, rename, delete, export, and import conversations.
- The model list comes from `GET /api/models`; generation uses `POST /api/chat` and a normalised streaming layer.
- A development mock API lets the frontend run without an inference backend.
- The production application API must enforce its own session and access rules. A browser-side allowlist is not an access-control mechanism.
- Cloudflare Access must protect the initial deployment with an explicit allowlist of no more than 10 people and deny all others. The policy must cover the frontend and `/api/*`. Configure it before deployment. OAuth or identity-provider details remain open until that setup is needed.
- Conversations are local data. Kalam does not add analytics, telemetry, advertising, or third-party session replay.
- Attachments, cloud sync, provider credentials, provider OAuth, billing, and inference-specific features are out of scope for v1.

## Brand Commitments

The product is named Kalam, with Kalam Chat as its long form. The name refers to A. P. J. Abdul Kalam and to *kalam* as pen or writing. Keep the identity understated. Do not use rockets, missiles, portraits, nationalism, or mythology as visual themes.

## Evidence on Hand

The development mock returns synthetic model names and deterministic sample responses. They are for local development only and are not evidence of a production model or backend.

## Product Principles

- Keep inference provider details behind the application API.
- Keep conversation persistence on the user's device.
- Make technical prose, equations, and code easy to read.
- Use explicit backend or edge controls for access. Never imply that frontend checks secure a deployment.

## Accessibility & Inclusion

Support keyboard use, semantic controls, visible focus, readable contrast, screen-reader labels, and narrow mobile screens.
