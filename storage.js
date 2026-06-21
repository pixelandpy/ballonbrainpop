/* ════════════════════════════════════════
   BRAINPOP v2 — storage.js
   localStorage save/load with deep merge.
════════════════════════════════════════ */

const Storage = (() => {

  const KEY = 'brainpop_v2_save';

  const defaultSave = () => ({
    // Economy
    coins: 0,
    totalCoinsEarned: 0,

    // XP & Leveling
    xp: 0,
    level: 1,
    totalXpEarned: 0,

    // Scores (by difficulty)
    highScore: 0,
    highScores: { easy: 0, medium: 0, hard: 0, genius: 0 },
    highScoreTimeAttack: 0,

    // Shop
    ownedSkins: ['classic'],
    equippedSkin: 'classic',
    ownedBgs: ['sky'],
    equippedBg: 'sky',

    // Powers inventory
    powers: { freeze: 3, bomb: 2, hint: 3, double: 1, life: 1 },

    // Missions
    missions: {},
    missionResetDate: '',

    // Daily reward
    lastClaimDate: '',
    loginStreak: 0,
    lastLoginDate: '',

    // Achievements
    achievements: {},

    // Settings
    settings: {
      sfx: true,
      music: false,
      dark: true,
      vibration: true,
      volume: 70,
      numpad: false,
    },

    // Lifetime stats
    totalBalloonsPoppd: 0,
    totalGamesPlayed: 0,
    maxCombo: 0,
    totalWavesCompleted: 0,
    totalSpecialPopped: 0,
    totalGoldenPopped: 0,
    totalLightningPopped: 0,

    // Onboarding
    tutorialDone: false,
  });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultSave();
      const saved = JSON.parse(raw);
      return deepMerge(defaultSave(), saved);
    } catch(e) {
      console.warn('[BrainPop] Save load failed, using defaults.', e);
      return defaultSave();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch(e) {
      console.warn('[BrainPop] Save failed.', e);
    }
  }

  function reset() {
    localStorage.removeItem(KEY);
    return defaultSave();
  }

  function deepMerge(target, source) {
    const result = Object.assign({}, target);
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  return { load, save, reset };

})();

// ── Global save data object ──
let GameData = Storage.load();

function saveGame() {
  Storage.save(GameData);
}

/* ── XP System ── */
const XPSystem = (() => {

  // XP required to reach each level (cumulative increases)
  function xpForLevel(lvl) {
    return Math.floor(80 * Math.pow(lvl, 1.35));
  }

  function getProgress() {
    const lvl     = GameData.level;
    const needed  = xpForLevel(lvl);
    const current = GameData.xp;
    return { lvl, current, needed, pct: Math.min(100, (current / needed) * 100) };
  }

  // Add XP, handle multi-level ups, return array of new levels reached
  function addXP(amount) {
    GameData.xp += amount;
    GameData.totalXpEarned += amount;

    const levelsUp = [];
    let needed = xpForLevel(GameData.level);

    while (GameData.xp >= needed) {
      GameData.xp -= needed;
      GameData.level++;
      levelsUp.push(GameData.level);

      // Level-up coin bonus
      const bonus = GameData.level * 20;
      GameData.coins += bonus;
      GameData.totalCoinsEarned += bonus;

      needed = xpForLevel(GameData.level);
    }

    saveGame();
    return levelsUp;
  }

  return { addXP, getProgress, xpForLevel };
})();
