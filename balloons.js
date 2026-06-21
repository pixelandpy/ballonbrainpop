/* ════════════════════════════════════════
   BRAINPOP v2 — balloons.js
   Balloon creation, math generation,
   special types: golden, skull, lightning, bonus.
   Canvas starfield background.
════════════════════════════════════════ */

const BalloonSystem = (() => {

  /* ── Difficulty Config ── */
  const DIFFICULTY = {
    easy:   { speedMin: 0.55, speedMax: 1.1,  spawnDelay: 2800, minDelay: 1300, numRange: [1,9],   reward: 1, xpBase: 5  },
    medium: { speedMin: 0.95, speedMax: 1.75, spawnDelay: 2200, minDelay: 950,  numRange: [1,15],  reward: 2, xpBase: 10 },
    hard:   { speedMin: 1.45, speedMax: 2.55, spawnDelay: 1800, minDelay: 700,  numRange: [1,20],  reward: 3, xpBase: 15 },
    genius: { speedMin: 2.1,  speedMax: 3.9,  spawnDelay: 1400, minDelay: 480,  numRange: [2,25],  reward: 5, xpBase: 25 },
  };

  /* ── Balloon Palettes ── */
  const CLASSIC_COLORS = [
    '#ff6eb4','#ff9966','#ffcc00','#66cc99','#66aaff',
    '#cc66ff','#ff6666','#66ffdd','#ff99cc','#aaddff',
  ];
  const NEON_COLORS = [
    '#00ffcc','#ff00aa','#00aaff','#ffff00','#ff6600',
    '#cc00ff','#00ff66','#ff3366','#00ccff','#ffcc00',
  ];
  const FIRE_COLORS  = ['#ff4400','#ff8800','#ffcc00','#ff2200','#ff6600'];
  const GALAXY_COLORS = ['#8844ff','#4488ff','#cc44ff','#4444cc','#6622ff'];
  const RAINBOW_COLORS = ['#ff6eb4','#ff9900','#ffee00','#00cc88','#4488ff','#aa44ff'];
  const CYBER_COLORS = ['#00e5ff','#0088cc','#00bbdd','#0055ff','#00ddff'];
  const ICE_COLORS   = ['#d6f3ff','#a0e3ff','#8fd9ff','#bff0ff','#5fc6ee'];
  const CANDY_COLORS = ['#ff5fa8','#ffe066','#ff8fc7','#ffd1e8','#ff85b3'];
  const TOXIC_COLORS = ['#c8ff00','#9aff00','#7ee000','#d4ff4d','#aaff33'];
  const ROYAL_COLORS = ['#9b30ff','#c560ff','#7a1fcc','#b347ff','#ffd700'];

  /* ── State ── */
  let activeBalloons = [];
  let spawnTimer     = null;
  let currentConfig  = null;
  let currentSpeed   = 1.2;
  let currentDelay   = 2500;
  let mathType       = 'mixed';
  let balloonSize    = 72;
  let running        = false;
  let difficultyKey  = 'hard';
  let currentWave    = 1;
  let waveSpeedBoost = 0;

  /* ── Canvas Starfield ── */
  let bgCtx    = null;
  let bgCanvas = null;
  let stars    = [];
  let bgAnimId = null;

  function initCanvas() {
    bgCanvas = document.getElementById('bgCanvas');
    if (!bgCanvas) return;
    bgCtx    = bgCanvas.getContext('2d');
    resizeCanvas();

    // Create stars
    stars = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * bgCanvas.width,
        y: Math.random() * bgCanvas.height,
        r: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.7 + 0.2,
        speed: Math.random() * 0.3 + 0.05,
        twinkleDir: Math.random() > 0.5 ? 1 : -1,
        twinkleSpeed: Math.random() * 0.012 + 0.005,
      });
    }

    drawBg();
  }

  function resizeCanvas() {
    if (!bgCanvas) return;
    bgCanvas.width  = window.innerWidth;
    bgCanvas.height = window.innerHeight;
  }

  function drawBg() {
    if (!bgCtx || !bgCanvas) return;
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

    stars.forEach(s => {
      s.alpha += s.twinkleDir * s.twinkleSpeed;
      if (s.alpha > 0.9 || s.alpha < 0.1) s.twinkleDir *= -1;

      bgCtx.beginPath();
      bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      bgCtx.fillStyle = `rgba(200,190,255,${s.alpha})`;
      bgCtx.fill();

      // Slow vertical drift
      s.y -= s.speed * 0.1;
      if (s.y < -4) s.y = bgCanvas.height + 4;
    });

    bgAnimId = requestAnimationFrame(drawBg);
  }

  function stopCanvas() {
    if (bgAnimId) cancelAnimationFrame(bgAnimId);
    bgAnimId = null;
  }

  /* ── Init ── */
  function init(difficulty, type, wave = 1) {
    difficultyKey  = difficulty;
    mathType       = type;
    currentConfig  = DIFFICULTY[difficulty];
    currentWave    = wave;
    waveSpeedBoost = (wave - 1) * 0.12;
    currentSpeed   = Math.min(currentConfig.speedMin + waveSpeedBoost, currentConfig.speedMax);
    currentDelay   = Math.max(currentConfig.spawnDelay - (wave - 1) * 120, currentConfig.minDelay);
    balloonSize    = 72;
    activeBalloons = [];
    running        = true;

    initCanvas();
    startSpawning();
  }

  function stop() {
    running = false;
    clearTimeout(spawnTimer);
    stopCanvas();
  }

  /* ── Wave Update (called by game.js without full restart) ── */
  function upgradeToWave(wave) {
    currentWave    = wave;
    waveSpeedBoost = (wave - 1) * 0.12;
    currentSpeed   = Math.min(currentConfig.speedMin + waveSpeedBoost, currentConfig.speedMax);
    currentDelay   = Math.max(currentConfig.spawnDelay - (wave - 1) * 120, currentConfig.minDelay);
  }

  /* ── Progressive difficulty within wave ── */
  const diffInterval = setInterval(() => {
    if (!running || !currentConfig) return;
    const max = currentConfig.speedMax + waveSpeedBoost * 0.5;
    if (currentSpeed < max)    currentSpeed = Math.min(currentSpeed + 0.05, max);
    if (balloonSize  > 50)     balloonSize  = Math.max(balloonSize - 0.4, 50);
  }, 8000);

  /* ── Spawning Loop ── */
  function startSpawning() {
    if (!running) return;
    spawnBalloon();
    spawnTimer = setTimeout(startSpawning, currentDelay + Math.random() * 400);
  }

  /* ── Decide Special Type ──
     Bands are exclusive ranges (not independent thresholds) so that
     gating a type to a later wave never leaks its odds into another
     type's band on earlier waves. */
  function pickSpecialType() {
    if (currentWave < 2) return 'normal';
    const roll = Math.random();

    const goldenOn    = currentWave >= 3;
    const skullOn     = currentWave >= 2;
    const lightningOn = currentWave >= 3;
    const bonusOn     = currentWave >= 4;

    let lo = 0;
    if (goldenOn)    { if (roll >= lo && roll < lo + 0.10) return 'golden';    lo += 0.10; }
    if (skullOn)     { if (roll >= lo && roll < lo + 0.08) return 'skull';     lo += 0.08; }
    if (lightningOn) { if (roll >= lo && roll < lo + 0.06) return 'lightning'; lo += 0.06; }
    if (bonusOn)     { if (roll >= lo && roll < lo + 0.04) return 'bonus';    lo += 0.04; }

    return 'normal';
  }

  /* ── Spawn One Balloon ── */
  function spawnBalloon() {
    if (!running) return;

    const gameArea  = document.getElementById('gameArea');
    const skin      = GameData.equippedSkin || 'classic';
    const specialType = pickSpecialType();

    let color;
    switch(skin) {
      case 'neon':    color = NEON_COLORS[~~(Math.random() * NEON_COLORS.length)]; break;
      case 'fire':    color = FIRE_COLORS[~~(Math.random() * FIRE_COLORS.length)]; break;
      case 'galaxy':  color = GALAXY_COLORS[~~(Math.random() * GALAXY_COLORS.length)]; break;
      case 'rainbow': color = RAINBOW_COLORS[~~(Math.random() * RAINBOW_COLORS.length)]; break;
      case 'cyber':   color = CYBER_COLORS[~~(Math.random() * CYBER_COLORS.length)]; break;
      case 'ice':     color = ICE_COLORS[~~(Math.random() * ICE_COLORS.length)]; break;
      case 'candy':   color = CANDY_COLORS[~~(Math.random() * CANDY_COLORS.length)]; break;
      case 'toxic':   color = TOXIC_COLORS[~~(Math.random() * TOXIC_COLORS.length)]; break;
      case 'royal':   color = ROYAL_COLORS[~~(Math.random() * ROYAL_COLORS.length)]; break;
      default:        color = CLASSIC_COLORS[~~(Math.random() * CLASSIC_COLORS.length)];
    }

    const balloon = document.createElement('div');
    balloon.dataset.alive   = 'true';
    balloon.dataset.frozen  = 'false';
    balloon.dataset.special = specialType;

    if (specialType !== 'normal') {
      balloon.className = `balloon skin-${skin} type-${specialType} special-entry`;
    } else {
      balloon.className = `balloon skin-${skin} wiggle`;
      balloon.style.setProperty('--balloon-color', color);
    }

    // Generate an expression whose value doesn't collide with a live
    // balloon of the "opposite" safety (skull vs. everything else).
    // Colliding values force an unwinnable choice — typing the shared
    // number always pops the skull, no matter which balloon the player
    // meant to target. Retry a bounded number of times, then accept
    // whatever we get rather than risk an infinite loop.
    let exp;
    const liveValues = activeBalloons
      .filter(b => b.dataset.alive === 'true')
      .map(b => ({ value: parseInt(b.dataset.value), special: b.dataset.special }));

    for (let attempt = 0; attempt < 8; attempt++) {
      exp = generateExpression();
      const clashesWithSkull = specialType !== 'skull' &&
        liveValues.some(v => v.special === 'skull' && v.value === exp.value);
      const clashesWithSafe = specialType === 'skull' &&
        liveValues.some(v => v.special !== 'skull' && v.value === exp.value);
      if (!clashesWithSkull && !clashesWithSafe) break;
    }

    balloon.dataset.value  = exp.value;
    balloon.dataset.type   = exp.opType;
    balloon.innerText      = specialType !== 'normal'
      ? (specialType === 'golden' ? `★${exp.text}★` : specialType === 'skull' ? `☠${exp.text}☠` : specialType === 'lightning' ? `⚡${exp.text}` : `?${exp.text}?`)
      : exp.text;

    const w      = window.innerWidth;
    const margin = balloonSize + 16;
    const x      = ~~(Math.random() * (w - margin * 2)) + margin;

    // Special balloons slightly larger
    const size = specialType !== 'normal' ? balloonSize + 12 : balloonSize;
    balloon.style.width    = size + 'px';
    balloon.style.height   = (size + 14) + 'px';
    balloon.style.left     = x + 'px';
    balloon.style.top      = '-110px';
    balloon.style.fontSize = Math.max(0.65, size / 90) + 'rem';

    gameArea.appendChild(balloon);
    activeBalloons.push(balloon);

    animateFall(balloon);
  }

  /* ── Fall Animation ── */
  function animateFall(balloon) {
    let y = -110;

    function fall() {
      if (!running) return;
      if (balloon.dataset.alive !== 'true') return;
      if (balloon.dataset.frozen === 'true') {
        requestAnimationFrame(fall);
        return;
      }

      y += currentSpeed;
      balloon.style.top = y + 'px';

      if (y > window.innerHeight + 40) {
        balloon.dataset.alive = 'false';
        removeBalloon(balloon);
        balloon.remove();

        // Skull balloons escaping = no penalty
        if (balloon.dataset.special !== 'skull') {
          if (typeof BrainPop !== 'undefined') {
            BrainPop.onBalloonEscaped();
          }
        }
        return;
      }

      requestAnimationFrame(fall);
    }

    requestAnimationFrame(fall);
  }

  /* ── Pop a Balloon ── */
  function popBalloon(balloon) {
    if (!balloon || balloon.dataset.alive !== 'true') return;
    balloon.dataset.alive = 'false';

    const rect  = balloon.getBoundingClientRect();
    const cx    = rect.left + rect.width  / 2;
    const cy    = rect.top  + rect.height / 2;
    const color = balloon.style.getPropertyValue('--balloon-color') || '#ff6eb4';

    PowersSystem.spawnPopParticles(cx, cy, color, balloon.dataset.special);

    balloon.classList.remove('wiggle', 'type-golden', 'type-skull', 'type-lightning', 'type-bonus', 'special-entry');
    balloon.classList.add('popping');

    setTimeout(() => {
      removeBalloon(balloon);
      balloon.remove();
    }, 280);
  }

  /* ── Try to Match an Answer ── */
  function tryAnswer(val) {
    if (isNaN(val)) return null;

    let best  = null;
    let bestY = -Infinity;

    activeBalloons.forEach(b => {
      if (b.dataset.alive !== 'true') return;
      if (parseInt(b.dataset.value) !== val) return;
      if (b.dataset.special === 'skull') return; // Don't auto-pop skulls
      const y = parseFloat(b.style.top);
      if (y > bestY) { bestY = y; best = b; }
    });

    if (!best) return null;
    popBalloon(best);
    return best;
  }

  /* ── Try to Pop a Skull (wrong!) ── */
  function trySkull(val) {
    // Returns skull balloon if user typed its answer (bad!)
    let found = null;
    activeBalloons.forEach(b => {
      if (b.dataset.alive !== 'true') return;
      if (b.dataset.special !== 'skull') return;
      if (parseInt(b.dataset.value) === val) found = b;
    });
    return found;
  }

  function removeBalloon(balloon) {
    const idx = activeBalloons.indexOf(balloon);
    if (idx !== -1) activeBalloons.splice(idx, 1);
  }

  function clearAll() {
    activeBalloons.forEach(b => {
      b.dataset.alive = 'false';
      b.remove();
    });
    activeBalloons = [];
    const ga = document.getElementById('gameArea');
    if (ga) {
      // Keep canvas, remove only balloon divs
      ga.querySelectorAll('.balloon, .pop-particle, .float-text').forEach(el => el.remove());
    }
  }

  /* ══════════════════════════
     MATH EXPRESSION GENERATOR
  ══════════════════════════ */
  function generateExpression() {
    const [min, max] = currentConfig.numRange;
    let opType = mathType;

    if (mathType === 'mixed') {
      const ops = ['add', 'sub', 'mul', 'div'];
      opType = ops[~~(Math.random() * ops.length)];
    }

    let a, b, text, value;

    switch(opType) {
      case 'add':
        a = rand(min, max); b = rand(min, max);
        text = `${a}+${b}`; value = a + b;
        break;

      case 'sub':
        a = rand(min, max); b = rand(min, max);
        if (b > a) [a, b] = [b, a];
        text = `${a}−${b}`; value = a - b;
        break;

      case 'mul':
        a = rand(1, Math.min(max, 12));
        b = rand(1, Math.min(max, 12));
        text = `${a}×${b}`; value = a * b;
        break;

      case 'div': {
        b = rand(1, Math.min(max, 12));
        const q = rand(1, Math.min(max, 12));
        a    = b * q;
        text = `${a}÷${b}`; value = q;
        break;
      }

      default:
        a = rand(1,10); b = rand(1,10);
        text = `${a}+${b}`; value = a + b;
    }

    return { text, value, opType };
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function getActive()     { return activeBalloons; }
  function getDiffConfig() { return DIFFICULTY[difficultyKey]; }
  function isRunning()     { return running; }
  function getCurrentWave(){ return currentWave; }

  return {
    init, stop, upgradeToWave,
    tryAnswer, trySkull, popBalloon,
    clearAll, getActive, getDiffConfig,
    isRunning, getCurrentWave,
  };
})();
