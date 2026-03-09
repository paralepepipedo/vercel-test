// ============================================
// lib/utils.js — Funciones auxiliares compartidas
// Importado desde cualquier página del frontend
// ============================================
// ÍNDICE
// 1. Redimensionar imagen con canvas (antes de subir)
// 2. Formatear números y fechas en español Chile
// 3. Toasts / notificaciones UI
// 4. Loader / spinner global
// 5. Formatear nota con color
// 6. Calcular grado actual
// 7. Debounce y throttle
// ============================================

// ============================================
// 1. REDIMENSIONAR IMAGEN CON CANVAS
// Siempre usar antes de subir a almacenamiento.
// Máx: 800px ancho, calidad JPEG 0.75
// NUNCA guardar base64 en DB — solo la URL pública
// ============================================
export async function redimensionarImagen(file, maxAncho = 800, calidad = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let ancho  = img.width;
        let alto   = img.height;

        // Solo redimensionar si es más ancha que el máximo
        if (ancho > maxAncho) {
          alto  = Math.round((alto * maxAncho) / ancho);
          ancho = maxAncho;
        }

        canvas.width  = ancho;
        canvas.height = alto;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, ancho, alto);

        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Error al comprimir imagen')); return; }
            // Crear File con nombre .jpg
            const nombreFinal = file.name.replace(/\.[^.]+$/, '') + '.jpg';
            const fileComprimido = new File([blob], nombreFinal, { type: 'image/jpeg' });
            resolve(fileComprimido);
          },
          'image/jpeg',
          calidad
        );
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src     = e.target.result;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}

// ============================================
// 2. FORMATEAR NÚMEROS Y FECHAS
// ============================================
export function formatearMonedas(n) {
  return Number(n).toLocaleString('es-CL') + ' 🪙';
}

export function formatearNota(nota) {
  return Number(nota).toFixed(1);
}

export function formatearFecha(fechaStr, opciones = {}) {
  const defaults = { day: 'numeric', month: 'long', year: 'numeric' };
  return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-CL', { ...defaults, ...opciones });
}

export function formatearFechaCorta(fechaStr) {
  return formatearFecha(fechaStr, { day: 'numeric', month: 'short' });
}

export function tiempoRelativo(fechaStr) {
  const diff = Date.now() - new Date(fechaStr).getTime();
  const min  = Math.floor(diff / 60000);
  const hrs  = Math.floor(min / 60);
  const dias = Math.floor(hrs / 24);
  if (min < 1)   return 'ahora';
  if (min < 60)  return `hace ${min} min`;
  if (hrs < 24)  return `hace ${hrs} hr`;
  return `hace ${dias} días`;
}

// ============================================
// 3. TOASTS
// ============================================
export function toast(mensaje, tipo = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;bottom:2rem;right:2rem;z-index:10001;display:flex;flex-direction:column;gap:.75rem;';
    document.body.appendChild(container);
  }

  const iconos = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️', coins: '🪙', level: '⬆️' };
  const colores = {
    success: 'rgba(34,197,94,0.4)',
    warning: 'rgba(250,204,21,0.4)',
    error:   'rgba(239,68,68,0.4)',
    info:    'rgba(6,182,212,0.4)',
    coins:   'rgba(250,204,21,0.4)',
    level:   'rgba(124,58,237,0.4)',
  };

  const el = document.createElement('div');
  el.style.cssText = `
    background:#0d0d2b;border:1px solid ${colores[tipo] || colores.info};
    border-radius:12px;padding:.875rem 1.25rem;
    display:flex;align-items:center;gap:.75rem;
    min-width:260px;max-width:380px;
    box-shadow:0 4px 20px rgba(0,0,0,.4);
    font-family:'Nunito',sans-serif;font-weight:700;font-size:.875rem;
    color:#e2e8f0;animation:toastIn .3s ease forwards;
  `;
  el.innerHTML = `
    <span style="font-size:1.1rem;flex-shrink:0">${iconos[tipo] || 'ℹ️'}</span>
    <span>${mensaje}</span>
  `;

  // Agregar keyframe si no existe
  if (!document.getElementById('toast-style')) {
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = `
      @keyframes toastIn  { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
      @keyframes toastOut { from{transform:translateX(0);opacity:1} to{transform:translateX(100%);opacity:0} }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(el);

  setTimeout(() => {
    el.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ============================================
// 4. LOADER GLOBAL
// ============================================
export function showLoader(texto = 'Cargando...') {
  let loader = document.getElementById('globalLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'globalLoader';
    loader.style.cssText = `
      position:fixed;inset:0;z-index:9998;
      background:rgba(7,7,26,.85);backdrop-filter:blur(8px);
      display:flex;align-items:center;justify-content:center;
      flex-direction:column;gap:1rem;
      font-family:'Press Start 2P',monospace;font-size:.6rem;color:#a855f7;
    `;
    loader.innerHTML = `
      <div style="width:48px;height:48px;border:3px solid rgba(124,58,237,.3);border-top-color:#7c3aed;border-radius:50%;animation:spin 1s linear infinite;"></div>
      <span id="loaderTexto">${texto}</span>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    `;
    document.body.appendChild(loader);
  } else {
    document.getElementById('loaderTexto').textContent = texto;
    loader.style.display = 'flex';
  }
}

export function hideLoader() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.style.display = 'none';
}

// ============================================
// 5. NOTA CON COLOR
// ============================================
export function notaConColor(nota) {
  const n = Number(nota);
  if (n >= 6.0) return { color: '#22c55e', texto: formatearNota(n), emoji: '⭐' };
  if (n >= 5.0) return { color: '#06b6d4', texto: formatearNota(n), emoji: '✅' };
  if (n >= 4.0) return { color: '#facc15', texto: formatearNota(n), emoji: '⚠️' };
  return             { color: '#ef4444', texto: formatearNota(n), emoji: '❌' };
}

// ============================================
// 6. CALCULAR GRADO ACTUAL
// ============================================
export function calcularGradoActual(gradoIngreso, anioIngreso) {
  const anioActual = new Date().getFullYear();
  return Math.min(gradoIngreso + (anioActual - anioIngreso), 8);
}

// ============================================
// 7. DEBOUNCE Y THROTTLE
// ============================================
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function throttle(fn, ms = 300) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}
