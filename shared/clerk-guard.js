// ============================================
// ARCHIVO: /shared/clerk-guard.js
//
// USO EN CADA HTML PROTEGIDO:
//
//   En el <head> (ANTES de cualquier otro script):
//   <script
//     data-clerk-publishable-key="pk_test_..."
//     src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js"
//   ></script>
//
//   Al final del <body>:
//   <script src="../auth/clerk-config.js"></script>
//   <script src="../shared/clerk-guard.js"></script>
//   <script src="../shared/shared.js"></script>
//   <script src="misiones.js"></script>
//
// IMPORTANTE:
//   El script del SDK va en el <head> SIN async NI defer
//   con data-clerk-publishable-key en el tag.
//   Así el SDK carga de forma síncrona y crea
//   window.Clerk antes de que clerk-guard.js corra.
// ============================================

(function () {
  'use strict';

  // Ocultar contenido hasta verificar sesión
  document.documentElement.style.visibility = 'hidden';

  var base = window.EDUCOINS_BASE || '';
  var loginUrl = base + '/auth/login.html';

  // Verificar que el SDK está disponible
  // (debería estarlo porque cargó en el head sin async)
  if (typeof window.Clerk === 'undefined') {
    console.warn('[guard] window.Clerk no disponible — mostrando página en modo dev');
    document.documentElement.style.visibility = 'visible';
    dispararMock();
    return;
  }

  // Inicializar y verificar sesión
  window.Clerk.load().then(function () {
    // Sin sesión → login
    if (!window.Clerk.user) {
      window.location.href = loginUrl;
      return;
    }

    // Con sesión → exponer datos y mostrar página
    window.CLERK_INSTANCE = window.Clerk;
    window.CLERK_USER = {
      id: window.Clerk.user.id,
      username: window.Clerk.user.username || window.Clerk.user.firstName || 'Alumno',
      email: window.Clerk.user.primaryEmailAddress
        ? window.Clerk.user.primaryEmailAddress.emailAddress : '',
      firstName: window.Clerk.user.firstName || '',
      lastName: window.Clerk.user.lastName || '',
      imageUrl: window.Clerk.user.imageUrl || '',
    };

    // Obtener token y renovarlo cada 50 segundos
    function renovarToken() {
      window.Clerk.session.getToken().then(function (token) {
        window.CLERK_TOKEN = token;
      }).catch(function () {
        window.CLERK_TOKEN = null;
      });
    }
    renovarToken();
    setInterval(renovarToken, 50000);

    document.documentElement.style.visibility = 'visible';
    document.dispatchEvent(new CustomEvent('clerkReady', {
      detail: window.CLERK_USER,
    }));

    // Manejar botón de logout
    // NOTA: usamos 'closest' desde e.target para capturar clicks
    // en elementos hijos (SVG, path, line) del botón logout.
    // El SVG interno intercepta el click — closest() sube al <button>.
    document.addEventListener('click', function (e) {
      var boton = null;
      // Intentar closest() primero (funciona en todos los browsers modernos)
      if (e.target && typeof e.target.closest === 'function') {
        boton = e.target.closest('[data-action="logout"]');
      }
      // Fallback: revisar el target directo
      if (!boton && e.target && e.target.dataset && e.target.dataset.action === 'logout') {
        boton = e.target;
      }
      if (boton) {
        e.preventDefault();
        e.stopPropagation();
        // Feedback visual inmediato mientras Clerk procesa
        boton.style.opacity = '0.5';
        boton.style.pointerEvents = 'none';
        window.Clerk.signOut().then(function () {
          window.location.href = loginUrl;
        }).catch(function (err) {
          console.error('[guard] Error al cerrar sesión:', err);
          boton.style.opacity = '';
          boton.style.pointerEvents = '';
        });
      }
    });

  }).catch(function (err) {
    console.error('[guard] Error al cargar Clerk:', err);
    document.documentElement.style.visibility = 'visible';
    dispararMock();
  });

  // Modo desarrollo: si Clerk no está disponible,
  // disparar un usuario mock para que el resto funcione
  function dispararMock() {
    document.dispatchEvent(new CustomEvent('clerkReady', {
      detail: {
        id: 'dev_user', username: 'Desarrollo',
        email: 'dev@local', firstName: 'Dev', lastName: '', imageUrl: '',
      },
    }));
  }

})();
