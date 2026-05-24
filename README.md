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
- `background.js` - service worker; enables network ad rules when Hide Ads is on
- `src/content.js` - content script runtime and observer scheduler
- `src/rules.js` - DOM hide rules and route-aware application
- `src/ads-feed.js` - sponsored/promoted feed item detection
- `src/ads-player.js` - in-player ad skip and fast-forward
- `src/storage.js` - settings persistence layer
- `rules/dnr-rules.json` - declarativeNetRequest block list (full build)
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

#### Feature flags (`src/config.js`)

| Flag | Store-safe build | Full build |
|------|------------------|------------|
| `HIDE_ADS_ENABLED` | `false` | `true` |
| `NETWORK_AD_BLOCK_ENABLED` | `false` | `true` |

- **Store version**: No ad toggle, no DOM/network ad blocking.
- **Full version**: Hide Ads toggle (on by default), expanded DOM hiding, in-player skip/fast-forward, promoted-feed detection, and optional `declarativeNetRequest` rules (enabled when Hide Ads is on).

## Notes

- Built for Chrome first (MV3), with structure that can be adapted for other Chromium browsers.
- Ad hiding is feature-flagged and must be explicitly enabled in `src/config.js`

## Testing

Use the checklist in `TESTING.md` for manual verification.

