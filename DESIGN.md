---
name: Kalam Chat
description: A focused workspace for technical conversations.
colors:
  primary: "#657564"
  primary-hover: "#536653"
  primary-strong: "#4f6250"
  primary-soft: "#edf1eb"
  primary-dark: "#a6b49f"
  primary-dark-strong: "#c1d0bb"
  primary-dark-soft: "#2d342b"
  paper: "#fbfaf7"
  paper-sidebar: "#f1f0ea"
  paper-hover: "#e8e7e0"
  dark-surface: "#1c1e1b"
  dark-sidebar: "#171916"
  dark-hover: "#272a25"
  dark-soft: "#252823"
  dark-muted: "#30332d"
  text-on-accent-dark: "#20251f"
  text: "#292a28"
  text-secondary: "#53574e"
  text-muted: "#62665d"
  text-dark: "#e7e7e2"
  text-dark-secondary: "#aaa9a1"
  text-dark-muted: "#999a91"
  code-light-surface: "#f8f8f6"
  code-dark-surface: "#252622"
  code-light-text: "#343630"
  code-dark-text: "#deded7"
  border: "#e4e2d9"
  border-strong: "#d5d3c9"
  border-dark: "#343730"
  border-dark-strong: "#484c42"
  error: "#8b413b"
  error-soft: "#fbf2f0"
  error-dark: "#e5a49c"
  error-dark-soft: "#382725"
  warning: "#75622e"
  warning-soft: "#f8f4e7"
  warning-dark: "#d7c182"
  warning-dark-soft: "#383321"
typography:
  title:
    fontFamily: '"Source Sans 3 Variable", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "24px"
    fontWeight: 560
    lineHeight: 1.3
    letterSpacing: "-0.3px"
  body:
    fontFamily: '"Source Sans 3 Variable", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 400
  message:
    fontFamily: '"Source Sans 3 Variable", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: '"Source Sans 3 Variable", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "10px"
    fontWeight: 600
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "31px"
    width: "31px"
  button-primary-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.text-on-accent-dark}"
    rounded: "{rounded.md}"
    height: "31px"
    width: "31px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    height: "29px"
    width: "29px"
  button-ghost-dark:
    backgroundColor: "transparent"
    textColor: "{colors.text-dark-secondary}"
    rounded: "{rounded.sm}"
    height: "29px"
    width: "29px"
  composer-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "10px 10px 9px 15px"
  composer-field-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.lg}"
    padding: "10px 10px 9px 15px"
  model-control:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text-secondary}"
    rounded: "7px"
    height: "34px"
  model-control-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.text-dark-secondary}"
    rounded: "7px"
    height: "34px"
  history-navigation:
    backgroundColor: "{colors.paper-hover}"
    textColor: "{colors.text}"
    rounded: "7px"
    height: "39px"
  history-navigation-dark:
    backgroundColor: "{colors.dark-hover}"
    textColor: "{colors.text-dark}"
    rounded: "7px"
    height: "39px"
  message-stream:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text}"
    typography: "{typography.message}"
  message-stream-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.text-dark}"
    typography: "{typography.message}"
  suggestion-prompt:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text-secondary}"
    rounded: "7px"
    padding: "0 11px"
  suggestion-prompt-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.text-dark-secondary}"
    rounded: "7px"
    padding: "0 11px"
  code-block:
    backgroundColor: "{colors.code-light-surface}"
    textColor: "{colors.code-light-text}"
    rounded: "{rounded.md}"
  code-block-dark:
    backgroundColor: "{colors.code-dark-surface}"
    textColor: "{colors.code-dark-text}"
    rounded: "{rounded.md}"
---

# Design System: Kalam Chat

## Overview

**Creative North Star: "The research notebook"**

Kalam gives technical conversations a quiet reading workspace. Graphite is the default canvas, with warm paper in light mode and muted sage for actions and selected state. Fine borders and tonal surfaces separate controls without turning the conversation into a dashboard of cards.

Self-hosted Source Sans 3 Variable carries interface text, headings, prompts, and answers; monospace is reserved for code. The small Georgia italic `k` belongs only to the wordmark mark, while interface controls use Lucide icons. Local history sits beside one centered conversation column.

**Key Characteristics:**
- Dark by default, with a warm-paper light theme.
- Muted sage marks actions and selected states.
- A narrow history rail frames a wide technical reading column.
- Monospace is reserved for code and its language labels.

## Colors

The palette pairs graphite and warm-paper neutrals with sage accents. Dark mode is the initial theme; light and system themes are available in settings.

### Primary
- **Muted sage**: Light-mode send action and active accents.
- **Deep sage**: Stronger light-mode accent for active text and links; the send control darkens slightly on hover.
- **Sage wash**: Light accent background for selected controls.
- **Pale sage**: Primary send action and active accents in dark mode.
- **Light sage**: Strong dark-mode accent text.
- **Deep sage wash**: Dark-mode accent background.

### Neutral
- **Warm paper**: Light workspace and dialog surface; a lighter paper tone forms the history rail and soft controls.
- **Paper hover**: Hover and selected navigation surface.
- **Graphite**: Main light-mode text, with distinct secondary and supporting inks that retain at least 4.5:1 contrast on paper, sidebar, and hover surfaces.
- **Ink canvas**: Dark workspace and dialog surface, with a deeper sidebar and tonal hover/control surfaces.
- **Pale text**: Main dark-mode text, with separate secondary and supporting tones that retain at least 4.5:1 contrast on dark surfaces.
- **Code surfaces**: Fenced blocks use a dedicated near-white light surface and a dark charcoal surface, with separate readable base text and theme-specific syntax colors. Dark syntax tokens keep at least 4.5:1 contrast on the charcoal surface.
- **Fine borders**: Low-contrast dividers separate controls and regions in both themes.
- **Error and warning pairs**: Reserved for notices and destructive or unavailable states.

### Named rules

**The Sage Action Rule.** Use sage for actions and selected states. Keep the surrounding surface neutral.

**The Contrast Rule.** Theme-specific secondary and supporting text must meet 4.5:1 against the paper or graphite surfaces where they appear.

## Typography

**Display Font:** Source Sans 3 Variable (self-hosted).
**Body Font:** `"Source Sans 3 Variable", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
**Label/Mono Font:** The same sans for labels; `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` for code.

**Character:** Source Sans 3 Variable gives interface text, headings, and long technical answers one consistent sans voice. A small Georgia italic `k` is confined to the wordmark mark; it is not a general display-serif role.

The font is bundled under the SIL Open Font License 1.1. Its license text is included at `public/fonts/SOURCE-SANS-3-OFL.txt`.

### Hierarchy
- **Title** (weight 560, 24px, line-height 1.3, letter-spacing -0.3px): Welcome heading; settings titles use 20px.
- **Body** (weight 400, 14px): Root interface size; compact controls and supporting copy use smaller local sizes.
- **Message** (weight 400, 13px, line-height 1.75): Conversation prose in a 740px reading measure; mobile uses 12.5px.
- **Label** (weight 600, 10px): Message roles and history labels.
- **Code** (weight 400, 11px, line-height 1.65): Fenced code body; compact language labels use 9.5px. Mobile fenced code uses 10px.

## Layout

The desktop shell uses a 252px history rail beside a flexible workspace. The 61px top bar holds the conversation title and model selector. Messages use a centered 740px measure; the composer is capped at 760px and stays at the workspace foot while the reading area scrolls independently.

At 700px and below, history becomes a left drawer up to 292px wide, the top bar shrinks to 55px, and the composer respects the device's bottom safe area. At 380px and below, the title and model control narrow further and suggestion prompts stack. Message actions remain visible on mobile.

Spacing is compact inside controls and message groups. Larger gaps separate successive turns and the empty-state prompts. Borders, rather than nested cards, define the main regions.

## Elevation & Depth

The workspace is mostly flat. Fine borders and changes in surface tone carry the hierarchy. Soft shadows lift settings and conversation menus; the same theme-aware shadow separates the mobile drawer from the page. The composer has a small ambient shadow against the reading surface.

### Shadow Vocabulary
- **Overlay** (`0 16px 48px rgb(31 34 27 / 12%)` in light mode; `0 16px 48px rgb(0 0 0 / 36%)` in dark mode): Settings panel, conversation menus, and the open mobile history drawer.
- **Composer** (`0 4px 15px rgb(26 30 21 / 4%)`): Slight separation from the conversation area.

## Shapes

Compact controls use 6–8px corners; the composer and settings panel use 12px corners. User-message bubbles have a restrained asymmetric 4px/12px corner, while code blocks keep an even 8px radius. Borders stay 1px and low contrast.

## Components

### Buttons

Primary actions are small and direct. The send button is 31px square with an 8px corner: muted sage with a white icon in light mode, pale sage with a dark icon in dark mode. Its light-mode hover darkens and lifts by 1px. While a response is generating, the same control becomes an error-colored stop button; its icon is white on the deep light-theme error color and dark on the pale dark-theme error color. Disabled send controls recede to the muted surface. Icon buttons are 29px square, transparent at rest, and gain a soft surface on hover; keyboard focus uses the global 2px accent outline.

### Composer field

The composer uses a 1px strong border, a 12px corner, and the workspace surface. Focus blends the border toward sage and adds a 3px sage-tinted ring. The 12px text area grows with its draft to 220px, then scrolls; Enter sends by default and Shift + Enter inserts a line break.

### Model controls

The model selector is a compact 34px-high, 7px-corner control with a fine border. Capability labels sit on a soft theme surface; they disappear at the mobile breakpoint to preserve room for the title and model name.

### History navigation

Recent conversations sit in a 252px desktop rail. Rows are 39px high; hover and selection share the theme's sidebar-hover surface. On mobile, the rail becomes a left drawer with a scrim, safe-area padding, and the overlay shadow.

### Message stream

Messages share a centered 740px measure. User turns use a soft, bordered bubble with an asymmetric corner; assistant turns sit directly on the reading surface. Edit, copy, and regenerate actions appear on hover or keyboard focus on desktop and remain visible on mobile. Markdown and equations stay in the same reading measure.

### Suggestions

Empty-state prompt buttons use a 1px border, a 7px corner, and a 34px minimum height. Choosing one places its text in the composer draft; at 380px and below they stack at full width.

### Code blocks

Fenced code sits in a 1px bordered container with an 8px corner, a compact language label, and a copy control. The preformatted region uses monospace at 11px/1.65, scrolls when needed, and shrinks to 10px on mobile. Recognized syntax highlighting follows the selected theme; dark token colors maintain at least 4.5:1 contrast on the code surface. Inline code uses the same monospace stack on a soft surface.

## Do's and Don'ts

### Do:
- **Do** keep Source Sans 3 Variable for interface text, headings, and conversation prose.
- **Do** use monospace only for code and measured data.
- **Do** use sage for actions and selected states, not as a decorative wash across the whole page.
- **Do** keep reading content in a centered measure no wider than 740px.
- **Do** keep the composer surface flat; it has no gradient.

### Don't:
- **Don't** use gradients or decorative AI effects.
- **Don't** add provider branding or provider-specific details to the frontend.
- **Don't** put every message or control inside a card.
- **Don't** use secondary text below 4.5:1 contrast on its actual surface.
- **Don't** extend the localized Georgia italic `k` into a display-serif heading style.
