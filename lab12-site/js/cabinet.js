async function loadGrades(studentId) {
  const res = await api('GET', `/api/students/${studentId}/grades`);
  const body = $('#grades-body');
  body.innerHTML = '';

  if (!res.ok) {
    showToast(res.data.error, 'error');
    return;
  }

  if (!res.data.grades.length) {
    const tr = document.createElement('tr');
    const td = cell('Оценок пока нет');
    td.colSpan = 2;
    tr.append(td);
    body.append(tr);
  }

  res.data.grades.forEach(g => {
    const tr = document.createElement('tr');
    tr.append(cell(g.lesson), cell(g.score));
    body.append(tr);
  });

  $('#grades-avg').textContent = res.data.average ?? '—';
}

async function initCabinet() {
  const me = await initProtectedPage('/page/cabinet');
  if (!me) return;
  const lessons = await api('GET', '/api/lessons');
  renderLessons(lessons.data.lessons);
  await loadGrades(me.user.id);
}

initCabinet();
