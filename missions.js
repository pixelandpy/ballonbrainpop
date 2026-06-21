/* ════════════════════════════════════════
   BRAINPOP v2 — missions.js
   Daily missions: 10 in pool, 3 per day.
   Progress tracking, claim, rewards.
════════════════════════════════════════ */

const MissionsUI = (() => {

  const MISSION_POOL = [
    { id: 'm_pop10',     icon: '🎈', name: 'Balloon Popper',   desc: 'Pop 10 balloons in a session.',       stat: 'sessionPops',      target: 10,  reward: 30  },
    { id: 'm_pop25',     icon: '🎯', name: 'Sharpshooter',     desc: 'Pop 25 balloons in a session.',       stat: 'sessionPops',      target: 25,  reward: 60  },
    { id: 'm_pop40',     icon: '🏹', name: 'Balloon Hunter',   desc: 'Pop 40 balloons in a session.',       stat: 'sessionPops',      target: 40,  reward: 90  },
    { id: 'm_combo3',    icon: '🔥', name: 'On Fire',          desc: 'Achieve a ×3 combo.',                 stat: 'sessionCombo',     target: 3,   reward: 25  },
    { id: 'm_combo5',    icon: '💥', name: 'Combo Beast',      desc: 'Achieve a ×5 combo.',                 stat: 'sessionCombo',     target: 5,   reward: 50  },
    { id: 'm_combo10',   icon: '👑', name: 'Combo King',       desc: 'Achieve a ×10 combo.',                stat: 'sessionCombo',     target: 10,  reward: 100 },
    { id: 'm_combo15',   icon: '🌟', name: 'Combo Legend',     desc: 'Achieve a ×15 combo.',                stat: 'sessionCombo',     target: 15,  reward: 140 },
    { id: 'm_score50',   icon: '⭐', name: 'Point Scorer',     desc: 'Score 50 points.',                    stat: 'sessionScore',     target: 50,  reward: 40  },
    { id: 'm_score100',  icon: '🌟', name: 'Century Club',     desc: 'Score 100 points.',                   stat: 'sessionScore',     target: 100, reward: 80  },
    { id: 'm_score200',  icon: '💫', name: 'Double Century',   desc: 'Score 200 points.',                   stat: 'sessionScore',     target: 200, reward: 150 },
    { id: 'm_play3',     icon: '🎮', name: 'Game Day',         desc: 'Play 3 games today.',                 stat: 'sessionGames',     target: 3,   reward: 35  },
    { id: 'm_play5',     icon: '🕹️', name: 'Game Marathon',    desc: 'Play 5 games today.',                 stat: 'sessionGames',     target: 5,   reward: 60  },
    { id: 'm_nopow',     icon: '⚡', name: 'Pure Skill',       desc: 'Score 20 without using powerups.',    stat: 'noPowerScore',     target: 20,  reward: 55  },
    { id: 'm_genius',    icon: '🧠', name: 'Genius Run',       desc: 'Score 30 on Genius mode.',            stat: 'geniusScore',      target: 30,  reward: 100 },
    { id: 'm_addition',  icon: '➕', name: 'Add It Up',        desc: 'Pop 15 addition balloons.',           stat: 'addPops',          target: 15,  reward: 40  },
    { id: 'm_sub',       icon: '➖', name: 'Take It Away',     desc: 'Pop 15 subtraction balloons.',        stat: 'subPops',          target: 15,  reward: 40  },
    { id: 'm_mul',       icon: '✖️', name: 'Times Tables',     desc: 'Pop 12 multiplication balloons.',     stat: 'mulPops',          target: 12,  reward: 50  },
    { id: 'm_div',       icon: '➗', name: 'Divide & Conquer', desc: 'Pop 10 division balloons.',           stat: 'divPops',          target: 10,  reward: 50  },
    { id: 'm_wave3',     icon: '🌊', name: 'Wave Surfer',      desc: 'Reach wave 3 in one game.',           stat: 'sessionWave',      target: 3,   reward: 70  },
    { id: 'm_wave5',     icon: '🏄', name: 'Wave Master',      desc: 'Reach wave 5 in one game.',           stat: 'sessionWave',      target: 5,   reward: 110 },
    { id: 'm_golden',    icon: '🌟', name: 'Gold Digger',      desc: 'Pop a golden balloon.',               stat: 'goldenSession',    target: 1,   reward: 60  },
    { id: 'm_golden3',   icon: '💰', name: 'Gold Rush',        desc: 'Pop 3 golden balloons in a session.', stat: 'goldenSession',    target: 3,   reward: 130 },
    { id: 'm_special3',  icon: '🎁', name: 'Special Ops',      desc: 'Pop 3 special balloons.',             stat: 'specialSession',   target: 3,   reward: 75  },
    { id: 'm_lightning3',icon: '⚡', name: 'Storm Chaser',     desc: 'Pop 3 lightning balloons.',           stat: 'lightningSession', target: 3,   reward: 75  },
    { id: 'm_powerup3',  icon: '🛠️', name: 'Toolbox',          desc: 'Use 3 powerups in a session.',        stat: 'sessionPowerUses', target: 3,   reward: 45  },
    { id: 'm_coins100',  icon: '🪙', name: 'Coin Hustle',      desc: 'Earn 100 coins from popping in one session.', stat: 'sessionCoinsEarned', target: 100, reward: 50 },
  ];

  /* ── Pick 3 daily missions deterministically by day ── */
  function getDailyMissions() {
    const today = new Date().toDateString();
    if (GameData.missionResetDate !== today) {
      const seed   = hashDate(today);
      GameData.missions = {};
      const picked = pickMissions(seed, 3);
      picked.forEach(m => {
        GameData.missions[m.id] = { progress: 0, claimed: false };
      });
      GameData.missions.__date   = today;
      GameData.missions.__picked = picked.map(m => m.id);
      GameData.missionResetDate  = today;
      saveGame();
    }
    const ids = GameData.missions.__picked || [];
    return ids.map(id => MISSION_POOL.find(m => m.id === id)).filter(Boolean);
  }

  function pickMissions(seed, count) {
    const pool = [...MISSION_POOL];
    let s = seed;
    for (let i = pool.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      const j = Math.abs(s) % (i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  function hashDate(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /* ── Render missions list ── */
  function render() {
    const list     = document.getElementById('missionsList');
    const missions = getDailyMissions();
    list.innerHTML = '';

    // Next reset countdown
    const now     = new Date();
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    const msLeft  = nextDay - now;
    const hLeft   = Math.floor(msLeft / 3600000);
    const mLeft   = Math.floor((msLeft % 3600000) / 60000);

    const countdown = document.createElement('div');
    countdown.className = 'missions-reset-info';
    countdown.innerHTML = `🔄 Resets in <strong>${hLeft}h ${mLeft}m</strong>`;
    list.appendChild(countdown);

    missions.forEach(m => {
      const state    = GameData.missions[m.id] || { progress: 0, claimed: false };
      const progress = Math.min(state.progress, m.target);
      const pct      = Math.round((progress / m.target) * 100);
      const done     = progress >= m.target;
      const claimed  = state.claimed;

      const div = document.createElement('div');
      div.className = 'mission-item' + (done ? ' completed' : '');
      div.innerHTML = `
        <div class="mission-icon">${m.icon}</div>
        <div class="mission-info">
          <div class="mission-title">${m.name}</div>
          <div class="mission-desc">${m.desc}</div>
          <div class="mission-progress-bar">
            <div class="mission-progress-fill" style="width:${pct}%"></div>
          </div>
          <div style="font-size:0.68rem;color:var(--clr-text2);margin-top:3px">${progress} / ${m.target}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0">
          <div class="mission-reward">🪙${m.reward}</div>
          ${claimed
            ? `<div style="font-size:0.68rem;color:var(--clr-green);font-weight:900">✓ Done</div>`
            : done
            ? `<button class="btn-claim-mission" data-id="${m.id}" data-reward="${m.reward}">Claim</button>`
            : ''}
        </div>
      `;
      list.appendChild(div);
    });

    list.querySelectorAll('.btn-claim-mission').forEach(btn => {
      btn.addEventListener('click', () => {
        claimMission(btn.dataset.id, parseInt(btn.dataset.reward));
        render();
      });
    });
  }

  /* ── Claim a mission reward ── */
  function claimMission(id, reward) {
    if (!GameData.missions[id] || GameData.missions[id].claimed) return;
    GameData.missions[id].claimed = true;
    GameData.coins += reward;
    GameData.totalCoinsEarned += reward;
    saveGame();
    CoinUI.update();
    SoundManager.play('reward');
    vibrate([30, 50, 30]);
    Toast.show(`Mission complete! +${reward} 🪙`);
  }

  /* ── Update mission stat from game events ── */
  function updateStat(statName, value) {
    const missions = getDailyMissions();
    missions.forEach(m => {
      if (m.stat !== statName) return;
      const state = GameData.missions[m.id];
      if (!state || state.claimed || state.progress >= m.target) return;

      const maxStats = ['sessionCombo','sessionScore','geniusScore','noPowerScore','sessionWave'];
      if (maxStats.includes(statName)) {
        state.progress = Math.max(state.progress || 0, value);
      } else {
        state.progress = (state.progress || 0) + value;
      }
    });
    saveGame();
  }

  /* ── Get newly completed (unclaimed) missions ── */
  function getNewlyCompleted() {
    const missions = getDailyMissions();
    return missions.filter(m => {
      const state = GameData.missions[m.id];
      return state && state.progress >= m.target && !state.claimed;
    });
  }

  return { render, updateStat, getDailyMissions, getNewlyCompleted };
})();
