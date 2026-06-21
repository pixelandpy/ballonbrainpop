/* ════════════════════════════════════════
   BRAINPOP v2 — shop.js
   Shop: skins, backgrounds, powerups.
   Expanded catalog, purchase/equip logic.
════════════════════════════════════════ */

const ShopUI = (() => {

  const SKINS = [
    { id: 'classic', name: 'Classic',  icon: '🎈', price: 0,    desc: 'The original beauty!'   },
    { id: 'neon',    name: 'Neon',     icon: '💚', price: 500,  desc: 'Electric glow vibes.'   },
    { id: 'ice',     name: 'Ice',      icon: '🧊', price: 1000,  desc: 'Cool crystal frost.'    },
    { id: 'candy',   name: 'Candy',    icon: '🍬', price: 1500,  desc: 'Sweet sugar swirls.'    },
    { id: 'fire',    name: 'Fire',     icon: '🔥', price: 2000,  desc: 'Blazing hot energy!'    },
    { id: 'toxic',   name: 'Toxic',    icon: '☣️', price: 2500,  desc: 'Radioactive ooze glow.' },
    { id: 'galaxy',  name: 'Galaxy',   icon: '🌌', price: 3000,  desc: 'Deep space explorer.'   },
    { id: 'royal',   name: 'Royal',    icon: '👑', price: 4000,  desc: 'Velvet purple & gold.'  },
    { id: 'rainbow', name: 'Rainbow',  icon: '🌈', price: 5000,  desc: 'All the colors at once!'},
    { id: 'cyber',   name: 'Cyber',    icon: '💻', price: 10000, desc: 'Digital grid aesthetic.' },
  ];

  const BACKGROUNDS = [
    { id: 'sky',     name: 'Sky',     icon: '☁️',  price: 0,   desc: 'Peaceful daytime sky.'   },
    { id: 'night',   name: 'Night',   icon: '🌙',  price: 500, desc: 'Cool evening calm.'       },
    { id: 'aurora',  name: 'Aurora',  icon: '🌌',  price: 1500, desc: 'Glowing teal night sky.'  },
    { id: 'space',   name: 'Space',   icon: '🚀',  price: 3000, desc: 'Infinite cosmos.'         },
    { id: 'forest',  name: 'Forest',  icon: '🌲',  price: 4000, desc: 'Deep nature vibes.'       },
    { id: 'desert',  name: 'Desert',  icon: '🏜️',  price: 5000, desc: 'Sun-baked golden dunes.'  },
    { id: 'cyber',   name: 'Cyber',   icon: '🔷',  price: 5500, desc: 'Neon grid world.'         },
    { id: 'ocean',   name: 'Ocean',   icon: '🌊',  price: 6500, desc: 'Deep blue underwater calm.' },
    { id: 'sunset',  name: 'Sunset',  icon: '🌅',  price: 7000, desc: 'Golden hour magic.'       },
    { id: 'volcano', name: 'Volcano', icon: '🌋',  price: 10000, desc: 'Molten lava intensity.'   },
  ];

  const POWERUPS = [
    { id: 'freeze', name: 'Freeze',       icon: '❄️', price: 500,  count: 3, desc: 'Stop all balloons for 4 seconds.'  },
    { id: 'bomb',   name: 'Bomb',         icon: '💣', price: 800,  count: 2, desc: 'Instantly pop 3 random balloons.'  },
    { id: 'hint',   name: 'Hint',         icon: '💡', price: 100,  count: 3, desc: 'Highlight the lowest balloon.'     },
    { id: 'double', name: 'Double Coins', icon: '💰', price: 600, count: 1, desc: '2× coin earnings for 30 seconds.'  },
    { id: 'life',   name: 'Extra Life',   icon: '💗', price: 1000, count: 1, desc: 'Recover one lost heart.'           },
  ];

  const BUNDLES = [
    { id: 'starter', name: 'Starter Pack', icon: '📦', price: 1000, desc: '5× Freeze + 3× Bomb + 5× Hint',
      grants: { freeze: 5, bomb: 3, hint: 5 } },
    { id: 'power',   name: 'Power Pack',   icon: '⚡', price: 2000, desc: '3× All powers + 2× Double',
      grants: { freeze: 3, bomb: 3, hint: 3, double: 2, life: 2 } },
  ];

  let currentTab = 'skins';

  /* ── Tab wiring ── */
  function init() {
    document.querySelectorAll('.shop-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.shop-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        render(btn.dataset.tab);
      });
    });
  }

  /* ── Render current tab ── */
  function render(tab = 'skins') {
    currentTab = tab;
    const grid = document.getElementById('shopGrid');
    grid.innerHTML = '';

    if      (tab === 'skins')       renderSkins(grid);
    else if (tab === 'backgrounds') renderBackgrounds(grid);
    else if (tab === 'powerups')    renderPowerups(grid);

    document.getElementById('shopCoins').textContent = GameData.coins.toLocaleString();
  }

  /* ── Skins ── */
  function renderSkins(grid) {
    SKINS.forEach(skin => {
      const owned    = GameData.ownedSkins.includes(skin.id);
      const equipped = GameData.equippedSkin === skin.id;

      const div = makeShopCard(skin, owned, equipped);
      div.addEventListener('click', () => {
        SoundManager.play('click');
        if (equipped) return;
        if (owned) {
          GameData.equippedSkin = skin.id;
          saveGame();
          render(currentTab);
          Toast.show(`Equipped: ${skin.name} skin!`);
        } else {
          if (!spend(skin.price)) return;
          GameData.ownedSkins.push(skin.id);
          GameData.equippedSkin = skin.id;
          saveGame();
          render(currentTab);
          CoinUI.update();
          Toast.show(`Unlocked: ${skin.name} skin! 🎉`);
          SoundManager.play('reward');
          vibrate([30,50,30]);
        }
      });

      grid.appendChild(div);
    });
  }

  /* ── Backgrounds ── */
  function renderBackgrounds(grid) {
    BACKGROUNDS.forEach(bg => {
      const owned    = GameData.ownedBgs.includes(bg.id);
      const equipped = GameData.equippedBg === bg.id;

      const div = makeShopCard(bg, owned, equipped);
      div.addEventListener('click', () => {
        SoundManager.play('click');
        if (equipped) return;
        if (owned) {
          GameData.equippedBg = bg.id;
          saveGame();
          applyBackground();
          render(currentTab);
          Toast.show(`Theme applied: ${bg.name}!`);
        } else {
          if (!spend(bg.price)) return;
          GameData.ownedBgs.push(bg.id);
          GameData.equippedBg = bg.id;
          saveGame();
          applyBackground();
          render(currentTab);
          CoinUI.update();
          Toast.show(`Theme unlocked: ${bg.name}! 🎉`);
          SoundManager.play('reward');
          vibrate([30,50,30]);
        }
      });

      grid.appendChild(div);
    });
  }

  /* ── Powerups ── */
  function renderPowerups(grid) {
    // Individual powers
    POWERUPS.forEach(pu => {
      const owned = GameData.powers[pu.id] || 0;
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.innerHTML = `
        <div class="item-icon">${pu.icon}</div>
        <div class="item-name">${pu.name}</div>
        <div style="font-size:0.68rem;color:var(--clr-text2);text-align:center">${pu.desc}</div>
        <div style="font-size:0.75rem;font-weight:900;color:var(--clr-text2)">Have: ${owned}</div>
        <div class="item-price">🪙 ${pu.price} for ${pu.count}</div>
      `;
      div.addEventListener('click', () => {
        SoundManager.play('click');
        if (!spend(pu.price)) return;
        GameData.powers[pu.id] = (GameData.powers[pu.id] || 0) + pu.count;
        saveGame();
        render(currentTab);
        CoinUI.update();
        Toast.show(`+${pu.count} ${pu.name}!`);
        SoundManager.play('coin');
      });
      grid.appendChild(div);
    });

    // Bundle deals
    BUNDLES.forEach(bundle => {
      const div = document.createElement('div');
      div.className = 'shop-item shop-item-bundle';
      div.style.gridColumn = 'span 2';
      div.innerHTML = `
        <div class="item-icon">${bundle.icon}</div>
        <div class="item-name" style="font-size:0.9rem">${bundle.name}</div>
        <div style="font-size:0.7rem;color:var(--clr-text2);text-align:center">${bundle.desc}</div>
        <div class="item-price" style="font-size:0.9rem">🪙 ${bundle.price} <span style="font-size:0.7rem;color:var(--clr-green);margin-left:4px">BEST VALUE</span></div>
      `;
      div.addEventListener('click', () => {
        SoundManager.play('click');
        if (!spend(bundle.price)) return;
        Object.entries(bundle.grants).forEach(([type, count]) => {
          GameData.powers[type] = (GameData.powers[type] || 0) + count;
        });
        saveGame();
        render(currentTab);
        CoinUI.update();
        Toast.show(`${bundle.name} unlocked! 🎉`);
        SoundManager.play('reward');
        vibrate([30,50,80]);
      });
      grid.appendChild(div);
    });
  }

  /* ── Helper: make a shop card ── */
  function makeShopCard(item, owned, equipped) {
    const div = document.createElement('div');
    div.className = 'shop-item' + (owned ? ' owned' : '') + (equipped ? ' equipped' : '');
    div.innerHTML = `
      <div class="item-icon">${item.icon}</div>
      <div class="item-name">${item.name}</div>
      <div style="font-size:0.68rem;color:var(--clr-text2);text-align:center">${item.desc}</div>
      ${equipped
        ? '<div class="item-status equipped-text">✓ Equipped</div>'
        : owned
        ? '<div class="item-status">Owned — Tap to Equip</div>'
        : item.price === 0
        ? '<div class="item-status">Free</div>'
        : `<div class="item-price">🪙 ${item.price.toLocaleString()}</div>`}
    `;
    return div;
  }

  /* ── Spend coins ── */
  function spend(amount) {
    if (GameData.coins < amount) {
      Toast.show('Not enough coins! 🪙');
      vibrate(60);
      return false;
    }
    GameData.coins -= amount;
    return true;
  }

  /* ── Apply background ── */
  function applyBackground() {
    const classes = ['bg-sky','bg-night','bg-aurora','bg-space','bg-forest','bg-desert','bg-cyber','bg-ocean','bg-sunset','bg-volcano'];
    classes.forEach(c => document.body.classList.remove(c));
    if (GameData.equippedBg !== 'sky') {
      document.body.classList.add('bg-' + GameData.equippedBg);
    }
  }

  return { init, render, applyBackground };
})();
