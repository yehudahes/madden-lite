const TEAMS = [
  {
    id: 'chiefs',
    name: 'Chiefs',
    primary: '#d9a441',
    accent: '#1d4dc1',
    playbook: [
      { name: 'Power Run', type: 'run', direction: 'left', description: 'Inside zone to the weak side' },
      { name: 'Counter', type: 'run', direction: 'right', description: 'Pull left guard and cut back' },
      { name: 'Slant', type: 'pass', route: 'short', description: 'Quick timing route to the slot' },
      { name: 'Go Route', type: 'pass', route: 'deep', description: 'Vertical shot down the field' },
    ],
  },
  {
    id: 'cowboys',
    name: 'Cowboys',
    primary: '#7db8ff',
    accent: '#b19a10',
    playbook: [
      { name: 'Pitch Sweep', type: 'run', direction: 'left', description: 'Outside speed sweep' },
      { name: 'Inside Trap', type: 'run', direction: 'right', description: 'Power up the middle' },
      { name: 'Comet', type: 'pass', route: 'short', description: 'Fast rhythm pass across the formation' },
      { name: 'Deep Post', type: 'pass', route: 'deep', description: 'The field-stretcher up the seam' },
    ],
  },
  {
    id: 'bears',
    name: 'Bears',
    primary: '#d65a45',
    accent: '#d6c180',
    playbook: [
      { name: 'Tackle Dive', type: 'run', direction: 'right', description: 'Power dive behind the fullback' },
      { name: 'Wide Zone', type: 'run', direction: 'left', description: 'Stretch to the edge' },
      { name: 'Out Route', type: 'pass', route: 'short', description: 'Quick out to the boundary' },
      { name: 'Corner Shot', type: 'pass', route: 'deep', description: 'Deep corner across the field' },
    ],
  },
  {
    id: 'patriots',
    name: 'Patriots',
    primary: '#1f7abf',
    accent: '#d7dfe7',
    playbook: [
      { name: 'Misdirection', type: 'run', direction: 'left', description: 'Shift and pull left' },
      { name: 'Belly', type: 'run', direction: 'right', description: 'Fullback dive behind the guard' },
      { name: 'Mesh', type: 'pass', route: 'short', description: 'Two-man crossing concept' },
      { name: 'Fade', type: 'pass', route: 'deep', description: 'Go route with back-shoulder timing' },
    ],
  },
];

const state = {
  screen: 'menu',
  selectedHome: 'chiefs',
  selectedAway: 'cowboys',
  possession: 'home',
  homeScore: 0,
  awayScore: 0,
  down: 1,
  yardsToGo: 10,
  lineOfScrimmage: 25,
  quarter: 1,
  timeLeft: 90,
  status: 'Choose your teams',
  log: [],
  playbook: [],
  playInProgress: false,
  carrier: { x: 120, y: 260, radius: 18, color: '#aef5d0' },
  defenders: [],
  receivers: [],
  ball: { x: 120, y: 260, active: false, radius: 7 },
  homeStats: {
    rushYards: 0,
    passYards: 0,
    completions: 0,
    attempts: 0,
    touchdowns: 0,
    turnovers: 0,
  },
  awayStats: {
    rushYards: 0,
    passYards: 0,
    completions: 0,
    attempts: 0,
    touchdowns: 0,
    turnovers: 0,
  },
};

const homeTeamList = document.getElementById('homeTeamList');
const awayTeamList = document.getElementById('awayTeamList');
const homeScoreEl = document.getElementById('homeScore');
const awayScoreEl = document.getElementById('awayScore');
const statusTextEl = document.getElementById('statusText');
const downTextEl = document.getElementById('downText');
const fieldTextEl = document.getElementById('fieldText');
const playbookButtons = document.getElementById('playbookButtons');
const driveLogEl = document.getElementById('driveLog');
const teamStatsEl = document.getElementById('teamStats');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  w: false,
  a: false,
  s: false,
  d: false,
  space: false,
};

function getTeamById(teamId) {
  return TEAMS.find((team) => team.id === teamId) || TEAMS[0];
}

function renderTeamSelectors() {
  homeTeamList.innerHTML = '';
  awayTeamList.innerHTML = '';

  for (const team of TEAMS) {
    const card = document.createElement('button');
    card.className = `team-card ${state.selectedHome === team.id ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="meta">
        <span class="color-dot" style="background:${team.primary}"></span>
        <div>
          <div>${team.name}</div>
          <small>${team.playbook[0].name}</small>
        </div>
      </div>
    `;
    card.addEventListener('click', () => {
      state.selectedHome = team.id;
      renderTeamSelectors();
    });
    homeTeamList.appendChild(card);

    const awayCard = document.createElement('button');
    awayCard.className = `team-card ${state.selectedAway === team.id ? 'selected' : ''}`;
    awayCard.innerHTML = `
      <div class="meta">
        <span class="color-dot" style="background:${team.primary}"></span>
        <div>
          <div>${team.name}</div>
          <small>${team.playbook[1].name}</small>
        </div>
      </div>
    `;
    awayCard.addEventListener('click', () => {
      state.selectedAway = team.id;
      renderTeamSelectors();
    });
    awayTeamList.appendChild(awayCard);
  }
}

function updateHud() {
  homeScoreEl.textContent = state.homeScore;
  awayScoreEl.textContent = state.awayScore;
  statusTextEl.textContent = state.status;
  downTextEl.textContent = `${getDownLabel(state.down)} & ${state.yardsToGo}`;
  fieldTextEl.textContent = `Ball on ${state.possession === 'home' ? 'own' : 'opp'} ${state.lineOfScrimmage}`;
  renderStats();
  renderLog();
}

function getDownLabel(down) {
  if (down === 1) return '1st';
  if (down === 2) return '2nd';
  if (down === 3) return '3rd';
  return '4th';
}

function renderStats() {
  const team = getTeamById(state.possession === 'home' ? state.selectedHome : state.selectedAway);
  const stats = state.possession === 'home' ? state.homeStats : state.awayStats;
  teamStatsEl.innerHTML = `
    <div class="stat-row"><span>Team</span><strong>${team.name}</strong></div>
    <div class="stat-row"><span>Rush</span><strong>${stats.rushYards} yds</strong></div>
    <div class="stat-row"><span>Pass</span><strong>${stats.passYards} yds</strong></div>
    <div class="stat-row"><span>Completions</span><strong>${stats.completions}/${stats.attempts}</strong></div>
    <div class="stat-row"><span>TDs</span><strong>${stats.touchdowns}</strong></div>
    <div class="stat-row"><span>TOs</span><strong>${stats.turnovers}</strong></div>
  `;
}

function renderPlaybook() {
  const team = getTeamById(state.possession === 'home' ? state.selectedHome : state.selectedAway);
  playbookButtons.innerHTML = '';

  team.playbook.forEach((play) => {
    const btn = document.createElement('button');
    btn.className = 'play-btn';
    btn.innerHTML = `<strong>${play.name}</strong><small>${play.description}</small>`;
    btn.addEventListener('click', () => executePlay(play));
    playbookButtons.appendChild(btn);
  });
}

function renderLog() {
  driveLogEl.innerHTML = '';
  state.log.slice(0, 8).forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = entry;
    driveLogEl.appendChild(li);
  });
}

function logEntry(text) {
  state.log.unshift(text);
  if (state.log.length > 12) state.log.pop();
  renderLog();
}

function startGame() {
  state.screen = 'game';
  document.getElementById('menuScreen').classList.remove('active');
  document.getElementById('gameScreen').classList.add('active');
  state.possession = 'home';
  state.homeScore = 0;
  state.awayScore = 0;
  state.down = 1;
  state.yardsToGo = 10;
  state.lineOfScrimmage = 25;
  state.status = 'Drive live';
  state.log = [];
  state.homeStats = { rushYards: 0, passYards: 0, completions: 0, attempts: 0, touchdowns: 0, turnovers: 0 };
  state.awayStats = { rushYards: 0, passYards: 0, completions: 0, attempts: 0, touchdowns: 0, turnovers: 0 };
  resetDrive();
}

function backToMenu() {
  state.screen = 'menu';
  document.getElementById('gameScreen').classList.remove('active');
  document.getElementById('menuScreen').classList.add('active');
  renderTeamSelectors();
}

function resetDrive() {
  state.playInProgress = false;
  state.carrier.x = state.possession === 'home' ? 140 : 820;
  state.carrier.y = 260;
  state.ball.x = state.carrier.x;
  state.ball.y = state.carrier.y;
  state.ball.active = false;

  state.defenders = [
    { x: state.possession === 'home' ? 420 : 540, y: 136, radius: 14, color: '#ffbb90', speed: 1.8 },
    { x: state.possession === 'home' ? 440 : 520, y: 220, radius: 14, color: '#ffbb90', speed: 1.9 },
    { x: state.possession === 'home' ? 420 : 540, y: 300, radius: 14, color: '#ffbb90', speed: 1.8 },
    { x: state.possession === 'home' ? 440 : 520, y: 384, radius: 14, color: '#ffbb90', speed: 1.9 },
  ];

  state.receivers = [
    { x: state.possession === 'home' ? 320 : 640, y: 160, radius: 14, color: '#d7f0ff' },
    { x: state.possession === 'home' ? 340 : 620, y: 260, radius: 14, color: '#d7f0ff' },
    { x: state.possession === 'home' ? 320 : 640, y: 360, radius: 14, color: '#d7f0ff' },
  ];

  renderPlaybook();
  updateHud();
}

function executePlay(play) {
  if (state.playInProgress) return;
  state.playInProgress = true;
  state.status = `${play.name} called`;
  logEntry(`${play.name}: ${play.description}`);
  updateHud();

  if (play.type === 'run') {
    runPlay(play.direction);
  } else {
    passPlay(play.route);
  }
}

function runPlay(direction) {
  const isHome = state.possession === 'home';
  const directionMultiplier = direction === 'left' ? -1 : 1;
  const gainBase = 4 + Math.floor(Math.random() * 8);
  const targetX = isHome
    ? Math.min(900, state.carrier.x + 200 * directionMultiplier)
    : Math.max(60, state.carrier.x + 200 * directionMultiplier);
  const targetY = 260 + (Math.random() * 120 - 60);

  const tick = setInterval(() => {
    state.carrier.x += (targetX - state.carrier.x) * 0.18;
    state.carrier.y += (targetY - state.carrier.y) * 0.18;

    for (const defender of state.defenders) {
      const dx = state.carrier.x - defender.x;
      const dy = state.carrier.y - defender.y;
      const dist = Math.hypot(dx, dy) || 1;
      defender.x += (dx / dist) * 1.2;
      defender.y += (dy / dist) * 1.2;

      if (dist < 18) {
        clearInterval(tick);
        resolveRun(gainBase);
        return;
      }
    }

    if (Math.abs(state.carrier.x - targetX) < 8 && Math.abs(state.carrier.y - targetY) < 8) {
      clearInterval(tick);
      resolveRun(gainBase);
    }
  }, 30);
}

function resolveRun(gain) {
  const teamStats = state.possession === 'home' ? state.homeStats : state.awayStats;
  const yards = Math.max(1, gain - Math.floor(Math.random() * 3));
  const direction = state.possession === 'home' ? 1 : -1;

  state.lineOfScrimmage += yards * direction;
  state.down += 1;
  teamStats.rushYards += yards;

  state.status = `Run gain: ${yards} yards`;
  logEntry(`Run for ${yards} yards.`);

  if (state.lineOfScrimmage >= 100 || state.lineOfScrimmage <= 0) {
    scoreTouchdown();
    return;
  }

  if (state.yardsToGo <= yards) {
    state.down = 1;
    state.yardsToGo = 10;
    state.status = 'First down!';
    logEntry('First down!');
  } else {
    state.yardsToGo -= yards;
    if (state.down > 4) {
      switchPossession();
      return;
    }
  }

  state.playInProgress = false;
  resetDrive();
  updateHud();
}

function passPlay(route) {
  const isHome = state.possession === 'home';
  const target = state.receivers[Math.floor(Math.random() * state.receivers.length)];
  const start = { x: state.carrier.x, y: state.carrier.y };
  const targetPos = { x: target.x, y: target.y };

  state.ball.x = start.x;
  state.ball.y = start.y;
  state.ball.active = true;

  const tick = setInterval(() => {
    state.ball.x += (targetPos.x - state.ball.x) * 0.18;
    state.ball.y += (targetPos.y - state.ball.y) * 0.18;

    const defenderClose = state.defenders.some((d) => Math.hypot(state.ball.x - d.x, state.ball.y - d.y) < 20);
    const atTarget = Math.hypot(state.ball.x - targetPos.x, state.ball.y - targetPos.y) < 18;

    if (defenderClose && !atTarget) {
      clearInterval(tick);
      state.ball.active = false;
      const teamStats = state.possession === 'home' ? state.homeStats : state.awayStats;
      teamStats.turnovers += 1;
      state.status = 'Interception!';
      logEntry('Interception!');
      switchPossession();
      return;
    }

    if (atTarget) {
      clearInterval(tick);
      const teamStats = state.possession === 'home' ? state.homeStats : state.awayStats;
      const yards = route === 'deep' ? 16 + Math.floor(Math.random() * 18) : 7 + Math.floor(Math.random() * 10);
      const gainDirection = isHome ? 1 : -1;
      state.lineOfScrimmage += yards * gainDirection;
      state.down += 1;
      teamStats.passYards += yards;
      teamStats.completions += 1;
      teamStats.attempts += 1;
      state.ball.active = false;
      state.status = `Completed pass for ${yards} yards`;
      logEntry(`Completed pass for ${yards} yards.`);

      if (state.lineOfScrimmage >= 100 || state.lineOfScrimmage <= 0) {
        scoreTouchdown();
        return;
      }

      if (state.yardsToGo <= yards) {
        state.down = 1;
        state.yardsToGo = 10;
        state.status = 'First down on the pass';
        logEntry('First down on the pass.');
      } else {
        state.yardsToGo -= yards;
        if (state.down > 4) {
          switchPossession();
          return;
        }
      }

      state.playInProgress = false;
      resetDrive();
      updateHud();
    }

    if (state.ball.x < 0 || state.ball.x > canvas.width || state.ball.y < 0 || state.ball.y > canvas.height) {
      clearInterval(tick);
      state.ball.active = false;
      state.status = 'Incomplete pass';
      logEntry('Incomplete pass.');
      state.playInProgress = false;
      state.down += 1;
      if (state.down > 4) {
        switchPossession();
        return;
      }
      resetDrive();
      updateHud();
    }
  }, 25);
}

function switchPossession() {
  state.possession = state.possession === 'home' ? 'away' : 'home';
  state.down = 1;
  state.yardsToGo = 10;
  state.lineOfScrimmage = 25;
  state.status = `${state.possession === 'home' ? 'Home' : 'Away'} ball`;
  state.playInProgress = false;
  logEntry(`${state.possession === 'home' ? 'Home' : 'Away'} now have the ball.`);
  resetDrive();
  renderPlaybook();
  updateHud();
}

function scoreTouchdown() {
  const teamStats = state.possession === 'home' ? state.homeStats : state.awayStats;
  teamStats.touchdowns += 1;

  if (state.possession === 'home') {
    state.homeScore += 7;
    state.status = 'Touchdown!';
    logEntry('Home touchdown!');
  } else {
    state.awayScore += 7;
    state.status = 'Touchdown!';
    logEntry('Away touchdown!');
  }

  state.playInProgress = false;
  state.possession = state.possession === 'home' ? 'away' : 'home';
  state.down = 1;
  state.yardsToGo = 10;
  state.lineOfScrimmage = 25;
  resetDrive();
  updateHud();
}

function handleMovement() {
  if (state.screen !== 'game' || state.playInProgress) return;

  const moveX = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
  const moveY = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
  const sprint = keys.space ? 2.4 : 1.4;

  state.carrier.x += moveX * sprint;
  state.carrier.y += moveY * sprint;

  state.carrier.x = Math.max(70, Math.min(890, state.carrier.x));
  state.carrier.y = Math.max(80, Math.min(440, state.carrier.y));

  if (moveX !== 0 || moveY !== 0) {
    state.status = 'You are moving the ball carrier';
  }
}

function drawField() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0e7a44';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, 40, 90, 440);
  ctx.fillRect(canvas.width - 90, 40, 90, 440);

  ctx.strokeStyle = 'rgba(255,255,255,0.72)';
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

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px Segoe UI';
  ctx.fillText('HOME', 18, 28);
  ctx.fillText('AWAY', canvas.width - 80, 28);

  state.defenders.forEach((d) => {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  state.receivers.forEach((r) => {
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = state.carrier.color;
  ctx.beginPath();
  ctx.arc(state.carrier.x, state.carrier.y, state.carrier.radius, 0, Math.PI * 2);
  ctx.fill();

  if (state.ball.active) {
    ctx.fillStyle = '#f5f4d7';
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function tick() {
  handleMovement();
  drawField();
  requestAnimationFrame(tick);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'arrowup') keys.ArrowUp = true;
  if (key === 'arrowdown') keys.ArrowDown = true;
  if (key === 'arrowleft') keys.ArrowLeft = true;
  if (key === 'arrowright') keys.ArrowRight = true;
  if (key === 'w') keys.w = true;
  if (key === 'a') keys.a = true;
  if (key === 's') keys.s = true;
  if (key === 'd') keys.d = true;
  if (event.code === 'Space') keys.space = true;
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'arrowup') keys.ArrowUp = false;
  if (key === 'arrowdown') keys.ArrowDown = false;
  if (key === 'arrowleft') keys.ArrowLeft = false;
  if (key === 'arrowright') keys.ArrowRight = false;
  if (key === 'w') keys.w = false;
  if (key === 'a') keys.a = false;
  if (key === 's') keys.s = false;
  if (key === 'd') keys.d = false;
  if (event.code === 'Space') keys.space = false;
});

document.getElementById('startGameBtn').addEventListener('click', startGame);
document.getElementById('menuBtn').addEventListener('click', backToMenu);
document.getElementById('newDriveBtn').addEventListener('click', () => {
  state.status = 'New drive';
  state.log = [];
  state.down = 1;
  state.yardsToGo = 10;
  state.lineOfScrimmage = 25;
  state.playInProgress = false;
  resetDrive();
  updateHud();
});

renderTeamSelectors();
updateHud();
requestAnimationFrame(tick);
