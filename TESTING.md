# Manual QA Checklist

## Load extension
1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked** and select this project folder.

## Core toggle checks
1. Open the extension popup and verify all toggles render.
2. Turn each toggle on/off and confirm `Saved` appears.
3. Refresh the popup and confirm toggle states persist.

## YouTube surface checks
1. Home (`https://www.youtube.com/`):
   - `Hide Home Recommendations` should hide the feed grid.
   - `Hide Shorts` should hide Shorts shelves/entries where detected.
2. Watch page (`https://www.youtube.com/watch?v=...`):
   - `Hide Comments` should hide comments section.
   - `Hide Related Videos` should hide right-side recommendations.
3. Search results (`https://www.youtube.com/results?...`):
   - `Hide Shorts` should hide shorts entry tiles when detected.
4. Subscriptions (`https://www.youtube.com/feed/subscriptions`):
   - `Hide Shorts` should hide shorts shelves where detected.

## SPA navigation checks
1. Navigate between Home and Watch pages without full reload.
2. Confirm hidden sections stay hidden after in-site navigation.
3. Use browser Back/Forward and verify rules re-apply.

## Ad blocking checks (full build: `HIDE_ADS_ENABLED` + `NETWORK_AD_BLOCK_ENABLED` true)
1. Confirm **Ads** toggle is on in the popup (default on for new installs).
2. Home: scroll feed — no in-feed ad cards, masthead promos, or "Sponsored" tiles.
3. Search: run a query — no promoted/pyv ad rows.
4. Watch — pre-roll: video should skip, fast-forward, or not play audible ad (reload incognito if needed).
5. Watch — mid-roll: seek to mid-video on a monetized video; ad overlay should clear quickly.
6. Watch — sidebar: no companion/banner ad panels.
7. Toggle **Ads** off: reload YouTube — ads may appear again; network ruleset should disable (check `chrome://extensions` → service worker console for errors).
8. SPA: navigate Home → Watch → Search without full reload; ads stay hidden on each surface.

## Regression checks
1. Disable all toggles.
2. Confirm comments, related videos, and home feed return normally.
3. Restart browser and ensure settings remain persisted.
