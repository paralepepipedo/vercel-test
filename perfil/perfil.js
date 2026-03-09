// ============================================
// ARCHIVO: /perfil/perfil.js
// DESCRIPCIÓN: Lógica del módulo de perfil
// NOTA: Sin type="module", eventos por addEventListener
// VERSIÓN: v1.4
// ============================================
// ÍNDICE
// 1.  Datos MOCK
// 2.  Lista de avatares disponibles
// 3.  Lista de logros del sistema
// 4.  Estado global
// 5.  Inicialización y registro de eventos
// 6.  Renderizar hero del perfil
// 7.  Renderizar barra XP detallada
// 8.  Renderizar stats secundarias
// 9.  Renderizar logros
// 10. Renderizar configuración
// 11. Modal de avatar — abrir, seleccionar, confirmar
// 12. Editar nombre (panel inline)
// 13. Conectar Telegram (panel inline)
// 14. Toggle ranking
// 15. Cerrar sesión
// 16. Sidebar móvil
// 17. Toasts
// 18. Helpers
// ============================================

// ============================================
// 0. PERSISTENCIA LOCAL
// Guarda solo los campos que el usuario puede
// cambiar (nombre, avatar, grado, etc.) en
// localStorage para que sobrevivan la navegación.
// Los datos del servidor (nivel, xp, monedas)
// vienen siempre de la API y no se persisten aquí.
// ============================================
var LS_PERFIL_KEY = 'educoins_perfil_v1';

function guardarPerfilLocal(perfil) {
  try {
    localStorage.setItem(LS_PERFIL_KEY, JSON.stringify({
      nombre: perfil.nombre,
      avatar_base: perfil.avatar_base,
      grado_actual: perfil.grado_actual,
      telegram_chat_id: perfil.telegram_chat_id,
      visible_ranking: perfil.visible_ranking,
    }));
  } catch (e) { }
}

function cargarPerfilLocal() {
  try {
    var raw = localStorage.getItem(LS_PERFIL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

// ============================================
// 1. DATOS MOCK
// TODO: reemplazar con → fetch('/api/perfil')
// ============================================
// Valores por defecto que coinciden con schema.sql (DEFAULT).
// Estos se sobreescriben con datos reales en cuanto la API responde.
var MOCK_PERFIL = {
  nombre: 'Alumno',
  avatar_base: '🐰',
  nivel: 1,
  xp: 0,
  xp_siguiente: 1000,
  monedas: 100,
  energia_actual: 100,
  energia_max: 100,
  racha_dias: 0,
  racha_max: 0,
  grado_actual: 1,
  sub_rango: 'Bronce',
  categoria_rango: 'Explorador',
  ranking_global: 0,
  telegram_chat_id: null,
  visible_ranking: true,
  // Stats adicionales
  total_evaluaciones: 0,
  promedio_notas: 0,
  juegos_jugados: 0,
  juego_favorito: '—',
  duelos_total: 0,
  duelos_ganados: 0,
  logros_obtenidos: [],
};

// ============================================
// 2. AVATARES DISPONIBLES
// ============================================
var AVATARES = [
  '🐰', '🐯', '🦊', '🐻', '🐼', '🦁',
  '🐨', '🐸', '🐧', '🦆', '🐺', '🦝',
  '🐙', '🦋', '🐝', '🦄', '🐲', '🎃',
  '🤖', '👾', '🎮', '🌟', '🚀', '⚡',
];

// ============================================
// 3. LOGROS DEL SISTEMA
// campo "clave" = valor que devolverá la API (tabla logros.clave)
// campo "id"    = ID local legacy (usado mientras la API no esté)
// ============================================
var LOGROS = [
  { id: 'l1', clave: 'primera_racha', emoji: '🔥', nombre: 'Primera Racha', descripcion: '5 días seguidos conectado' },
  { id: 'l2', clave: 'nivel_10', emoji: '⭐', nombre: 'Nivel 10', descripcion: 'Alcanzar el nivel 10' },
  { id: 'l3', clave: 'millonario', emoji: '🪙', nombre: 'Millonario', descripcion: 'Acumular 10,000 EduCoins' },
  { id: 'l4', clave: 'misionero', emoji: '🎯', nombre: 'Misionero', descripcion: 'Completar 8/8 misiones en un día' },
  { id: 'l5', clave: 'estudiante', emoji: '📅', nombre: 'Estudiante', descripcion: 'Registrar 10 evaluaciones' },
  { id: 'l6', clave: 'duelista', emoji: '⚔️', nombre: 'Duelista', descripcion: 'Ganar 10 duelos' },
  { id: 'l7', clave: 'top_3', emoji: '🏆', nombre: 'Top 3', descripcion: 'Entrar al podio del ranking' },
  { id: 'l8', clave: 'trivia_master', emoji: '📖', nombre: 'Trivia Master', descripcion: 'Ganar 20 trivias seguidas' },
  { id: 'l9', clave: 'calculista', emoji: '🧮', nombre: 'Calculista', descripcion: 'Resolver 50 problemas matemáticos' },
  { id: 'l10', clave: 'racha_30', emoji: '🌟', nombre: 'Racha 30 días', descripcion: '30 días consecutivos conectado' },
  { id: 'l11', clave: 'rango_diamante', emoji: '💎', nombre: 'Rango Diamante', descripcion: 'Alcanzar el sub-rango Diamante' },
];

// ============================================
// 4. ESTADO GLOBAL
// ============================================
var STATE = {
  perfil: Object.assign({}, MOCK_PERFIL),
  avatarSeleccionado: MOCK_PERFIL.avatar_base,
};

// ============================================
// 5. INICIALIZACIÓN Y EVENTOS
// ============================================
document.addEventListener('DOMContentLoaded', function () {
  initShared('perfil');
  // initSidebarMovil() ya la invoca shared.js internamente después de cargar el header
  renderHero();
  renderXP();
  renderStatsSecundarias();
  renderLogros();
  initConfigEventos();
  initModalAvatar();

  setTimeout(function () {
    toast('👤 Perfil cargado correctamente', 'info');
  }, 800);
});

// ============================================
// CARGAR DATOS REALES DESDE LA API
// Se activa cuando clerk-guard.js confirma sesión
// ============================================
document.addEventListener('clerkReady', function () { cargarDesdeAPI(); });
if (window.CLERK_USER) { cargarDesdeAPI(); }

function aplicarDatos(datos) {
  STATE.perfil = Object.assign({}, STATE.perfil, datos);
  renderHero();
  renderXP();
  renderStatsSecundarias();
  renderLogros();
}

function cargarDesdeAPI() {
  var base = (typeof BASE_URL !== 'undefined' ? BASE_URL : '') || (window.EDUCOINS_BASE || '');
  var hdrs = {
    credentials: 'include',
    headers: window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {},
  };

  // Aplicar localStorage primero (respuesta inmediata)
  var local = cargarPerfilLocal();
  if (local) aplicarDatos(local);

  // Cargar perfil y ranking en paralelo
  Promise.all([
    fetch(base + '/api/perfil', hdrs).then(function (r) { return r.ok ? r.json() : null; }),
    fetch(base + '/api/ranking?mi_posicion=1', hdrs).then(function (r) { return r.ok ? r.json() : null; }),
  ])
    .then(function (res) {
      var data = res[0];
      var posData = res[1];

      if (!data) return;

      // API devuelve el perfil directo (no anidado en data.perfil)
      var datosAPI = data.perfil || data;
      var local2 = cargarPerfilLocal();
      var merged = Object.assign({}, datosAPI, local2 || {});

      // Ranking global
      if (posData && posData.posicion_global) {
        merged.ranking_global = posData.posicion_global;
      }

      // XP siguiente nivel — calcular si no viene de la API
      if (!merged.xp_siguiente) {
        merged.xp_siguiente = merged.nivel * 1000;
      }

      // Logros
      if (data.logros && Array.isArray(data.logros)) {
        merged.logros_obtenidos = data.logros.map(function (l) {
          return l.logro_id || l.clave || '';
        });
      }

      aplicarDatos(merged);
    })
    .catch(function (err) {
      console.warn('[Perfil] Error cargando API:', err.message);
    });
}

// ============================================
// 6. RENDERIZAR HERO
// ============================================
function renderHero() {
  var p = STATE.perfil;

  // Avatar grande (solo el del hero del perfil)
  document.getElementById('avatarGrande').textContent = p.avatar_base;
  document.getElementById('avatarNivelBadge').textContent = 'Nv.' + p.nivel;

  // Nombre y rango (solo elementos propios de perfil.html)
  document.getElementById('perfilNombre').textContent = p.nombre;
  document.getElementById('rangoCat').textContent = p.categoria_rango;
  document.getElementById('rangoSub').textContent = p.sub_rango;
  document.getElementById('perfilGrado').textContent = p.grado_actual + '° Básico';
  document.getElementById('configNombreVal').textContent = p.nombre;
  // NOTA: sidebarNombre, sidebarRango, sidebarAvatar, headerAvatar, headerCoins,
  //       headerEnergyBar/Text los actualiza shared.js via actualizarHeaderPerfil()

  // Stats rápidas hero
  // NOTA: headerCoins, headerEnergyText, headerEnergyBar los maneja shared.js via actualizarHeaderPerfil()
  document.getElementById('heroMonedas').textContent = p.monedas.toLocaleString('es-CL');
  document.getElementById('heroRacha').textContent = p.racha_dias;
  document.getElementById('heroLogros').textContent = p.logros_obtenidos.length + '/' + LOGROS.length;
  document.getElementById('heroRank').textContent = '#' + p.ranking_global;

  // Grado en config
  document.getElementById('configGradoVal').textContent = p.grado_actual + '° Básico';

  // Colegio en config
  var configColegio = document.getElementById('configColegioVal');
  if (configColegio) configColegio.textContent = p.nombre_colegio || p.colegio_id || 'No configurado';

  // Telegram en config
  var tgVal = document.getElementById('configTelegramVal');
  if (p.telegram_chat_id) {
    tgVal.textContent = 'Conectado · ID: ' + p.telegram_chat_id;
    tgVal.style.color = 'var(--green)';
  } else {
    tgVal.textContent = 'No conectado';
  }
}

// ============================================
// 7. BARRA XP DETALLADA
// ============================================
function renderXP() {
  var p = STATE.perfil;
  var pct = Math.round((p.xp / p.xp_siguiente) * 100);
  var falta = p.xp_siguiente - p.xp;

  document.getElementById('xpNivel').textContent = p.nivel;
  document.getElementById('xpNivelSig').textContent = p.nivel + 1;
  document.getElementById('xpActual').textContent = p.xp.toLocaleString('es-CL');
  document.getElementById('xpSiguiente').textContent = p.xp_siguiente.toLocaleString('es-CL');
  document.getElementById('xpFalta').textContent = falta.toLocaleString('es-CL') + ' XP';

  setTimeout(function () {
    document.getElementById('xpBarraFill').style.width = pct + '%';
  }, 300);

  // Hitos: 25%, 50%, 75%
  var milestones = document.getElementById('xpMilestones');
  var hitos = [
    Math.round(p.xp_siguiente * 0.25),
    Math.round(p.xp_siguiente * 0.5),
    Math.round(p.xp_siguiente * 0.75),
    p.xp_siguiente,
  ];
  milestones.innerHTML = hitos.map(function (h) {
    return '<span>' + h.toLocaleString('es-CL') + '</span>';
  }).join('');
}

// ============================================
// 8. STATS SECUNDARIAS
// ============================================
function renderStatsSecundarias() {
  var p = STATE.perfil;

  document.getElementById('statEvals').textContent = p.total_evaluaciones;
  document.getElementById('statEvalsPromedio').textContent = 'Promedio: ' + p.promedio_notas.toFixed(1);
  document.getElementById('statJuegos').textContent = p.juegos_jugados;
  document.getElementById('statJuegosFav').textContent = 'Favorito: ' + p.juego_favorito;
  document.getElementById('statDuelos').textContent = p.duelos_total;
  document.getElementById('statDuelosWin').textContent = 'Ganados: ' + p.duelos_ganados;
  document.getElementById('statRachaMax').textContent = p.racha_max;
}

// ============================================
// 9. LOGROS
// ============================================
function renderLogros() {
  var grid = document.getElementById('logrosGrid');
  var chip = document.getElementById('logrosChip');
  var obtenidos = STATE.perfil.logros_obtenidos; // array de strings: ids locales, claves o UUIDs

  chip.textContent = obtenidos.length + ' / ' + LOGROS.length;

  grid.innerHTML = LOGROS.map(function (l) {
    // Match robusto: compara contra id local ('l1'), clave ('primera_racha') o UUID
    var desbloqueado = obtenidos.some(function (v) {
      return v === l.id || v === l.clave;
    });
    return '<div class="logro-card ' + (desbloqueado ? 'desbloqueado' : 'bloqueado') + '">' +
      '<span class="logro-emoji">' + l.emoji + '</span>' +
      '<div class="logro-nombre">' + l.nombre + '</div>' +
      '<div class="logro-desc">' + l.descripcion + '</div>' +
      (desbloqueado ? '<span class="logro-badge">✅</span>' : '') +
      '</div>';
  }).join('');
}

// ============================================
// 10. CONFIGURACIÓN — EVENTOS
// ============================================
function initConfigEventos() {
  // Botón editar nombre (header hero y config)
  document.getElementById('btnEditarNombre').addEventListener('click', toggleEditarNombre);
  document.getElementById('btnConfigNombre').addEventListener('click', toggleEditarNombre);

  // Guardar / cancelar nombre
  document.getElementById('btnGuardarNombre').addEventListener('click', guardarNombre);
  document.getElementById('btnCancelarNombre').addEventListener('click', function () {
    document.getElementById('editNombrePanel').style.display = 'none';
  });
  document.getElementById('editNombreInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') guardarNombre();
    if (e.key === 'Escape') document.getElementById('editNombrePanel').style.display = 'none';
  });

  // Telegram
  document.getElementById('btnConectarTelegram').addEventListener('click', toggleTelegramPanel);
  document.getElementById('btnConfigTelegram').addEventListener('click', toggleTelegramPanel);
  document.getElementById('btnGenerarCodigo').addEventListener('click', generarCodigoTelegram);
  document.getElementById('btnCancelarTelegram').addEventListener('click', function () {
    document.getElementById('telegramPanel').style.display = 'none';
  });

  // Grado — panel inline con selector
  document.getElementById('btnConfigGrado').addEventListener('click', toggleGradoPanel);
  document.getElementById('btnGuardarGrado').addEventListener('click', guardarGrado);
  document.getElementById('btnCancelarGrado').addEventListener('click', function () {
    document.getElementById('editGradoPanel').style.display = 'none';
  });

  // Colegio
  document.getElementById('btnConfigColegio').addEventListener('click', toggleColegioPanel);
  document.getElementById('btnGuardarColegio').addEventListener('click', guardarColegio);
  document.getElementById('btnCancelarColegio').addEventListener('click', function () {
    document.getElementById('editColegioPanel').style.display = 'none';
  });

  // Toggle ranking
  document.getElementById('toggleRanking').addEventListener('change', function () {
    STATE.perfil.visible_ranking = this.checked;
    toast(this.checked ? '🏆 Apareces en el ranking' : '👁️ Oculto del ranking', 'info');
    // TODO: fetch('/api/perfil', { method:'PUT', body: { visible_ranking: this.checked } })
  });

  // Cerrar sesión — usa Clerk.signOut() y redirige al login
  document.getElementById('btnCerrarSesion').addEventListener('click', function () {
    if (confirm('¿Cerrar sesión?')) {
      toast('👋 Cerrando sesión...', 'info');
      var base = (typeof BASE_URL !== 'undefined' ? BASE_URL : '') || (window.EDUCOINS_BASE || '');
      var loginUrl = base + '/auth/login.html';

      if (window.Clerk && window.Clerk.signOut) {
        window.Clerk.signOut()
          .then(function () { window.location.href = loginUrl; })
          .catch(function () { window.location.href = loginUrl; });
      } else {
        setTimeout(function () { window.location.href = loginUrl; }, 1200);
      }
    }
  });
}

// ============================================
// 11. MODAL AVATAR
// ============================================
function initModalAvatar() {
  // Botón abrir
  document.getElementById('btnCambiarAvatar').addEventListener('click', abrirModalAvatar);

  // Cerrar
  document.getElementById('btnCerrarModalAvatar').addEventListener('click', function () {
    cerrarModal('modalAvatar');
  });
  document.getElementById('modalAvatar').addEventListener('click', function (e) {
    if (e.target === this) cerrarModal('modalAvatar');
  });

  // Confirmar
  document.getElementById('btnConfirmarAvatar').addEventListener('click', confirmarAvatar);

  // Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cerrarModal('modalAvatar');
  });
}

function abrirModalAvatar() {
  var grid = document.getElementById('avatarGrid');
  STATE.avatarSeleccionado = STATE.perfil.avatar_base;

  grid.innerHTML = AVATARES.map(function (av) {
    var sel = av === STATE.perfil.avatar_base ? ' seleccionado' : '';
    return '<div class="avatar-opcion' + sel + '" data-avatar="' + av + '">' + av + '</div>';
  }).join('');

  // Eventos en opciones
  grid.querySelectorAll('.avatar-opcion').forEach(function (btn) {
    btn.addEventListener('click', function () {
      grid.querySelectorAll('.avatar-opcion').forEach(function (b) { b.classList.remove('seleccionado'); });
      this.classList.add('seleccionado');
      STATE.avatarSeleccionado = this.dataset.avatar;
    });
  });

  abrirModal('modalAvatar');
}

function confirmarAvatar() {
  STATE.perfil.avatar_base = STATE.avatarSeleccionado;

  // Actualizar solo el avatar grande del hero
  document.getElementById('avatarGrande').textContent = STATE.avatarSeleccionado;
  // NOTA: headerAvatar y sidebarAvatar los actualiza shared.js
  // Forzar actualización del header compartido con los datos actuales
  if (typeof actualizarHeaderPerfil === 'function') {
    actualizarHeaderPerfil(STATE.perfil);
  }

  cerrarModal('modalAvatar');
  guardarPerfilLocal(STATE.perfil);
  toast('🎨 Avatar actualizado correctamente', 'success');

  // Guardar en DB cuando la API esté disponible (Vercel)
  var base = (typeof BASE_URL !== 'undefined' ? BASE_URL : '') || (window.EDUCOINS_BASE || '');
  fetch(base + '/api/perfil', {
    method: 'PUT',
    credentials: 'include',
    headers: Object.assign({ 'Content-Type': 'application/json' }, window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}),
    body: JSON.stringify({ avatar_base: STATE.avatarSeleccionado })
  }).catch(function () { });
}

// ============================================
// 12. EDITAR NOMBRE
// ============================================
function toggleEditarNombre() {
  var panel = document.getElementById('editNombrePanel');
  var input = document.getElementById('editNombreInput');

  if (panel.style.display === 'none' || panel.style.display === '') {
    panel.style.display = 'flex';
    input.value = STATE.perfil.nombre;
    // Scroll al panel para que sea visible (está al final de la página)
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { input.focus(); input.select(); }, 300);
  } else {
    panel.style.display = 'none';
  }
}

function guardarNombre() {
  var input = document.getElementById('editNombreInput');
  var nuevo = input.value.trim();

  if (!nuevo || nuevo.length < 2) {
    toast('⚠️ El nombre debe tener al menos 2 caracteres', 'warning');
    return;
  }
  if (nuevo.length > 20) {
    toast('⚠️ El nombre no puede superar 20 caracteres', 'warning');
    return;
  }

  STATE.perfil.nombre = nuevo;
  document.getElementById('perfilNombre').textContent = nuevo;
  // NOTA: sidebarNombre lo sincroniza shared.js via MutationObserver (syncDropdown)
  document.getElementById('configNombreVal').textContent = nuevo;
  // Forzar actualización del header compartido con el nuevo nombre
  if (typeof actualizarHeaderPerfil === 'function') {
    actualizarHeaderPerfil(STATE.perfil);
  }
  document.getElementById('editNombrePanel').style.display = 'none';

  guardarPerfilLocal(STATE.perfil);
  toast('✅ Nombre actualizado a "' + nuevo + '"', 'success');

  // Guardar en DB cuando la API esté disponible (Vercel)
  var base = (typeof BASE_URL !== 'undefined' ? BASE_URL : '') || (window.EDUCOINS_BASE || '');
  fetch(base + '/api/perfil', {
    method: 'PUT',
    credentials: 'include',
    headers: Object.assign({ 'Content-Type': 'application/json' }, window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}),
    body: JSON.stringify({ nombre: nuevo })
  }).catch(function () { });
}

// ============================================
// 13. TELEGRAM
// ============================================
function toggleTelegramPanel() {
  var panel = document.getElementById('telegramPanel');
  if (panel.style.display === 'none' || panel.style.display === '') {
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

function generarCodigoTelegram() {
  var btn = document.getElementById('btnGenerarCodigo');
  btn.disabled = true;
  btn.textContent = '⏳ Generando...';

  var base = (typeof BASE_URL !== 'undefined' ? BASE_URL : '') || (window.EDUCOINS_BASE || '');
  fetch(base + '/api/telegram', {
    credentials: 'include',
    headers: window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {},
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      btn.disabled = false;
      btn.textContent = '🔄 Nuevo código';
      if (!data || !data.codigo) {
        toast('⚠️ Error al generar código', 'warning');
        return;
      }
      document.getElementById('tgCodigoBox').style.display = 'block';
      document.getElementById('tgCodigo').textContent = data.codigo;
      document.getElementById('tgCodigoSub').textContent = 'Envía este código a @Educoin_web_Bot en Telegram';

      // Verificar vinculación cada 5 segundos por 5 minutos
      var intentos = 0;
      var intervalo = setInterval(function () {
        intentos++;
        if (intentos > 60) { clearInterval(intervalo); return; }
        fetch(base + '/api/perfil', {
          credentials: 'include',
          headers: window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {},
        })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (p) {
            if (p && p.telegram_chat_id) {
              clearInterval(intervalo);
              STATE.perfil.telegram_chat_id = p.telegram_chat_id;
              var tgVal = document.getElementById('configTelegramVal');
              tgVal.textContent = '✅ Conectado';
              tgVal.style.color = 'var(--green)';
              document.getElementById('telegramPanel').style.display = 'none';
              guardarPerfilLocal(STATE.perfil);
              toast('📱 ¡Telegram conectado! Recibirás alertas en tu cuenta', 'success');
            }
          });
      }, 5000);
    })
    .catch(function () {
      btn.disabled = false;
      btn.textContent = '🔑 Generar código';
      toast('⚠️ Error al generar código', 'warning');
    });
}

// ============================================
// 14. CAMBIAR GRADO — panel inline con selector
// ============================================
function toggleGradoPanel() {
  var panel = document.getElementById('editGradoPanel');
  if (panel.style.display === 'none' || panel.style.display === '') {
    panel.style.display = 'flex';
    document.getElementById('editGradoSelect').value = String(STATE.perfil.grado_actual);
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    panel.style.display = 'none';
  }
}

function guardarGrado() {
  var select = document.getElementById('editGradoSelect');
  var nuevo = parseInt(select.value);
  if (!nuevo || nuevo < 1 || nuevo > 8) return;

  STATE.perfil.grado_actual = nuevo;
  var txt = nuevo + '° Básico';
  document.getElementById('perfilGrado').textContent = txt;
  document.getElementById('configGradoVal').textContent = txt;
  document.getElementById('editGradoPanel').style.display = 'none';

  guardarPerfilLocal(STATE.perfil);
  toast('📚 Grado actualizado a ' + txt, 'success');

  var base2 = (typeof BASE_URL !== 'undefined' ? BASE_URL : '') || (window.EDUCOINS_BASE || '');
  fetch(base2 + '/api/perfil', {
    method: 'PUT',
    credentials: 'include',
    headers: Object.assign({ 'Content-Type': 'application/json' }, window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}),
    body: JSON.stringify({ grado_ingreso: nuevo })
  }).catch(function () { });
}

// ============================================
// 14B. CAMBIAR COLEGIO
// ============================================
function toggleColegioPanel() {
  var panel = document.getElementById('editColegioPanel');
  if (panel.style.display === 'none' || panel.style.display === '') {
    panel.style.display = 'flex';
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Cargar colegios desde API
    var base = (typeof BASE_URL !== 'undefined' ? BASE_URL : '') || (window.EDUCOINS_BASE || '');
    var select = document.getElementById('editColegioSelect');
    select.innerHTML = '<option value="">Cargando...</option>';

    fetch(base + '/api/colegios')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.colegios) return;
        select.innerHTML = '<option value="">Selecciona tu colegio...</option>' +
          data.colegios.map(function (c) {
            var sel = c.id === STATE.perfil.colegio_id ? ' selected' : '';
            return '<option value="' + c.id + '"' + sel + '>' + c.nombre + (c.comuna ? ' — ' + c.comuna : '') + '</option>';
          }).join('');
      })
      .catch(function () {
        select.innerHTML = '<option value="">Error al cargar colegios</option>';
      });
  } else {
    panel.style.display = 'none';
  }
}

function guardarColegio() {
  var select = document.getElementById('editColegioSelect');
  var nuevoId = select.value;
  var nuevoNombre = select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : '';

  if (!nuevoId) {
    toast('⚠️ Selecciona un colegio', 'warning');
    return;
  }

  STATE.perfil.colegio_id = nuevoId;
  STATE.perfil.nombre_colegio = nuevoNombre.split(' — ')[0]; // sin la comuna
  var configColegio = document.getElementById('configColegioVal');
  if (configColegio) configColegio.textContent = STATE.perfil.nombre_colegio;
  document.getElementById('editColegioPanel').style.display = 'none';

  guardarPerfilLocal(STATE.perfil);
  toast('🏫 Colegio actualizado: ' + STATE.perfil.nombre_colegio, 'success');

  var base = (typeof BASE_URL !== 'undefined' ? BASE_URL : '') || (window.EDUCOINS_BASE || '');
  fetch(base + '/api/perfil', {
    method: 'PUT',
    credentials: 'include',
    headers: Object.assign({ 'Content-Type': 'application/json' }, window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}),
    body: JSON.stringify({ colegio_id: nuevoId })
  }).catch(function () { });
}

// ============================================
// 15. MODALES
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
// 16. SIDEBAR MÓVIL
// initSidebarMovil() la provee shared.js —
// no duplicar aquí para evitar doble listener.
// ============================================

// ============================================
// 17. TOASTS
// ============================================
function toast(msg, tipo) {
  tipo = tipo || 'info';
  var container = document.getElementById('toastContainer');
  var iconos = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️', coins: '🪙' };
  var colores = { success: 'rgba(34,197,94,.4)', warning: 'rgba(250,204,21,.4)', error: 'rgba(239,68,68,.4)', info: 'rgba(6,182,212,.4)', coins: 'rgba(250,204,21,.4)' };
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