// ============================================
// ARCHIVO: /misiones/misiones.js
// Lógica completa: diarias + semanales
// ============================================

// ── Colores rotativos para cards ──────────────────────────────
var COLORES = ['#7c3aed', '#facc15', '#22c55e', '#06b6d4', '#f97316', '#ef4444', '#a855f7', '#ec4899'];
var RGBS = ['124,58,237', '250,204,21', '34,197,94', '6,182,212', '249,115,22', '239,68,68', '168,85,247', '236,72,153'];

// ── Imagen de moneda ──────────────────────────────────────────
var COIN_IMG = '<img src="../shared/coin.png" alt="🪙" style="height:1em;width:1em;object-fit:contain;vertical-align:middle;image-rendering:pixelated;">';

// ── Estado ───────────────────────────────────────────────────
var STATE = {
  diarias: [],
  semanales: [],
  bonusEntregado: false,
  panelActual: 'diaria',
  timerInterval: null,
  evento: null,
};

// ── Panel activo ──────────────────────────────────────────────
function cambiarPanel(panel) {
  STATE.panelActual = panel;
  var slider = document.getElementById('misionesSlider');
  var tabDiaria = document.getElementById('tabDiaria');
  var tabSem = document.getElementById('tabSemanal');
  var progresoBlock = document.getElementById('progresoBlock');

  if (panel === 'semanal') {
    slider.classList.add('ver-semanales');
    tabDiaria.classList.remove('tab-activa-diaria');
    tabSem.classList.add('tab-activa-semanal');
    // Ocultar el anillo diario cuando estás en semanales (opcional, comentar si no gusta)
    // progresoBlock.style.display = 'none';
    actualizarTimerSemanal();
  } else {
    slider.classList.remove('ver-semanales');
    tabSem.classList.remove('tab-activa-semanal');
    tabDiaria.classList.add('tab-activa-diaria');
    // progresoBlock.style.display = '';
    actualizarTimerDiario();
  }
}

// ── Inicialización ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  initShared('misiones');
  renderDiarias();
  renderSemanales();
  actualizarProgresoDiario();
  actualizarTimerDiario();
  iniciarTimer();
  renderHistorial();
});

// ── Clerk: cargar datos reales ────────────────────────────────
document.addEventListener('clerkReady', function () {
  cargarMisiones();
});

function cargarMisiones() {
  fetch(BASE_URL + '/api/misiones', {
    credentials: 'include',
    headers: {
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {})
    }
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;

      // ── Diarias ──
      if (data.misiones) {
        STATE.diarias = data.misiones.map(function (m, i) {
          return {
            id: m.id,
            tipo: m.tipo_mision || m.tipo || '',
            descripcion: m.descripcion,
            icono: m.icono || '📋',
            monedas: Number(m.recompensa_monedas) || 50,
            xp: Number(m.recompensa_xp) || 25,
            completada: !!m.completada,
            progreso: Number(m.progreso) || 0,
            meta: Number(m.meta_cantidad) || 1,
            condicion: m.condicion_tipo || 'auto',
            trigger: m.accion_trigger || 'manual',
            url_destino: m.url_destino || m.banco_url_destino || null,
            color: COLORES[i % COLORES.length],
            rgb: RGBS[i % RGBS.length],
          };
        });
      }

      // ── Semanales ──
      if (data.semanales) {
        STATE.semanales = data.semanales.map(function (m, i) {
          return {
            id: m.id,
            tipo: m.tipo_mision || m.tipo || '',
            descripcion: m.descripcion,
            icono: m.icono || '📅',
            monedas: Number(m.recompensa_monedas) || 300,
            xp: Number(m.recompensa_xp) || 150,
            completada: !!m.completada,
            progreso: Number(m.progreso) || 0,
            meta: Number(m.meta_cantidad) || 5,
            trigger: m.accion_trigger || 'manual',
            url_destino: m.url_destino || m.banco_url_destino || null,
            color: COLORES[i % COLORES.length],
            rgb: RGBS[i % RGBS.length],
          };
        });
      }

      // ── Evento activo ──
      if (data.evento_activo && data.evento_multiplicador > 1) {
        STATE.evento = {
          multiplicador: data.evento_multiplicador,
          nombre: data.evento_nombre || 'Evento especial',
        };
        mostrarEventoBanner();
      }

      // Ordenar: pendientes primero, completadas al final
      STATE.diarias.sort(function (a, b) {
        if (a.completada === b.completada) return 0;
        return a.completada ? 1 : -1;
      });
      STATE.semanales.sort(function (a, b) {
        if (a.completada === b.completada) return 0;
        return a.completada ? 1 : -1;
      });

      renderDiarias();
      renderSemanales();
      actualizarProgresoDiario();
      actualizarBadges();
      renderHistorialDesdeAPI(data.historial || []);
      var pendientes = STATE.diarias.filter(function (m) { return !m.completada; }).length;
      var total = STATE.diarias.length;
      setTimeout(function () {
        if (total === 0) return; // No mostrar nada si no hay misiones
        if (pendientes > 0) {
          toast('🎯 Tienes ' + pendientes + ' misión' + (pendientes !== 1 ? 'es' : '') + ' pendiente hoy', 'info');
        } else {
          toast('🏆 ¡Completaste todas las misiones de hoy!', 'success');
        }
      }, 400);
    })
    .catch(function () { });
}

// ── Evento banner ─────────────────────────────────────────────
function mostrarEventoBanner() {
  var banner = document.getElementById('eventoBanner');
  var texto = document.getElementById('eventoTexto');
  if (!banner || !STATE.evento) return;
  banner.style.display = 'flex';
  texto.textContent = '⚡ ' + STATE.evento.nombre + ' activo — recompensas ×' + STATE.evento.multiplicador;
}

// ═══════════════════════════════════════════════════════════════
// RENDER DIARIAS
// ═══════════════════════════════════════════════════════════════
function renderDiarias() {
  var grid = document.getElementById('misionesGrid');
  var completadas = STATE.diarias.filter(function (m) { return m.completada; }).length;

  document.getElementById('misionChip').textContent =
    completadas + ' completada' + (completadas !== 1 ? 's' : '');

  if (STATE.diarias.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">' +
      '<div class="empty-icon">🎯</div><p>Cargando misiones...</p></div>';
    return;
  }

  grid.innerHTML = STATE.diarias.map(function (m, idx) {
    return construirCardDiaria(m, idx);
  }).join('');

  // Eventos click — cards pendientes: acción completa
  grid.querySelectorAll('.mision-card:not(.completada)').forEach(function (card) {
    card.addEventListener('click', function () {
      accionMision(this.dataset.id, 'diaria');
    });
  });

  // Cards ya completadas con url_destino: solo navegan
  grid.querySelectorAll('.mision-card.completada').forEach(function (card) {
    var id = card.dataset.id;
    var mision = STATE.diarias.find(function (m) { return m.id === id; });
    if (mision && mision.url_destino) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', function () {
        window.location.href = mision.url_destino;
      });
    }
  });

  animarEntrada('.mision-card');
}

function construirCardDiaria(m, idx) {
  var clases = 'mision-card' + (m.completada ? ' completada' : '');
  var progresoPct = m.meta > 1 ? Math.min(100, Math.round((m.progreso / m.meta) * 100)) : 0;

  // Barra de progreso para misiones de tipo 'repetir'
  var barraHtml = '';
  if (m.condicion === 'repetir' && m.meta > 1 && !m.completada) {
    barraHtml = '<div class="card-progreso">' +
      '<div class="card-prog-label">' +
      '<span>Progreso</span>' +
      '<span>' + m.progreso + ' / ' + m.meta + '</span>' +
      '</div>' +
      '<div class="card-prog-track">' +
      '<div class="card-prog-fill" style="width:' + progresoPct + '%"></div>' +
      '</div>' +
      '</div>';
  }

  var estadoTxt = m.completada
    ? '✅ Completada'
    : (m.url_destino ? '→ Ir a completarla' : '⏳ Click para marcar');

  return '<div class="' + clases + '" data-id="' + m.id + '"' +
    ' style="--m-color:' + m.color + ';--m-rgb:' + m.rgb + '">' +
    '<div class="mision-emoji-wrap">' + m.icono + '</div>' +
    '<div class="mision-body">' +
    '<div class="mision-nombre">' + m.descripcion + '</div>' +
    '<div class="mision-tipo">' + estadoTxt + '</div>' +
    barraHtml +
    '</div>' +
    '<div class="mision-reward">' +
    '<span class="reward-coins">+' + m.monedas + ' ' + COIN_IMG + '</span>' +
    '<span class="reward-xp">+' + m.xp + ' XP</span>' +
    '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════════════════════
// RENDER SEMANALES
// ═══════════════════════════════════════════════════════════════
function renderSemanales() {
  var lista = document.getElementById('semanalesList');

  if (STATE.semanales.length === 0) {
    lista.innerHTML = '<div class="empty-state">' +
      '<div class="empty-icon">📅</div>' +
      '<p>Cargando misiones semanales...</p>' +
      '</div>';
    return;
  }

  lista.innerHTML = STATE.semanales.map(function (m) {
    return construirCardSemanal(m);
  }).join('');

  lista.querySelectorAll('.sem-card:not(.completada)').forEach(function (card) {
    card.addEventListener('click', function () {
      accionMision(this.dataset.id, 'semanal');
    });
  });

  // Semanales completadas con url_destino: solo navegan
  lista.querySelectorAll('.sem-card.completada').forEach(function (card) {
    var id = card.dataset.id;
    var mision = STATE.semanales.find(function (m) { return m.id === id; });
    if (mision && mision.url_destino) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', function () {
        window.location.href = mision.url_destino;
      });
    }
  });
}

function construirCardSemanal(m) {
  var pct = Math.min(100, Math.round((m.progreso / m.meta) * 100));
  var clases = 'sem-card' + (m.completada ? ' completada' : '');

  var progTxt = m.completada
    ? '✅ Completada — ' + m.meta + ' / ' + m.meta
    : m.progreso + ' de ' + m.meta + ' completados';

  return '<div class="' + clases + '" data-id="' + m.id + '" style="cursor:' + (m.url_destino && !m.completada ? 'pointer' : 'default') + '">' +
    '<div class="sem-header">' +
    '<div class="sem-icono">' + m.icono + '</div>' +
    '<div class="sem-info">' +
    '<div class="sem-desc">' + m.descripcion + '</div>' +
    '<div class="sem-rewards">' +
    '<span class="sem-pill sem-pill-coins">+' + m.monedas + ' 🪙</span>' +
    '<span class="sem-pill sem-pill-xp">+' + m.xp + ' XP</span>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="sem-prog-bar">' +
    '<div class="sem-prog-fill" style="width:' + pct + '%"></div>' +
    '</div>' +
    '<div class="sem-prog-txt">' +
    '<span>' + progTxt + '</span>' +
    '<span>' + pct + '%</span>' +
    '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════════════════════
// ACCIÓN AL HACER CLICK EN UNA MISIÓN
// ═══════════════════════════════════════════════════════════════
function accionMision(id, tipo) {
  var lista = tipo === 'semanal' ? STATE.semanales : STATE.diarias;
  var mision = lista.find(function (m) { return m.id === id; });
  if (!mision || mision.completada) return;

  // Misiones que solo se completan jugando — solo navegar, nunca marcar desde aquí
  var soloJuego = mision.trigger === 'juego_especifico' || mision.trigger === 'juego_completado';
  if (soloJuego) {
    if (mision.url_destino) {
      toast('🎮 ¡Ve a jugar para completar esta misión!', 'info');
      setTimeout(function () { window.location.href = mision.url_destino; }, 700);
    } else {
      toast('🎮 ¡Juega para completar esta misión!', 'info');
    }
    return;
  }

  // Si tiene url_destino → completar vía API Y luego navegar
  if (mision.url_destino) {
    if (!window.CLERK_TOKEN) {
      window.location.href = mision.url_destino;
      return;
    }
    var cardNav = document.querySelector('[data-id="' + id + '"]');
    if (cardNav) { cardNav.classList.add('completando'); cardNav.style.pointerEvents = 'none'; }

    fetch(BASE_URL + '/api/misiones', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}),
      },
      body: JSON.stringify({ action: 'completar', mision_id: id }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok || data.recompensa) {
          var recompensa = data.recompensa || mision.monedas;
          toast('✅ ' + mision.descripcion + ' +' + recompensa + ' 🪙', 'success');
        }
      })
      .catch(function () { })
      .finally(function () {
        // Siempre navegar, haya completado o no
        setTimeout(function () { window.location.href = mision.url_destino; }, 600);
      });
    return;
  }

  // Sin url → completar directamente vía API
  if (!window.CLERK_TOKEN) {
    toast('⚠️ Debes iniciar sesión', 'warning');
    return;
  }

  var card = document.querySelector('[data-id="' + id + '"]');
  if (card) { card.classList.add('completando'); card.style.pointerEvents = 'none'; }

  fetch(BASE_URL + '/api/misiones', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}),
    },
    body: JSON.stringify({ action: 'completar', mision_id: id }),
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) {
        if (card) { card.classList.remove('completando'); card.style.pointerEvents = ''; }
        toast('⚠️ ' + (data.mensaje || 'Error'), 'warning');
        return;
      }

      mision.completada = true;
      var recompensa = data.recompensa || mision.monedas;
      var xpGanado = data.xp_ganado || mision.xp;

      setTimeout(function () {
        if (tipo === 'semanal') {
          renderSemanales();
          actualizarBadges();
        } else {
          renderDiarias();
          actualizarProgresoDiario();
          actualizarBadges();
        }

        // Animar monedas en header
        var hc = document.getElementById('headerCoins');
        if (hc) {
          var actual = parseInt(hc.textContent.replace(/\D/g, '')) || 0;
          animarContador('headerCoins', actual + recompensa, 600);
        }

        toast('+' + recompensa + ' EduCoins y +' + xpGanado + ' XP 🎉', 'coins');

        if (data.subio_nivel) {
          setTimeout(function () {
            toast('⬆️ ¡SUBISTE AL NIVEL ' + data.nuevo_nivel + '!', 'level');
            lanzarConfeti();
          }, 800);
        }

        if (data.bonus) {
          STATE.bonusEntregado = true;
          var bonusEl = document.getElementById('bonusEstado');
          if (bonusEl) {
            bonusEl.className = 'bonus-lat-estado desbloqueado';
            bonusEl.innerHTML = '<span class="bonus-check">🏆</span><span>¡Desbloqueado!</span>';
          }
          toast('🏆 ¡BONUS DESBLOQUEADO! +' + (data.bonus.monedas || 200) + ' EduCoins extra', 'success');
          lanzarConfeti();
        }
      }, 300);
    })
    .catch(function () {
      if (card) { card.classList.remove('completando'); card.style.pointerEvents = ''; }
      toast('❌ Error de conexión', 'error');
    });
}

// ═══════════════════════════════════════════════════════════════
// PROGRESO DIARIO (anillo + barra)
// ═══════════════════════════════════════════════════════════════
function actualizarProgresoDiario() {
  var completadas = STATE.diarias.filter(function (m) { return m.completada; }).length;
  var total = STATE.diarias.length || 8;
  var pct = completadas / total;
  var circum = 327;

  setTimeout(function () {
    var ring = document.getElementById('ringProg');
    var barra = document.getElementById('barraFill');
    var strokeColor = pct >= 1 ? 'var(--green)' : pct >= 0.5 ? 'var(--cyan)' : 'var(--violet)';
    if (ring) { ring.style.strokeDashoffset = circum - (pct * circum); ring.style.stroke = strokeColor; }
    if (barra) barra.style.width = (pct * 100) + '%';
    var ringMov = document.getElementById('ringProgMov');
    var barraMov = document.getElementById('barraFillMov');
    if (ringMov) { ringMov.style.strokeDashoffset = circum - (pct * circum); ringMov.style.stroke = strokeColor; }
    if (barraMov) barraMov.style.width = (pct * 100) + '%';
  }, 200);

  var ringNum = document.getElementById('ringNum');
  var pctEl = document.getElementById('porcentajeProg');
  var titulo = document.getElementById('progresoTitulo');
  var sub = document.getElementById('progresoSub');

  if (ringNum) ringNum.textContent = completadas + '/' + total;
  if (pctEl) pctEl.textContent = Math.round(pct * 100) + '%';
  var ringNumMov = document.getElementById('ringNumMov');
  var pctMov = document.getElementById('porcentajeProgMov');
  if (ringNumMov) ringNumMov.textContent = completadas + '/' + total;
  if (pctMov) pctMov.textContent = Math.round(pct * 100) + '%';

  var titulos = ['¡Empieza el día!', '¡Vas bien!', '¡Buen ritmo!', '¡Ya casi a la mitad!',
    '¡Más de la mitad!', '¡Excelente ritmo!', '¡Ya casi!', '¡Una más!', '🏆 ¡Completo!'];
  if (titulo) titulo.textContent = titulos[Math.min(completadas, 8)];
  var tituloMov = document.getElementById('progresoTituloMov');
  if (tituloMov) tituloMov.textContent = titulos[Math.min(completadas, 8)];

  var pendientes = total - completadas;
  if (sub) sub.textContent = pendientes > 0
    ? 'Te faltan ' + pendientes + ' misión' + (pendientes !== 1 ? 'es' : '') + ' para el bonus'
    : '¡Completaste todas las misiones del día!';

  // Recompensas acumuladas
  var completadasArr = STATE.diarias.filter(function (m) { return m.completada; });
  var totalMonedas = completadasArr.reduce(function (a, m) { return a + m.monedas; }, 0);
  var totalXP = completadasArr.reduce(function (a, m) { return a + m.xp; }, 0);
  animarContador('monedasGanadas', totalMonedas, 600);
  animarContador('xpGanado', totalXP, 600);
  animarContador('monedasGanadasMov', totalMonedas, 600);
  animarContador('xpGanadoMov', totalXP, 600);

  // Bonus
  actualizarBonus(completadas, total);
}

function actualizarBonus(completadas, total) {
  var estado = document.getElementById('bonusEstado');
  var pendientes = total - completadas;
  if (!estado) return;

  var bonusMov = document.getElementById('bonusTextoMov');
  if (completadas < total) {
    estado.className = 'bonus-lat-estado';
    estado.innerHTML = '<span class="bonus-lock">🔒</span>' +
      '<span>Falta' + (pendientes !== 1 ? 'n' : '') + ' ' + pendientes +
      ' misión' + (pendientes !== 1 ? 'es' : '') + '</span>';
    if (bonusMov) bonusMov.textContent = '+200 · Faltan ' + pendientes;
    return;
  }
  if (STATE.bonusEntregado) return;
  STATE.bonusEntregado = true;
  estado.className = 'bonus-lat-estado desbloqueado';
  estado.innerHTML = '<span class="bonus-check">🏆</span><span>¡Desbloqueado! +200 🪙 +100 XP</span>';
  if (bonusMov) bonusMov.textContent = '¡Desbloqueado!';
  setTimeout(function () {
    toast('🏆 ¡BONUS DESBLOQUEADO! +200 EduCoins y +100 XP extra', 'success');
    lanzarConfeti();
  }, 400);
}

// ── Badges en las pestañas ─────────────────────────────────────
function actualizarBadges() {
  var pendDiarias = STATE.diarias.filter(function (m) { return !m.completada; }).length;
  var pendSem = STATE.semanales.filter(function (m) { return !m.completada; }).length;

  var bdDiaria = document.getElementById('badgeDiaria');
  var bdSem = document.getElementById('badgeSemanal');

  if (bdDiaria) {
    bdDiaria.textContent = pendDiarias > 0 ? pendDiarias : '✓';
    bdDiaria.className = pendDiarias > 0 ? 'tab-badge-count' : 'tab-badge-ok';
  }
  if (bdSem) {
    bdSem.textContent = pendSem > 0 ? pendSem : '✓';
    bdSem.className = pendSem > 0 ? 'tab-badge-count' : 'tab-badge-ok';
  }

  // Badge sidebar
  var badgeSidebar = document.getElementById('badgeMisiones');
  if (badgeSidebar) badgeSidebar.textContent = pendDiarias > 0 ? pendDiarias : '✓';
}

// ═══════════════════════════════════════════════════════════════
// TIMER
// ═══════════════════════════════════════════════════════════════
function iniciarTimer() {
  function tick() {
    var ahora = new Date();
    var el = document.getElementById('timerReinicio');
    if (!el) return;

    if (STATE.panelActual === 'semanal') {
      // Semanal: cuenta hasta el próximo domingo a las 20:00
      var diaSem = ahora.getDay(); // 0=dom, 1=lun … 6=sab
      var diasHastaDomingo = diaSem === 0 ? 7 : (7 - diaSem);
      var proximoDomingo = new Date(ahora);
      proximoDomingo.setDate(ahora.getDate() + diasHastaDomingo);
      proximoDomingo.setHours(20, 0, 0, 0);
      // Si hoy es domingo y aún no son las 20:00, el reset es hoy
      if (diaSem === 0 && ahora < proximoDomingo) {
        proximoDomingo.setDate(ahora.getDate());
      }
      var diff = proximoDomingo - ahora;
      var dd = Math.floor(diff / 86400000);
      var hh = Math.floor((diff % 86400000) / 3600000);
      var mm = Math.floor((diff % 3600000) / 60000);
      var ss = Math.floor((diff % 60000) / 1000);
      el.textContent = dd > 0
        ? dd + 'd ' + pad(hh) + ':' + pad(mm) + ':' + pad(ss)
        : pad(hh) + ':' + pad(mm) + ':' + pad(ss);
      el.style.color = dd === 0 && hh < 2 ? 'var(--red)' : 'var(--cyan)';
    } else {
      // Diario: cuenta hasta las 20:00 de hoy (o mañana si ya pasó)
      var reset = new Date(ahora);
      reset.setHours(20, 0, 0, 0);
      if (ahora >= reset) reset.setDate(reset.getDate() + 1);
      var diff = reset - ahora;
      var h = Math.floor(diff / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      el.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
      el.style.color = h < 2 ? 'var(--red)' : 'var(--cyan)';
    }
    var mob = document.getElementById('timerReinicioMov');
    if (mob) { mob.textContent = el.textContent; mob.style.color = el.style.color; }
  }
  tick();
  if (STATE.timerInterval) clearInterval(STATE.timerInterval);
  STATE.timerInterval = setInterval(tick, 1000);
}

function actualizarTimerDiario() {
  var label = document.getElementById('timerLabel');
  var sub = document.getElementById('timerSub');
  if (label) label.textContent = 'REINICIO EN';
  if (sub) sub.textContent = 'Las misiones se renuevan cada día';
}

function actualizarTimerSemanal() {
  var label = document.getElementById('timerLabel');
  var sub = document.getElementById('timerSub');
  if (label) label.textContent = 'SEMANA TERMINA EN';
  if (sub) sub.textContent = 'Las misiones se renuevan cada lunes a las 20:00';
  // El countdown lo maneja iniciarTimer() según STATE.panelActual
  if (STATE.timerInterval) clearInterval(STATE.timerInterval);
  iniciarTimer();
}

// ── Fecha formateada ──────────────────────────────────────────
var DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fechaHoy() {
  var d = new Date();
  return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()];
}

function semanaActual() {
  var hoy = new Date();
  var diaSem = hoy.getDay() || 7;
  var lunes = new Date(hoy); lunes.setDate(hoy.getDate() - (diaSem - 1));
  var domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
  return lunes.getDate() + ' de ' + MESES[lunes.getMonth()] +
    ' al ' + domingo.getDate() + ' de ' + MESES[domingo.getMonth()];
}

// ── Historial ─────────────────────────────────────────────────
function renderHistorial() {
  var lista = document.getElementById('historialLista');
  if (!lista) return;
  lista.innerHTML = '<div class="empty-state"><p style="color:var(--text-muted);font-size:.8rem;font-weight:700;">El historial aparecerá aquí cuando completes misiones.</p></div>';
}

function renderHistorialDesdeAPI(historial) {
  var lista = document.getElementById('historialLista');
  if (!lista) return;

  // Usar misiones completadas del estado si no viene historial separado
  var items = historial.length > 0 ? historial : STATE.diarias.filter(function (m) { return m.completada; });

  if (items.length === 0) {
    lista.innerHTML = '<div class="empty-state"><p style="color:var(--text-muted);font-size:.8rem;font-weight:700;">El historial aparecerá aquí cuando completes misiones.</p></div>';
    return;
  }

  lista.innerHTML = items.map(function (m) {
    var fecha = m.completada_at ? new Date(m.completada_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : 'Hoy';
    var monedas = m.monedas || m.recompensa_monedas || 0;
    var xp = m.xp || m.recompensa_xp || 0;
    return '<div class="historial-item">' +
      '<span class="historial-icono">' + (m.icono || '✅') + '</span>' +
      '<div class="historial-body">' +
      '<div class="historial-desc">' + m.descripcion + '</div>' +
      '<div class="historial-meta">' + fecha + '</div>' +
      '</div>' +
      '<div class="historial-reward">' +
      '<span style="color:var(--yellow);font-weight:800;">+' + monedas + ' 🪙</span>' +
      '<span style="color:var(--cyan);font-size:.7rem;">+' + xp + ' XP</span>' +
      '</div>' +
      '</div>';
  }).join('');
}

// ── Animación stagger ─────────────────────────────────────────
function animarEntrada(selector) {
  document.querySelectorAll(selector).forEach(function (card, i) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(14px)';
    setTimeout(function () {
      card.style.transition = 'opacity .3s ease, transform .3s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, i * 55);
  });
}

// ── Confeti ───────────────────────────────────────────────────
function lanzarConfeti() {
  var colores = ['#7c3aed', '#06b6d4', '#facc15', '#22c55e', '#f97316', '#ec4899'];
  for (var i = 0; i < 35; i++) {
    var p = document.createElement('div');
    p.style.cssText =
      'position:fixed;top:-10px;width:8px;height:8px;border-radius:50%;pointer-events:none;z-index:9998;' +
      'background:' + colores[i % colores.length] + ';' +
      'left:' + Math.random() * 100 + 'vw;' +
      'animation:confetiFall ' + (1.5 + Math.random()) + 's ease-in forwards;' +
      'animation-delay:' + Math.random() * .5 + 's;';
    document.body.appendChild(p);
    setTimeout(function (el) { el.remove(); }, 3000, p);
  }
  if (!document.getElementById('confeti-style')) {
    var style = document.createElement('style');
    style.id = 'confeti-style';
    style.textContent = '@keyframes confetiFall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}';
    document.head.appendChild(style);
  }
}

// ── Helpers ───────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }

// ── Inicializar fechas cuando el DOM está listo ───────────────
document.addEventListener('DOMContentLoaded', function () {
  var elFechaDiaria = document.getElementById('fechaDiaria');
  var elFechaSemanal = document.getElementById('fechaSemanal');
  if (elFechaDiaria) elFechaDiaria.textContent = fechaHoy() + ' · Se renuevan a las 00:00';
  if (elFechaSemanal) elFechaSemanal.textContent = 'Semana del ' + semanaActual();
});