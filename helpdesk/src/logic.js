const STATUS = Object.freeze({
    NEW: "new",
    WORK: "work",
    WAITING: "waiting",
    RESOLVED: "resolved",
    CLOSED: "closed"
});

const STATUS_LABELS = Object.freeze({
    new: "Новая",
    work: "В работе",
    waiting: "Ждет ответа клиента",
    resolved: "Решена",
    closed: "Закрыта"
});

const TRANSITIONS = Object.freeze({
    new: ["work", "closed"],
    work: ["waiting", "resolved"],
    waiting: ["work", "resolved"],
    resolved: ["closed", "work"],
    closed: []
});

const PRIORITY = Object.freeze({
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    CRITICAL: "critical"
});

const PRIORITY_INFO = Object.freeze({
    low: { label: "Низкий", weight: 1, slaHours: 32 },
    medium: { label: "Средний", weight: 2, slaHours: 16 },
    high: { label: "Высокий", weight: 3, slaHours: 8 },
    critical: { label: "Критический", weight: 4, slaHours: 4 }
});

const CATEGORIES = Object.freeze([
    "Аккаунт и доступ",
    "Оплата",
    "Доставка",
    "Сайт или приложение",
    "Другое"
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^\+?[78]\d{10}$/;
const NAME_RE = /^[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі\s-]+$/;

function cleanText(text) {
    return String(text ?? "").replace(/\s+/g, " ").trim();
}

function normalizePhone(value) {
    return cleanText(value).replace(/[\s()-]/g, "");
}

function formatId(num) {
    return "TK-" + String(num).padStart(4, "0");
}

function nextNumber(tickets) {
    let max = 0;
    for (const t of tickets) {
        const n = parseInt(t.id.slice(3), 10);
        if (n > max) max = n;
    }
    return max + 1;
}

function validateTicket(data) {
    const errors = {};

    const title = cleanText(data.title);
    const description = cleanText(data.description);
    const client = cleanText(data.client);
    const contact = cleanText(data.contact);

    if (title.length < 5) {
        errors.title = "Тема должна быть не короче 5 символов";
    } else if (title.length > 100) {
        errors.title = "Тема слишком длинная (максимум 100 символов)";
    }

    if (description.length < 10) {
        errors.description = "Опишите проблему подробнее (от 10 символов)";
    }

    if (client.length < 2) {
        errors.client = "Введите имя клиента";
    } else if (!NAME_RE.test(client)) {
        errors.client = "Имя может содержать только буквы, пробел и дефис";
    }

    if (contact === "") {
        errors.contact = "Укажите email или телефон";
    } else if (!EMAIL_RE.test(contact) && !PHONE_RE.test(normalizePhone(contact))) {
        errors.contact = "Неверный формат: нужен email или телефон +7XXXXXXXXXX";
    }

    if (!CATEGORIES.includes(data.category)) {
        errors.category = "Выберите категорию";
    }

    if (!PRIORITY_INFO[data.priority]) {
        errors.priority = "Выберите приоритет";
    }

    return { ok: Object.keys(errors).length === 0, errors };
}

function createTicket(data, tickets, now = new Date()) {
    const check = validateTicket(data);
    if (!check.ok) {
        return { ticket: null, errors: check.errors };
    }

    const time = now.toISOString();
    let contact = cleanText(data.contact);
    if (!EMAIL_RE.test(contact)) {
        contact = normalizePhone(contact);
    }

    const ticket = {
        id: formatId(nextNumber(tickets)),
        title: cleanText(data.title),
        description: cleanText(data.description),
        client: cleanText(data.client),
        contact: contact,
        category: data.category,
        priority: data.priority,
        status: STATUS.NEW,
        createdAt: time,
        updatedAt: time,
        resolvedAt: null,
        comments: [],
        history: [{ time, text: "Заявка создана" }]
    };

    return { ticket, errors: null };
}

function canChangeStatus(ticket, newStatus) {
    return TRANSITIONS[ticket.status].includes(newStatus);
}

function changeStatus(ticket, newStatus, now = new Date()) {
    if (!STATUS_LABELS[newStatus]) {
        return { ok: false, error: "Неизвестный статус" };
    }

    if (!canChangeStatus(ticket, newStatus)) {
        return {
            ok: false,
            error: `Нельзя перевести из «${STATUS_LABELS[ticket.status]}» в «${STATUS_LABELS[newStatus]}»`
        };
    }

    const time = now.toISOString();
    const old = ticket.status;

    ticket.status = newStatus;
    ticket.updatedAt = time;

    if (newStatus === STATUS.RESOLVED) {
        ticket.resolvedAt = time;
    } else if (newStatus === STATUS.WORK) {
        ticket.resolvedAt = null;
    }

    ticket.history.push({ time, text: `Статус: ${STATUS_LABELS[old]} → ${STATUS_LABELS[newStatus]}` });
    return { ok: true };
}

function changePriority(ticket, newPriority, now = new Date()) {
    if (!PRIORITY_INFO[newPriority]) {
        return { ok: false, error: "Неизвестный приоритет" };
    }

    if (ticket.status === STATUS.CLOSED) {
        return { ok: false, error: "Закрытую заявку менять нельзя" };
    }

    if (ticket.priority === newPriority) {
        return { ok: false, error: "Приоритет уже такой" };
    }

    const time = now.toISOString();
    const oldLabel = PRIORITY_INFO[ticket.priority].label;

    ticket.priority = newPriority;
    ticket.updatedAt = time;
    ticket.history.push({ time, text: `Приоритет: ${oldLabel} → ${PRIORITY_INFO[newPriority].label}` });
    return { ok: true };
}

function addComment(ticket, author, text, now = new Date()) {
    const clean = cleanText(text);
    const who = cleanText(author) || "Оператор";

    if (clean.length < 2) {
        return { ok: false, error: "Комментарий пустой" };
    }

    if (clean.length > 500) {
        return { ok: false, error: "Комментарий длиннее 500 символов" };
    }

    if (ticket.status === STATUS.CLOSED) {
        return { ok: false, error: "Заявка закрыта, комментарии отключены" };
    }

    const time = now.toISOString();
    ticket.comments.push({ time, author: who, text: clean });
    ticket.updatedAt = time;
    ticket.history.push({ time, text: `Добавлен комментарий (${who})` });
    return { ok: true };
}

function getDeadline(ticket) {
    const created = new Date(ticket.createdAt).getTime();
    return new Date(created + PRIORITY_INFO[ticket.priority].slaHours * 3600 * 1000);
}

function isOverdue(ticket, now = new Date()) {
    if (ticket.status === STATUS.RESOLVED || ticket.status === STATUS.CLOSED) {
        return false;
    }
    return now.getTime() > getDeadline(ticket).getTime();
}

function searchTickets(tickets, query) {
    const words = cleanText(query).toLowerCase().split(" ").filter(w => w !== "");
    if (words.length === 0) return tickets.slice();

    return tickets.filter(t => {
        const text = [t.id, t.title, t.description, t.client, t.contact, t.category].join(" ").toLowerCase();
        return words.every(w => text.includes(w));
    });
}

function filterTickets(tickets, status, priority) {
    const result = [];
    for (const t of tickets) {
        if (status && status !== "all" && t.status !== status) continue;
        if (priority && priority !== "all" && t.priority !== priority) continue;
        result.push(t);
    }
    return result;
}

function sortTickets(tickets, mode) {
    const list = tickets.slice();

    if (mode === "priority") {
        list.sort((a, b) => PRIORITY_INFO[b.priority].weight - PRIORITY_INFO[a.priority].weight
            || a.createdAt.localeCompare(b.createdAt));
    } else if (mode === "deadline") {
        list.sort((a, b) => getDeadline(a) - getDeadline(b));
    } else if (mode === "old") {
        list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else {
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return list;
}

function getStats(tickets, now = new Date()) {
    const byStatus = {};
    const byPriority = {};
    const byCategory = {};

    for (const key in STATUS_LABELS) byStatus[key] = 0;
    for (const key in PRIORITY_INFO) byPriority[key] = 0;
    for (const cat of CATEGORIES) byCategory[cat] = 0;

    let overdue = 0;
    let resolvedCount = 0;
    let resolveHours = 0;

    for (const t of tickets) {
        byStatus[t.status]++;
        byPriority[t.priority]++;
        byCategory[t.category]++;

        if (isOverdue(t, now)) overdue++;

        if (t.resolvedAt) {
            resolvedCount++;
            resolveHours += (new Date(t.resolvedAt) - new Date(t.createdAt)) / 3600000;
        }
    }

    const open = tickets.length - byStatus.resolved - byStatus.closed;
    const avgHours = resolvedCount > 0 ? Math.round(resolveHours / resolvedCount * 10) / 10 : 0;

    return { total: tickets.length, open, overdue, avgHours, byStatus, byPriority, byCategory };
}

function csvCell(value) {
    const text = String(value ?? "");
    if (/[";\n]/.test(text)) {
        return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
}

function toCSV(tickets) {
    const header = ["ID", "Тема", "Клиент", "Контакт", "Категория", "Приоритет", "Статус", "Создана"];
    const lines = [header.join(";")];

    for (const t of tickets) {
        const row = [
            t.id,
            t.title,
            t.client,
            t.contact,
            t.category,
            PRIORITY_INFO[t.priority].label,
            STATUS_LABELS[t.status],
            t.createdAt.slice(0, 16).replace("T", " ")
        ];
        lines.push(row.map(csvCell).join(";"));
    }

    return lines.join("\n");
}

if (typeof module !== "undefined") {
    module.exports = {
        STATUS, STATUS_LABELS, TRANSITIONS, PRIORITY, PRIORITY_INFO, CATEGORIES,
        cleanText, formatId, nextNumber, validateTicket, createTicket,
        canChangeStatus, changeStatus, changePriority, addComment,
        getDeadline, isOverdue, searchTickets, filterTickets, sortTickets, getStats, toCSV
    };
}
