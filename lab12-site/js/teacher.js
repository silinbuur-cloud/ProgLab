async function loadStudents() {
  const res = await api('GET', '/api/teacher/students');
  const body = $('#students-body');
  body.innerHTML = '';

  res.data.students.forEach(s => {
    const tr = document.createElement('tr');
    const actions = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'btn btn-light btn-small';
    btn.textContent = 'Оценки';
    btn.addEventListener('click', () => showStudentGrades(s.id));
    actions.append(btn);
    tr.append(cell(s.name), cell(s.group), cell(s.average ?? '—'), actions);
    body.append(tr);
  });
}

async function showStudentGrades(id) {
  const res = await api('GET', `/api/students/${id}/grades`);
  if (!res.ok) {
    showToast(res.data.error, 'error');
    return;
  }

  $('#sg-title').textContent = `Оценки: ${res.data.student.name}`;
  const list = $('#sg-list');
  list.innerHTML = '';
  res.data.grades.forEach(g => {
    const li = document.createElement('li');
    li.textContent = `${g.lesson} — ${g.score}`;
    list.append(li);
  });
  $('#student-grades').hidden = false;
}

async function loadLessons() {
  const res = await api('GET', '/api/lessons');
  renderLessons(res.data.lessons);
}

function setLessonMsg(type, text) {
  const msg = $('#lesson-msg');
  msg.className = 'form-msg ' + type;
  msg.textContent = text;
}

$('#lesson-form').addEventListener('submit', async e => {
  e.preventDefault();
  const date = $('#l-date').value;
  const title = $('#l-title').value.trim();
  const room = $('#l-room').value.trim();

  if (!date || !title || !room) {
    setLessonMsg('error', 'Заполните дату, тему и аудиторию');
    return;
  }

  const res = await api('POST', '/api/lessons', { date, title, room });

  if (!res.ok) {
    setLessonMsg('error', res.data.error);
    return;
  }

  setLessonMsg('success', `Занятие «${res.data.lesson.title}» добавлено`);
  e.target.reset();
  loadLessons();
});

async function initTeacher() {
  const me = await initProtectedPage('/page/teacher');
  if (!me) return;
  await Promise.all([loadStudents(), loadLessons()]);
}

initTeacher();
