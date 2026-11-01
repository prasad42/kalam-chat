# Deployment and access control

Kalam targets Cloudflare Pages. Set the build command to `npm run build` and the output directory to `dist`. The Pages Function in `functions/api/[[path]].ts` implements `/api/models` and `/api/chat` and calls model providers on each user's behalf using that user's key.

## Provider keys and data flow

No shared inference key or `KALAM_API_ORIGIN` is required. Each authorised user selects a supported provider in Settings and supplies their own key. The browser holds the key in memory for that tab, sends it to the same-origin Pages Function over HTTPS, and the function forwards it to the chosen provider. The app does not save keys in IndexedDB, local storage, exports, Pages variables, or the frontend build. A page reload clears the key.

The Pages Function has fixed upstream origins for OpenCode Zen, OpenAI, OpenRouter, Anthropic, and Google Gemini. A custom OpenAI-compatible provider may use a user-entered HTTPS URL on port 443; the URL is not a secret and should identify a provider the user trusts. The custom option is not an access-control boundary, and users should not enter credentials in the URL itself. Do not enable verbose request/header logging for `/api/*`.

Users' messages and keys pass through Cloudflare Pages before reaching the provider. Make this clear to invited users. Each user is responsible for the selected provider's terms, billing, usage limits, and key revocation. If a key may have been exposed, revoke it with the provider and create a replacement.

The development mock runs only under Vite. It is not included in the Pages build.

## Required access policy before first deployment

The initial deployment is private. Do not publish it until all of these checks pass:

1. Create a Cloudflare Access application covering the production hostname, its `/api/*` routes, and any `pages.dev` hostname that remains enabled.
2. Add one allow policy with an explicit list of no more than 10 authorised identities. Do not allow an entire email domain, all authenticated users, or an unrestricted group.
3. Leave every other request denied. Do not add a public, bypass, or broad fallback policy.
4. Protect preview deployment hostnames with the same policy, or turn off preview deployments.
5. Verify requests to both `/api/models` and `/api/chat` are blocked by Access for an unauthorised visitor; both routes carry user-supplied API keys.
6. Check the allowlist contains at most 10 people before each access-policy change. The UI does not enforce or display this limit.
7. Verify a listed user can load the app and API, and an unlisted user is denied at the edge.

Cloudflare account, identity-provider, OAuth, and authorised-user details are not part of this codebase. Ask the owner for those details when setting up Access. Do not treat a frontend check or a hidden page as access control.

## GitHub builds

Connect the repository to Cloudflare Pages and use the build command and output directory above. No provider secrets or API-origin variables are needed. Apply Access to the production hostname before the first public deployment; preview deployments must be disabled or covered by the same deny-by-default rule. Protect or disable the default `pages.dev` hostname too, so it cannot bypass Access on a custom domain.
