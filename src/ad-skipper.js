(function () {
  let enabled = true;
  let playerObserver = null;
  let skipPollId = null;
  let savedMuted = null;
  let savedRate = null;

  const SKIP_BTN_SELECTORS = [
    ".ytp-skip-ad-button",
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-ad-skip-button-container button",
    'button[class*="skip-button"]'
  ];

  function getPlayer() {
    return document.querySelector(".html5-video-player");
  }

  function getVideo() {
    return (
      document.querySelector("video.html5-main-video") ||
      document.querySelector("#movie_player video") ||
      document.querySelector("video")
    );
  }

  function isAdPlaying() {
    const player = getPlayer();
    return (
      player != null &&
      (player.classList.contains("ad-showing") || player.classList.contains("ad-interrupting"))
    );
  }

  function tryClickSkip() {
    for (const sel of SKIP_BTN_SELECTORS) {
      const btn = document.querySelector(sel);
      if (btn) {
        btn.click();
        return true;
      }
    }
    return false;
  }

  function forceSkipAd() {
    if (!enabled) {
      return;
    }

    if (tryClickSkip()) {
      return;
    }

    const video = getVideo();
    if (!video) {
      return;
    }

    if (savedMuted === null) {
      savedMuted = video.muted;
      savedRate = video.playbackRate;
    }

    video.muted = true;

    if (video.duration && isFinite(video.duration) && video.duration > 0) {
      video.currentTime = video.duration;
    }

    try {
      video.playbackRate = 16;
    } catch (_) {}
  }

  function restorePlayer() {
    const video = getVideo();
    if (!video) {
      return;
    }
    if (savedRate !== null) {
      try {
        video.playbackRate = savedRate;
      } catch (_) {}
    }
    if (savedMuted !== null) {
      video.muted = savedMuted;
    }
    savedMuted = null;
    savedRate = null;
  }

  function startSkipPoll() {
    if (skipPollId) {
      return;
    }
    skipPollId = setInterval(function () {
      if (isAdPlaying()) {
        forceSkipAd();
      } else {
        stopSkipPoll();
        restorePlayer();
      }
    }, 50);
  }

  function stopSkipPoll() {
    if (skipPollId) {
      clearInterval(skipPollId);
      skipPollId = null;
    }
  }

  function onPlayerClassChange() {
    if (!enabled) {
      return;
    }
    if (isAdPlaying()) {
      forceSkipAd();
      startSkipPoll();
    }
  }

  function attachToPlayer() {
    if (playerObserver) {
      playerObserver.disconnect();
      playerObserver = null;
    }

    const player = getPlayer();
    if (!player) {
      return false;
    }

    playerObserver = new MutationObserver(onPlayerClassChange);
    playerObserver.observe(player, {
      attributes: true,
      attributeFilter: ["class"]
    });

    var videoAds = player.querySelector(".video-ads");
    if (videoAds) {
      playerObserver.observe(videoAds, {
        childList: true,
        subtree: true
      });
    }

    onPlayerClassChange();
    return true;
  }

  function waitForPlayer() {
    if (attachToPlayer()) {
      return;
    }

    var waitObserver = new MutationObserver(function () {
      if (attachToPlayer()) {
        waitObserver.disconnect();
      }
    });

    var root = document.documentElement || document.body;
    if (root) {
      waitObserver.observe(root, { childList: true, subtree: true });
    }
  }

  window.DFYTAdSkipper = {
    setEnabled: function (val) {
      enabled = val;
      if (!enabled) {
        stopSkipPoll();
      } else {
        onPlayerClassChange();
      }
    },
    start: function () {
      waitForPlayer();
      document.addEventListener("yt-navigate-finish", function () {
        setTimeout(waitForPlayer, 100);
      });
    }
  };
})();
