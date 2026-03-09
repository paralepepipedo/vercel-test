// ============================================
// ARCHIVO: /dashboard/dashboard.js
// ============================================
// ÍNDICE
// 1.  Datos MOCK
// 2.  Inicialización
// 3.  Saludo y fecha
// 4.  Stats cards
// 5.  Barras de progreso
// 6.  Misiones
// 7.  Completar misión
// 8.  Ring de misiones
// 9.  Badges
// 10. Contador animado
// 11. Sidebar móvil (delegado a shared.js)
// 12. Toasts (delegado a shared.js)
// ============================================

// ============================================
// 1. DATOS MOCK
// TODO: reemplazar con fetch('/api/perfil')
// ============================================
const MOCK_PERFIL = {
  nombre: 'Alumno',
  avatar_base: '🐰',
  nivel: 1,
  xp: 0,
  xp_siguiente: 1000,
  monedas: 100,
  energia_actual: 100,
  energia_max: 100,
  racha_dias: 0,
  grado_actual: 1,
  sub_rango: 'Bronce',
  categoria_rango: 'Explorador',
};

const MOCK_MISIONES = [
  { id: 'm1', tipo: 'jugar_juegos', descripcion: 'Jugar 3 juegos educativos', icono: '🎮', recompensa_monedas: 80, completada: false, color: '#7c3aed' },
  { id: 'm2', tipo: 'trivia', descripcion: 'Completar una trivia de Historia', icono: '🏛️', recompensa_monedas: 60, completada: false, color: '#facc15' },
  { id: 'm3', tipo: 'subir_tarea', descripcion: 'Subir tarea de Matemáticas', icono: '📝', recompensa_monedas: 100, completada: false, color: '#22c55e' },
  { id: 'm4', tipo: 'tabla_multiplicar', descripcion: 'Practicar tabla ×7 en ayudas', icono: '✖️', recompensa_monedas: 50, completada: false, color: '#06b6d4' },
  { id: 'm5', tipo: 'problema_texto', descripcion: 'Resolver 3 problemas de texto', icono: '🔢', recompensa_monedas: 90, completada: false, color: '#f97316' },
  { id: 'm6', tipo: 'ganar_duelo', descripcion: 'Ganar un duelo contra otro alumno', icono: '⚔️', recompensa_monedas: 120, completada: false, color: '#ef4444' },
  { id: 'm7', tipo: 'marcar_estudiado', descripcion: 'Marcar una evaluación como estudiada', icono: '📅', recompensa_monedas: 40, completada: false, color: '#a855f7' },
  { id: 'm8', tipo: 'juego_memoria', descripcion: 'Completar el juego de Memoria', icono: '🃏', recompensa_monedas: 70, completada: false, color: '#ec4899' },
];

// Misiones que se completan jugando / haciendo algo en otra sección
// → navegar en lugar de marcar directamente
var MISION_NAV = {
  jugar_juegos: '../juegos/juegos.html',
  trivia: '../juegos/juegos.html',
  trivia_completar: '../juegos/juegos.html',
  trivia_chile: '../juegos/juegos.html',
  juego_memoria: '../juegos/juegos.html',
  sinonimos: '../juegos/juegos.html',
  coinclik: '../juegos/juegos.html',
  problema_texto: '../juegos/juegos.html',
  tabla_multiplicar: '../juegos/juegos.html',
  mapaquiz: '../juegos/juegos.html',
  HorseRace: '../juegos/juegos.html',
  TablaBlast: '../juegos/juegos.html',
  ganar_duelo: '../duelos/duelos.html',
  subir_tarea: '../tareas/tareas.html',
  tarea_ingles: '../tareas/tareas.html',
  marcar_estudiado: '../calendario/calendario.html',
  subir_nota: '../calendario/calendario.html',
};

// ============================================
// 2. INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initShared('dashboard');
  renderSaludo();
  renderStats();      // ← render inmediato con mock para que nunca quede en —
  renderMisiones();
  actualizarBadges();

  setTimeout(() => {
    var ener = MOCK_PERFIL.energia_actual;
    if (ener < 100) toast('⚡ Energía al ' + ener + '% — Recarga a las 20:00', 'info');
  }, 1000);
  setTimeout(() => {
    const pend = MOCK_MISIONES.filter(m => !m.completada).length;
    if (pend > 0) toast(`🎯 Tienes ${pend} misiones pendientes hoy`, 'warning');
  }, 2200);
});

// ============================================
// INTEGRACIÓN CLERK — carga datos reales de la API
// ============================================
document.addEventListener('clerkReady', function () {
  // Cargar perfil real
  fetch(BASE_URL + '/api/perfil', {
    credentials: 'include',
    headers: {
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {})
    }
  })
    .then(function (r) {
      // 404 = usuario autenticado pero sin perfil en Neon
      if (r.status === 404) {
        var base = window.EDUCOINS_BASE || '';
        window.location.href = base + '/auth/registro.html?nuevo=true';
        return null;
      }
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      if (!data) return;
      var p = data.perfil || data;
      MOCK_PERFIL.nombre = p.nombre || MOCK_PERFIL.nombre;
      MOCK_PERFIL.avatar_base = p.avatar_base || MOCK_PERFIL.avatar_base;
      MOCK_PERFIL.nivel = p.nivel || 1;
      MOCK_PERFIL.xp = p.xp || 0;
      MOCK_PERFIL.xp_siguiente = (p.nivel || 1) * 1000;
      MOCK_PERFIL.monedas = p.monedas || 100;
      MOCK_PERFIL.energia_actual = p.energia_actual || 100;
      MOCK_PERFIL.racha_dias = p.racha_dias || 0;
      MOCK_PERFIL.grado_actual = p.grado_actual || 1;
      MOCK_PERFIL.sub_rango = p.sub_rango || 'Bronce';
      MOCK_PERFIL.categoria_rango = p.categoria_rango || 'Explorador';
      MOCK_PERFIL.rol = p.rol || 'alumno';
      renderSaludo();
      renderStats();
      setTimeout(function () {
        actualizarHeaderPerfil(MOCK_PERFIL);
      }, 700);

      // Si es admin → revisar canjes pendientes
      if (p.rol === 'admin') {
        cargarCanjesDashboard();
      }

    })
    .catch(function () { });

  // Cargar evaluaciones próximas para la card del dashboard
  fetch(BASE_URL + '/api/evaluaciones?proximas=7', {
    credentials: 'include',
    headers: {
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {})
    }
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      // La API puede devolver { evaluaciones: [...] } o un array directo
      var evals = (data && (data.evaluaciones || data)) || [];
      if (!Array.isArray(evals)) return;

      // Solo las pendientes/próximas (estado pendiente o estudiado)
      var proximas = evals.filter(function (e) {
        return e.estado === 'pendiente' || e.estado === 'estudiado';
      });

      setEl('statEvalsProx', proximas.length);

      // Subtexto: cuántas son esta semana
      var hoy = new Date();
      var enSemana = proximas.filter(function (e) {
        var d = new Date(e.fecha_evaluacion);
        var diff = (d - hoy) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
      });
      setEl('statEvalsSub', enSemana.length + ' esta semana');

      // Detalle: mostrar la más próxima
      var detalle = document.getElementById('statEvalsDetalle');
      if (detalle && proximas.length > 0) {
        // Ordenar por fecha
        proximas.sort(function (a, b) {
          return new Date(a.fecha_evaluacion) - new Date(b.fecha_evaluacion);
        });
        var prox = proximas[0];
        var fechaProx = new Date(prox.fecha_evaluacion + 'T12:00:00');
        var fechaTxt = fechaProx.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
        detalle.textContent = prox.asignatura + ' · ' + fechaTxt;
      } else if (detalle && proximas.length === 0) {
        setEl('statEvalsProx', '0');
        setEl('statEvalsSub', 'sin pendientes');
      }

      // Actualizar badge del módulo calendario
      setEl('modCalBadge', enSemana.length + ' próximas');
      setEl('badgeCalendario', enSemana.length > 0 ? enSemana.length : '✓');
    })
    .catch(function () {
      // Sin API: dejar los valores mock del badge
    });

  // Cargar misiones reales
  fetch(BASE_URL + '/api/misiones', {
    credentials: 'include',
    headers: {
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {})
    }
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.misiones) return;
      var colores = ['#7c3aed', '#facc15', '#22c55e', '#06b6d4', '#f97316', '#ef4444', '#a855f7', '#ec4899'];
      MOCK_MISIONES.length = 0;
      data.misiones.forEach(function (m, i) {
        MOCK_MISIONES.push({
          id: m.id,
          tipo: m.tipo_mision || m.tipo || '',
          descripcion: m.descripcion,
          icono: m.icono || '📋',
          recompensa_monedas: Number(m.recompensa_monedas) || 50,
          completada: !!m.completada,
          color: colores[i % colores.length],
        });
      });
      renderMisiones();
      actualizarBadges();
      var pend = MOCK_MISIONES.filter(function (m) { return !m.completada; }).length;
      setEl('misionesRestantes', pend + ' misión' + (pend !== 1 ? 'es' : ''));
    })
    .catch(function () { });
});

// ============================================
// 3. SALUDO Y FECHA
// ============================================

// setEl: helper seguro que NO crashea si el elemento no existe.
// El header se carga async, entonces sus IDs llegan ~300-600ms después.
function setEl(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}

function renderSaludo() {
  const p = MOCK_PERFIL;
  const hora = new Date().getHours();
  const saludo = hora < 12 ? '☀️ BUENOS DÍAS'
    : hora < 19 ? '⚡ BUENAS TARDES'
      : '🌙 BUENAS NOCHES';

  // Estos IDs están en el BODY del dashboard — existen al DOMContentLoaded ✅
  setEl('greetingTime', saludo);
  setEl('greetingName', p.nombre);
  setEl('rachaDisplay', `${p.racha_dias} días`);

  const ahora = new Date();
  setEl('fechaHoy', ahora.toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long'
  }));
  setEl('anioActual', ahora.getFullYear());

  const pend = MOCK_MISIONES.filter(m => !m.completada).length;
  setEl('misionesRestantes', `${pend} misión${pend !== 1 ? 'es' : ''}`);

  // IDs del HEADER — llegan después del fetch de header.html.
  // Usamos setTimeout para esperar a que estén disponibles.
  // shared.js también los actualiza con actualizarHeaderPerfil(),
  // pero lo reforzamos aquí por si hay diferencia de timing.
  setTimeout(function () {
    setEl('sidebarNombre', p.nombre);
    setEl('sidebarAvatar', p.avatar_base);
    setEl('headerAvatar', p.avatar_base);
    setEl('sidebarRango', `${p.categoria_rango} ${p.sub_rango} · Nv.${p.nivel}`);
  }, 700);

}

// ============================================
// 4. STATS CARDS
// ============================================
function renderStats() {
  const p = MOCK_PERFIL;

  // Stats del BODY — existen ✅
  animarContador('statMonedas', p.monedas, 1200);
  setEl('statNivel', p.nivel);
  setEl('statXPSub', `${p.xp.toLocaleString('es-CL')} / ${p.xp_siguiente.toLocaleString('es-CL')} XP`);
  setEl('statRacha', `${p.racha_dias} días`);
  setEl('statRachaSub', p.racha_dias >= 30 ? '🏆 ¡Récord personal!' : '¡Sigue así!');
  // stat-energy eliminado — card reemplazada por evaluaciones

  // Stats del HEADER — esperamos al fetch del header
  setTimeout(() => {
    animarContador('headerCoins', p.monedas, 1000);
    setEl('headerEnergyText', `${p.energia_actual}/${p.energia_max}`);
    setEl('sidebarXP', `${p.xp.toLocaleString('es-CL')}/${p.xp_siguiente.toLocaleString('es-CL')}`);
    animarBarrasHeader(p);
  }, 700);

  // Barras del body
  setTimeout(() => animarBarrasBody(p), 300);
}

// ============================================
// 5. BARRAS DE PROGRESO
// ============================================
function animarBarrasBody(p) {
  const xpPct = Math.round((p.xp / p.xp_siguiente) * 100);
  const rachaPct = Math.min(100, Math.round((p.racha_dias / 30) * 100));
  setWidth('xpBarFill', xpPct + '%');
  setWidth('rachaBarFill', rachaPct + '%');
  // energyBarFill eliminado — card de energía reemplazada por evaluaciones
}

function animarBarrasHeader(p) {
  const xpPct = Math.round((p.xp / p.xp_siguiente) * 100);
  const enerPct = Math.round((p.energia_actual / p.energia_max) * 100);
  setWidth('sidebarXPBar', xpPct + '%');
  setWidth('headerEnergyBar', enerPct + '%');
}

function setWidth(id, valor) {
  const el = document.getElementById(id);
  if (el) el.style.width = valor;
}

// ============================================
// 6. RENDERIZAR MISIONES
// ============================================
function renderMisiones() {
  const grid = document.getElementById('missionsGrid');
  const completadas = MOCK_MISIONES.filter(m => m.completada).length;
  const total = MOCK_MISIONES.length;

  setEl('misionChip', `${completadas}/${total} completadas`);

  grid.innerHTML = MOCK_MISIONES.map(m => `
    <div class="mission-card ${m.completada ? 'done' : ''}"
         style="--m-color:${m.color}" data-id="${m.id}">
      <div class="mission-emoji">${m.icono}</div>
      <div class="mission-body">
        <div class="mission-name">${m.descripcion}</div>
        <div class="mission-meta">${m.completada ? '✅ Completada' : (MISION_NAV[m.tipo] ? '→ Ir a completarla' : '⏳ Pendiente · toca para completar')}</div>
      </div>
      <div class="mission-reward-pill">
        ${m.completada ? '✓' : '+'} ${m.recompensa_monedas} ${COIN_IMG}
      </div>
      ${m.completada ? '<span class="mission-done-check">✅</span>' : ''}
    </div>
  `).join('');

  grid.querySelectorAll('.mission-card:not(.done)').forEach(card => {
    card.addEventListener('click', () => completarMision(card.dataset.id));
  });

  actualizarRingMisiones(completadas, total);
  actualizarBonusCard(completadas, total);
}

// ============================================
// 7. COMPLETAR MISIÓN
// — Si la misión requiere acción en otra sección, navega.
// — Si no, llama a la API directamente.
// ============================================
function completarMision(id) {
  var mision = MOCK_MISIONES.find(function (m) { return m.id === id; });
  if (!mision || mision.completada) return;

  // Misiones de acción: llevar al alumno a la sección correspondiente
  var navUrl = MISION_NAV[mision.tipo];
  if (navUrl) {
    toast('🎯 ' + mision.descripcion + ' — ¡ve a completarla!', 'info');
    setTimeout(function () { window.location.href = navUrl; }, 800);
    return;
  }

  // Sin tipo nav: intentar completar directamente vía API
  if (!window.CLERK_TOKEN) {
    toast('⚠️ Debes iniciar sesión para completar misiones', 'warning');
    return;
  }

  var card = document.querySelector('.mission-card[data-id="' + id + '"]');
  if (card) card.style.pointerEvents = 'none';

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
        if (card) card.style.pointerEvents = '';
        toast('⚠️ ' + (data.mensaje || 'No se pudo completar la misión'), 'warning');
        return;
      }
      mision.completada = true;
      var recompensa = data.recompensa || mision.recompensa_monedas;
      renderMisiones();

      var pend = MOCK_MISIONES.filter(function (m) { return !m.completada; }).length;
      setEl('misionesRestantes', pend + ' misión' + (pend !== 1 ? 'es' : ''));
      actualizarBadges();

      MOCK_PERFIL.monedas += recompensa;
      animarContador('statMonedas', MOCK_PERFIL.monedas, 600);
      animarContador('headerCoins', MOCK_PERFIL.monedas, 600);
      setEl('modTiendaBadge', MOCK_PERFIL.monedas.toLocaleString('es-CL') + ' 🪙');
      toast('+' + recompensa + ' EduCoins 🪙 — ' + mision.descripcion, 'coins');

      if (data.bonus || !MOCK_MISIONES.find(function (m) { return !m.completada; })) {
        setTimeout(function () {
          MOCK_PERFIL.monedas += (data.bonus && data.bonus.monedas) || 200;
          animarContador('statMonedas', MOCK_PERFIL.monedas, 600);
          animarContador('headerCoins', MOCK_PERFIL.monedas, 600);
          toast('🏆 ¡Completaste todas las misiones! +200 EduCoins de BONUS', 'success');
        }, 700);
      }
    })
    .catch(function () {
      if (card) card.style.pointerEvents = '';
      toast('❌ Error de conexión', 'error');
    });
}

// ============================================
// 8. RING DE MISIONES
// ============================================
function actualizarRingMisiones(completadas, total) {
  const pct = completadas / total;
  const circum = 188;
  const offset = circum - pct * circum;

  setTimeout(() => {
    setWidth_anim('missionRing', { strokeDashoffset: offset });
    setWidth('missionProgressBar', (pct * 100) + '%');
  }, 400);

  setEl('missionRingText', `${completadas}/${total}`);

  const ring = document.getElementById('missionRing');
  if (ring) ring.style.stroke = pct >= 1 ? 'var(--green)'
    : pct >= .5 ? 'var(--cyan)'
      : 'var(--violet)';
}

function setWidth_anim(id, props) {
  const el = document.getElementById(id);
  if (!el) return;
  Object.assign(el.style, props);
}

function actualizarBonusCard(completadas, total) {
  const rest = total - completadas;
  const desc = document.getElementById('bonusDesc');
  if (!desc) return;
  desc.textContent = rest === 0
    ? '🎉 ¡Bonus desbloqueado! Ya ganaste las +200 monedas extra'
    : `¡Te falta${rest > 1 ? 'n' : ''} ${rest} misión${rest > 1 ? 'es' : ''} para el bonus del día!`;
}

// ============================================
// 9. BADGES
// ============================================
function actualizarBadges() {
  const pend = MOCK_MISIONES.filter(m => !m.completada).length;
  setEl('badgeMisiones', pend > 0 ? pend : '✓');
  setEl('modTiendaBadge', MOCK_PERFIL.monedas.toLocaleString('es-CL') + ' 🪙');
  setEl('badgeDuelos', '1');
  setEl('badgeCalendario', '2');
  setEl('modCalBadge', '2 próximas');
  setEl('modRankBadge', '#4 global');
}

// ============================================
// 10. CONTADOR ANIMADO
// ============================================
function animarContador(elId, target, duracion) {
  const el = document.getElementById(elId);
  if (!el) return;
  const desde = parseInt(el.textContent.replace(/\D/g, '')) || 0;
  let start = null;
  function step(ts) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duracion, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(desde + (target - desde) * ease).toLocaleString('es-CL');
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
// ============================================
// CANJES PENDIENTES — solo visible para admin
// ============================================
function cargarCanjesDashboard() {
  fetch(BASE_URL + '/api/admin?action=canjes_pendientes', {
    credentials: 'include',
    headers: { ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}) }
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;
      var canjes = data.canjes || [];
      if (canjes.length === 0) return;

      // Card naranja en stats grid
      var statsGrid = document.querySelector('.stats-grid');
      if (statsGrid) {
        var card = document.createElement('div');
        card.className = 'stat-card fade-up';
        card.style.cssText = 'padding:.75rem .9rem;min-height:0;--card-accent:#f97316;border-color:rgba(249,115,22,.3);cursor:pointer';
        card.onclick = function () { window.location.href = '../admin/admin.html#tienda'; };
        card.innerHTML =
          '<span class="stat-icon" style="font-size:1rem;margin-bottom:.2rem">🔔</span>' +
          '<span class="stat-label" style="font-size:.52rem">CANJES PENDIENTES</span>' +
          '<span class="stat-value" style="font-size:1.25rem;color:#f97316">' + canjes.length + '</span>' +
          '<span class="stat-sub" style="font-size:.65rem">de entrega física</span>' +
          '<div style="margin-top:.3rem;font-family:\'Press Start 2P\',monospace;font-size:.28rem;color:#f97316">Ver en admin →</div>';
        statsGrid.appendChild(card);
      }

      // Toast igual al de misiones
      setTimeout(function () {
        toast('🔔 Tienes ' + canjes.length + ' canje' + (canjes.length > 1 ? 's' : '') + ' pendiente' + (canjes.length > 1 ? 's' : '') + ' de entrega', 'warning');
      }, 3500);
    })
    .catch(function () { });
}