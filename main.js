const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#f7f7f7',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 },
      debug: false
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

const game = new Phaser.Game(config);

let dino;
let cursors;
let obstacles;
let score = 0;
let scoreText;
let gameOver = false;
let groundY;
let ground;
let invisibleZones = [];
let nameInput;
let saveButton;
let leaderboardText;
let startButton;
let gameStarted = false;
let graphics;

function preload() {
  this.load.image('dino', 'https://i.imgur.com/bT1NnUz.png');
  this.load.image('ground', 'https://i.imgur.com/q3FQWbF.png');
  this.load.image('cactus', 'https://i.imgur.com/JpUq9D3.png');
}

function create() {
  groundY = config.height - 40;

  ground = this.add.tileSprite(config.width / 2, groundY + 20, config.width * 2, 40, 'ground');
  this.physics.add.existing(ground, true);

  graphics = this.add.graphics();

  dino = this.physics.add.sprite(100, groundY, 'dino');
  dino.setOrigin(0.5, 1);
  dino.setCollideWorldBounds(true);
  dino.body.allowGravity = false;

  this.physics.add.collider(dino, ground);

  cursors = this.input.keyboard.createCursorKeys();

  obstacles = this.physics.add.group();
  this.physics.add.collider(obstacles, ground);
  this.physics.add.collider(dino, obstacles, () => {
    if (!gameOver) endGame(this);
  });

  scoreText = this.add.text(16, 16, '', { fontSize: '20px', fill: '#000' });
  leaderboardText = this.add.text(16, 60, '', { fontSize: '16px', fill: '#000' });

  showStartButton(this);
  displayLeaderboard();
}

function update() {
  if (!gameStarted || gameOver) return;

  if ((cursors.space.isDown || cursors.up.isDown) && dino.body.touching.down) {
    dino.setVelocityY(-400);
  }

  if (dino.y > config.height) {
    endGame(this);
  }

  obstacles.getChildren().forEach((obstacle) => {
    if (obstacle.x < -50) {
      obstacles.remove(obstacle, true, true);
    }

    if (!obstacle.passed && obstacle.x + obstacle.displayWidth / 2 < dino.x - dino.displayWidth / 2) {
      obstacle.passed = true;
      score += 1;
      scoreText.setText('Очки: ' + score);
    }
  });

  invisibleZones.forEach(zone => {
    if (
      dino.x > zone.x &&
      dino.x < zone.x + zone.width &&
      dino.body.touching.down
    ) {
      endGame(this);
    }
  });
}

function addObstacle() {
  const sizeFactor = Phaser.Math.RND.pick([1, 2, 3]);
  const scale = 0.5 * sizeFactor;

  const cactus = obstacles.create(config.width + 50, 0, 'cactus');
  cactus.setScale(scale);
  cactus.setOrigin(0.5, 1);
  cactus.setVelocityX(-400);
  cactus.setImmovable(true);
  cactus.body.allowGravity = false;
  cactus.y = groundY;
  cactus.passed = false;
}

function addPit() {
  const pitWidth = Phaser.Math.Between(100, 200);
  const pitX = config.width + 50;

  invisibleZones.push({ x: pitX, width: pitWidth });

  // малюємо яму червоним кольором
  graphics.fillStyle(0xff0000, 1);
  graphics.fillRect(pitX, groundY + 20, pitWidth, 40);
}

function scheduleNextObstacle(scene) {
  const delay = Phaser.Math.Between(500, 1000);
  scene.time.delayedCall(delay, () => {
    if (!gameOver && gameStarted) {
      const isPit = Phaser.Math.Between(0, 1) === 0;
      if (isPit) {
        addPit();
      } else {
        addObstacle();
      }
      scheduleNextObstacle(scene);
    }
  });
}

function showStartButton(scene) {
  startButton = document.createElement('button');
  startButton.innerText = 'Почати гру';
  startButton.style.position = 'absolute';
  startButton.style.top = '100px';
  startButton.style.left = '50%';
  startButton.style.transform = 'translateX(-50%)';
  startButton.style.fontSize = '20px';
  startButton.style.padding = '10px 20px';
  document.body.appendChild(startButton);

  startButton.onclick = () => {
    document.body.removeChild(startButton);
    startGame(scene);
  };
}

function startGame(scene) {
  gameStarted = true;
  gameOver = false;
  score = 0;
  scoreText.setText('Очки: 0');
  dino.setTint(0xffffff);
  dino.body.allowGravity = true;
  dino.setVelocity(0, 0);
  dino.y = groundY;
  dino.x = 100;

  obstacles.clear(true, true);
  invisibleZones = [];
  graphics.clear();

  scene.physics.resume();
  scheduleNextObstacle(scene);
}

function endGame(scene) {
  gameOver = true;
  scene.physics.pause();
  dino.setTint(0xff0000);
  showNameInput(scene);
}

function showNameInput(scene) {
  nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Введіть імʼя';
  nameInput.maxLength = 12;
  nameInput.style.position = 'absolute';
  nameInput.style.top = '100px';
  nameInput.style.left = '50%';
  nameInput.style.transform = 'translateX(-50%)';
  nameInput.style.fontSize = '20px';
  nameInput.style.padding = '5px';
  document.body.appendChild(nameInput);

  saveButton = document.createElement('button');
  saveButton.innerText = 'Зберегти результат';
  saveButton.style.position = 'absolute';
  saveButton.style.top = '140px';
  saveButton.style.left = '50%';
  saveButton.style.transform = 'translateX(-50%)';
  saveButton.style.fontSize = '18px';
  saveButton.style.padding = '5px 10px';
  document.body.appendChild(saveButton);

  saveButton.onclick = () => {
    const playerName = nameInput.value.trim() || 'Без імені';
    saveScore(playerName, score);
    document.body.removeChild(nameInput);
    document.body.removeChild(saveButton);
    displayLeaderboard();
    showStartButton(scene);
  };
}

function saveScore(name, score) {
  const leaderboard = JSON.parse(localStorage.getItem('dinoLeaderboard')) || [];
  leaderboard.push({ name, score });
  leaderboard.sort((a, b) => b.score - a.score);
  const top10 = leaderboard.slice(0, 10);
  localStorage.setItem('dinoLeaderboard', JSON.stringify(top10));
}

function displayLeaderboard() {
  const leaderboard = JSON.parse(localStorage.getItem('dinoLeaderboard')) || [];
  let text = 'Турнірна таблиця:\n';
  leaderboard.forEach((entry, index) => {
    text += `${index + 1}. ${entry.name} — ${entry.score}\n`;
  });
  leaderboardText.setText(text);
}
