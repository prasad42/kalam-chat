# Deployment and access control

Kalam targets Cloudflare Pages. Set the build command to `npm run build` and the output directory to `dist`. The Pages Functions proxy in `functions/api/[[path]].ts` handles `/api/models` and `/api/chat`.

## Backend connection

Set `KALAM_API_ORIGIN` as a Pages Function environment variable to the HTTPS origin of the compatible Kalam application API, for example `https://api.example.net`. Use an origin only, with no path, credentials, or query string. The Pages Function rejects non-HTTPS origins, appends `/api/models` or `/api/chat`, and does not accept an upstream URL from the browser. This value is not a provider URL or a secret.

The development mock runs only under Vite. It is not included in the Pages build.

## Required access policy before first deployment

The initial deployment is private. Do not publish it until all of these checks pass:

1. Create a Cloudflare Access application covering the production Pages hostname and every `/api/*` route.
2. Add one allow policy with an explicit list of no more than 10 authorised identities. Do not allow an entire email domain, all authenticated users, or an unrestricted group.
3. Leave every other request denied. Do not add a public, bypass, or broad fallback policy.
4. Protect preview deployment hostnames with the same policy, or turn off preview deployments.
5. Ensure the application API origin cannot bypass this restriction. Keep it private where possible; otherwise require its own valid application session and enforce the same user access rule.
6. Check the allowlist contains at most 10 people before each access-policy change. The UI does not enforce or display this limit.
7. Verify a listed user can load the app and API, and an unlisted user is denied at the edge.

Cloudflare account, identity-provider, OAuth, and authorised-user details are not part of this codebase. Ask the owner for those details when setting up Access. Do not treat a frontend check or a hidden page as access control.

## GitHub builds

Connect the repository to Cloudflare Pages and use the build command and output directory above. Configure `KALAM_API_ORIGIN` separately for production and preview environments. Apply Access to the production hostname before the first public deployment; preview environments must follow the same deny-by-default rule.
