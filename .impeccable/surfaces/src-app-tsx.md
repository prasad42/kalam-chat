# Kalam chat surface

## Scope and mode

The responsive Kalam Chat application shell, conversation view, model selector, composer, local history, and settings. Mode: Operate.

## User and task

People use a browser to ask technical questions, read long answers, inspect equations and code, and return to local conversations. The main action is to send a message to a model listed by the application API. The conversation stream and local history are the proof of that task. Keep provider details, inference locations, and authentication out of the UI.

## Direction contract

**THESIS.** Give technical conversation a focused reading workspace. Keep the conversation and composer central, with local history and model choice nearby. Refuse dashboard tiles, oversized chat bubbles, and provider branding.

**OWN-WORLD.** Use warm paper and graphite in light mode, ink-dark surfaces by default, and muted sage for active states and primary actions. Use one sans-serif family for interface and prose, with monospace reserved for code and data. Keep borders fine, controls compact, and color purposeful. Avoid gradients, decorative AI effects, and display-serif headings.

**STORY.** The user sees recent local conversations, chooses an API-listed model, and starts writing. A response appears in the reading column as it streams. The user can stop, retry, copy, edit, or regenerate without losing the local conversation.

**FIRST VIEWPORT.** On desktop, a 252px history rail sits beside a full-height workspace. The top bar holds the current conversation and model selector. The center is a 740px reading measure with an empty-state prompt when no chat is selected. The composer stays at the bottom. On mobile, history becomes a drawer, the top bar keeps the menu and model selector, and the composer remains reachable above the safe area.

**FORM.** Build a dark-by-default, paper-and-sage research notebook interface. This follows the user's explicit visual choice and the product's emphasis on sustained technical reading. Seed key: `237d96e7`. The assigned map direction is overridden because its vivid lobe colors and moving geography conflict with the user's explicit quiet research palette and readable chat task. The strongest useful discipline from the other systems is compact, high-density navigation without reducing message readability.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved decisions

Cloudflare Access identity-provider setup and the exact list of up to 10 authorised users remain for the deployment step. Ask the user before configuring them.
