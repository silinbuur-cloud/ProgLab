const themeBtn = document.getElementById("themeBtn");
const themeName = document.getElementById("themeName");
const themeCount = document.getElementById("themeCount");

let switches = 0;

function setTheme(dark) {
    if (dark) {
        document.body.classList.add("dark");
        themeName.textContent = "темная";
        themeBtn.textContent = "☀️ Включить светлую";
    } else {
        document.body.classList.remove("dark");
        themeName.textContent = "светлая";
        themeBtn.textContent = "🌙 Включить темную";
    }

    try {
        localStorage.setItem("theme", dark ? "dark" : "light");
    } catch (e) {}
}

function toggleTheme() {
    const isDark = document.body.classList.contains("dark");
    setTheme(!isDark);
    switches++;
    themeCount.textContent = `Переключений: ${switches}`;
}

themeBtn.addEventListener("click", toggleTheme);

document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (e.key === "t" || e.key === "T" || e.key === "е" || e.key === "Е") {
        toggleTheme();
    }
});

try {
    if (localStorage.getItem("theme") === "dark") {
        setTheme(true);
    }
} catch (e) {}



const openModalBtn = document.getElementById("openModalBtn");
const overlay = document.getElementById("overlay");
const closeModalBtn = document.getElementById("closeModalBtn");
const closeX = document.getElementById("closeX");
const sendBtn = document.getElementById("sendBtn");
const feedbackInput = document.getElementById("feedbackInput");
const feedbackMsg = document.getElementById("feedbackMsg");
const modalLog = document.getElementById("modalLog");

function addLog(text) {
    const time = new Date().toLocaleTimeString("ru-RU");
    const li = document.createElement("li");
    li.textContent = `${time} — ${text}`;
    modalLog.prepend(li);

    if (modalLog.children.length > 5) {
        modalLog.lastElementChild.remove();
    }
}

function openModal() {
    overlay.classList.remove("hidden");
    feedbackInput.value = "";
    feedbackMsg.textContent = "";
    feedbackInput.focus();
    addLog("окно открыто");
}

function closeModal(how) {
    if (overlay.classList.contains("hidden")) return;
    overlay.classList.add("hidden");
    addLog(`закрыто (${how})`);
}

openModalBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", () => closeModal("кнопка"));
closeX.addEventListener("click", () => closeModal("крестик"));

overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
        closeModal("клик вне окна");
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeModal("Escape");
    }
});

sendBtn.addEventListener("click", () => {
    const text = feedbackInput.value.trim();

    if (text.length < 3) {
        feedbackMsg.textContent = "Слишком короткий отзыв";
        feedbackMsg.className = "feedback-msg error";
        return;
    }

    feedbackMsg.textContent = "Спасибо за отзыв!";
    feedbackMsg.className = "feedback-msg ok";
    addLog(`отзыв: «${text}»`);
    setTimeout(() => closeModal("после отправки"), 800);
});

feedbackInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
});



const field = document.getElementById("field");
const target = document.getElementById("target");
const gameMessage = document.getElementById("gameMessage");
const startBtn = document.getElementById("startBtn");
const goalSelect = document.getElementById("goalSelect");
const hitsEl = document.getElementById("hits");
const missesEl = document.getElementById("misses");
const timeEl = document.getElementById("time");
const goalText = document.getElementById("goalText");
const bestEl = document.getElementById("best");

let hits = 0;
let misses = 0;
let goal = 10;
let playing = false;
let startTime = 0;
let timerId = null;
let bestTime = null;

function moveTarget() {
    const maxX = field.clientWidth - target.offsetWidth;
    const maxY = field.clientHeight - target.offsetHeight;
    const x = Math.floor(Math.random() * maxX);
    const y = Math.floor(Math.random() * maxY);

    target.style.left = x + "px";
    target.style.top = y + "px";
}

function updateStats() {
    hitsEl.textContent = hits;
    missesEl.textContent = misses;
}

function startGame() {
    hits = 0;
    misses = 0;
    goal = Number(goalSelect.value);
    goalText.textContent = goal;
    playing = true;

    updateStats();
    gameMessage.style.display = "none";
    target.style.display = "block";
    startBtn.textContent = "Заново";
    goalSelect.disabled = true;
    moveTarget();

    startTime = Date.now();
    clearInterval(timerId);
    timerId = setInterval(() => {
        timeEl.textContent = ((Date.now() - startTime) / 1000).toFixed(1);
    }, 100);
}

function endGame() {
    playing = false;
    clearInterval(timerId);

    const result = (Date.now() - startTime) / 1000;
    timeEl.textContent = result.toFixed(1);
    target.style.display = "none";
    goalSelect.disabled = false;

    let text = `Готово! ${goal} попаданий за ${result.toFixed(1)} с, промахов: ${misses}.`;

    if (bestTime === null || result < bestTime) {
        bestTime = result;
        bestEl.textContent = bestTime.toFixed(1) + " с";
        text += " Новый рекорд!";
    }

    gameMessage.textContent = text;
    gameMessage.style.display = "flex";
}

target.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!playing) return;

    hits++;
    updateStats();

    if (hits >= goal) {
        endGame();
    } else {
        moveTarget();
    }
});

field.addEventListener("click", () => {
    if (!playing) return;

    misses++;
    updateStats();

    field.classList.remove("miss");
    void field.offsetWidth;
    field.classList.add("miss");
});

startBtn.addEventListener("click", startGame);