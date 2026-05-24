(function () {
  const SETTINGS_KEY = "dfytSettings";
  const CURRENT_SCHEMA_VERSION = 1;

  const DEFAULT_SETTINGS = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    hideShorts: false,
    hideHomeRecommendations: false,
    hideComments: false,
    hideRecommendations: false,
    hideAds: true,
    hideEndscreenCards: false
  };

  function getExtensionApi() {
    if (typeof browser !== "undefined" && browser.storage) {
      return browser;
    }
    if (typeof chrome !== "undefined" && chrome.storage) {
      return chrome;
    }
    throw new Error("No WebExtension API detected.");
  }

  const extApi = getExtensionApi();

  function migrateSettings(rawSettings) {
    const input = rawSettings && typeof rawSettings === "object" ? rawSettings : {};
    let merged = { ...DEFAULT_SETTINGS, ...input };

    if (!merged.schemaVersion || merged.schemaVersion < 1) {
      merged.schemaVersion = 1;
    }

    // Migrate hideRelatedVideos -> hideRecommendations
    if (input.hasOwnProperty("hideRelatedVideos") && !input.hasOwnProperty("hideRecommendations")) {
      merged.hideRecommendations = input.hideRelatedVideos;
    }
    // Remove old key
    delete merged.hideRelatedVideos;

    return merged;
  }

  function getFromStorage() {
    return new Promise((resolve, reject) => {
      extApi.storage.local.get([SETTINGS_KEY], (result) => {
        const error = extApi.runtime && extApi.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(result ? result[SETTINGS_KEY] : undefined);
      });
    });
  }

  function setToStorage(settings) {
    return new Promise((resolve, reject) => {
      extApi.storage.local.set({ [SETTINGS_KEY]: settings }, () => {
        const error = extApi.runtime && extApi.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
  }

  async function getSettings() {
    const raw = await getFromStorage();
    const migrated = migrateSettings(raw);

    if (!raw || JSON.stringify(raw) !== JSON.stringify(migrated)) {
      await setToStorage(migrated);
    }

    return migrated;
  }

  async function updateSettings(patch) {
    const current = await getSettings();
    const next = migrateSettings({ ...current, ...patch });
    await setToStorage(next);
    return next;
  }

  function onStorageChange(callback) {
    if (!extApi.storage || !extApi.storage.onChanged) {
      return function noop() {};
    }

    function listener(changes, areaName) {
      if (areaName !== "local" || !changes[SETTINGS_KEY]) {
        return;
      }
      const nextValue = migrateSettings(changes[SETTINGS_KEY].newValue);
      callback(nextValue);
    }

    extApi.storage.onChanged.addListener(listener);
    return function unsubscribe() {
      extApi.storage.onChanged.removeListener(listener);
    };
  }

  window.DFYTStorage = {
    SETTINGS_KEY,
    DEFAULT_SETTINGS,
    getSettings,
    updateSettings,
    onStorageChange,
    getExtensionApi
  };
})();
