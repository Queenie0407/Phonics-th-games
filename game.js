"use strict";

const LEVELS = {
  1: { grid: 3, count: [1, 2], visible: 7000, time: 90, target: "unvoiced", label: "第一關 · UNVOICED /θ/ · 3×3" },
  2: { grid: 4, count: [2, 4], visible: 6500, time: 95, target: "voiced", label: "第二關 · VOICED /ð/ · 4×4" },
  3: { grid: 5, count: [3, 5], visible: 6000, time: 100, target: "mixed", label: "第三關 · MIXED TH · 5×5" }
};

const WORDS = [
  { word: "think", type: "unvoiced", ipa: "/θɪŋk/" },
  { word: "three", type: "unvoiced", ipa: "/θriː/" },
  { word: "thumb", type: "unvoiced", ipa: "/θʌm/" },
  { word: "thin", type: "unvoiced", ipa: "/θɪn/" },
  { word: "thick", type: "unvoiced", ipa: "/θɪk/" },
  { word: "teeth", type: "unvoiced", ipa: "/tiːθ/" },
  { word: "tooth", type: "unvoiced", ipa: "/tuːθ/" },
  { word: "bath", type: "unvoiced", ipa: "/bæθ/" },
  { word: "birthday", type: "unvoiced", ipa: "/ˈbɜːrθdeɪ/" },
  { word: "healthy", type: "unvoiced", ipa: "/ˈhelθi/" },
  { word: "this", type: "voiced", ipa: "/ðɪs/" },
  { word: "that", type: "voiced", ipa: "/ðæt/" },
  { word: "these", type: "voiced", ipa: "/ðiːz/" },
  { word: "those", type: "voiced", ipa: "/ðoʊz/" },
  { word: "they", type: "voiced", ipa: "/ðeɪ/" },
  { word: "them", type: "voiced", ipa: "/ðem/" },
  { word: "mother", type: "voiced", ipa: "/ˈmʌðər/" },
  { word: "father", type: "voiced", ipa: "/ˈfɑːðər/" },
  { word: "weather", type: "voiced", ipa: "/ˈweðər/" },
  { word: "together", type: "voiced", ipa: "/təˈɡeðər/" },
  { word: "breathe", type: "voiced", ipa: "/briːð/" },
  { word: "smooth", type: "voiced", ipa: "/smuːð/" }
];

const TUTORIAL = [
  `<p><strong>TH 有兩種聲音。</strong>嘴形很像，但喉嚨的感覺不一樣。</p>
   <div class="phoneme-demo"><div class="phoneme-card voiced"><b>/ð/</b>VOICED<br>this · mother</div><div class="phoneme-card unvoiced"><b>/θ/</b>UNVOICED<br>think · three</div></div>`,
  `<p>說 <strong>this</strong> 時，把手放在喉嚨上，會感覺到振動，這就是 <strong>voiced /ð/</strong>。</p>
   <p>說 <strong>think</strong> 時，舌尖輕放在牙齒間，讓氣流通過，但喉嚨不振動，這就是 <strong>unvoiced /θ/</strong>。</p>`,
  `<p>第一關只練習找 <strong>unvoiced /θ/</strong>，第二關只練習找 <strong>voiced /ð/</strong>，第三關才會把兩種聲音混合。</p>
   <p>敲下拿著正確單字牌的刺蝟。答對一題得一分；答錯會少一顆愛心。按單字旁的喇叭可聽發音，該輪第一次聆聽會增加 3 秒。<strong>時間內答對 10 題就過關！</strong></p>`
];

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const screens = $$(".screen");
const state = {
  unlocked: Number(localStorage.getItem("th-hunt-unlocked")) || 1,
  stars: JSON.parse(localStorage.getItem("th-hunt-stars") || "{}"),
  tutorialSeen: localStorage.getItem("th-hunt-tutorial") === "yes",
  level: 1,
  lives: 5,
  score: 0,
  time: 80,
  target: "unvoiced",
  running: false,
  paused: false,
  muted: false,
  musicMuted: localStorage.getItem("th-hunt-music-muted") === "yes",
  roundLocked: false,
  roundTimer: null,
  roundDeadline: 0,
  roundExtended: false,
  lastPointerAction: 0,
  clockTimer: null,
  feedbackTimer: null,
  tutorialStep: 0
};

const audio = {
  music: new Audio("sound/background-music.mp3"),
  click: new Audio("sound/ui-click.mp3"),
  pop: new Audio("sound/hedgehog-pop.mp3"),
  retreat: new Audio("sound/hedgehog-retreat.mp3"),
  swing: new Audio("sound/hammer-swing.mp3"),
  hit: new Audio("sound/hammer-hit.mp3"),
  correct: new Audio("sound/correct.mp3"),
  wrong: new Audio("sound/wrong.mp3"),
  startled: new Audio("sound/hedgehog-startled.mp3"),
  levelUp: new Audio("sound/level-up.mp3"),
  cheer: new Audio("sound/cheer.mp3"),
  promptVoiced: new Audio("sound/prompts/voiced.mp3"),
  promptUnvoiced: new Audio("sound/prompts/unvoiced.mp3")
};

const wordAudio = new Map(WORDS.map(item => {
  const clip = new Audio(`sound/words/${item.word}.mp3`);
  clip.preload = "auto";
  clip.volume = .9;
  return [item.word, clip];
}));

audio.music.loop = true;
audio.music.volume = .12;
audio.click.volume = .34;
audio.pop.volume = .28;
audio.retreat.volume = .2;
audio.swing.volume = .42;
audio.hit.volume = .48;
audio.correct.volume = .44;
audio.wrong.volume = .38;
audio.startled.volume = .3;
audio.levelUp.volume = .5;
audio.cheer.volume = .35;
audio.promptVoiced.volume = .9;
audio.promptUnvoiced.volume = .9;

function playTeachingClip(clip) {
  if (state.muted || !clip) return;
  clip.pause();
  clip.currentTime = 0;
  const normalVolume = state.paused ? .04 : .12;
  if (!state.musicMuted) audio.music.volume = .035;
  const restoreMusic = () => { if (!state.musicMuted) audio.music.volume = normalVolume; };
  clip.addEventListener("ended", restoreMusic, { once: true });
  clip.play().catch(restoreMusic);
}

function ensureMusic() {
  if (state.musicMuted) return;
  audio.music.play().catch(() => {});
}

function playSfx(name, delay = 0) {
  if (state.muted || !audio[name]) return;
  setTimeout(() => {
    if (state.muted) return;
    const sound = audio[name];
    sound.pause();
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }, delay);
}

function showScreen(id) {
  screens.forEach(screen => screen.classList.toggle("is-active", screen.id === id));
}

function openModal(id) {
  const modal = $(id);
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(id) {
  const modal = $(id);
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function updateMap() {
  $$(".level-node").forEach(node => {
    const level = Number(node.dataset.level);
    const locked = level > state.unlocked;
    node.classList.toggle("locked", locked);
    node.disabled = locked;
    node.querySelector(".node-stars").textContent = state.stars[level] ? "★".repeat(state.stars[level]) : "";
  });
}

function goToMap(showTutorial = false) {
  stopGame();
  closeModal("#result-modal");
  closeModal("#pause-modal");
  updateMap();
  showScreen("map-screen");
  if (showTutorial || !state.tutorialSeen) startTutorial();
}

function startTutorial() {
  state.tutorialStep = 0;
  renderTutorial();
  openModal("#tutorial-modal");
}

function renderTutorial() {
  $("#tutorial-copy").innerHTML = TUTORIAL[state.tutorialStep];
  $$(".tutorial-progress span").forEach((dot, index) => dot.classList.toggle("active", index === state.tutorialStep));
  $("#tutorial-next").textContent = state.tutorialStep === TUTORIAL.length - 1 ? "開始第一關" : "下一步";
}

function finishTutorial(startLevel = false) {
  state.tutorialSeen = true;
  localStorage.setItem("th-hunt-tutorial", "yes");
  closeModal("#tutorial-modal");
  if (startLevel) startLevelGame(1);
}

function startLevelGame(level) {
  const config = LEVELS[level];
  state.level = level;
  state.lives = 5;
  state.score = 0;
  state.time = config.time;
  state.running = true;
  state.paused = false;
  state.roundLocked = false;
  clearTimeout(state.roundTimer);
  clearInterval(state.clockTimer);
  closeModal("#result-modal");
  closeModal("#pause-modal");
  showScreen("game-screen");
  buildGrid();
  updateHud();
  nextRound(500);
  state.clockTimer = setInterval(() => {
    if (!state.running || state.paused) return;
    state.time -= 1;
    $("#timer").textContent = state.time;
    if (state.time <= 0) endLevel(false, "時間到囉！再聽一次聲音，下一次一定可以。 ");
  }, 1000);
}

function buildGrid() {
  const config = LEVELS[state.level];
  const grid = $("#hole-grid");
  grid.style.setProperty("--grid", config.grid);
  grid.innerHTML = "";
  grid.onpointerdown = handleGridAction;
  grid.onclick = handleGridAction;
  for (let i = 0; i < config.grid ** 2; i += 1) {
    const hole = document.createElement("div");
    hole.className = "hole";
    hole.setAttribute("role", "button");
    hole.tabIndex = 0;
    hole.setAttribute("aria-label", `第 ${i + 1} 個洞口，沒有刺蝟`);
    hole.innerHTML = `<span class="hedgehog-wrap"><img class="hedgehog-img" src="assets/hedgehog-normal.png" alt=""><span class="word-card"></span><span class="word-audio" role="button" tabindex="-1" aria-label="聆聽單字">🔊</span><span class="impact-burst">★ ✦</span></span>`;
    hole.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (event.target.closest(".word-audio")) listenToWord(hole);
      else if (event.target === hole) {
        const rect = hole.getBoundingClientRect();
        hitHole(hole, { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
      }
    });
    grid.appendChild(hole);
  }
  $("#level-title").textContent = config.label;
}

function activeHoleAtPoint(event) {
  const direct = event.target.closest?.(".hole.active");
  if (direct) return direct;
  const candidates = $$(".hole.active").filter(hole => {
    const rect = hole.querySelector(".hedgehog-wrap").getBoundingClientRect();
    const padding = 14;
    return event.clientX >= rect.left - padding && event.clientX <= rect.right + padding
      && event.clientY >= rect.top - padding && event.clientY <= rect.bottom + padding;
  });
  if (!candidates.length) return null;
  return candidates.sort((a, b) => {
    const ar = a.querySelector(".hedgehog-wrap").getBoundingClientRect();
    const br = b.querySelector(".hedgehog-wrap").getBoundingClientRect();
    const ad = Math.hypot(event.clientX - (ar.left + ar.width / 2), event.clientY - (ar.top + ar.height / 2));
    const bd = Math.hypot(event.clientX - (br.left + br.width / 2), event.clientY - (br.top + br.height / 2));
    return ad - bd;
  })[0];
}

function handleGridAction(event) {
  if (event.type === "click" && performance.now() - state.lastPointerAction < 550) return;
  const listenButton = event.target.closest?.(".word-audio");
  const hole = listenButton?.closest(".hole.active") || activeHoleAtPoint(event);
  if (!hole) return;
  if (event.cancelable) event.preventDefault();
  if (event.type === "pointerdown") state.lastPointerAction = performance.now();
  if (listenButton) listenToWord(hole);
  else hitHole(hole, event);
}

function sample(array) { return array[Math.floor(Math.random() * array.length)]; }
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function nextRound(delay = 380) {
  clearTimeout(state.roundTimer);
  clearFeedback();
  state.roundLocked = true;
  retireAll();
  state.roundTimer = setTimeout(() => {
    if (!state.running) return;
    if (state.paused) { nextRound(250); return; }
    spawnRound();
  }, delay);
}

function retireAll() {
  const hadActiveHedgehogs = $$(".hole.active").length > 0;
  $$(".hole").forEach(hole => {
    hole.classList.remove("active", "hit", "correct");
    hole.classList.add("retreating");
    hole.dataset.word = "";
    hole.dataset.type = "";
    hole.setAttribute("aria-label", "空洞口");
    const listen = hole.querySelector(".word-audio");
    listen.tabIndex = -1;
    listen.classList.remove("extended");
    setTimeout(() => hole.classList.remove("retreating"), 260);
  });
  if (hadActiveHedgehogs && state.running) playSfx("retreat");
}

function spawnRound() {
  const config = LEVELS[state.level];
  state.target = config.target === "mixed"
    ? (Math.random() < .5 ? "voiced" : "unvoiced")
    : config.target;
  const minCount = config.count[0];
  const maxCount = config.count[1];
  const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
  const holes = shuffle($$(".hole").slice()).slice(0, count);
  const correctPool = WORDS.filter(item => item.type === state.target);
  const wrongPool = WORDS.filter(item => item.type !== state.target);
  const entries = [sample(correctPool)];
  while (entries.length < count) {
    const preferWrong = entries.filter(item => item.type !== state.target).length < Math.ceil(count / 2);
    const candidate = sample(preferWrong ? wrongPool : WORDS);
    if (!entries.some(item => item.word === candidate.word)) entries.push(candidate);
  }
  shuffle(entries);
  holes.forEach((hole, index) => activateHole(hole, entries[index]));
  playSfx("pop");
  updateTarget();
  state.roundExtended = false;
  state.roundLocked = false;
  scheduleRoundExpiry(config.visible);
}

function scheduleRoundExpiry(delay) {
  clearTimeout(state.roundTimer);
  state.roundDeadline = performance.now() + delay;
  state.roundTimer = setTimeout(() => {
    if (state.running && !state.paused && !state.roundLocked) nextRound(180);
    else if (state.running && state.paused) nextRound(250);
  }, delay);
}

function activateHole(hole, entry) {
  hole.dataset.word = entry.word;
  hole.dataset.type = entry.type;
  hole.querySelector(".word-card").textContent = entry.word;
  hole.querySelector(".hedgehog-img").src = "assets/hedgehog-normal.png";
  const listen = hole.querySelector(".word-audio");
  listen.tabIndex = 0;
  listen.setAttribute("aria-label", `Hear ${entry.word}｜聆聽 ${entry.word}`);
  hole.setAttribute("aria-label", `${entry.word}，點擊選擇`);
  requestAnimationFrame(() => hole.classList.add("active"));
}

function listenToWord(hole) {
  const word = hole.dataset.word;
  if (!word || !state.running || state.paused || state.roundLocked || !hole.classList.contains("active")) return;
  playTeachingClip(wordAudio.get(word));
  const listen = hole.querySelector(".word-audio");
  listen.classList.remove("extended");
  void listen.offsetWidth;
  listen.classList.add("extended");
  if (!state.roundExtended) {
    state.roundExtended = true;
    const remaining = Math.max(0, state.roundDeadline - performance.now()) + 3000;
    scheduleRoundExpiry(remaining);
    showFeedback(`🔊 ${word} · +3 秒`, true);
  } else showFeedback(`🔊 ${word}`, true);
}

function updateTarget() {
  const badge = $("#target-badge");
  const isVoiced = state.target === "voiced";
  badge.className = `target-badge ${state.target}`;
  badge.textContent = isVoiced ? "VOICED /ð/" : "UNVOICED /θ/";
  $("#speak-button").className = `speak-button ${state.target}`;
  $("#speak-button").setAttribute("aria-label", isVoiced ? "Hear the voiced TH sound｜聆聽 voiced TH" : "Hear the unvoiced TH sound｜聆聽 unvoiced TH");
}

function hitHole(hole, event) {
  animateHammer(event.clientX, event.clientY);
  playSfx("swing");
  if (!state.running || state.paused || state.roundLocked || !hole.classList.contains("active")) return;
  state.roundLocked = true;
  clearTimeout(state.roundTimer);
  const word = hole.dataset.word;
  const correct = hole.dataset.type === state.target;
  if (correct) {
    state.score += 1;
    hole.classList.add("correct", "hit");
    hole.querySelector(".hedgehog-img").src = "assets/hedgehog-hit.png";
    playSfx("hit", 55);
    playSfx("correct", 135);
    showFeedback(`答對了！${word} · ${WORDS.find(item => item.word === word).ipa}`, true);
    setTimeout(() => playTeachingClip(wordAudio.get(word)), 360);
    if (state.score >= 10) {
      updateHud();
      setTimeout(() => endLevel(true), 620);
      return;
    }
  } else {
    state.lives -= 1;
    hole.classList.add("hit");
    hole.querySelector(".hedgehog-img").src = "assets/hedgehog-hit.png";
    playSfx("hit", 55);
    playSfx("startled", 120);
    playSfx("wrong", 260);
    const correctName = state.target === "voiced" ? "voiced /ð/" : "unvoiced /θ/";
    showFeedback(`${word} 不是 ${correctName}，再試一次！`, false);
    if (state.lives <= 0) {
      updateHud();
      setTimeout(() => endLevel(false, "愛心用完了。回到地圖休息一下，再來挑戰！"), 700);
      return;
    }
  }
  updateHud();
  state.roundTimer = setTimeout(() => nextRound(180), correct ? 460 : 620);
}

function showFeedback(message, good) {
  clearTimeout(state.feedbackTimer);
  const feedback = $("#feedback");
  feedback.textContent = message;
  feedback.className = `feedback show ${good ? "good" : "bad"}`;
  state.feedbackTimer = setTimeout(clearFeedback, 1000);
}
function clearFeedback() { $("#feedback").className = "feedback"; }

function updateHud() {
  $("#score").textContent = `${state.score}/10`;
  $("#timer").textContent = state.time;
  $("#hearts").innerHTML = Array.from({ length: 5 }, (_, i) => `<span class="heart ${i >= state.lives ? "lost" : ""}" aria-hidden="true">♥</span>`).join("");
  $("#hearts").setAttribute("aria-label", `剩餘 ${state.lives} 滴血`);
}

function endLevel(won, message = "你成功分辨了 voiced 和 unvoiced TH！") {
  if (!state.running) return;
  stopGame();
  const stars = won ? (state.lives >= 5 && state.time >= 35 ? 3 : state.lives >= 3 ? 2 : 1) : 0;
  if (won) {
    state.unlocked = Math.max(state.unlocked, Math.min(3, state.level + 1));
    state.stars[state.level] = Math.max(state.stars[state.level] || 0, stars);
    localStorage.setItem("th-hunt-unlocked", state.unlocked);
    localStorage.setItem("th-hunt-stars", JSON.stringify(state.stars));
    playSfx("levelUp");
    playSfx("cheer", 430);
  }
  $("#result-kicker").textContent = won ? "LEVEL COMPLETE" : "TRY AGAIN";
  $("#result-title").textContent = won ? "太棒了！" : "差一點點！";
  $("#result-copy").textContent = won ? `${message} 還剩 ${state.time} 秒、${state.lives} 顆愛心。` : message;
  $("#result-stars").textContent = won ? "★".repeat(stars) + "☆".repeat(3 - stars) : "♡ ♡ ♡";
  $("#result-mascot").src = won ? "assets/hedgehog-normal.png" : "assets/hedgehog-hit.png";
  openModal("#result-modal");
}

function stopGame() {
  state.running = false;
  state.paused = false;
  clearTimeout(state.roundTimer);
  clearInterval(state.clockTimer);
  retireAll();
}

function togglePause(forceResume = false) {
  if (!state.running) return;
  state.paused = forceResume ? false : !state.paused;
  if (state.paused) {
    audio.music.volume = .04;
    openModal("#pause-modal");
  }
  else {
    audio.music.volume = .12;
    closeModal("#pause-modal");
    nextRound(250);
  }
}

function speak(text) {
  if (state.muted || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = .78;
  utterance.pitch = 1.06;
  window.speechSynthesis.speak(utterance);
}

function speakPrompt() {
  playTeachingClip(state.target === "voiced" ? audio.promptVoiced : audio.promptUnvoiced);
}

function animateHammer(x, y) {
  const hammer = $("#hammer-cursor");
  hammer.style.left = `${x}px`;
  hammer.style.top = `${y}px`;
  hammer.classList.remove("swing");
  void hammer.offsetWidth;
  hammer.classList.add("swing");
}

$("#start-button").addEventListener("click", () => {
  ensureMusic();
  goToMap(!state.tutorialSeen);
});
$("#home-button").addEventListener("click", () => { stopGame(); showScreen("start-screen"); });
$("#teacher-button").addEventListener("click", startTutorial);
$("#tutorial-skip").addEventListener("click", () => finishTutorial(false));
$("#tutorial-next").addEventListener("click", () => {
  if (state.tutorialStep < TUTORIAL.length - 1) {
    state.tutorialStep += 1;
    renderTutorial();
  } else finishTutorial(true);
});
$("#reset-button").addEventListener("click", () => {
  localStorage.removeItem("th-hunt-unlocked");
  localStorage.removeItem("th-hunt-stars");
  localStorage.removeItem("th-hunt-tutorial");
  state.unlocked = 1; state.stars = {}; state.tutorialSeen = false;
  $("#reset-button").textContent = "進度已重設";
});
$$(".level-node").forEach(node => node.addEventListener("click", () => {
  const level = Number(node.dataset.level);
  if (level <= state.unlocked) startLevelGame(level);
}));
$("#map-button").addEventListener("click", () => goToMap(false));
$("#pause-button").addEventListener("click", () => togglePause());
$("#resume-button").addEventListener("click", () => togglePause(true));
$("#mute-button").addEventListener("click", () => {
  state.muted = !state.muted;
  $("#mute-button").textContent = state.muted ? "🔇" : "🔊";
  $("#mute-button").setAttribute("aria-label", state.muted ? "開啟聲音" : "關閉聲音");
  if (state.muted) {
    Object.entries(audio).forEach(([name, sound]) => { if (name !== "music") sound.pause(); });
    wordAudio.forEach(sound => sound.pause());
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }
});
$("#music-button").addEventListener("click", () => {
  state.musicMuted = !state.musicMuted;
  localStorage.setItem("th-hunt-music-muted", state.musicMuted ? "yes" : "no");
  $("#music-button").setAttribute("aria-pressed", String(state.musicMuted));
  $("#music-button").setAttribute("aria-label", state.musicMuted ? "開啟背景音樂" : "關閉背景音樂");
  $("#music-button span").textContent = state.musicMuted ? "🎵⃠" : "🎵";
  if (state.musicMuted) audio.music.pause();
  else ensureMusic();
});
$("#speak-button").addEventListener("click", speakPrompt);
$("#retry-button").addEventListener("click", () => startLevelGame(state.level));
$("#result-map-button").addEventListener("click", () => goToMap(false));

const finePointer = matchMedia("(pointer: fine)");
if (finePointer.matches) $("#game-screen").classList.add("pointer-fine");
$("#game-screen").addEventListener("pointermove", event => {
  const hammer = $("#hammer-cursor");
  hammer.style.left = `${event.clientX}px`;
  hammer.style.top = `${event.clientY}px`;
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.running && !state.paused) togglePause();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && state.running) togglePause();
});
document.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (button && !button.classList.contains("hole") && button.id !== "mute-button") playSfx("click");
});

updateMap();
$("#music-button").setAttribute("aria-pressed", String(state.musicMuted));
$("#music-button").setAttribute("aria-label", state.musicMuted ? "開啟背景音樂" : "關閉背景音樂");
$("#music-button span").textContent = state.musicMuted ? "🎵⃠" : "🎵";
