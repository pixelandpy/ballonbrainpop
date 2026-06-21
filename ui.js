/* ════════════════════════════════════════
   BRAINPOP v2 — ui.js
   Sound, routing, toast, coins, settings,
   home screen, achievements, nav wiring.
════════════════════════════════════════ */

/* ══════════════════════════
   SOUND MANAGER
══════════════════════════ */
const SoundManager = (() => {

  const ctx = typeof AudioContext !== 'undefined'
    ? new AudioContext()
    : typeof webkitAudioContext !== 'undefined'
    ? new webkitAudioContext()
    : null;

  let masterVolume = 0.7;

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function playTone(freq, type = 'sine', duration = 0.15, gainAmt = 0.3) {
    if (!ctx || !GameData.settings.sfx) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainAmt * masterVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch(e) {}
  }

  const sounds = {
    pop() {
      if (!ctx || !GameData.settings.sfx) return;
      playTone(320,  'sine', 0.04, 0.45);
      setTimeout(() => playTone(640,  'sine', 0.08, 0.35), 25);
      setTimeout(() => playTone(1000, 'sine', 0.07, 0.22), 55);
    },
    coin() {
      if (!ctx || !GameData.settings.sfx) return;
      playTone(900,  'sine', 0.07, 0.28);
      setTimeout(() => playTone(1200, 'sine', 0.07, 0.22), 55);
    },
    combo() {
      if (!ctx || !GameData.settings.sfx) return;
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => playTone(f, 'sine', 0.13, 0.22), i * 55));
    },
    click() {
      if (!ctx || !GameData.settings.sfx) return;
      playTone(480, 'sine', 0.05, 0.14);
    },
    gameOver() {
      if (!ctx || !GameData.settings.sfx) return;
      playTone(420, 'sawtooth', 0.22, 0.28);
      setTimeout(() => playTone(320, 'sawtooth', 0.28, 0.22), 220);
      setTimeout(() => playTone(210, 'sawtooth', 0.38, 0.18), 520);
    },
    wrong() {
      if (!ctx || !GameData.settings.sfx) return;
      playTone(180, 'square', 0.12, 0.22);
      setTimeout(() => playTone(140, 'square', 0.1, 0.15), 80);
    },
    powerUse() {
      if (!ctx || !GameData.settings.sfx) return;
      playTone(640,  'triangle', 0.14, 0.25);
      setTimeout(() => playTone(860,  'triangle', 0.11, 0.2), 75);
      setTimeout(() => playTone(1100, 'triangle', 0.08, 0.15), 150);
    },
    reward() {
      if (!ctx || !GameData.settings.sfx) return;
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) =>
        setTimeout(() => playTone(f, 'sine', 0.16, 0.18), i * 65));
    },
    levelUp() {
      if (!ctx || !GameData.settings.sfx) return;
      [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) =>
        setTimeout(() => playTone(f, 'sine', 0.2, 0.22), i * 70));
    },
  };

  function setVolume(v) { masterVolume = v / 100; }

  return {
    play: (name) => { resume(); sounds[name] && sounds[name](); },
    setVolume,
    resume,
  };
})();


/* ══════════════════════════
   SCREEN ROUTER
══════════════════════════ */
const ScreenRouter = (() => {

  let currentScreen = null;

  function show(id) {
    SoundManager.play('click');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('screen-' + id);
    if (target) {
      target.classList.add('active');
      currentScreen = id;
    }
    if (typeof AdsManager !== 'undefined') AdsManager.onScreenChange(id);
  }

  function current() { return currentScreen; }

  return { show, current };
})();


/* ══════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════ */
const Toast = (() => {
  const el = document.getElementById('toast');
  let timer = null;

  function show(msg, duration = 2200) {
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('show'), duration);
  }

  return { show };
})();


/* ══════════════════════════
   COIN DISPLAY & ANIMATIONS
══════════════════════════ */
const CoinUI = (() => {

  function update() {
    const c = GameData.coins.toLocaleString();
    ['homeCoins', 'shopCoins', 'gameCoins'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = c;
    });
  }

  function burst(x, y, count = 6) {
    const container = document.getElementById('coinBurst');
    for (let i = 0; i < count; i++) {
      const p     = document.createElement('div');
      p.className = 'coin-particle';
      p.textContent = '🪙';
      p.style.left = x + 'px';
      p.style.top  = y + 'px';
      const angle  = (Math.PI * 2 / count) * i + Math.random() * 0.4;
      const dist   = 40 + Math.random() * 50;
      p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--ty', Math.sin(angle) * dist - 20 + 'px');
      container.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
  }

  function floatText(x, y, text, color = 'var(--clr-yellow)') {
    const t     = document.createElement('div');
    t.className = 'float-text';
    t.style.left  = x + 'px';
    t.style.top   = y + 'px';
    t.style.color = color;
    t.textContent = text;
    const gameArea = document.getElementById('gameArea');
    if (gameArea) gameArea.appendChild(t);
    setTimeout(() => t.remove(), 900);
  }

  return { update, burst, floatText };
})();


/* ══════════════════════════
   SETTINGS MANAGER
══════════════════════════ */
const SettingsUI = (() => {

  function init() {
    const s = GameData.settings;

    const sfxEl    = document.getElementById('sfxToggle');
    const musicEl  = document.getElementById('musicToggle');
    const darkEl   = document.getElementById('darkToggle');
    const vibEl    = document.getElementById('vibToggle');
    const numpadEl = document.getElementById('numpadToggle');
    const volEl    = document.getElementById('volumeSlider');
    const volLabel = document.getElementById('volLabel');

    sfxEl.checked    = s.sfx;
    musicEl.checked  = s.music;
    darkEl.checked   = s.dark;
    vibEl.checked    = s.vibration;
    numpadEl.checked = s.numpad || false;
    volEl.value      = s.volume;
    if (volLabel) volLabel.textContent = s.volume + '%';

    sfxEl.addEventListener('change', () => {
      GameData.settings.sfx = sfxEl.checked;
      saveGame();
    });

    musicEl.addEventListener('change', () => {
      GameData.settings.music = musicEl.checked;
      MusicManager.toggle();
      saveGame();
    });

    darkEl.addEventListener('change', () => {
      GameData.settings.dark = darkEl.checked;
      applyTheme();
      saveGame();
    });

    vibEl.addEventListener('change', () => {
      GameData.settings.vibration = vibEl.checked;
      saveGame();
    });

    numpadEl.addEventListener('change', () => {
      GameData.settings.numpad = numpadEl.checked;
      saveGame();
      Toast.show(numpadEl.checked ? '🔢 Numpad enabled' : '⌨️ Keyboard mode');
    });

    volEl.addEventListener('input', () => {
      const v = parseInt(volEl.value);
      GameData.settings.volume = v;
      SoundManager.setVolume(v);
      MusicManager.updateVolume();
      if (volLabel) volLabel.textContent = v + '%';
      saveGame();
    });

    document.getElementById('btnResetProgress').addEventListener('click', () => {
      if (confirm('Reset ALL progress? This cannot be undone.')) {
        const fresh = Storage.reset();
        Object.assign(GameData, fresh);
        applyTheme();
        CoinUI.update();
        Toast.show('Progress reset!');
        saveGame();
        ScreenRouter.show('home');
        HomeScreen.refresh();
      }
    });
  }

  function applyTheme() {
    document.body.classList.toggle('theme-dark',  GameData.settings.dark);
    document.body.classList.toggle('theme-light', !GameData.settings.dark);
  }

  return { init, applyTheme };
})();


/* ══════════════════════════
   VIBRATION HELPER
══════════════════════════ */
function vibrate(pattern = 30) {
  if (GameData.settings.vibration && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}


/* ══════════════════════════
   HOME SCREEN
══════════════════════════ */
const HomeScreen = {
  refresh() {
    document.getElementById('homeCoins').textContent    = GameData.coins.toLocaleString();
    document.getElementById('homeHighScore').textContent = GameData.highScore.toLocaleString();
    document.getElementById('homeLvl').textContent      = GameData.level;
    document.getElementById('homeXP').textContent       = `${(GameData.totalXpEarned || 0).toLocaleString()} XP`;

    const today = new Date().toDateString();
    const dot   = document.getElementById('dailyDot');
    if (dot) dot.classList.toggle('show', GameData.lastClaimDate !== today);
  }
};


/* ══════════════════════════
   ACHIEVEMENTS UI
══════════════════════════ */
const AchievementsUI = {

  DEFS: [
    { id: 'first_pop',    icon: '🎈', name: 'First Pop!',       desc: 'Pop your first balloon.',          target: 1,    stat: 'totalBalloonsPoppd' },
    { id: 'pop50',        icon: '🎯', name: 'Sharp Shooter',    desc: 'Pop 50 balloons total.',           target: 50,   stat: 'totalBalloonsPoppd' },
    { id: 'pop200',       icon: '🏹', name: 'Balloon Hunter',   desc: 'Pop 200 balloons total.',          target: 200,  stat: 'totalBalloonsPoppd' },
    { id: 'pop1000',      icon: '🌪️', name: 'Balloon God',      desc: 'Pop 1000 balloons total.',         target: 1000, stat: 'totalBalloonsPoppd' },
    { id: 'pop5000',      icon: '🌀', name: 'Balloon Deity',    desc: 'Pop 5000 balloons total.',         target: 5000, stat: 'totalBalloonsPoppd' },
    { id: 'score50',      icon: '⭐', name: 'Rising Star',      desc: 'Score 50 in one game.',            target: 50,   stat: 'highScore' },
    { id: 'score100',     icon: '🌟', name: 'Superstar',        desc: 'Score 100 in one game.',           target: 100,  stat: 'highScore' },
    { id: 'score500',     icon: '🏆', name: 'Legend',           desc: 'Score 500 in one game.',           target: 500,  stat: 'highScore' },
    { id: 'score1000',    icon: '🏵️', name: 'Mythic',           desc: 'Score 1000 in one game.',          target: 1000, stat: 'highScore' },
    { id: 'combo5',       icon: '🔥', name: 'Combo King',       desc: 'Achieve a ×5 combo.',              target: 5,    stat: 'maxCombo' },
    { id: 'combo10',      icon: '💥', name: 'Unstoppable',      desc: 'Achieve a ×10 combo.',             target: 10,   stat: 'maxCombo' },
    { id: 'combo20',      icon: '👑', name: 'Godlike',          desc: 'Achieve a ×20 combo.',             target: 20,   stat: 'maxCombo' },
    { id: 'combo30',      icon: '💎', name: 'Combo Immortal',   desc: 'Achieve a ×30 combo.',             target: 30,   stat: 'maxCombo' },
    { id: 'games10',      icon: '🎮', name: 'Gamer',            desc: 'Play 10 games.',                   target: 10,   stat: 'totalGamesPlayed' },
    { id: 'games50',      icon: '🕹️', name: 'Hardcore Gamer',  desc: 'Play 50 games.',                   target: 50,   stat: 'totalGamesPlayed' },
    { id: 'games200',     icon: '🎖️', name: 'Veteran Player',   desc: 'Play 200 games.',                  target: 200,  stat: 'totalGamesPlayed' },
    { id: 'coins500',     icon: '💰', name: 'Coin Collector',   desc: 'Earn 500 coins total.',            target: 500,  stat: 'totalCoinsEarned' },
    { id: 'coins2000',    icon: '🤑', name: 'Millionaire',      desc: 'Earn 2000 coins total.',           target: 2000, stat: 'totalCoinsEarned' },
    { id: 'coins10000',   icon: '🏦', name: 'Tycoon',           desc: 'Earn 10,000 coins total.',         target: 10000,stat: 'totalCoinsEarned' },
    { id: 'golden5',      icon: '🌟', name: 'Gold Rush',        desc: 'Pop 5 golden balloons.',           target: 5,    stat: 'totalGoldenPopped' },
    { id: 'golden25',     icon: '✨', name: 'Midas Touch',      desc: 'Pop 25 golden balloons.',          target: 25,   stat: 'totalGoldenPopped' },
    { id: 'lightning10',  icon: '⚡', name: 'Storm Caller',     desc: 'Pop 10 lightning balloons.',       target: 10,   stat: 'totalLightningPopped' },
    { id: 'waves5',       icon: '🌊', name: 'Wave Rider',       desc: 'Complete 5 waves.',                target: 5,    stat: 'totalWavesCompleted' },
    { id: 'waves20',      icon: '🏄', name: 'Wave Master',      desc: 'Complete 20 waves.',               target: 20,   stat: 'totalWavesCompleted' },
    { id: 'waves50',      icon: '🌪️', name: 'Tsunami',          desc: 'Complete 50 waves.',                target: 50,   stat: 'totalWavesCompleted' },
    { id: 'level5',       icon: '📈', name: 'Level Up!',        desc: 'Reach player level 5.',            target: 5,    stat: 'level' },
    { id: 'level10',      icon: '🚀', name: 'Brain Power',      desc: 'Reach player level 10.',           target: 10,   stat: 'level' },
    { id: 'level25',      icon: '🛸', name: 'Galaxy Brain',     desc: 'Reach player level 25.',           target: 25,   stat: 'level' },
    { id: 'streak3',      icon: '🔥', name: 'Habit Forming',    desc: 'Reach a 3-day login streak.',      target: 3,    stat: 'loginStreak' },
    { id: 'streak7',      icon: '🌈', name: 'Weekly Devotee',   desc: 'Reach a 7-day login streak.',      target: 7,    stat: 'loginStreak' },
    { id: 'streak30',     icon: '🗓️', name: 'Monthly Master',   desc: 'Reach a 30-day login streak.',     target: 30,   stat: 'loginStreak' },
    { id: 'timeattack100',icon: '⏱️', name: 'Speed Demon',      desc: 'Score 100 in Time Attack mode.',   target: 100,  stat: 'highScoreTimeAttack' },
  ],

  render() {
    const list = document.getElementById('achievementsList');
    list.innerHTML = '';

    this.DEFS.forEach(a => {
      const statVal  = GameData[a.stat] || 0;
      const progress = Math.min(statVal, a.target);
      const unlocked = GameData.achievements[a.id] || progress >= a.target;

      if (unlocked && !GameData.achievements[a.id]) {
        GameData.achievements[a.id] = true;
        saveGame();
      }

      const pct = Math.round((progress / a.target) * 100);

      const div = document.createElement('div');
      div.className = 'achievement-item' + (unlocked ? ' unlocked' : '');
      div.innerHTML = `
        <div class="achievement-icon">${a.icon}</div>
        <div class="achievement-name">${a.name}</div>
        <div class="achievement-desc">${a.desc}</div>
        <div class="achievement-progress-bar">
          <div class="achievement-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="achievement-progress-text">${progress.toLocaleString()} / ${a.target.toLocaleString()}</div>
      `;
      list.appendChild(div);
    });
  }
};


/* ══════════════════════════
   NAV WIRING
══════════════════════════ */
function wireNavigation() {

  // Home buttons
  document.getElementById('btnPlay').addEventListener('click', () => ScreenRouter.show('difficulty'));

  document.getElementById('btnShop').addEventListener('click', () => {
    ShopUI.render('skins');
    ScreenRouter.show('shop');
  });

  document.getElementById('btnMissions').addEventListener('click', () => {
    MissionsUI.render();
    ScreenRouter.show('missions');
  });

  document.getElementById('btnDailyReward').addEventListener('click', () => {
    DailyRewardUI.render();
    ScreenRouter.show('daily');
  });

  document.getElementById('btnAchievements').addEventListener('click', () => {
    AchievementsUI.render();
    ScreenRouter.show('achievements');
  });

  document.getElementById('btnSettings').addEventListener('click', () => {
    ScreenRouter.show('settings');
  });

  // Back buttons
  document.getElementById('diffBack').addEventListener('click',         () => ScreenRouter.show('home'));
  document.getElementById('shopBack').addEventListener('click',         () => { ScreenRouter.show('home'); HomeScreen.refresh(); });
  document.getElementById('missionsBack').addEventListener('click',     () => ScreenRouter.show('home'));
  document.getElementById('dailyBack').addEventListener('click',        () => ScreenRouter.show('home'));
  document.getElementById('achievementsBack').addEventListener('click', () => ScreenRouter.show('home'));
  document.getElementById('settingsBack').addEventListener('click',     () => ScreenRouter.show('home'));

  // Game over buttons
  document.getElementById('btnRestart').addEventListener('click', () => {
    SoundManager.play('click');
    BrainPop.restart();
  });

  document.getElementById('btnGoHome').addEventListener('click', () => {
    ScreenRouter.show('home');
    HomeScreen.refresh();
  });

  // Pause
  document.getElementById('btnResume').addEventListener('click', () => BrainPop.resume());
  document.getElementById('btnQuit').addEventListener('click', () => {
    BrainPop.quitToMenu();
    ScreenRouter.show('home');
    HomeScreen.refresh();
  });

  // Wave overlay close on tap
  document.getElementById('waveOverlay').addEventListener('click', () => {
    document.getElementById('waveOverlay').classList.add('hidden');
  });
}


// Background Music
const MusicManager = (() => {

  const audio = new Audio('bg3.mp3');

  audio.loop = true;
  audio.preload = 'auto';

  function play() {

    if (!GameData.settings.music) return;

    audio.volume = (GameData.settings.volume / 100)*0.2;

    if (audio.paused) {

      audio.play().catch(() => {});

    }

  }

  function stop() {

    audio.pause();

  }

  function updateVolume() {

    audio.volume = (GameData.settings.volume / 100)*0.2;

  }

  function toggle() {

    if (GameData.settings.music) {

      play();

    } else {

      stop();

    }

  }

  return {
    play,
    stop,
    toggle,
    updateVolume
  };

})();



document.addEventListener('pointerdown', () => {

  MusicManager.play();

}, { once: true });