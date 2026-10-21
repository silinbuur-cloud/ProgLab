const assert = require("assert");
const path = require("path");
const L = require(path.join(__dirname, "..", "src", "logic.js"));

const base = new Date("2026-10-20T10:00:00Z");

function goodData(extra = {}) {
    return Object.assign({
        title: "Не приходит SMS с кодом",
        description: "Код подтверждения не приходит второй день",
        client: "Айгерим",
        contact: "+7 701 123-45-67",
        category: "Аккаунт и доступ",
        priority: "high"
    }, extra);
}

const tests = [
    ["T-01", "Создание корректной заявки", () => {
        const { ticket, errors } = L.createTicket(goodData(), [], base);
        assert.strictEqual(errors, null);
        assert.strictEqual(ticket.id, "TK-0001");
        assert.strictEqual(ticket.status, "new");
        assert.strictEqual(ticket.contact, "+77011234567");
        assert.strictEqual(ticket.history.length, 1);
    }],

    ["T-02", "Номер следующей заявки увеличивается", () => {
        const list = [];
        for (let i = 0; i < 3; i++) {
            list.push(L.createTicket(goodData(), list, base).ticket);
        }
        assert.deepStrictEqual(list.map(t => t.id), ["TK-0001", "TK-0002", "TK-0003"]);
    }],

    ["T-03", "Пустые обязательные поля", () => {
        const { ticket, errors } = L.createTicket({ title: "", description: "", client: "", contact: "", category: "", priority: "" }, [], base);
        assert.strictEqual(ticket, null);
        assert.deepStrictEqual(Object.keys(errors).sort(), ["category", "client", "contact", "description", "priority", "title"]);
    }],

    ["T-04", "Неверный email и телефон", () => {
        assert.ok(L.validateTicket(goodData({ contact: "user@mail" })).errors.contact);
        assert.ok(L.validateTicket(goodData({ contact: "12345" })).errors.contact);
        assert.ok(!L.validateTicket(goodData({ contact: "user@mail.kz" })).errors.contact);
    }],

    ["T-05", "Имя клиента с цифрами отклоняется", () => {
        assert.ok(L.validateTicket(goodData({ client: "Ivan123" })).errors.client);
        assert.ok(!L.validateTicket(goodData({ client: "Анна-Мария" })).errors.client);
    }],

    ["T-06", "Граница длины темы: 4, 5, 100 и 101 символ", () => {
        assert.ok(L.validateTicket(goodData({ title: "abcd" })).errors.title);
        assert.ok(!L.validateTicket(goodData({ title: "abcde" })).errors.title);
        assert.ok(!L.validateTicket(goodData({ title: "x".repeat(100) })).errors.title);
        assert.ok(L.validateTicket(goodData({ title: "x".repeat(101) })).errors.title);
    }],

    ["T-07", "Лишние пробелы в тексте убираются", () => {
        const { ticket } = L.createTicket(goodData({ title: "   Ошибка    входа   " }), [], base);
        assert.strictEqual(ticket.title, "Ошибка входа");
    }],

    ["T-08", "Разрешенная смена статуса и запись в историю", () => {
        const t = L.createTicket(goodData(), [], base).ticket;
        assert.ok(L.changeStatus(t, "work", base).ok);
        assert.ok(L.changeStatus(t, "resolved", base).ok);
        assert.strictEqual(t.status, "resolved");
        assert.ok(t.resolvedAt);
        assert.strictEqual(t.history.length, 3);
    }],

    ["T-09", "Запрещенный переход статуса", () => {
        const t = L.createTicket(goodData(), [], base).ticket;
        const res = L.changeStatus(t, "resolved", base);
        assert.strictEqual(res.ok, false);
        assert.strictEqual(t.status, "new");
    }],

    ["T-10", "Закрытую заявку нельзя изменить", () => {
        const t = L.createTicket(goodData(), [], base).ticket;
        L.changeStatus(t, "closed", base);
        assert.strictEqual(L.changeStatus(t, "work", base).ok, false);
        assert.strictEqual(L.changePriority(t, "low", base).ok, false);
        assert.strictEqual(L.addComment(t, "Оператор", "Тест", base).ok, false);
    }],

    ["T-11", "Смена приоритета пишется в историю", () => {
        const t = L.createTicket(goodData(), [], base).ticket;
        assert.ok(L.changePriority(t, "critical", base).ok);
        assert.strictEqual(t.priority, "critical");
        assert.ok(t.history[t.history.length - 1].text.includes("Критический"));
    }],

    ["T-12", "Пустой комментарий не добавляется", () => {
        const t = L.createTicket(goodData(), [], base).ticket;
        assert.strictEqual(L.addComment(t, "Оператор", "   ", base).ok, false);
        assert.ok(L.addComment(t, "Оператор", "Проверили", base).ok);
        assert.strictEqual(t.comments.length, 1);
    }],

    ["T-13", "Поиск по нескольким словам без учета регистра", () => {
        const list = [];
        list.push(L.createTicket(goodData(), list, base).ticket);
        list.push(L.createTicket(goodData({ title: "Двойное списание", client: "Ерлан", category: "Оплата" }), list, base).ticket);
        assert.strictEqual(L.searchTickets(list, "ДВОЙНОЕ ерлан").length, 1);
        assert.strictEqual(L.searchTickets(list, "tk-0002")[0].client, "Ерлан");
        assert.strictEqual(L.searchTickets(list, "").length, 2);
        assert.strictEqual(L.searchTickets(list, "несуществующее").length, 0);
    }],

    ["T-14", "Граница SLA: ровно в срок не просрочено, через минуту просрочено", () => {
        const t = L.createTicket(goodData({ priority: "critical" }), [], base).ticket;
        const deadline = new Date(base.getTime() + 4 * 3600000);
        assert.strictEqual(L.isOverdue(t, deadline), false);
        assert.strictEqual(L.isOverdue(t, new Date(deadline.getTime() + 60000)), true);
        L.changeStatus(t, "work", base);
        L.changeStatus(t, "resolved", base);
        assert.strictEqual(L.isOverdue(t, new Date(deadline.getTime() + 60000)), false);
    }],

    ["T-15", "Фильтр и сортировка по приоритету", () => {
        const list = [];
        for (const p of ["low", "critical", "medium", "high"]) {
            list.push(L.createTicket(goodData({ priority: p }), list, base).ticket);
        }
        assert.deepStrictEqual(L.sortTickets(list, "priority").map(t => t.priority), ["critical", "high", "medium", "low"]);
        assert.strictEqual(L.filterTickets(list, "all", "high").length, 1);
        assert.strictEqual(L.filterTickets(list, "work", "all").length, 0);
    }],

    ["T-16", "Статистика и экспорт CSV", () => {
        const list = [];
        list.push(L.createTicket(goodData(), list, base).ticket);
        list.push(L.createTicket(goodData({ title: 'Ошибка "500"; сайт' }), list, base).ticket);
        L.changeStatus(list[0], "work", base);
        L.changeStatus(list[0], "resolved", new Date(base.getTime() + 2 * 3600000));
        const s = L.getStats(list, base);
        assert.strictEqual(s.total, 2);
        assert.strictEqual(s.open, 1);
        assert.strictEqual(s.avgHours, 2);
        const csv = L.toCSV(list).split("\n");
        assert.strictEqual(csv.length, 3);
        assert.ok(csv[2].includes('"Ошибка ""500""; сайт"'));
    }]
];

let passed = 0;
console.log("ID    | Сценарий | Статус");
for (const [id, name, fn] of tests) {
    try {
        fn();
        passed++;
        console.log(`${id} | ${name} | PASS`);
    } catch (err) {
        console.log(`${id} | ${name} | FAIL — ${err.message}`);
    }
}

console.log(`\nИтого: ${passed} из ${tests.length} пройдено`);
process.exit(passed === tests.length ? 0 : 1);
