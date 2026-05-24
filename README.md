# Distraction Free YouTube

A lightweight Chrome extension that removes distracting YouTube UI elements with simple toggles.

## Features

- Hide Shorts
- Hide Home Recommendations
- Hide Comments
- Hide Related Videos & Endscreen Cards
- Hide Ads (feed, banners, companions, player ad overlays — DOM only)
- Persistent settings with instant toggle updates
- SPA-aware behavior for YouTube navigation

## Project Structure

- `manifest.json` - extension manifest (MV3)
- `src/config.js` - feature flag configuration
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

## Configuration

### Hide Ads toggle

Set `HIDE_ADS_ENABLED` in `src/config.js`:

- `true` — Shows the Ads toggle and hides ad UI in feeds and on the page (default).
- `false` — Store-safe build without ad hiding.

**Note:** Ads are hidden with CSS (`display: none`) on matching elements. This works well for home feed, search, and sidebar ads. In-video pre-roll may still play sometimes; hiding the player ad container breaks playback, so this build does not do that.

## Notes

- Built for Chrome first (MV3), with structure that can be adapted for other Chromium browsers.

## Testing

Use the checklist in `TESTING.md` for manual verification.
