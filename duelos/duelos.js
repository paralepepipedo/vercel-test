// ============================================
// ARCHIVO: /duelos/duelos.js
// DEPENDENCIA: ../shared/shared.js cargado antes
// ============================================

// ============================================
// 1. MOCK DUELOS
// TODO: reemplazar con fetch('/api/duelos')
// ============================================
var MOCK_DUELOS = [];

var MOCK_RIVALES = [
  { nombre:'ProMath7',  avatar:'🦊', nivel:14, winrate:'72%' },
  { nombre:'Sabiotodo', avatar:'🐼', nivel:11, winrate:'58%' },
  { nombre:'Curioso98', avatar:'🐨', nivel:10, winrate:'50%' },
  { nombre:'EspacialX', avatar:'🚀', nivel:12, winrate:'61%' },
  { nombre:'Calculista',avatar:'🤖', nivel:9,  winrate:'45%' },
];

// Preguntas de duelo (5 por partida)
var PREGUNTAS_DUELO = [
  { p:'¿Cuánto es 9 × 7?',                ops:['56','63','72','54'], c:1 },
  { p:'¿Cuál es la capital de Chile?',     ops:['Valparaíso','Concepción','Santiago','Temuco'], c:2 },
  { p:'¿Cuánto es 15% de 300?',            ops:['30','35','45','50'], c:2 },
  { p:'¿Qué planeta está más cerca del sol?', ops:['Venus','Tierra','Mercurio','Marte'], c:2 },
  { p:'¿Cuánto es √144?',                  ops:['11','12','13','14'], c:1 },
];

var STATE = {
  duelos:          MOCK_DUELOS.map(function(d) { return Object.assign({}, d); }),
  rivalSeleccionado: null,
  apuestaSeleccionada: 200,
  // Duelo en curso
  dueloActivo:     null,
  preguntaIdx:     0,
  misPuntos:       0,
  puntosSimulado:  0,
  timerDuelo:      null,
  respondiendo:    false,
};

// ============================================
// 2. INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  initShared('duelos');
  renderTodosDuelos();
  initEventos();
});

// ============================================
// 3. EVENTOS
// ============================================
function initEventos() {
  document.getElementById('btnNuevoDuelo').addEventListener('click', abrirModalNuevo);
  document.getElementById('btnCerrarNuevoDuelo').addEventListener('click', function() { cerrarModal('modalNuevoDuelo'); });
  document.getElementById('btnCerrarDuelo').addEventListener('click', function() { cerrarModal('modalDuelo'); });
  document.getElementById('modalNuevoDuelo').addEventListener('click', function(e) { if(e.target===this) cerrarModal('modalNuevoDuelo'); });

  // Búsqueda de rival
  document.getElementById('dueloRival').addEventListener('input', function() { filtrarRivales(this.value); });

  // Apuesta
  document.querySelectorAll('.apuesta-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.apuesta-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      STATE.apuestaSeleccionada = parseInt(this.dataset.val);
    });
  });

  // Enviar duelo
  document.getElementById('btnEnviarDuelo').addEventListener('click', enviarDuelo);
}

// ============================================
// 4. RENDERIZAR DUELOS
// ============================================
function renderTodosDuelos() {
  var pendientes = STATE.duelos.filter(function(d) { return d.estado==='pendiente'; });
  var activos    = STATE.duelos.filter(function(d) { return d.estado==='activo'; });
  var historial  = STATE.duelos.filter(function(d) { return d.estado==='ganado'||d.estado==='perdido'; });

  renderLista('duelosPendientes', pendientes);
  renderLista('duelosActivos', activos);
  renderLista('duelosHistorial', historial);
  document.getElementById('pendientesChip').textContent = pendientes.length;
}

function renderLista(elId, lista) {
  var el = document.getElementById(elId);
  if (!lista.length) {
    el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--text-muted);font-weight:700;font-size:.85rem">Sin duelos aquí</div>';
    return;
  }
  el.innerHTML = lista.map(construirDueloCard).join('');
  el.querySelectorAll('[data-action]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var action = this.dataset.action;
      var id     = this.dataset.id;
      if (action==='aceptar')   aceptarDuelo(id);
      if (action==='rechazar')  rechazarDuelo(id);
      if (action==='jugar')     jugarDuelo(id);
    });
  });
}

function construirDueloCard(d) {
  var estadoTxt   = { pendiente:'⏳ Te desafían', activo:'⚡ En curso', ganado:'🏆 Ganaste', perdido:'💀 Perdiste' };
  var estadoClase = { pendiente:'badge-pendiente', activo:'badge-activo', ganado:'badge-ganado', perdido:'badge-perdido' };
  var score = (d.puntosMio!==null&&d.puntosRival!==null)
    ? d.puntosMio+'-'+d.puntosRival
    : d.puntosMio!==null ? 'Tus pts: '+d.puntosMio : '';

  var acciones = '';
  if (d.estado==='pendiente') {
    acciones = '<button class="duelo-action-btn btn-aceptar" data-action="aceptar" data-id="'+d.id+'">✅ Aceptar</button>' +
               '<button class="duelo-action-btn btn-rechazar" data-action="rechazar" data-id="'+d.id+'">✕ Rechazar</button>';
  } else if (d.estado==='activo') {
    acciones = '<button class="duelo-action-btn btn-jugar" data-action="jugar" data-id="'+d.id+'">▶ Jugar</button>';
  }

  return '<div class="duelo-card '+d.estado+'">' +
    '<div class="duelo-avatares"><span class="duelo-av">🐰</span><span class="duelo-vs-mini">VS</span><span class="duelo-av">'+d.rival.avatar+'</span></div>' +
    '<div class="duelo-info">' +
      '<div class="duelo-asig">'+d.asig+'</div>' +
      '<div class="duelo-rival-nombre">'+d.rival.nombre+'</div>' +
      '<div class="duelo-meta">'+formatFecha(d.fecha)+(score?' · '+score:'')+'</div>' +
    '</div>' +
    '<div class="duelo-right">' +
      '<span class="duelo-estado-badge '+estadoClase[d.estado]+'">'+estadoTxt[d.estado]+'</span>' +
      '<span class="duelo-apuesta">'+COIN_IMG+' '+d.apuesta+'</span>' +
      (acciones ? '<div style="display:flex;gap:.5rem;flex-wrap:wrap">'+acciones+'</div>' : '') +
    '</div>' +
  '</div>';
}

// ============================================
// 5. MODAL NUEVO DUELO
// ============================================
function abrirModalNuevo() {
  STATE.rivalSeleccionado = null;
  document.getElementById('dueloRival').value = '';
  filtrarRivales('');
  abrirModal('modalNuevoDuelo');
}

function filtrarRivales(query) {
  var contenedor = document.getElementById('rivalesSugeridos');
  var filtrados  = MOCK_RIVALES.filter(function(r) {
    return !query || r.nombre.toLowerCase().includes(query.toLowerCase());
  }).slice(0, 4);

  contenedor.innerHTML = filtrados.map(function(r) {
    var sel = STATE.rivalSeleccionado && STATE.rivalSeleccionado.nombre===r.nombre ? ' seleccionado' : '';
    return '<div class="rival-sugerido'+sel+'" data-nombre="'+r.nombre+'">' +
      '<span class="rival-av">'+r.avatar+'</span>' +
      '<div class="rival-info"><div class="rival-nombre">'+r.nombre+'</div><div class="rival-nivel">Nv.'+r.nivel+' — Win rate: '+r.winrate+'</div></div>' +
    '</div>';
  }).join('');

  contenedor.querySelectorAll('.rival-sugerido').forEach(function(el) {
    el.addEventListener('click', function() {
      STATE.rivalSeleccionado = MOCK_RIVALES.find(function(r) { return r.nombre===el.dataset.nombre; });
      contenedor.querySelectorAll('.rival-sugerido').forEach(function(e) { e.classList.remove('seleccionado'); });
      el.classList.add('seleccionado');
    });
  });
}

function enviarDuelo() {
  var asig = document.getElementById('dueloAsig').value;
  if (!asig) { toast('⚠️ Selecciona una asignatura', 'warning'); return; }
  if (!STATE.rivalSeleccionado) { toast('⚠️ Selecciona un rival', 'warning'); return; }

  STATE.duelos.unshift({
    id: 'd'+Date.now(), estado:'activo', asig,
    rival: STATE.rivalSeleccionado,
    apuesta: STATE.apuestaSeleccionada,
    esDesafiante: true, puntosMio:null, puntosRival:null,
    fecha: new Date().toISOString().slice(0,10),
  });

  cerrarModal('modalNuevoDuelo');
  renderTodosDuelos();
  toast('⚔️ Desafío enviado a '+STATE.rivalSeleccionado.nombre, 'info');
  // TODO: fetch('/api/duelos', { method:'POST', body:{ asig, rival_id, apuesta } })
}

// ============================================
// 6. ACCIONES
// ============================================
function aceptarDuelo(id) {
  var d = STATE.duelos.find(function(x) { return x.id===id; });
  if (!d) return;
  d.estado = 'activo';
  renderTodosDuelos();
  toast('✅ Duelo aceptado. ¡A jugar!', 'success');
  setTimeout(function() { jugarDuelo(id); }, 500);
}

function rechazarDuelo(id) {
  STATE.duelos = STATE.duelos.filter(function(d) { return d.id!==id; });
  renderTodosDuelos();
  toast('✕ Duelo rechazado', 'warning');
}

function jugarDuelo(id) {
  var d = STATE.duelos.find(function(x) { return x.id===id; });
  if (!d) return;
  STATE.dueloActivo  = d;
  STATE.preguntaIdx  = 0;
  STATE.misPuntos    = 0;
  STATE.puntosSimulado = 0;
  STATE.respondiendo = false;

  document.getElementById('dueloMiAvatar').textContent    = '🐰';
  document.getElementById('dueloMiNombre').textContent    = 'Tú';
  document.getElementById('dueloRivalAvatar').textContent = d.rival.avatar;
  document.getElementById('dueloRivalNombre').textContent = d.rival.nombre;
  actualizarScoreDuelo();

  mostrarPreguntaDuelo();
  abrirModal('modalDuelo');
}

function mostrarPreguntaDuelo() {
  clearInterval(STATE.timerDuelo);
  STATE.respondiendo = false;
  var pregs = shuffleArr(PREGUNTAS_DUELO.slice());
  var p = pregs[STATE.preguntaIdx % pregs.length];
  var tiempoLeft = 10;

  document.getElementById('dueloPregNum').textContent    = 'Pregunta '+(STATE.preguntaIdx+1)+'/5';
  document.getElementById('dueloPregunta').textContent   = p.p;
  document.getElementById('dueloTimerFill').style.width  = '100%';
  document.getElementById('dueloTimerFill').style.background = 'linear-gradient(90deg,var(--red),var(--orange))';

  var opcEl = document.getElementById('dueloOpciones');
  opcEl.innerHTML = p.ops.map(function(op,i) {
    return '<button class="duelo-opcion" data-idx="'+i+'" data-correct="'+p.c+'">'+op+'</button>';
  }).join('');

  opcEl.querySelectorAll('.duelo-opcion').forEach(function(btn) {
    btn.addEventListener('click', function() { responderDuelo(parseInt(this.dataset.idx), parseInt(this.dataset.correct)); });
  });

  STATE.timerDuelo = setInterval(function() {
    tiempoLeft -= 0.1;
    document.getElementById('dueloTimerFill').style.width = Math.max(0,(tiempoLeft/10)*100)+'%';
    if (tiempoLeft<=0 && !STATE.respondiendo) {
      STATE.respondiendo = true;
      clearInterval(STATE.timerDuelo);
      document.querySelectorAll('.duelo-opcion')[p.c].classList.add('correcta');
      document.querySelectorAll('.duelo-opcion').forEach(function(b){b.disabled=true;});
      // Rival gana punto aleatoriamente
      if (Math.random() > 0.5) STATE.puntosSimulado++;
      actualizarScoreDuelo();
      setTimeout(siguientePreguntaDuelo, 1200);
    }
  }, 100);
}

function responderDuelo(idx, correct) {
  if (STATE.respondiendo) return;
  STATE.respondiendo = true;
  clearInterval(STATE.timerDuelo);
  var btns = document.querySelectorAll('.duelo-opcion');
  btns.forEach(function(b){b.disabled=true;});
  btns[correct].classList.add('correcta');
  if (idx===correct) {
    STATE.misPuntos++;
    btns[idx].classList.add('correcta');
  } else {
    btns[idx].classList.add('incorrecta');
  }
  // Rival responde aleatoriamente (simulación)
  if (Math.random() > 0.45) STATE.puntosSimulado++;
  actualizarScoreDuelo();
  setTimeout(siguientePreguntaDuelo, 1000);
}

function siguientePreguntaDuelo() {
  STATE.preguntaIdx++;
  if (STATE.preguntaIdx >= 5) {
    terminarDuelo(); return;
  }
  mostrarPreguntaDuelo();
}

function actualizarScoreDuelo() {
  document.getElementById('dueloMiPts').textContent    = STATE.misPuntos + ' pts';
  document.getElementById('dueloRivalPts').textContent = STATE.puntosSimulado + ' pts';
}

function terminarDuelo() {
  clearInterval(STATE.timerDuelo);
  cerrarModal('modalDuelo');

  var gane = STATE.misPuntos > STATE.puntosSimulado;
  var d    = STATE.dueloActivo;
  d.estado       = gane ? 'ganado' : 'perdido';
  d.puntosMio    = STATE.misPuntos;
  d.puntosRival  = STATE.puntosSimulado;

  renderTodosDuelos();
  if (gane) {
    toast('🏆 ¡Ganaste el duelo! +'+d.apuesta+' EduCoins', 'success');
    // TODO: fetch('/api/duelos', { method:'PUT', body:{ id:d.id, ganador:'yo' } })
  } else {
    toast('💀 Perdiste el duelo. -'+d.apuesta+' EduCoins', 'error');
  }
}

// ============================================
// 7. HELPERS
// ============================================
function formatFecha(str) {
  if (!str) return '';
  var d = new Date(str+'T00:00:00');
  return d.toLocaleDateString('es-CL',{day:'numeric',month:'short'});
}
function shuffleArr(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
