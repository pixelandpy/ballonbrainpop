/* ════════════════════════════════════════
   BRAINPOP v2 — ads.js
   Ad management system.

   ── WEB (Google AdSense) ──
   Banner ads use <ins class="adsbygoogle">
   in index.html with data-ad-slot values.
   Replace REPLACE_*_SLOT with real slot IDs
   from your AdSense account dashboard.

   ── MOBILE APP (AdMob) ──
   Replace placeholder functions below with
   the AdMob SDK calls for your platform:
   • Capacitor: @capacitor-community/admob
   • Cordova:   cordova-plugin-admob-plus
   • WebView:   JavascriptInterface bridge

   ── REWARDED & INTERSTITIAL (Web) ──
   For web, use AdSense "Full-page ads" or
   integrate a rewarded ad partner (e.g.
   Google Ad Manager, IronSource, AppLovin).
════════════════════════════════════════ */

const AdsManager = (() => {

  let interstitialCount = 0;
  const INTERSTITIAL_EVERY = 4; // Show interstitial every N games

  /* ── Initialize AdSense banners ── */
  function initBanners() {
    // AdSense auto-initializes <ins> tags automatically when the script loads.
    // This function can be used to lazy-load or refresh banners on navigation.
    try {
      (adsbygoogle = window.adsbygoogle || []).push({});
    } catch(e) {
      console.log('[Ads] AdSense init skipped (already loaded).');
    }
  }

  /* ══════════════════════════════════════
     REWARDED AD
     Shown for: revive, double coins, free power.
     Web: Shows simulation. Replace with real SDK.
  ══════════════════════════════════════ */
  function showRewardedAd(reason, onRewardCallback) {
    console.log('[AdsManager] Rewarded ad — reason:', reason);

    // ── FOR ADMOB (Capacitor) — uncomment below ──
    // const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob');
    // AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
    //   if (typeof onRewardCallback === 'function') onRewardCallback();
    // });
    // await AdMob.showRewardVideoAd();
    // return;

    // ── FOR ADMOB (Cordova) — uncomment below ──
    // admob.rewardvideo.show({ id: 'ca-app-pub-YOUR_APP_ID/YOUR_UNIT_ID' })
    //   .then(() => { if (typeof onRewardCallback === 'function') onRewardCallback(); });
    // return;

    // ── Placeholder simulation for browser testing ──
    const overlay = document.getElementById('adOverlay');
    const fillEl  = document.getElementById('adSimFill');
    const msgEl   = document.getElementById('adOverlayMsg');
    const closeEl = document.getElementById('adCloseBtn');

    overlay.style.display = 'flex';
    fillEl.style.width    = '0%';
    closeEl.style.display = 'none';

    const msgs = [
      '📺 Advertisement playing…',
      '⏳ Almost done…',
      '✅ Thank you for watching!'
    ];

    msgEl.textContent = msgs[0];
    let pct = 0, msgIdx = 0;

    const interval = setInterval(() => {
      pct += 2;
      fillEl.style.width = pct + '%';

      if (pct === 35) msgEl.textContent = msgs[1];
      if (pct === 75) msgEl.textContent = msgs[2];

      if (pct >= 100) {
        clearInterval(interval);
        closeEl.style.display = 'block';
        window._adCloseCallback = () => {
          overlay.style.display = 'none';
          window._adCloseCallback = null;
          if (typeof onRewardCallback === 'function') onRewardCallback();
        };
      }
    }, 45); // ~2.25 seconds
  }

  /* ══════════════════════════════════════
     INTERSTITIAL AD
     Show between game sessions.
  ══════════════════════════════════════ */
  function showInterstitialAd(onDoneCallback) {
    interstitialCount++;

    if (interstitialCount % INTERSTITIAL_EVERY !== 0) {
      if (typeof onDoneCallback === 'function') onDoneCallback();
      return;
    }

    console.log('[AdsManager] Interstitial ad shown.');

    // ── FOR ADMOB (Capacitor) — uncomment below ──
    // const { AdMob } = await import('@capacitor-community/admob');
    // await AdMob.prepareInterstitial({ adId: 'ca-app-pub-YOUR_APP_ID/YOUR_UNIT_ID' });
    // AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
    //   if (typeof onDoneCallback === 'function') onDoneCallback();
    // });
    // await AdMob.showInterstitial();
    // return;

    // ── FOR WEB (Google AdSense Full-Page) ──
    // Full-page interstitials require Google Ad Manager.
    // See: https://support.google.com/admanager/answer/9037902

    // ── Placeholder simulation ──
    const overlay = document.getElementById('adOverlay');
    const fillEl  = document.getElementById('adSimFill');
    const msgEl   = document.getElementById('adOverlayMsg');
    const closeEl = document.getElementById('adCloseBtn');

    overlay.style.display = 'flex';
    fillEl.style.width    = '0%';
    closeEl.style.display = 'none';
    msgEl.textContent     = '📺 Advertisement — Continue after…';

    let pct = 0;
    const interval = setInterval(() => {
      pct += 4;
      fillEl.style.width = pct + '%';

      if (pct >= 100) {
        clearInterval(interval);
        closeEl.style.display = 'block';
        window._adCloseCallback = () => {
          overlay.style.display = 'none';
          window._adCloseCallback = null;
          if (typeof onDoneCallback === 'function') onDoneCallback();
        };
      }
    }, 55);
  }

  /* ══════════════════════════════════════
     BANNER ADS
     Handled declaratively via <ins> tags in HTML.
     Use these helpers to show/hide containers.
  ══════════════════════════════════════ */
  function showBannerAd(containerId) {
    // FOR ADMOB (Capacitor/Cordova) — replace with SDK banner call:
    // admob.banner.show({ id: 'ca-app-pub-YOUR_APP_ID/YOUR_BANNER_UNIT_ID', position: 'bottom' });

    const el = document.getElementById(containerId);
    if (el) el.style.display = 'flex';
  }

  function hideBannerAd(containerId) {
    // admob.banner.hide();
    const el = document.getElementById(containerId);
    if (el) el.style.display = 'none';
  }

  /* ══════════════════════════════════════
     REWARD HELPERS
  ══════════════════════════════════════ */
  function watchAdForDoubleCoins(callback) {
    showRewardedAd('double_coins', () => {
      Toast.show('🪙 Double Coins active for 30s!');
      if (typeof callback === 'function') callback();
    });
  }

  function watchAdForFreePower(powerType, callback) {
    showRewardedAd('free_power_' + powerType, () => {
      GameData.powers[powerType] = (GameData.powers[powerType] || 0) + 1;
      saveGame();
      if (typeof PowersSystem !== 'undefined') PowersSystem.updateUI();
      Toast.show(`⚡ Free ${powerType} granted!`);
      if (typeof callback === 'function') callback();
    });
  }

  /* ══════════════════════════════════════
     AD SAFETY — ensure AdSense doesn't
     load inside game screen.
  ══════════════════════════════════════ */
  function onScreenChange(screenId) {
    const gameScreens = ['game', 'pause'];
    const adWrappers  = document.querySelectorAll('.ad-slot-wrapper');
    adWrappers.forEach(el => {
      el.style.display = gameScreens.includes(screenId) ? 'none' : '';
    });
  }

  return {
    showRewardedAd,
    showInterstitialAd,
    showBannerAd,
    hideBannerAd,
    watchAdForDoubleCoins,
    watchAdForFreePower,
    onScreenChange,
    initBanners,
  };
})();
