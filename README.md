# suno-create-download

Adds a persistent set of Download pills to each clip card on https://suno.com/create so that the Download modal can be opened without hunting through the three-dot menu. The content script lives in `src/content-script.js` and follows the provided spec:

- watches the clip list area (`[data-testid="clip-row"]`) and injects pills only when a new clip row appears, preventing the observer from reacting to unrelated DOM churn.
- places a placeholder Download button next to the Share button; the first click on that placeholder opens the clip menu, expands the Download submenu, and enumerates the supported formats (MP3/WAV/Video only) so the real pills preserve the menu order from then on.
- renders the fetched formats as up to three inline pills plus a `+N` overflow popover; Pro-only items keep the PRO badge but stay clickable.
- falls back gracefully when Download options cannot be captured (disabled pill + toast message) and keeps the existing UI untouched.

## Usage
1. Chrome – load the repo as an unpacked extension:
   - Open `chrome://extensions`, enable Developer Mode, click “Load unpacked,” and point to the repo root.
   - The extension manifest (`manifest.json`) injects `src/content-script.js` on `https://suno.com/create*`.
2. Firefox – install via the debugging UI:
   - Open `about:debugging#/runtime/this-firefox`, click “Load Temporary Add-on,” and select `manifest.json` from this repo.
   - The same manifest supports Firefox via `browser_specific_settings.gecko.id`.
3. After either extension loads, the script automatically runs when the DOM is ready and adds the placeholder Download buttons next to each Share button as clips render. The actual Download formats are retrieved the first time you click a placeholder, so the menu interaction happens on demand.
4. Once the Download submenu is captured for a clip, clicking an individual pill replays the usual flow (open clip menu → expand Download → select format) so the normal Download dialog appears without manually reopening the three-dot menu yourself.

## Notes
- This script works without depending on brittle class names or dataset attributes; it only relies on `aria-label` and visible text. If Suno changes those aria labels, adjust `SHARE_BUTTON_SELECTOR` and the trigger heuristics in `findMenuButton` accordingly.
- There is no automated build/test step. To validate the behavior, visit `https://suno.com/create` after installing the extension and ensure the placeholder Download buttons appear next to each Share button. The MP3/WAV/Video pills appear after you click the placeholder and the menu is successfully parsed; a toast still appears when the script fails to read the menu.
- All styling is injected programmatically so there is no stylesheet to maintain. Tweak the style constants near the top of `src/content-script.js` if you need to align more closely with future UI changes.
