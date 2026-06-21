/* ════════════════════════════════════════
   BRAINPOP v2 — rewards.js
   Daily login rewards and streak system.
   14-day rolling reward cycle.
════════════════════════════════════════ */

const DailyRewardUI = (() => {

  const CYCLE_LENGTH = 14;

  const REWARDS = [
    { day: 1,  icon: '🪙', label: '+30 Coins',    type: 'coins', value: 30  },
    { day: 2,  icon: '🪙', label: '+50 Coins',    type: 'coins', value: 50  },
    { day: 3,  icon: '❄️', label: '+2 Freeze',    type: 'power', power: 'freeze', value: 2 },
    { day: 4,  icon: '🪙', label: '+80 Coins',    type: 'coins', value: 80  },
    { day: 5,  icon: '💣', label: '+2 Bombs',     type: 'power', power: 'bomb',   value: 2 },
    { day: 6,  icon: '💡', label: '+3 Hints',     type: 'power', power: 'hint',   value: 3 },
    { day: 7,  icon: '🌈', label: '200 Coins!',   type: 'coins', value: 200 },
    { day: 8,  icon: '🪙', label: '+150 Coins',   type: 'coins', value: 150 },
    { day: 9,  icon: '💰', label: '+1 Double Coins', type: 'power', power: 'double', value: 1 },
    { day: 10, icon: '🪙', label: '+220 Coins',   type: 'coins', value: 220 },
    { day: 11, icon: '💗', label: '+2 Extra Life', type: 'power', power: 'life', value: 2 },
    { day: 12, icon: '🪙', label: '+260 Coins',   type: 'coins', value: 260 },
    { day: 13, icon: '⚡', label: 'Power Bundle',  type: 'bundle', grants: { freeze: 2, bomb: 2, hint: 2 } },
    { day: 14, icon: '👑', label: '500 Coins!',   type: 'coins', value: 500 },
  ];

  function canClaim() {
    return GameData.lastClaimDate !== new Date().toDateString();
  }

  function getCurrentDay() {
    return ((GameData.loginStreak % CYCLE_LENGTH) || CYCLE_LENGTH);
  }

  /* ── Render 14-day grid ── */
  function render() {
    const grid     = document.getElementById('dailyGrid');
    const btn      = document.getElementById('btnClaimDaily');
    const streakEl = document.getElementById('streakInfo');
    const claimed  = !canClaim();
    const today    = getCurrentDay();

    grid.innerHTML = '';

    REWARDS.forEach(r => {
      const div = document.createElement('div');
      let cls = 'daily-day';
      if (r.day < today)   cls += ' claimed';
      if (r.day === today) cls += claimed ? ' claimed' : ' today';
      if (r.day > today)   cls += ' future';

      div.className = cls;
      div.innerHTML = `
        <div class="daily-day-num">Day ${r.day}</div>
        <div class="daily-day-icon">${r.icon}</div>
        <div class="daily-day-val">${r.label}</div>
        ${r.day < today || (r.day === today && claimed) ? '<div class="daily-check">✓</div>' : ''}
      `;
      grid.appendChild(div);
    });

    // Button
    if (claimed) {
      btn.disabled      = true;
      btn.textContent   = '✅ Claimed Today!';
      btn.style.opacity = '0.5';
    } else {
      btn.disabled      = false;
      btn.textContent   = `🎁 Claim Day ${today} Reward`;
      btn.style.opacity = '1';
    }

    streakEl.textContent = `🔥 Current Streak: ${GameData.loginStreak} day${GameData.loginStreak !== 1 ? 's' : ''}`;
  }

  /* ── Claim reward ── */
  function claim() {
    if (!canClaim()) {
      Toast.show('Already claimed today! Come back tomorrow. 🌙');
      return;
    }

    const today     = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    // Streak logic
    if (GameData.lastClaimDate === yesterday) {
      GameData.loginStreak++;
    } else if (GameData.lastClaimDate !== today) {
      GameData.loginStreak = 1;
    }

    GameData.lastClaimDate = today;
    const day    = getCurrentDay();
    const reward = REWARDS.find(r => r.day === day);

    if (reward) {
      if (reward.type === 'coins') {
        GameData.coins += reward.value;
        GameData.totalCoinsEarned += reward.value;
        Toast.show(`🎁 Day ${day}: +${reward.value} coins!`);
      } else if (reward.type === 'power') {
        GameData.powers[reward.power] = (GameData.powers[reward.power] || 0) + reward.value;
        Toast.show(`🎁 Day ${day}: +${reward.value} ${reward.icon}`);
      } else if (reward.type === 'bundle') {
        Object.entries(reward.grants).forEach(([type, count]) => {
          GameData.powers[type] = (GameData.powers[type] || 0) + count;
        });
        Toast.show(`🎁 Day ${day}: Power Bundle unlocked!`);
      }

      SoundManager.play('reward');
      vibrate([30, 50, 30]);
    }

    // Streak milestone bonus — every full cycle completed
    if (GameData.loginStreak > 0 && GameData.loginStreak % CYCLE_LENGTH === 0) {
      const bonus = 250;
      GameData.coins += bonus;
      GameData.totalCoinsEarned += bonus;
      setTimeout(() => Toast.show(`🌈 ${CYCLE_LENGTH}-Day streak bonus! +${bonus} 🪙`), 1500);
    }

    saveGame();
    CoinUI.update();
    render();

    // Remove daily dot
    const dot = document.getElementById('dailyDot');
    if (dot) dot.classList.remove('show');
  }

  /* ── Init button ── */
  function init() {
    document.getElementById('btnClaimDaily').addEventListener('click', claim);
  }

  /* ── Check login streak on app open ── */
  function checkLoginStreak() {
    const today     = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (GameData.lastLoginDate === today) return;

    if (GameData.lastLoginDate !== yesterday && GameData.lastLoginDate !== '') {
      // Streak broken — don't reset here, let claim() handle it
    }

    GameData.lastLoginDate = today;
    saveGame();

    if (canClaim()) {
      const dot = document.getElementById('dailyDot');
      if (dot) dot.classList.add('show');
    }
  }

  return { render, init, claim, canClaim, checkLoginStreak };
})();
