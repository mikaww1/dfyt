(function () {
  if (window.__dfytBootstrapped) {
    return;
  }
  window.__dfytBootstrapped = true;

  const storageApi = window.DFYTStorage;
  const rulesApi = window.DFYTRules;
  const adsFeedApi = globalThis.DFYTAdsFeed;
  const adsPlayerApi = globalThis.DFYTAdsPlayer;

  if (!storageApi || !rulesApi) {
    console.error("[DFYT] Missing storage or rules module.");
    return;
  }

  const extApi = storageApi.getExtensionApi();
  const DEV_MODE = false;
  const WATCH_AD_PASS_MS = 1200;
  let currentUrl = location.href;
  let cachedSettings = null;
  const pendingMutationRoots = new Set();
  const scheduleState = {
    full: false,
    incremental: false
  };
  let flushTimerId = null;
  let watchAdPassIntervalId = null;

  function isAdsActive() {
    return Boolean(globalThis.DFYT_CONFIG?.HIDE_ADS_ENABLED && cachedSettings?.hideAds);
  }

  function applyAdsExtras(mode, mutationRoots) {
    if (!isAdsActive()) {
      if (adsPlayerApi) {
        adsPlayerApi.stop();
      }
      return;
    }

    if (adsFeedApi) {
      if (mode === "incremental" && mutationRoots && mutationRoots.length > 0) {
        adsFeedApi.applyPromotedHidingFromRoots(cachedSettings, rulesApi, mutationRoots);
      } else {
        adsFeedApi.applyPromotedHiding(cachedSettings, rulesApi);
      }
    }

    if (adsPlayerApi) {
      adsPlayerApi.refresh(cachedSettings);
      adsPlayerApi.runMitigationOnce();
    }
  }

  async function runRules(mode) {
    if (!cachedSettings) {
      cachedSettings = await storageApi.getSettings();
    }
    const routeKey = rulesApi.getRouteKey();
    const mutationRoots = mode === "incremental" ? Array.from(pendingMutationRoots) : undefined;
    rulesApi.applyEnabledRules(cachedSettings, {
      devMode: DEV_MODE,
      mode,
      routeKey,
      mutationRoots
    });
    applyAdsExtras(mode, mutationRoots);
  }

  function scheduleFlush(delayMs) {
    clearTimeout(flushTimerId);
    flushTimerId = setTimeout(() => {
      const nextMode = scheduleState.full ? "full" : "incremental";
      scheduleState.full = false;
      scheduleState.incremental = false;
      runRules(nextMode)
        .catch((error) => {
          console.error("[DFYT] Failed to apply rules:", error);
        })
        .finally(() => {
          pendingMutationRoots.clear();
        });
    }, delayMs);
  }

  function scheduleFullApply() {
    scheduleState.full = true;
    scheduleFlush(50);
  }

  function scheduleIncrementalApply(roots) {
    if (scheduleState.full) {
      return;
    }
    roots.forEach((node) => pendingMutationRoots.add(node));
    scheduleState.incremental = true;
    scheduleFlush(50);
  }

  function onRouteMaybeChanged() {
    if (location.href !== currentUrl) {
      currentUrl = location.href;
      setupWatchAdPass();
      scheduleFullApply();
    }
  }

  function onYouTubeNavigationEvent() {
    currentUrl = location.href;
    setupWatchAdPass();
    scheduleFullApply();
  }

  function setupObservers() {
    const observerRoot = document.querySelector("ytd-app") || document.documentElement || document.body;
    const observer = new MutationObserver((records) => {
      const roots = [];
      let playerClassChanged = false;

      records.forEach((record) => {
        if (record.type === "attributes" && record.target === document.getElementById("movie_player")) {
          playerClassChanged = true;
        }
        record.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            roots.push(node);
          }
        });
      });

      if (playerClassChanged && isAdsActive() && adsPlayerApi) {
        adsPlayerApi.runMitigationOnce();
      }

      if (roots.length === 0) {
        return;
      }
      scheduleIncrementalApply(roots);
    });

    observer.observe(observerRoot, {
      childList: true,
      subtree: true
    });

    setupPlayerAttributeObserver();

    document.addEventListener("yt-navigate-finish", onYouTubeNavigationEvent, true);
    document.addEventListener("yt-page-data-updated", onYouTubeNavigationEvent, true);
    window.addEventListener("popstate", onRouteMaybeChanged, true);
    window.addEventListener("hashchange", onRouteMaybeChanged, true);
    setInterval(onRouteMaybeChanged, 5000);
  }

  function setupPlayerAttributeObserver() {
    let observedPlayer = null;
    let playerObserver = null;

    function tryObservePlayer() {
      const player = document.getElementById("movie_player");
      if (!player || player === observedPlayer) {
        return;
      }

      if (playerObserver) {
        playerObserver.disconnect();
      }

      observedPlayer = player;
      playerObserver = new MutationObserver(() => {
        if (isAdsActive() && adsPlayerApi) {
          adsPlayerApi.runMitigationOnce();
          scheduleFullApply();
        }
      });

      playerObserver.observe(player, {
        attributes: true,
        attributeFilter: ["class"],
        childList: true,
        subtree: true
      });

      if (isAdsActive() && adsPlayerApi) {
        adsPlayerApi.attachPlayerObserver();
      }
    }

    tryObservePlayer();

    const mountObserver = new MutationObserver(() => {
      tryObservePlayer();
    });
    mountObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function setupWatchAdPass() {
    if (watchAdPassIntervalId) {
      clearInterval(watchAdPassIntervalId);
      watchAdPassIntervalId = null;
    }

    if (!isAdsActive() || rulesApi.getRouteKey() !== "watch") {
      return;
    }

    watchAdPassIntervalId = setInterval(() => {
      if (!isAdsActive() || rulesApi.getRouteKey() !== "watch") {
        return;
      }
      scheduleFullApply();
      if (adsPlayerApi) {
        adsPlayerApi.runMitigationOnce();
        adsPlayerApi.attachPlayerObserver();
      }
    }, WATCH_AD_PASS_MS);
  }

  function setupStartupStabilityPass() {
    [350, 1200, 2600].forEach((delayMs) => {
      setTimeout(() => {
        scheduleFullApply();
      }, delayMs);
    });

    window.addEventListener(
      "load",
      () => {
        scheduleFullApply();
        setupWatchAdPass();
      },
      { once: true }
    );

    window.addEventListener("pageshow", () => {
      scheduleFullApply();
      setupWatchAdPass();
    });
  }

  function setupMessageListener() {
    if (!extApi.runtime || !extApi.runtime.onMessage) {
      return;
    }
    extApi.runtime.onMessage.addListener((message) => {
      if (!message || message.type !== "DFYT_SETTINGS_UPDATED") {
        return;
      }
      cachedSettings = message.settings || cachedSettings;
      setupWatchAdPass();
      scheduleFullApply();
    });
  }

  function setupStorageListener() {
    storageApi.onStorageChange((nextSettings) => {
      cachedSettings = nextSettings;
      setupWatchAdPass();
      scheduleFullApply();
    });
  }

  async function boot() {
    rulesApi.injectBaseStyles();
    cachedSettings = await storageApi.getSettings();
    await runRules("full");
    setupObservers();
    setupStartupStabilityPass();
    setupWatchAdPass();
    setupMessageListener();
    setupStorageListener();
  }

  boot().catch((error) => {
    console.error("[DFYT] Failed to initialize:", error);
  });
})();
