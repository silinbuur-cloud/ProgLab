const Server = (() => {
  const TTL_SECONDS = 120;
  const MAX_FAILS = 5;
  const LOCK_MS = 60 * 1000;
  const DB_KEY = 'lab12_server_db';
  const SID_KEY = 'lab12_sid';

  const users = [
    { id: 1, login: 'student1', name: 'Алия Серикова', role: 'student', group: 'ИС 26-21', salt: 'f7afc9349269656d', hash: 'e56d1c982525a2ac4daa49ed9102343d490b24d241060e09fff3ed5d680771ce' },
    { id: 2, login: 'student2', name: 'Ерлан Асанов', role: 'student', group: 'ИС 26-21', salt: '41f1ebd126d7e999', hash: 'e356248b445624997d50e1249c623852159dcad72856fb5269f6b1fe6e0f5a99' },
    { id: 3, login: 'teacher1', name: 'Марат Ахметов', role: 'teacher', group: null, salt: '06e4f38b0caae697', hash: '9655fddcc7585cae7f97849aaf7450158bbf7335dfca3bd699f796da068f70f7' }
  ];

  const DUMMY = { salt: 'e00ed0364733df89', hash: 'faf49af81f6a0c16849808ebd559abb883306956173c21cc1c8b51d59af3ea53' };

  const defaultLessons = [
    { id: 1, date: '2026-11-04', title: 'Лабораторная 10. Работа с REST API', room: '305' },
    { id: 2, date: '2026-11-11', title: 'Лабораторная 11. Хранение данных на клиенте', room: '305' },
    { id: 3, date: '2026-11-18', title: 'Лабораторная 12. JWT, OAuth и сессии', room: '305' },
    { id: 4, date: '2026-11-25', title: 'Лабораторная 13. Тестирование веб-приложений', room: '412' }
  ];

  const grades = {
    1: [{ lessonId: 1, score: 92 }, { lessonId: 2, score: 88 }],
    2: [{ lessonId: 1, score: 75 }, { lessonId: 2, score: 81 }]
  };

  function sha256(text) {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const bytes = Array.from(new TextEncoder().encode(text));
    const bitLength = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (bitLength >>> (i * 8)) & 0xff);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let i = 0; i < bytes.length; i += 64) {
      const w = new Array(64);
      for (let t = 0; t < 16; t++) {
        w[t] = (bytes[i + t * 4] << 24) | (bytes[i + t * 4 + 1] << 16) | (bytes[i + t * 4 + 2] << 8) | bytes[i + t * 4 + 3];
      }
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[t] + w[t]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }

  function safeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  const memory = { local: {}, session: {} };

  function storage(kind) {
    const real = kind === 'local' ? 'localStorage' : 'sessionStorage';
    return {
      get(key) {
        try {
          return window[real].getItem(key);
        } catch (e) {
          return key in memory[kind] ? memory[kind][key] : null;
        }
      },
      set(key, value) {
        try {
          window[real].setItem(key, value);
        } catch (e) {
          memory[kind][key] = value;
        }
      },
      remove(key) {
        try {
          window[real].removeItem(key);
        } catch (e) {
          delete memory[kind][key];
        }
      }
    };
  }

  const serverStore = storage('local');
  const cookieStore = storage('session');

  function loadDb() {
    try {
      const db = JSON.parse(serverStore.get(DB_KEY));
      if (db && db.sessions) return db;
    } catch (e) {}
    return { sessions: {}, fails: {}, lessons: defaultLessons.slice(), nextLessonId: defaultLessons.length + 1 };
  }

  function saveDb(db) {
    const json = JSON.stringify(db);
    if (serverStore.get(DB_KEY) !== json) serverStore.set(DB_KEY, json);
  }

  function readCookie() {
    return cookieStore.get(SID_KEY);
  }

  function setCookie(sid) {
    cookieStore.set(SID_KEY, sid);
  }

  function clearCookie() {
    cookieStore.remove(SID_KEY);
  }

  function newSid() {
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  }

  function publicUser(u) {
    return { id: u.id, login: u.login, name: u.name, role: u.role, group: u.group };
  }

  function findUser(id) {
    return users.find(u => u.id === id) || null;
  }

  function reply(status, data, headers = {}) {
    return { status, ok: status >= 200 && status < 300, data, headers };
  }

  function removeExpired(db) {
    const now = Date.now();
    Object.keys(db.sessions).forEach(sid => {
      if (db.sessions[sid].expiresAt <= now) delete db.sessions[sid];
    });
  }

  function auth(ctx, touch = true) {
    const sid = readCookie();
    const session = sid ? ctx.db.sessions[sid] : null;
    if (!session) {
      if (sid) clearCookie();
      return { error: reply(401, { error: 'Требуется вход в систему' }) };
    }
    if (touch) session.expiresAt = Date.now() + TTL_SECONDS * 1000;
    ctx.headers['X-Session-Expires'] = new Date(session.expiresAt).toISOString();
    return { sid, session, user: publicUser(findUser(session.userId)) };
  }

  function forbidden(text) {
    return reply(403, { error: text || 'Недостаточно прав для этого действия' });
  }

  function gradesOf(db, studentId) {
    return (grades[studentId] || []).map(g => {
      const lesson = db.lessons.find(l => l.id === g.lessonId);
      return { lesson: lesson ? lesson.title : '—', score: g.score };
    });
  }

  function average(studentId) {
    const list = grades[studentId] || [];
    if (!list.length) return null;
    return Math.round(list.reduce((s, g) => s + g.score, 0) / list.length);
  }

  function countSessions(db, userId) {
    return Object.values(db.sessions).filter(s => s.userId === userId).length;
  }

  const routes = [
    ['POST', /^\/api\/login$/, ctx => {
      const login = String(ctx.body.login || '').trim();
      const password = String(ctx.body.password || '');
      if (!login || !password) return reply(400, { error: 'Заполните логин и пароль' });

      const lock = ctx.db.fails[login];
      if (lock && lock.until > Date.now()) {
        const left = Math.ceil((lock.until - Date.now()) / 1000);
        return reply(429, { error: `Слишком много попыток. Повторите через ${left} с` });
      }

      const user = users.find(u => u.login === login);
      const record = user || DUMMY;
      const ok = safeEqual(sha256(record.salt + password), record.hash);

      if (!user || !ok) {
        const entry = ctx.db.fails[login] || { count: 0, until: 0 };
        entry.count++;
        if (entry.count >= MAX_FAILS) {
          entry.count = 0;
          entry.until = Date.now() + LOCK_MS;
        }
        ctx.db.fails[login] = entry;
        return reply(401, { error: 'Неверный логин или пароль' });
      }

      delete ctx.db.fails[login];
      const oldSid = readCookie();
      if (oldSid) delete ctx.db.sessions[oldSid];

      const sid = newSid();
      const now = Date.now();
      ctx.db.sessions[sid] = { userId: user.id, loginAt: now, expiresAt: now + TTL_SECONDS * 1000 };
      setCookie(sid);

      return reply(200, {
        message: `Добро пожаловать, ${user.name}`,
        user: publicUser(user),
        redirect: user.role === 'teacher' ? 'teacher.html' : 'cabinet.html'
      });
    }],

    ['POST', /^\/api\/logout$/, ctx => {
      const sid = readCookie();
      if (sid) delete ctx.db.sessions[sid];
      clearCookie();
      return reply(200, { message: 'Вы вышли из системы' });
    }],

    ['POST', /^\/api\/logout-all$/, ctx => {
      const a = auth(ctx);
      if (a.error) return a.error;
      let count = 0;
      Object.keys(ctx.db.sessions).forEach(sid => {
        if (ctx.db.sessions[sid].userId === a.user.id) {
          delete ctx.db.sessions[sid];
          count++;
        }
      });
      clearCookie();
      return reply(200, { message: `Завершено сессий: ${count}` });
    }],

    ['GET', /^\/page\/cabinet$/, ctx => {
      const a = auth(ctx);
      if (a.error) return a.error;
      if (a.user.role !== 'student') return reply(200, { redirect: 'teacher.html' });
      return reply(200, { ok: true });
    }],

    ['GET', /^\/page\/teacher$/, ctx => {
      const a = auth(ctx);
      if (a.error) return a.error;
      if (a.user.role !== 'teacher') return forbidden('Страница доступна только преподавателю');
      return reply(200, { ok: true });
    }],

    ['GET', /^\/api\/me$/, ctx => {
      const a = auth(ctx);
      if (a.error) return a.error;
      return reply(200, {
        user: a.user,
        loginAt: new Date(a.session.loginAt).toISOString(),
        expiresAt: new Date(a.session.expiresAt).toISOString(),
        ttl: TTL_SECONDS,
        activeSessions: countSessions(ctx.db, a.user.id)
      });
    }],

    ['GET', /^\/api\/session-check$/, ctx => {
      const a = auth(ctx, false);
      if (a.error) return a.error;
      return reply(200, { activeSessions: countSessions(ctx.db, a.user.id) });
    }],

    ['GET', /^\/api\/lessons$/, ctx => {
      const a = auth(ctx);
      if (a.error) return a.error;
      return reply(200, { lessons: ctx.db.lessons });
    }],

    ['POST', /^\/api\/lessons$/, ctx => {
      const a = auth(ctx);
      if (a.error) return a.error;
      if (a.user.role !== 'teacher') return forbidden();

      const title = String(ctx.body.title || '').trim();
      const date = String(ctx.body.date || '').trim();
      const room = String(ctx.body.room || '').trim();

      if (!title || !date || !room) return reply(400, { error: 'Заполните тему, дату и аудиторию' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply(400, { error: 'Дата должна быть в формате ГГГГ-ММ-ДД' });
      if (title.length > 120 || room.length > 10) return reply(400, { error: 'Слишком длинное значение' });

      const lesson = { id: ctx.db.nextLessonId++, date, title, room };
      ctx.db.lessons.push(lesson);
      return reply(201, { lesson });
    }],

    ['GET', /^\/api\/students\/(\d+)\/grades$/, ctx => {
      const a = auth(ctx);
      if (a.error) return a.error;
      const id = Number(ctx.params[0]);
      if (a.user.role === 'student' && a.user.id !== id) {
        return forbidden('Нельзя просматривать оценки другого студента');
      }
      const student = findUser(id);
      if (!student || student.role !== 'student') return reply(404, { error: 'Студент не найден' });
      return reply(200, { student: publicUser(student), grades: gradesOf(ctx.db, id), average: average(id) });
    }],

    ['GET', /^\/api\/teacher\/students$/, ctx => {
      const a = auth(ctx);
      if (a.error) return a.error;
      if (a.user.role !== 'teacher') return forbidden();
      const list = users.filter(u => u.role === 'student').map(u => ({ ...publicUser(u), average: average(u.id) }));
      return reply(200, { students: list });
    }]
  ];

  function handle(method, url, body) {
    const db = loadDb();
    removeExpired(db);
    const ctx = { db, body: body || {}, params: [], headers: {} };
    let res = null;

    for (const [m, pattern, handler] of routes) {
      if (m !== method) continue;
      const match = url.match(pattern);
      if (match) {
        ctx.params = match.slice(1);
        res = handler(ctx);
        break;
      }
    }

    if (!res) res = reply(404, { error: 'Маршрут не найден' });
    res.headers = { ...ctx.headers, ...res.headers };
    saveDb(db);
    console.log(`[server] ${method} ${url} → ${res.status}`);
    return res;
  }

  function request(method, url, body) {
    return new Promise(resolve => {
      setTimeout(() => resolve(handle(method, url, body)), 150);
    });
  }

  return { request, DB_KEY };
})();
