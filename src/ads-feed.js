(function () {
  const FEED_ITEM_SELECTORS = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-reel-item-renderer",
    "ytd-compact-promoted-item-renderer",
    "ytd-promoted-video-renderer"
  ];

  const AD_BADGE_PATTERN = /^(ad|ads|sponsored|paid promotion|paid promotions)$/i;

  function isAdsFeatureOn(settings) {
    return Boolean(globalThis.DFYT_CONFIG?.HIDE_ADS_ENABLED && settings?.hideAds);
  }

  function nodeHasAdBadge(root) {
    if (!root || !root.querySelector) {
      return false;
    }

    if (
      root.querySelector(
        "yt-ad-metadata, ytd-ad-slot-renderer, [overlay-style='AD'], .badge-style-type-ad, [class*='ad-badge']"
      )
    ) {
      return true;
    }

    const badges = root.querySelectorAll(
      "ytd-badge-supported-renderer, tp-yt-paper-badge, .badge-style-type-ad"
    );
    for (const badge of badges) {
      const text = (badge.textContent || "").trim();
      if (AD_BADGE_PATTERN.test(text)) {
        return true;
      }
    }

    const aria = root.querySelector(
      "[aria-label*='Sponsored' i], [aria-label*='Advertisement' i], [aria-label*='Ad' i]"
    );
    if (aria) {
      return true;
    }

    return false;
  }

  function applyPromotedHiding(settings, rulesApi) {
    if (!isAdsFeatureOn(settings) || !rulesApi) {
      return { matches: 0, hidden: 0 };
    }

    const HIDDEN_CLASS = rulesApi.HIDDEN_CLASS;
    const HIDDEN_ATTR = rulesApi.HIDDEN_ATTR;
    const ruleKey = "hideAds";
    let matches = 0;
    let hidden = 0;

    const seen = new Set();
    FEED_ITEM_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((item) => {
        if (!nodeHasAdBadge(item)) {
          return;
        }
        matches += 1;
        if (seen.has(item)) {
          return;
        }
        seen.add(item);
        item.classList.add(HIDDEN_CLASS);
        item.setAttribute(HIDDEN_ATTR, ruleKey);
        hidden += 1;
      });
    });

    return { matches, hidden };
  }

  function applyPromotedHidingFromRoots(settings, rulesApi, roots) {
    if (!isAdsFeatureOn(settings) || !rulesApi || !roots || roots.length === 0) {
      return { matches: 0, hidden: 0 };
    }

    const HIDDEN_CLASS = rulesApi.HIDDEN_CLASS;
    const HIDDEN_ATTR = rulesApi.HIDDEN_ATTR;
    const ruleKey = "hideAds";
    let matches = 0;
    let hidden = 0;
    const seen = new Set();

    roots.forEach((root) => {
      if (!root || root.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const candidates = [root];
      FEED_ITEM_SELECTORS.forEach((selector) => {
        if (root.matches && root.matches(selector)) {
          candidates.push(root);
        }
        if (root.querySelectorAll) {
          candidates.push(...root.querySelectorAll(selector));
        }
      });

      candidates.forEach((item) => {
        if (!item || !nodeHasAdBadge(item)) {
          return;
        }
        matches += 1;
        if (seen.has(item)) {
          return;
        }
        seen.add(item);
        item.classList.add(HIDDEN_CLASS);
        item.setAttribute(HIDDEN_ATTR, ruleKey);
        hidden += 1;
      });
    });

    return { matches, hidden };
  }

  globalThis.DFYTAdsFeed = {
    applyPromotedHiding,
    applyPromotedHidingFromRoots
  };
})();
