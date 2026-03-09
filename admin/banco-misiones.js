// ============================================
// ARCHIVO: /admin/banco-misiones.js
// DESCRIPCIÓN: Centro de control total del banco de misiones
// DEPENDENCIA: ../shared/shared.js cargado antes
// ============================================

// ============================================
// CATÁLOGO PREDEFINIDO — ~75 misiones
// Se usa para poblar la BD desde cero con el btn "Poblar Catálogo"
// ============================================
var CATALOGO_PREDEFINIDO = [
  // ---- JUEGOS: Jugar X juegos diferentes ----
  { tipo: 'jugar_1_juego', descripcion: 'Jugar 1 juego educativo hoy', icono: '🎮', categoria: 'juego', dificultad: 1, recompensa_base: 50, recompensa_xp: 25, url_destino: '../juegos/juegos.html', peso_sorteo: 8, limite_semanal: 5 },
  { tipo: 'jugar_2_juegos', descripcion: 'Jugar 2 juegos diferentes hoy', icono: '🎮', categoria: 'juego', dificultad: 2, recompensa_base: 80, recompensa_xp: 40, url_destino: '../juegos/juegos.html', peso_sorteo: 6, limite_semanal: 4 },
  { tipo: 'jugar_3_juegos', descripcion: 'Jugar 3 juegos diferentes hoy', icono: '🎮', categoria: 'juego', dificultad: 3, recompensa_base: 120, recompensa_xp: 60, url_destino: '../juegos/juegos.html', peso_sorteo: 4, limite_semanal: 3 },

  // ---- JUEGO: TRIVIA ----
  { tipo: 'trivia_completar', descripcion: 'Completar una partida de Trivia', icono: '❓', categoria: 'juego', dificultad: 1, recompensa_base: 60, recompensa_xp: 30, url_destino: '../juegos/trivia/trivia.html', peso_sorteo: 7, limite_semanal: 4 },
  { tipo: 'trivia_chile', descripcion: 'Responder 5 preguntas de Trivia Chile', icono: '🇨🇱', categoria: 'juego', dificultad: 2, recompensa_base: 80, recompensa_xp: 40, url_destino: '../juegos/trivia/trivia.html', peso_sorteo: 5, limite_semanal: 3 },
  { tipo: 'trivia_sin_errores', descripcion: 'Completar trivia sin errores', icono: '🏆', categoria: 'juego', dificultad: 3, recompensa_base: 150, recompensa_xp: 75, url_destino: '../juegos/trivia/trivia.html', peso_sorteo: 3, limite_semanal: 2 },

  // ---- JUEGO: MEMORIA ----
  { tipo: 'memoria_completar', descripcion: 'Completar el juego de Memoria', icono: '🃏', categoria: 'juego', dificultad: 1, recompensa_base: 70, recompensa_xp: 35, url_destino: '../juegos/memoria/memoria.html', peso_sorteo: 6, limite_semanal: 4 },
  { tipo: 'memoria_rapido', descripcion: 'Completar Memoria en menos de 60 seg', icono: '⚡', categoria: 'juego', dificultad: 3, recompensa_base: 140, recompensa_xp: 70, url_destino: '../juegos/memoria/memoria.html', peso_sorteo: 3, limite_semanal: 2 },

  // ---- JUEGO: SINÓNIMOS ----
  { tipo: 'sinonimos_completar', descripcion: 'Completar el juego de Sinónimos', icono: '🔤', categoria: 'juego', dificultad: 1, recompensa_base: 60, recompensa_xp: 30, url_destino: '../juegos/sinonimos/sinonimos.html', peso_sorteo: 6, limite_semanal: 4 },
  { tipo: 'sinonimos_racha', descripcion: 'Conseguir racha de 5 en Sinónimos', icono: '🔥', categoria: 'juego', dificultad: 3, recompensa_base: 130, recompensa_xp: 65, url_destino: '../juegos/sinonimos/sinonimos.html', peso_sorteo: 3, limite_semanal: 2 },

  // ---- JUEGO: COINCLIK ----
  { tipo: 'coinclik_jugar', descripcion: 'Jugar una partida de CoinClik', icono: '💰', categoria: 'juego', dificultad: 1, recompensa_base: 60, recompensa_xp: 30, url_destino: '../juegos/coinclik/coinclik.html', peso_sorteo: 7, limite_semanal: 4 },
  { tipo: 'coinclik_500', descripcion: 'Alcanzar 500 puntos en CoinClik', icono: '💰', categoria: 'juego', dificultad: 2, recompensa_base: 90, recompensa_xp: 45, url_destino: '../juegos/coinclik/coinclik.html', peso_sorteo: 5, limite_semanal: 3, requiere_puntos: 500 },
  { tipo: 'coinclik_1000', descripcion: 'Alcanzar 1000 puntos en CoinClik', icono: '💎', categoria: 'juego', dificultad: 3, recompensa_base: 150, recompensa_xp: 75, url_destino: '../juegos/coinclik/coinclik.html', peso_sorteo: 3, limite_semanal: 2, requiere_puntos: 1000 },

  // ---- JUEGO: TABLA BLAST ----
  { tipo: 'tablablast_jugar', descripcion: 'Jugar una partida de Tabla Blast', icono: '🔢', categoria: 'juego', dificultad: 1, recompensa_base: 60, recompensa_xp: 30, url_destino: '../juegos/tablablast/tablablast.html', peso_sorteo: 7, limite_semanal: 4 },
  { tipo: 'tablablast_500', descripcion: 'Alcanzar 500 puntos en Tabla Blast', icono: '🔢', categoria: 'juego', dificultad: 2, recompensa_base: 100, recompensa_xp: 50, url_destino: '../juegos/tablablast/tablablast.html', peso_sorteo: 5, limite_semanal: 3, requiere_puntos: 500 },
  { tipo: 'multiplicacion_bonus', descripcion: 'Acertar 3 bonus de multiplicación', icono: '⚡', categoria: 'juego', dificultad: 3, recompensa_base: 120, recompensa_xp: 60, url_destino: '../juegos/tablablast/tablablast.html', peso_sorteo: 4, limite_semanal: 3 },

  // ---- JUEGO: HORSE RACE ----
  { tipo: 'horserace_jugar', descripcion: 'Jugar una carrera en Horse Race', icono: '🏇', categoria: 'juego', dificultad: 1, recompensa_base: 60, recompensa_xp: 30, url_destino: '../juegos/horserace/horserace.html', peso_sorteo: 7, limite_semanal: 4 },
  { tipo: 'horserace_ganar', descripcion: 'Ganar una carrera en Horse Race', icono: '🥇', categoria: 'juego', dificultad: 2, recompensa_base: 110, recompensa_xp: 55, url_destino: '../juegos/horserace/horserace.html', peso_sorteo: 5, limite_semanal: 3 },

  // ---- JUEGO: MAPA QUIZ ----
  { tipo: 'mapaquiz_jugar', descripcion: 'Jugar una partida de Mapa Quiz', icono: '🗺️', categoria: 'juego', dificultad: 1, recompensa_base: 60, recompensa_xp: 30, url_destino: '../juegos/mapaquiz/mapaquiz.html', peso_sorteo: 6, limite_semanal: 4 },
  { tipo: 'mapaquiz_perfecto', descripcion: 'Completar Mapa Quiz sin errores', icono: '🌍', categoria: 'juego', dificultad: 3, recompensa_base: 150, recompensa_xp: 75, url_destino: '../juegos/mapaquiz/mapaquiz.html', peso_sorteo: 3, limite_semanal: 2 },

  // ---- JUEGO: PROBLEMAS ----
  { tipo: 'problemas_jugar', descripcion: 'Resolver problemas matemáticos', icono: '🧮', categoria: 'juego', dificultad: 1, recompensa_base: 70, recompensa_xp: 35, url_destino: '../juegos/problemas/problemas.html', peso_sorteo: 7, limite_semanal: 4 },
  { tipo: 'problemas_3', descripcion: 'Resolver 3 problemas de texto correctos', icono: '🔢', categoria: 'juego', dificultad: 2, recompensa_base: 100, recompensa_xp: 50, url_destino: '../juegos/problemas/problemas.html', peso_sorteo: 5, limite_semanal: 3 },
  { tipo: 'problemas_perfecto', descripcion: 'Resolver 5 problemas sin errores', icono: '🏆', categoria: 'juego', dificultad: 3, recompensa_base: 180, recompensa_xp: 90, url_destino: '../juegos/problemas/problemas.html', peso_sorteo: 3, limite_semanal: 2 },

  // ---- JUEGO: CUESTIONARIO LIBRO (futuro) ----
  { tipo: 'cuestionario_libro', descripcion: 'Completar el cuestionario del libro', icono: '📖', categoria: 'lectura', dificultad: 2, recompensa_base: 200, recompensa_xp: 100, url_destino: '../lectura/cuestionario.html', peso_sorteo: 10, limite_semanal: 5, forzada: true, activo: false },

  // ---- TAREA ----
  { tipo: 'subir_tarea', descripcion: 'Subir una tarea hoy', icono: '📝', categoria: 'tarea', dificultad: 1, recompensa_base: 100, recompensa_xp: 50, url_destino: '../tareas/tareas.html', peso_sorteo: 8, limite_semanal: 5 },
  { tipo: 'tarea_matematicas', descripcion: 'Subir tarea de Matemáticas', icono: '➕', categoria: 'tarea', dificultad: 2, recompensa_base: 110, recompensa_xp: 55, url_destino: '../tareas/tareas.html', peso_sorteo: 6, limite_semanal: 3 },
  { tipo: 'tarea_lenguaje', descripcion: 'Subir tarea de Lenguaje', icono: '📚', categoria: 'tarea', dificultad: 2, recompensa_base: 110, recompensa_xp: 55, url_destino: '../tareas/tareas.html', peso_sorteo: 6, limite_semanal: 3 },
  { tipo: 'tarea_ingles', descripcion: 'Completar una actividad de Inglés', icono: '🇬🇧', categoria: 'tarea', dificultad: 2, recompensa_base: 110, recompensa_xp: 55, url_destino: '../tareas/tareas.html', peso_sorteo: 6, limite_semanal: 3 },
  { tipo: 'tarea_ciencias', descripcion: 'Subir tarea de Ciencias', icono: '🔬', categoria: 'tarea', dificultad: 2, recompensa_base: 110, recompensa_xp: 55, url_destino: '../tareas/tareas.html', peso_sorteo: 5, limite_semanal: 3 },
  { tipo: 'tarea_historia', descripcion: 'Subir tarea de Historia', icono: '🏛️', categoria: 'tarea', dificultad: 2, recompensa_base: 110, recompensa_xp: 55, url_destino: '../tareas/tareas.html', peso_sorteo: 5, limite_semanal: 3 },

  // ---- EVALUACIONES ----
  { tipo: 'marcar_estudiado', descripcion: 'Marcar una prueba como "estudiada"', icono: '📅', categoria: 'evaluacion', dificultad: 1, recompensa_base: 40, recompensa_xp: 20, url_destino: '../calendario/calendario.html', peso_sorteo: 7, limite_semanal: 4 },
  { tipo: 'subir_nota', descripcion: 'Registrar la nota de una prueba', icono: '⭐', categoria: 'evaluacion', dificultad: 1, recompensa_base: 70, recompensa_xp: 35, url_destino: '../calendario/calendario.html', peso_sorteo: 6, limite_semanal: 3 },
  { tipo: 'revisar_calendario', descripcion: 'Revisar el calendario de pruebas', icono: '🗓️', categoria: 'evaluacion', dificultad: 1, recompensa_base: 30, recompensa_xp: 15, url_destino: '../calendario/calendario.html', peso_sorteo: 8, limite_semanal: 5 },

  // ---- DUELOS ----
  { tipo: 'retar_alumno', descripcion: 'Retar a un duelo a otro alumno', icono: '⚔️', categoria: 'duelo', dificultad: 1, recompensa_base: 50, recompensa_xp: 25, url_destino: '../duelos/duelos.html', peso_sorteo: 6, limite_semanal: 3 },
  { tipo: 'ganar_duelo', descripcion: 'Ganar un duelo contra otro alumno', icono: '🏆', categoria: 'duelo', dificultad: 2, recompensa_base: 120, recompensa_xp: 60, url_destino: '../duelos/duelos.html', peso_sorteo: 5, limite_semanal: 3 },
  { tipo: 'ganar_2_duelos', descripcion: 'Ganar 2 duelos hoy', icono: '👑', categoria: 'duelo', dificultad: 3, recompensa_base: 200, recompensa_xp: 100, url_destino: '../duelos/duelos.html', peso_sorteo: 3, limite_semanal: 2 },

  // ---- SOCIAL ----
  { tipo: 'revisar_ayudas', descripcion: 'Visitar el material de apoyo', icono: '📚', categoria: 'social', dificultad: 1, recompensa_base: 30, recompensa_xp: 15, url_destino: '../ayudas/ayudas.html', peso_sorteo: 5, limite_semanal: 3 },
  { tipo: 'visitar_ranking', descripcion: 'Ver el ranking de la semana', icono: '🏅', categoria: 'social', dificultad: 1, recompensa_base: 20, recompensa_xp: 10, url_destino: '../ranking/ranking.html', peso_sorteo: 5, limite_semanal: 3 },

  // ---- ESPECIAL / BONUS ----
  { tipo: 'completar_4_misiones', descripcion: 'Completar al menos 4 misiones hoy', icono: '🌟', categoria: 'especial', dificultad: 2, recompensa_base: 100, recompensa_xp: 50, url_destino: null, peso_sorteo: 6, limite_semanal: 5 },
  { tipo: 'racha_login', descripcion: 'Iniciar sesión 3 días seguidos', icono: '🔥', categoria: 'especial', dificultad: 2, recompensa_base: 150, recompensa_xp: 75, url_destino: null, peso_sorteo: 4, limite_semanal: 2 },

  // ---- SEMANALES ----
  { tipo: 'sem_jugar_10', descripcion: 'Jugar 10 juegos esta semana', icono: '🎮', categoria: 'semanal', dificultad: 2, recompensa_base: 300, recompensa_xp: 150, url_destino: '../juegos/juegos.html', peso_sorteo: 10, limite_semanal: 1, es_semanal: true, meta_progreso: 10 },
  { tipo: 'sem_jugar_30_tablas', descripcion: 'Jugar 30 juegos de tablas esta semana', icono: '🔢', categoria: 'semanal', dificultad: 3, recompensa_base: 500, recompensa_xp: 250, url_destino: '../juegos/tablablast/tablablast.html', peso_sorteo: 8, limite_semanal: 1, es_semanal: true, meta_progreso: 30 },
  { tipo: 'sem_5_tareas', descripcion: 'Subir 5 tareas esta semana', icono: '📝', categoria: 'semanal', dificultad: 2, recompensa_base: 400, recompensa_xp: 200, url_destino: '../tareas/tareas.html', peso_sorteo: 8, limite_semanal: 1, es_semanal: true, meta_progreso: 5 },
  { tipo: 'sem_3_duelos', descripcion: 'Ganar 3 duelos esta semana', icono: '⚔️', categoria: 'semanal', dificultad: 3, recompensa_base: 450, recompensa_xp: 225, url_destino: '../duelos/duelos.html', peso_sorteo: 7, limite_semanal: 1, es_semanal: true, meta_progreso: 3 },
  { tipo: 'sem_completar_todas', descripcion: 'Completar 8 misiones diarias 5 días', icono: '🏆', categoria: 'semanal', dificultad: 3, recompensa_base: 600, recompensa_xp: 300, url_destino: null, peso_sorteo: 6, limite_semanal: 1, es_semanal: true, meta_progreso: 5, forzada: true },
];

// ============================================
// ESTADO
// ============================================
var STATE = {
  misiones: [],
  filtros: { cat: 'todos', busqueda: '', activo: '', dif: '', grado: '' },
  seleccionadas: new Set(),
  evento: null,
  eventoTimer: null,
  tabAdmin: 'diaria',
};

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', function () {
  initShared('admin');
  initCatPills();
  initFiltros();
  initBulkActions();
  initModalMision();
  initModalEvento();
  initEmojiPicker();

  // Esperar hasta que el token esté disponible (máx 10s)
  var intentos = 0;
  var intervalo = setInterval(function () {
    intentos++;
    if (window.CLERK_TOKEN) {
      clearInterval(intervalo);
      cargarMisiones();
      cargarEstadoEvento();
    } else if (intentos >= 100) {
      clearInterval(intervalo);
    }
  }, 100);
});

document.addEventListener('clerkReady', function () {
  if (!window.CLERK_TOKEN) return;
  cargarMisiones();
  cargarEstadoEvento();
});

// ============================================
// CARGAR MISIONES
// ============================================
// ============================================
// TABS ADMIN: Diarias vs Semanales
// ============================================
function cambiarTabAdmin(tab) {
  STATE.tabAdmin = tab;
  STATE.seleccionadas.clear();

  var tabDiaria = document.getElementById('adminTabDiaria');
  var tabSemanal = document.getElementById('adminTabSemanal');

  if (tab === 'semanal') {
    if (tabDiaria) tabDiaria.classList.remove('admin-tab-activa');
    if (tabSemanal) { tabSemanal.classList.add('admin-tab-semanal-activa'); tabSemanal.classList.remove('admin-tab-activa'); }
    // Cambiar el placeholder de la pill semanal a visible
    document.getElementById('tablaHeader').textContent = '📅 MISIONES SEMANALES';
  } else {
    if (tabSemanal) tabSemanal.classList.remove('admin-tab-semanal-activa');
    if (tabDiaria) tabDiaria.classList.add('admin-tab-activa');
    document.getElementById('tablaHeader').textContent = '📋 MISIONES DIARIAS';
  }

  actualizarStats();
  renderTabla();
}

function cargarMisiones() {
  fetch(BASE_URL + '/api/admin?action=misiones_banco', {
    credentials: 'include',
    headers: {
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {})
    }
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;
      STATE.misiones = data.misiones || [];
      actualizarStats();
      renderTabla();
    })
    .catch(function () { });
}

function cargarEstadoEvento() {
  fetch(BASE_URL + '/api/admin?action=evento_activo', {
    credentials: 'include',
    headers: {
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {})
    }
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      STATE.evento = (data && data.evento) ? data.evento : null;
      renderEventoBanner();
    })
    .catch(function () {
      STATE.evento = null;
      renderEventoBanner();
    });
}

// ============================================
// STATS
// ============================================
function actualizarStats() {
  var m = STATE.misiones;
  var semanales = m.filter(function (x) { return x.es_semanal; }).length;
  var diarias = m.length - semanales;
  document.getElementById('statTotal').textContent = m.length;
  document.getElementById('statActivas').textContent = m.filter(function (x) { return x.activo; }).length;
  document.getElementById('statForzadas').textContent = m.filter(function (x) { return x.forzada; }).length;
  document.getElementById('statSemanales').textContent = semanales;
  document.getElementById('statEvento').textContent = m.filter(function (x) { return x.evento_activo; }).length;
  var cD = document.getElementById('adminCountDiaria');
  var cS = document.getElementById('adminCountSemanal');
  if (cD) cD.textContent = diarias;
  if (cS) cS.textContent = semanales;
}

// ============================================
// RENDER TABLA
// ============================================
function renderTabla() {
  var filtradas = filtrarMisiones();
  var tbody = document.getElementById('bmTbody');

  var labelTab = STATE.tabAdmin === 'semanal' ? '📅 MISIONES SEMANALES' : '📋 MISIONES DIARIAS';
  document.getElementById('tablaHeader').textContent = labelTab + ' (' + filtradas.length + ')';

  if (filtradas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="bm-empty">' +
      '<div class="bm-empty-icon">🎯</div>' +
      '<div>No hay misiones con estos filtros</div></div></td></tr>';
    return;
  }

  tbody.innerHTML = filtradas.map(function (m) {
    var cat = m.categoria || 'juego';
    var dif = Number(m.dificultad || 1);
    var stars = [1, 2, 3].map(function (i) {
      return '<span class="bm-star' + (i <= dif ? ' on' : '') + '">⭐</span>';
    }).join('');

    var grados = (m.grados_aptos || []);
    var gradosTxt = grados.length === 0
      ? '<span style="color:var(--text-dim);font-size:.72rem;">Todos</span>'
      : grados.map(function (g) { return g + '°'; }).join(', ');

    var badges = '';
    if (m.forzada) badges += '<span class="bm-badge forzada">🔒 FORZADA</span>';
    if (m.es_semanal) badges += '<span class="bm-badge semanal">📅 SEMANAL</span>';
    if (m.evento_activo) badges += '<span class="bm-badge evento">⚡ EVENTO</span>';

    var checked = STATE.seleccionadas.has(m.id) ? ' checked' : '';
    var activo = m.activo !== false;

    // Multiplicador si hay evento global activo
    var multiplicador = 1;
    if (STATE.evento && m.evento_activo) multiplicador = Number(STATE.evento.multiplicador || 1);
    var monedasFinal = Math.round(Number(m.recompensa_base || 0) * multiplicador);
    var xpFinal = Math.round(Number(m.recompensa_xp || 0) * multiplicador);
    var rewardExtra = multiplicador > 1
      ? ' <span style="color:var(--yellow);font-size:.65rem;">×' + multiplicador + '</span>'
      : '';

    return '<tr>' +
      '<td><input type="checkbox" class="bm-check row-check" data-id="' + m.id + '"' + checked + '></td>' +
      '<td>' +
      '<div class="bm-nombre-cell">' +
      '<span class="bm-icono">' + (m.icono || '🎯') + '</span>' +
      '<div>' +
      '<div class="bm-nombre">' + (m.descripcion || '—') + '</div>' +
      '<div class="bm-tipo">' + m.tipo + (badges ? ' ' : '') + badges + '</div>' +
      '</div>' +
      '</div>' +
      '</td>' +
      '<td><span class="bm-cat ' + cat + '">' + cat + '</span></td>' +
      '<td><div class="bm-dif">' + stars + '</div></td>' +
      '<td>' +
      '<div class="bm-reward">' +
      '<span class="bm-coins">+' + monedasFinal + ' 🪙' + rewardExtra + '</span>' +
      '<span class="bm-xp">+' + xpFinal + ' XP' + rewardExtra + '</span>' +
      '</div>' +
      '</td>' +
      '<td style="font-size:.78rem;">' + gradosTxt + '</td>' +
      '<td style="font-size:.72rem;color:var(--text-dim);">' +
      'Peso: ' + (m.peso_sorteo || 5) + ' · Límite: ' + (m.limite_semanal || 3) + '/sem' +
      '</td>' +
      '<td>' +
      '<label class="bm-switch">' +
      '<input type="checkbox" class="switch-activo" data-id="' + m.id + '"' + (activo ? ' checked' : '') + '>' +
      '<span class="bm-switch-track"></span>' +
      '</label>' +
      '</td>' +
      '<td>' +
      '<div class="bm-acc">' +
      '<button class="bm-btn" onclick="abrirEditarMision(\'' + m.id + '\')">✏️</button>' +
      '<button class="bm-btn" onclick="duplicarMision(\'' + m.id + '\')">📋</button>' +
      '</div>' +
      '</td>' +
      '</tr>';
  }).join('');

  // Switches activo/inactivo
  document.querySelectorAll('.switch-activo').forEach(function (sw) {
    sw.addEventListener('change', function () {
      toggleActivo(this.dataset.id, this.checked);
    });
  });

  // Checkboxes selección
  document.querySelectorAll('.row-check').forEach(function (cb) {
    cb.addEventListener('change', function () {
      if (this.checked) STATE.seleccionadas.add(this.dataset.id);
      else STATE.seleccionadas.delete(this.dataset.id);
      actualizarBulkBar();
    });
  });
}

// ============================================
// FILTROS
// ============================================
function filtrarMisiones() {
  return STATE.misiones.filter(function (m) {
    // Filtrar por tab activa: diaria o semanal
    if (STATE.tabAdmin === 'diaria' && m.es_semanal) return false;
    if (STATE.tabAdmin === 'semanal' && !m.es_semanal) return false;
    var okCat = STATE.filtros.cat === 'todos' || m.categoria === STATE.filtros.cat;
    var okBusc = !STATE.filtros.busqueda ||
      (m.descripcion || '').toLowerCase().includes(STATE.filtros.busqueda.toLowerCase()) ||
      (m.tipo || '').toLowerCase().includes(STATE.filtros.busqueda.toLowerCase());
    var okActivo = STATE.filtros.activo === '' ||
      (STATE.filtros.activo === '1' ? m.activo !== false : m.activo === false);
    var okDif = !STATE.filtros.dif || Number(m.dificultad) === Number(STATE.filtros.dif);
    var okGrado = !STATE.filtros.grado ||
      (m.grados_aptos || []).length === 0 ||
      (m.grados_aptos || []).includes(Number(STATE.filtros.grado));
    return okCat && okBusc && okActivo && okDif && okGrado;
  }).sort(function (a, b) {
    // Ordenar: forzadas primero, luego por categoría, luego por dificultad
    if (a.forzada && !b.forzada) return -1;
    if (!a.forzada && b.forzada) return 1;
    if ((a.categoria || '') < (b.categoria || '')) return -1;
    if ((a.categoria || '') > (b.categoria || '')) return 1;
    return Number(a.dificultad || 1) - Number(b.dificultad || 1);
  });
}

function initCatPills() {
  document.querySelectorAll('.cat-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      document.querySelectorAll('.cat-pill').forEach(function (p) { p.classList.remove('active'); });
      this.classList.add('active');
      STATE.filtros.cat = this.dataset.cat;
      renderTabla();
    });
  });
}

function initFiltros() {
  document.getElementById('bmSearch').addEventListener('input', function () {
    STATE.filtros.busqueda = this.value;
    renderTabla();
  });
  document.getElementById('bmFiltroActivo').addEventListener('change', function () {
    STATE.filtros.activo = this.value;
    renderTabla();
  });
  document.getElementById('bmFiltroDif').addEventListener('change', function () {
    STATE.filtros.dif = this.value;
    renderTabla();
  });
  document.getElementById('bmFiltroGrado').addEventListener('change', function () {
    STATE.filtros.grado = this.value;
    renderTabla();
  });
  document.getElementById('checkAll').addEventListener('change', function () {
    var filtradas = filtrarMisiones();
    filtradas.forEach(function (m) {
      if (this.checked) STATE.seleccionadas.add(m.id);
      else STATE.seleccionadas.delete(m.id);
    }.bind(this));
    renderTabla();
    actualizarBulkBar();
  });
}

// ============================================
// TOGGLE ACTIVO (switch inline)
// ============================================
function toggleActivo(id, activo) {
  apiPut({ action: 'editar_mision', id: id, activo: activo })
    .then(function () {
      var m = STATE.misiones.find(function (x) { return x.id === id; });
      if (m) m.activo = activo;
      actualizarStats();
      toast((activo ? '✅ Misión activada' : '⏸ Misión desactivada'), activo ? 'success' : 'warning');
    })
    .catch(function () { toast('❌ Error al cambiar estado', 'error'); cargarMisiones(); });
}

// ============================================
// BULK ACTIONS
// ============================================
function initBulkActions() {
  document.getElementById('btnBulkActivar').addEventListener('click', function () {
    bulkCambiarActivo(true);
  });
  document.getElementById('btnBulkDesactivar').addEventListener('click', function () {
    bulkCambiarActivo(false);
  });
  document.getElementById('btnBulkX2').addEventListener('click', function () {
    bulkMarcarEvento(true);
  });
  document.getElementById('btnBulkCancelar').addEventListener('click', function () {
    STATE.seleccionadas.clear();
    renderTabla();
    actualizarBulkBar();
  });
}

function actualizarBulkBar() {
  var bar = document.getElementById('bulkBar');
  var n = STATE.seleccionadas.size;
  if (n > 0) {
    bar.classList.add('visible');
    document.getElementById('bulkCount').textContent = n + ' seleccionada' + (n !== 1 ? 's' : '');
  } else {
    bar.classList.remove('visible');
  }
}

function bulkCambiarActivo(activo) {
  var ids = Array.from(STATE.seleccionadas);
  var promesas = ids.map(function (id) {
    return apiPut({ action: 'editar_mision', id: id, activo: activo });
  });
  Promise.all(promesas).then(function () {
    ids.forEach(function (id) {
      var m = STATE.misiones.find(function (x) { return x.id === id; });
      if (m) m.activo = activo;
    });
    STATE.seleccionadas.clear();
    actualizarStats();
    renderTabla();
    actualizarBulkBar();
    toast((activo ? '✅ ' : '⏸ ') + ids.length + ' misiones ' + (activo ? 'activadas' : 'desactivadas'), 'success');
  });
}

function bulkMarcarEvento(activo) {
  var ids = Array.from(STATE.seleccionadas);
  var promesas = ids.map(function (id) {
    return apiPut({ action: 'editar_mision', id: id, evento_activo: activo });
  });
  Promise.all(promesas).then(function () {
    ids.forEach(function (id) {
      var m = STATE.misiones.find(function (x) { return x.id === id; });
      if (m) m.evento_activo = activo;
    });
    STATE.seleccionadas.clear();
    actualizarStats();
    renderTabla();
    actualizarBulkBar();
    toast('⚡ ' + ids.length + ' misiones marcadas para evento', 'success');
  });
}

// ============================================
// MODAL NUEVA / EDITAR MISIÓN
// ============================================
// ============================================
// EMOJI PICKER
// ============================================
var EMOJI_CATS = {
  '🎮 Juegos': ['🎮', '🕹️', '🎲', '🃏', '🎯', '🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '⭐', '🌟', '💫', '✨'],
  '📚 Educación': ['📚', '📖', '📝', '✏️', '🖊️', '📐', '📏', '🔬', '🔭', '🧪', '🧫', '💡', '🧠', '📊', '📈'],
  '⚔️ Duelo': ['⚔️', '🛡️', '🥊', '🥋', '🏹', '🎳', '🏋️', '💪', '🦾', '🔥', '⚡', '💥', '🌪️', '🌊', '❄️'],
  '🎯 Misiones': ['🎯', '🔑', '🗝️', '🚀', '🛸', '🌈', '🦋', '🌺', '🌸', '🌻', '🍀', '🌙', '☀️', '🌍', '🗺️'],
  '📅 Calendario': ['📅', '📆', '🗓️', '⏰', '⌚', '⏱️', '⏳', '🔔', '📢', '📣', '🚩', '🏁', '✅', '☑️', '💯'],
  '🪙 Recompensas': ['🪙', '💰', '💎', '👑', '🏺', '🎁', '🎀', '🎊', '🎉', '🥳', '🎈', '🎆', '🎇', '✨', '🌟'],
  '📝 Tareas': ['📝', '📋', '📌', '📍', '🗂️', '🗃️', '📂', '📁', '💼', '🧳', '📦', '🔖', '🏷️', '📎', '🖇️'],
  '🤝 Social': ['🤝', '👋', '🙌', '👏', '🤜', '🤛', '💬', '💭', '🗨️', '🗯️', '📣', '📢', '🔊', '📡', '🌐'],
};

var emojiPickerAbierto = false;
var emojiCatActual = Object.keys(EMOJI_CATS)[0];

function initEmojiPicker() {
  var catsEl = document.getElementById('emojiCats');
  if (!catsEl) return;

  // ✅ Sin onclick inline — usa data-cat
  catsEl.innerHTML = Object.keys(EMOJI_CATS).map(function (cat) {
    return '<button class="emoji-cat-btn" data-cat="' + cat + '">' + cat.split(' ')[0] + '</button>';
  }).join('');

  // Event delegation para categorías
  catsEl.addEventListener('click', function (ev) {
    var btn = ev.target.closest('.emoji-cat-btn');
    if (btn) filtrarEmojisCat(btn.dataset.cat);
  });

  // Buscador
  var search = document.getElementById('emojiSearch');
  if (search) {
    search.addEventListener('input', function () {
      filtrarEmojis(this.value.trim());
    });
  }

  // Cerrar al hacer click fuera
  document.addEventListener('click', function (e) {
    var panel = document.getElementById('emojiPickerPanel');
    var btn = document.getElementById('emojiPreviewBtn');
    if (panel && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  renderEmojiGrid(TODOS_EMOJIS);
}


function renderEmojiCats() {
  var catsEl = document.getElementById('emojiCats');
  if (!catsEl) return;
  catsEl.innerHTML = Object.keys(EMOJI_CATS).map(function (cat) {
    var active = cat === emojiCatActual ? 'active' : '';
    return '<button class="emoji-cat-btn ' + active + '" data-cat="' + cat + '">' + cat.split(' ')[0] + '</button>';
  }).join('');

  // Event delegation — sin onclick inline
  catsEl.onclick = function (ev) {
    var btn = ev.target.closest('.emoji-cat-btn');
    if (btn) filtrarEmojisCat(btn.dataset.cat);
  };
}

function selEmojiCat(cat) {
  emojiCatActual = cat;
  document.getElementById('emojiSearch').value = '';
  renderEmojiCats();
  renderEmojiGrid('');
}

function renderEmojiGrid(busqueda) {
  var gridEl = document.getElementById('emojiGrid');
  if (!gridEl) return;
  var emojis;
  if (busqueda) {
    emojis = [];
    Object.values(EMOJI_CATS).forEach(function (arr) {
      arr.forEach(function (e) {
        if (emojis.indexOf(e) < 0) emojis.push(e);
      });
    });
  } else {
    emojis = EMOJI_CATS[emojiCatActual] || [];
  }
  // ── CRÍTICO: usar data-emoji en lugar de onclick inline
  // onclick="fn('emoji')" rompe con emojis que tienen comillas/apóstrofes/caracteres especiales
  gridEl.innerHTML = emojis.map(function (e) {
    return '<div class="emoji-cell" data-emoji="' + e + '" title="' + e + '">' + e + '</div>';
  }).join('');
  // Event delegation — un solo listener en el grid
  gridEl.onclick = function (ev) {
    var cell = ev.target.closest('.emoji-cell');
    if (cell && cell.dataset.emoji) seleccionarEmoji(cell.dataset.emoji);
  };
}

function seleccionarEmoji(emoji) {
  var input = document.getElementById('fIcono');
  var btn = document.getElementById('btnAbrirEmoji');
  if (input) input.value = emoji;
  if (btn) btn.textContent = emoji;
  // Cerrar picker
  emojiPickerAbierto = false;
  var panel = document.getElementById('emojiPicker');
  if (panel) panel.classList.remove('open');
}

function initModalMision() {
  initEmojiPicker();
  document.getElementById('btnNuevaMision').addEventListener('click', function () {
    abrirNuevaMision();
  });
  document.getElementById('btnCerrarModalMision').addEventListener('click', function () {
    cerrarModal('modalMision');
  });
  document.getElementById('modalMision').addEventListener('click', function (e) {
    if (e.target === this) cerrarModal('modalMision');
  });
  document.getElementById('btnGuardarMision').addEventListener('click', guardarMision);
}

function abrirNuevaMision() {
  document.getElementById('modalMisionTitulo').textContent = 'Nueva Misión';
  document.getElementById('fId').value = '';
  document.getElementById('fIcono').value = '🎯';
  var _pb = document.getElementById('emojiPreviewBig'); if (_pb) _pb.textContent = '🎯';
  document.getElementById('fTipo').value = '';
  document.getElementById('fDesc').value = '';
  document.getElementById('fUrl').value = '';
  document.getElementById('fCategoria').value = 'juego';
  document.getElementById('fDificultad').value = '1';
  document.getElementById('fPeso').value = '5';
  document.getElementById('fMonedas').value = '60';
  document.getElementById('fXP').value = '30';
  document.getElementById('fPuntosMin').value = '0';
  document.getElementById('fNivelMin').value = '1';
  document.getElementById('fLimiteSemanal').value = '3';
  document.getElementById('fForzada').checked = false;
  document.getElementById('fEsSemanal').checked = false;
  document.getElementById('fOculta').checked = false;
  document.getElementById('fActivo').checked = true;
  document.getElementById('fCondicion').value = 'auto';
  document.getElementById('fTrigger').value = 'juego_completado';
  document.getElementById('fJuegoId').value = '';
  document.getElementById('fMetaCantidad').value = '1';
  document.getElementById('fMetaTiempo').value = '60';
  document.getElementById('fParametroValor').value = '';
  document.getElementById('fMensajeLogro').value = '';
  document.getElementById('fPuntosMinCondicion').value = '0';
  document.querySelectorAll('#gradosMiniGrid input').forEach(function (cb) { cb.checked = false; });
  document.getElementById('fTipo').readOnly = false;
  var _btnEmoji2 = document.getElementById('btnAbrirEmoji');
  if (_btnEmoji2) _btnEmoji2.textContent = '🎯';
  onTriggerChange();
  abrirModal('modalMision');
}

function abrirEditarMision(id) {
  var m = STATE.misiones.find(function (x) { return x.id === id; });
  if (!m) return;

  document.getElementById('modalMisionTitulo').textContent = 'Editar Misión';
  document.getElementById('fId').value = m.id;
  document.getElementById('fIcono').value = m.icono || '🎯';
  var _pb2 = document.getElementById('emojiPreviewBig'); if (_pb2) _pb2.textContent = m.icono || '🎯';
  document.getElementById('fTipo').value = m.tipo || '';
  document.getElementById('fDesc').value = m.descripcion || '';
  document.getElementById('fUrl').value = m.url_destino || '';
  document.getElementById('fCategoria').value = m.categoria || 'juego';
  document.getElementById('fDificultad').value = m.dificultad || 1;
  document.getElementById('fPeso').value = m.peso_sorteo || 5;
  document.getElementById('fMonedas').value = m.recompensa_base || 60;
  document.getElementById('fXP').value = m.recompensa_xp || 30;
  document.getElementById('fPuntosMin').value = m.requiere_puntos || 0;
  document.getElementById('fNivelMin').value = m.nivel_minimo || 1;
  document.getElementById('fLimiteSemanal').value = m.limite_semanal || 3;
  document.getElementById('fForzada').checked = !!m.forzada;
  document.getElementById('fEsSemanal').checked = !!m.es_semanal;
  document.getElementById('fOculta').checked = !!m.oculta;
  document.getElementById('fActivo').checked = m.activo !== false;
  // Campos nuevos condición
  document.getElementById('fCondicion').value = m.condicion_tipo || 'auto';
  document.getElementById('fTrigger').value = m.accion_trigger || 'juego_completado';
  document.getElementById('fJuegoId').value = m.juego_id || '';
  document.getElementById('fMetaCantidad').value = m.meta_cantidad || 1;
  document.getElementById('fMetaTiempo').value = m.meta_tiempo_seg || 60;
  document.getElementById('fParametroValor').value = m.parametro_valor || '';
  document.getElementById('fMensajeLogro').value = m.mensaje_logro || '';
  document.getElementById('fPuntosMinCondicion').value = m.requiere_puntos || 0;

  var grados = (m.grados_aptos || []).map(Number);
  document.querySelectorAll('#gradosMiniGrid input').forEach(function (cb) {
    cb.checked = grados.includes(Number(cb.value));
  });

  document.getElementById('fTipo').readOnly = true;
  var _btnEmoji = document.getElementById('btnAbrirEmoji');
  if (_btnEmoji) _btnEmoji.textContent = document.getElementById('fIcono').value || '🎯';
  onTriggerChange();
  abrirModal('modalMision');
}

function duplicarMision(id) {
  var m = STATE.misiones.find(function (x) { return x.id === id; });
  if (!m) return;
  abrirNuevaMision();
  document.getElementById('fIcono').value = m.icono || '🎯';
  document.getElementById('fTipo').value = m.tipo + '_copia';
  document.getElementById('fDesc').value = m.descripcion + ' (copia)';
  document.getElementById('fUrl').value = m.url_destino || '';
  document.getElementById('fCategoria').value = m.categoria || 'juego';
  document.getElementById('fDificultad').value = m.dificultad || 1;
  document.getElementById('fPeso').value = m.peso_sorteo || 5;
  document.getElementById('fMonedas').value = m.recompensa_base || 60;
  document.getElementById('fXP').value = m.recompensa_xp || 30;
  document.getElementById('fActivo').checked = false; // empieza desactivada
  toast('📋 Duplicando misión — ajusta el tipo y guarda', 'info');
}


// ============================================
// SELECTOR DE EMOJIS
// ============================================
var EMOJI_CATS = {
  '🎮 Juegos': ['🎮', '🕹️', '🏆', '🥇', '🎯', '🎲', '🃏', '🎰', '🎳', '🎪', '🎭', '🎨'],
  '📚 Educación': ['📝', '📚', '📖', '🎓', '🏫', '✏️', '🔬', '🔭', '📐', '📏', '🧮', '💡'],
  '⚡ Acción': ['⚡', '🔥', '💥', '⚔️', '🛡️', '🏹', '💪', '🚀', '⭐', '🌟', '✨', '💫'],
  '🎯 Misiones': ['🎯', '🏅', '🥈', '🥉', '🏋️', '🤸', '🧗', '🏊', '🚴', '🤾', '🏇', '⛹️'],
  '😊 Expresión': ['😊', '🤩', '😎', '🤔', '😤', '🥳', '🤯', '😱', '🥺', '😍', '🤗', '😈'],
  '🐾 Animales': ['🐰', '🦊', '🐻', '🐶', '🐱', '🐧', '🦁', '🐯', '🦄', '🐸', '🐙', '🦋'],
  '🌍 Mundo': ['🌍', '🗺️', '🌎', '🏔️', '🌊', '🌋', '🌅', '🌸', '🍀', '🌻', '🎋', '🎍'],
  '💎 Objetos': ['💎', '🪙', '💰', '🏦', '🔑', '🗝️', '🔮', '📱', '💻', '🖥️', '📡', '🛰️'],
  '⏱️ Tiempo': ['⏱️', '⏰', '🕐', '📅', '📆', '🗓️', '⌛', '⏳', '🔔', '📣', '📢', '🚨'],
  '🍕 Comida': ['🍕', '🍔', '🎂', '🍩', '🍦', '🌮', '🍣', '🍜', '🥗', '🍇', '🍓', '🥝'],
};
var TODOS_EMOJIS = Object.values(EMOJI_CATS).flat();
var _emojiCatActual = null;
var _emojisFiltrados = TODOS_EMOJIS;



function toggleEmojiPicker() {
  var panel = document.getElementById('emojiPickerPanel');
  if (panel) panel.classList.toggle('open');
}

function filtrarEmojisCat(cat) {
  _emojiCatActual = cat;
  _emojisFiltrados = EMOJI_CATS[cat] || TODOS_EMOJIS;
  document.querySelectorAll('.emoji-cat-btn').forEach(function (b) {
    b.classList.toggle('active', b.textContent.trim() === cat.split(' ')[0]);
  });
  var search = document.getElementById('emojiSearch');
  if (search) search.value = '';
  renderEmojiGrid(_emojisFiltrados);
}

function filtrarEmojis(texto) {
  if (!texto) {
    _emojisFiltrados = _emojiCatActual ? EMOJI_CATS[_emojiCatActual] : TODOS_EMOJIS;
  } else {
    _emojisFiltrados = TODOS_EMOJIS.filter(function (e) {
      return e.includes(texto);
    });
  }
  renderEmojiGrid(_emojisFiltrados);
}

function renderEmojiGrid(lista) {
  var grid = document.getElementById('emojiGrid');
  if (!grid) return;

  // ✅ Sin onclick inline — usa data-emoji
  grid.innerHTML = lista.map(function (e) {
    return '<div class="emoji-opt" data-emoji="' + e + '" title="' + e + '">' + e + '</div>';
  }).join('');

  grid.onclick = function (ev) {
    var cell = ev.target.closest('.emoji-opt');
    if (cell) seleccionarEmoji(cell.dataset.emoji);
  };
}


function seleccionarEmoji(e) {
  if (!e || e.trim() === '') return;
  var emoji = e.trim();
  // Actualizar hidden input, preview y manual input
  var fIcono = document.getElementById('fIcono');
  var preview = document.getElementById('emojiPreviewBig');
  var manual = document.getElementById('emojiManual');
  var panel = document.getElementById('emojiPickerPanel');
  if (fIcono) fIcono.value = emoji;
  if (preview) preview.textContent = emoji;
  if (manual) manual.value = '';
  if (panel) panel.classList.remove('open');
}

// ============================================
// VISIBILIDAD DINÁMICA DEL FORMULARIO
// Muestra/oculta campos según trigger y condición seleccionada
// ============================================
function onTriggerChange() {
  var trigger = document.getElementById('fTrigger').value;

  // Juego específico
  var grupoJuego = document.getElementById('grupoJuegoId');
  if (grupoJuego) grupoJuego.style.display =
    (trigger === 'juego_especifico' || trigger === 'juego_completado') ? 'block' : 'none';

  // Asignatura (para tarea y evaluación)
  var grupoAsig = document.getElementById('grupoAsignatura');
  if (grupoAsig) grupoAsig.style.display =
    (trigger === 'tarea_subida' || trigger === 'evaluacion_marcada') ? 'block' : 'none';

  // Si no es juego, limpiar juego_id
  if (trigger !== 'juego_especifico' && trigger !== 'juego_completado') {
    var sel = document.getElementById('fJuegoId');
    if (sel) sel.value = '';
  }

  // Recalcular condición visible
  onCondicionChange();
}

function onCondicionChange() {
  var condicion = document.getElementById('fCondicion').value;
  var trigger = document.getElementById('fTrigger').value;

  var grupoCantidad = document.getElementById('grupoMetaCantidad');
  var grupoPuntos = document.getElementById('grupoPuntosMinCondicion');
  var grupoTiempo = document.getElementById('grupoTiempo');

  if (grupoCantidad) grupoCantidad.style.display = (condicion === 'repetir') ? 'block' : 'none';
  if (grupoPuntos) grupoPuntos.style.display = (condicion === 'puntos') ? 'block' : 'none';
  if (grupoTiempo) grupoTiempo.style.display = (condicion === 'tiempo') ? 'block' : 'none';

  // Si condicion = puntos, sincronizar con fPuntosMin
  if (condicion === 'puntos') {
    var fPMin = document.getElementById('fPuntosMin');
    var fPCond = document.getElementById('fPuntosMinCondicion');
    if (fPMin && fPCond && fPCond.value > 0) fPMin.value = fPCond.value;
  }
}

function guardarMision() {
  var id = document.getElementById('fId').value;
  var tipo = document.getElementById('fTipo').value.trim();
  var desc = document.getElementById('fDesc').value.trim();
  if (!tipo || !desc) { toast('⚠️ Tipo y descripción son obligatorios', 'warning'); return; }

  var grados = [];
  document.querySelectorAll('#gradosMiniGrid input:checked').forEach(function (cb) {
    grados.push(Number(cb.value));
  });

  var condicion = document.getElementById('fCondicion').value || 'auto';
  var trigger = document.getElementById('fTrigger').value || 'juego_completado';

  // Puntos mínimos: si condicion=puntos, tomar del campo específico
  var puntosMin = Number(document.getElementById('fPuntosMin').value) || null;
  if (condicion === 'puntos') {
    var pCond = Number(document.getElementById('fPuntosMinCondicion').value);
    if (pCond > 0) puntosMin = pCond;
  }

  var payload = {
    tipo: tipo,
    descripcion: desc,
    icono: document.getElementById('fIcono').value.trim() || '🎯',
    url_destino: document.getElementById('fUrl').value.trim() || null,
    categoria: document.getElementById('fCategoria').value,
    dificultad: Number(document.getElementById('fDificultad').value),
    peso_sorteo: Number(document.getElementById('fPeso').value) || 5,
    recompensa_base: Number(document.getElementById('fMonedas').value) || 60,
    recompensa_xp: Number(document.getElementById('fXP').value) || 30,
    requiere_puntos: puntosMin,
    nivel_minimo: Number(document.getElementById('fNivelMin').value) || 1,
    limite_semanal: Number(document.getElementById('fLimiteSemanal').value) || 3,
    forzada: document.getElementById('fForzada').checked,
    es_semanal: document.getElementById('fEsSemanal').checked,
    activo: document.getElementById('fActivo').checked,
    grados_aptos: grados,
    // Campos de condición
    condicion_tipo: condicion,
    accion_trigger: trigger,
    juego_id: document.getElementById('fJuegoId').value || null,
    meta_cantidad: Number(document.getElementById('fMetaCantidad').value) || 1,
    meta_tiempo_seg: condicion === 'tiempo' ? (Number(document.getElementById('fMetaTiempo').value) || null) : null,
    parametro_valor: document.getElementById('fParametroValor').value || null,
    mensaje_logro: document.getElementById('fMensajeLogro').value.trim() || null,
    oculta: document.getElementById('fOculta').checked,
    meta_progreso: Number(document.getElementById('fMetaCantidad').value) || 1,
  };

  var btn = document.getElementById('btnGuardarMision');
  btn.disabled = true;

  var promesa = id
    ? apiPut(Object.assign({ action: 'editar_mision', id: id }, payload))
    : apiPost(Object.assign({ action: 'crear_mision' }, payload));

  promesa
    .then(function (data) {
      btn.disabled = false;
      if (id) {
        var idx = STATE.misiones.findIndex(function (x) { return x.id === id; });
        if (idx >= 0) STATE.misiones[idx] = Object.assign(STATE.misiones[idx], payload, { id: id });
      } else if (data && data.id) {
        STATE.misiones.push(Object.assign({ id: data.id }, payload));
      }
      cerrarModal('modalMision');
      actualizarStats();
      renderTabla();
      toast(id ? '✅ Misión actualizada' : '✅ Misión creada', 'success');
    })
    .catch(function () {
      btn.disabled = false;
      toast('❌ Error al guardar', 'error');
    });
}

// ============================================
// POBLAR CATÁLOGO
// ============================================
document.addEventListener('clerkReady', function () {
  document.getElementById('btnPoblarCatalogo').addEventListener('click', function () {
    if (!confirm('¿Insertar el catálogo completo de ~50 misiones predefinidas? Solo se agregarán las que no existan (no sobreescribe).')) return;
    poblarCatalogo();
  });
});

function poblarCatalogo() {
  var total = CATALOGO_PREDEFINIDO.length;
  var creadas = 0;
  var omitidas = 0;
  var btn = document.getElementById('btnPoblarCatalogo');
  btn.disabled = true;
  btn.textContent = '⏳ Poblando...';

  // Insertar secuencialmente para evitar conflictos
  var index = 0;
  function siguiente() {
    if (index >= total) {
      cargarMisiones();
      btn.disabled = false;
      btn.textContent = '🔄 Poblar Catálogo';
      toast('✅ Catálogo poblado: ' + creadas + ' creadas, ' + omitidas + ' ya existían', 'success');
      return;
    }
    var m = CATALOGO_PREDEFINIDO[index++];
    var grados = m.grados_aptos || [];
    apiPost({
      action: 'crear_mision',
      tipo: m.tipo,
      descripcion: m.descripcion,
      icono: m.icono || '🎯',
      categoria: m.categoria || 'juego',
      dificultad: m.dificultad || 1,
      recompensa_base: m.recompensa_base || 60,
      recompensa_xp: m.recompensa_xp || 30,
      url_destino: m.url_destino || null,
      peso_sorteo: m.peso_sorteo || 5,
      limite_semanal: m.limite_semanal || 3,
      forzada: m.forzada || false,
      es_semanal: m.es_semanal || false,
      activo: m.activo !== false,
      grados_aptos: grados,
      requiere_puntos: m.requiere_puntos || null,
      nivel_minimo: m.nivel_minimo || 1,
      meta_progreso: m.meta_progreso || 1,
      condicion_tipo: m.condicion_tipo || 'auto',
      accion_trigger: m.accion_trigger || 'juego_completado',
      juego_id: m.juego_id || null,
      meta_cantidad: m.meta_cantidad || 1,
      meta_tiempo_seg: m.meta_tiempo_seg || null,
      parametro_valor: m.parametro_valor || null,
      mensaje_logro: m.mensaje_logro || null,
      oculta: m.oculta || false,
    })
      .then(function () { creadas++; siguiente(); })
      .catch(function () { omitidas++; siguiente(); }); // 409 = ya existe, continuar
  }
  siguiente();
}

// ============================================
// EVENTO BANNER
// ============================================
function renderEventoBanner() {
  var banner = document.getElementById('eventoBanner');
  var titulo = document.getElementById('eventoTitulo');
  var sub = document.getElementById('eventoSub');
  var timer = document.getElementById('eventoTimer');
  var btnDes = document.getElementById('btnDesactivarEvento');

  if (STATE.eventoTimer) { clearInterval(STATE.eventoTimer); STATE.eventoTimer = null; }

  if (!STATE.evento || !STATE.evento.fin) {
    banner.classList.add('inactivo');
    titulo.textContent = '⚡ Sin evento activo';
    sub.textContent = 'Activa un evento para multiplicar recompensas temporalmente';
    timer.textContent = '';
    btnDes.style.display = 'none';
    return;
  }

  var fin = new Date(STATE.evento.fin);
  if (fin <= new Date()) {
    banner.classList.add('inactivo');
    titulo.textContent = '⚡ Evento finalizado';
    sub.textContent = 'El último evento ya terminó. Activa uno nuevo.';
    timer.textContent = '';
    btnDes.style.display = 'none';
    return;
  }

  banner.classList.remove('inactivo');
  titulo.textContent = '⚡ EVENTO ACTIVO × ' + (STATE.evento.multiplicador || 2) + ' — Recompensas multiplicadas';
  btnDes.style.display = 'inline-block';

  function tick() {
    var diff = fin - new Date();
    if (diff <= 0) { clearInterval(STATE.eventoTimer); renderEventoBanner(); return; }
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    timer.textContent = 'Termina en ' + pad(h) + ':' + pad(m) + ':' + pad(s);
    sub.textContent = 'Alcance: ' + (STATE.evento.alcance === 'todas' ? 'todas las misiones activas' : 'misiones marcadas con ⚡');
  }
  tick();
  STATE.eventoTimer = setInterval(tick, 1000);

  btnDes.onclick = function () {
    if (!confirm('¿Desactivar el evento?')) return;
    apiPut({ action: 'desactivar_evento' })
      .then(function () {
        STATE.evento = null;
        renderEventoBanner();
        renderTabla();
        toast('✅ Evento desactivado', 'success');
      });
  };
}

// ============================================
// MODAL EVENTO
// ============================================
function initModalEvento() {
  document.getElementById('btnGestionarEvento').addEventListener('click', function () {
    // Prefill con valores actuales si hay evento
    var ahora = new Date();
    var manana = new Date(ahora.getTime() + 24 * 3600000);
    document.getElementById('fEventoInicio').value = ahora.toISOString().slice(0, 16);
    document.getElementById('fEventoFin').value = manana.toISOString().slice(0, 16);
    if (STATE.evento) {
      document.getElementById('fMultiplicador').value = STATE.evento.multiplicador || 2;
      document.querySelectorAll('.mult-opt').forEach(function (opt) {
        opt.classList.toggle('active', Number(opt.dataset.val) === Number(STATE.evento.multiplicador || 2));
      });
    }
    abrirModal('modalEvento');
  });
  document.getElementById('btnCerrarModalEvento').addEventListener('click', function () { cerrarModal('modalEvento'); });
  document.getElementById('modalEvento').addEventListener('click', function (e) { if (e.target === this) cerrarModal('modalEvento'); });

  document.querySelectorAll('.mult-opt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.mult-opt').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      document.getElementById('fMultiplicador').value = this.dataset.val;
    });
  });

  document.getElementById('btnActivarEvento').addEventListener('click', activarEvento);
}

function activarEvento() {
  var fin = document.getElementById('fEventoFin').value;
  var multi = Number(document.getElementById('fMultiplicador').value) || 2;
  var alcance = document.getElementById('fEventoAlcance').value;
  if (!fin) { toast('⚠️ Define la fecha de fin', 'warning'); return; }

  var btn = document.getElementById('btnActivarEvento');
  btn.disabled = true;

  apiPost({ action: 'activar_evento', multiplicador: multi, fin: new Date(fin).toISOString(), alcance: alcance })
    .then(function (data) {
      btn.disabled = false;
      STATE.evento = { multiplicador: multi, fin: new Date(fin).toISOString(), alcance: alcance };
      cerrarModal('modalEvento');
      renderEventoBanner();
      renderTabla();
      toast('⚡ Evento × ' + multi + ' activado hasta ' + new Date(fin).toLocaleString('es-CL'), 'success');
    })
    .catch(function () {
      btn.disabled = false;
      toast('❌ Error al activar evento', 'error');
    });
}

// ============================================
// HELPERS API
// ============================================
function apiPost(body) {
  return fetch(BASE_URL + '/api/admin', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {})
    },
    body: JSON.stringify(body),
  })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.error) throw new Error(d.mensaje || 'Error');
      return d;
    });
}

function apiPut(body) {
  return fetch(BASE_URL + '/api/admin', {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {})
    },
    body: JSON.stringify(body),
  })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.error) throw new Error(d.mensaje || 'Error');
      return d;
    });
}

function apiDelete(body) {
  return fetch(BASE_URL + '/api/admin', {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {})
    },
    body: JSON.stringify(body),
  })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.error) throw new Error(d.mensaje || 'Error');
      return d;
    });
}

function pad(n) { return String(n).padStart(2, '0'); }
