// ============================================================
// ARCHIVO: /juegos/juegos.js
// DESCRIPCIÓN: Lobby de juegos con sistema de niveles
// VERSIÓN: 1.2.0 — 2026-03-08
// Changelog:
//   1.2.0 - Fix timing: polling CLERK_TOKEN en vez de clerkReady
//           Promise.all para cargar catálogo+stats juntos
//           Fix juego favorito en stats rápidas
//   1.1.0 - Sistema de niveles por juego, popup mapa niveles
// ============================================================

// ── Estado global ────────────────────────────────────────────
var STATE = {
  energia: 100,
  topHoy: {},
  xp_actual: 0,
  nivel_actual: 1,
  xp_siguiente: 1000,
  juegos: [],          // catálogo cargado desde API
  niveles_juegos: {},          // { HorseRace: { nivel_actual, intentos_hoy, intentos_requeridos } }
};

// Juego actualmente mostrado en el popup
var POPUP_JUEGO = null;

// Avatares base → emoji
var AVATAR_EMOJIS = { conejo: '🐰', oso: '🐻', zorro: '🦊', pinguino: '🐧', gato: '🐱', perro: '🐶', pajaro: '🐦' };
function avatarEmoji(base) { return AVATAR_EMOJIS[base] || '🐰'; }

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
  initShared('juegos');
  iniciarTimerBonus();
  actualizarEnergia();
  // Renderizar con datos vacíos mientras llega la API
  renderJuegos();
  renderTopHoy();
});

// ============================================================
// CLERK — carga datos reales desde la API
// ============================================================
// Polling: clerkReady puede haber ocurrido antes de que este script cargara
(function _waitToken(tries) {
  if (window.CLERK_TOKEN) {
    cargarDatos();
  } else if (tries > 0) {
    setTimeout(function () { _waitToken(tries - 1); }, 300);
  }
})(20); // hasta 6 segundos

function cargarDatos() {
  var promCatalogo = fetch(BASE_URL + '/api/juegos?action=catalogo', {
    credentials: 'include',
    headers: { 'Authorization': 'Bearer ' + window.CLERK_TOKEN }
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });

  var promStats = fetch(BASE_URL + '/api/juegos', {
    credentials: 'include',
    headers: { 'Authorization': 'Bearer ' + window.CLERK_TOKEN }
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });

  Promise.all([promCatalogo, promStats]).then(function (results) {
    var catalogo = results[0];
    var data = results[1];

    // Aplicar catálogo
    if (catalogo && catalogo.juegos && catalogo.juegos.length) {
      STATE.juegos = catalogo.juegos;
    }

    // Aplicar stats + niveles
    if (data) {
      if (data.energia_actual != null) STATE.energia = Number(data.energia_actual);
      STATE.topHoy = data.top_hoy || {};
      STATE.xp_actual = Number(data.xp_actual || 0);
      STATE.nivel_actual = Number(data.nivel_actual || 1);
      STATE.xp_siguiente = Number(data.xp_siguiente_nivel || 1000);
      STATE.niveles_juegos = data.niveles_juegos || {};

      // Estadísticas rápidas
      var partidas = data.partidas_hoy || [];
      var totalPartidas = partidas.length;
      var totalMonedas = partidas.reduce(function (s, p) { return s + Number(p.monedas_ganadas || 0); }, 0);
      var mejorJuego = partidas.length
        ? (partidas.sort(function (a, b) { return b.monedas_ganadas - a.monedas_ganadas; })[0].juego_id || '—')
        : '—';

      var elQs = document.getElementById('qsTotalJuegos');
      var elMn = document.getElementById('qsMonedasJuegos');
      var elMj = document.getElementById('qsMejorJuego');
      if (elQs) elQs.textContent = totalPartidas;
      if (elMn) elMn.textContent = totalMonedas;
      if (elMj) elMj.textContent = mejorJuego;
    }

    // Renderizar todo junto con datos completos
    actualizarEnergia();
    actualizarBarraXP();
    renderJuegos();
    renderTopHoy();
  });
}


// ============================================================
// RENDERIZAR GRID DE JUEGOS
// ============================================================
function renderJuegos() {
  var grid = document.getElementById('juegosGrid');
  if (!grid) return;

  // Si no hay catálogo aún, usar el fallback hardcodeado
  var lista = STATE.juegos.length ? STATE.juegos : JUEGOS_FALLBACK;

  grid.innerHTML = lista.map(function (j) {
    var dots = '';
    for (var i = 1; i <= 3; i++) {
      dots += '<div class="diff-dot' + (i <= (j.dificultad || 2) ? ' on' : '') + '"></div>';
    }

    // ── Mini indicador de nivel ──
    var nivelHTML = '';
    if (j.tiene_niveles) {
      var nd = STATE.niveles_juegos[j.juego_id] || { nivel_actual: 1, intentos_hoy: 0, intentos_requeridos: 3 };
      var nivelActual = nd.nivel_actual || 1;
      var nivelMax = nd.nivel_maximo || (j.juego_id === 'coinclik' ? 5 : 10);
      var esMaestro = nivelActual >= nivelMax;

      if (j.juego_id === 'coinclik') {
        // ── CoinClick: segmentos = niveles completados ──
        var nivelesCompletados = nivelActual - 1;
        var hintTxt = esMaestro ? '🏆 Maestro' : 'Nivel ' + nivelActual + ' en curso';
        var segs = '';
        for (var s = 0; s < nivelMax; s++) {
          var clsSeg = s < nivelesCompletados ? (s === 0 ? 'lleno-1' : s < 3 ? 'lleno-2' : 'lleno-3') : '';
          segs += '<div class="jns ' + clsSeg + '"></div>';
        }
      } else {
        // ── Otros juegos: lógica original de intentos ──
        var intentosReq = nd.intentos_requeridos || 3;
        var intentosHoy = nd.intentos_hoy || 0;
        var intentosMostrar = Math.min(intentosHoy, intentosReq);
        var hintTxt;
        if (esMaestro) {
          hintTxt = '🏆 Maestro';
        } else {
          var faltan = intentosReq - intentosMostrar;
          hintTxt = faltan <= 0 ? '✅ Listo' : faltan + ' para nv.' + (nivelActual + 1);
        }
        var segs = '';
        for (var s = 0; s < intentosReq; s++) {
          var clsSeg = '';
          if (s < intentosMostrar) {
            clsSeg = s === 0 ? 'lleno-1' : s === 1 ? 'lleno-2' : 'lleno-3';
          }
          segs += '<div class="jns ' + clsSeg + '"></div>';
        }
      }

      nivelHTML =
        '<div class="juego-nivel-wrap" onclick="event.preventDefault();event.stopPropagation();abrirPopupNiveles(\'' + j.juego_id + '\')">' +
        '<span class="juego-nivel-badge">Nv.' + nivelActual + '/' + nivelMax + '</span>' +
        '<div class="juego-nivel-segmentos">' + segs + '</div>' +
        '<span class="juego-nivel-hint">' + hintTxt + '</span>' +
        '</div>';
    }

    return '<a href="javascript:void(0)" class="juego-card"' +
      ' style="--j-color:' + j.color + ';--j-rgb:' + (j.rgb || '124,58,237') + ';--j-bg:' + j.bg + '"' +
      ' onclick="lanzarJuego(\'' + j.juego_id + '\',\'../' + j.url + '\')"' +
      '>' +
      '<div class="juego-banner">' +
      '<span class="juego-emoji">' + j.emoji + '</span>' +
      (j.badge ? '<span class="juego-badge">' + j.badge + '</span>' : '') +
      '</div>' +
      '<div class="juego-body">' +
      '<div class="juego-nombre">' + j.nombre + '</div>' +
      '<div class="juego-desc">' + (j.descripcion || '') + '</div>' +
      '<div class="juego-meta">' +
      '<span class="juego-recompensa">' + j.recompensa + ' 🪙</span>' +
      '<div class="juego-dificultad">' + dots + '</div>' +
      '<span class="juego-energia">-' + (j.energia || 10) + '⚡</span>' +
      '</div>' +
      nivelHTML +
      '</div>' +
      '</a>';
  }).join('');
}

// ============================================================
// LANZAR JUEGO — navega directamente (sin descontar energía)
// ============================================================
function lanzarJuego(id, url) {
  window.location.href = url;
}

// Llamado desde el botón del popup
function lanzarDesdePopup() {
  if (!POPUP_JUEGO) return;
  var j = buscarJuego(POPUP_JUEGO);
  if (!j) return;
  cerrarPopupNiveles(null);
  lanzarJuego(j.juego_id, '../' + j.url);
}

// ============================================================
// POPUP DE MAPA DE NIVELES
// ============================================================
function abrirPopupNiveles(juegoId) {
  POPUP_JUEGO = juegoId;
  var j = buscarJuego(juegoId);
  if (!j) return;

  var nd = STATE.niveles_juegos[juegoId] || { nivel_actual: 1, intentos_hoy: 0, intentos_requeridos: 3 };
  var intentosReq = nd.intentos_requeridos || 3;
  var intentosHoy = Math.min(nd.intentos_hoy, intentosReq);
  var nivelActual = nd.nivel_actual || 1;
  var nivelMax = nd.nivel_maximo || (juegoId === 'coinclik' ? 5 : 10);
  var esMaestro = nivelActual >= nivelMax;

  // Header
  document.getElementById('popEmoji').textContent = j.emoji;
  document.getElementById('popTitulo').textContent = j.nombre;
  document.getElementById('popSubtitulo').textContent = nd.nombre_nivel || ('Nivel ' + nivelActual);
  document.getElementById('popNivelBadge').textContent = 'Nivel ' + nivelActual + ' / ' + nivelMax;

  // ── CoinClick: estrellas = niveles completados, barra = progreso de niveles ──
  if (juegoId === 'coinclik') {
    var nivelesCompletados = nivelActual - 1;

    // Texto de estado
    var txtEl = document.getElementById('popIntentosTxt');
    txtEl.className = 'popup-intentos-txt';
    if (esMaestro) {
      txtEl.textContent = '🏆 ¡Todos los niveles completados!';
      txtEl.classList.add('verde');
    } else {
      txtEl.textContent = nivelesCompletados + ' de ' + nivelMax + ' niveles completados';
      txtEl.classList.add('violeta');
    }

    // 5 estrellas = 5 niveles
    var iconosNv = ['⭐', '⭐', '⭐', '⭐', '🏆'];
    var clasesNv = ['g1', 'g2', 'g3', 'g4', 'g5'];
    for (var i = 0; i < 5; i++) {
      var el = document.getElementById('popEst' + i);
      if (!el) continue;
      el.style.display = i < nivelMax ? '' : 'none';
      if (i < nivelesCompletados) {
        el.className = 'pop-est ' + clasesNv[i];
        el.textContent = iconosNv[i];
      } else {
        el.className = 'pop-est vacia';
        el.textContent = '☆';
      }
    }

    // Barra basada en niveles
    var pct = esMaestro ? 100 : Math.round((nivelesCompletados / nivelMax) * 100);
    var barraEl = document.getElementById('popBarraFill');
    barraEl.style.width = pct + '%';
    barraEl.className = 'popup-barra-fill' + (esMaestro ? ' completa' : '');

  } else {
    // ── Otros juegos: lógica original de intentos ──
    var txtEl = document.getElementById('popIntentosTxt');
    txtEl.className = 'popup-intentos-txt';
    if (esMaestro) {
      txtEl.textContent = '🏆 Nivel máximo alcanzado';
      txtEl.classList.add('verde');
    } else {
      var faltan = intentosReq - intentosHoy;
      if (faltan <= 0) {
        txtEl.textContent = '✅ ¡Nivel completado!';
        txtEl.classList.add('verde');
      } else {
        txtEl.textContent = faltan + ' juego' + (faltan !== 1 ? 's' : '') + ' para el nivel ' + (nivelActual + 1);
        txtEl.classList.add('violeta');
      }
    }

    // Estrellas originales (3)
    var iconos = ['⭐', '⭐', '🏆'];
    var clases = ['g1', 'g2', 'g3'];
    for (var i = 0; i < 3; i++) {
      var el = document.getElementById('popEst' + i);
      if (!el) continue;
      el.style.display = '';
      if (i < intentosHoy) {
        el.className = 'pop-est ' + clases[i];
        el.textContent = iconos[i];
      } else {
        el.className = 'pop-est vacia';
        el.textContent = '☆';
      }
    }
    // Ocultar estrellas 4 y 5 para otros juegos
    for (var h = 3; h < 5; h++) {
      var elH = document.getElementById('popEst' + h);
      if (elH) elH.style.display = 'none';
    }

    // Barra original
    var pct = Math.round((intentosHoy / intentosReq) * 100);
    var barraEl = document.getElementById('popBarraFill');
    barraEl.style.width = pct + '%';
    barraEl.className = 'popup-barra-fill' + (intentosHoy >= intentosReq ? ' completa' : '');
  }

  // Mapa de niveles — cargar desde API para tener datos frescos
  renderPopupNiveles(juegoId, nivelActual);

  document.getElementById('popupNiveles').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function renderPopupNiveles(juegoId, nivelActual) {
  var gridEl = document.getElementById('popNivelesGrid');
  // nivel máximo dinámico: si el API ya nos lo devolvió lo usamos, si no fallback por juego
  var nivelMax = (STATE.niveles_juegos[juegoId] && STATE.niveles_juegos[juegoId].nivel_maximo)
    || (juegoId === 'coinclik' ? 5 : 10);

  // Placeholder mientras carga
  gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#475569;font-size:.7rem;padding:.5rem;">Cargando niveles...</div>';

  if (!window.CLERK_TOKEN) {
    // Sin token: mostrar grid genérico
    renderNivelesGenericos(gridEl, nivelActual, 3, 0, nivelMax);
    return;
  }

  fetch(BASE_URL + '/api/juegos?action=mapa&juego_id=' + juegoId, {
    headers: { 'Authorization': 'Bearer ' + window.CLERK_TOKEN }
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.mapa || !data.mapa.length) {
        renderNivelesGenericos(gridEl, nivelActual, 3, 0, nivelMax);
        return;
      }
      var html = data.mapa.map(function (n) {
        var iconoEstado = n.estado === 'completado' ? '✅' : n.estado === 'actual' ? '▶' : '🔒';
        var claseEstado = n.estado; // 'completado', 'actual', 'bloqueado'
        var estadoTxt;
        if (n.estado === 'completado') estadoTxt = 'Hecho';
        else if (n.estado === 'actual') {
          if (juegoId === 'coinclik') {
            // CoinClick: 1 partida ganada = 1 nivel, no muestra intentos
            estadoTxt = 'Actual';
          } else {
            var _iHoy = n.intentos_hoy || 0;
            var _iReq = n.intentos_requeridos || 1;
            if (_iHoy >= _iReq) estadoTxt = '✅ Listo';
            else estadoTxt = _iHoy + '/' + _iReq;
          }
        }
        else estadoTxt = 'Bloq.';

        return '<div class="pop-nv ' + claseEstado + '" title="' + (n.nombre || '') + '">' +
          '<div class="pop-nv-icono">' + iconoEstado + '</div>' +
          '<div class="pop-nv-num">Nv.' + n.nivel + '</div>' +
          '<div class="pop-nv-estado">' + estadoTxt + '</div>' +
          '</div>';
      }).join('');
      gridEl.innerHTML = html;
    })
    .catch(function () {
      renderNivelesGenericos(gridEl, nivelActual, 3, 0, nivelMax);
    });
}

function renderNivelesGenericos(gridEl, nivelActual, intentosReq, intentosHoy, nivelMax) {
  nivelMax = nivelMax || 10;
  var html = '';
  for (var n = 1; n <= nivelMax; n++) {
    var estaCompleto = n < nivelActual;
    var esActual = n === nivelActual;
    var icono = estaCompleto ? '✅' : esActual ? '▶' : '🔒';
    var clase = estaCompleto ? 'completado' : esActual ? 'actual' : 'bloqueado';
    var txt = estaCompleto ? 'Hecho' : esActual ? intentosHoy + '/' + intentosReq : 'Bloq.';
    html +=
      '<div class="pop-nv ' + clase + '">' +
      '<div class="pop-nv-icono">' + icono + '</div>' +
      '<div class="pop-nv-num">Nv.' + n + '</div>' +
      '<div class="pop-nv-estado">' + txt + '</div>' +
      '</div>';
  }
  gridEl.innerHTML = html;
}

function cerrarPopupNiveles(event) {
  // Si el click fue en el backdrop (overlay), cerrar
  if (event && event.target !== document.getElementById('popupNiveles')) return;
  document.getElementById('popupNiveles').classList.remove('active');
  document.body.style.overflow = '';
  POPUP_JUEGO = null;
}

// ============================================================
// TOP DE HOY
// ============================================================
function renderTopHoy() {
  var grid = document.getElementById('topHoyGrid');
  if (!grid) return;

  var lista = STATE.juegos.length ? STATE.juegos : JUEGOS_FALLBACK;
  var top3 = lista.slice(0, 3);
  var posClases = ['gold', 'silver', 'bronze'];
  var posTxt = ['🥇', '🥈', '🥉'];

  grid.innerHTML = top3.map(function (j) {
    var top = (STATE.topHoy && STATE.topHoy[j.juego_id]) || [];

    if (!top.length) {
      return '<div class="top-card">' +
        '<div class="top-juego-nombre">' + j.emoji + ' ' + j.nombre + '</div>' +
        '<p style="color:var(--text-dim);font-size:.8rem;text-align:center;padding:.5rem 0;">Sé el primero hoy 🏆</p>' +
        '</div>';
    }

    var entries = top.slice(0, 3).map(function (e, i) {
      return '<div class="top-entry">' +
        '<span class="top-pos ' + posClases[i] + '">' + posTxt[i] + '</span>' +
        '<span class="top-avatar">' + avatarEmoji(e.avatar) + '</span>' +
        '<span class="top-nombre">' + e.nombre + '</span>' +
        '<span class="top-score">' + e.pts.toLocaleString('es-CL') + '</span>' +
        '</div>';
    }).join('');

    return '<div class="top-card">' +
      '<div class="top-juego-nombre">' + j.emoji + ' ' + j.nombre + '</div>' +
      entries +
      '</div>';
  }).join('');
}

// ============================================================
// ENERGÍA
// ============================================================
function actualizarEnergia() {
  var pct = Math.round((STATE.energia / 100) * 100);
  var txt = STATE.energia + '/100';
  var el1 = document.getElementById('energiaDisp');
  var el2 = document.getElementById('energiaMiniBar');
  var el3 = document.getElementById('qsEnergia');
  if (el1) el1.textContent = txt;
  if (el2) el2.style.width = pct + '%';
  if (el3) el3.textContent = txt;
}

// ============================================================
// TIMER BONUS
// ============================================================
function iniciarTimerBonus() {
  function tick() {
    var ahora = new Date();
    var fin = new Date(); fin.setHours(24, 0, 0, 0);
    var diff = fin - ahora;
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    var el = document.getElementById('bonusTimer');
    if (el) el.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
  }
  tick();
  setInterval(tick, 1000);
}
function pad(n) { return String(n).padStart(2, '0'); }

// ============================================================
// BARRA XP
// ============================================================
function actualizarBarraXP() {
  var pct = Math.min(100, Math.round((STATE.xp_actual / STATE.xp_siguiente) * 100));
  var elBarra = document.getElementById('xpBarFill');
  var elTexto = document.getElementById('xpTexto');
  var elNivel = document.getElementById('nivelActual');
  if (elBarra) elBarra.style.width = pct + '%';
  if (elTexto) elTexto.textContent = STATE.xp_actual.toLocaleString('es-CL') + ' / ' + STATE.xp_siguiente.toLocaleString('es-CL') + ' XP';
  if (elNivel) elNivel.textContent = 'Nivel ' + STATE.nivel_actual;
}

// ============================================================
// HELPER — buscar juego en el catálogo
// ============================================================
function buscarJuego(juegoId) {
  var lista = STATE.juegos.length ? STATE.juegos : JUEGOS_FALLBACK;
  return lista.find(function (j) { return j.juego_id === juegoId; }) || null;
}

// ============================================================
// CALLBACK desde juegos individuales al volver al lobby
// ============================================================
function mostrarRecompensaJuego(data) {
  if (!data) return;
  if (data.monedas_ganadas) {
    var hc = document.getElementById('headerCoins');
    if (hc && typeof animarContador === 'function') {
      var actual = parseInt(hc.textContent.replace(/\D/g, '')) || 0;
      animarContador('headerCoins', actual + Number(data.monedas_ganadas), 600);
    }
    if (typeof toast === 'function') {
      toast('+' + data.monedas_ganadas + ' EduCoins y +' + (data.xp_ganado || 0) + ' XP 🎉', 'coins');
    }
  }
  // Subida de nivel del juego
  if (data.subi_nivel_juego && data.nivel_juego) {
    setTimeout(function () {
      if (typeof toast === 'function') {
        toast('🎮 ¡Subiste al nivel ' + data.nivel_juego + ' en ' + data.juego_id + '! 🏆', 'success');
      }
      // Actualizar el indicador en la card sin recargar
      if (STATE.niveles_juegos[data.juego_id]) {
        STATE.niveles_juegos[data.juego_id].nivel_actual = data.nivel_juego;
        STATE.niveles_juegos[data.juego_id].intentos_hoy = data.intentos_hoy;
        renderJuegos();
      }
    }, 600);
  }
  // Subida de nivel de EduCoins
  if (data.subio_nivel && data.nuevo_nivel) {
    setTimeout(function () {
      if (typeof toast === 'function') {
        toast('⬆️ ¡SUBISTE AL NIVEL ' + data.nuevo_nivel + '! ¡Felicitaciones!', 'level');
      }
    }, 1200);
  }
  if (data.misiones_completadas && data.misiones_completadas.length) {
    data.misiones_completadas.forEach(function (m) {
      setTimeout(function () {
        if (typeof toast === 'function') {
          toast('🎯 Misión: ' + m.descripcion + ' +' + m.monedas + ' 🪙', 'success');
        }
      }, 400);
    });
  }
}

// ============================================================
// FALLBACK — catálogo hardcodeado por si la API tarda o falla
// Los campos coinciden con la estructura de juegos_catalogo en BD
// ============================================================
var JUEGOS_FALLBACK = [
  { juego_id: 'coinclik', nombre: 'COINCLIK', emoji: '💰', descripcion: 'Acumula EduCoins haciendo click.', url: 'juegos/coinclik/coinclik.html', color: '#3b82f6', rgb: '59,130,246', bg: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)', recompensa: 'hasta +300', energia: 10, dificultad: 2, badge: '🔥 POPULAR', tiene_niveles: true },
  { juego_id: 'TablaBlast', nombre: 'TABLA BLAST', emoji: '🔢', descripcion: 'Destruye bloques de la tabla de multiplicar.', url: 'juegos/tablablast/tablablast.html', color: '#f59e0b', rgb: '245,158,11', bg: 'linear-gradient(135deg,#7c2d12,#9a3412)', recompensa: 'hasta +300', energia: 10, dificultad: 2, badge: '🔥 POPULAR', tiene_niveles: true },
  { juego_id: 'HorseRace', nombre: 'CARRERA DE CABALLOS', emoji: '🏇', descripcion: 'Corre con los caballos de la tabla.', url: 'juegos/horserace/horserace.html', color: '#f59e0b', rgb: '245,158,11', bg: 'linear-gradient(135deg,#7c2d12,#9a3412)', recompensa: 'hasta +300', energia: 10, dificultad: 2, badge: '🔥 POPULAR', tiene_niveles: true },
  { juego_id: 'memory_historico', nombre: 'MEMORIA HISTORIA', emoji: '🃏', descripcion: 'Empareja tarjetas y gana por tiempo.', url: 'juegos/memory_historico/memory_historico.html', color: '#ef4444', rgb: '239,68,68', bg: 'linear-gradient(135deg,#7c2d12,#9a3412)', recompensa: 'hasta +200', energia: 10, dificultad: 1, badge: null, tiene_niveles: false },
  { juego_id: 'memoria', nombre: 'MEMORIA', emoji: '🃏', descripcion: 'Empareja tarjetas y gana por tiempo.', url: 'juegos/memoria/memoria.html', color: '#ef4444', rgb: '239,68,68', bg: 'linear-gradient(135deg,#7c2d12,#9a3412)', recompensa: 'hasta +200', energia: 10, dificultad: 1, badge: null, tiene_niveles: false },
  { juego_id: 'trivia', nombre: 'TRIVIA', emoji: '❓', descripcion: 'Responde preguntas de todas las asignaturas.', url: 'juegos/trivia/trivia.html', color: '#22c55e', rgb: '34,197,94', bg: 'linear-gradient(135deg,#14532d,#166534)', recompensa: 'hasta +250', energia: 10, dificultad: 2, badge: '⭐ RECOMENDADO', tiene_niveles: false },
  { juego_id: 'sinonimos', nombre: 'SINÓNIMOS', emoji: '🔤', descripcion: 'Encuentra el sinónimo correcto.', url: 'juegos/sinonimos/sinonimos.html', color: '#a855f7', rgb: '168,85,247', bg: 'linear-gradient(135deg,#581c87,#7e22ce)', recompensa: 'hasta +180', energia: 10, dificultad: 2, badge: null, tiene_niveles: false },
  { juego_id: 'Cuestionario', nombre: 'CUESTIONARIO', emoji: '📝', descripcion: 'Responde preguntas de todas las asignaturas.', url: 'juegos/cuestionario/cuestionario.html', color: '#8b5cf6', rgb: '139,92,246', bg: 'linear-gradient(135deg,#581c87,#7e22ce)', recompensa: 'hasta +300', energia: 10, dificultad: 3, badge: '💎 MAYOR PREMIO', tiene_niveles: false },
  { juego_id: 'mapaquiz', nombre: 'MAPA QUIZ', emoji: '🗺️', descripcion: 'Encuentra países y ciudades en el mapa.', url: 'juegos/mapaquiz/mapaquiz.html', color: '#f59e0b', rgb: '245,158,11', bg: 'linear-gradient(135deg,#7c2d12,#9a3412)', recompensa: 'hasta +180', energia: 10, dificultad: 2, badge: null, tiene_niveles: false },
  { juego_id: 'problemas', nombre: 'PROBLEMAS', emoji: '🧮', descripcion: 'Resuelve problemas matemáticos de texto.', url: 'juegos/problemas/problemas.html', color: '#f97316', rgb: '249,115,22', bg: 'linear-gradient(135deg,#431407,#78350f)', recompensa: 'hasta +350', energia: 10, dificultad: 3, badge: '💎 MAYOR PREMIO', tiene_niveles: false },
];