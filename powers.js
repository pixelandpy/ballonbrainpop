/* ════════════════════════════════════════
   BRAINPOP v2 — powers.js
   Powerup system: freeze, bomb, hint,
   double coins, extra life.
   Enhanced visual feedback.
════════════════════════════════════════ */

const PowersSystem = (() => {

  let freezeTimer  = null;
  let doubleActive = false;
  let doubleTimer  = null;
  let doubleRemain = 30;
  let isFrozen     = false;

  /* ── Update all power badges ── */
  function updateUI() {
    const p = GameData.powers;
    ['freeze','bomb','hint','double','life'].forEach(type => {
      const el = document.getElementById('p' + type.charAt(0).toUpperCase() + type.slice(1));
      if (el) el.textContent = p[type] || 0;
    });

    document.querySelectorAll('.power-btn').forEach(btn => {
      const type = btn.dataset.power;
      btn.classList.toggle('empty', (GameData.powers[type] || 0) === 0);
    });
  }

  /* ── Wire buttons ── */
  function init() {
    document.querySelectorAll('.power-btn').forEach(btn => {
      btn.addEventListener('click', () => use(btn.dataset.power));
    });
  }

  /* ── Use a power ── */
  function use(type) {
    const cnt = GameData.powers[type] || 0;
    if (cnt <= 0) {
      Toast.show(`No ${type} left! Buy more in Shop. 🛍️`);
      vibrate(60);
      return;
    }

    SoundManager.play('powerUse');
    vibrate(40);

    GameData.powers[type]--;
    saveGame();
    updateUI();

    if (window._sessionPowersUsed !== undefined) window._sessionPowersUsed++;
    if (typeof MissionsUI !== 'undefined') MissionsUI.updateStat('sessionPowerUses', 1);

    // Flash the button
    const btn = document.querySelector(`.power-btn[data-power="${type}"]`);
    if (btn) {
      btn.classList.add('active-power');
      setTimeout(() => btn.classList.remove('active-power'), 800);
    }

    switch(type) {
      case 'freeze': activateFreeze(); break;
      case 'bomb':   activateBomb();   break;
      case 'hint':   activateHint();   break;
      case 'double': activateDouble(); break;
      case 'life':   activateLife();   break;
    }
  }

  /* ══════════════════════════
     FREEZE
  ══════════════════════════ */
  function activateFreeze() {
    if (isFrozen) {
      // Extend
      clearTimeout(freezeTimer);
      Toast.show('❄️ Freeze extended! (4s)');
    } else {
      isFrozen = true;
      Toast.show('❄️ Frozen! (4s)');
    }

    document.querySelectorAll('.balloon:not(.popping)').forEach(b => {
      b.classList.add('frozen');
      b.dataset.frozen = 'true';
    });

    // Ice particles
    spawnFreezeBurst();

    freezeTimer = setTimeout(() => {
      isFrozen = false;
      document.querySelectorAll('.balloon.frozen').forEach(b => {
        b.classList.remove('frozen');
        b.dataset.frozen = 'false';
      });
      Toast.show('❄️ Freeze ended.');
    }, 4000);
  }

  function spawnFreezeBurst() {
    const gameArea = document.getElementById('gameArea');
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'pop-particle';
      p.style.cssText = `
        width:10px; height:10px;
        left:${cx}px; top:${cy}px;
        background: ${['#00e5ff','#80f0ff','#ccf8ff','#ffffff'][~~(Math.random()*4)]};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        position:absolute; pointer-events:none;
      `;
      const angle = Math.random() * Math.PI * 2;
      const dist  = 60 + Math.random() * 180;
      p.style.transition = `transform 0.7s ease-out, opacity 0.7s ease-out`;
      gameArea.appendChild(p);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        p.style.transform = `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px)`;
        p.style.opacity   = '0';
      }));
      setTimeout(() => p.remove(), 800);
    }
  }

  /* ══════════════════════════
     BOMB
  ══════════════════════════ */
  function activateBomb() {
    const gameArea   = document.getElementById('gameArea');
    const allBalloons = Array.from(gameArea.querySelectorAll('.balloon:not(.popping):not([data-special="skull"])'));

    if (allBalloons.length === 0) {
      Toast.show('No balloons to bomb! 💣');
      // Refund
      GameData.powers.bomb++;
      saveGame();
      updateUI();
      return;
    }

    const targets = shuffleArray([...allBalloons]).slice(0, 3);
    Toast.show(`💣 BOOM! Popped ${targets.length} balloon${targets.length === 1 ? '' : 's'}!`);

    // Screen flash
    const flash = document.createElement('div');
    flash.style.cssText = `
      position:fixed;inset:0;background:rgba(255,200,0,0.18);
      pointer-events:none;z-index:400;border-radius:0;
      animation:none;transition:opacity 0.4s;
    `;
    document.body.appendChild(flash);
    setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => flash.remove(), 400); }, 60);

    targets.forEach((balloon, i) => {
      setTimeout(() => {
        if (balloon.dataset.alive !== 'true') return;
        const rect = balloon.getBoundingClientRect();
        const cx   = rect.left + rect.width  / 2;
        const cy   = rect.top  + rect.height / 2;
        spawnPopParticles(cx, cy, balloon.style.getPropertyValue('--balloon-color') || '#ffd048', 'bomb');

        if (window.BrainPop && BrainPop.onBombPop) BrainPop.onBombPop(balloon);
        balloon.classList.add('popping');
        balloon.dataset.alive = 'false';
        setTimeout(() => balloon.remove(), 280);
      }, i * 130);
    });
  }

  /* ══════════════════════════
     HINT
  ══════════════════════════ */
  function activateHint() {
    const inputVal = parseInt(document.getElementById('inputBox').value);
    let targetBalloon = null;

    const liveBalloons = Array.from(document.querySelectorAll('.balloon:not(.popping)'));
    if (liveBalloons.length === 0) {
      Toast.show('No balloons to hint!');
      GameData.powers.hint++;
      saveGame();
      updateUI();
      return;
    }

    if (!isNaN(inputVal)) {
      liveBalloons.forEach(b => {
        if (parseInt(b.dataset.value) === inputVal) targetBalloon = b;
      });
    }

    if (!targetBalloon) {
      // Highlight lowest non-skull balloon
      const safe = liveBalloons.filter(b => b.dataset.special !== 'skull');
      if (safe.length === 0) {
        Toast.show('⚠️ Only skull balloons left — avoid them!');
        GameData.powers.hint++;
        saveGame();
        updateUI();
        return;
      }
      targetBalloon = safe.reduce((lowest, b) =>
        parseFloat(b.style.top) > parseFloat(lowest.style.top) ? b : lowest, safe[0]);
    }

    document.querySelectorAll('.balloon').forEach(b => b.classList.remove('hint-highlight'));
    targetBalloon.classList.add('hint-highlight');
    Toast.show(`💡 Answer: ${targetBalloon.dataset.value}`);

    setTimeout(() => targetBalloon && targetBalloon.classList.remove('hint-highlight'), 3000);
  }

  /* ══════════════════════════
     DOUBLE COINS
  ══════════════════════════ */
  function activateDouble() {
    if (doubleActive) {
      clearTimeout(doubleTimer);
      doubleRemain = 30;
    } else {
      doubleActive = true;
      document.getElementById('gameArea').classList.add('double-coins');
      Toast.show('💰 Double Coins active! (30s)');
    }

    doubleTimer = setTimeout(() => {
      doubleActive = false;
      document.getElementById('gameArea').classList.remove('double-coins');
      Toast.show('Double Coins ended.');
    }, 30000);
  }

  /* ══════════════════════════
     EXTRA LIFE
  ══════════════════════════ */
  function activateLife() {
    if (window.BrainPop && BrainPop.addLife) {
      const added = BrainPop.addLife();
      if (added) {
        Toast.show('💗 Extra life added!');
        spawnHeartBurst();
      } else {
        GameData.powers.life++;
        saveGame();
        updateUI();
        Toast.show('Lives already full!');
      }
    }
  }

  function spawnHeartBurst() {
    const gameArea = document.getElementById('gameArea');
    for (let i = 0; i < 8; i++) {
      const h = document.createElement('div');
      h.className = 'pop-star';
      h.textContent = '💗';
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      h.style.cssText = `left:${cx}px;top:${cy}px;font-size:1.4rem;`;
      const angle = (Math.PI * 2 / 8) * i;
      const dist  = 60 + Math.random() * 60;
      h.style.transition = 'transform 0.6s ease-out, opacity 0.6s ease-out';
      gameArea.appendChild(h);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        h.style.transform = `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px)`;
        h.style.opacity   = '0';
      }));
      setTimeout(() => h.remove(), 700);
    }
  }

  /* ══════════════════════════
     POP PARTICLES
  ══════════════════════════ */
  function spawnPopParticles(x, y, color = '#ff6eb4', specialType = 'normal') {
    const gameArea = document.getElementById('gameArea');
    const gaRect   = gameArea.getBoundingClientRect();
    const lx       = x - gaRect.left;
    const ly       = y - gaRect.top;

    const particleCount = specialType === 'golden' ? 14 : specialType === 'bomb' ? 12 : 8;
    const colors = specialType === 'golden'
      ? ['#ffd700','#ffe066','#fff0a0','#ffd048','#ffbf00']
      : specialType === 'skull'
      ? ['#ff5f7e','#ff0055','#cc0033','#ff3366']
      : [color, '#fff', '#ffd048', '#7c5ff7'];

    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.className = 'pop-particle';
      p.style.left       = lx + 'px';
      p.style.top        = ly + 'px';
      p.style.width      = (4 + Math.random() * 7) + 'px';
      p.style.height     = p.style.width;
      p.style.background = colors[~~(Math.random() * colors.length)];

      const angle = (Math.PI * 2 / particleCount) * i + Math.random() * 0.5;
      const dist  = 25 + Math.random() * 55;
      const tx    = Math.cos(angle) * dist;
      const ty    = Math.sin(angle) * dist;

      p.style.transition = 'transform 0.45s ease-out, opacity 0.45s ease-out';
      gameArea.appendChild(p);

      requestAnimationFrame(() => requestAnimationFrame(() => {
        p.style.transform = `translate(${tx}px, ${ty}px)`;
        p.style.opacity   = '0';
      }));

      setTimeout(() => p.remove(), 520);
    }

    // Stars for golden / bonus
    if (specialType === 'golden' || specialType === 'bonus') {
      for (let i = 0; i < 5; i++) {
        const s = document.createElement('div');
        s.className = 'pop-star';
        s.textContent = '★';
        s.style.cssText = `left:${lx}px;top:${ly}px;color:#ffd700;font-size:${1+Math.random()}rem;`;
        const angle = Math.random() * Math.PI * 2;
        const dist  = 40 + Math.random() * 60;
        s.style.transition = 'transform 0.6s ease-out, opacity 0.6s ease-out';
        gameArea.appendChild(s);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          s.style.transform = `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px) rotate(${Math.random()*360}deg)`;
          s.style.opacity   = '0';
        }));
        setTimeout(() => s.remove(), 700);
      }
    }
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = ~~(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function isDoubleActive()  { return doubleActive; }
  function isBalloonFrozen() { return isFrozen; }

  return { init, use, updateUI, isDoubleActive, isBalloonFrozen, spawnPopParticles };
})();
