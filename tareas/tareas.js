// ============================================
// ARCHIVO: /tareas/tareas.js
// DESCRIPCIÓN: Lógica del módulo de tareas
// DEPENDENCIA: ../shared/shared.js cargado antes
// ============================================

// ============================================
// 1. CONFIG DE ASIGNATURAS
// ============================================
var ASIG_CONFIG = {
  'Matemáticas': { emoji: '➗', color: '#3b82f6', rgb: '59,130,246' },
  'Lenguaje': { emoji: '📖', color: '#ef4444', rgb: '239,68,68' },
  'Historia': { emoji: '🏛️', color: '#f97316', rgb: '249,115,22' },
  'Ciencias': { emoji: '🔬', color: '#22c55e', rgb: '34,197,94' },
  'Inglés': { emoji: '🌎', color: '#06b6d4', rgb: '6,182,212' },
  'Arte': { emoji: '🎨', color: '#ec4899', rgb: '236,72,153' },
  'Ed. Física': { emoji: '⚽', color: '#facc15', rgb: '250,204,21' },
};

// ============================================
// 2. ESTADO GLOBAL
// ============================================
var STATE = {
  tareas: [],
  filtroEstado: 'todas',
  filtroAsig: '',
  editandoId: null,
  detalleId: null,
  fotoBlob: null,
  esAdmin: false,
  tabActual: 'alumno',
  tareasAdmin: [],
  revisionId: null,
  revisionCorrecta: null,
};

// ============================================
// 3. MAPEO API → MODELO LOCAL
// ============================================
function mapearTarea(t) {
  var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  var fecha = t.fecha ? String(t.fecha).split('T')[0] : '';

  var estado = 'pendiente';
  if (t.contenido_subido !== null && t.contenido_subido !== undefined) {
    if (t.es_correcta === null || t.es_correcta === undefined) {
      estado = 'entregada';
    } else {
      estado = t.es_correcta ? 'calificada' : 'incorrecta';
    }
  } else if (fecha) {
    var fechaDate = new Date(fecha + 'T12:00:00'); // mediodía = seguro en cualquier timezone
    if (fechaDate < hoy) estado = 'vencida';
  }

  return {
    id: t.id,
    asig: t.asignatura || '',
    desc: t.contenido_subido || '',
    fecha: fecha,
    prioridad: 'normal',
    estado: estado,
    monedas: 0,
    foto: t.foto_url || null,
  };
}

// ============================================
// 4. INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function () {
  initShared('tareas');
  renderTareas();
  actualizarStats();
  initEventos();
  var hoy = new Date(); hoy.setDate(hoy.getDate() + 1);
  document.getElementById('fFecha').valueAsDate = hoy;
});

// ============================================
// 5. INTEGRACIÓN CLERK — carga tareas reales
// ============================================
document.addEventListener('clerkReady', function () {
  cargarTareas();
});

// Si clerkReady ya disparó antes de que este script cargara
if (window.CLERK_USER) {
  cargarTareas();
}

function cargarTareas() {
  fetch(BASE_URL + '/api/tareas', {
    credentials: 'include',
    headers: window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {},
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;
      STATE.tareas = (data.tareas || []).map(mapearTarea);
      renderTareas();
      actualizarStats();
      // Verificar rol admin
      fetch(BASE_URL + '/api/perfil', {
        credentials: 'include',
        headers: window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {},
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (p) {
          if (p && p.rol === 'admin') {
            STATE.esAdmin = true;
            document.getElementById('tareasTabsWrap').style.display = 'flex';
          }
        });
    })
    .catch(function () { });
}

// ============================================
// 6. EVENTOS
// ============================================
function initEventos() {
  document.getElementById('btnNuevaTarea').addEventListener('click', abrirModalNueva);

  // Tabs admin (los botones existen pero se muestran solo si es admin)
  var tabAlumnoBtn = document.getElementById('tabAlumno');
  var tabAdminBtn = document.getElementById('tabAdmin');
  if (tabAlumnoBtn) tabAlumnoBtn.addEventListener('click', function () { cambiarTabTareas('alumno'); });
  if (tabAdminBtn) tabAdminBtn.addEventListener('click', function () { cambiarTabTareas('admin'); });

  document.getElementById('btnCerrarModal').addEventListener('click', function () { cerrarModal('modalTarea'); });
  document.getElementById('btnCerrarDetalle').addEventListener('click', function () { cerrarModal('modalDetalle'); });
  document.getElementById('modalTarea').addEventListener('click', function (e) { if (e.target === this) cerrarModal('modalTarea'); });
  document.getElementById('modalDetalle').addEventListener('click', function (e) { if (e.target === this) cerrarModal('modalDetalle'); });

  document.getElementById('btnGuardarTarea').addEventListener('click', guardarTarea);

  document.querySelectorAll('.filtro-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filtro-btn').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      STATE.filtroEstado = this.dataset.filtro;
      renderTareas();
    });
  });

  document.getElementById('filtroAsig').addEventListener('change', function () {
    STATE.filtroAsig = this.value;
    renderTareas();
  });

  document.getElementById('uploadArea').addEventListener('click', function () {
    document.getElementById('fFoto').click();
  });
  document.getElementById('fFoto').addEventListener('change', previsualizarFoto);
  document.getElementById('btnQuitarFoto').addEventListener('click', function (e) {
    e.stopPropagation();
    quitarFoto();
  });
}

// ============================================
// 7. RENDERIZAR TAREAS
// ============================================
function renderTareas() {
  var lista = document.getElementById('tareasLista');
  var vacio = document.getElementById('tareasVacio');

  var filtradas = STATE.tareas.filter(function (t) {
    var okEstado = STATE.filtroEstado === 'todas' || t.estado === STATE.filtroEstado;
    var okAsig = !STATE.filtroAsig || t.asig === STATE.filtroAsig;
    return okEstado && okAsig;
  });

  var orden = { urgente: 0, alta: 1, normal: 2 };
  filtradas.sort(function (a, b) {
    if ((a.estado === 'entregada' || a.estado === 'calificada') &&
      (b.estado !== 'entregada' && b.estado !== 'calificada')) return 1;
    if ((b.estado === 'entregada' || b.estado === 'calificada') &&
      (a.estado !== 'entregada' && a.estado !== 'calificada')) return -1;
    var dp = (orden[a.prioridad] || 2) - (orden[b.prioridad] || 2);
    if (dp !== 0) return dp;
    return new Date(a.fecha) - new Date(b.fecha);
  });

  if (filtradas.length === 0) {
    lista.style.display = 'none';
    vacio.style.display = 'block';
    return;
  }
  lista.style.display = 'flex';
  vacio.style.display = 'none';

  lista.innerHTML = filtradas.map(construirTarjetaTarea).join('');

  lista.querySelectorAll('.tarea-card').forEach(function (card) {
    card.addEventListener('click', function () { abrirDetalle(this.dataset.id); });
  });
}

// ============================================
// 8. CONSTRUIR TARJETA
// ============================================
function construirTarjetaTarea(t) {
  var cfg = ASIG_CONFIG[t.asig] || { emoji: '📝', color: 'var(--violet)', rgb: '124,58,237' };
  var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  var fecha = new Date(t.fecha + 'T00:00:00');
  var dias = Math.round((fecha - hoy) / 86400000);
  var diasTxt = t.estado === 'entregada' ? '⏳ Esperando corrección' :
    t.estado === 'calificada' ? '✅ Calificada' :
      t.estado === 'incorrecta' ? '❌ Incorrecta' :
        t.estado === 'vencida' ? '❌ Vencida' :
          dias === 0 ? '⚠️ Vence HOY' :
            dias < 0 ? '❌ Venció hace ' + Math.abs(dias) + ' día' + (Math.abs(dias) !== 1 ? 's' : '') :
              dias === 1 ? '⏳ Mañana' :
                '📅 En ' + dias + ' días';

  var estadoClase = 'estado-' + t.estado;
  var estadoTxt = t.estado === 'pendiente' ? '⏳ Pendiente' :
    t.estado === 'entregada' ? '📤 Entregada' :
      t.estado === 'calificada' ? '✅ Calificada' :
        t.estado === 'incorrecta' ? '❌ Incorrecta' : '❌ Vencida';

  var prioEmoji = t.prioridad === 'urgente' ? '🚨' : t.prioridad === 'alta' ? '🔥' : '';

  return '<div class="tarea-card ' + t.estado + '" data-id="' + t.id + '"' +
    ' style="--t-color:' + cfg.color + ';--t-rgb:' + cfg.rgb + '">' +
    '<div class="tarea-emoji-wrap">' + cfg.emoji + '</div>' +
    '<div class="tarea-body">' +
    '<div class="tarea-asig">' + t.asig + '</div>' +
    '<div class="tarea-desc">' + t.desc + '</div>' +
    '<div class="tarea-meta">' + diasTxt + '</div>' +
    '</div>' +
    '<div class="tarea-right">' +
    '<span class="tarea-estado ' + estadoClase + '">' + estadoTxt + '</span>' +
    '</div>' +
    (prioEmoji ? '<span class="tarea-prioridad-badge">' + prioEmoji + '</span>' : '') +
    '</div>';
}

// ============================================
// 9. ABRIR MODAL NUEVA TAREA
// ============================================
function abrirModalNueva() {
  STATE.editandoId = null;
  STATE.fotoBlob = null;
  document.getElementById('modalTitulo').textContent = 'Nueva Tarea';
  document.getElementById('fAsig').value = '';
  document.getElementById('fDescripcion').value = '';
  document.getElementById('fPrioridad').value = 'normal';
  var hoy = new Date(); hoy.setDate(hoy.getDate() + 1);
  document.getElementById('fFecha').valueAsDate = hoy;
  quitarFoto();
  abrirModal('modalTarea');
}

// ============================================
// 10. GUARDAR TAREA (POST / PUT)
// ============================================
function guardarTarea() {
  var asig = document.getElementById('fAsig').value;
  var desc = document.getElementById('fDescripcion').value.trim();
  var fecha = document.getElementById('fFecha').value;

  if (!asig) { toast('⚠️ Selecciona una asignatura', 'warning'); return; }
  if (!desc) { toast('⚠️ Escribe una descripción', 'warning'); return; }
  if (!fecha && !STATE.editandoId) { toast('⚠️ Selecciona la fecha de entrega', 'warning'); return; }

  if (!window.CLERK_TOKEN) {
    toast('⚠️ Inicia sesión para guardar tareas', 'warning');
    return;
  }

  var btn = document.getElementById('btnGuardarTarea');
  btn.disabled = true;

  var isEdit = !!STATE.editandoId;
  var body = isEdit
    ? { id: STATE.editandoId, contenido: desc }
    : { asignatura: asig, contenido: desc, fecha: fecha };

  var promise = (!isEdit && STATE.fotoBlob)
    ? blobToBase64(STATE.fotoBlob).then(function (b64) { body.foto_url = b64; return body; })
    : Promise.resolve(body);

  promise
    .then(function (bodyFinal) {
      return fetch(BASE_URL + '/api/tareas', {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'include',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}
        ),
        body: JSON.stringify(bodyFinal),
      });
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      btn.disabled = false;
      if (isEdit) {
        var tarea = STATE.tareas.find(function (t) { return t.id === STATE.editandoId; });
        if (tarea && data && data.tarea) {
          Object.assign(tarea, mapearTarea(data.tarea));
        } else if (tarea) {
          tarea.desc = desc;
        }
        toast('✅ Tarea actualizada', 'success');
      } else {
        var rawTarea = data && data.id ? data : null;
        if (rawTarea) {
          STATE.tareas.unshift(mapearTarea(rawTarea));
        }
        toast('📝 Tarea creada · entrega: ' + formatearFecha(fecha), 'info');
      }
      cerrarModal('modalTarea');
      renderTareas();
      actualizarStats();
    })
    .catch(function () {
      btn.disabled = false;
      toast('❌ Error al guardar. Intenta de nuevo.', 'error');
    });
}

// ============================================
// 11. ABRIR DETALLE
// ============================================
function abrirDetalle(id) {
  var t = STATE.tareas.find(function (x) { return x.id === id; });
  if (!t) return;
  STATE.detalleId = id;

  var cfg = ASIG_CONFIG[t.asig] || { emoji: '📝' };
  document.getElementById('detAsig').textContent = cfg.emoji;
  document.getElementById('detTitulo').textContent = t.asig;
  document.getElementById('detFecha').textContent = formatearFecha(t.fecha);

  var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  var dias = Math.round((new Date(t.fecha + 'T00:00:00') - hoy) / 86400000);

  var estadoHtml = '';
  if (t.estado === 'calificada') {
    estadoHtml = '<div class="det-row"><span class="det-icon">✅</span><div><div class="det-label">ESTADO</div><div class="det-val" style="color:var(--green)">Correcta</div></div></div>';
  } else if (t.estado === 'incorrecta') {
    estadoHtml = '<div class="det-row"><span class="det-icon">❌</span><div><div class="det-label">ESTADO</div><div class="det-val" style="color:#ef4444">Incorrecta</div></div></div>';
  } else if (t.estado === 'entregada') {
    estadoHtml = '<div class="det-row"><span class="det-icon">📤</span><div><div class="det-label">ESTADO</div><div class="det-val" style="color:var(--cyan)">Entregada · esperando corrección</div></div></div>';
  }

  document.getElementById('detBody').innerHTML =
    '<div class="det-row"><span class="det-icon">📋</span><div><div class="det-label">DESCRIPCIÓN</div><div class="det-val">' + t.desc + '</div></div></div>' +
    '<div class="det-row"><span class="det-icon">📅</span><div><div class="det-label">FECHA DE ENTREGA</div><div class="det-val">' + formatearFecha(t.fecha) + '</div></div></div>' +
    '<div class="det-row"><span class="det-icon">🎯</span><div><div class="det-label">PRIORIDAD</div><div class="det-val">' + (t.prioridad === 'urgente' ? '🚨 Urgente' : t.prioridad === 'alta' ? '🔥 Alta' : 'Normal') + '</div></div></div>' +
    estadoHtml +
    (t.estado === 'pendiente' && dias >= 0 ? '<div class="det-row"><span class="det-icon">⏳</span><div><div class="det-label">TIEMPO RESTANTE</div><div class="det-val">' + (dias === 0 ? 'Vence hoy' : 'En ' + dias + ' día' + (dias !== 1 ? 's' : '')) + '</div></div></div>' : '');

  var acc = document.getElementById('detAcciones');
  if (t.estado === 'pendiente' || t.estado === 'vencida') {
    acc.innerHTML =
      '<button class="btn-det btn-det-primary" id="btnMarcarEntregada">✅ Marcar como entregada</button>' +
      '<button class="btn-det btn-det-secondary" id="btnEditarTarea">✏️ Editar descripción</button>' +
      '<button class="btn-det btn-det-danger" id="btnEliminarTarea">🗑️ Eliminar</button>';
    document.getElementById('btnMarcarEntregada').addEventListener('click', function () { marcarEntregada(id); });
    document.getElementById('btnEditarTarea').addEventListener('click', function () { editarTarea(id); });
    document.getElementById('btnEliminarTarea').addEventListener('click', function () { eliminarTarea(id); });
  } else if (t.estado === 'entregada') {
    acc.innerHTML = '<button class="btn-det btn-det-danger" id="btnEliminarTarea">🗑️ Eliminar</button>';
    document.getElementById('btnEliminarTarea').addEventListener('click', function () { eliminarTarea(id); });
  } else {
    acc.innerHTML = '<button class="btn-det btn-det-danger" id="btnEliminarTarea">🗑️ Eliminar</button>';
    document.getElementById('btnEliminarTarea').addEventListener('click', function () { eliminarTarea(id); });
  }

  abrirModal('modalDetalle');
}

// ============================================
// 12. ACCIONES DE TAREA
// ============================================
function marcarEntregada(id) {
  var t = STATE.tareas.find(function (x) { return x.id === id; });
  if (!t) return;

  fetch(BASE_URL + '/api/tareas', {
    method: 'PUT',
    credentials: 'include',
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}
    ),
    body: JSON.stringify({ id: t.id, contenido: t.desc || 'Entregado' }),
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && data.tarea) {
        var idx = STATE.tareas.findIndex(function (x) { return x.id === id; });
        if (idx >= 0) STATE.tareas[idx] = mapearTarea(data.tarea);
      } else {
        t.estado = 'entregada';
      }
      cerrarModal('modalDetalle');
      renderTareas();
      actualizarStats();
      toast('📤 ¡Tarea entregada! Espera la corrección del profesor 🎓', 'success');
    })
    .catch(function () {
      t.estado = 'entregada';
      cerrarModal('modalDetalle');
      renderTareas();
      actualizarStats();
      toast('📤 Tarea marcada como entregada', 'success');
    });
}

function editarTarea(id) {
  var t = STATE.tareas.find(function (x) { return x.id === id; });
  if (!t) return;
  STATE.editandoId = id;
  cerrarModal('modalDetalle');
  document.getElementById('modalTitulo').textContent = 'Editar Tarea';
  document.getElementById('fAsig').value = t.asig;
  document.getElementById('fDescripcion').value = t.desc;
  document.getElementById('fFecha').value = t.fecha;
  document.getElementById('fPrioridad').value = t.prioridad;
  quitarFoto();
  abrirModal('modalTarea');
}

function eliminarTarea(id) {
  if (!confirm('¿Eliminar esta tarea?')) return;

  fetch(BASE_URL + '/api/tareas', {
    method: 'DELETE',
    credentials: 'include',
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}
    ),
    body: JSON.stringify({ id: id }),
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function () {
      STATE.tareas = STATE.tareas.filter(function (t) { return t.id !== id; });
      cerrarModal('modalDetalle');
      renderTareas();
      actualizarStats();
      toast('🗑️ Tarea eliminada', 'warning');
    })
    .catch(function () {
      toast('❌ Error al eliminar. Intenta de nuevo.', 'error');
    });
}

// ============================================
// 13. STATS
// ============================================
function actualizarStats() {
  var total = STATE.tareas.length;
  var pendientes = STATE.tareas.filter(function (t) { return t.estado === 'pendiente' || t.estado === 'vencida'; }).length;
  var entregadas = STATE.tareas.filter(function (t) { return t.estado === 'entregada' || t.estado === 'calificada'; }).length;
  var calificadas = STATE.tareas.filter(function (t) { return t.estado === 'calificada'; }).length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statPendientes').textContent = pendientes;
  document.getElementById('statEntregadas').textContent = entregadas;
  document.getElementById('statMonedas').textContent = calificadas;
}

// ============================================
// 14. FOTO
// ============================================
function previsualizarFoto(event) {
  var file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('⚠️ La imagen no puede superar 5MB', 'warning'); return; }

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
        document.getElementById('uploadPlaceholder').style.display = 'none';
        document.getElementById('uploadPreview').style.display = 'block';
        document.getElementById('previewImg').src = URL.createObjectURL(blob);
      }, 'image/jpeg', 0.75);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function quitarFoto() {
  STATE.fotoBlob = null;
  document.getElementById('fFoto').value = '';
  document.getElementById('uploadPlaceholder').style.display = 'block';
  document.getElementById('uploadPreview').style.display = 'none';
}

// ============================================
// 15. HELPERS
// ============================================
function formatearFecha(str) {
  if (!str) return '—';
  var d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function blobToBase64(blob) {
  return new Promise(function (resolve) {
    var reader = new FileReader();
    reader.onloadend = function () { resolve(reader.result); };
    reader.readAsDataURL(blob);
  });
}

// ============================================
// PANEL ADMIN — v2
// ============================================
function cambiarTabTareas(tab) {
  STATE.tabActual = tab;
  document.getElementById('tabAlumno').classList.toggle('active', tab === 'alumno');
  document.getElementById('tabAdmin').classList.toggle('active', tab === 'admin');

  var panelAlumno = [
    document.querySelector('.tareas-stats'),
    document.querySelector('.filtros-bar'),
    document.getElementById('tareasLista'),
    document.getElementById('tareasVacio'),
    document.getElementById('btnNuevaTarea'),
  ];
  var panelAdmin = document.getElementById('panelAdmin');

  if (tab === 'alumno') {
    panelAlumno.forEach(function (el) { if (el) el.style.display = ''; });
    panelAdmin.style.display = 'none';
    document.getElementById('pageTitle').textContent = 'Mis Tareas';
    document.getElementById('pageSubtitle').textContent = 'Sube tus tareas y gana EduCoins al registrarlas a tiempo.';
  } else {
    panelAlumno.forEach(function (el) { if (el) el.style.display = 'none'; });
    panelAdmin.style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Revisión de Tareas';
    document.getElementById('pageSubtitle').textContent = 'Revisa y califica las tareas entregadas por los alumnos.';
    cargarTareasAdmin();
  }
}

function cargarTareasAdmin() {
  var asig = document.getElementById('adminFiltroAsig').value;
  var url = BASE_URL + '/api/tareas?admin=true' + (asig ? '&asignatura=' + encodeURIComponent(asig) : '');
  fetch(url, {
    credentials: 'include',
    headers: window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {},
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;
      STATE.tareasAdmin = data.tareas || [];
      renderTareasAdmin();
    })
    .catch(function () { toast('⚠️ Error al cargar tareas', 'warning'); });
}

function renderTareasAdmin() {
  var lista = document.getElementById('tareasAdminLista');
  var vacio = document.getElementById('tareasAdminVacio');
  var contador = document.getElementById('adminContador');
  var tareas = STATE.tareasAdmin;

  contador.textContent = tareas.length + ' tarea' + (tareas.length !== 1 ? 's' : '') + ' pendiente' + (tareas.length !== 1 ? 's' : '') + ' de revisión';

  if (tareas.length === 0) {
    lista.style.display = 'none';
    vacio.style.display = 'block';
    return;
  }
  lista.style.display = 'block';
  vacio.style.display = 'none';

  lista.innerHTML = tareas.map(function (t) {
    var cfg = ASIG_CONFIG[t.asignatura] || { emoji: '📝' };
    var fecha = t.fecha ? String(t.fecha).split('T')[0] : '';
    var fotoHtml = t.foto_url ? '<img class="admin-tarea-foto" src="' + t.foto_url + '" alt="foto"/>' : '';
    return '<div class="admin-tarea-card" data-id="' + t.id + '">' +
      '<div class="admin-tarea-header">' +
      '<div>' +
      '<div class="admin-tarea-alumno">' + cfg.emoji + ' ' + (t.nombre_alumno || 'Alumno') + '</div>' +
      '<div class="admin-tarea-asig">' + t.asignatura + '</div>' +
      '</div>' +
      '<div class="admin-tarea-fecha">📅 ' + fecha + '</div>' +
      '</div>' +
      '<div class="admin-tarea-desc">' + (t.contenido_subido || '') + '</div>' +
      fotoHtml +
      '</div>';
  }).join('');

  lista.querySelectorAll('.admin-tarea-card').forEach(function (card) {
    card.addEventListener('click', function () { abrirRevision(this.dataset.id); });
  });
}

function abrirRevision(id) {
  var t = STATE.tareasAdmin.find(function (x) { return x.id === id; });
  if (!t) return;
  STATE.revisionId = id;
  STATE.revisionCorrecta = null;

  var cfg = ASIG_CONFIG[t.asignatura] || { emoji: '📝' };
  document.getElementById('revAsigIcon').textContent = cfg.emoji;
  document.getElementById('revTitulo').textContent = t.asignatura;
  document.getElementById('revAlumno').textContent = (t.nombre_alumno || 'Alumno') + ' · ' + String(t.fecha || '').split('T')[0];

  var fotoHtml = t.foto_url
    ? '<div class="det-row"><span class="det-icon">📷</span><div><div class="det-label">FOTO</div><img src="' + t.foto_url + '" style="max-width:100%;border-radius:8px;margin-top:.4rem"/></div></div>'
    : '';

  document.getElementById('revBody').innerHTML =
    '<div class="det-row"><span class="det-icon">📋</span><div><div class="det-label">DESCRIPCIÓN</div><div class="det-val">' + (t.contenido_subido || '—') + '</div></div></div>' +
    fotoHtml;

  document.getElementById('btnRevCorrecta').classList.remove('selected');
  document.getElementById('btnRevIncorrecta').classList.remove('selected');
  document.getElementById('revPct').value = 100;
  document.getElementById('revPctVal').textContent = '100';
  actualizarRecompensaEstimada();

  document.getElementById('btnCerrarRevision').onclick = function () { cerrarModal('modalRevision'); };
  document.getElementById('btnRevCorrecta').onclick = function () { seleccionarCorreccion(true); };
  document.getElementById('btnRevIncorrecta').onclick = function () { seleccionarCorreccion(false); };
  document.getElementById('btnGuardarRevision').onclick = function () { guardarRevision(); };
  document.getElementById('revPct').oninput = function () {
    document.getElementById('revPctVal').textContent = this.value;
    actualizarRecompensaEstimada();
  };
  abrirModal('modalRevision');
}

function seleccionarCorreccion(esCorrecta) {
  STATE.revisionCorrecta = esCorrecta;
  document.getElementById('btnRevCorrecta').classList.toggle('selected', esCorrecta === true);
  document.getElementById('btnRevIncorrecta').classList.toggle('selected', esCorrecta === false);
  actualizarRecompensaEstimada();
}

function actualizarRecompensaEstimada() {
  var pct = parseInt(document.getElementById('revPct').value);
  var correcta = STATE.revisionCorrecta;
  var txt = '—';
  if (correcta === true) {
    if (pct >= 100) txt = '🪙 +100 EduCoins · ⭐ +50 XP';
    else if (pct >= 80) txt = '🪙 +80 EduCoins · ⭐ +40 XP';
    else txt = '🪙 +50 EduCoins · ⭐ +25 XP';
  } else if (correcta === false) {
    txt = '❌ Sin recompensa';
  }
  document.getElementById('revRecompensa').textContent = txt;
}

function guardarRevision() {
  if (STATE.revisionCorrecta === null) {
    toast('⚠️ Selecciona si la tarea es correcta o incorrecta', 'warning');
    return;
  }
  var pct = parseInt(document.getElementById('revPct').value);
  var btn = document.getElementById('btnGuardarRevision');
  btn.disabled = true;
  btn.textContent = '⏳ Guardando...';

  fetch(BASE_URL + '/api/tareas', {
    method: 'PUT',
    credentials: 'include',
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}
    ),
    body: JSON.stringify({
      id: STATE.revisionId,
      es_correcta: STATE.revisionCorrecta,
      porcentaje_obtenido: pct,
      admin: true,
    }),
  })
    .then(function (r) { return r.json(); })
    .then(function () {
      btn.disabled = false;
      btn.textContent = '💾 Guardar Revisión';
      cerrarModal('modalRevision');
      STATE.tareasAdmin = STATE.tareasAdmin.filter(function (t) { return t.id !== STATE.revisionId; });
      renderTareasAdmin();
      toast(
        STATE.revisionCorrecta ? '✅ Tarea calificada · recompensa entregada al alumno' : '❌ Tarea marcada como incorrecta',
        STATE.revisionCorrecta ? 'success' : 'warning'
      );
    })
    .catch(function () {
      btn.disabled = false;
      btn.textContent = '💾 Guardar Revisión';
      toast('⚠️ Error al guardar', 'warning');
    });
}