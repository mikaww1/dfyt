// Feature flag: false = store-safe build (no Hide Ads toggle or rules)
var DFYT_CONFIG = {
  HIDE_ADS_ENABLED: true
};

if (typeof globalThis !== "undefined") {
  globalThis.DFYT_CONFIG = DFYT_CONFIG;
}
