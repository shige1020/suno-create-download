# suno-create-download

Adds a persistent set of Download pills to each clip card on https://suno.com/create so that the Download modal can be opened without hunting through the three-dot menu. The content script lives in `src/content-script.js` and follows the provided spec:

- looks for the `button[aria-label="Share clip"]` anchor and injects a pill container immediately after it (within the existing action row).
- automatically opens the clip menu, expands the Download submenu, and enumerates every format (MP3/WAV/Video/any future entries) so that pills always match the dynamic menu order.
- renders up to three pills inline; remaining entries are grouped under `+N` with a lightweight popover; Pro-only items keep the Pro badge but remain clickable.
- falls back gracefully when Download options cannot be captured (disabled pill + toast message) and keeps the existing UI untouched.

## Usage
1. Chrome – load the repo as an unpacked extension:
   - Open `chrome://extensions`, enable Developer Mode, click “Load unpacked,” and point to the repo root.
   - The extension manifest (`manifest.json`) injects `src/content-script.js` on `https://suno.com/create*`.
2. Firefox – install via the debugging UI:
   - Open `about:debugging#/runtime/this-firefox`, click “Load Temporary Add-on,” and select `manifest.json` from this repo.
   - The same manifest supports Firefox via `browser_specific_settings.gecko.id`.
3. After either extension loads, the script automatically runs when the DOM is ready, adds the pill UI next to each Share button, and begins introspecting the Download submenu for each clip card.
4. Clicking a pill replays the menu flow (open clip menu → expand Download → click the desired format), so the normal Download dialog appears without touching the menu yourself.

## Notes
- This script works without depending on brittle class names or dataset attributes; it only relies on `aria-label` and visible text. If Suno changes those aria labels, adjust `SHARE_BUTTON_SELECTOR` and the trigger heuristics in `findMenuButton` accordingly.
- There is no automated build/test step. To validate the behavior, visit `https://suno.com/create` after installing the extension and ensure the pills appear next to the Share button. Observe the toast message if Download items cannot be parsed.
- All styling is injected programmatically so there is no stylesheet to maintain. Tweak the style constants near the top of `src/content-script.js` if you need to align more closely with future UI changes.
