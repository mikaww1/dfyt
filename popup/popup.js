(function () {
  const storageApi = window.DFYTStorage;
  if (!storageApi) {
    return;
  }

  const extApi = storageApi.getExtensionApi();
  const toggleKeys = [
    "hideShorts",
    "hideHomeRecommendations",
    "hideComments",
    "hideRecommendations",
    ...(window.DFYT_CONFIG?.HIDE_ADS_ENABLED ? ["hideAds"] : [])
  ];

  const filterChip = document.getElementById("filterChip");
  const controls = toggleKeys.reduce((acc, key) => {
    acc[key] = document.getElementById(key);
    return acc;
  }, {});

  function updateChip() {
    const count = toggleKeys.filter((key) => controls[key] && controls[key].checked).length;
    filterChip.textContent = count === 1 ? "1 filter active" : count + " filters active";
  }

  function readFormValues() {
    return toggleKeys.reduce((acc, key) => {
      acc[key] = Boolean(controls[key] && controls[key].checked);
      return acc;
    }, {});
  }

  async function notifyActiveYoutubeTab(settings) {
    const tabs = await new Promise((resolve) => {
      extApi.tabs.query({ active: true, currentWindow: true }, (result) => {
        resolve(result || []);
      });
    });

    const activeTab = tabs[0];
    if (!activeTab || !activeTab.id || !activeTab.url) {
      return;
    }

    const isYoutubeTab = /https:\/\/(www\.)?youtube\.com\//.test(activeTab.url);
    if (!isYoutubeTab) {
      return;
    }

    const message = {
      type: "DFYT_SETTINGS_UPDATED",
      settings
    };

    try {
      extApi.tabs.sendMessage(activeTab.id, message, () => {
        const error = extApi.runtime && extApi.runtime.lastError;
        if (error) {
          return;
        }
      });
    } catch (_error) {
      // Ignore transient messaging failures from popup context.
    }
  }

  async function syncUi() {
    const settings = await storageApi.getSettings();
    toggleKeys.forEach((key) => {
      if (controls[key]) {
        controls[key].checked = Boolean(settings[key]);
      }
    });
    updateChip();
  }

  async function onToggleChange() {
    updateChip();
    const next = await storageApi.updateSettings(readFormValues());
    await notifyActiveYoutubeTab(next);
  }

  toggleKeys.forEach((key) => {
    if (controls[key]) {
      controls[key].addEventListener("change", onToggleChange);
    }
  });

  // Hide ads row if feature flag is disabled
  if (!window.DFYT_CONFIG?.HIDE_ADS_ENABLED) {
    const adsRow = document.getElementById("hideAdsRow");
    if (adsRow) {
      adsRow.style.display = "none";
    }
  }

  syncUi().catch((error) => {
    console.error("[DFYT] Failed to load popup settings:", error);
  });
})();