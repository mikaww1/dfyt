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
    "hideAds"
  ];

  const statusText = document.getElementById("statusText");
  const controls = toggleKeys.reduce((acc, key) => {
    acc[key] = document.getElementById(key);
    return acc;
  }, {});

  function setStatus(message) {
    statusText.textContent = message;
    setTimeout(() => {
      if (statusText.textContent === message) {
        statusText.textContent = "";
      }
    }, 1200);
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
          // This can happen if the tab navigated and content script is not attached yet.
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
  }

  async function onToggleChange() {
    const next = await storageApi.updateSettings(readFormValues());
    await notifyActiveYoutubeTab(next);
    setStatus("Saved");
  }

  toggleKeys.forEach((key) => {
    if (controls[key]) {
      controls[key].addEventListener("change", onToggleChange);
    }
  });

  syncUi().catch((error) => {
    console.error("[DFYT] Failed to load popup settings:", error);
  });
})();
