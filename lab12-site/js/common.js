const ROLE_NAMES = {
  student: 'Студент',
  teacher: 'Преподаватель'
};

let sessionExpiresAt = null;
let sessionTimerId = null;
let sessionEnded = false;

async function api(method, url, body, options = {}) {
  const res = await Server.request(method, url, body);

  const expires = res.headers['X-Session-Expires'];
  if (expires) sessionExpiresAt = new Date(expires).getTime();

  if (res.status === 401 && !options.skipRedirect) {
    location.href = 'index.html?reason=ended';
    return new Promise(() => {});
  }

  return res;
}

async function guardPage(route) {
  const res = await Server.request('GET', route);
  if (res.status === 401) {
    location.replace('index.html?reason=auth');
    return false;
  }
  if (res.status === 403) {
    location.replace('403.html');
    return false;
  }
  if (res.data.redirect) {
    location.replace(res.data.redirect);
    return false;
  }
  document.body.classList.remove('guard');
  return true;
}

function $(selector) {
  return document.querySelector(selector);
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

function formatDate(value) {
  const d = new Date(value);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(value) {
  const d = new Date(value);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function showToast(text, type) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = text;
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.hidden = false;
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}

function askConfirm(text) {
  const modal = $('#modal');
  $('#modal-text').textContent = text;
  modal.hidden = false;
  return new Promise(resolve => {
    const done = value => {
      modal.hidden = true;
      $('#modal-ok').onclick = null;
      $('#modal-cancel').onclick = null;
      resolve(value);
    };
    $('#modal-ok').onclick = () => done(true);
    $('#modal-cancel').onclick = () => done(false);
  });
}

function renderTimer() {
  if (!sessionExpiresAt || sessionEnded) return;
  const left = Math.max(0, Math.round((sessionExpiresAt - Date.now()) / 1000));
  const min = String(Math.floor(left / 60)).padStart(2, '0');
  const sec = String(left % 60).padStart(2, '0');
  $('#session-timer').textContent = `${min}:${sec}`;

  const warn = left <= 30;
  $('#session-box').classList.toggle('warn', warn);
  $('#extend-btn').hidden = !warn;

  if (left === 0) {
    sessionEnded = true;
    clearInterval(sessionTimerId);
    $('#expired').hidden = false;
    setTimeout(() => {
      location.href = 'index.html?reason=expired';
    }, 2500);
  }
}

function startSessionTimer() {
  renderTimer();
  sessionTimerId = setInterval(renderTimer, 1000);
  $('#extend-btn').addEventListener('click', async () => {
    await api('GET', '/api/me');
    renderTimer();
    showToast('Сессия продлена');
  });
}

function watchOtherTabs() {
  window.addEventListener('storage', async e => {
    if (e.key !== Server.DB_KEY || sessionEnded) return;
    const res = await api('GET', '/api/session-check');
    $('#p-sessions').textContent = res.data.activeSessions;
  });
}

function fillHeader(user) {
  $('#user-name').textContent = user.name;
  const role = $('#user-role');
  role.textContent = ROLE_NAMES[user.role] || user.role;
  role.classList.toggle('teacher', user.role === 'teacher');
}

function fillProfile(me) {
  $('#p-name').textContent = me.user.name;
  $('#p-login').textContent = me.user.login;
  if ($('#p-group')) $('#p-group').textContent = me.user.group || '—';
  $('#p-login-at').textContent = formatDateTime(me.loginAt);
  $('#p-sessions').textContent = me.activeSessions;
}

function bindLogout() {
  $('#logout-btn').addEventListener('click', async () => {
    const yes = await askConfirm('Выйти из системы?');
    if (!yes) return;
    await api('POST', '/api/logout', null, { skipRedirect: true });
    location.href = 'index.html?reason=logout';
  });

  $('#logout-all-btn').addEventListener('click', async () => {
    const yes = await askConfirm('Завершить сессии на всех устройствах? Потребуется войти заново везде.');
    if (!yes) return;
    await api('POST', '/api/logout-all', null, { skipRedirect: true });
    location.href = 'index.html?reason=all';
  });
}

function renderLessons(lessons) {
  const body = $('#lessons-body');
  body.innerHTML = '';
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  lessons
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(l => {
      const tr = document.createElement('tr');
      if (l.date === today) tr.classList.add('today');
      tr.append(cell(formatDate(l.date)), cell(l.title), cell(l.room));
      body.append(tr);
    });
}

async function initProtectedPage(route) {
  const allowed = await guardPage(route);
  if (!allowed) return null;
  const me = await api('GET', '/api/me');
  fillHeader(me.data.user);
  fillProfile(me.data);
  bindLogout();
  startSessionTimer();
  watchOtherTabs();
  return me.data;
}
