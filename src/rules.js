(function () {
  const HIDDEN_CLASS = "dfyt-hidden";
  const HIDDEN_ATTR = "data-dfyt-hidden";
  const APPLIED_BY_RULE = new Map();

  const RULES = {
    hideShorts: {
      debugName: "Hide Shorts",
      routes: ["all"],
      targets: [
        { selector: "ytd-rich-shelf-renderer" },
        { selector: "ytd-reel-shelf-renderer" },
        { selector: "ytd-guide-entry-renderer a[href='/shorts']", closest: "ytd-guide-entry-renderer" },
        { selector: "ytd-mini-guide-entry-renderer a[href='/shorts']", closest: "ytd-mini-guide-entry-renderer" },
        { selector: "tp-yt-paper-tab a[href='/shorts']", closest: "tp-yt-paper-tab" },
        { selector: "a[title='Shorts']", closest: "ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, tp-yt-paper-tab" },
        { selector: "ytd-rich-item-renderer a[href^='/shorts/']", closest: "ytd-rich-item-renderer" }
      ]
    },
    hideHomeRecommendations: {
      debugName: "Hide Home Recommendations",
      routes: ["home"],
      targets: [
        { selector: "ytd-rich-grid-renderer" },
        { selector: "ytd-two-column-browse-results-renderer #primary ytd-rich-grid-renderer" }
      ]
    },
    hideComments: {
      debugName: "Hide Comments",
      routes: ["watch"],
      targets: [
        { selector: "#comments" },
        { selector: "ytd-comments" }
      ]
    },
    hideRecommendations: {
      debugName: "Hide Recommendations",
      routes: ["home", "watch"],
      targets: [
        { selector: "#secondary" },
        { selector: "ytd-watch-next-secondary-results-renderer" },
        { selector: "ytp-endscreen-container" },
        { selector: ".ytp-endscreen-element" }
      ]
    },
    hideAds: {
      debugName: "Hide Ads",
      routes: ["all"],
      targets: [
        { selector: "ytd-ad-slot-renderer" },
        { selector: "div[data-ad-slot-index]" },
        { selector: "ytp-ad-message-container" },
        { selector: "div.ytp-ad-player-overlay" }
      ]
    },
    hideEndscreenCards: {
      debugName: "Hide Endscreen Cards",
      routes: ["watch"],
      targets: [
        { selector: "ytp-endscreen-container" },
        { selector: ".ytp-endscreen-element" }
      ]
    }
  };

  function injectBaseStyles() {
    if (document.getElementById("dfyt-style")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "dfyt-style";
    style.textContent = `
      .${HIDDEN_CLASS} {
        display: none !important;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function isWatchingFromPlaylist() {
    const url = new URL(location.href);
    return url.searchParams.has("list");
  }

  function getRouteKey() {
    if (location.pathname === "/") {
      return "home";
    }
    if (location.pathname === "/watch") {
      return "watch";
    }
    if (location.pathname.startsWith("/results")) {
      return "search";
    }
    if (location.pathname.startsWith("/feed/subscriptions")) {
      return "subscriptions";
    }
    return "other";
  }

  function getRuleSet(ruleKey) {
    if (!APPLIED_BY_RULE.has(ruleKey)) {
      APPLIED_BY_RULE.set(ruleKey, new Set());
    }
    return APPLIED_BY_RULE.get(ruleKey);
  }

  function unhideNode(node) {
    if (!node || !node.classList) {
      return;
    }
    node.classList.remove(HIDDEN_CLASS);
    node.removeAttribute(HIDDEN_ATTR);
  }

  function clearRule(ruleKey) {
    const known = getRuleSet(ruleKey);
    known.forEach((node) => {
      unhideNode(node);
    });
    known.clear();
  }

  function isRuleActiveOnRoute(rule, routeKey) {
    const routes = rule.routes || ["all"];
    return routes.includes("all") || routes.includes(routeKey);
  }

  function resolveTargetNode(node, closestSelector) {
    if (!closestSelector) {
      return node;
    }
    return node.closest(closestSelector) || node;
  }

  function matchesFromRoot(rootNode, selector) {
    const matches = [];
    if (!rootNode) {
      return matches;
    }
    if (rootNode.nodeType === Node.ELEMENT_NODE) {
      if (rootNode.matches(selector)) {
        matches.push(rootNode);
      }
      matches.push(...rootNode.querySelectorAll(selector));
      return matches;
    }
    if (rootNode.querySelectorAll) {
      matches.push(...rootNode.querySelectorAll(selector));
    }
    return matches;
  }

  function getApplicableTargets(ruleKey, targets) {
    // When watching from a playlist, only hide the recommendations section
    // (ytd-watch-next-secondary-results-renderer), not the playlist queue
    if (ruleKey === "hideRecommendations" && isWatchingFromPlaylist()) {
      return [
        { selector: "ytd-watch-next-secondary-results-renderer" },
        { selector: "ytp-endscreen-container" },
        { selector: ".ytp-endscreen-element" }
      ];
    }
    return targets;
  }

  function applyRuleFull(ruleKey, rule, devMode) {
    const known = getRuleSet(ruleKey);
    const nextNodes = new Set();
    let matches = 0;
    let hidden = 0;

    const applicableTargets = getApplicableTargets(ruleKey, rule.targets);

    applicableTargets.forEach((targetDef) => {
      const nodes = document.querySelectorAll(targetDef.selector);
      matches += nodes.length;
      nodes.forEach((node) => {
        const targetNode = resolveTargetNode(node, targetDef.closest);
        nextNodes.add(targetNode);
      });
    });

    nextNodes.forEach((node) => {
      node.classList.add(HIDDEN_CLASS);
      node.setAttribute(HIDDEN_ATTR, ruleKey);
      if (!known.has(node)) {
        hidden += 1;
      }
      known.add(node);
    });

    known.forEach((node) => {
      if (!node.isConnected || !nextNodes.has(node)) {
        unhideNode(node);
        known.delete(node);
      }
    });

    if (devMode && matches === 0) {
      console.debug(`[DFYT] ${rule.debugName} matched 0 nodes on ${location.pathname}`);
    }

    return { matches, hidden };
  }

  function applyRuleIncremental(ruleKey, rule, mutationRoots) {
    const known = getRuleSet(ruleKey);
    let matches = 0;
    let hidden = 0;

    const applicableTargets = getApplicableTargets(ruleKey, rule.targets);

    mutationRoots.forEach((root) => {
      applicableTargets.forEach((targetDef) => {
        const candidates = matchesFromRoot(root, targetDef.selector);
        matches += candidates.length;
        candidates.forEach((candidate) => {
          const targetNode = resolveTargetNode(candidate, targetDef.closest);
          if (known.has(targetNode)) {
            return;
          }
          targetNode.classList.add(HIDDEN_CLASS);
          targetNode.setAttribute(HIDDEN_ATTR, ruleKey);
          known.add(targetNode);
          hidden += 1;
        });
      });
    });

    known.forEach((node) => {
      if (!node.isConnected) {
        known.delete(node);
      }
    });

    return { matches, hidden };
  }

  function applyEnabledRules(settings, options) {
    injectBaseStyles();
    const devMode = Boolean(options && options.devMode);
    const mode = (options && options.mode) || "full";
    const routeKey = (options && options.routeKey) || getRouteKey();
    const mutationRoots =
      (options && options.mutationRoots && options.mutationRoots.length > 0 && options.mutationRoots) ||
      [document];
    const report = {};

    Object.keys(RULES).forEach((ruleKey) => {
      // Check feature flag for hideAds
      if (ruleKey === "hideAds" && !window.DFYT_CONFIG?.HIDE_ADS_ENABLED) {
        clearRule(ruleKey);
        report[ruleKey] = { enabled: false, matches: 0, hidden: 0 };
        return;
      }
      
      const enabled = Boolean(settings[ruleKey]);
      const routeActive = isRuleActiveOnRoute(RULES[ruleKey], routeKey);
      if (!enabled || !routeActive) {
        clearRule(ruleKey);
        report[ruleKey] = { enabled: false, matches: 0, hidden: 0 };
        return;
      }
      const result =
        mode === "incremental"
          ? applyRuleIncremental(ruleKey, RULES[ruleKey], mutationRoots)
          : applyRuleFull(ruleKey, RULES[ruleKey], devMode);
      report[ruleKey] = { enabled: true, ...result };
    });

    return report;
  }

  window.DFYTRules = {
    RULES,
    HIDDEN_CLASS,
    HIDDEN_ATTR,
    getRouteKey,
    applyEnabledRules,
    injectBaseStyles
  };
})();
