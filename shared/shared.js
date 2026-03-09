// ============================================
// ARCHIVO: /shared/shared.js
// VERSIÓN: 2.0 — BASE_URL autodetectado
// ============================================
// No necesitas cambiar BASE_URL manualmente.
// El script detecta la carpeta raíz del proyecto
// basándose en dónde está ubicado él mismo.
//
// Funciona en:
//   XAMPP:  http://localhost/Educoin/
//   Vercel: https://tuapp.vercel.app/
//   Cualquier subcarpeta de htdocs
//
// USO EN CADA PÁGINA:
//   <script src="../shared/shared.js"></script>
//   En tu JS de página: initShared('dashboard')
// ============================================
// ÍNDICE
// 1.  Autodetección de BASE_URL
// 2.  initShared(pageName)
// 3.  cargarHeader()
// 4.  marcarPaginaActiva()
// 5.  initSidebarMovil()
// 6.  actualizarHeaderPerfil(perfil)
// 7.  Mock perfil temporal
// 8.  toast(msg, tipo)
// 9.  animarContador(elId, target, dur)
// 10. abrirModal / cerrarModal
// ============================================

// ============================================
// 1. AUTODETECCIÓN DE BASE_URL
// Busca el script actual en el DOM y extrae
// la raíz del proyecto desde su src.
// Ejemplo: src="/Educoin/shared/shared.js"
//          → BASE_URL = "/Educoin"
// ============================================
var BASE_URL = (function () {
  // Buscar el tag <script> que cargó este archivo
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src || '';
    // Busca la parte que termina en /shared/shared.js
    var match = src.match(/^(.*?)\/shared\/shared\.js/);
    if (match) {
      // match[1] puede ser algo como "http://localhost/Educoin"
      // Extraer solo el pathname (sin host)
      try {
        var url = new URL(match[1]);
        return url.pathname.replace(/\/$/, ''); // quitar slash final
      } catch (e) {
        // Si no es URL absoluta, usar directamente
        return match[1].replace(/\/$/, '');
      }
    }
  }
  // Fallback: raíz del sitio
  return '';
})();

// ============================================
// 1b. ICONO DE MONEDA GLOBAL
// Usar en innerHTML generado por JS en lugar de 🪙
// Ejemplo: '+50 ' + COIN_IMG
// ============================================
var COIN_IMG = '<img src="' + BASE_URL + '/shared/coin.png" alt="\uD83E\uDE99"' +
  ' style="height:.9em;width:.9em;object-fit:contain;vertical-align:middle;image-rendering:pixelated;display:inline-block;">';

// ============================================
// 2. PUNTO DE ENTRADA
// Llama esto al inicio del JS de cada página:
//   initShared('misiones')
// ============================================
function initShared(pageName) {
  inyectarPWAMeta();
  cargarHeader(pageName);
}

function inyectarPWAMeta() {
  // Evitar duplicados
  if (document.getElementById('pwa-manifest')) return;

  var head = document.head;
  var tags = [
    '<link id="pwa-manifest" rel="manifest" href="/manifest.json"/>',
    '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"/>',
    '<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png"/>',
    '<meta name="theme-color" content="#7c3aed"/>',
    '<meta name="mobile-web-app-capable" content="yes"/>',
    '<meta name="apple-mobile-web-app-capable" content="yes"/>',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>',
    '<meta name="apple-mobile-web-app-title" content="EduCoins"/>',
  ];

  var tmp = document.createElement('div');
  tags.forEach(function (tag) {
    tmp.innerHTML = tag;
    head.appendChild(tmp.firstElementChild);
  });
}

// ============================================
// 3. INTEGRACIÓN CLERK
// Escucha el evento 'clerkReady' que dispara
// clerk-guard.js cuando confirma la sesión.
// Si clerk-guard.js no está en la página
// (desarrollo sin auth), el mock se usa igual.
// ============================================
document.addEventListener('clerkReady', function (e) {
  var u = e.detail; // { id, username, email, firstName }
  var LS_PERFIL_KEY = 'educoins_perfil_v1';
  // Lee las preferencias guardadas por perfil.js
  function leerLocal() {
    try {
      var raw = localStorage.getItem(LS_PERFIL_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) { return null; }
  }

  // Base para el header con valores de nuevo usuario
  var BASE_DATOS = {
    nombre: u.username || u.firstName || 'Alumno',
    avatar_base: '🐰',
    nivel: 1, xp: 0, xp_siguiente: 1000,
    monedas: 100, energia_actual: 100, energia_max: 100,
    categoria_rango: 'Explorador', sub_rango: 'Bronce',
    misiones_pendientes: 0, evaluaciones_proximas: 0, duelos_pendientes: 0,
  };

  function aplicarHeader(datos, desdeAPI) {
    var local = leerLocal();
    if (desdeAPI) {
      // Datos de la API son la fuente de verdad para monedas, xp, energia, nivel.
      // localStorage solo puede aportar preferencias cosmeticas (avatar, nombre).
      var preferenciasLocales = {};
      if (local && local.avatar_base) preferenciasLocales.avatar_base = local.avatar_base;
      if (local && local.nombre) preferenciasLocales.nombre = local.nombre;
      actualizarHeaderPerfil(Object.assign({}, BASE_DATOS, datos || {}, preferenciasLocales));
      // Guardar datos frescos de la API en localStorage para proxima carga rapida
      try { localStorage.setItem('educoins_perfil_v1', JSON.stringify(datos)); } catch (e) { }
    } else {
      // Sin datos de API aun: usar localStorage para carga instantanea
      actualizarHeaderPerfil(Object.assign({}, BASE_DATOS, local || {}, datos || {}));
    }
  }

  // Aplicar inmediatamente con localStorage (sin parpadeo en carga)
  // DESPUÉS:
  if (document.getElementById('headerAvatar')) {
    aplicarHeader();
  } else {
    // El header aún no fue inyectado — esperar 800ms y reintentar
    setTimeout(function () { aplicarHeader(); }, 800);
  }

  // Cargar datos reales de la API — siempre sobreescriben localStorage
  if (window.CLERK_TOKEN) {
    fetch(BASE_URL + '/api/perfil', {
      credentials: 'include',
      headers: { 'Authorization': 'Bearer ' + window.CLERK_TOKEN }
    })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && data.clerk_id) {
          // API retorna el perfil directo
          aplicarHeader(data, true);
        } else if (data && data.perfil) {
          // Compatibilidad si viene envuelto en .perfil
          aplicarHeader(data.perfil, true);
        }
      })
      .catch(function () { }); // silencioso
  }
});

// ============================================
// 4. CARGAR HEADER.HTML
// (era sección 3, renumerada para claridad)
// ============================================
function cargarHeader(pageName) {
  var contenedor = document.getElementById('sharedHeader');
  if (!contenedor) {
    console.warn('[shared.js] Falta <div id="sharedHeader"></div> en el HTML');
    return;
  }

  var url = BASE_URL + '/shared/header.html';

  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' al cargar ' + url);
      return res.text();
    })
    .then(function (html) {
      contenedor.innerHTML = html;

      // Convertir data-href → href con BASE_URL correcto
      // Así los links del header.html funcionan en cualquier
      // carpeta sin editar nada manualmente
      contenedor.querySelectorAll('[data-href]').forEach(function (el) {
        el.setAttribute('href', BASE_URL + el.getAttribute('data-href'));
        el.removeAttribute('data-href');
      });

      marcarPaginaActiva(pageName);
      initSidebarMovil();
      initDropdownHeader();

      // Cargar datos del perfil en el header.
      // Si clerk-guard.js ya está en la página, el evento 'clerkReady'
      // actualizará el header con datos reales — NO usar mock aquí.
      // El mock solo se usa como fallback si NO hay Clerk (desarrollo local).
      //
      // Cómo funciona el orden:
      //   1. clerk-guard.js carga y verifica sesión (~300ms)
      //   2. shared.js carga el header con fetch (~200ms)
      //   3. El header se inyecta en el DOM
      //   4. Si Clerk ya terminó → 'clerkReady' se disparó antes del fetch
      //      entonces necesitamos reaplicar los datos de Clerk aquí.
      //   5. Si Clerk termina después → 'clerkReady' se disparará y llenará el header.

      if (window.CLERK_USER) {
        // Clerk confirmado: mostrar datos de localStorage mientras llega la API
        var _local = (function () {
          try { var r = localStorage.getItem('educoins_perfil_v1'); return r ? JSON.parse(r) : null; }
          catch (e) { return null; }
        })();
        var _base = {
          nombre: window.CLERK_USER.username || window.CLERK_USER.firstName || 'Alumno',
          avatar_base: '🐰',
          nivel: 1, xp: 0, xp_siguiente: 1000,
          monedas: 0, energia_actual: 100, energia_max: 100,
          categoria_rango: 'Explorador', sub_rango: 'Bronce',
          misiones_pendientes: 0, evaluaciones_proximas: 0, duelos_pendientes: 0,
        };
        // localStorage tiene prioridad sobre base, pero la API (clerkReady) tiene prioridad sobre todo
        actualizarHeaderPerfil(Object.assign({}, _base, _local || {}));

        // Si ya hay token disponible, cargar datos reales de la API inmediatamente
        if (window.CLERK_TOKEN) {
          fetch(BASE_URL + '/api/perfil', {
            credentials: 'include',
            headers: { 'Authorization': 'Bearer ' + window.CLERK_TOKEN }
          })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
              if (!data) return;
              var perfil = data.clerk_id ? data : (data.perfil || null);
              if (!perfil) return;
              // API es la fuente de verdad — sobreescribe localStorage
              var cosmeticos = {};
              if (_local && _local.avatar_base) cosmeticos.avatar_base = _local.avatar_base;
              if (_local && _local.nombre) cosmeticos.nombre = _local.nombre;
              actualizarHeaderPerfil(Object.assign({}, _base, perfil, cosmeticos));
              try { localStorage.setItem('educoins_perfil_v1', JSON.stringify(perfil)); } catch (e) { }
            })
            .catch(function () { });
        }
      } else if (!window.CLERK_PUBLISHABLE_KEY ||
        window.CLERK_PUBLISHABLE_KEY === 'pk_test_PEGA_AQUI_TU_CLAVE_COMPLETA') {
        // Sin Clerk configurado → modo desarrollo, usar mock
        actualizarHeaderPerfil(obtenerPerfilMock());
      }
      // Si hay Clerk pero aun no termino → esperar el evento 'clerkReady'
    })
    .catch(function (err) {
      console.error('[shared.js] Error cargando header:', err);
      console.error('[shared.js] BASE_URL detectado:', BASE_URL);
      console.error('[shared.js] URL intentada:', url);
      // Fallback mínimo
      contenedor.innerHTML =
        '<header class="header">' +
        '<a href="' + BASE_URL + '/index.html" class="header-logo">' +
        '<div class="logo-box">🎓</div>' +
        '<div class="logo-text-wrap">' +
        '<span class="logo-name">EduCoins</span>' +
        '</div>' +
        '</a>' +
        '<div class="header-spacer"></div>' +
        '</header>';
    });
}

// ============================================
// 4. MARCAR PÁGINA ACTIVA EN SIDEBAR
// ============================================
function marcarPaginaActiva(pageName) {
  if (!pageName) return;
  document.querySelectorAll('.nav-item[data-page]').forEach(function (item) {
    item.classList.remove('active');
    if (item.dataset.page === pageName) {
      item.classList.add('active');
    }
  });
}

// ============================================
// 5. SIDEBAR MÓVIL
// Se llama DESPUÉS de que cargarHeader inyecta
// el DOM, por eso va dentro del .then()
// ============================================
function initSidebarMovil() {
  var toggle = document.getElementById('sidebarToggle');
  var sidebar = document.getElementById('sidebar');
  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', function () {
    sidebar.classList.toggle('open');
  });

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
// 6. ACTUALIZAR DATOS DEL PERFIL EN HEADER
// ============================================
function actualizarHeaderPerfil(p) {
  setTexto('headerCoins', p.monedas ? p.monedas.toLocaleString('es-CL') : '—');
  setTexto('headerEnergyText', window.innerWidth <= 768
    ? (p.energia_actual || '—')
    : (p.energia_actual || '—') + '/' + (p.energia_max || '—'));
  setTexto('headerAvatar', p.avatar_base || '🐰');

  var energyBar = document.getElementById('headerEnergyBar');
  if (energyBar && p.energia_actual && p.energia_max) {
    energyBar.style.width = Math.round((p.energia_actual / p.energia_max) * 100) + '%';
  }

  setTexto('sidebarAvatar', p.avatar_base || '🐰');
  setTexto('sidebarNombre', p.nombre || '—');
  setTexto('sidebarRango',
    (p.categoria_rango || '—') + ' ' + (p.sub_rango || '') + ' · Nv.' + (p.nivel || '—'));
  setTexto('sidebarXP',
    (p.xp || 0).toLocaleString('es-CL') + '/' + (p.xp_siguiente || 0).toLocaleString('es-CL'));

  var xpBar = document.getElementById('sidebarXPBar');
  if (xpBar && p.xp && p.xp_siguiente) {
    xpBar.style.width = Math.round((p.xp / p.xp_siguiente) * 100) + '%';
  }

  setTexto('badgeMisiones', p.misiones_pendientes !== undefined ? p.misiones_pendientes : '—');
  setTexto('badgeCalendario', p.evaluaciones_proximas !== undefined ? p.evaluaciones_proximas : '—');
  setTexto('badgeDuelos', p.duelos_pendientes !== undefined ? p.duelos_pendientes : '—');

  // Dropdown del avatar
  setTexto('dropdownNombre', p.nombre || '—');
  setTexto('dropdownRango',
    (p.categoria_rango || '—') + ' ' + (p.sub_rango || '') + ' · Nv.' + (p.nivel || '—'));
}

// ============================================
// 7. MOCK PERFIL TEMPORAL
// TODO: eliminar cuando Clerk esté conectado
// ============================================
function obtenerPerfilMock() {
  return {
    nombre: 'Alumno',
    avatar_base: '🐰',
    nivel: 1,
    xp: 0,
    xp_siguiente: 1000,
    monedas: 100,
    energia_actual: 100,
    energia_max: 100,
    categoria_rango: 'Explorador',
    sub_rango: 'Bronce',
    misiones_pendientes: 0,
    evaluaciones_proximas: 0,
    duelos_pendientes: 0,
  };
}

// ============================================
// 8. TOASTS
// Disponible globalmente en todos los módulos.
// Uso: toast('Mensaje', 'success')
// Tipos: success | warning | error | info | coins | level
// ============================================
function toast(msg, tipo) {
  tipo = tipo || 'info';
  var container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  var iconos = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️', coins: '🪙', level: '⬆️' };
  var colores = {
    success: 'rgba(34,197,94,0.4)', warning: 'rgba(250,204,21,0.4)',
    error: 'rgba(239,68,68,0.4)', info: 'rgba(6,182,212,0.4)',
    coins: 'rgba(250,204,21,0.4)', level: 'rgba(124,58,237,0.4)',
  };

  var el = document.createElement('div');
  el.className = 'toast';
  el.style.borderColor = colores[tipo] || colores.info;
  el.innerHTML =
    '<span style="font-size:1.1rem;flex-shrink:0">' + (iconos[tipo] || 'ℹ️') + '</span>' +
    '<span>' + msg + '</span>';
  container.appendChild(el);

  setTimeout(function () {
    el.style.animation = 'toastOut .3s ease forwards';
    setTimeout(function () { el.remove(); }, 300);
  }, 4000);
}

// ============================================
// 9. CONTADOR ANIMADO
// Uso: animarContador('idElemento', 1234, 1000)
// ============================================
function animarContador(elId, target, duracion) {
  var el = document.getElementById(elId);
  if (!el) return;
  var desde = parseInt(el.textContent.replace(/\D/g, '')) || 0;
  var start = null;
  function step(ts) {
    if (!start) start = ts;
    var p = Math.min((ts - start) / (duracion || 1000), 1);
    var ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(desde + (target - desde) * ease).toLocaleString('es-CL');
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ============================================
// 10. HELPERS DE MODALES
// ============================================
function abrirModal(id) {
  var el = document.getElementById(id);
  if (el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function cerrarModal(id) {
  var el = document.getElementById(id);
  if (el) { el.classList.remove('active'); document.body.style.overflow = ''; }
}

// Cerrar con Escape
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(function (m) {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  }
});

// ============================================
// LOGOUT — manejado en shared.js para que
// funcione en TODAS las páginas automáticamente
// (shared.js se incluye en cada módulo)
// ============================================
document.addEventListener('click', function (e) {
  // Subir desde el target hasta encontrar el botón de logout
  // (necesario porque el SVG interno intercepta el click)
  var boton = null;
  var el = e.target;
  while (el && el !== document.body) {
    if (el.dataset && el.dataset.action === 'logout') {
      boton = el;
      break;
    }
    el = el.parentElement;
  }
  if (!boton) return;

  e.preventDefault();
  e.stopPropagation();

  // Feedback visual inmediato
  boton.style.opacity = '0.4';
  boton.style.pointerEvents = 'none';

  // Cerrar sesión con Clerk si está disponible
  var base = BASE_URL || '';
  var loginUrl = base + '/auth/login.html';

  if (window.Clerk && window.Clerk.signOut) {
    window.Clerk.signOut().then(function () {
      window.location.href = loginUrl;
    }).catch(function () {
      window.location.href = loginUrl; // redirigir de todas formas
    });
  } else if (window.CLERK_INSTANCE && window.CLERK_INSTANCE.signOut) {
    window.CLERK_INSTANCE.signOut().then(function () {
      window.location.href = loginUrl;
    });
  } else {
    // Fallback: redirigir al login directamente
    window.location.href = loginUrl;
  }
});

// ============================================
// HELPER INTERNO
// ============================================
function setTexto(id, valor) {
  var el = document.getElementById(id);
  if (el) el.textContent = valor;
}

// ============================================
// DROPDOWN DEL AVATAR
// Se llama desde cargarHeader() DESPUÉS de que
// el innerHTML del header ya fue inyectado.
// Los <script> dentro de innerHTML no se ejecutan,
// por eso la lógica vive aquí.
// ============================================
function initDropdownHeader() {

  // ── Toggle dropdown: UN SOLO listener en document ──
  // Usamos una bandera para no registrar duplicados
  // si cargarHeader() se llama más de una vez.
  if (document._dropdownListenerActivo) return;
  document._dropdownListenerActivo = true;

  document.addEventListener('click', function (e) {
    var avatar = document.getElementById('headerAvatar');
    var dropdown = document.getElementById('avatarDropdown');
    if (!avatar || !dropdown) return;

    var clickEnAvatar = avatar.contains(e.target);
    var clickEnDropdown = dropdown.contains(e.target);

    if (clickEnAvatar) {
      e.stopPropagation();
      var isOpen = dropdown.classList.contains('open');
      dropdown.classList.toggle('open', !isOpen);
      avatar.classList.toggle('open', !isOpen);
      avatar.setAttribute('aria-expanded', String(!isOpen));
      return;
    }

    if (clickEnDropdown) {
      // Click en link/botón dentro del dropdown — no cerrar aquí
      return;
    }

    // Click fuera → cerrar
    if (dropdown.classList.contains('open')) {
      dropdown.classList.remove('open');
      avatar.classList.remove('open');
      avatar.setAttribute('aria-expanded', 'false');
    }
  });

  // ── Botón "Cerrar Sesión" → abrir modal de confirmación ──
  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el !== document.body) {
      if (el.id === 'dropdownLogoutBtn') {
        e.stopPropagation();
        var dropdown = document.getElementById('avatarDropdown');
        var avatar = document.getElementById('headerAvatar');
        if (dropdown) dropdown.classList.remove('open');
        if (avatar) { avatar.classList.remove('open'); avatar.setAttribute('aria-expanded', 'false'); }
        var overlay = document.getElementById('logoutConfirmOverlay');
        if (overlay) overlay.classList.add('active');
        return;
      }
      el = el.parentElement;
    }
  });

  // ── Botón "CANCELAR" en el modal ──
  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el !== document.body) {
      if (el.id === 'logoutCancelBtn') {
        var overlay = document.getElementById('logoutConfirmOverlay');
        if (overlay) overlay.classList.remove('active');
        return;
      }
      el = el.parentElement;
    }
  });

  // ── Cerrar con Escape ──
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var overlay = document.getElementById('logoutConfirmOverlay');
    var dropdown = document.getElementById('avatarDropdown');
    var avatar = document.getElementById('headerAvatar');
    if (overlay && overlay.classList.contains('active')) {
      overlay.classList.remove('active');
    } else {
      if (dropdown) dropdown.classList.remove('open');
      if (avatar) { avatar.classList.remove('open'); avatar.setAttribute('aria-expanded', 'false'); }
    }
  });

  // ── Sincronizar nombre/rango del dropdown con sidebar ──
  function syncDropdown() {
    var n = document.getElementById('sidebarNombre');
    var r = document.getElementById('sidebarRango');
    var dn = document.getElementById('dropdownNombre');
    var dr = document.getElementById('dropdownRango');
    if (n && dn && n.textContent) dn.textContent = n.textContent;
    if (r && dr && r.textContent) dr.textContent = r.textContent;
  }
  syncDropdown();
  var sn = document.getElementById('sidebarNombre');
  var sr = document.getElementById('sidebarRango');
  if (sn) new MutationObserver(syncDropdown).observe(sn, { childList: true, characterData: true, subtree: true });
  if (sr) new MutationObserver(syncDropdown).observe(sr, { childList: true, characterData: true, subtree: true });
}