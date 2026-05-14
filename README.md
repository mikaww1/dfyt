# Distraction Free YouTube

A lightweight Chrome extension that removes distracting YouTube UI elements with simple toggles.

## Features

- Hide Shorts
- Hide Home Recommendations
- Hide Comments
- Hide Related Videos & Endscreen Cards
- Hide Ads (optional, configurable)
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
- `popup/popup.js` - popup logic and messaging

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

### Feature Flags

The extension supports feature flags via `src/config.js` to build different versions:

#### Hide Ads Toggle

By default, ad hiding is **disabled** for Chrome Web Store compliance. To enable it:

1. Open `src/config.js`
2. Change `HIDE_ADS_ENABLED: false` to `HIDE_ADS_ENABLED: true`
3. The "Hide Ads" toggle will appear in the popup UI

**Use cases:**
- **Store version** (`HIDE_ADS_ENABLED: false`): Safe for Chrome Web Store submission
- **Personal version** (`HIDE_ADS_ENABLED: true`): Full feature set with ad hiding

## Notes

- Built for Chrome first (MV3), with structure that can be adapted for other Chromium browsers.
- Ad hiding is feature-flagged and must be explicitly enabled in `src/config.js`

## Testing

Use the checklist in `TESTING.md` for manual verification.

