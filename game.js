/* ════════════════════════════════════════
   BRAINPOP v2 — game.js
   Core game controller.
   Features: Wave system, XP leveling,
   Special balloons, Time Attack mode,
   Grade system, Tutorial, Numpad.
════════════════════════════════════════ */

const BrainPop = (() => {

  /* ── Game State ── */
  let score        = 0;
  let lives        = 3;
  let maxLives     = 3;
  let combo        = 0;
  let maxCombo     = 0;
  let sessionCoins = 0;
  let sessionXP    = 0;
  let paused       = false;
  let gameActive   = false;
  let reviveUsed   = false;
  let popsThisGame = 0;
  let wrongAnswers = 0;
  let sessionGames = 0;

  /* ── Wave State ── */
  let currentWave     = 1;
  let popsThisWave    = 0;
  const POPS_PER_WAVE = 10;

  /* ── Mode ── */
  let selectedMode = 'normal';   // 'normal' | 'timeattack'
  let selectedDiff = 'hard';
  let selectedType = 'mixed';

  /* ── Time Attack ── */
  let timeLeft       = 60;
  let timerInterval  = null;

  /* ── Combo ── */
  let sessionComboMax = 0;
  let comboHideTimer  = null;

  /* ── Numpad state ── */
  let numpadValue = '';

  /* ═══════════════════════════════════════
     INIT
  ════════════════════════════════════════ */
  function init() {
    // Difficulty selection
    document.querySelectorAll('.diff-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.diff-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedDiff = card.dataset.diff;
        SoundManager.play('click');
      });
    });

    // Mode tabs
    document.querySelectorAll('.mode-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedMode = btn.dataset.mode;
        SoundManager.play('click');
        updateDifficultyForMode();
      });
    });

    // Math type
    document.querySelectorAll('.math-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.math-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedType = btn.dataset.type;
        SoundManager.play('click');
      });
    });

    // Start
    document.getElementById('btnStartGame').addEventListener('click', () => {
      // Show tutorial for first-timers
      if (!GameData.tutorialDone) {
        TutorialSystem.show(() => startGame());
      } else {
        startGame();
      }
    });

    // Input
    const input = document.getElementById('inputBox');
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') checkAnswer(); });

    // Submit
    document.getElementById('btnSubmit').addEventListener('click', checkAnswer);

    // Pause
    document.getElementById('btnPause').addEventListener('click', pauseGame);

    // Numpad toggle
    document.getElementById('btnNumpad').addEventListener('click', toggleNumpad);

    // Init numpad buttons
    document.querySelectorAll('.np-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.val;
        SoundManager.play('click');
        vibrate(10);
        if (v === 'del') {
          numpadValue = numpadValue.slice(0, -1);
        } else if (v === '-') {
          numpadValue = numpadValue.startsWith('-') ? numpadValue.slice(1) : '-' + numpadValue;
        } else {
          if (numpadValue.length < 5) numpadValue += v;
        }
        document.getElementById('inputBox').value = numpadValue;

        // Auto-try the typed value — but only if it isn't still a valid
        // prefix of some OTHER live balloon's answer. Without this check,
        // typing "1" of an intended "12" would instantly (and wrongly)
        // pop an unrelated balloon worth exactly "1".
        const parsed = parseInt(numpadValue);
        if (!isNaN(parsed) && numpadValue.length >= 1 && v !== 'del' && v !== '-') {
          const isAmbiguousPrefix = BalloonSystem.getActive().some(b => {
            if (b.dataset.alive !== 'true') return false;
            const bv = b.dataset.value;
            return bv.length > numpadValue.length && bv.startsWith(numpadValue) && bv !== numpadValue;
          });

          if (!isAmbiguousPrefix) {
            const popped = BalloonSystem.tryAnswer(parsed);
            if (popped) {
              onCorrectAnswer(popped);
              numpadValue = '';
              document.getElementById('inputBox').value = '';
            }
          }
        }
      });
    });

    document.getElementById('npClear').addEventListener('click', () => {
      numpadValue = '';
      document.getElementById('inputBox').value = '';
    });

    document.getElementById('npSubmit').addEventListener('click', () => {
      checkAnswer();
      numpadValue = '';
      document.getElementById('inputBox').value = '';
    });

    // Apply numpad preference
    if (GameData.settings.numpad) {
      document.getElementById('numpadOverlay').classList.remove('hidden');
      document.getElementById('btnNumpad').classList.add('active');
    }
  }

  function updateDifficultyForMode() {
    const timeAttack = selectedMode === 'timeattack';
    // In time attack, genius-only isn't forced, but show info
    document.querySelectorAll('.diff-card').forEach(c => {
      c.style.opacity = '1';
    });
  }

  /* ═══════════════════════════════════════
     START GAME
  ════════════════════════════════════════ */
  function startGame() {
    SoundManager.play('click');
    SoundManager.resume();

    // Reset all state
    score        = 0;
    lives        = 3;
    maxLives     = 3;
    combo        = 0;
    maxCombo     = 0;
    sessionCoins = 0;
    sessionXP    = 0;
    paused       = false;
    gameActive   = true;
    reviveUsed   = false;
    popsThisGame = 0;
    wrongAnswers = 0;
    currentWave  = 1;
    popsThisWave = 0;
    numpadValue  = '';
    sessionComboMax = 0;
    window._sessionPowersUsed = 0;

    // Timer for time attack
    clearInterval(timerInterval);
    timeLeft = 60;

    // UI reset
    updateScoreUI();
    updateLivesUI();
    updateComboUI();
    updateXPBar();
    updateWaveUI();
    PowersSystem.updateUI();

    document.getElementById('inputBox').value = '';

    const timerEl = document.getElementById('timerDisplay');
    if (selectedMode === 'timeattack') {
      timerEl.classList.remove('hidden');
      updateTimerUI();
      startTimer();
    } else {
      timerEl.classList.add('hidden');
    }

    // Apply theme
    ShopUI.applyBackground();
    BalloonSystem.clearAll();
    BalloonSystem.init(selectedDiff, selectedType, 1);

    ScreenRouter.show('game');

    sessionGames++;
    MissionsUI.updateStat('sessionGames', 1);
    GameData.totalGamesPlayed++;
    saveGame();

    setTimeout(() => {
      if (GameData.settings.numpad) {
        document.getElementById('numpadOverlay').classList.remove('hidden');
      } else {
        document.getElementById('inputBox').focus();
      }
    }, 400);
  }

  /* ═══════════════════════════════════════
     TIMER (Time Attack)
  ════════════════════════════════════════ */
  function startTimer() {
    timerInterval = setInterval(() => {
      if (!gameActive || paused) return;
      timeLeft--;
      updateTimerUI();

      if (timeLeft <= 10) {
        document.getElementById('timerDisplay').classList.add('urgent');
        if (timeLeft > 0) {
          SoundManager.play('click');
          vibrate(20);
        }
      }

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        triggerGameOver();
      }
    }, 1000);
  }

  function updateTimerUI() {
    document.getElementById('timerCount').textContent = timeLeft;
  }

  /* ═══════════════════════════════════════
     NUMPAD TOGGLE
  ════════════════════════════════════════ */
  function toggleNumpad() {
    const overlay = document.getElementById('numpadOverlay');
    const btn     = document.getElementById('btnNumpad');
    const isHidden = overlay.classList.contains('hidden');
    overlay.classList.toggle('hidden', !isHidden);
    btn.classList.toggle('active', isHidden);

    if (isHidden) {
      document.getElementById('inputBox').blur();
    } else {
      numpadValue = '';
      document.getElementById('inputBox').value = '';
      document.getElementById('inputBox').focus();
    }
  }

  /* ═══════════════════════════════════════
     WAVE SYSTEM
  ════════════════════════════════════════ */
  function checkWaveProgress() {
    popsThisWave++;
    if (popsThisWave >= POPS_PER_WAVE) {
      popsThisWave = 0;
      advanceWave();
    }
  }

  function advanceWave() {
    currentWave++;
    GameData.totalWavesCompleted++;
    saveGame();

    // Update balloon difficulty
    BalloonSystem.upgradeToWave(currentWave);
    updateWaveUI();
    MissionsUI.updateStat('sessionWave', currentWave);

    // Show wave overlay
    showWaveOverlay(currentWave);
    SoundManager.play('combo');
    vibrate([30, 50, 80]);
  }

  function showWaveOverlay(wave) {
    const overlay = document.getElementById('waveOverlay');
    document.getElementById('waveNumber').textContent = wave;

    const msgs = [
      '', 'Getting warmer…', 'Balloons are angry!',
      '⚡ Special balloons appear!', '🌟 Faster & wilder!',
      '🔥 EXTREME MODE!', '💀 Skull warning — dodge them!',
      '🧠 GENIUS TERRITORY', '🌈 UNSTOPPABLE!', '👑 LEGENDARY!'
    ];

    document.getElementById('waveSub').textContent = wave <= 9 ? (msgs[wave] || 'Push your limits!') : '🏆 BEYOND LEGENDARY!';

    const specials = { 3: '⚡ Lightning & Golden balloons incoming!', 4: '🎁 Mystery bonus balloons!', 6: '☠️ Skull balloons — beware!' };
    document.getElementById('waveSpecial').textContent = specials[wave] || '';

    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.add('hidden'), 2200);
  }

  function updateWaveUI() {
    document.getElementById('waveCount').textContent  = currentWave;
    document.getElementById('pauseWave').textContent  = currentWave;
  }

  /* ═══════════════════════════════════════
     INPUT HANDLING
  ════════════════════════════════════════ */
  function onInput(e) {
    const val = parseInt(e.target.value);
    if (isNaN(val) || Math.abs(val) >= 1000) return;

    // Check for skull first
    const skull = BalloonSystem.trySkull(val);
    if (skull) {
      onSkullPopped(skull);
      e.target.value = '';
      numpadValue = '';
      return;
    }

    const popped = BalloonSystem.tryAnswer(val);
    if (popped) {
      onCorrectAnswer(popped);
      e.target.value = '';
      numpadValue = '';
    }
  }

  function checkAnswer() {
    const input = document.getElementById('inputBox');
    const val   = parseInt(input.value);
    if (isNaN(val)) return;

    const skull = BalloonSystem.trySkull(val);
    if (skull) {
      onSkullPopped(skull);
      input.value = '';
      numpadValue = '';
      return;
    }

    const popped = BalloonSystem.tryAnswer(val);
    if (popped) {
      onCorrectAnswer(popped);
      input.value = '';
      numpadValue = '';
    } else {
      onWrongAnswer();
    }
  }

  /* ═══════════════════════════════════════
     CORRECT ANSWER
  ════════════════════════════════════════ */
  function onCorrectAnswer(balloon) {
    if (!gameActive) return;

    const specialType = balloon.dataset.special || 'normal';
    SoundManager.play('pop');
    vibrate(20);
    flashInput('success');

    // Score & combo
    score++;
    popsThisGame++;

    combo++;
    if (combo > maxCombo) maxCombo = combo;
    if (combo > sessionComboMax) sessionComboMax = combo;

    // Score multiplier from combo
    const comboMulti = combo >= 15 ? 3 : combo >= 10 ? 2 : combo >= 5 ? 1.5 : 1;

    // Coin reward
    const cfg     = BalloonSystem.getDiffConfig();
    const multi   = cfg.reward;
    const doubled = PowersSystem.isDoubleActive() ? 2 : 1;
    let   earned  = Math.floor(multi * doubled);

    // XP reward
    let xpGained = cfg.xpBase + Math.floor(combo * 3);

    // Special balloon bonuses
    if (specialType === 'golden') {
      earned   *= 5;
      xpGained *= 2;
      GameData.totalGoldenPopped = (GameData.totalGoldenPopped || 0) + 1;
      MissionsUI.updateStat('goldenSession', 1);
      Toast.show('🌟 GOLDEN BALLOON! ×5 Coins!');
      SoundManager.play('reward');
      vibrate([20,30,20]);
    } else if (specialType === 'lightning') {
      earned   += 10;
      xpGained += 30;
      GameData.totalLightningPopped = (GameData.totalLightningPopped || 0) + 1;
      if (selectedMode === 'timeattack') { timeLeft += 5; updateTimerUI(); Toast.show('⚡ +5 Seconds!'); }
      else Toast.show('⚡ Lightning! +10 Bonus!');
      SoundManager.play('coin');
    } else if (specialType === 'bonus') {
      // Give random powerup
      const powers = ['freeze', 'bomb', 'hint'];
      const p      = powers[~~(Math.random() * powers.length)];
      GameData.powers[p]++;
      saveGame();
      PowersSystem.updateUI();
      Toast.show(`🎁 Bonus ${p.charAt(0).toUpperCase()+p.slice(1)} power!`);
      SoundManager.play('reward');
    }

    if (specialType !== 'normal') {
      GameData.totalSpecialPopped = (GameData.totalSpecialPopped || 0) + 1;
      MissionsUI.updateStat('specialSession', 1);
    }

    sessionCoins += earned;
    sessionXP    += xpGained;
    GameData.coins += earned;
    GameData.totalCoinsEarned += earned;
    GameData.totalBalloonsPoppd++;

    // Floating text
    const rect = balloon.getBoundingClientRect();
    const cx   = rect.left + rect.width / 2;
    const cy   = rect.top;

    CoinUI.floatText(cx, cy, `+${earned}🪙`, 'var(--clr-yellow)');
    CoinUI.burst(cx, rect.top + rect.height / 2, specialType === 'golden' ? 8 : 4);
    SoundManager.play('coin');

    // XP float
    showXpFloat(cx, cy - 22, `+${xpGained}XP`);

    // Score pop on display
    const scoreEl = document.getElementById('gameScore');
    scoreEl.textContent = score;
    scoreEl.classList.remove('bump');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('bump');
    setTimeout(() => scoreEl.classList.remove('bump'), 200);

    if (score > GameData.highScore) GameData.highScore = score;
    if (score > (GameData.highScores[selectedDiff] || 0)) GameData.highScores[selectedDiff] = score;

    // XP leveling
    const levelsUp = XPSystem.addXP(xpGained);
    updateXPBar();
    CoinUI.update();

    if (levelsUp.length > 0) {
      levelsUp.forEach(lvl => showLevelUp(lvl));
    }

    handleCombo();

    // Wave progress
    checkWaveProgress();

    // Missions
    MissionsUI.updateStat('sessionPops', 1);
    MissionsUI.updateStat('sessionCombo', combo);
    MissionsUI.updateStat('sessionScore', score);
    MissionsUI.updateStat('sessionCoinsEarned', earned);
    if (selectedDiff === 'genius') MissionsUI.updateStat('geniusScore', score);
    if ((window._sessionPowersUsed || 0) === 0) MissionsUI.updateStat('noPowerScore', score);
    if (balloon.dataset.type === 'add') MissionsUI.updateStat('addPops', 1);
    if (balloon.dataset.type === 'sub') MissionsUI.updateStat('subPops', 1);
    if (balloon.dataset.type === 'mul') MissionsUI.updateStat('mulPops', 1);
    if (balloon.dataset.type === 'div') MissionsUI.updateStat('divPops', 1);
    if (specialType === 'lightning') MissionsUI.updateStat('lightningSession', 1);

    saveGame();
  }

  function showXpFloat(x, y, text) {
    const el = document.createElement('div');
    el.className = 'xp-gain-text';
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  /* ═══════════════════════════════════════
     SKULL BALLOON POPPED (penalty)
  ════════════════════════════════════════ */
  function onSkullPopped(balloon) {
    if (!gameActive) return;

    // Pop it visually
    BalloonSystem.popBalloon(balloon);

    SoundManager.play('wrong');
    vibrate([60, 30, 60]);
    flashInput('error');

    combo = 0;
    updateComboUI();

    // Screen shake
    const gs = document.getElementById('screen-game');
    gs.classList.add('screen-shake');
    setTimeout(() => gs.classList.remove('screen-shake'), 340);

    // Lose a life
    lives--;
    updateLivesUI();
    Toast.show('☠️ Skull balloon! Lost a life!');

    if (lives <= 0) triggerGameOver();
  }

  /* ═══════════════════════════════════════
     WRONG ANSWER
  ════════════════════════════════════════ */
  function onWrongAnswer() {
    SoundManager.play('wrong');
    flashInput('error');
    vibrate([25, 25]);
    wrongAnswers++;
    combo = 0;
    updateComboUI();
  }

  /* ═══════════════════════════════════════
     BALLOON ESCAPED
  ════════════════════════════════════════ */
  function onBalloonEscaped() {
    if (!gameActive) return;

    lives--;
    combo = 0;
    updateLivesUI();
    updateComboUI();
    SoundManager.play('wrong');
    vibrate([50, 30, 50]);

    const gs = document.getElementById('screen-game');
    gs.classList.add('screen-shake');
    setTimeout(() => gs.classList.remove('screen-shake'), 320);

    if (lives <= 0) triggerGameOver();
  }

  /* ═══════════════════════════════════════
     COMBO SYSTEM
  ════════════════════════════════════════ */
  function handleCombo() {
    updateComboUI();
    if (combo < 3) return;

    let label = '', color = '';

    if      (combo >= 20) { label = '👑 GODLIKE!';    color = '#ff00ff'; SoundManager.play('reward'); }
    else if (combo >= 15) { label = '🔥 LEGENDARY!';  color = '#ff4500'; SoundManager.play('combo'); }
    else if (combo >= 10) { label = '💥 AMAZING!';    color = '#cc00ff'; SoundManager.play('combo'); }
    else if (combo >= 7)  { label = '⚡ GREAT!';      color = '#ff9900'; SoundManager.play('combo'); }
    else if (combo >= 5)  { label = '🎯 NICE!';       color = '#fbbf24'; }
    else if (combo >= 3)  { label = `✨ ×${combo}`;   color = 'var(--clr-accent)'; }

    if (label) showComboPopup(label, color);
  }

  function showComboPopup(label, color) {
    const popup = document.getElementById('comboPopup');
    popup.textContent = label;
    popup.style.color = color;
    popup.style.textShadow = `0 0 24px ${color}, 0 0 48px ${color}55`;
    popup.classList.remove('show');
    void popup.offsetWidth;
    popup.classList.add('show');

    clearTimeout(comboHideTimer);
    comboHideTimer = setTimeout(() => {
      popup.classList.remove('show');
      popup.style.opacity = '0';
    }, 1400);
  }

  /* ═══════════════════════════════════════
     LEVEL UP
  ════════════════════════════════════════ */
  function showLevelUp(lvl) {
    SoundManager.play('reward');
    vibrate([30, 50, 30]);

    const bonus = lvl * 20;
    document.getElementById('levelUpNum').textContent   = lvl;
    document.getElementById('levelUpBonus').textContent = `+${bonus} 🪙 Bonus!`;

    const overlay = document.getElementById('levelUpOverlay');
    overlay.classList.remove('hidden');

    // Update home level badge
    document.getElementById('homeLvl').textContent = lvl;
    document.getElementById('xpLabel').textContent = `LV${lvl}`;

    setTimeout(() => overlay.classList.add('hidden'), 2200);
    CoinUI.update();
  }

  /* ═══════════════════════════════════════
     UI UPDATES
  ════════════════════════════════════════ */
  function updateScoreUI() {
    document.getElementById('gameScore').textContent = score;
  }

  function updateLivesUI() {
    const lifeEls = [
      document.getElementById('life1'),
      document.getElementById('life2'),
      document.getElementById('life3'),
    ];
    lifeEls.forEach((el, i) => {
      if (!el) return;
      const lost = (i + 1) > lives;
      if (lost && !el.classList.contains('lost')) {
        el.classList.add('lost-anim');
        setTimeout(() => {
          el.classList.remove('lost-anim');
          el.classList.add('lost');
        }, 400);
      } else if (!lost) {
        el.classList.remove('lost', 'lost-anim');
      }
    });
  }

  function updateComboUI() {
    const el   = document.getElementById('comboDisplay');
    const text = document.getElementById('comboText');
    if (combo >= 2) {
      el.classList.remove('hidden');
      text.textContent = combo;
    } else {
      el.classList.add('hidden');
    }
  }

  function updateXPBar() {
    const prog = XPSystem.getProgress();
    document.getElementById('xpFill').style.width = prog.pct + '%';
    document.getElementById('xpLabel').textContent = `LV${prog.lvl}`;
    document.getElementById('homeLvl').textContent  = prog.lvl;
    document.getElementById('homeXP').textContent   = `${GameData.totalXpEarned} XP`;
  }

  function flashInput(type) {
    const input = document.getElementById('inputBox');
    input.classList.remove('input-success', 'input-error');
    void input.offsetWidth;
    input.classList.add(type === 'success' ? 'input-success' : 'input-error');
    setTimeout(() => input.classList.remove('input-success', 'input-error'), 420);
  }

  /* ═══════════════════════════════════════
     EXTRA LIFE
  ════════════════════════════════════════ */
  function addLife() {
    if (lives >= maxLives) return false;
    lives++;
    updateLivesUI();
    return true;
  }

  /* ═══════════════════════════════════════
     BOMB POP CALLBACK
  ════════════════════════════════════════ */
  function onBombPop(balloon) {
    if (!gameActive) return;
    const cfg     = BalloonSystem.getDiffConfig();
    const earned  = cfg.reward;
    const xpGained = Math.floor(cfg.xpBase / 2); // half XP — bomb is a power-up, not a solve
    score++;
    sessionCoins += earned;
    sessionXP    += xpGained;
    GameData.coins += earned;
    GameData.totalCoinsEarned += earned;
    GameData.totalBalloonsPoppd++;
    popsThisGame++;
    updateScoreUI();
    CoinUI.update();

    const levelsUp = XPSystem.addXP(xpGained);
    updateXPBar();
    if (levelsUp.length > 0) levelsUp.forEach(lvl => showLevelUp(lvl));

    MissionsUI.updateStat('sessionPops', 1);
    if (balloon.dataset.special !== 'normal') MissionsUI.updateStat('specialSession', 1);
    balloon.dataset.alive = 'false';
    checkWaveProgress();
    saveGame();
  }

  /* ═══════════════════════════════════════
     PAUSE
  ════════════════════════════════════════ */
  function pauseGame() {
    if (!gameActive) return;
    paused = true;
    document.getElementById('pauseScore').textContent = score;
    ScreenRouter.show('pause');
  }

  function resume() {
    paused = false;
    ScreenRouter.show('game');
    setTimeout(() => {
      if (!GameData.settings.numpad) document.getElementById('inputBox').focus();
    }, 200);
  }

  function quitToMenu() {
    gameActive = false;
    paused     = false;
    clearInterval(timerInterval);
    BalloonSystem.stop();
    BalloonSystem.clearAll();
    document.getElementById('numpadOverlay').classList.add('hidden');
    saveGame();
  }

  /* ═══════════════════════════════════════
     GAME OVER
  ════════════════════════════════════════ */
  function triggerGameOver() {
    gameActive = false;
    clearInterval(timerInterval);
    BalloonSystem.stop();

    SoundManager.play('gameOver');
    vibrate([80, 50, 80, 50, 180]);

    // Update stats
    if (score > GameData.highScore) GameData.highScore = score;
    if (score > (GameData.highScores[selectedDiff] || 0)) GameData.highScores[selectedDiff] = score;
    if (selectedMode === 'timeattack' && score > (GameData.highScoreTimeAttack || 0)) GameData.highScoreTimeAttack = score;
    if (maxCombo > GameData.maxCombo) GameData.maxCombo = maxCombo;

    saveGame();

    // Accuracy
    const totalAttempts = popsThisGame + wrongAnswers;
    const accuracy      = totalAttempts > 0 ? Math.round((popsThisGame / totalAttempts) * 100) : 100;

    // Grade
    const grade = calcGrade(score, maxCombo, accuracy);

    // Populate game over
    document.getElementById('goScore').textContent    = score;
    document.getElementById('goHigh').textContent     = GameData.highScore;
    document.getElementById('goWave').textContent     = currentWave;
    document.getElementById('goCoins').textContent    = `+${sessionCoins}`;
    document.getElementById('goCombo').textContent    = `×${maxCombo}`;
    document.getElementById('goAccuracy').textContent = accuracy + '%';
    document.getElementById('gameoverGrade').textContent = grade;
    document.getElementById('gameoverTitle').textContent = score >= 100 ? '🌟 Incredible!' : score >= 50 ? '🎯 Well Done!' : score >= 20 ? '👍 Nice Try!' : '💥 Game Over';

    // Style grade ring
    const gradeColors = { S: '#ffd700', A: '#22d3a0', B: '#7c5ff7', C: '#00e5ff', D: '#ff5f7e' };
    document.querySelector('.gameover-grade-ring').style.background =
      `conic-gradient(${gradeColors[grade] || '#7c5ff7'} 0deg 270deg, rgba(255,255,255,0.06) 270deg 360deg)`;

    // Mission completions
    const missionBox = document.getElementById('missionSummary');
    missionBox.innerHTML = '';
    MissionsUI.getNewlyCompleted().forEach(m => {
      const el = document.createElement('div');
      el.className = 'mission-complete-tag';
      el.innerHTML = `${m.icon} ${m.name} complete! <span style="margin-left:auto">+${m.reward}🪙</span>`;
      missionBox.appendChild(el);
    });

    // Achievements check
    AchievementsUI.render();

    document.getElementById('numpadOverlay').classList.add('hidden');

    setTimeout(() => {
      ScreenRouter.show('gameover');
      AdsManager.showInterstitialAd(null);
    }, 700);
  }

  function calcGrade(score, combo, accuracy) {
    let pts = 0;
    if (score >= 100) pts += 4;
    else if (score >= 50) pts += 3;
    else if (score >= 25) pts += 2;
    else if (score >= 10) pts += 1;

    if (combo >= 15) pts += 3;
    else if (combo >= 10) pts += 2;
    else if (combo >= 5) pts += 1;

    if (accuracy >= 95) pts += 3;
    else if (accuracy >= 80) pts += 2;
    else if (accuracy >= 60) pts += 1;

    if (pts >= 9) return 'S';
    if (pts >= 7) return 'A';
    if (pts >= 5) return 'B';
    if (pts >= 3) return 'C';
    return 'D';
  }

  /* ═══════════════════════════════════════
     REVIVE
  ════════════════════════════════════════ */
  function revive() {
    if (reviveUsed) return;
    reviveUsed = true;
    lives      = 1;
    gameActive = true;
    combo      = 0;

    updateLivesUI();
    updateComboUI();

    BalloonSystem.init(selectedDiff, selectedType, currentWave);
    ScreenRouter.show('game');
    Toast.show('💗 Revived! Keep going!');

    setTimeout(() => {
      if (!GameData.settings.numpad) document.getElementById('inputBox').focus();
    }, 300);
  }

  /* ═══════════════════════════════════════
     RESTART
  ════════════════════════════════════════ */
  function restart() {
    BalloonSystem.stop();
    BalloonSystem.clearAll();
    startGame();
  }

  return {
    init, startGame, restart,
    pauseGame, resume, quitToMenu,
    onBalloonEscaped, onBombPop,
    addLife, revive,
  };

})();

/* ════════════════════════════════════════
   TUTORIAL SYSTEM
════════════════════════════════════════ */
const TutorialSystem = (() => {

  const steps = [
    { icon: '🎈', title: 'Welcome to BrainPop!', text: 'Balloons fall from the sky showing math problems. Solve them to pop the balloon before it escapes!' },
    { icon: '⌨️', title: 'Type Your Answer', text: 'Type the answer to a balloon\'s math problem and press Enter or ✓. Or tap 🔢 for the on-screen numpad!' },
    { icon: '🌟', title: 'Special Balloons', text: '★ Golden gives 5× coins! ⚡ Lightning gives bonus points! 🎁 Mystery gives a free powerup! ☠️ SKULL = do NOT pop it!' },
    { icon: '⚡', title: 'Power-Ups', text: 'Use power-ups to freeze balloons, bomb three at once, get a hint, double coins, or add an extra life!' },
    { icon: '🔥', title: 'Build Your Combo!', text: 'Pop balloons in a row for a combo multiplier. Every 10 pops advances you to the next wave — getting harder and more rewarding!' },
  ];

  let currentStep = 0;
  let onDone = null;

  function show(callback) {
    onDone = callback;
    currentStep = 0;
    render();
    document.getElementById('tutorialOverlay').classList.remove('hidden');

    document.getElementById('tutNext').addEventListener('click', next);
    document.getElementById('tutSkip').addEventListener('click', skip);
  }

  function next() {
    currentStep++;
    if (currentStep >= steps.length) {
      finish();
    } else {
      render();
    }
  }

  function skip() { finish(); }

  function render() {
    const step = steps[currentStep];
    document.getElementById('tutorialIcon').textContent  = step.icon;
    document.getElementById('tutorialTitle').textContent = step.title;
    document.getElementById('tutorialText').textContent  = step.text;

    const dotsEl = document.getElementById('tutorialDots');
    dotsEl.innerHTML = '';
    steps.forEach((_, i) => {
      const d = document.createElement('div');
      d.className = 'tut-dot' + (i === currentStep ? ' active' : '');
      dotsEl.appendChild(d);
    });

    document.getElementById('tutNext').textContent = currentStep === steps.length - 1 ? "Let's Play! 🎈" : 'Next →';
  }

  function finish() {
    document.getElementById('tutorialOverlay').classList.add('hidden');
    GameData.tutorialDone = true;
    saveGame();
    if (typeof onDone === 'function') onDone();
  }

  return { show };
})();


/* ════════════════════════════════════════
   APP BOOTSTRAP
════════════════════════════════════════ */
(function bootstrap() {
  const bar   = document.getElementById('loadingBar');
  const glow  = document.getElementById('loadingBarGlow');
  const hint  = document.getElementById('loadingHint');
  const hints = ['Loading balloons…', 'Mixing math problems…', 'Inflating…', 'Warming up…', 'Ready!'];
  let pct  = 0;
  let hIdx = 0;

  const loader = setInterval(() => {
    pct += Math.random() * 16 + 9;
    if (pct > 100) pct = 100;
    bar.style.width  = pct + '%';
    glow.style.width = pct + '%';
    hint.textContent = hints[Math.min(hIdx, hints.length - 1)];
    hIdx++;

    if (pct >= 100) {
      clearInterval(loader);
      setTimeout(() => {
        SettingsUI.applyTheme();
        ShopUI.applyBackground();
        wireNavigation();
        SettingsUI.init();
        ShopUI.init();
        DailyRewardUI.init();
        PowersSystem.init();
        BrainPop.init();
        DailyRewardUI.checkLoginStreak();
        HomeScreen.refresh();
        CoinUI.update();
        XPSystem.getProgress(); // init XP display
        ScreenRouter.show('home');
        if (GameData.settings.music) {
          MusicManager.play();
        }
      }, 350);
    }
  }, 100);

})();
