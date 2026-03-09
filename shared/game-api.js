// ============================================
// shared/game-api.js — Helper para juegos individuales
// Incluir DESPUÉS de shared.js en cada juego:
//   <script src="../../shared/game-api.js"></script>
//
// USO en el juego, al finalizar la partida:
//   GameAPI.completar({ puntos: 1200, duracion_seg: 90 })
//     .then(function(data) {
//       // data.monedas_ganadas, data.xp_ganado, data.misiones_completadas
//     });
// ============================================

var GameAPI = (function () {

  // Lee el token del sessionStorage (guardado por lanzarJuego en el lobby)
  function getToken() {
    return window.CLERK_TOKEN || null;
  }

  function getJuegoId() {
    return sessionStorage.getItem('juego_id') || null;
  }

  function getSessionId() {
    return sessionStorage.getItem('juego_session_id') || null;
  }

  function limpiarSesion() {
    sessionStorage.removeItem('juego_session_id');
    sessionStorage.removeItem('juego_id');
  }

  // ============================================
  // Notificar al servidor que la partida se completó
  // opciones: { puntos, duracion_seg }
  // Retorna Promise<{ monedas_ganadas, xp_ganado, misiones_completadas }>
  // ============================================
  function completar(opciones) {
    var token = getToken();
    var juegoId = getJuegoId();
    var sessionId = getSessionId();

    if (!token || !juegoId) {
      // Sin sesión: no se registra la partida
      return Promise.resolve({ monedas_ganadas: 0, xp_ganado: 0, misiones_completadas: [] });
    }

    var body = {
      action: 'completar',
      juego_id: juegoId,
      puntos: opciones.puntos || 0,
      duracion_seg: opciones.duracion_seg || 0,
      session_id: sessionId,
    };

    return fetch(BASE_URL + '/api/juegos', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
      },
      body: JSON.stringify(body),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) {
          limpiarSesion();
          mostrarResultado(data);
        }
        return data;
      })
      .catch(function (err) {
        console.warn('[game-api] Error al registrar partida:', err);
        return { monedas_ganadas: 0, xp_ganado: 0, misiones_completadas: [] };
      });
  }

  // ============================================
  // Mostrar notificación de monedas ganadas en pantalla
  // ============================================
  function mostrarResultado(data) {
    var monedas = Number(data.monedas_ganadas || 0);
    var misiones = data.misiones_completadas || [];
    if (monedas <= 0) return;

    // Banner flotante de recompensa
    var banner = document.createElement('div');
    banner.style.cssText = [
      'position:fixed', 'bottom:1.5rem', 'left:50%', 'transform:translateX(-50%)',
      'background:linear-gradient(135deg,rgba(124,58,237,.95),rgba(6,182,212,.8))',
      'border:1px solid rgba(250,204,21,.5)', 'border-radius:12px',
      'padding:.875rem 1.5rem', 'z-index:9999',
      'font-family:"Press Start 2P",monospace', 'font-size:.55rem', 'color:white',
      'text-align:center', 'box-shadow:0 4px 24px rgba(0,0,0,.5)',
      'animation:fadeInUp .4s ease',
    ].join(';');

    var coinSrc = BASE_URL + '/shared/coin.png';
    var html = '<div>🎉 +' + monedas.toLocaleString('es-CL') +
      ' <img src="' + coinSrc + '" style="width:1rem;height:1rem;vertical-align:middle;" alt="🪙"> EDUCOIN' + (monedas !== 1 ? 'S' : '') + '</div>';
    if (misiones.length > 0) {
      html += '<div style="font-size:.38rem;color:var(--yellow);margin-top:.4rem">' +
        '🎯 ' + misiones.length + ' misión' + (misiones.length !== 1 ? 'es' : '') + ' completada' + (misiones.length !== 1 ? 's' : '') +
        '</div>';
    }
    banner.innerHTML = html;
    document.body.appendChild(banner);

    // Añadir keyframe si no existe
    if (!document.getElementById('gameApiStyles')) {
      var style = document.createElement('style');
      style.id = 'gameApiStyles';
      style.textContent = '@keyframes fadeInUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
      document.head.appendChild(style);
    }

    setTimeout(function () {
      banner.style.opacity = '0';
      banner.style.transition = 'opacity .5s';
      setTimeout(function () { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 600);
    }, 4000);
  }

  return { completar: completar, getToken: getToken, getJuegoId: getJuegoId };
})();
