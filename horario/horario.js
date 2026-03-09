// ============================================
// ARCHIVO: /horario/horario.js
// ============================================
// ÍNDICE
// 1.  Constantes y config
// 2.  Estado global
// 3.  Inicialización
// 4.  Flujo de autenticación
// 5.  Cargar colegios (invitado)
// 6.  Cargar horario desde API
// 7.  Renderizar tabla
// 8.  Renderizar fila de bloque
// 9.  Renderizar evaluaciones pendientes
// 10. Lógica de evaluaciones + resalte
// 11. Navegación de semana
// 12. Toggle columna viernes
// 13. Modo admin — editar celda
// 14. Modo admin — editar horario bloque
// 15. Popup de evaluación
// 16. Leyenda
// 17. Toasts
// 18. Helpers de fecha
// ============================================

// ============================================
// 1. CONSTANTES Y CONFIG
// ============================================
var BASE_URL = (typeof window.EDUCOINS_BASE !== 'undefined' ? window.EDUCOINS_BASE : '') || '';

var DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
var DIAS_SHORT = ['', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE'];

// Recreos y almuerzo — fijos, no van en BD
var FILAS_ESPECIALES = [
  // Después del bloque 2: Recreo 1
  { despuesDeBloque: 2, tipo: 'recreo', label: '☕ RECREO 1', hora_lj: '09:30-09:55', hora_v: '09:30-09:45' },
  // Después del bloque 4: Recreo 2
  { despuesDeBloque: 4, tipo: 'recreo', label: '☕ RECREO 2', hora_lj: '11:25-11:45', hora_v: '11:15-11:30' },
  // Después del bloque 6: Almuerzo
  { despuesDeBloque: 6, tipo: 'almuerzo', label: '🍽️ ALMUERZO', hora_lj: '13:15-14:00', hora_v: '' },
];

var ASIG_CONFIG = {
  'Matematicas': { emoji: '➗', css: 'asig-Matematicas', color: '#3b82f6' },
  'Lenguaje': { emoji: '📖', css: 'asig-Lenguaje', color: '#ef4444' },
  'Historia': { emoji: '🏛️', css: 'asig-Historia', color: '#facc15' },
  'Ciencias': { emoji: '🔬', css: 'asig-Ciencias', color: '#22c55e' },
  'Ingles': { emoji: '🇬🇧', css: 'asig-Ingles', color: '#f97316' },
  'Ed. Fisica': { emoji: '⚽', css: 'asig-EdFisica', color: '#06b6d4' },
  'Musica': { emoji: '🎵', css: 'asig-Musica', color: '#a855f7' },
  'Artes': { emoji: '🎨', css: 'asig-Artes', color: '#ec4899' },
  'Tecnologia': { emoji: '💻', css: 'asig-Tecnologia', color: '#64748b' },
  'Orientacion': { emoji: '🧭', css: 'asig-Orientacion', color: '#14b8a6' },
  'Educ. Cristiana': { emoji: '✝️', css: 'asig-EduCristiana', color: '#fbbf24' },
  'Artes Visuales': { emoji: '🖼️', css: 'asig-ArtesVisuales', color: '#f472b6' },
  'Libre': { emoji: '📋', css: 'asig-Libre', color: '#475569' },
};

var OPCIONES_ASIG = [
  { value: '', label: '— vacío —' },
  { value: 'Matematicas', label: '➗ Matemáticas' },
  { value: 'Lenguaje', label: '📖 Lenguaje' },
  { value: 'Historia', label: '🏛️ Historia' },
  { value: 'Ciencias', label: '🔬 Ciencias' },
  { value: 'Ingles', label: '🇬🇧 Inglés' },
  { value: 'Ed. Fisica', label: '⚽ Ed. Física' },
  { value: 'Musica', label: '🎵 Música' },
  { value: 'Artes', label: '🎨 Artes' },
  { value: 'Tecnologia', label: '💻 Tecnología' },
  { value: 'Orientacion', label: '🧭 Orientación' },
  { value: 'Educ. Cristiana', label: '✝️ Ed. Cristiana' },
  { value: 'Artes Visuales', label: '🖼️ Artes Visuales' },
  { value: 'Libre', label: '📋 Libre' },
];

// ============================================
// 2. ESTADO GLOBAL
// ============================================
var STATE = {
  // Datos del usuario
  esAdmin: false,
  esInvitado: true,
  clerkId: null,

  // Horario cargado
  colegioId: null,
  colegioNombre: '',
  grado: null,
  matriz: {},   // matriz[dia][bloque] = asignatura | null
  bloques: [],   // [{bloque, hora_lj, hora_v}]

  // Evaluaciones
  evaluaciones: [],   // del calendario (pendientes)

  // Semana visualizada
  semanaOffset: 0,    // 0 = semana actual, 1 = siguiente, etc.
  semanaEvals: {},   // {asignatura: [eval,...]} para la semana a mostrar

  // UI
  modoAdmin: false,
  viernesVisible: true,
};

// ============================================
// 3. INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function () {
  // Eventos estáticos
  document.getElementById('btnToggleViernes').addEventListener('click', toggleViernes);
  document.getElementById('btnToggleEvals').addEventListener('click', toggleEvalsPanel);
  document.getElementById('btnSemAnt').addEventListener('click', function () { cambiarSemana(-1); });
  document.getElementById('btnSemSig').addEventListener('click', function () { cambiarSemana(1); });
  document.getElementById('btnSemHoy').addEventListener('click', function () { STATE.semanaOffset = 0; actualizarSemana(); });
  document.getElementById('btnEditarModo').addEventListener('click', toggleModoAdmin);
  document.getElementById('btnCerrarPopup').addEventListener('click', cerrarPopup);
  document.getElementById('btnPopupCerrar').addEventListener('click', cerrarPopup);
  document.getElementById('btnPopupCal').addEventListener('click', irACalendario);
  document.getElementById('popupEval').addEventListener('click', function (e) {
    if (e.target === this) cerrarPopup();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cerrarPopup();
  });

  // Invitado — cargar colegios
  cargarColegiosInvitado();
  document.getElementById('invColegioSelect').addEventListener('change', verificarInvitado);
  document.getElementById('invGradoSelect').addEventListener('change', verificarInvitado);
  document.getElementById('invVerBtn').addEventListener('click', verHorarioInvitado);
});

// ============================================
// 4. FLUJO DE AUTENTICACIÓN
// Espera el evento 'clerkReady' que dispara clerk-guard.js
// con el token ya validado en e.detail o en window.CLERK_TOKEN
// ============================================
document.addEventListener('clerkReady', function (e) {
  var user = e.detail;
  STATE.clerkId = user.id;
  STATE.esInvitado = false;

  // Obtener token fresco directamente de Clerk
  // (más confiable que window.CLERK_TOKEN que puede estar caducado)
  var tokenPromise;
  if (window.Clerk && window.Clerk.session) {
    tokenPromise = window.Clerk.session.getToken();
  } else if (window.CLERK_TOKEN) {
    tokenPromise = Promise.resolve(window.CLERK_TOKEN);
  } else {
    mostrarVistaInvitado();
    return;
  }

  tokenPromise.then(function (token) {
    if (!token) { mostrarVistaInvitado(); return; }

    // Guardar token fresco para uso posterior
    window.CLERK_TOKEN = token;

    fetch(BASE_URL + '/api/perfil', {
      credentials: 'include',
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) { mostrarVistaInvitado(); return; }

        // La API puede devolver el perfil directo o envuelto en .perfil
        var p = data.clerk_id ? data : (data.perfil || null);
        if (!p) { mostrarVistaInvitado(); return; }

        STATE.esAdmin = p.rol === 'admin';
        STATE.colegioId = p.colegio_id || null;
        STATE.grado = p.grado_actual || p.grado_ingreso || null;

        if (!STATE.colegioId || !STATE.grado) {
          // Autenticado pero sin colegio/grado asignado → invitado
          mostrarVistaInvitado();
          return;
        }

        if (STATE.esAdmin) {
          document.getElementById('btnEditarModo').style.display = 'flex';
        }

        cargarEvaluaciones(function () {
          cargarHorario(STATE.colegioId, STATE.grado);
        });
      })
      .catch(function () { mostrarVistaInvitado(); });

  }).catch(function () { mostrarVistaInvitado(); });
});

// Timeout fallback — si clerkReady no llega en 5s → invitado
// Solo actuar si el spinner sigue visible (ninguna vista fue mostrada aún)
setTimeout(function () {
  var spinner = document.getElementById('authSpinner');
  if (spinner && spinner.style.display !== 'none') {
    // El spinner sigue visible → clerkReady nunca llegó → mostrar invitado
    mostrarVistaInvitado();
  }
}, 5000);

// ============================================
// 5. MOSTRAR VISTAS
// ============================================
function mostrarVistaInvitado() {
  // Ocultar spinner, mostrar layout
  var spinner = document.getElementById('authSpinner');
  var layout = document.getElementById('horarioLayout');
  if (spinner) spinner.style.display = 'none';
  if (layout) layout.style.display = 'flex';

  document.getElementById('vistaInvitado').style.display = 'flex';
  document.getElementById('vistaHorario').style.display = 'none';

  // Personalizar texto según si es admin autenticado o invitado real
  var titulo = document.getElementById('invitadoTitulo');
  var sub = document.getElementById('invitadoSub');
  if (STATE.esAdmin) {
    if (titulo) titulo.textContent = 'SELECCIONAR HORARIO';
    if (sub) sub.textContent = 'Selecciona el colegio y curso para editar el horario 👑';
  } else if (!STATE.esInvitado) {
    // Alumno sin colegio asignado
    if (titulo) titulo.textContent = 'CONFIGURA TU COLEGIO';
    if (sub) sub.textContent = 'Aún no tienes un colegio asignado. Selecciónalo para ver tu horario 📚';
  }
}

function mostrarVistaHorario() {
  // Ocultar spinner, mostrar layout
  var spinner = document.getElementById('authSpinner');
  var layout = document.getElementById('horarioLayout');
  if (spinner) spinner.style.display = 'none';
  if (layout) layout.style.display = 'flex';

  document.getElementById('vistaInvitado').style.display = 'none';
  document.getElementById('vistaHorario').style.display = 'block';
}

function cargarColegiosInvitado() {
  fetch(BASE_URL + '/api/colegios')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.colegios) return;
      var sel = document.getElementById('invColegioSelect');
      data.colegios.forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nombre + ' — ' + c.comuna;
        sel.appendChild(opt);
      });
    })
    .catch(function () { });
}

function verificarInvitado() {
  var colegio = document.getElementById('invColegioSelect').value;
  var grado = document.getElementById('invGradoSelect').value;
  var btn = document.getElementById('invVerBtn');
  btn.disabled = !(colegio && grado);
}

function verHorarioInvitado() {
  var colegioId = document.getElementById('invColegioSelect').value;
  var grado = parseInt(document.getElementById('invGradoSelect').value);
  if (!colegioId || !grado) return;

  STATE.colegioId = colegioId;
  STATE.grado     = grado;

  // Si es admin, mostrar botón editar
  var btnEditar = document.getElementById('btnEditarModo');
  if (STATE.esAdmin && btnEditar) {
    btnEditar.style.display = 'flex';
  }

  mostrarVistaHorario();

  // Cargar evaluaciones personales (independiente del colegio/grado)
  // aunque el usuario no tenga colegio_id asignado en su perfil
  if (!STATE.esInvitado) {
    cargarEvaluaciones(function () {
      cargarHorario(colegioId, grado);
    });
  } else {
    cargarHorario(colegioId, grado);
  }
}

// ============================================
// 6. CARGAR EVALUACIONES (para resalte)
// ============================================
function cargarEvaluaciones(callback) {
  var evalUrl = BASE_URL + '/api/evaluaciones';
  if (STATE.colegioId && STATE.grado) {
    evalUrl += '?colegio_id=' + STATE.colegioId + '&grado=' + STATE.grado;
  }
  fetch(evalUrl, {
    credentials: 'include',
    headers: {
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {})
    }
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (data && data.evaluaciones) {
        // Normalizar fecha a 'YYYY-MM-DD' (la API puede devolver ISO completo)
        var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        STATE.evaluaciones = data.evaluaciones
          .map(function (e) {
            e.fecha_evaluacion = e.fecha_evaluacion.substring(0, 10);
            return e;
          })
          .filter(function (e) {
            var fecha = new Date(e.fecha_evaluacion + 'T00:00:00');
            return fecha >= hoy && e.estado !== 'nota_ingresada';
          });
      }
      callback();
    })
    .catch(function () { callback(); });
}

// ============================================
// 7. CARGAR HORARIO DESDE API
// ============================================
function cargarHorario(colegioId, grado) {
  document.getElementById('horarioTablaWrap').innerHTML =
    '<div class="spinner-wrap"><div class="spinner"></div>Cargando horario...</div>';
  mostrarVistaHorario();

  fetch(BASE_URL + '/api/horario?colegio_id=' + colegioId + '&grado=' + grado)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) {
        document.getElementById('horarioTablaWrap').innerHTML =
          '<div class="spinner-wrap">❌ Error al cargar el horario</div>';
        return;
      }

      STATE.colegioNombre = data.colegio.nombre;
      STATE.matriz = data.matriz;
      STATE.bloques = data.bloques;
      STATE.grado = data.grado;

      // Header chips
      var chips = document.getElementById('horarioChips');
      chips.innerHTML =
        '<div class="chip">🏫 ' + data.colegio.nombre + '</div>' +
        '<div class="chip">📚 ' + data.grado + '° Básico</div>' +
        (STATE.esAdmin ? '<div class="chip chip-admin">👑 Admin</div>' : '');

      document.getElementById('horarioSubtitulo').textContent =
        data.colegio.nombre + ' · ' + data.grado + '° Básico';

      // Calcular semana a mostrar y renderizar
      // Si no se cargaron evaluaciones antes (ej. alumno sin colegio_id en perfil),
      // cargarlas ahora que ya tenemos colegio+grado confirmados
      if (STATE.evaluaciones.length === 0 && !STATE.esInvitado) {
        cargarEvaluaciones(function() {
          calcularSemanaEvals();
          actualizarSemana();
          renderTabla();
          renderEvalsPanel();
        });
      } else {
        calcularSemanaEvals();
        actualizarSemana();
        renderTabla();
        renderEvalsPanel();
      }
      renderLeyenda();
    })
    .catch(function (err) {
      console.error('[horario] Error:', err);
      document.getElementById('horarioTablaWrap').innerHTML =
        '<div class="spinner-wrap">❌ Error de conexión</div>';
    });
}

// ============================================
// 8. CALCULAR SEMANA Y EVALUACIONES A RESALTAR
// ============================================
function calcularSemanaEvals() {
  // Obtener lunes de la semana con offset
  var lunes = getLunesSemana(STATE.semanaOffset);
  var viernes = new Date(lunes); viernes.setDate(viernes.getDate() + 4);

  // Filtrar evaluaciones que caen en esta semana
  var evalsEstaSemana = STATE.evaluaciones.filter(function (e) {
    var fecha = new Date(e.fecha_evaluacion + 'T00:00:00');
    return fecha >= lunes && fecha <= viernes;
  });

  // Si no hay evaluaciones esta semana, buscar la siguiente con evaluaciones
  if (evalsEstaSemana.length === 0 && STATE.semanaOffset === 0) {
    var evalsFuturas = STATE.evaluaciones.filter(function (e) {
      return new Date(e.fecha_evaluacion + 'T00:00:00') > viernes;
    });
    if (evalsFuturas.length > 0) {
      evalsFuturas.sort(function (a, b) {
        return new Date(a.fecha_evaluacion) - new Date(b.fecha_evaluacion);
      });
      var proxFecha = new Date(evalsFuturas[0].fecha_evaluacion + 'T00:00:00');
      var proxLunes = getLunesDeFecha(proxFecha);
      var proxViernes = new Date(proxLunes); proxViernes.setDate(proxViernes.getDate() + 4);
      evalsEstaSemana = STATE.evaluaciones.filter(function (e) {
        var f = new Date(e.fecha_evaluacion + 'T00:00:00');
        return f >= proxLunes && f <= proxViernes;
      });
    }
  }

  // Construir mapa: asignatura -> [evals] para resalte
  STATE.semanaEvals = {};
  evalsEstaSemana.forEach(function (e) {
    if (!STATE.semanaEvals[e.asignatura]) STATE.semanaEvals[e.asignatura] = [];
    STATE.semanaEvals[e.asignatura].push(e);
  });
}

function getLunesSemana(offset) {
  var hoy = new Date();
  var dia = hoy.getDay(); // 0=dom, 1=lun...
  var diff = dia === 0 ? -6 : 1 - dia;
  var lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff + (offset * 7));
  lunes.setHours(0, 0, 0, 0);
  return lunes;
}

function getLunesDeFecha(fecha) {
  var dia = fecha.getDay();
  var diff = dia === 0 ? -6 : 1 - dia;
  var lunes = new Date(fecha);
  lunes.setDate(fecha.getDate() + diff);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
}

// ============================================
// 9. NAVEGACIÓN DE SEMANA
// ============================================
function cambiarSemana(delta) {
  STATE.semanaOffset += delta;
  calcularSemanaEvals();
  actualizarSemana();
  renderTabla();
}

function actualizarSemana() {
  var lunes = getLunesSemana(STATE.semanaOffset);
  var viernes = new Date(lunes); viernes.setDate(lunes.getDate() + 4);

  var opts = { day: 'numeric', month: 'short' };
  var label = lunes.toLocaleDateString('es-CL', opts) + ' — ' +
    viernes.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  document.getElementById('semanaLabel').textContent = label;

  var badge = document.getElementById('semanaBadge');
  if (STATE.semanaOffset === 0) {
    badge.className = 'semana-badge-actual';
    badge.textContent = '✅ Semana actual';
  } else if (STATE.semanaOffset > 0) {
    badge.className = 'semana-badge-prox';
    badge.textContent = STATE.semanaOffset === 1 ? '⏭ Próxima semana' : 'En ' + STATE.semanaOffset + ' semanas';
  } else {
    badge.className = 'semana-badge-prox';
    badge.textContent = 'Hace ' + Math.abs(STATE.semanaOffset) + ' semana' + (Math.abs(STATE.semanaOffset) > 1 ? 's' : '');
  }
}

// ============================================
// 10. RENDERIZAR TABLA
// ============================================
function renderTabla() {
  var hoy = new Date();
  var diaHoy = hoy.getDay(); // 1=lun...5=vie, 0=dom,6=sab
  var lunes = getLunesSemana(STATE.semanaOffset);

  // Construir thead
  var theadHtml = '<thead><tr>';
  // Col bloque L-J
  theadHtml += '<th class="th-dia th-bloque-col">HORARIO</th>';
  // Días 1-4 (L-J)
  for (var d = 1; d <= 4; d++) {
    var fechaDia = new Date(lunes); fechaDia.setDate(lunes.getDate() + (d - 1));
    var esHoy = STATE.semanaOffset === 0 && d === diaHoy;
    theadHtml += '<th class="th-dia' + (esHoy ? ' th-dia-hoy' : '') + '">' +
      DIAS_SHORT[d] +
      (esHoy ? ' ★' : '') +
      '<br><span style="font-family:Nunito,sans-serif;font-size:.6rem;font-weight:700;color:#475569">' +
      fechaDia.getDate() + '/' + (fechaDia.getMonth() + 1) + '</span>' +
      '</th>';
  }
  // Col hora viernes
  var viernesDisplay = STATE.viernesVisible ? '' : 'display:none';
  theadHtml += '<th class="th-dia th-viernes-hora" id="thViernesHora" style="' + viernesDisplay + '">H.V.</th>';
  // Col viernes
  var fechaVie = new Date(lunes); fechaVie.setDate(lunes.getDate() + 4);
  var esHoyVie = STATE.semanaOffset === 0 && diaHoy === 5;
  theadHtml += '<th class="th-dia' + (esHoyVie ? ' th-dia-hoy' : '') + '" id="thViernes" style="' + viernesDisplay + '">' +
    'VIE' + (esHoyVie ? ' ★' : '') +
    '<br><span style="font-family:Nunito,sans-serif;font-size:.6rem;font-weight:700;color:#475569">' +
    fechaVie.getDate() + '/' + (fechaVie.getMonth() + 1) + '</span>' +
    '</th>';
  theadHtml += '</tr></thead>';

  // Construir tbody
  var tbodyHtml = '<tbody>';
  for (var blq = 1; blq <= 8; blq++) {
    // Fila especial antes de este bloque?
    var especial = FILAS_ESPECIALES.find(function (f) { return f.despuesDeBloque === blq - 1; });
    if (especial) {
      tbodyHtml += renderFilaEspecial(especial);
    }
    tbodyHtml += renderFilaBloque(blq);
  }
  tbodyHtml += '</tbody>';

  var tabla = '<table class="horario-tabla">' + theadHtml + tbodyHtml + '</table>';
  document.getElementById('horarioTablaWrap').innerHTML = tabla;

  // Registrar eventos
  registrarEventosTabla();
}

// ============================================
// 11. RENDERIZAR FILA ESPECIAL (recreo/almuerzo)
// ============================================
function renderFilaEspecial(esp) {
  var vDisplay = STATE.viernesVisible ? '' : 'display:none';
  var html = '<tr class="fila-' + esp.tipo + '">';
  // Celda horario L-J
  html += '<td class="td-bloque"><span class="bloque-hora" style="color:' +
    (esp.tipo === 'recreo' ? '#06b6d4' : '#facc15') + '">' + esp.hora_lj + '</span></td>';
  // Span días L-J
  html += '<td colspan="4"><div class="' + esp.tipo + '-label">' + esp.label + '</div></td>';
  // Hora viernes
  html += '<td class="td-viernes-hora" style="' + vDisplay + '">';
  if (esp.hora_v) {
    html += '<span class="viernes-hora-txt" style="color:' +
      (esp.tipo === 'recreo' ? '#06b6d4' : '#facc15') + '">' + esp.hora_v + '</span>';
  }
  html += '</td>';
  // Asig viernes (recreo/almuerzo también)
  html += '<td style="' + vDisplay + '"><div class="' + esp.tipo + '-label" style="font-size:.3rem">' +
    (esp.hora_v ? esp.label : '') + '</div></td>';
  html += '</tr>';
  return html;
}

// ============================================
// 12. RENDERIZAR FILA DE BLOQUE
// ============================================
function renderFilaBloque(blq) {
  var configBloque = STATE.bloques.find(function (b) { return b.bloque === blq; }) || {};
  var horaLJ = configBloque.hora_lj || '';
  var horaV = configBloque.hora_v || '';
  var vDisplay = STATE.viernesVisible ? '' : 'display:none';

  var html = '<tr>';

  // ── Celda horario L-J ──
  var clasesHoraLJ = 'td-bloque' + (STATE.modoAdmin ? ' modo-admin-hora' : '');
  html += '<td class="' + clasesHoraLJ + '" data-bloque="' + blq + '" data-tipo="hora-lj">' +
    '<span class="bloque-hora">' + horaLJ + '</span>' +
    (STATE.modoAdmin ?
      '<input class="bloque-hora-edit" type="text" value="' + horaLJ +
      '" placeholder="HH:MM-HH:MM" data-bloque="' + blq + '" data-tipo="lj">' : '') +
    '</td>';

  // ── Celdas L-J (días 1-4) ──
  for (var d = 1; d <= 4; d++) {
    var asig = (STATE.matriz[d] && STATE.matriz[d][blq]) || null;
    html += renderCeldaAsig(d, blq, asig);
  }

  // ── Celda hora viernes ──
  var clasesHoraV = 'td-viernes-hora' + (STATE.modoAdmin ? ' modo-admin-hora' : '');
  html += '<td class="' + clasesHoraV + '" style="' + vDisplay + '" data-bloque="' + blq + '" data-tipo="hora-v">' +
    '<span class="viernes-hora-txt">' + horaV + '</span>' +
    (STATE.modoAdmin ?
      '<input class="viernes-hora-edit" type="text" value="' + horaV +
      '" placeholder="HH:MM-HH:MM" data-bloque="' + blq + '" data-tipo="v">' : '') +
    '</td>';

  // ── Celda asignatura viernes (día 5) ──
  var asigV = (STATE.matriz[5] && STATE.matriz[5][blq]) || null;
  html += renderCeldaAsig(5, blq, asigV, vDisplay);

  html += '</tr>';
  return html;
}

// ============================================
// 13. RENDERIZAR CELDA DE ASIGNATURA
// ============================================
function renderCeldaAsig(dia, blq, asig, extraStyle) {
  extraStyle = extraStyle || '';
  var cfg = asig ? (ASIG_CONFIG[asig] || { emoji: '📋', css: 'asig-Libre', color: '#475569' }) : null;

  // ¿Tiene evaluación resaltada?
  var tieneEval = asig && STATE.semanaEvals[asig] && STATE.semanaEvals[asig].length > 0;

  // Clases
  var clases = 'td-asig';
  if (tieneEval && !STATE.modoAdmin) clases += ' tiene-eval clickable';
  if (STATE.modoAdmin) clases += ' modo-admin';

  var html = '<td class="' + clases + '"' +
    ' data-dia="' + dia + '" data-bloque="' + blq + '"' +
    ' data-asig="' + (asig || '') + '"' +
    (extraStyle ? ' style="' + extraStyle + '"' : '') + '>';

  if (tieneEval) html += '<div class="eval-dot"></div>';

  if (STATE.modoAdmin) {
    // Modo edición: mostrar select
    html += '<select class="asig-select" data-dia="' + dia + '" data-bloque="' + blq + '">';
    OPCIONES_ASIG.forEach(function (op) {
      html += '<option value="' + op.value + '"' +
        (asig === op.value ? ' selected' : '') + '>' + op.label + '</option>';
    });
    html += '</select>';
  } else if (cfg) {
    html += '<div class="asig-pill ' + cfg.css + '">' +
      cfg.emoji + ' ' + asig.replace('Ed. Fisica', 'Ed.Física') + '</div>';
  }

  if (STATE.modoAdmin) html += '<span class="edit-hint">✏️</span>';

  html += '</td>';
  return html;
}

// ============================================
// 14. REGISTRAR EVENTOS EN TABLA
// ============================================
function registrarEventosTabla() {
  // Click en celda con evaluación (modo lectura)
  if (!STATE.modoAdmin) {
    document.querySelectorAll('.td-asig.clickable').forEach(function (td) {
      td.addEventListener('click', function () {
        var asig = this.dataset.asig;
        if (asig && STATE.semanaEvals[asig]) {
          abrirPopupEval(STATE.semanaEvals[asig][0]);
        }
      });
    });
  }

  // Modo admin — select de asignatura
  if (STATE.modoAdmin) {
    document.querySelectorAll('.asig-select').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var dia = parseInt(this.dataset.dia);
        var blq = parseInt(this.dataset.bloque);
        var asig = this.value;
        guardarCelda(dia, blq, asig);
      });
    });

    // Modo admin — inputs de hora (blur para guardar)
    document.querySelectorAll('.bloque-hora-edit, .viernes-hora-edit').forEach(function (inp) {
      // Mostrar siempre en modo admin
      inp.style.display = 'block';
      var prev = inp.previousElementSibling;
      if (prev) prev.style.display = 'none';

      inp.addEventListener('blur', function () {
        var blq = parseInt(this.dataset.bloque);
        var tipo = this.dataset.tipo; // 'lj' o 'v'
        var val = this.value.trim();
        guardarHoraBloque(blq, tipo, val);
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') this.blur();
        if (e.key === 'Escape') {
          var cfg = STATE.bloques.find(function (b) { return b.bloque === parseInt(inp.dataset.bloque); });
          this.value = cfg ? (tipo === 'lj' ? cfg.hora_lj : cfg.hora_v) : '';
          this.blur();
        }
      });
    });
  }
}

// ============================================
// 15. MODO ADMIN — GUARDAR CELDA
// ============================================
function guardarCelda(dia, blq, asig) {
  var tokenPromise = (window.Clerk && window.Clerk.session)
    ? window.Clerk.session.getToken()
    : Promise.resolve(window.CLERK_TOKEN);

  tokenPromise.then(function (token) {
    if (!token) { toast('⚠️ Sin sesión activa', 'warning'); return; }
    window.CLERK_TOKEN = token;

    fetch(BASE_URL + '/api/horario', {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accion: 'celda',
        colegio_id: STATE.colegioId,
        grado: STATE.grado,
        dia_semana: dia,
        bloque: blq,
        asignatura: asig || null,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { toast('⚠️ ' + (data.mensaje || 'Error al guardar'), 'warning'); return; }
        if (!STATE.matriz[dia]) STATE.matriz[dia] = {};
        STATE.matriz[dia][blq] = asig || null;
        toast('✅ ' + DIAS[dia] + ' bloque guardado', 'success');
      })
      .catch(function () { toast('❌ Error de conexión', 'error'); });
  });
}

// ============================================
// 16. MODO ADMIN — GUARDAR HORA BLOQUE
// ============================================
function guardarHoraBloque(blq, tipo, valor) {
  var formatoOk = /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(valor) || valor === '';
  if (!formatoOk) {
    toast('⚠️ Formato inválido. Usar HH:MM-HH:MM', 'warning');
    return;
  }

  var body = {
    accion: 'bloque',
    colegio_id: STATE.colegioId,
    bloque: blq,
  };
  if (tipo === 'lj') body.hora_lj = valor;
  else body.hora_v = valor;

  var tokenPromise = (window.Clerk && window.Clerk.session)
    ? window.Clerk.session.getToken()
    : Promise.resolve(window.CLERK_TOKEN);

  tokenPromise.then(function (token) {
    if (!token) { toast('⚠️ Sin sesión activa', 'warning'); return; }
    window.CLERK_TOKEN = token;

    fetch(BASE_URL + '/api/horario', {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { toast('⚠️ ' + (data.mensaje || 'Error'), 'warning'); return; }
        var cfg = STATE.bloques.find(function (b) { return b.bloque === blq; });
        if (cfg) {
          if (tipo === 'lj') cfg.hora_lj = valor;
          else cfg.hora_v = valor;
        }
        toast('✅ Horario bloque ' + blq + ' actualizado', 'success');
      })
      .catch(function () { toast('❌ Error de conexión', 'error'); });
  });
}

// ============================================
// 17. TOGGLE MODO ADMIN
// ============================================
function toggleModoAdmin() {
  STATE.modoAdmin = !STATE.modoAdmin;
  var btn = document.getElementById('btnEditarModo');
  btn.classList.toggle('activo', STATE.modoAdmin);
  btn.textContent = STATE.modoAdmin ? '✅ GUARDANDO AUTO' : '✏️ EDITAR HORARIO';
  renderTabla();
  toast(STATE.modoAdmin ? '✏️ Modo edición activado' : '✅ Modo edición desactivado', 'info');
}

// ============================================
// 18. TOGGLE VIERNES
// ============================================
function toggleViernes() {
  STATE.viernesVisible = !STATE.viernesVisible;

  // Ocultar/mostrar todas las celdas de viernes
  var selectors = [
    '#thViernesHora', '#thViernes',
    '[data-dia="5"]',
    'td[data-tipo="hora-v"]',
    '.td-viernes-hora', '.fila-recreo td:last-child',
    '.fila-almuerzo td:last-child', '.fila-recreo td:nth-last-child(2)',
    '.fila-almuerzo td:nth-last-child(2)',
  ];

  // Más simple: re-renderizar tabla
  renderTabla();

  var btn = document.getElementById('viernesToggleTxt');
  if (btn) btn.textContent = STATE.viernesVisible ? 'Ocultar Viernes especial' : 'Mostrar Viernes especial';
  document.getElementById('viernesIcon').textContent = STATE.viernesVisible ? '◀' : '▶';
}

// ============================================
// 19. PANEL EVALUACIONES PENDIENTES
// ============================================
function renderEvalsPanel() {
  var section = document.getElementById('evalsSection');
  var lista = document.getElementById('evalsLista');
  var badge = document.getElementById('evalsBadge');

  if (!STATE.evaluaciones.length || STATE.esInvitado) {
    section.style.display = 'none';
    return;
  }

  // Ordenar por fecha
  var sorted = STATE.evaluaciones.slice().sort(function (a, b) {
    return new Date(a.fecha_evaluacion) - new Date(b.fecha_evaluacion);
  });

  badge.textContent = sorted.length + ' pendiente' + (sorted.length !== 1 ? 's' : '');
  section.style.display = 'block';

  var html = '';
  if (sorted.length === 0) {
    html = '<div class="evals-empty">🎉 No tienes evaluaciones pendientes</div>';
  } else {
    sorted.forEach(function (e) {
      var cfg = ASIG_CONFIG[e.asignatura] || { emoji: '📚', color: '#94a3b8' };
      var dias = diasRestantes(e.fecha_evaluacion);
      var diasHtml, diasClass;
      if (dias === 0) { diasHtml = '🚨 HOY'; diasClass = 'dias-urgente'; }
      else if (dias === 1) { diasHtml = '⚠️ MAÑANA'; diasClass = 'dias-urgente'; }
      else if (dias <= 3) { diasHtml = 'EN ' + dias + ' DÍAS'; diasClass = 'dias-pronto'; }
      else { diasHtml = 'EN ' + dias + ' DÍAS'; diasClass = 'dias-normal'; }

      var estadoLabel = { pendiente: '⏳ Pendiente', estudiado: '📖 Estudiando', rendida: '✏️ Rendida' };

      html += '<div class="eval-row" data-eval-id="' + e.id + '">' +
        '<span class="eval-row-emoji">' + cfg.emoji + '</span>' +
        '<div class="eval-row-info">' +
        '<div class="eval-row-asig" style="color:' + cfg.color + '">' + e.asignatura.toUpperCase() + '</div>' +
        '<div class="eval-row-fecha">📅 ' + formatFechaLarga(e.fecha_evaluacion) + '</div>' +
        (e.contenidos ? '<div class="eval-row-contenido">📝 ' + e.contenidos + '</div>' : '') +
        '</div>' +
        '<div class="eval-row-right">' +
        '<div class="eval-row-dias ' + diasClass + '">' + diasHtml + '</div>' +
        '<span class="eval-row-estado estado-' + e.estado + '">' + (estadoLabel[e.estado] || e.estado) + '</span>' +
        '</div>' +
        '</div>';
    });
  }

  lista.innerHTML = html;

  // Click en fila → popup
  lista.querySelectorAll('.eval-row').forEach(function (row) {
    row.addEventListener('click', function () {
      var evalId = this.dataset.evalId;
      var ev = STATE.evaluaciones.find(function (e) { return e.id === evalId; });
      if (ev) abrirPopupEval(ev);
    });
  });
}

function toggleEvalsPanel() {
  var lista = document.getElementById('evalsLista');
  var chevron = document.getElementById('evalsChevron');
  var abierto = lista.classList.contains('visible');
  lista.classList.toggle('visible', !abierto);
  chevron.classList.toggle('open', !abierto);
}

// ============================================
// 20. POPUP DE EVALUACIÓN
// ============================================
function abrirPopupEval(ev) {
  var cfg = ASIG_CONFIG[ev.asignatura] || { emoji: '📚' };
  var dias = diasRestantes(ev.fecha_evaluacion);

  document.getElementById('popupEmoji').textContent = cfg.emoji;
  document.getElementById('popupAsig').textContent = ev.asignatura.toUpperCase();
  document.getElementById('popupFecha').textContent = '📅 ' + formatFechaLarga(ev.fecha_evaluacion);
  document.getElementById('popupContenido').textContent =
    ev.contenidos || 'Sin contenidos especificados';

  var diasTxt = '';
  if (dias === 0) diasTxt = '🚨 ¡ES HOY!';
  else if (dias === 1) diasTxt = '⚠️ ¡ES MAÑANA!';
  else if (dias <= 3) diasTxt = '⏰ En ' + dias + ' días';
  else diasTxt = '📅 En ' + dias + ' días';

  var diasEl = document.getElementById('popupDias');
  diasEl.textContent = diasTxt;
  diasEl.className = 'popup-dias ' +
    (dias <= 1 ? 'dias-urgente' : dias <= 3 ? 'dias-pronto' : 'dias-normal');

  // Guardar referencia para ir al calendario
  diasEl.dataset.evalId = ev.id;

  document.getElementById('popupEval').classList.add('active');
}

function cerrarPopup() {
  document.getElementById('popupEval').classList.remove('active');
}

function irACalendario() {
  window.location.href = BASE_URL + '/calendario/calendario.html';
}

// ============================================
// 21. LEYENDA
// ============================================
function renderLeyenda() {
  var html = '';
  Object.keys(ASIG_CONFIG).forEach(function (asig) {
    var cfg = ASIG_CONFIG[asig];
    html += '<div class="leyenda-item">' +
      '<div class="leyenda-dot" style="background:' + cfg.color + '"></div>' +
      asig.replace('Ed. Fisica', 'Ed.Física') + '</div>';
  });
  html += '<div class="leyenda-item" style="color:#facc15">' +
    '<div class="leyenda-dot" style="background:#facc15;box-shadow:0 0 5px #facc15"></div>' +
    'Con evaluación próxima</div>';
  document.getElementById('leyenda').innerHTML = html;
}

// ============================================
// 22. TOASTS
// ============================================
function toast(msg, tipo) {
  tipo = tipo || 'info';
  var container = document.getElementById('toastContainer');
  var colores = {
    success: 'rgba(34,197,94,.4)', warning: 'rgba(250,204,21,.4)',
    error: 'rgba(239,68,68,.4)', info: 'rgba(6,182,212,.4)',
  };
  var iconos = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
  var el = document.createElement('div');
  el.className = 'toast';
  el.style.borderColor = colores[tipo] || colores.info;
  el.innerHTML = '<span style="font-size:1.1rem;flex-shrink:0">' +
    (iconos[tipo] || 'ℹ️') + '</span><span>' + msg + '</span>';
  container.appendChild(el);
  setTimeout(function () {
    el.style.animation = 'toastOut .3s ease forwards';
    setTimeout(function () { el.remove(); }, 300);
  }, 4000);
}

// ============================================
// 23. HELPERS DE FECHA
// ============================================
function diasRestantes(fechaStr) {
  var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  var f = new Date(fechaStr + 'T00:00:00');
  return Math.ceil((f - hoy) / 86400000);
}

function formatFechaLarga(fechaStr) {
  return new Date(fechaStr + 'T00:00:00')
    .toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
}