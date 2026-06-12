# Distraction Free YT

A lightweight Chrome extension that removes distracting YouTube UI elements with simple toggles.

## Features

- Hide Shorts
- Hide Home Recommendations
- Hide Comments
- Hide Related Videos & Endscreen Cards
- Persistent settings with instant toggle updates
- SPA-aware behavior for YouTube navigation

## Project Structure

- `manifest.json` - extension manifest (MV3)
- `src/content.js` - content script runtime and observer scheduler
- `src/rules.js` - DOM hide rules and route-aware application
- `src/storage.js` - settings persistence layer
- `popup/popup.html` - popup UI
- `popup/popup.css` - popup styles
- `popup/popup.js` - popup logic

## Install (Developer Mode)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.

## Usage

1. Open YouTube.
2. Click the extension icon.
3. Toggle any option on/off.
4. Changes apply automatically and are saved.

## Notes

- Built for Chrome first (MV3), with structure that can be adapted for other Chromium browsers.

## Testing

Use the checklist in `TESTING.md` for manual verification.
