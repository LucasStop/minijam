let bird;
let pipes = [];
let gameState = "MENU";
let score = 0;
let highScore = 0;
let lastPipeTime = 0;
let pipeInterval = 1500;
let birdImg;
let lives = 2;

let tubesPassed = 0;
let baseGapSize = 150;
let minGapSize = 150;
let lifeGainMessage = "";
let lifeGainTime = 0;

let wingSound, pointSound, deathSound, retryDeathSound;
let soundsLoaded = false;
let currentlyPlayingSound = null;

let pauseStartTime = 0;
let pauseDuration = 4000;

class MockSound {
  constructor() {}
  play() {}
  setVolume() {}
  stop() {}
}

function playSoundSafely(sound) {
  if (!soundsLoaded) return;

  try {
    stopAllSounds();
    sound.play();
    currentlyPlayingSound = sound;
  } catch (e) {
    console.log("Erro ao tocar som:", e);
  }
}

function stopAllSounds() {
  if (!soundsLoaded) return;

  try {
    wingSound.stop();
    pointSound.stop();
    deathSound.stop();
    retryDeathSound.stop();
    currentlyPlayingSound = null;
  } catch (e) {
    console.log("Erro ao interromper sons:", e);
  }
}

function preload() {
  try {
    birdImg = loadImage("bird.png");
  } catch (e) {
    console.log("Erro ao carregar imagem:", e);
    birdImg = createImage(40, 40);
    birdImg.loadPixels();
    for (let i = 0; i < birdImg.width; i++) {
      for (let j = 0; j < birdImg.height; j++) {
        birdImg.set(i, j, color(255, 255, 0));
      }
    }
    birdImg.updatePixels();
  }

  wingSound = new MockSound();
  pointSound = new MockSound();
  deathSound = new MockSound();
  retryDeathSound = new MockSound();

  loadSounds();
}

function loadSounds() {
  try {
    soundFormats("mp3", "ogg");

    wingSound = loadSound(
      "sounds/wing.mp3",
      () => console.log("Som de asa carregado"),
      (err) => console.log("Erro ao carregar som de asa:", err)
    );

    pointSound = loadSound(
      "sounds/point.mp3",
      () => console.log("Som de ponto carregado"),
      (err) => console.log("Erro ao carregar som de ponto:", err)
    );

    deathSound = loadSound(
      "sounds/death.mp3",
      () => console.log("Som de morte carregado"),
      (err) => console.log("Erro ao carregar som de morte:", err)
    );

    retryDeathSound = loadSound(
      "sounds/retry_death.mp3",
      () => console.log("Som de retry carregado"),
      (err) => console.log("Erro ao carregar som de retry:", err)
    );

    soundsLoaded = true;
    console.log("Sons carregados com sucesso");
  } catch (e) {
    console.log("Falha ao inicializar sons:", e);
    soundsLoaded = false;
  }
}

class Bird {
  constructor() {
    this.x = width * 0.2;
    this.y = height / 2;
    this.size = 40;
    this.velocity = 0;
    this.gravity = 0.4;
    this.jumpForce = -8;
  }

  update() {
    this.velocity += this.gravity;
    this.y += this.velocity;

    if (this.y > height - this.size / 2) {
      this.y = height - this.size / 2;
      return true;
    }
    if (this.y < this.size / 2) {
      this.y = this.size / 2;
      this.velocity = 0;
    }
    return false;
  }

  jump() {
    this.velocity = this.jumpForce;
    if (soundsLoaded) {
      playSoundSafely(wingSound);
    }
  }

  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.velocity * 0.05);
    imageMode(CENTER);
    image(birdImg, 0, 0, this.size, this.size);
    pop();
  }

  checkCollision(pipe) {
    let halfSize = this.size / 2;
    if (this.x + halfSize > pipe.x && this.x - halfSize < pipe.x + pipe.width) {
      if (
        this.y - halfSize < pipe.topHeight ||
        this.y + halfSize > pipe.topHeight + pipe.gap
      ) {
        return true;
      }
    }
    return false;
  }
}

class Pipe {
  constructor() {
    this.width = 80;

    let reductionAmount = Math.floor(score / 10) * 5;
    this.gap = Math.max(baseGapSize - reductionAmount, minGapSize);

    this.x = width;
    this.topHeight = random(50, height - this.gap - 50);
    this.speed = 4;
    this.scored = false;
  }

  update() {
    this.x -= this.speed;
    return this.x + this.width < 0;
  }

  draw() {
    fill(50, 200, 50);
    stroke(40, 150, 40);
    strokeWeight(2);

    rect(this.x, 0, this.width, this.topHeight);
    rect(this.x - 5, this.topHeight - 20, this.width + 10, 20);

    let bottomY = this.topHeight + this.gap;
    rect(this.x, bottomY, this.width, height - bottomY);
    rect(this.x - 5, bottomY, this.width + 10, 20);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  bird = new Bird();
  if (localStorage.getItem("flappyHighScore")) {
    highScore = parseInt(localStorage.getItem("flappyHighScore"));
  }

  if (soundsLoaded) {
    try {
      wingSound.setVolume(0.5);
      pointSound.setVolume(0.5);
      deathSound.setVolume(0.7);
      retryDeathSound.setVolume(0.7);
    } catch (e) {
      console.log("Erro ao configurar volume:", e);
      soundsLoaded = false;
    }
  }

  lives = 2;
}

function draw() {
  background(135, 206, 235);

  switch (gameState) {
    case "MENU":
      drawMenu();
      break;
    case "PLAYING":
      drawGame();
      break;
    case "PAUSE_AFTER_DEATH":
      drawPauseAfterDeath();
      checkPauseEnd();
      break;
    case "GAMEOVER":
      drawGameOver();
      break;
  }
}

function drawMenu() {
  textAlign(CENTER, CENTER);
  textSize(50);

  fill(0, 100);
  text("FLAPPY BIRD", width / 2 + 4, height * 0.3 + 4);

  fill(255);
  stroke(0);
  strokeWeight(4);
  text("FLAPPY BIRD", width / 2, height * 0.3);

  let btnWidth = 250;
  let btnHeight = 70;
  let x = width / 2;
  let y = height * 0.5;

  let hover = isButtonClicked(x, y, btnWidth, btnHeight);

  noStroke();
  fill(0, 100);
  rect(x - btnWidth / 2 + 5, y - btnHeight / 2 + 5, btnWidth, btnHeight, 15);

  fill(hover ? color(100, 200, 255) : color(70, 170, 225));
  stroke(0);
  strokeWeight(hover ? 4 : 2);
  rect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 15);

  fill(255);
  noStroke();
  textSize(hover ? 32 : 30);
  text("COMEÇAR", x, y);

  textSize(16);
  fill(255);
  noStroke();
  text("Pressione ESPAÇO ou CLIQUE para pular", width / 2, height * 0.7);
}

function drawGame() {
  drawBackground();

  if (millis() - lastPipeTime > pipeInterval) {
    pipes.push(new Pipe());
    lastPipeTime = millis();
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    pipes[i].draw();
    if (pipes[i].update()) {
      pipes.splice(i, 1);
      continue;
    }

    if (bird.checkCollision(pipes[i])) {
      handleCollision();
      return;
    }

    if (!pipes[i].scored && pipes[i].x + pipes[i].width < bird.x) {
      score++;
      tubesPassed++;

      if (tubesPassed % 10 === 0) {
        lives++;
        lifeGainMessage = "+1 VIDA!";
        lifeGainTime = millis();

        if (soundsLoaded) {
          playSoundSafely(pointSound);
        }
      } else {
        if (soundsLoaded) {
          playSoundSafely(pointSound);
        }
      }

      pipes[i].scored = true;
    }
  }

  if (bird.update()) {
    handleCollision();
    return;
  }
  bird.draw();

  drawHUD();
}

function drawHUD() {
  textSize(32);
  textAlign(CENTER, TOP);
  fill(255);
  stroke(0);
  strokeWeight(4);
  text(score, width / 2, 20);

  textAlign(LEFT, TOP);
  text("Vidas: " + lives, 20, 20);

  if (millis() - lifeGainTime < 2000 && lifeGainMessage !== "") {
    textAlign(CENTER, CENTER);
    textSize(36);
    fill(255, 255, 0);
    stroke(0);
    strokeWeight(5);
    text(lifeGainMessage, width / 2, height / 2 - 100);
  }
}

function drawBackground() {
  background(135, 206, 235);

  fill(255);
  noStroke();
  ellipse(width * 0.2, height * 0.2, 80, 50);
  ellipse(width * 0.23, height * 0.18, 70, 40);
  ellipse(width * 0.17, height * 0.17, 60, 45);

  ellipse(width * 0.8, height * 0.3, 90, 60);
  ellipse(width * 0.83, height * 0.27, 80, 50);
  ellipse(width * 0.77, height * 0.25, 70, 40);

  fill(126, 200, 80);
  rect(0, height - 50, width, 50);

  fill(106, 170, 70);
  for (let i = 0; i < width; i += 30) {
    rect(i, height - 50, 15, 10);
  }
}

function handleCollision() {
  if (lives > 0) {
    lives--;

    if (soundsLoaded) {
      playSoundSafely(retryDeathSound);
    }

    gameState = "PAUSE_AFTER_DEATH";
    pauseStartTime = millis();

    bird.y = height / 2;
    bird.velocity = 0;

    createSafeZone();
  } else {
    if (soundsLoaded) {
      playSoundSafely(deathSound);
    }
    gameOver();
  }
}

function createSafeZone() {
  let safeDistance = width * 0.4;

  pipes = pipes.filter((pipe) => {
    return pipe.x > bird.x + safeDistance || pipe.x + pipe.width < bird.x - 50;
  });

  lastPipeTime = millis();
}

function drawPauseAfterDeath() {
  drawBackground();
  pipes.forEach((pipe) => pipe.draw());
  bird.draw();

  fill(0, 120);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  fill(255);
  stroke(0);
  strokeWeight(4);
  textSize(40);
  text("VIDA PERDIDA!", width / 2, height / 2 - 50);

  textSize(24);
  strokeWeight(3);
  text(
    "Continuando em " +
      Math.ceil((pauseDuration - (millis() - pauseStartTime)) / 1000) +
      "...",
    width / 2,
    height / 2 + 30
  );

  textSize(30);
  text("Pontuação: " + score, width / 2, height / 2 + 100);

  text("Vidas restantes: " + lives, width / 2, height / 2 + 150);
}

function checkPauseEnd() {
  if (millis() - pauseStartTime >= pauseDuration) {
    gameState = "PLAYING";
  }
}

function gameOver() {
  gameState = "GAMEOVER";
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("flappyHighScore", highScore);
  }
}

function drawGameOver() {
  drawBackground();

  fill(0, 150);
  rect(0, 0, width, height);

  let panelWidth = 300;
  let panelHeight = 400;
  let panelX = width / 2 - panelWidth / 2;
  let panelY = height / 2 - panelHeight / 2;

  fill(0, 100);
  rect(panelX + 5, panelY + 5, panelWidth, panelHeight, 20);

  fill(70, 170, 225);
  stroke(255);
  strokeWeight(3);
  rect(panelX, panelY, panelWidth, panelHeight, 20);

  textAlign(CENTER, CENTER);
  fill(255);
  stroke(0);
  strokeWeight(4);

  textSize(40);
  text("GAME OVER", width / 2, panelY + 80);

  textSize(30);
  text("Pontuação: " + score, width / 2, panelY + 150);
  text("Recorde: " + highScore, width / 2, panelY + 200);

  let btnWidth = 220;
  let btnHeight = 60;
  let btnY = panelY + 280;

  let hover = isButtonClicked(width / 2, btnY, btnWidth, btnHeight);

  noStroke();
  fill(0, 100);
  rect(
    width / 2 - btnWidth / 2 + 4,
    btnY - btnHeight / 2 + 4,
    btnWidth,
    btnHeight,
    15
  );

  fill(hover ? color(255, 200, 0) : color(255, 170, 0));
  stroke(0);
  strokeWeight(hover ? 4 : 2);
  rect(width / 2 - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 15);

  fill(255);
  noStroke();
  textSize(hover ? 28 : 26);
  text("RECOMEÇAR", width / 2, btnY);
}

function drawButton(text, x, y) {
  let btnWidth = 200;
  let btnHeight = 50;
  let hover =
    mouseX > x - btnWidth / 2 &&
    mouseX < x + btnWidth / 2 &&
    mouseY > y - btnHeight / 2 &&
    mouseY < y + btnHeight / 2;

  noStroke();
  fill(0, 100);
  rect(x - btnWidth / 2 + 5, y - btnHeight / 2 + 5, btnWidth, btnHeight, 10);

  fill(hover ? color(100, 200, 255) : color(70, 170, 225));
  stroke(0);
  strokeWeight(hover ? 4 : 2);
  rect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);

  if (hover) {
    fill(0);
    noStroke();
    textSize(22);
    text(text, x, y + 2);
  }
  fill(255);
  noStroke();
  textSize(20);
  textAlign(CENTER, CENTER);
  text(text, x, y);
}

function mousePressed() {
  if (gameState === "PLAYING") {
    bird.jump();
    return;
  }

  if (gameState === "MENU") {
    let btnY = height * 0.5;
    if (isButtonClicked(width / 2, btnY, 250, 70)) {
      startGame();
      return;
    }
  }

  if (gameState === "GAMEOVER") {
    let panelHeight = 400;
    let panelY = height / 2 - panelHeight / 2;
    let btnY = panelY + 280;

    if (isButtonClicked(width / 2, btnY, 220, 60)) {
      startGame();
      return;
    }
  }
}

function isButtonClicked(x, y, width, height) {
  return (
    mouseX > x - width / 2 &&
    mouseX < x + width / 2 &&
    mouseY > y - height / 2 &&
    mouseY < y + height / 2
  );
}

function keyPressed() {
  if (keyCode === 32 && gameState === "PLAYING") {
    bird.jump();
  }
}

function startGame() {
  gameState = "PLAYING";
  score = 0;
  tubesPassed = 0;
  lives = 2;
  pipes = [];
  bird = new Bird();
  lastPipeTime = millis();
  pipeInterval = 1800;
  lifeGainMessage = "";
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
