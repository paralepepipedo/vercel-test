// ============================================
// ARCHIVO: /calendario/calendario.js
// DESCRIPCIÓN: Lógica del módulo calendario
// NOTA: Cargado con <script src="calendario.js">
//       SIN type="module" — todos los eventos
//       se asignan con addEventListener, NO onclick=""
// ============================================
// ÍNDICE
// 1.  Datos MOCK
// 2.  Estado global
// 3.  Config de asignaturas
// 4.  Inicialización y registro de eventos
// 5.  Renderizar calendario mensual
// 6.  Construir celda de un día
// 7.  Renderizar lista de evaluaciones
// 8.  Construir tarjeta de evaluación
// 9.  Actualizar stats del mes
// 10. Renderizar selector de notas
// 11. Abrir modal agregar/editar
// 12. Abrir modal detalle
// 13. Click en día del calendario
// 14. Guardar evaluación (submit del form)
// 15. Cambiar estado de evaluación
// 16. Registrar nota obtenida + foto
// 17. Previsualizar y comprimir foto (canvas)
// 18. Filtro por asignatura
// 19. Navegación de meses
// 20. Helpers modales
// 21. Helpers de fecha y formato
// 22. Sidebar móvil
// 23. Sistema de toasts
// ============================================

// ============================================
// 1. DATOS MOCK
// TODO: reemplazar con → fetch('/api/evaluaciones?mes=X&anio=Y')
// ============================================
var MOCK_EVALUACIONES = [];

// ============================================
// 2. ESTADO GLOBAL
// ============================================
var STATE = {
  mes: new Date().getMonth(),
  anio: new Date().getFullYear(),
  evaluaciones: MOCK_EVALUACIONES.slice(),
  filtro: '',
  evalEditando: null,   // id de la eval en edición
  evalDetalle: null,   // eval actualmente en modal detalle
  notaDetalle: null,   // nota seleccionada en modal detalle
  fotoBlob: null,
  // Datos del curso (se llenan en clerkReady desde /api/perfil)
  colegioId: null,
  grado: null,
  esAdmin: false,
};

// ============================================
// 3. CONFIG ASIGNATURAS
// ============================================
var ASIG = {
  Matematicas: { emoji: '➗', color: '#3b82f6', rgb: '59,130,246' },
  Lenguaje: { emoji: '📖', color: '#ef4444', rgb: '239,68,68' },
  Historia: { emoji: '🏛️', color: '#facc15', rgb: '250,204,21' },
  Ciencias: { emoji: '🔬', color: '#22c55e', rgb: '34,197,94' },
  Ingles: { emoji: '🇬🇧', color: '#f97316', rgb: '249,115,22' },
  'Ed. Fisica': { emoji: '⚽', color: '#06b6d4', rgb: '6,182,212' },
  Musica: { emoji: '🎵', color: '#a855f7', rgb: '168,85,247' },
  Artes: { emoji: '🎨', color: '#ec4899', rgb: '236,72,153' },
  Tecnologia: { emoji: '💻', color: '#64748b', rgb: '100,116,139' },
};

var ESTADOS = {
  pendiente: '⏳ Pendiente',
  estudiado: '📖 Estudiando',
  rendida: '✏️ Rendida',
  nota_ingresada: '✅ Nota ingresada',
};

// ============================================
// 4. INICIALIZACIÓN Y EVENTOS
// Todos los eventos se registran aquí, NUNCA
// en el HTML como onclick=""
// ============================================
document.addEventListener('DOMContentLoaded', function () {
  // Navegación del calendario
  document.getElementById('btnMesAnterior').addEventListener('click', function () { cambiarMes(-1); });
  document.getElementById('btnMesSiguiente').addEventListener('click', function () { cambiarMes(1); });
  document.getElementById('btnHoy').addEventListener('click', irAHoy);

  // Filtro asignatura
  document.getElementById('filtroAsignatura').addEventListener('change', function () {
    STATE.filtro = this.value;
    renderCalendario();
    renderLista();
  });

  // Botón agregar (header y empty state)
  document.getElementById('btnAgregarEval').addEventListener('click', function () {
    abrirModalAgregar();
  });
  document.getElementById('btnAgregarEvalEmpty').addEventListener('click', function () {
    abrirModalAgregar();
  });

  // Cerrar modales
  document.getElementById('btnCerrarModalEval').addEventListener('click', function () {
    cerrarModal('modalEval');
  });
  document.getElementById('btnCerrarModalDetalle').addEventListener('click', function () {
    cerrarModal('modalDetalle');
  });
  document.getElementById('btnCancelarEval').addEventListener('click', function () {
    cerrarModal('modalEval');
  });

  // Cerrar al click en el overlay
  document.getElementById('modalEval').addEventListener('click', function (e) {
    if (e.target === this) cerrarModal('modalEval');
  });
  document.getElementById('modalDetalle').addEventListener('click', function (e) {
    if (e.target === this) cerrarModal('modalDetalle');
  });

  // Cerrar con Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      cerrarModal('modalEval');
      cerrarModal('modalDetalle');
    }
  });

  // Submit del formulario de evaluación
  document.getElementById('formEval').addEventListener('submit', guardarEvaluacion);

  // Upload de foto
  document.getElementById('uploadArea').addEventListener('click', function () {
    document.getElementById('inputFoto').click();
  });
  document.getElementById('inputFoto').addEventListener('change', previsualizarFoto);
  document.getElementById('btnQuitarFoto').addEventListener('click', quitarFoto);

  // Botón registrar nota
  document.getElementById('btnRegistrarNota').addEventListener('click', registrarNota);

  // Sidebar móvil
  initShared('calendario');

  // Render inicial
  actualizarHeaderMes();
  renderCalendario();
  renderLista();
  actualizarStats();
  renderSelectorNotas('notaSelector');

  // Alerta de pruebas próximas
  setTimeout(verificarAlertas, 1000);
});

// ============================================
// INTEGRACIÓN CLERK — carga evaluaciones reales
// ============================================
document.addEventListener('clerkReady', function (e) {
  // Guardar perfil para usarlo al crear evaluaciones
  var user = e && e.detail ? e.detail : null;

  // Primero cargar perfil para obtener colegio_id y grado
  fetch(BASE_URL + '/api/perfil', {
    credentials: 'include',
    headers: { ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}) }
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (data) {
        var p = data.clerk_id ? data : (data.perfil || data);
        STATE.colegioId = p.colegio_id || null;
        STATE.grado = p.grado_actual || p.grado_ingreso || null;
        STATE.esAdmin = p.rol === 'admin';
      }
      // Sin colegio_id o grado no se puede cargar evaluaciones
      if (!STATE.colegioId || !STATE.grado) {
        console.warn('[calendario] Sin colegio_id o grado — no se cargan evaluaciones');
        return null;
      }
      var evalUrl = BASE_URL + '/api/evaluaciones?colegio_id=' + STATE.colegioId + '&grado=' + STATE.grado;
      return fetch(evalUrl, {
        credentials: 'include',
        headers: { ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}) }
      });
    })
    .then(function (r) { return r && r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.evaluaciones) return;
      STATE.evaluaciones = data.evaluaciones.map(function (e) {
        return {
          id: e.id,
          asignatura: e.asignatura,
          fecha_evaluacion: e.fecha_evaluacion.substring(0, 10),
          contenidos: e.contenidos || null,
          nota_esperada: e.nota_esperada ? Number(e.nota_esperada) : null,
          rango_min: e.rango_min ? Number(e.rango_min) : null,
          rango_max: e.rango_max ? Number(e.rango_max) : null,
          nota_obtenida: e.nota_obtenida ? Number(e.nota_obtenida) : null,
          estado: e.estado || 'pendiente',
          foto_url: e.foto_url || null,
          recompensa_entregada: !!e.recompensa_entregada,
        };
      });
      renderCalendario();
      renderLista();
      actualizarStats();
    })
    .catch(function () { });
});

// ============================================
// 5. RENDERIZAR CALENDARIO
// ============================================
function renderCalendario() {
  var grid = document.getElementById('calGrid');
  var primerDia = new Date(STATE.anio, STATE.mes, 1);
  var ultimoDia = new Date(STATE.anio, STATE.mes + 1, 0);
  var hoy = new Date();

  var offset = primerDia.getDay() - 1;
  if (offset < 0) offset = 6;

  var celdas = [];

  // Días del mes anterior
  var mesAnt = new Date(STATE.anio, STATE.mes, 0);
  for (var i = offset - 1; i >= 0; i--) {
    celdas.push({ dia: mesAnt.getDate() - i, fuera: true, offset: -1 });
  }
  // Días del mes actual
  for (var d = 1; d <= ultimoDia.getDate(); d++) {
    celdas.push({ dia: d, fuera: false, offset: 0 });
  }
  // Completar hasta 42
  var restante = 42 - celdas.length;
  for (var r = 1; r <= restante; r++) {
    celdas.push({ dia: r, fuera: true, offset: 1 });
  }

  var html = '';
  celdas.forEach(function (c) {
    var fecha = new Date(STATE.anio, STATE.mes + c.offset, c.dia);
    var fechaStr = toDateStr(fecha);
    var evals = !c.fuera ? evalsDia(fechaStr) : [];
    var esHoy = !c.fuera && c.dia === hoy.getDate() &&
      STATE.mes === hoy.getMonth() && STATE.anio === hoy.getFullYear();
    var esWknd = fecha.getDay() === 0 || fecha.getDay() === 6;
    var alerta = evals.some(function (e) {
      return diasRestantes(e.fecha_evaluacion) <= 3 && e.estado !== 'nota_ingresada';
    });
    html += construirCelda(c.dia, fechaStr, c.fuera, esHoy, esWknd, evals, alerta);
  });

  grid.innerHTML = html;

  // Eventos en celdas (por JS, no onclick)
  grid.querySelectorAll('.cal-day:not(.otro-mes)').forEach(function (cell) {
    cell.addEventListener('click', function () {
      clickDia(this.dataset.fecha);
    });
  });

  // Eventos en chips de evaluación
  grid.querySelectorAll('.day-eval-chip').forEach(function (chip) {
    chip.addEventListener('click', function (e) {
      e.stopPropagation();
      abrirDetalle(this.dataset.evalId);
    });
  });
}

// ============================================
// 6. CONSTRUIR CELDA DEL DÍA
// ============================================
function construirCelda(dia, fechaStr, fuera, esHoy, esWknd, evals, alerta) {
  var clases = 'cal-day';
  if (fuera) clases += ' otro-mes';
  if (esHoy) clases += ' hoy';
  if (esWknd) clases += ' weekend';

  var numHtml = esHoy
    ? '<span class="day-num day-num-hoy">' + dia + '</span>'
    : '<span class="day-num">' + dia + '</span>';

  var chipsHtml = '';
  evals.slice(0, 2).forEach(function (e) {
    var cfg = ASIG[e.asignatura] || { color: '#94a3b8', rgb: '148,163,184' };
    chipsHtml += '<div class="day-eval-chip estado-' + e.estado + '"' +
      ' data-eval-id="' + e.id + '"' +
      ' style="--chip-color:' + cfg.color + ';--chip-rgb:' + cfg.rgb + '">' +
      e.asignatura.substring(0, 4) + '</div>';
  });
  if (evals.length > 2) {
    chipsHtml += '<div class="day-more">+' + (evals.length - 2) + ' más</div>';
  }

  var alertaHtml = alerta && !fuera ? '<div class="day-alert-dot"></div>' : '';

  return '<div class="' + clases + '" data-fecha="' + fechaStr + '">' +
    alertaHtml + numHtml +
    '<div class="day-evals">' + chipsHtml + '</div>' +
    '</div>';
}

// ============================================
// 7. LISTA DE EVALUACIONES
// ============================================
function renderLista() {
  var lista = document.getElementById('evalLista');
  var empty = document.getElementById('evalEmpty');
  var chip = document.getElementById('evalChip');

  var evals = evalsMes();
  evals.sort(function (a, b) {
    return new Date(a.fecha_evaluacion) - new Date(b.fecha_evaluacion);
  });

  chip.textContent = evals.length + ' evaluación' + (evals.length !== 1 ? 'es' : '');

  if (evals.length === 0) {
    lista.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  lista.style.display = 'flex';
  empty.style.display = 'none';

  lista.innerHTML = evals.map(construirTarjeta).join('');

  // Eventos en tarjetas
  lista.querySelectorAll('.eval-card').forEach(function (card) {
    card.addEventListener('click', function () {
      abrirDetalle(this.dataset.evalId);
    });
  });
}

// ============================================
// 8. CONSTRUIR TARJETA DE EVALUACIÓN
// ============================================
function construirTarjeta(e) {
  var cfg = ASIG[e.asignatura] || { emoji: '📚', color: '#94a3b8', rgb: '148,163,184' };
  var dias = diasRestantes(e.fecha_evaluacion);

  var diasHtml = '';
  if (e.estado !== 'nota_ingresada') {
    if (dias < 0) diasHtml = '<span class="dias-label dias-normal">Hace ' + Math.abs(dias) + ' días</span>';
    else if (dias === 0) diasHtml = '<span class="dias-label dias-urgente">🚨 ¡HOY!</span>';
    else if (dias === 1) diasHtml = '<span class="dias-label dias-urgente">⚠️ ¡MAÑANA!</span>';
    else if (dias <= 3) diasHtml = '<span class="dias-label dias-pronto">⏰ En ' + dias + ' días</span>';
    else diasHtml = '<span class="dias-label dias-normal">En ' + dias + ' días</span>';
  }

  var notaEsp = e.nota_esperada
    ? '<span class="eval-nota-esp">Meta: ' + e.nota_esperada.toFixed(1) + '</span>' : '';

  var notaObt = e.nota_obtenida
    ? '<span class="eval-nota-obt" style="color:' + colorNota(e.nota_obtenida) + '">' +
    e.nota_obtenida.toFixed(1) + '</span>' : '';

  return '<div class="eval-card" data-eval-id="' + e.id + '"' +
    ' style="--e-color:' + cfg.color + ';--e-rgb:' + cfg.rgb + '">' +
    '<div class="eval-asig-icon">' + cfg.emoji + '</div>' +
    '<div class="eval-body">' +
    '<div class="eval-asig">' + e.asignatura.toUpperCase() + '</div>' +
    '<div class="eval-fecha">📅 ' + formatFechaLarga(e.fecha_evaluacion) + '</div>' +
    (e.contenidos ? '<div class="eval-contenidos">📝 ' + e.contenidos + '</div>' : '') +
    '</div>' +
    '<div class="eval-right">' +
    '<span class="eval-estado estado-' + e.estado + '">' + ESTADOS[e.estado] + '</span>' +
    notaEsp + notaObt + diasHtml +
    '</div>' +
    '</div>';
}

// ============================================
// 9. STATS DEL MES
// ============================================
function actualizarStats() {
  var evals = evalsMes();
  var pendientes = evals.filter(function (e) { return ['pendiente', 'estudiado', 'rendida'].includes(e.estado); }).length;
  var rendidas = evals.filter(function (e) { return e.nota_obtenida !== null; }).length;
  var notas = evals.filter(function (e) { return e.nota_obtenida; }).map(function (e) { return Number(e.nota_obtenida); });
  var promedio = notas.length ? (notas.reduce(function (a, b) { return a + b; }, 0) / notas.length).toFixed(1) : '—';

  document.getElementById('statTotal').textContent = evals.length;
  document.getElementById('statPendientes').textContent = pendientes;
  document.getElementById('statRendidas').textContent = rendidas;
  document.getElementById('statPromedio').textContent = promedio;
  var bc = document.getElementById('badgeCalendario'); if (bc) bc.textContent = pendientes || '✓';
}

// ============================================
// 10. SELECTOR DE NOTAS
// ============================================
function renderSelectorNotas(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var notas = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0];
  container.innerHTML = notas.map(function (n) {
    return '<button type="button" class="nota-btn' + (n === 7.0 ? ' nota-7' : '') +
      '" data-nota="' + n + '">' + n.toFixed(1) + '</button>';
  }).join('');

  // Eventos de los botones de nota
  container.querySelectorAll('.nota-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      container.querySelectorAll('.nota-btn').forEach(function (b) {
        b.classList.remove('selected');
      });
      this.classList.add('selected');
      var nota = parseFloat(this.dataset.nota);

      if (containerId === 'notaSelector') {
        document.getElementById('evalNotaEsperada').value = nota;
        mostrarRangoPreview(nota);
      } else {
        STATE.notaDetalle = nota;
      }
    });
  });
}

function mostrarRangoPreview(nota) {
  var preview = document.getElementById('notaRangoPreview');
  var texto = document.getElementById('notaRangoTexto');
  preview.style.display = 'flex';
  if (nota === 7.0) {
    texto.textContent = '🌟 Nota máxima — Recompensa máxima garantizada';
  } else {
    var min = Math.max(1.0, nota - 0.5).toFixed(1);
    var max = Math.min(7.0, nota + 0.5).toFixed(1);
    texto.textContent = 'Rango aceptable: ' + min + ' — ' + max + ' (±0.5)';
  }
}

// ============================================
// 11. MODAL AGREGAR / EDITAR
// ============================================
function abrirModalAgregar(fechaPreseleccionada) {
  STATE.evalEditando = null;
  document.getElementById('modalEvalTitulo').textContent = 'Nueva Evaluación';
  document.getElementById('formEval').reset();
  document.getElementById('evalNotaEsperada').value = '';
  document.getElementById('notaRangoPreview').style.display = 'none';
  document.querySelectorAll('#notaSelector .nota-btn').forEach(function (b) {
    b.classList.remove('selected');
  });

  var fecha = fechaPreseleccionada || toDateStr(new Date(Date.now() + 86400000));
  document.getElementById('evalFecha').value = fecha;

  abrirModal('modalEval');
}

// ============================================
// 12. MODAL DETALLE
// ============================================
function abrirDetalle(evalId) {
  var e = STATE.evaluaciones.find(function (ev) { return ev.id === evalId; });
  if (!e) return;

  STATE.evalDetalle = e;
  STATE.notaDetalle = null;
  STATE.fotoBlob = null;

  var cfg = ASIG[e.asignatura] || { emoji: '📚', color: '#94a3b8' };
  var dias = diasRestantes(e.fecha_evaluacion);

  document.getElementById('detalleIcon').textContent = cfg.emoji;
  document.getElementById('detalleTitulo').textContent = e.asignatura;
  document.getElementById('detalleSubtitulo').textContent = formatFechaLarga(e.fecha_evaluacion);

  // Reset foto
  document.getElementById('fotoPreview').style.display = 'none';
  document.getElementById('uploadArea').style.display = 'flex';
  document.getElementById('inputFoto').value = '';

  // Contenido
  var urgenciaHtml = '';
  if (e.estado !== 'nota_ingresada' && dias >= 0) {
    var colorUrgencia = dias <= 1 ? 'var(--red)' : dias <= 3 ? 'var(--orange)' : 'var(--text-dim)';
    var textoUrgencia = dias === 0 ? '🚨 ¡HOY!' : dias === 1 ? '⚠️ ¡MAÑANA!' : '⏰ En ' + dias + ' días';
    urgenciaHtml = '<span style="font-weight:800;color:' + colorUrgencia + '">' + textoUrgencia + '</span>';
  }

  var contenidoHtml =
    '<div style="display:flex;flex-direction:column;gap:.875rem;margin-bottom:1rem;">' +
    '<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">' +
    '<span class="eval-estado estado-' + e.estado + '" style="font-family:\'Press Start 2P\';font-size:.38rem;padding:.3rem .6rem;border-radius:20px;">' + ESTADOS[e.estado] + '</span>' +
    urgenciaHtml +
    '</div>';

  if (e.contenidos) {
    contenidoHtml +=
      '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:1rem;">' +
      '<div style="font-family:\'Press Start 2P\';font-size:.35rem;color:var(--text-muted);margin-bottom:.5rem;">📝 CONTENIDOS</div>' +
      '<div style="font-size:.875rem;font-weight:700;color:var(--text-dim);line-height:1.6;">' + e.contenidos + '</div>' +
      '</div>';
  }

  if (e.nota_esperada) {
    contenidoHtml +=
      '<div style="background:var(--violet-dim);border:1px solid var(--border-b);border-radius:10px;padding:1rem;display:flex;align-items:center;gap:1rem;">' +
      '<span style="font-size:1.5rem;">🎯</span>' +
      '<div>' +
      '<div style="font-family:\'Press Start 2P\';font-size:.35rem;color:var(--text-muted);margin-bottom:.3rem;">NOTA ESPERADA</div>' +
      '<div style="font-family:\'Press Start 2P\';font-size:.75rem;color:var(--violet-light);">' + e.nota_esperada.toFixed(1) +
      '<span style="font-size:.5rem;color:var(--text-dim)"> (rango ' + e.rango_min.toFixed(1) + ' — ' + e.rango_max.toFixed(1) + ')</span>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  if (e.nota_obtenida) {
    contenidoHtml +=
      '<div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.3);border-radius:10px;padding:1rem;display:flex;align-items:center;gap:1rem;">' +
      '<span style="font-size:1.5rem;">✅</span>' +
      '<div>' +
      '<div style="font-family:\'Press Start 2P\';font-size:.35rem;color:var(--text-muted);margin-bottom:.3rem;">NOTA OBTENIDA</div>' +
      '<div style="font-family:\'Press Start 2P\';font-size:1rem;color:' + colorNota(e.nota_obtenida) + ';">' + e.nota_obtenida.toFixed(1) + '</div>' +
      '</div>' +
      (e.recompensa_entregada ? '<span style="margin-left:auto;font-family:\'Press Start 2P\';font-size:.35rem;color:var(--yellow);">RECOMPENSA<br>ENTREGADA 🪙</span>' : '') +
      '</div>';
  }

  contenidoHtml += '</div>';
  document.getElementById('detalleContenido').innerHTML = contenidoHtml;

  // Sección de nota
  var seccion = document.getElementById('seccionNota');
  if (e.estado === 'rendida' || (e.estado !== 'nota_ingresada' && dias <= 0)) {
    seccion.style.display = 'block';
    renderSelectorNotas('notaSelectorDetalle');
  } else {
    seccion.style.display = 'none';
  }

  // Botones de acción
  construirBotonesDetalle(e);
  abrirModal('modalDetalle');
}

// ============================================
// 13. CLICK EN DÍA DEL CALENDARIO
// ============================================
function clickDia(fechaStr) {
  var evals = evalsDia(fechaStr);

  if (evals.length === 0) {
    abrirModalAgregar(fechaStr);
  } else if (evals.length === 1) {
    abrirDetalle(evals[0].id);
  } else {
    // Múltiples evaluaciones en el mismo día
    document.getElementById('detalleIcon').textContent = '📅';
    document.getElementById('detalleTitulo').textContent = formatFechaLarga(fechaStr);
    document.getElementById('detalleSubtitulo').textContent = evals.length + ' evaluaciones este día';
    document.getElementById('seccionNota').style.display = 'none';

    var html = '<div style="display:flex;flex-direction:column;gap:.625rem;margin-bottom:1rem;">';
    evals.forEach(function (e) {
      var cfg = ASIG[e.asignatura] || { emoji: '📚', color: '#94a3b8' };
      html +=
        '<div class="lista-dia-item" data-eval-id="' + e.id + '"' +
        ' style="--item-color:' + cfg.color + '">' +
        '<span style="font-size:1.5rem;">' + cfg.emoji + '</span>' +
        '<div style="flex:1;">' +
        '<div style="font-family:\'Press Start 2P\';font-size:.45rem;color:' + cfg.color + ';margin-bottom:.25rem;">' + e.asignatura + '</div>' +
        '<div style="font-size:.8rem;color:var(--text-dim);font-weight:700;">' + ESTADOS[e.estado] + '</div>' +
        '</div>' +
        '<span style="color:var(--text-muted);">›</span>' +
        '</div>';
    });
    html += '</div>';
    document.getElementById('detalleContenido').innerHTML = html;

    // Eventos en items de la lista
    document.querySelectorAll('.lista-dia-item').forEach(function (item) {
      item.addEventListener('click', function () {
        cerrarModal('modalDetalle');
        setTimeout(function () { abrirDetalle(item.dataset.evalId); }, 200);
      });
    });

    document.getElementById('detalleAcciones').innerHTML =
      '<button class="detalle-btn primary" id="btnAgregarEnDia">+ Agregar otra evaluación</button>';

    document.getElementById('btnAgregarEnDia').addEventListener('click', function () {
      cerrarModal('modalDetalle');
      abrirModalAgregar(fechaStr);
    });

    abrirModal('modalDetalle');
  }
}

// ============================================
// 14. GUARDAR EVALUACIÓN — llama a la API real
// ============================================
function guardarEvaluacion(e) {
  e.preventDefault();

  var asignatura = document.getElementById('evalAsignatura').value;
  var fecha = document.getElementById('evalFecha').value;
  var contenidos = document.getElementById('evalContenidos').value.trim();
  var notaEsperada = parseFloat(document.getElementById('evalNotaEsperada').value) || null;

  if (!asignatura || !fecha) {
    toast('⚠️ Completa asignatura y fecha', 'warning');
    return;
  }

  var btnGuardar = document.getElementById('btnGuardarEval') || document.querySelector('#formEval [type=submit]');
  if (btnGuardar) btnGuardar.disabled = true;

  var esEdicion = !!STATE.evalEditando;
  var method = esEdicion ? 'PUT' : 'POST';
  var body = esEdicion
    ? { id: STATE.evalEditando, asignatura: asignatura, fecha_evaluacion: fecha, contenidos: contenidos || null, nota_esperada: notaEsperada }
    : { colegio_id: STATE.colegioId, grado: STATE.grado, asignatura: asignatura, fecha_evaluacion: fecha, contenidos: contenidos || null, nota_esperada: notaEsperada };

  fetch(BASE_URL + '/api/evaluaciones', {
    method: method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}),
    },
    body: JSON.stringify(body),
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (btnGuardar) btnGuardar.disabled = false;
      if (data.error) { toast('⚠️ ' + (data.mensaje || 'Error al guardar'), 'warning'); return; }

      // Sincronizar con el estado local
      if (esEdicion) {
        var ev = STATE.evaluaciones.find(function (x) { return x.id === STATE.evalEditando; });
        if (ev) {
          ev.asignatura = asignatura;
          ev.fecha_evaluacion = fecha;
          ev.contenidos = contenidos || null;
          ev.nota_esperada = notaEsperada;
        }
        toast('✏️ Evaluación actualizada', 'success');
      } else {
        var nueva = data.evaluacion || data;
        if (nueva && nueva.id) {
          STATE.evaluaciones.push({
            id: nueva.id, asignatura: nueva.asignatura,
            fecha_evaluacion: nueva.fecha_evaluacion,
            contenidos: nueva.contenidos || null,
            nota_esperada: nueva.nota_esperada ? Number(nueva.nota_esperada) : null,
            rango_min: nueva.rango_min ? Number(nueva.rango_min) : null,
            rango_max: nueva.rango_max ? Number(nueva.rango_max) : null,
            nota_obtenida: null, estado: 'pendiente',
            foto_url: null, recompensa_entregada: false,
          });
        }
        toast('📅 Evaluación de ' + asignatura + ' agregada para el ' + formatFechaCorta(fecha), 'success');
      }

      cerrarModal('modalEval');
      renderCalendario();
      renderLista();
      actualizarStats();
    })
    .catch(function () {
      if (btnGuardar) btnGuardar.disabled = false;
      toast('❌ Error de conexión', 'error');
    });
}

// ============================================
// 15. CAMBIAR ESTADO — llama a la API real
// ============================================
function cambiarEstado(evalId, nuevoEstado) {
  var ev = STATE.evaluaciones.find(function (e) { return e.id === evalId; });
  if (!ev) return;

  fetch(BASE_URL + '/api/evaluaciones', {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}),
    },
    body: JSON.stringify({ id: evalId, estado: nuevoEstado }),
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) { toast('⚠️ ' + (data.mensaje || 'Error al actualizar'), 'warning'); return; }
      ev.estado = nuevoEstado;
      cerrarModal('modalDetalle');
      renderCalendario();
      renderLista();
      actualizarStats();
      var msgs = { estudiado: '📖 ¡Marcada como estudiada!', rendida: '✏️ Marcada como rendida.' };
      toast(msgs[nuevoEstado] || '✅ Estado actualizado', 'success');

      // Verificar misión "marcar_estudiado"
      if (nuevoEstado === 'estudiado') {
        fetch(BASE_URL + '/api/misiones', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}),
          },
          body: JSON.stringify({ action: 'completar_tipo', tipo: 'marcar_estudiado' }),
        }).catch(function () { });
      }
    })
    .catch(function () { toast('❌ Error de conexión', 'error'); });
}

function eliminarEvaluacion(evalId) {
  if (!confirm('¿Eliminar esta evaluación?')) return;
  fetch(BASE_URL + '/api/evaluaciones', {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}),
    },
    body: JSON.stringify({ id: evalId }),
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) { toast('⚠️ ' + (data.mensaje || 'Error'), 'warning'); return; }
      STATE.evaluaciones = STATE.evaluaciones.filter(function (e) { return e.id !== evalId; });
      cerrarModal('modalDetalle');
      renderCalendario();
      renderLista();
      actualizarStats();
      toast('🗑️ Evaluación eliminada', 'info');
    })
    .catch(function () { toast('❌ Error de conexión', 'error'); });
}

// ============================================
// 16. REGISTRAR NOTA — llama a la API real (que otorga monedas/XP)
// ============================================
function registrarNota() {
  var e = STATE.evalDetalle;
  if (!e) return;
  if (!STATE.notaDetalle) {
    toast('⚠️ Selecciona la nota que obtuviste', 'warning');
    return;
  }
  var btnReg = document.getElementById('btnRegistrarNota');
  if (btnReg) btnReg.disabled = true;

  fetch(BASE_URL + '/api/evaluaciones', {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}),
    },
    body: JSON.stringify({ id: e.id, nota_obtenida: STATE.notaDetalle }),
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (btnReg) btnReg.disabled = false;
      if (data.error) { toast('⚠️ ' + (data.mensaje || 'Error'), 'warning'); return; }

      // Actualizar estado local
      e.nota_obtenida = STATE.notaDetalle;
      e.estado = 'nota_ingresada';
      e.recompensa_entregada = true;

      cerrarModal('modalDetalle');
      renderCalendario();
      renderLista();
      actualizarStats();

      // La API devuelve la recompensa real calculada desde config_economia
      var rw = data.recompensa;
      if (rw && rw.monedas > 0) {
        toast(rw.mensaje + ' — +' + rw.monedas + ' EduCoins 🪙', 'success');
        // Actualizar header con las monedas reales
        var headerCoins = document.getElementById('headerCoins');
        if (headerCoins) {
          var actual = parseInt(headerCoins.textContent.replace(/\D/g, '')) || 0;
          animarContador('headerCoins', actual + rw.monedas, 700);
        }
        // Verificar misión "subir_nota"
        fetch(BASE_URL + '/api/misiones', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}),
          },
          body: JSON.stringify({ action: 'completar_tipo', tipo: 'subir_nota' }),
        }).catch(function () { });
      } else {
        toast('📝 Nota registrada. Estuvo fuera del rango esperado — sin recompensa.', 'info');
      }
    })
    .catch(function () {
      if (btnReg) btnReg.disabled = false;
      toast('❌ Error de conexión', 'error');
    });
}

// Solo para uso local (UI preview antes de enviar)
function calcularRecompensa(e) {
  var nota = e.nota_obtenida;
  if (nota === 7.0) return { monedas: 300, emoji: '🌟', msg: '¡Nota máxima!' };
  if (e.rango_min !== null && nota >= e.rango_min && nota <= e.rango_max) {
    return { monedas: 150, emoji: '✅', msg: 'Nota dentro del rango' };
  }
  return { monedas: 0, emoji: '❌', msg: 'Nota fuera del rango' };
}

// ============================================
// 17. FOTO — COMPRIMIR CON CANVAS
// ============================================
function previsualizarFoto(event) {
  var file = event.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function (ev) {
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      var MAX_W = 800;
      var w = img.width, h = img.height;
      if (w > MAX_W) { h = Math.round((h * MAX_W) / w); w = MAX_W; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      canvas.toBlob(function (blob) {
        STATE.fotoBlob = blob;
        document.getElementById('fotoImg').src = URL.createObjectURL(blob);
        document.getElementById('fotoPreview').style.display = 'block';
        document.getElementById('uploadArea').style.display = 'none';
        toast('📷 Foto lista (' + Math.round(blob.size / 1024) + 'KB)', 'info');
      }, 'image/jpeg', 0.75);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function quitarFoto() {
  STATE.fotoBlob = null;
  document.getElementById('fotoPreview').style.display = 'none';
  document.getElementById('uploadArea').style.display = 'flex';
  document.getElementById('inputFoto').value = '';
}

// ============================================
// 18. BOTONES DE ACCIÓN DEL DETALLE
// ============================================
function construirBotonesDetalle(e) {
  var cont = document.getElementById('detalleAcciones');
  var html = '';

  if (e.estado === 'pendiente') {
    html += '<button class="detalle-btn primary" data-accion="estudiado" data-id="' + e.id + '">📖 Marcar como Estudiada</button>';
    html += '<button class="detalle-btn success" data-accion="rendida"   data-id="' + e.id + '">✏️ Ya la rendí</button>';
  } else if (e.estado === 'estudiado') {
    html += '<button class="detalle-btn success" data-accion="rendida"   data-id="' + e.id + '">✏️ Ya la rendí</button>';
  }

  if (e.estado !== 'nota_ingresada') {
    html += '<button class="detalle-btn"        data-accion="editar"    data-id="' + e.id + '">✏️ Editar</button>';
    html += '<button class="detalle-btn danger" data-accion="eliminar"  data-id="' + e.id + '">🗑️ Eliminar</button>';
  }

  cont.innerHTML = html;

  cont.querySelectorAll('[data-accion]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var accion = this.dataset.accion;
      var id = this.dataset.id;
      if (accion === 'estudiado') cambiarEstado(id, 'estudiado');
      else if (accion === 'rendida') cambiarEstado(id, 'rendida');
      else if (accion === 'editar') abrirEditar(id);
      else if (accion === 'eliminar') eliminarEvaluacion(id);
    });
  });
}

function abrirEditar(evalId) {
  var e = STATE.evaluaciones.find(function (x) { return x.id === evalId; });
  if (!e) return;
  STATE.evalEditando = evalId;
  cerrarModal('modalDetalle');

  setTimeout(function () {
    document.getElementById('modalEvalTitulo').textContent = 'Editar Evaluación';
    document.getElementById('evalAsignatura').value = e.asignatura;
    document.getElementById('evalFecha').value = e.fecha_evaluacion;
    document.getElementById('evalContenidos').value = e.contenidos || '';
    document.getElementById('evalNotaEsperada').value = e.nota_esperada || '';
    document.getElementById('notaRangoPreview').style.display = 'none';

    document.querySelectorAll('#notaSelector .nota-btn').forEach(function (b) {
      b.classList.remove('selected');
      if (e.nota_esperada && parseFloat(b.dataset.nota) === e.nota_esperada) {
        b.classList.add('selected');
        mostrarRangoPreview(e.nota_esperada);
      }
    });

    abrirModal('modalEval');
  }, 200);
}

// ============================================
// 19. NAVEGACIÓN DE MESES
// ============================================
function cambiarMes(delta) {
  STATE.mes += delta;
  if (STATE.mes > 11) { STATE.mes = 0; STATE.anio++; }
  if (STATE.mes < 0) { STATE.mes = 11; STATE.anio--; }
  actualizarHeaderMes();
  renderCalendario();
  renderLista();
  actualizarStats();
}

function irAHoy() {
  var hoy = new Date();
  STATE.mes = hoy.getMonth();
  STATE.anio = hoy.getFullYear();
  actualizarHeaderMes();
  renderCalendario();
  renderLista();
  actualizarStats();
}

function actualizarHeaderMes() {
  var nombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  document.getElementById('mesNombre').textContent = nombres[STATE.mes] + ' ' + STATE.anio;
}

// ============================================
// 20. HELPERS MODALES
// ============================================
function abrirModal(id) {
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}
function cerrarModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}

// ============================================
// 21. HELPERS DE FECHA Y FORMATO
// ============================================
function toDateStr(date) {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

function fechaRelativa(dias) {
  return toDateStr(new Date(Date.now() + dias * 86400000));
}

function diasRestantes(fechaStr) {
  var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  var f = new Date(fechaStr + 'T00:00:00');
  return Math.ceil((f - hoy) / 86400000);
}

function formatFechaLarga(fechaStr) {
  return new Date(fechaStr + 'T00:00:00')
    .toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatFechaCorta(fechaStr) {
  return new Date(fechaStr + 'T00:00:00')
    .toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function colorNota(nota) {
  if (nota >= 6.0) return 'var(--green)';
  if (nota >= 5.0) return 'var(--cyan)';
  if (nota >= 4.0) return 'var(--yellow)';
  return 'var(--red)';
}

function evalsDia(fechaStr) {
  return STATE.evaluaciones.filter(function (e) {
    if (STATE.filtro && e.asignatura !== STATE.filtro) return false;
    return e.fecha_evaluacion === fechaStr;
  });
}

function evalsMes() {
  return STATE.evaluaciones.filter(function (e) {
    var f = new Date(e.fecha_evaluacion + 'T00:00:00');
    return f.getMonth() === STATE.mes && f.getFullYear() === STATE.anio &&
      (!STATE.filtro || e.asignatura === STATE.filtro);
  });
}

// ============================================
// 22. SIDEBAR MÓVIL
// ============================================
function initSidebarMovil() {
  var toggle = document.getElementById('sidebarToggle');
  var sidebar = document.getElementById('sidebar');

  toggle.addEventListener('click', function () { sidebar.classList.toggle('open'); });

  document.addEventListener('click', function (e) {
    if (window.innerWidth <= 900 &&
      sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      !toggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });

  function checkMobile() {
    toggle.style.display = window.innerWidth <= 900 ? 'block' : 'none';
  }
  window.addEventListener('resize', checkMobile);
  checkMobile();
}

// ============================================
// 23. TOASTS
// ============================================
function toast(msg, tipo) {
  tipo = tipo || 'info';
  var container = document.getElementById('toastContainer');
  var iconos = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️', coins: '🪙' };
  var colores = {
    success: 'rgba(34,197,94,.4)', warning: 'rgba(250,204,21,.4)',
    error: 'rgba(239,68,68,.4)', info: 'rgba(6,182,212,.4)',
    coins: 'rgba(250,204,21,.4)',
  };
  var el = document.createElement('div');
  el.className = 'toast';
  el.style.borderColor = colores[tipo] || colores.info;
  el.innerHTML = '<span style="font-size:1.1rem;flex-shrink:0">' + (iconos[tipo] || 'ℹ️') + '</span><span>' + msg + '</span>';
  container.appendChild(el);
  setTimeout(function () {
    el.style.animation = 'toastOut .3s ease forwards';
    setTimeout(function () { el.remove(); }, 300);
  }, 4000);
}

// ============================================
// 24. ALERTAS AUTOMÁTICAS
// ============================================
function verificarAlertas() {
  var urgentes = STATE.evaluaciones.filter(function (e) {
    var d = diasRestantes(e.fecha_evaluacion);
    return d >= 0 && d <= 3 && e.estado !== 'nota_ingresada';
  });
  if (urgentes.length > 0) {
    toast('⚠️ Tienes ' + urgentes.length + ' evaluación' +
      (urgentes.length > 1 ? 'es' : '') + ' en los próximos 3 días', 'warning');
  }
}