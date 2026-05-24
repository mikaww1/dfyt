// Feature flags for store-safe vs full builds (works in page + service worker via globalThis)
var DFYT_CONFIG = {
  // false = no ad UI in popup, no ad rules, no player mitigation
  HIDE_ADS_ENABLED: true,
  // false = no declarativeNetRequest ad blocking (store-safe)
  NETWORK_AD_BLOCK_ENABLED: true
};

if (typeof globalThis !== "undefined") {
  globalThis.DFYT_CONFIG = DFYT_CONFIG;
}
