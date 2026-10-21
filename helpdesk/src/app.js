const STORAGE_KEY = "helpdesk_tickets";

const tabs = document.querySelectorAll(".tab");
const views = document.querySelectorAll(".view");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const priorityFilter = document.getElementById("priorityFilter");
const sortSelect = document.getElementById("sortSelect");
const exportBtn = document.getElementById("exportBtn");
const ticketList = document.getElementById("ticketList");
const foundText = document.getElementById("foundText");

const form = document.getElementById("ticketForm");
const categorySelect = document.getElementById("categorySelect");
const prioritySelect = document.getElementById("prioritySelect");
const slaHint = document.getElementById("slaHint");

const overlay = document.getElementById("overlay");
const modal = document.getElementById("modal");
const toast = document.getElementById("toast");

let tickets = [];
let openedId = null;
let toastTimer = null;

function hoursAgo(h) {
    return new Date(Date.now() - h * 3600 * 1000);
}

function makeDemo() {
    const list = [];

    const demo = [
        { h: 30, title: "Не приходит SMS с кодом", description: "При входе в приложение код подтверждения не приходит уже второй день", client: "Айгерим", contact: "+77011234567", category: "Аккаунт и доступ", priority: "high" },
        { h: 26, title: "Двойное списание за заказ", description: "За один заказ с карты списали деньги два раза, прикладываю номер заказа 58213", client: "Ерлан", contact: "erlan.k@mail.kz", category: "Оплата", priority: "critical" },
        { h: 20, title: "Курьер опоздал на 2 часа", description: "Заказ должен был приехать в 14:00, привезли в 16:10, часть продуктов теплые", client: "Дана", contact: "+77079876543", category: "Доставка", priority: "medium" },
        { h: 9, title: "Не работает промокод STUDENT", description: "Ввожу промокод при оформлении, пишет что промокод недействителен", client: "Тимур", contact: "timur99@gmail.com", category: "Оплата", priority: "low" },
        { h: 5, title: "Приложение вылетает на Android", description: "После обновления приложение закрывается сразу при открытии корзины", client: "Мадина", contact: "+77475553311", category: "Сайт или приложение", priority: "high" },
        { h: 1, title: "Как изменить адрес доставки", description: "Хочу поменять адрес в уже оформленном заказе, не нахожу где это сделать", client: "Санжар", contact: "sanzhar@inbox.ru", category: "Доставка", priority: "low" }
    ];

    for (const d of demo) {
        const { ticket } = createTicket(d, list, hoursAgo(d.h));
        list.push(ticket);
    }

    changeStatus(list[0], "work", hoursAgo(29));
    addComment(list[0], "Дидар", "Проверили номер, отправили запрос в SMS-шлюз", hoursAgo(28));

    changeStatus(list[1], "work", hoursAgo(25.5));
    changeStatus(list[1], "resolved", hoursAgo(23));
    addComment(list[1], "Дидар", "Второе списание отменено, деньги вернутся в течение 3 дней", hoursAgo(23));

    changeStatus(list[2], "work", hoursAgo(19));
    changeStatus(list[2], "resolved", hoursAgo(18));
    changeStatus(list[2], "closed", hoursAgo(17));

    changeStatus(list[3], "work", hoursAgo(8));
    changeStatus(list[3], "waiting", hoursAgo(7));
    addComment(list[3], "Дидар", "Уточнили у клиента скриншот ошибки", hoursAgo(7));

    return list;
}

function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    } catch (e) {}
}

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (Array.isArray(data)) return data;
        }
    } catch (e) {}
    return makeDemo();
}

function showToast(text) {
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function timeLeft(ticket) {
    if (ticket.status === "resolved" || ticket.status === "closed") {
        return { text: "SLA выполнен", late: false };
    }

    const diff = getDeadline(ticket) - Date.now();
    const hours = Math.floor(Math.abs(diff) / 3600000);
    const minutes = Math.floor(Math.abs(diff) % 3600000 / 60000);
    const value = hours > 0 ? `${hours} ч ${minutes} мин` : `${minutes} мин`;

    if (diff < 0) {
        return { text: `Просрочено на ${value}`, late: true };
    }
    return { text: `Осталось ${value}`, late: false };
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function fillSelects() {
    for (const key in STATUS_LABELS) {
        statusFilter.append(new Option(STATUS_LABELS[key], key));
    }

    for (const key in PRIORITY_INFO) {
        priorityFilter.append(new Option(PRIORITY_INFO[key].label, key));
        prioritySelect.append(new Option(`${PRIORITY_INFO[key].label} (SLA ${PRIORITY_INFO[key].slaHours} ч)`, key));
    }

    for (const cat of CATEGORIES) {
        categorySelect.append(new Option(cat, cat));
    }
}

function updateHeader() {
    const stats = getStats(tickets);
    document.getElementById("hdrOpen").textContent = stats.open;
    document.getElementById("hdrOverdue").textContent = stats.overdue;
    document.getElementById("hdrTotal").textContent = stats.total;
}

function getVisible() {
    let list = searchTickets(tickets, searchInput.value);
    list = filterTickets(list, statusFilter.value, priorityFilter.value);
    return sortTickets(list, sortSelect.value);
}

function renderList() {
    const list = getVisible();
    ticketList.innerHTML = "";
    foundText.textContent = `Найдено: ${list.length} из ${tickets.length}`;

    if (list.length === 0) {
        ticketList.append(el("p", "empty", "Заявок не найдено. Измените поиск или фильтры."));
        return;
    }

    for (const t of list) {
        const card = el("div", "ticket p-" + t.priority);

        const left = el("div");
        const title = el("div", "title");
        title.append(el("span", "id", t.id), t.title);

        const meta = el("div", "meta", `${t.client} • ${t.category} • ${formatDate(t.createdAt)}`);
        left.append(title, meta);

        const right = el("div", "right");
        const slaInfo = timeLeft(t);
        right.append(
            el("span", "badge s-" + t.status, STATUS_LABELS[t.status]),
            el("span", "badge p-" + t.priority, PRIORITY_INFO[t.priority].label),
            el("span", slaInfo.late ? "deadline late" : "deadline", slaInfo.text)
        );

        card.append(left, right);
        card.addEventListener("click", () => openTicket(t.id));
        ticketList.append(card);
    }
}

function renderStats() {
    const stats = getStats(tickets);
    const cards = document.getElementById("statCards");
    cards.innerHTML = "";

    const items = [
        [stats.total, "Всего заявок", ""],
        [stats.open, "Открытых", ""],
        [stats.overdue, "Просрочено по SLA", "red"],
        [stats.avgHours + " ч", "Среднее время решения", ""]
    ];

    for (const [num, label, cls] of items) {
        const card = el("div", "stat-card " + cls);
        card.append(el("div", "num", num), el("div", "label", label));
        cards.append(card);
    }

    drawBars("statusBars", stats.byStatus, STATUS_LABELS, stats.total);

    const pLabels = {};
    for (const key in PRIORITY_INFO) pLabels[key] = PRIORITY_INFO[key].label;
    drawBars("priorityBars", stats.byPriority, pLabels, stats.total);

    const cLabels = {};
    for (const cat of CATEGORIES) cLabels[cat] = cat;
    drawBars("categoryBars", stats.byCategory, cLabels, stats.total);
}

function drawBars(containerId, counts, labels, total) {
    const box = document.getElementById(containerId);
    box.innerHTML = "";

    for (const key in counts) {
        const row = el("div", "bar-row");
        const bar = el("div", "bar");
        const fill = el("div");
        fill.style.width = total > 0 ? (counts[key] / total * 100) + "%" : "0%";
        bar.append(fill);

        row.append(el("span", "", labels[key]), bar, el("span", "count", counts[key]));
        box.append(row);
    }
}

function renderAll() {
    updateHeader();
    renderList();
    renderStats();
    if (openedId) renderModal();
}

function openTab(name) {
    tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.tab === name));
    views.forEach(view => view.classList.toggle("active", view.id === "view-" + name));
    if (name === "stats") renderStats();
}

function showFieldErrors(errors) {
    form.querySelectorAll(".field-error").forEach(span => {
        const field = span.dataset.for;
        const input = form.elements[field];
        const msg = errors && errors[field] ? errors[field] : "";
        span.textContent = msg;
        input.classList.toggle("invalid", msg !== "");
    });
}

function openTicket(id) {
    openedId = id;
    renderModal();
    overlay.classList.remove("hidden");
}

function closeTicket() {
    openedId = null;
    overlay.classList.add("hidden");
}

function renderModal(errorText = "") {
    const t = tickets.find(x => x.id === openedId);
    if (!t) {
        closeTicket();
        return;
    }

    modal.innerHTML = "";

    const closeBtn = el("button", "close-btn", "✕");
    closeBtn.addEventListener("click", closeTicket);

    const title = el("h2", "", `${t.id} — ${t.title}`);

    const badges = el("div", "actions");
    const time = timeLeft(t);
    badges.append(
        el("span", "badge s-" + t.status, STATUS_LABELS[t.status]),
        el("span", "badge p-" + t.priority, PRIORITY_INFO[t.priority].label),
        el("span", time.late ? "deadline late" : "deadline", time.text)
    );

    const info = el("div", "info-grid");
    const rows = [
        ["Клиент", t.client],
        ["Контакт", t.contact],
        ["Категория", t.category],
        ["Создана", formatDate(t.createdAt)],
        ["Обновлена", formatDate(t.updatedAt)],
        ["Срок по SLA", formatDate(getDeadline(t).toISOString())]
    ];
    for (const [label, value] of rows) {
        const div = el("div");
        div.append(el("span", "", label + ": "), value);
        info.append(div);
    }

    modal.append(closeBtn, title, badges, info, el("div", "desc-box", t.description));

    modal.append(el("h3", "", "Действия"));
    const actions = el("div", "actions");

    const nextStatuses = TRANSITIONS[t.status];
    if (nextStatuses.length === 0) {
        actions.append(el("span", "deadline", "Заявка закрыта, изменения недоступны"));
    }

    for (const st of nextStatuses) {
        let cls = "btn small";
        if (st === "resolved") cls += " green";
        if (st === "closed") cls += " gray";

        const btn = el("button", cls, "→ " + STATUS_LABELS[st]);
        btn.addEventListener("click", () => {
            const res = changeStatus(t, st);
            if (!res.ok) {
                renderModal(res.error);
                return;
            }
            save();
            renderAll();
            showToast(`${t.id}: ${STATUS_LABELS[st]}`);
        });
        actions.append(btn);
    }

    if (t.status !== "closed") {
        const prSelect = el("select");
        for (const key in PRIORITY_INFO) {
            prSelect.append(new Option("Приоритет: " + PRIORITY_INFO[key].label, key));
        }
        prSelect.value = t.priority;
        prSelect.addEventListener("change", () => {
            const res = changePriority(t, prSelect.value);
            if (!res.ok) {
                renderModal(res.error);
                return;
            }
            save();
            renderAll();
            showToast("Приоритет изменен");
        });
        actions.append(prSelect);
    }

    modal.append(actions, el("p", "modal-error", errorText));

    modal.append(el("h3", "", `Комментарии (${t.comments.length})`));
    if (t.comments.length === 0) {
        modal.append(el("p", "deadline", "Комментариев пока нет"));
    }
    for (const c of t.comments) {
        const box = el("div", "comment");
        box.append(el("div", "who", `${c.author}, ${formatDate(c.time)}`), el("div", "", c.text));
        modal.append(box);
    }

    if (t.status !== "closed") {
        const commentForm = el("form", "comment-form");
        const commentInput = el("input");
        commentInput.placeholder = "Написать комментарий...";
        commentInput.maxLength = 500;
        const sendBtn = el("button", "btn small", "Добавить");
        commentForm.append(commentInput, sendBtn);

        commentForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const res = addComment(t, "Оператор", commentInput.value);
            if (!res.ok) {
                renderModal(res.error);
                return;
            }
            save();
            renderAll();
        });

        modal.append(commentForm);
    }

    modal.append(el("h3", "", "История изменений"));
    const history = el("ul", "history");
    for (let i = t.history.length - 1; i >= 0; i--) {
        const li = el("li");
        li.append(el("span", "time", formatDate(t.history[i].time)), t.history[i].text);
        history.append(li);
    }
    modal.append(history);
}

function exportCSV() {
    const list = getVisible();
    if (list.length === 0) {
        showToast("Нечего экспортировать");
        return;
    }

    const blob = new Blob(["﻿" + toCSV(list)], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "tickets.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    showToast(`Выгружено заявок: ${list.length}`);
}

tabs.forEach(tab => {
    tab.addEventListener("click", () => openTab(tab.dataset.tab));
});

searchInput.addEventListener("input", renderList);
statusFilter.addEventListener("change", renderList);
priorityFilter.addEventListener("change", renderList);
sortSelect.addEventListener("change", renderList);
exportBtn.addEventListener("click", exportCSV);

prioritySelect.addEventListener("change", () => {
    const info = PRIORITY_INFO[prioritySelect.value];
    slaHint.textContent = info ? `Срок решения по SLA: ${info.slaHours} ч` : "";
});

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = {
        title: form.elements.title.value,
        description: form.elements.description.value,
        client: form.elements.client.value,
        contact: form.elements.contact.value,
        category: form.elements.category.value,
        priority: form.elements.priority.value
    };

    const { ticket, errors } = createTicket(data, tickets);
    showFieldErrors(errors);

    if (!ticket) {
        showToast("Проверьте поля формы");
        return;
    }

    tickets.push(ticket);
    save();
    form.reset();
    slaHint.textContent = "";
    renderAll();
    openTab("list");
    showToast(`Создана заявка ${ticket.id}`);
});

form.addEventListener("reset", () => {
    showFieldErrors(null);
    slaHint.textContent = "";
});

form.addEventListener("input", (e) => {
    const name = e.target.name;
    const span = form.querySelector(`.field-error[data-for="${name}"]`);
    if (span && span.textContent) {
        span.textContent = "";
        e.target.classList.remove("invalid");
    }
});

overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeTicket();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openedId) closeTicket();
});

document.getElementById("resetBtn").addEventListener("click", () => {
    if (!confirm("Все текущие заявки будут удалены. Продолжить?")) return;
    tickets = makeDemo();
    save();
    renderAll();
    showToast("Данные сброшены");
});

setInterval(() => {
    updateHeader();
    if (document.getElementById("view-list").classList.contains("active")) renderList();
}, 60000);

fillSelects();
tickets = load();
renderAll();
openTab("list");
