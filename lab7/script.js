const cafeTabs = document.querySelectorAll("#cafeApp .tab");
const cafeContent = document.getElementById("cafeContent");

const menu = [
    { name: "Капучино", category: "Напитки", price: 1200, emoji: "☕", desc: "Эспрессо с молочной пенкой" },
    { name: "Зеленый чай", category: "Напитки", price: 800, emoji: "🍵", desc: "Чайник на 0,5 л" },
    { name: "Лимонад", category: "Напитки", price: 1100, emoji: "🍋", desc: "Домашний, с мятой" },
    { name: "Цезарь", category: "Еда", price: 2600, emoji: "🥗", desc: "Салат с курицей и сухариками" },
    { name: "Паста карбонара", category: "Еда", price: 3200, emoji: "🍝", desc: "Сливочный соус, бекон" },
    { name: "Чизкейк", category: "Десерты", price: 1500, emoji: "🍰", desc: "Классический нью-йорк" },
    { name: "Круассан", category: "Десерты", price: 900, emoji: "🥐", desc: "С шоколадом или без" }
];

const sales = [
    { title: "Кофе + круассан", text: "Утром до 11:00 комбо за 1 700 ₸", oldPrice: 2100, price: 1700 },
    { title: "Счастливые часы", text: "С 15:00 до 17:00 все десерты", oldPrice: 1500, price: 1200 },
    { title: "Студентам", text: "Скидка 10% по студенческому билету", oldPrice: null, price: null }
];

const cafeInfo = {
    address: "г. Алматы, ул. Абая, 52",
    hours: "Ежедневно 08:00 – 22:00",
    phone: "+7 (727) 123-45-67",
    wifi: "Пароль от Wi-Fi спросите у бариста"
};

let cafeCategory = "Все";

function showMenu() {
    cafeContent.innerHTML = "";

    const filter = document.createElement("div");
    filter.className = "filter";

    const categories = ["Все", "Напитки", "Еда", "Десерты"];
    for (const cat of categories) {
        const chip = document.createElement("button");
        chip.className = "chip";
        chip.textContent = cat;
        if (cat === cafeCategory) chip.classList.add("active");

        chip.addEventListener("click", () => {
            cafeCategory = cat;
            showMenu();
        });

        filter.appendChild(chip);
    }

    const grid = document.createElement("div");
    grid.className = "grid";

    for (const dish of menu) {
        if (cafeCategory !== "Все" && dish.category !== cafeCategory) continue;

        const card = document.createElement("div");
        card.className = "card";

        const emoji = document.createElement("div");
        emoji.className = "emoji";
        emoji.textContent = dish.emoji;

        const title = document.createElement("h3");
        title.textContent = dish.name;

        const desc = document.createElement("div");
        desc.className = "desc";
        desc.textContent = dish.desc;

        const price = document.createElement("div");
        price.className = "price";
        price.textContent = dish.price.toLocaleString("ru-RU") + " ₸";

        card.append(emoji, title, desc, price);
        grid.appendChild(card);
    }

    cafeContent.append(filter, grid);
}

function showSales() {
    cafeContent.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "grid";

    sales.forEach(sale => {
        const card = document.createElement("div");
        card.className = "card";

        const title = document.createElement("h3");
        title.textContent = "🔥 " + sale.title;

        const text = document.createElement("div");
        text.className = "desc";
        text.textContent = sale.text;

        card.append(title, text);

        if (sale.price) {
            const price = document.createElement("div");
            price.className = "price";
            price.textContent = sale.price.toLocaleString("ru-RU") + " ₸";

            const old = document.createElement("span");
            old.className = "old-price";
            old.textContent = sale.oldPrice.toLocaleString("ru-RU") + " ₸";

            price.appendChild(old);
            card.appendChild(price);
        }

        grid.appendChild(card);
    });

    cafeContent.appendChild(grid);
}

function showAddress() {
    cafeContent.innerHTML = "";

    const list = document.createElement("ul");
    list.className = "info-list";

    const rows = [
        ["📍 Адрес", cafeInfo.address],
        ["🕗 Время работы", cafeInfo.hours],
        ["📞 Телефон", cafeInfo.phone],
        ["📶 Wi-Fi", cafeInfo.wifi]
    ];

    for (const [label, value] of rows) {
        const li = document.createElement("li");
        const b = document.createElement("b");
        b.textContent = label + ": ";
        li.append(b, value);
        list.appendChild(li);
    }

    cafeContent.appendChild(list);
}

function openCafeTab(name) {
    cafeTabs.forEach(tab => {
        tab.classList.toggle("active", tab.dataset.tab === name);
    });

    if (name === "menu") showMenu();
    else if (name === "sales") showSales();
    else showAddress();

    try {
        localStorage.setItem("cafeTab", name);
    } catch (e) {}
}

cafeTabs.forEach(tab => {
    tab.addEventListener("click", () => openCafeTab(tab.dataset.tab));
});

let savedCafeTab = "menu";
try {
    savedCafeTab = localStorage.getItem("cafeTab") || "menu";
} catch (e) {}
openCafeTab(savedCafeTab);



const booksTabs = document.querySelectorAll("#booksApp .tab");
const booksContent = document.getElementById("booksContent");
const favBadge = document.getElementById("favBadge");

const books = [
    { id: 1, title: "Абай жолы", author: "Мухтар Ауэзов", year: 1942 },
    { id: 2, title: "Мастер и Маргарита", author: "Михаил Булгаков", year: 1967 },
    { id: 3, title: "Преступление и наказание", author: "Фёдор Достоевский", year: 1866 },
    { id: 4, title: "1984", author: "Джордж Оруэлл", year: 1949 },
    { id: 5, title: "Маленький принц", author: "Антуан де Сент-Экзюпери", year: 1943 },
    { id: 6, title: "Кочевники", author: "Ильяс Есенберлин", year: 1976 },
    { id: 7, title: "Чистый код", author: "Роберт Мартин", year: 2008 }
];

let favorites = [];
let searchText = "";
let currentBooksTab = "catalog";

function isFavorite(id) {
    return favorites.includes(id);
}

function toggleFavorite(id) {
    if (isFavorite(id)) {
        favorites = favorites.filter(f => f !== id);
    } else {
        favorites.push(id);
    }

    favBadge.textContent = favorites.length;
    openBooksTab(currentBooksTab);
}

function makeBookCard(book) {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = book.title;

    const info = document.createElement("div");
    info.className = "desc";
    info.textContent = `${book.author}, ${book.year}`;

    const btn = document.createElement("button");
    btn.className = "action";

    if (isFavorite(book.id)) {
        btn.textContent = currentBooksTab === "favorites" ? "Убрать" : "★ В избранном";
        btn.classList.add(currentBooksTab === "favorites" ? "red" : "added");
    } else {
        btn.textContent = "☆ В избранное";
    }

    btn.addEventListener("click", () => toggleFavorite(book.id));

    card.append(title, info, btn);
    return card;
}

function showCatalog() {
    booksContent.innerHTML = "";

    const search = document.createElement("input");
    search.className = "search";
    search.placeholder = "Поиск по названию или автору...";
    search.value = searchText;

    const grid = document.createElement("div");
    grid.className = "grid";

    function fillGrid() {
        grid.innerHTML = "";
        const q = searchText.toLowerCase();
        let found = 0;

        for (const book of books) {
            const match = book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q);
            if (!match) continue;

            grid.appendChild(makeBookCard(book));
            found++;
        }

        if (found === 0) {
            const p = document.createElement("p");
            p.className = "empty";
            p.textContent = "Ничего не найдено";
            grid.appendChild(p);
        }
    }

    search.addEventListener("input", () => {
        searchText = search.value.trim();
        fillGrid();
    });

    fillGrid();
    booksContent.append(search, grid);
}

function showFavorites() {
    booksContent.innerHTML = "";

    if (favorites.length === 0) {
        const p = document.createElement("p");
        p.className = "empty";
        p.textContent = "В избранном пока пусто. Добавьте книги из каталога.";
        booksContent.appendChild(p);
        return;
    }

    const grid = document.createElement("div");
    grid.className = "grid";

    for (const id of favorites) {
        const book = books.find(b => b.id === id);
        grid.appendChild(makeBookCard(book));
    }

    booksContent.appendChild(grid);
}

function showLibrary() {
    booksContent.innerHTML = "";

    const p = document.createElement("p");
    p.textContent = "Городская библиотека работает с 1975 года. В фонде более 40 000 книг на казахском, русском и английском языках.";

    const list = document.createElement("ul");
    list.className = "info-list";

    const facts = [
        `Книг в онлайн-каталоге: ${books.length}`,
        `У вас в избранном: ${favorites.length}`,
        "Читальный зал: пн–сб, 09:00 – 19:00",
        "Абонемент для студентов бесплатный"
    ];

    for (const fact of facts) {
        const li = document.createElement("li");
        li.textContent = fact;
        list.appendChild(li);
    }

    booksContent.append(p, list);
}

function openBooksTab(name) {
    currentBooksTab = name;

    booksTabs.forEach(tab => {
        tab.classList.toggle("active", tab.dataset.tab === name);
    });

    if (name === "catalog") showCatalog();
    else if (name === "favorites") showFavorites();
    else showLibrary();
}

booksTabs.forEach(tab => {
    tab.addEventListener("click", () => openBooksTab(tab.dataset.tab));
});

openBooksTab("catalog");



const ordersTabs = document.querySelectorAll("#ordersApp .tab");
const ordersContent = document.getElementById("ordersContent");
const orderForm = document.getElementById("orderForm");
const clientInput = document.getElementById("clientInput");
const itemInput = document.getElementById("itemInput");
const sumInput = document.getElementById("sumInput");
const orderError = document.getElementById("orderError");

const counters = {
    new: document.getElementById("countNew"),
    work: document.getElementById("countWork"),
    done: document.getElementById("countDone")
};

let orders = [
    { id: 101, client: "Айгерим", item: "Пицца Маргарита", sum: 3500, status: "new", time: "12:05" },
    { id: 102, client: "Ерлан", item: "Бургер и картошка", sum: 2800, status: "work", time: "11:50" },
    { id: 103, client: "Дана", item: "Суши сет", sum: 6200, status: "done", time: "11:20" }
];
let nextOrderId = 104;
let currentOrdersTab = "new";

function updateCounters() {
    const count = { new: 0, work: 0, done: 0 };

    for (const order of orders) {
        count[order.status]++;
    }

    for (const key in counters) {
        counters[key].textContent = count[key];
    }
}

function changeStatus(id, status) {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    order.status = status;
    renderOrders();
}

function deleteOrder(id) {
    if (!confirm("Удалить этот заказ?")) return;

    orders = orders.filter(o => o.id !== id);
    renderOrders();
}

function makeButton(text, className, onClick) {
    const btn = document.createElement("button");
    btn.className = "action " + className;
    btn.textContent = text;
    btn.addEventListener("click", onClick);
    return btn;
}

function renderOrders() {
    updateCounters();
    ordersContent.innerHTML = "";

    const list = orders.filter(o => o.status === currentOrdersTab);

    if (list.length === 0) {
        const p = document.createElement("p");
        p.className = "empty";
        p.textContent = "Заказов в этом разделе нет";
        ordersContent.appendChild(p);
        return;
    }

    let total = 0;

    for (const order of list) {
        total += order.sum;

        const div = document.createElement("div");
        div.className = "order " + order.status;

        const info = document.createElement("div");

        const title = document.createElement("b");
        title.textContent = `#${order.id} — ${order.client}`;

        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = `${order.item} • ${order.sum.toLocaleString("ru-RU")} ₸ • ${order.time}`;

        info.append(title, meta);

        const buttons = document.createElement("div");
        buttons.className = "buttons";

        if (order.status === "new") {
            buttons.append(makeButton("В работу →", "", () => changeStatus(order.id, "work")));
        } else if (order.status === "work") {
            buttons.append(makeButton("← Назад", "", () => changeStatus(order.id, "new")));
            buttons.append(makeButton("Готово ✓", "green", () => changeStatus(order.id, "done")));
        } else {
            buttons.append(makeButton("Вернуть в работу", "", () => changeStatus(order.id, "work")));
        }

        buttons.append(makeButton("✕", "red", () => deleteOrder(order.id)));

        div.append(info, buttons);
        ordersContent.appendChild(div);
    }

    const summary = document.createElement("p");
    summary.className = "summary";
    summary.textContent = `Заказов: ${list.length}, на сумму ${total.toLocaleString("ru-RU")} ₸`;
    ordersContent.appendChild(summary);
}

function openOrdersTab(name) {
    currentOrdersTab = name;

    ordersTabs.forEach(tab => {
        tab.classList.toggle("active", tab.dataset.tab === name);
    });

    renderOrders();
}

ordersTabs.forEach(tab => {
    tab.addEventListener("click", () => openOrdersTab(tab.dataset.tab));
});

orderForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const client = clientInput.value.trim();
    const item = itemInput.value.trim();
    const sum = Number(sumInput.value);

    [clientInput, itemInput, sumInput].forEach(input => input.classList.remove("invalid"));

    if (client.length < 2) {
        orderError.textContent = "Введите имя клиента (минимум 2 буквы)";
        clientInput.classList.add("invalid");
        return;
    }

    if (item === "") {
        orderError.textContent = "Укажите, что заказал клиент";
        itemInput.classList.add("invalid");
        return;
    }

    if (!sumInput.value || sum <= 0) {
        orderError.textContent = "Сумма должна быть больше нуля";
        sumInput.classList.add("invalid");
        return;
    }

    const now = new Date();
    const time = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

    orders.push({ id: nextOrderId++, client, item, sum, status: "new", time });

    orderError.textContent = "";
    orderForm.reset();
    openOrdersTab("new");
});

openOrdersTab("new");