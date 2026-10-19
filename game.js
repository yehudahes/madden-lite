const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const homeScoreEl = document.getElementById('homeScore');
const awayScoreEl = document.getElementById('awayScore');
const statusTextEl = document.getElementById('statusText');
const downTextEl = document.getElementById('downText');
const fieldTextEl = document.getElementById('fieldText');

const startBtn = document.getElementById('startBtn');
const runBtn = document.getElementById('runBtn');
const passBtn = document.getElementById('passBtn');
const resetBtn = document.getElementById('resetBtn');

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  w: false,
  a: false,
  s: false,
  d: false,
  ' ': false,
};

const game = {
  playing: false,
  quarter: 1,
  timeLeft: 90,
  score: { home: 0, away: 0 },
  possession: 'home',
  down: 1,
  yardsToGo: 10,
  lineOfScrimmage: 25,
  playType: 'run',
  status: 'Press Start Drive',
  lastTimestamp: 0,
  secondsCounter: 0,
  ball: {
    x: 0,
    y: 0,
    radius: 7,
    active: false,
    carriedBy: null,
    velocityX: 0,
    velocityY: 0,
    owner: null,
  },
  offense: {
    x: 120,
    y: 260,
    radius: 15,
    speed: 2.7,
    sprintBoost: 1.8,
    color: '#aef5d0',
  },
  defenders: [],
  receivers: [],
  fieldGoalX: 0,
};

function resetGame() {
  game.score.home = 0;
  game.score.away = 0;
  game.quarter = 1;
  game.timeLeft = 90;
  game.possession = 'home';
  game.down = 1;
  game.yardsToGo = 10;
  game.lineOfScrimmage = 25;
  game.playType = 'run';
  game.status = 'Drive ready';
  game.playing = false;
  generateDefenseLine();
  setupOffense();
  updateHud();
}

function setupOffense() {
  const isHomeOffense = game.possession === 'home';
  const baseX = isHomeOffense ? 120 : 840;
  const baseY = 260;

  game.offense.x = baseX;
  game.offense.y = baseY;
  game.ball.x = baseX;
  game.ball.y = baseY;
  game.ball.active = false;
  game.ball.carriedBy = 'offense';
  game.ball.owner = 'offense';

  game.receivers = [
    { x: isHomeOffense ? 300 : 660, y: 180, radius: 14, route: 'up', team: 'offense', color: '#c8f2ff' },
    { x: isHomeOffense ? 310 : 650, y: 260, radius: 14, route: 'mid', team: 'offense', color: '#d8e8ff' },
    { x: isHomeOffense ? 300 : 660, y: 340, radius: 14, route: 'down', team: 'offense', color: '#d3f8d8' },
  ];

  for (const r of game.receivers) {
    if (!isHomeOffense) {
      r.x = 960 - r.x;
      r.y = 520 - r.y;
    }
  }
}

function generateDefenseLine() {
  const isHomeOffense = game.possession === 'home';
  const defenders = [];

  const laneY = [140, 200, 260, 320, 380];
  const startX = isHomeOffense ? 390 : 570;
  const side = isHomeOffense ? 1 : -1;

  laneY.forEach((y, i) => {
    defenders.push({
      x: startX + i * 18 * side,
      y,
      radius: 14,
      color: '#ffb789',
      speed: 2.2 + i * 0.08,
      target: null,
    });
  });

  game.defenders = defenders;
}

function startDrive() {
  if (!game.playing) {
    game.playing = true;
    game.status = 'Drive live';
    setupOffense();
    generateDefenseLine();
    updateHud();
  }
}

function resetDrive() {
  game.down = 1;
  game.yardsToGo = 10;
  game.lineOfScrimmage = 25;
  game.status = 'New drive';
  setupOffense();
  generateDefenseLine();
  updateHud();
}

function updateHud() {
  homeScoreEl.textContent = game.score.home;
  awayScoreEl.textContent = game.score.away;
  statusTextEl.textContent = game.status;
  downTextEl.textContent = `${game.down === 1 ? '1st' : game.down === 2 ? '2nd' : game.down === 3 ? '3rd' : '4th'} & ${game.yardsToGo}`;
  fieldTextEl.textContent = `Ball on ${game.possession === 'home' ? 'own' : 'opp'} ${game.lineOfScrimmage}`;
}

function handleInput() {
  const moveX = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
  const moveY = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
  const sprint = keys[' '] ? game.offense.sprintBoost : 1;

  if (game.playing) {
    const speed = game.offense.speed * sprint;
    game.offense.x += moveX * speed;
    game.offense.y += moveY * speed;

    game.offense.x = Math.max(70, Math.min(890, game.offense.x));
    game.offense.y = Math.max(80, Math.min(440, game.offense.y));
  }
}

function evaluateRunPlay() {
  if (!game.playing) return;

  game.status = 'Run play: use arrow keys to cut through the defense';
  game.playType = 'run';

  const dir = game.possession === 'home' ? 1 : -1;
  const startX = game.offense.x;

  function resolveRunOutcome() {
    const gained = Math.max(0, Math.round(Math.abs(game.offense.x - startX) / 8));

    if (gained === 0) {
      game.status = 'Tackle for loss';
      game.down += 1;
      advanceDowns();
      return;
    }

    if (game.possession === 'home') {
      game.lineOfScrimmage += gained;
    } else {
      game.lineOfScrimmage -= gained;
    }

    if (game.lineOfScrimmage >= 100 || game.lineOfScrimmage <= 0) {
      scoreTouchdown();
      return;
    }

    game.yardsToGo = Math.max(1, game.yardsToGo - gained);
    game.status = `Nice gain: ${gained} yards`;

    if (game.yardsToGo <= 0) {
      game.down = 1;
      game.yardsToGo = 10;
      game.status = 'Fresh set of downs';
    } else {
      game.down += 1;
      advanceDowns();
    }
  }

  const sim = setInterval(() => {
    if (!game.playing) {
      clearInterval(sim);
      return;
    }

    for (const d of game.defenders) {
      const chaseX = game.offense.x - d.x;
      const chaseY = game.offense.y - d.y;
      const length = Math.hypot(chaseX, chaseY) || 1;

      d.x += (chaseX / length) * d.speed * 0.5;
      d.y += (chaseY / length) * d.speed * 0.5;

      if (Math.hypot(game.offense.x - d.x, game.offense.y - d.y) < 18) {
        clearInterval(sim);
        resolveRunOutcome();
        updateHud();
        return;
      }
    }

    if (game.possession === 'home' && game.offense.x > 860) {
      clearInterval(sim);
      scoreTouchdown();
      return;
    }

    if (game.possession === 'away' && game.offense.x < 100) {
      clearInterval(sim);
      scoreTouchdown();
      return;
    }
  }, 25);
}

function evaluatePassPlay() {
  if (!game.playing) return;

  game.status = 'Pass play: the QB launches it deep';
  game.playType = 'pass';

  const receiver = game.receivers[Math.floor(Math.random() * game.receivers.length)];
  const targetX = receiver.x;
  const targetY = receiver.y;

  const startX = game.offense.x;
  const startY = game.offense.y;

  game.ball.active = true;
  game.ball.owner = 'ball';
  game.ball.x = startX;
  game.ball.y = startY;
  game.ball.velocityX = (targetX - startX) / 22;
  game.ball.velocityY = (targetY - startY) / 22;

  const passTimer = setInterval(() => {
    if (!game.playing) {
      clearInterval(passTimer);
      return;
    }

    game.ball.x += game.ball.velocityX;
    game.ball.y += game.ball.velocityY;

    const closeEnough = Math.hypot(game.ball.x - receiver.x, game.ball.y - receiver.y) < 18;
    const defenderClose = game.defenders.some((def) => Math.hypot(game.ball.x - def.x, game.ball.y - def.y) < 18);

    if (closeEnough && !defenderClose) {
      clearInterval(passTimer);
      const gain = Math.max(5, Math.round(Math.abs(receiver.x - startX) / 10));
      game.lineOfScrimmage += gain;
      game.yardsToGo = Math.max(1, game.yardsToGo - gain);
      game.status = `Completed pass for ${gain} yards`;
      game.ball.active = false;
      game.down += 1;
      if (game.yardsToGo <= 0) {
        game.down = 1;
        game.yardsToGo = 10;
      }
      advanceDowns();
      updateHud();
      return;
    }

    if (defenderClose) {
      clearInterval(passTimer);
      game.status = 'Pass intercepted! Turnover on the next possession';
      game.ball.active = false;
      switchPossession();
      updateHud();
      return;
    }

    if (game.ball.x > 940 || game.ball.x < 20 || game.ball.y < 40 || game.ball.y > 480) {
      clearInterval(passTimer);
      game.status = 'Incomplete pass';
      game.ball.active = false;
      game.down += 1;
      advanceDowns();
      updateHud();
    }
  }, 18);
}

function advanceDowns() {
  if (game.down > 4) {
    switchPossession();
    return;
  }

  if (game.yardsToGo <= 0) {
    game.down = 1;
    game.yardsToGo = 10;
  }

  updateHud();
}

function switchPossession() {
  game.possession = game.possession === 'home' ? 'away' : 'home';
  game.down = 1;
  game.yardsToGo = 10;
  game.lineOfScrimmage = 25;
  game.status = `${game.possession === 'home' ? 'Home' : 'Away'} have the ball`;
  setupOffense();
  generateDefenseLine();
  updateHud();
}

function scoreTouchdown() {
  if (game.possession === 'home') {
    game.score.home += 7;
    game.status = 'Home scores a touchdown!';
  } else {
    game.score.away += 7;
    game.status = 'Away scores a touchdown!';
  }

  game.playing = false;
  game.down = 1;
  game.yardsToGo = 10;
  game.lineOfScrimmage = 25;
  game.possession = game.possession === 'home' ? 'away' : 'home';
  setupOffense();
  generateDefenseLine();
  updateHud();
}

function drawField() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0b7a44';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= canvas.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x, 480);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += 70) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(0, 40, 100, 440);
  ctx.fillRect(canvas.width - 100, 40, 100, 440);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('HOME END', 18, 30);
  ctx.fillText('AWAY END', canvas.width - 110, 30);

  if (game.ball.active) {
    ctx.beginPath();
    ctx.fillStyle = '#f7f3d0';
    ctx.arc(game.ball.x, game.ball.y, game.ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = game.offense.color;
  ctx.beginPath();
  ctx.arc(game.offense.x, game.offense.y, game.offense.radius, 0, Math.PI * 2);
  ctx.fill();

  for (const d of game.defenders) {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const r of game.receivers) {
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText('You', game.offense.x - 12, game.offense.y - 22);
}

function loop(timestamp) {
  const delta = timestamp - game.lastTimestamp;
  game.lastTimestamp = timestamp;

  handleInput();
  drawField();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  const letter = event.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(event.key.toLowerCase())) {
    keys[event.key] = true;
  }

  if (letter === 'w' || letter === 'a' || letter === 's' || letter === 'd' || letter === 'r' || letter === 'p' || letter === 't') {
    keys[letter] = true;
  }

  if (letter === 'r') {
    evaluateRunPlay();
  }

  if (letter === 'p') {
    evaluatePassPlay();
  }

  if (letter === 't') {
    game.offense.x = game.possession === 'home' ? 870 : 90;
    game.status = 'Play ends on contact';
    updateHud();
  }
});

window.addEventListener('keyup', (event) => {
  const letter = event.key.toLowerCase();
  keys[event.key] = false;
  if (letter === 'w' || letter === 'a' || letter === 's' || letter === 'd') {
    keys[letter] = false;
  }
});

startBtn.addEventListener('click', startDrive);
runBtn.addEventListener('click', evaluateRunPlay);
passBtn.addEventListener('click', evaluatePassPlay);
resetBtn.addEventListener('click', () => {
  resetGame();
  game.playing = true;
  game.status = 'Game started';
  updateHud();
});

resetGame();
requestAnimationFrame(loop);
