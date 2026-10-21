const counterValue = document.getElementById("counterValue");
const plusBtn = document.getElementById("plusBtn");
const minusBtn = document.getElementById("minusBtn");
const resetBtn = document.getElementById("resetBtn");
const stepSelect = document.getElementById("stepSelect");
const historyList = document.getElementById("historyList");

let count = 0;
let step = 1;
const history = [];

function showCounter() {
    counterValue.textContent = count;

    if (count > 0) {
        counterValue.className = "positive";
    } else if (count < 0) {
        counterValue.className = "negative";
    } else {
        counterValue.className = "";
    }

    showHistory();
}

function showHistory() {
    historyList.innerHTML = "";

    if (history.length === 0) {
        historyList.innerHTML = "<li>пока ничего</li>";
        return;
    }

    for (let i = history.length - 1; i >= 0; i--) {
        const li = document.createElement("li");
        li.textContent = history[i];
        historyList.appendChild(li);
    }
}

function addToHistory(text) {
    history.push(text);
    if (history.length > 5) {
        history.shift();
    }
}

plusBtn.addEventListener("click", () => {
    count += step;
    addToHistory(`+${step} → ${count}`);
    showCounter();
});

minusBtn.addEventListener("click", () => {
    count -= step;
    addToHistory(`−${step} → ${count}`);
    showCounter();
});

resetBtn.addEventListener("click", () => {
    if (count === 0) return;
    count = 0;
    addToHistory("сброс → 0");
    showCounter();
});

stepSelect.addEventListener("change", () => {
    step = Number(stepSelect.value);
    addToHistory(`шаг изменен на ${step}`);
    showCounter();
});

showCounter();



const shopInput = document.getElementById("shopInput");
const shopAddBtn = document.getElementById("shopAddBtn");
const clearBtn = document.getElementById("clearBtn");
const shopList = document.getElementById("shopList");
const shopMessage = document.getElementById("shopMessage");
const shopInfo = document.getElementById("shopInfo");

let items = [];

function renderShop() {
    shopList.innerHTML = "";

    for (let i = 0; i < items.length; i++) {
        const li = document.createElement("li");
        li.textContent = items[i].name;

        if (items[i].bought) {
            li.classList.add("bought");
        }

        li.addEventListener("click", () => {
            items[i].bought = !items[i].bought;
            renderShop();
        });

        shopList.appendChild(li);
    }

    updateShopInfo();
}

function updateShopInfo() {
    if (items.length === 0) {
        shopInfo.textContent = "Список пуст";
        shopInfo.className = "empty";
        return;
    }

    let boughtCount = 0;
    for (const item of items) {
        if (item.bought) boughtCount++;
    }

    shopInfo.className = "";
    shopInfo.textContent = `Всего: ${items.length}, куплено: ${boughtCount}, осталось: ${items.length - boughtCount}`;
}

function addItem() {
    const name = shopInput.value.trim();

    if (name === "") {
        shopMessage.textContent = "Введите название товара";
        return;
    }

    const exists = items.some(item => item.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        shopMessage.textContent = "Такой товар уже есть в списке";
        return;
    }

    items.push({ name: name, bought: false });
    shopMessage.textContent = "";
    shopInput.value = "";
    shopInput.focus();
    renderShop();
}

shopAddBtn.addEventListener("click", addItem);

shopInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        addItem();
    }
});

shopInput.addEventListener("input", () => {
    shopMessage.textContent = "";
});

clearBtn.addEventListener("click", () => {
    if (items.length === 0) {
        shopMessage.textContent = "Список и так пустой";
        return;
    }

    if (confirm("Точно очистить весь список?")) {
        items = [];
        shopMessage.textContent = "";
        renderShop();
    }
});



const expName = document.getElementById("expName");
const expAmount = document.getElementById("expAmount");
const expAddBtn = document.getElementById("expAddBtn");
const expList = document.getElementById("expList");
const expMessage = document.getElementById("expMessage");
const expTotal = document.getElementById("expTotal");
const expStats = document.getElementById("expStats");
const sortSelect = document.getElementById("sortSelect");

let expenses = [];
let nextId = 1;

function formatMoney(num) {
    return num.toLocaleString("ru-RU");
}

function getSorted() {
    const copy = [...expenses];
    const mode = sortSelect.value;

    if (mode === "big") {
        copy.sort((a, b) => b.amount - a.amount);
    } else if (mode === "small") {
        copy.sort((a, b) => a.amount - b.amount);
    } else {
        copy.reverse();
    }

    return copy;
}

function renderExpenses() {
    expList.innerHTML = "";

    if (expenses.length === 0) {
        expList.innerHTML = '<li class="empty">Расходов пока нет</li>';
    }

    for (const exp of getSorted()) {
        const li = document.createElement("li");

        const name = document.createElement("span");
        name.textContent = exp.name;

        const sum = document.createElement("span");
        sum.className = "sum";
        sum.textContent = formatMoney(exp.amount) + " ₸";

        const del = document.createElement("button");
        del.className = "red-btn";
        del.textContent = "✕";
        del.addEventListener("click", () => removeExpense(exp.id));

        li.append(name, sum, del);
        expList.appendChild(li);
    }

    updateTotal();
}

function updateTotal() {
    let total = 0;
    let max = null;

    for (let i = 0; i < expenses.length; i++) {
        total += expenses[i].amount;
        if (max === null || expenses[i].amount > max.amount) {
            max = expenses[i];
        }
    }

    expTotal.textContent = formatMoney(total);

    if (expenses.length > 0) {
        const avg = Math.round(total / expenses.length);
        expStats.textContent = `Записей: ${expenses.length}, в среднем: ${formatMoney(avg)} ₸, самый большой: ${max.name}`;
    } else {
        expStats.textContent = "";
    }
}

function addExpense() {
    const name = expName.value.trim();
    const amount = Number(expAmount.value);

    expName.classList.remove("error");
    expAmount.classList.remove("error");

    if (name === "") {
        expMessage.textContent = "Напишите, на что потрачены деньги";
        expName.classList.add("error");
        return;
    }

    if (expAmount.value === "" || isNaN(amount) || amount <= 0) {
        expMessage.textContent = "Сумма должна быть больше нуля";
        expAmount.classList.add("error");
        return;
    }

    expenses.push({ id: nextId++, name: name, amount: amount });

    expMessage.textContent = "";
    expName.value = "";
    expAmount.value = "";
    expName.focus();
    renderExpenses();
}

function removeExpense(id) {
    expenses = expenses.filter(exp => exp.id !== id);
    renderExpenses();
}

expAddBtn.addEventListener("click", addExpense);

expAmount.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addExpense();
});

expName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") expAmount.focus();
});

sortSelect.addEventListener("change", renderExpenses);

renderExpenses();