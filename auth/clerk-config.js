// ============================================
// ARCHIVO: /auth/clerk-config.js
// ============================================

window.CLERK_PUBLISHABLE_KEY = 'pk_test_bG92aW5nLXJhcHRvci0xLmNsZXJrLmFjY291bnRzLmRldiQ';

// BASE_URL: misma lógica que shared.js
// Lee su propio <script src> para detectar la raíz del proyecto.
// Funciona desde CUALQUIER carpeta (auth/, misiones/, perfil/, etc.)
// sin necesitar lista de exclusiones.
//
// Ejemplo:
//   src="http://localhost/Educoin/auth/clerk-config.js"
//   → extrae "http://localhost/Educoin"
//   → pathname = "/Educoin"
//   → EDUCOINS_BASE = "/Educoin"
window.EDUCOINS_BASE = (function() {
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src || '';
    var match = src.match(/^(.*?)\/auth\/clerk-config\.js/);
    if (match) {
      try {
        var url = new URL(match[1]);
        return url.pathname.replace(/\/$/, '');
      } catch(e) {
        return match[1].replace(/\/$/, '');
      }
    }
  }
  return '';
})();
