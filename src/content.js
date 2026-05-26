(function () {
  if (window.__dfytBootstrapped) {
    return;
  }
  window.__dfytBootstrapped = true;

  const storageApi = window.DFYTStorage;
  const rulesApi = window.DFYTRules;
  const adSkipper = window.DFYTAdSkipper;

  if (!storageApi || !rulesApi) {
    console.error("[DFYT] Missing storage or rules module.");
    return;
  }

  const extApi = storageApi.getExtensionApi();
  const DEV_MODE = false;
  let currentUrl = location.href;
  let cachedSettings = null;
  const pendingMutationRoots = new Set();
  const scheduleState = {
    full: false,
    incremental: false
  };
  let flushTimerId = null;

  function syncAdSkipper() {
    if (!adSkipper) {
      return;
    }
    var adsEnabled =
      Boolean(globalThis.DFYT_CONFIG?.HIDE_ADS_ENABLED) &&
      Boolean(cachedSettings && cachedSettings.hideAds);
    adSkipper.setEnabled(adsEnabled);
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
      scheduleFullApply();
    }
  }

  function onYouTubeNavigationEvent() {
    currentUrl = location.href;
    scheduleFullApply();
  }

  function setupObservers() {
    const observerRoot = document.querySelector("ytd-app") || document.documentElement || document.body;
    const observer = new MutationObserver((records) => {
      const roots = [];
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            roots.push(node);
          }
        });
      });
      if (roots.length === 0) {
        return;
      }
      scheduleIncrementalApply(roots);
    });

    observer.observe(observerRoot, {
      childList: true,
      subtree: true
    });

    document.addEventListener("yt-navigate-finish", onYouTubeNavigationEvent, true);
    document.addEventListener("yt-page-data-updated", onYouTubeNavigationEvent, true);
    window.addEventListener("popstate", onRouteMaybeChanged, true);
    window.addEventListener("hashchange", onRouteMaybeChanged, true);
    setInterval(onRouteMaybeChanged, 5000);
  }

  function setupStartupStabilityPass() {
    [350, 800, 1200, 2600, 5000].forEach((delayMs) => {
      setTimeout(() => {
        scheduleFullApply();
      }, delayMs);
    });

    window.addEventListener(
      "load",
      () => {
        scheduleFullApply();
      },
      { once: true }
    );

    window.addEventListener("pageshow", () => {
      scheduleFullApply();
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
      syncAdSkipper();
      scheduleFullApply();
    });
  }

  function setupStorageListener() {
    storageApi.onStorageChange((nextSettings) => {
      cachedSettings = nextSettings;
      syncAdSkipper();
      scheduleFullApply();
    });
  }

  async function boot() {
    rulesApi.injectBaseStyles();

    if (adSkipper && globalThis.DFYT_CONFIG?.HIDE_ADS_ENABLED) {
      adSkipper.start();
    }

    cachedSettings = await storageApi.getSettings();
    syncAdSkipper();
    await runRules("full");
    setupObservers();
    setupStartupStabilityPass();
    setupMessageListener();
    setupStorageListener();
  }

  boot().catch((error) => {
    console.error("[DFYT] Failed to initialize:", error);
  });
})();
