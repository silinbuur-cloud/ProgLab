const REASONS = {
  auth: ['info', 'Войдите, чтобы открыть эту страницу'],
  ended: ['info', 'Сессия завершена. Войдите снова'],
  expired: ['info', 'Время сессии истекло. Войдите снова'],
  logout: ['success', 'Вы вышли из системы'],
  all: ['success', 'Вы вышли из системы на всех устройствах']
};

const form = $('#login-form');
const loginInput = $('#login');
const passwordInput = $('#password');
const submitBtn = $('#submit');
const notice = $('#notice');

function showNotice(type, text) {
  notice.className = 'notice ' + type;
  notice.textContent = text;
  notice.hidden = false;
}

function setFieldError(input, text) {
  $('#' + input.id + '-error').textContent = text;
  input.classList.toggle('invalid', Boolean(text));
}

async function checkLoggedIn() {
  const res = await api('GET', '/api/me', null, { skipRedirect: true });
  if (res.ok) {
    location.replace(res.data.user.role === 'teacher' ? 'teacher.html' : 'cabinet.html');
  }
}

const reason = new URLSearchParams(location.search).get('reason');
if (REASONS[reason]) {
  showNotice(...REASONS[reason]);
  history.replaceState(null, '', location.pathname);
}

checkLoggedIn();

$('#toggle-password').addEventListener('click', e => {
  const hidden = passwordInput.type === 'password';
  passwordInput.type = hidden ? 'text' : 'password';
  e.target.textContent = hidden ? 'Скрыть' : 'Показать';
});

[loginInput, passwordInput].forEach(input => {
  input.addEventListener('input', () => setFieldError(input, ''));
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  notice.hidden = true;

  const login = loginInput.value.trim();
  const password = passwordInput.value;

  setFieldError(loginInput, login ? '' : 'Введите логин');
  setFieldError(passwordInput, password ? '' : 'Введите пароль');

  if (!login || !password) {
    showNotice('error', 'Заполните логин и пароль');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Проверка...';

  const res = await api('POST', '/api/login', { login, password }, { skipRedirect: true });

  submitBtn.disabled = false;
  submitBtn.textContent = 'Войти';

  if (!res.ok) {
    showNotice('error', res.data.error || 'Ошибка входа');
    passwordInput.value = '';
    passwordInput.focus();
    return;
  }

  showNotice('success', res.data.message);
  setTimeout(() => {
    location.href = res.data.redirect;
  }, 700);
});
