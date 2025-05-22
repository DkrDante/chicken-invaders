const DEV_MODE = false;

const stage = document.createElement('canvas'),
  ctx = stage.getContext('2d'),
  dialogue = document.querySelector('.dialogue'),
  startBtn = dialogue.querySelector('button'),
  hud = document.querySelector('.hud'),
  scoreNode = hud.querySelector('.hud__score span');

let ship, lasers = [], enemies = [], stars = [], teslaCoils = [],
  playing = false,
  gameStarted = false,
  speedMultiplier,
  enemySeedFrameInterval,
  score = 0,
  tick = 0,
  laserTick = 0,
  heat = 0,
  maxHeat = 100,
  overheated = false,
  coolingRate = 2,
  heatPerShot = 8,
  currentWeapon = 'laser', // 'laser', 'shotgun', 'beam'
  weaponCooldown = 0,
  boosterActive = false,
  boosterFuel = 100,
  maxBoosterFuel = 100,
  boosterConsumption = 3,
  boosterRecharge = 1;

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calcScore(x) {
  return Math.floor(1 / x * 500);
}

// Create starfield background
function createStars() {
  stars = [];
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: Math.random() * stage.width,
      y: Math.random() * stage.height,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.8 + 0.2
    });

  }
}

function updateStars() {
  for (let star of stars) {
    star.y += star.speed;
    if (star.y > stage.height) {
      star.y = -5;
      star.x = Math.random() * stage.width;
    }
  }
}

function drawStars() {
  ctx.save();
  for (let star of stars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function Ship(options) {
  this.radius = 15;
  this.x = options.x || stage.width * .5 - this.radius - .5;
  this.y = options.y || stage.height - this.radius - 30;
  this.width = this.radius * 2;
  this.height = this.width;
  this.color = options.color || '#00ff88';
  this.left = false;
  this.right = false;
  this.speed = 5;
  this.baseSpeed = 5;
  this.boostSpeed = 12;
  this.active = true;

  document.addEventListener('keydown', this.onKeyDown.bind(this));
  document.addEventListener('keyup', this.onKeyUp.bind(this));
}

Ship.prototype.update = function (x) {
  this.x = x;
  this.y = stage.height - this.radius - 30;
};

Ship.prototype.draw = function () {
  ctx.save();

  if (DEV_MODE) {
    ctx.fillStyle = 'skyblue';
    ctx.fillRect(this.x, this.y, this.width, this.width);
  }

  ctx.fillStyle = this.color;

  ctx.fillRect(this.x + this.radius - 6, this.y, 12, this.radius + 5);

  // Wings
  ctx.fillRect(this.x + 2, this.y + this.radius - 2, 8, 15);
  ctx.fillRect(this.x + this.width - 10, this.y + this.radius - 2, 8, 15);

  // Engine exhausts
  ctx.fillStyle = boosterActive ? '#00ffff' : '#ff4400';
  ctx.fillRect(this.x + 4, this.y + this.radius + 13, 4, 8);
  ctx.fillRect(this.x + this.width - 8, this.y + this.radius + 13, 4, 8);
  ctx.fillRect(this.x + this.radius - 2, this.y + this.radius + 10, 4, 11);

  ctx.fillStyle = '#44aaff';
  ctx.fillRect(this.x + this.radius - 3, this.y + 2, 6, 8);

  ctx.fillStyle = '#ffaa00';
  ctx.fillRect(this.x + 3, this.y + this.radius + 1, 2, 3);
  ctx.fillRect(this.x + this.width - 5, this.y + this.radius + 1, 2, 3);

  if (boosterActive) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(this.x - 2, this.y + this.radius + 8, this.width + 4, 15);
    ctx.restore();
  }

  ctx.restore();
};

Ship.prototype.onKeyDown = function (e) {
  if (ship.active) {
    if (e.keyCode === 39) this.right = true; else
      if (e.keyCode === 37) this.left = true;

    if (e.keyCode == 32 && !this.shooting && !overheated && weaponCooldown <= 0) {
      this.shooting = true;
      laserTick = 0;
    }

    if (e.keyCode === 49) {// Key 1
      e.preventDefault();
      currentWeapon = 'laser';
      console.log('Switched to laser');
    }
    if (e.keyCode === 50) {// Key 2
      e.preventDefault();
      currentWeapon = 'shotgun';
      console.log('Switched to shotgun');
    }
    if (e.keyCode === 51) {// Key 3
      e.preventDefault();
      currentWeapon = 'beam';
      console.log('Switched to beam');
    }
    if (e.keyCode === 52) {// Key 4
      e.preventDefault();
      currentWeapon = 'tesla';
      console.log('Switched to tesla');
    }

    // Booster
    if (e.keyCode === 16 && boosterFuel > 0) {// Shift key
      boosterActive = true;
      this.speed = this.boostSpeed;
    }
  }
};

Ship.prototype.onKeyUp = function (e) {
  if (e.key === 'ArrowRight') this.right = false; else
    if (e.key === 'ArrowLeft') this.left = false; else
      if (e.keyCode == 32) this.shooting = false; else
        if (e.keyCode === 16) {// Shift key
          boosterActive = false;
          this.speed = this.baseSpeed;
        }
};

function Laser(options) {
  this.x = options.x - .5;
  this.y = options.y || stage.height - 50;
  this.width = options.width || 3;
  this.height = options.height || 20;
  this.speed = options.speed || 20;
  this.color = options.color || 'blue';
  this.type = options.type || 'laser';
  this.active = true;
  this.damage = options.damage || 1;
  this.piercing = options.piercing || false;
  this.spread = options.spread || 0;
}

Laser.prototype.update = function (y) {
  this.y = y;
  if (this.spread !== 0) {
    this.x += this.spread;
  }
};

Laser.prototype.draw = function () {
  ctx.save();

  switch (this.type) {
    case 'laser':
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
      // Add glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
      break;

    case 'shotgun':
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'beam':
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
      // Beam effect
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'white';
      ctx.fillRect(this.x + 1, this.y, this.width - 2, this.height);
      break;
  }


  ctx.restore();
};

function TeslaCoil(options) {
  this.x = options.x;
  this.y = options.y;
  this.radius = 100;
  this.active = true;
  this.duration = 60; // frames
  this.age = 0;
}

TeslaCoil.prototype.update = function () {
  this.age++;
  if (this.age >= this.duration) {
    this.active = false;
  }
};


TeslaCoil.prototype.draw = function () {
  if (!this.active) return;

  ctx.save();
  ctx.globalAlpha = Math.max(0.1, 1 - this.age / this.duration);

  const baseHue = (this.age * 6) % 360;

  const targets = enemies
    .filter(e => e.active)
    .map(e => {
      const dx = e.x + e.radius - this.x;
      const dy = e.y + e.radius - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return { enemy: e, dx, dy, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3); // Zap up to 3 closest

  for (let { enemy, dx, dy, distance } of targets) {
    if (distance <= this.radius * 3) {
      const color = `hsl(${(baseHue + Math.random() * 60) % 360}, 100%, 60%)`;
      drawLightning(this.x, this.y, dx, dy, color);

      // Damage enemy
      enemy.active = false;
      score += calcScore(enemy.radius);
      scoreNode.textContent = score;

      // Chain Damage
      const chained = enemies
        .filter(e2 => e2 !== enemy && e2.active)
        .map(e2 => {
          const dx2 = e2.x + e2.radius - enemy.x;
          const dy2 = e2.y + e2.radius - enemy.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          return { enemy: e2, dx: dx2, dy: dy2, distance: dist2 };
        })
        .sort((a, b) => a.distance - b.distance)[0];

      if (chained && chained.distance <= this.radius * 2) {
        const chainColor = `hsl(${(baseHue + 180 + Math.random() * 60) % 360}, 100%, 60%)`;
        drawLightning(enemy.x, enemy.y, chained.dx, chained.dy, chainColor);

        chained.enemy.active = false;
        score += calcScore(chained.enemy.radius);
        scoreNode.textContent = score;
      }
    }
  }

  // Draw central coil
  ctx.strokeStyle = `hsl(${baseHue}, 100%, 70%)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
};

function drawLightning(startX, startY, dx, dy, color) {
  ctx.lineCap = 'round';

  ctx.shadowBlur = 15;
  ctx.shadowColor = color;

  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  drawJaggedLine(startX, startY, dx, dy);

  ctx.shadowBlur = 0; // remove glow for core
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  drawJaggedLine(startX, startY, dx, dy);

  ctx.shadowBlur = 8;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  drawJaggedLine(startX, startY, dx, dy);

  ctx.shadowBlur = 0;
}

function drawJaggedLine(startX, startY, dx, dy) {
  ctx.beginPath();
  ctx.moveTo(startX, startY);

  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;

    const jitterAmount = (i < 3 || i > steps - 3) ? 5 : 20;
    const jitterX = (Math.random() - 0.5) * jitterAmount;
    const jitterY = (Math.random() - 0.5) * jitterAmount;

    const x = startX + dx * progress + jitterX;
    const y = startY + dy * progress + jitterY;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawLightning(startX, startY, dx, dy, color) {
  ctx.lineCap = 'round';

  ctx.shadowBlur = 15;
  ctx.shadowColor = color;

  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  drawJaggedLine(startX, startY, dx, dy);

  ctx.shadowBlur = 0; // remove glow for core
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  drawJaggedLine(startX, startY, dx, dy);

  ctx.shadowBlur = 8;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  drawJaggedLine(startX, startY, dx, dy);

  ctx.shadowBlur = 0;
}

function drawJaggedLine(startX, startY, dx, dy) {
  ctx.beginPath();
  ctx.moveTo(startX, startY);

  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;

    const jitterAmount = (i < 3 || i > steps - 3) ? 5 : 20;
    const jitterX = (Math.random() - 0.5) * jitterAmount;
    const jitterY = (Math.random() - 0.5) * jitterAmount;

    const x = startX + dx * progress + jitterX;
    const y = startY + dy * progress + jitterY;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}


function Enemy(options) {
  this.radius = randomBetween(10, 40);
  this.width = this.radius * 2;
  this.height = this.width;
  this.x = randomBetween(0, stage.width - this.width);
  this.y = -this.radius * 2;
  this.color = options != undefined && options.color ? options.color : '#888888';
  this.speed = 2;
  this.active = true;
  this.rotation = 0;
  this.rotationSpeed = (Math.random() - 0.5) * 0.1;

  this.shape = randomBetween(1, 5);

  this.craters = [];
  this.edges = [];

  if (this.shape === 1) {// Only for circular asteroids
    const numCraters = randomBetween(2, 5);
    for (let i = 0; i < numCraters; i++) {
      this.craters.push({
        x: (Math.random() - 0.5) * this.radius * 0.8,
        y: (Math.random() - 0.5) * this.radius * 0.8,
        size: Math.random() * this.radius * 0.3 + 2
      });

    }

    const numEdges = randomBetween(8, 16);
    for (let i = 0; i < numEdges; i++) {
      const angle = i / numEdges * Math.PI * 2;
      const variance = (Math.random() - 0.5) * this.radius * 0.3;
      this.edges.push({
        angle: angle,
        radius: this.radius + variance
      });

    }
  }
}

Enemy.prototype.update = function (x, y) {
  this.x = x;
  this.y = y;
  this.rotation += this.rotationSpeed;
};

Enemy.prototype.draw = function () {
  if (DEV_MODE) {
    ctx.fillStyle = 'skyblue';
    ctx.fillRect(this.x, this.y, this.width, this.width);
  }

  ctx.save();
  ctx.translate(this.x + this.radius, this.y + this.radius);
  ctx.rotate(this.rotation);

  const centerX = 0;
  const centerY = 0;

  switch (this.shape) {
    case 1: // Detailed Asteroid (circular base)
      // Draw irregular outline
      ctx.fillStyle = this.color;
      ctx.beginPath();
      for (let i = 0; i < this.edges.length; i++) {
        const edge = this.edges[i];
        const x = Math.cos(edge.angle) * edge.radius;
        const y = Math.sin(edge.angle) * edge.radius;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();

      // Draw craters
      ctx.fillStyle = '#444444';
      for (let crater of this.craters) {
        ctx.beginPath();
        ctx.arc(crater.x, crater.y, crater.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add highlights
      ctx.fillStyle = '#aaaaaa';
      ctx.beginPath();
      ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 2: // Crystalline Square
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.radius, -this.radius, this.width, this.height);
      // Add crystal lines
      ctx.strokeStyle = '#aaaaaa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-this.radius, -this.radius);
      ctx.lineTo(this.radius, this.radius);
      ctx.moveTo(this.radius, -this.radius);
      ctx.lineTo(-this.radius, this.radius);
      ctx.stroke();
      break;

    case 3: // Spiked Triangle
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(0, -this.radius);
      ctx.lineTo(-this.radius, this.radius);
      ctx.lineTo(this.radius, this.radius);
      ctx.closePath();
      ctx.fill();
      // Add spikes
      ctx.fillStyle = '#666666';
      ctx.beginPath();
      ctx.moveTo(0, -this.radius);
      ctx.lineTo(-5, -this.radius + 10);
      ctx.lineTo(5, -this.radius + 10);
      ctx.closePath();
      ctx.fill();
      break;

    case 4: // Metallic Diamond
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(0, -this.radius);
      ctx.lineTo(this.radius, 0);
      ctx.lineTo(0, this.radius);
      ctx.lineTo(-this.radius, 0);
      ctx.closePath();
      ctx.fill();
      // Add metallic sheen
      ctx.fillStyle = '#bbbbbb';
      ctx.beginPath();
      ctx.moveTo(0, -this.radius);
      ctx.lineTo(this.radius * 0.5, -this.radius * 0.5);
      ctx.lineTo(0, 0);
      ctx.lineTo(-this.radius * 0.5, -this.radius * 0.5);
      ctx.closePath();
      ctx.fill();
      break;

    case 5: // Organic Hexagon
      ctx.fillStyle = this.color;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        const variance = (Math.random() - 0.5) * this.radius * 0.1;
        const x = (this.radius + variance) * Math.cos(angle);
        const y = (this.radius + variance) * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
      // Add organic spots
      ctx.fillStyle = '#555555';
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * this.radius * 0.5;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        ctx.beginPath();
        ctx.arc(x, y, Math.random() * 5 + 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
  }


  ctx.restore();
};

function hitTest(item1, item2) {
  let collision = true;
  if (
    item1.x > item2.x + item2.width ||
    item1.y > item2.y + item2.height ||
    item2.x > item1.x + item1.width ||
    item2.y > item1.y + item1.height) {
    collision = false;
  }
  return collision;
}

function updateHeat() {
  // Cool down the weapon when not shooting
  if (!ship.shooting && heat > 0) {
    heat -= coolingRate;
    if (heat < 0) heat = 0;
  }

  // Check if weapon has cooled down enough to stop overheating
  if (overheated && heat <= maxHeat * 0.3) {
    overheated = false;
  }

  // Update weapon cooldown
  if (weaponCooldown > 0) {
    weaponCooldown--;
  }
}

function updateBooster() {
  if (boosterActive && boosterFuel > 0) {
    boosterFuel -= boosterConsumption;
    if (boosterFuel <= 0) {
      boosterFuel = 0;
      boosterActive = false;
      ship.speed = ship.baseSpeed;
    }
  } else if (!boosterActive && boosterFuel < maxBoosterFuel) {
    boosterFuel += boosterRecharge;
    if (boosterFuel > maxBoosterFuel) {
      boosterFuel = maxBoosterFuel;
    }
  }
}

function drawHUD() {
  // Heat meter
  const meterWidth = 200;
  const meterHeight = 20;
  const meterX = stage.width - meterWidth - 20;
  const meterY = 20;

  // Heat meter background
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(meterX - 5, meterY - 5, meterWidth + 10, meterHeight + 10);

  // Heat meter border
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);

  // Heat bar
  const heatPercent = heat / maxHeat;
  const heatWidth = meterWidth * heatPercent;

  if (overheated) {
    ctx.fillStyle = 'red';
  } else if (heatPercent > 0.8) {
    ctx.fillStyle = 'orange';
  } else if (heatPercent > 0.6) {
    ctx.fillStyle = 'yellow';
  } else {
    ctx.fillStyle = 'green';
  }

  ctx.fillRect(meterX, meterY, heatWidth, meterHeight);

  // Heat text
  ctx.fillStyle = 'white';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  const heatText = overheated ? 'OVERHEATED!' : 'HEAT';
  ctx.fillText(heatText, meterX + meterWidth / 2, meterY + meterHeight + 20);

  // Booster meter
  const boosterY = meterY + 50;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(meterX - 5, boosterY - 5, meterWidth + 10, meterHeight + 10);

  ctx.strokeStyle = 'white';
  ctx.strokeRect(meterX, boosterY, meterWidth, meterHeight);

  const boosterPercent = boosterFuel / maxBoosterFuel;
  const boosterWidth = meterWidth * boosterPercent;

  ctx.fillStyle = boosterActive ? '#00ffff' : '#0088ff';
  ctx.fillRect(meterX, boosterY, boosterWidth, meterHeight);

  ctx.fillStyle = 'white';
  ctx.fillText('BOOST', meterX + meterWidth / 2, boosterY + meterHeight + 20);

  // Weapon indicator
  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Weapon: ${currentWeapon.toUpperCase()}`, 20, stage.height - 60);
  ctx.fillText('1-Laser 2-Shotgun 3-Beam 4-Tesla', 20, stage.height - 40);
  ctx.fillText('SHIFT - Boost', 20, stage.height - 20);

  ctx.restore();
}

function createWeaponFire() {
  const weaponHeat = {
    laser: 8,
    shotgun: 15,
    beam: 25,
    tesla: 40
  };


  const weaponCooldowns = {
    laser: 0,
    shotgun: 15,
    beam: 30,
    tesla: 120
  };


  switch (currentWeapon) {
    case 'laser':
      let laser = new Laser({
        color: '#00ffff',
        x: ship.x + ship.radius - 1.5,
        type: 'laser'
      });

      lasers.push(laser);
      break;

    case 'shotgun':
      // Create 5 spread shots
      for (let i = 0; i < 5; i++) {
        let shotgunPellet = new Laser({
          color: '#ffaa00',
          x: ship.x + ship.radius - 2 + (i - 2) * 3,
          width: 4,
          height: 8,
          speed: 18,
          type: 'shotgun',
          spread: (i - 2) * 0.5
        });

        lasers.push(shotgunPellet);
      }
      break;

    case 'beam':
      let beam = new Laser({
        color: '#ff0088',
        x: ship.x + ship.radius - 4,
        width: 8,
        height: 40,
        speed: 25,
        type: 'beam',
        piercing: true
      });

      lasers.push(beam);
      break;

    case 'tesla':
      let coil = new TeslaCoil({
        x: ship.x + ship.radius,
        y: ship.y
      });

      teslaCoils.push(coil);
      break;
  }


  heat += weaponHeat[currentWeapon];
  weaponCooldown = weaponCooldowns[currentWeapon];

  if (heat >= maxHeat) {
    heat = maxHeat;
    overheated = true;
  }
}

function handleLaserCollision() {
  for (let enemy of enemies) {
    for (let laser of lasers) {
      let collision = hitTest(laser, enemy);
      if (collision && laser.active && enemy.active) {
        console.log('you destroyed an enemy');
        enemy.active = false;
        if (!laser.piercing) {
          laser.active = false;
        }

        // increase enemy speed and frequency of enemy spawns
        speedMultiplier += .025;
        if (enemySeedFrameInterval > 20) {
          enemySeedFrameInterval -= 2;
        }

        // increase score
        score += calcScore(enemy.radius);
        scoreNode.textContent = score;
      }
    }
  }
}

function handleShipCollision() {
  // check for collisions between ship and enemies
  if (enemies.length) {
    for (let enemy of enemies) {
      let collision = hitTest(ship, enemy);
      if (collision) {
        console.log('your ship was destroyed');
        ship.active = false;
        setTimeout(() => {
          ship.active = true;
          speedMultiplier = 1;
          enemySeedFrameInterval = 100;
          score = 0;
          heat = 0;
          overheated = false;
          boosterFuel = maxBoosterFuel;
          currentWeapon = 'laser';
          scoreNode.textContent = score;
        }, 2000);
      }
    }
  }
}

function drawShip(xPosition) {
  if (ship.active) {
    ship.update(xPosition);
    ship.draw();
  }
}

function drawEnemies() {
  if (enemies.length) {
    for (let enemy of enemies) {
      // draw an enemy if it's active
      if (enemy.active) {
        enemy.update(enemy.x, enemy.y += enemy.speed * speedMultiplier);
        enemy.draw();
      }
    }
  }
}

function enemyCleanup() {
  if (enemies.length) {
    enemies = enemies.filter(enemy => {
      let visible = enemy.y < stage.height + enemy.width;
      let active = enemy.active === true;
      return visible && active;
    });
  }
}

function drawLasers() {
  if (lasers.length) {
    for (let laser of lasers) {
      if (laser.active) {
        laser.update(laser.y -= laser.speed);
        laser.draw();
      }
    }
  }
}

function updateTeslaCoils() {
  for (let coil of teslaCoils) {
    if (coil.active) {
      coil.update();
      coil.draw();
    }
  }

  teslaCoils = teslaCoils.filter(coil => coil.active);
}

function laserCleanup() {
  lasers = lasers.filter(laser => {
    let visible = laser.y > -laser.height;
    let active = laser.active === true;
    return visible && active;
  });
}

function render(delta) {
  if (playing) {
    let xPos = ship.x;

    // seed new enemies
    if (tick % enemySeedFrameInterval === 0 && ship.active) {
      const enemy = new Enemy();
      enemies.push(enemy);
      console.log({ enemySeedFrameInterval, speedMultiplier });
    }

    // background gradient
    ctx.save();
    const gradient = ctx.createLinearGradient(0, 0, 0, stage.height);
    gradient.addColorStop(0, '#000011');
    gradient.addColorStop(0.5, '#001122');
    gradient.addColorStop(1, '#000033');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, stage.width, stage.height);
    ctx.restore();

    // Draw starfield
    updateStars();
    drawStars();

    // ship movement
    if (ship.left)
      xPos = ship.x -= ship.speed; else
      if (ship.right)
        xPos = ship.x += ship.speed;

    // stage boundaries
    if (gameStarted) {
      if (xPos < 0)
        xPos = 0; else
        if (xPos > stage.width - ship.width)
          xPos = stage.width - ship.width;
    }

    // Update systems
    updateHeat();
    updateBooster();

    // create weapons fire
    if (ship.active && ship.shooting && !overheated && weaponCooldown <= 0) {
      if (laserTick === 0 || laserTick % 10 === 0) {
        createWeaponFire();
      }
    }

    drawShip(xPos);

    handleShipCollision();
    handleLaserCollision();

    drawLasers();
    drawEnemies();
    updateTeslaCoils();
    drawHUD();

    enemyCleanup();
    laserCleanup();

    if (ship.shooting) laserTick++;
    tick++;
  }

  requestAnimationFrame(render);
}

function startGame(e) {
  console.log('starting game');
  dialogue.classList.add('dialogue--hidden');
  hud.classList.remove('hud--hidden');
  e.currentTarget.blur();

  // reset the demo/intro to the actual game settings:
  speedMultiplier = 1;
  enemySeedFrameInterval = 100;
  ship.x = stage.width * .5 - ship.radius - .5;
  ship.y = stage.height - ship.radius - 30;
  enemies = [];
  heat = 0;
  overheated = false;
  boosterFuel = maxBoosterFuel;
  currentWeapon = 'laser';
  gameStarted = true;
}

function onResize() {
  stage.width = window.innerWidth;
  stage.height = window.innerHeight;
  createStars(); // Recreate stars for new dimensions
}

// Global key handler for weapon switching
document.addEventListener('keydown', function (e) {
  if (playing && ship && ship.active) {
    switch (e.keyCode) {
      case 49: // Key 1
        e.preventDefault();
        currentWeapon = 'laser';
        console.log('Switched to laser');
        break;
      case 50: // Key 2
        e.preventDefault();
        currentWeapon = 'shotgun';
        console.log('Switched to shotgun');
        break;
      case 51: // Key 3
        e.preventDefault();
        currentWeapon = 'beam';
        console.log('Switched to beam');
        break;
      case 52: // Key 4
        e.preventDefault();
        currentWeapon = 'tesla';
        console.log('Switched to tesla');
        break;
    }

  }
});

startBtn.addEventListener('click', startGame);
window.addEventListener('resize', onResize);

document.body.appendChild(stage);
onResize();

// start the ship off-screen:
ship = new Ship({ color: '#00ff88', x: -100, y: -100 });

// set up some ridiculous enemy speeds for the intro:
speedMultiplier = 6,
  enemySeedFrameInterval = 20;

playing = true;
render();
