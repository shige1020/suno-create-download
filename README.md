# suno-create-download

Adds a persistent set of Download pills to each clip card on https://suno.com/create so that the Download modal can be opened without hunting through the three-dot menu. The content script lives in `src/content-script.js` and follows the provided spec:

- watches the clip list area (`[data-testid="clip-row"]`) and injects pills only when a new clip row appears, preventing the observer from reacting to unrelated DOM churn.
- renders fixed MP3/WAV/Video Download pills next to the Share button and opens the Download submenu on demand when you click one of them.
- keeps the pills inline (no overflow) and relies on Suno's own Download modal behavior to enforce any limits.

## Usage
1. Chrome – load the repo as an unpacked extension:
   - Open `chrome://extensions`, enable Developer Mode, click “Load unpacked,” and point to the repo root.
   - The extension manifest (`manifest.json`) injects `src/content-script.js` on `https://suno.com/create*`.
2. Firefox – install via the debugging UI:
   - Open `about:debugging#/runtime/this-firefox`, click “Load Temporary Add-on,” and select `manifest.json` from this repo.
   - The same manifest supports Firefox via `browser_specific_settings.gecko.id`.
3. After either extension loads, the script automatically runs when the DOM is ready and adds MP3/WAV/Video pills next to each Share button as clips render.
4. Clicking a pill replays the usual flow (open clip menu → expand Download → select format) so the normal Download dialog appears without manually reopening the three-dot menu yourself.

## Notes
- This script works without depending on brittle class names or dataset attributes; it only relies on `aria-label` and visible text. If Suno changes those aria labels, adjust `SHARE_BUTTON_SELECTOR` and the trigger heuristics in `findMenuButton` accordingly.
- There is no automated build/test step. To validate the behavior, visit `https://suno.com/create` after installing the extension and ensure the MP3/WAV/Video pills appear next to each Share button and open the expected Download modal.
- All styling is injected programmatically so there is no stylesheet to maintain. Tweak the style constants near the top of `src/content-script.js` if you need to align more closely with future UI changes.
