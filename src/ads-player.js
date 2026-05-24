(function () {
  const SKIP_SELECTORS = [
    ".ytp-ad-skip-button",
    ".ytp-skip-ad-button",
    ".ytp-ad-skip-button-modern",
    "button.ytp-ad-skip-button-modern",
    ".ytp-skip-ad-button__icon-button"
  ];

  const AD_CONTAINER_SELECTORS = ["#player-ads", ".video-ads", ".ytp-ad-module"];

  let mitigationActive = false;
  let rafId = null;
  let playerObserver = null;
  let currentSettings = null;

  function isAdsFeatureOn(settings) {
    return Boolean(globalThis.DFYT_CONFIG?.HIDE_ADS_ENABLED && settings?.hideAds);
  }

  function getMoviePlayer() {
    return document.getElementById("movie_player") || document.querySelector(".html5-video-player");
  }

  function isPlayerInAdState(player) {
    if (!player) {
      return false;
    }
    const cls = typeof player.className === "string" ? player.className : "";
    return (
      cls.includes("ad-showing") ||
      cls.includes("ad-interrupting") ||
      cls.includes("ad-overlay-active")
    );
  }

  function hasActiveAdVideo() {
    return Boolean(
      document.querySelector("#player-ads video, .video-ads video, .ytp-ad-player-overlay video")
    );
  }

  function shouldMitigate() {
    const player = getMoviePlayer();
    return isPlayerInAdState(player) || hasActiveAdVideo();
  }

  function clickSkipButtons(root) {
    const scope = root && root.querySelector ? root : document;
    for (const selector of SKIP_SELECTORS) {
      const buttons = scope.querySelectorAll(selector);
      for (const btn of buttons) {
        if (!btn || btn.disabled) {
          continue;
        }
        try {
          btn.click();
          return true;
        } catch (_) {
          // continue
        }
      }
    }
    return false;
  }

  function fastForwardAdVideos(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const videos = scope.querySelectorAll(
      "#player-ads video, .video-ads video, .ytp-ad-player-overlay video"
    );
    videos.forEach((video) => {
      try {
        video.muted = true;
        video.playbackRate = 16;
        if (video.duration && Number.isFinite(video.duration) && video.duration > 0) {
          video.currentTime = Math.max(video.currentTime, video.duration - 0.05);
        }
      } catch (_) {
        // ignore player security errors
      }
    });
  }

  function hideAdContainers() {
    AD_CONTAINER_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.style.setProperty("display", "none", "important");
        el.style.setProperty("visibility", "hidden", "important");
        el.style.setProperty("pointer-events", "none", "important");
      });
    });
  }

  function runMitigationOnce() {
    if (!isAdsFeatureOn(currentSettings)) {
      return;
    }
    if (!shouldMitigate()) {
      return;
    }
    hideAdContainers();
    const player = getMoviePlayer();
    clickSkipButtons(player);
    clickSkipButtons(document);
    fastForwardAdVideos(player);
    fastForwardAdVideos(document);
  }

  function mitigationLoop() {
    if (!mitigationActive) {
      return;
    }
    runMitigationOnce();
    rafId = requestAnimationFrame(mitigationLoop);
  }

  function attachPlayerObserver() {
    if (playerObserver) {
      playerObserver.disconnect();
      playerObserver = null;
    }

    const player = getMoviePlayer();
    if (!player) {
      return;
    }

    playerObserver = new MutationObserver(() => {
      runMitigationOnce();
    });

    playerObserver.observe(player, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true
    });
  }

  function start(settings) {
    currentSettings = settings;
    if (!isAdsFeatureOn(settings)) {
      stop();
      return;
    }

    if (!mitigationActive) {
      mitigationActive = true;
      mitigationLoop();
    }

    attachPlayerObserver();
    runMitigationOnce();
  }

  function stop() {
    mitigationActive = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (playerObserver) {
      playerObserver.disconnect();
      playerObserver = null;
    }
  }

  function refresh(settings) {
    currentSettings = settings;
    if (!isAdsFeatureOn(settings)) {
      stop();
      return;
    }
    start(settings);
  }

  globalThis.DFYTAdsPlayer = {
    start,
    stop,
    refresh,
    runMitigationOnce,
    attachPlayerObserver
  };
})();
