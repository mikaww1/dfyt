// Feature flags — keep in sync with src/config.js
globalThis.DFYT_CONFIG = {
  HIDE_ADS_ENABLED: true,
  NETWORK_AD_BLOCK_ENABLED: true
};

const RULESET_ID = "dfyt_block_ads";

function isNetworkAdBlockEnabled() {
  return Boolean(globalThis.DFYT_CONFIG && globalThis.DFYT_CONFIG.NETWORK_AD_BLOCK_ENABLED);
}

function getHideAdsFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["dfytSettings"], (result) => {
      const err = chrome.runtime.lastError;
      if (err) {
        resolve(false);
        return;
      }
      resolve(Boolean(result.dfytSettings && result.dfytSettings.hideAds));
    });
  });
}

async function syncNetworkRules() {
  if (
    !isNetworkAdBlockEnabled() ||
    !globalThis.DFYT_CONFIG?.HIDE_ADS_ENABLED ||
    !chrome.declarativeNetRequest
  ) {
    try {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: [],
        disableRulesetIds: [RULESET_ID]
      });
    } catch (_) {
      // ruleset may not exist in store builds
    }
    return;
  }

  const hideAds = await getHideAdsFromStorage();
  const enableIds = hideAds ? [RULESET_ID] : [];
  const disableIds = hideAds ? [] : [RULESET_ID];

  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enableIds,
      disableRulesetIds: disableIds
    });
  } catch (error) {
    console.error("[DFYT] Failed to sync network ad rules:", error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  syncNetworkRules();
});

chrome.runtime.onStartup.addListener(() => {
  syncNetworkRules();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.dfytSettings) {
    return;
  }
  syncNetworkRules();
});
