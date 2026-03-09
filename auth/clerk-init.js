// ============================================
// ARCHIVO: /auth/clerk-init.js
// VERSIÓN CORREGIDA — espera el SDK con polling
//
// PROBLEMA ANTERIOR:
//   El SDK de Clerk se carga con `async`, lo que
//   significa que puede tardar unos milisegundos.
//   El evento `window.load` a veces dispara
//   ANTES de que el SDK termine de ejecutarse,
//   causando "Clerk is not defined".
//
// SOLUCIÓN:
//   Polling con setInterval — intenta cada 50ms
//   hasta que window.Clerk esté disponible,
//   con un timeout de 10 segundos.
// ============================================

(function() {
  var TIMEOUT_MS  = 10000; // esperar máximo 10 segundos
  var POLL_MS     = 50;    // revisar cada 50ms
  var elapsed     = 0;

  var base = window.EDUCOINS_BASE || '';

  function esperarClerk() {
    elapsed += POLL_MS;

    // Timeout — algo salió muy mal
    if (elapsed >= TIMEOUT_MS) {
      console.error(
        '[clerk-init] Timeout esperando el SDK de Clerk.\n' +
        'Posibles causas:\n' +
        '  1. No hay internet (el SDK viene de CDN)\n' +
        '  2. La URL del CDN cambió\n' +
        '  3. Un bloqueador de anuncios bloquea clerk.com'
      );
      mostrarErrorVisible('Sin conexión al servicio de autenticación. Verifica tu internet.');
      return;
    }

    // SDK todavía no disponible — esperar más
    if (typeof window.Clerk === 'undefined') {
      setTimeout(esperarClerk, POLL_MS);
      return;
    }

    // SDK disponible — inicializar
    inicializarClerk();
  }

  async function inicializarClerk() {
    // Verificar que tenemos la publishable key
    var pk = window.CLERK_PUBLISHABLE_KEY;
    if (!pk || pk.indexOf('pk_') !== 0) {
      mostrarErrorVisible(
        'Clave de Clerk no configurada.<br>' +
        'Abre <code>auth/clerk-config.js</code> y reemplaza<br>' +
        '<code>pk_test_PEGA_AQUI_TU_CLAVE</code><br>' +
        'con tu clave real del dashboard de Clerk.'
      );
      return;
    }

    try {
      // Inicializar Clerk con la publishable key
      var clerk = new window.Clerk(pk);
      await clerk.load();

      // Si ya tiene sesión → ir al dashboard
      if (clerk.user) {
        window.location.href = base + '/dashboard/dashboard.html';
        return;
      }

      // Configuración de apariencia (colores de EduCoins)
      var apariencia = {
        variables: {
          colorPrimary:         '#7c3aed',
          colorBackground:      '#0f0f2e',
          colorInputBackground: '#1a1a3e',
          colorInputText:       '#e2e8f0',
          colorText:            '#e2e8f0',
          colorTextSecondary:   '#94a3b8',
          colorDanger:          '#ef4444',
          colorSuccess:         '#22c55e',
          borderRadius:         '12px',
          fontFamily:           "'Nunito', sans-serif",
        },
        elements: {
          logoImage: { display: 'none' },
          card: {
            background:   '#0f0f2e',
            border:       '1px solid rgba(124,58,237,0.3)',
            boxShadow:    '0 0 60px rgba(124,58,237,0.15)',
            borderRadius: '20px',
          },
          formButtonPrimary: {
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            fontFamily: "'Press Start 2P', monospace",
            fontSize:   '0.5rem',
          },
        },
      };

      // Montar SignIn o SignUp según qué div existe
      var signInEl  = document.getElementById('clerk-sign-in');
      var signUpEl  = document.getElementById('clerk-sign-up');

      if (signInEl) {
        clerk.mountSignIn(signInEl, {
          appearance:  apariencia,
          redirectUrl: base + '/dashboard/dashboard.html',
          signUpUrl:   base + '/auth/registro.html',
        });
      }

      if (signUpEl) {
        clerk.mountSignUp(signUpEl, {
          appearance:  apariencia,
          redirectUrl: base + '/dashboard/dashboard.html',
          signInUrl:   base + '/auth/login.html',
        });
      }

    } catch (err) {
      console.error('[clerk-init] Error al inicializar:', err);
      mostrarErrorVisible('Error al cargar el login: ' + err.message);
    }
  }

  // Mostrar error legible en pantalla (no solo en consola)
  function mostrarErrorVisible(html) {
    var contenedor = document.getElementById('clerk-sign-in') ||
                     document.getElementById('clerk-sign-up');
    if (contenedor) {
      contenedor.innerHTML =
        '<div style="' +
          'background:rgba(239,68,68,0.1);' +
          'border:1px solid rgba(239,68,68,0.4);' +
          'border-radius:12px;padding:1.5rem;' +
          'color:#fca5a5;font-family:Nunito,sans-serif;' +
          'font-size:.9rem;line-height:1.7;font-weight:700' +
        '">' +
          '⚠️ ' + html +
        '</div>';
    }
  }

  // Arrancar el polling apenas carga el script
  // No esperar a window.load — queremos ser rápidos
  setTimeout(esperarClerk, POLL_MS);

})();
