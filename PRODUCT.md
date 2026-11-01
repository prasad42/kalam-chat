# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, Vite, Cloudflare Pages, and IndexedDB. The user specified this stack.

## Users

Kalam Chat is for people who want to hold technical conversations in a browser. The initial deployment may admit at most 10 explicitly authorised users. Everyone else must be denied by default.

## Product Purpose

Kalam Chat provides a browser interface for conversations with models through a same-origin Cloudflare Pages Function. Users connect their own provider account and key. Success means people can exchange streamed messages and keep their history on their own device without sharing a provider credential with the site owner.

## Positioning

The frontend handles conversations, provider selection, API-key entry, and user-facing capabilities. The Pages Function handles provider-specific authentication, routing, and streaming. User keys are memory-only in the browser and are not saved by Kalam; requests pass through Cloudflare before reaching the provider.

## Operating Context

People use Kalam in a desktop or mobile browser. The initial product is a small, access-controlled deployment. Chat history stays in the browser's IndexedDB unless a message is sent through the Pages Function for inference.

## Capabilities and Constraints

- Users can create, edit, regenerate, rename, delete, export, and import conversations.
- The model list comes from `GET /api/models`; generation uses `POST /api/chat` and a normalised streaming layer.
- A development mock API lets the frontend run without an inference backend.
- The production Pages Function must be protected by Cloudflare Access along with the frontend. A browser-side allowlist is not an access-control mechanism.
- Cloudflare Access must protect the initial deployment with an explicit allowlist of no more than 10 people and deny all others. The policy must cover the frontend and `/api/*`. Configure it before deployment. OAuth or identity-provider details remain open until that setup is needed.
- Conversations are local data. Kalam does not add analytics, telemetry, advertising, or third-party session replay.
- Attachments, cloud sync, shared provider credentials, provider OAuth, billing management, and inference-specific features are out of scope for v1.

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
