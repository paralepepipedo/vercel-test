// ============================================
// lib/niveles.js — Sistema de niveles y rangos
// ============================================
// ÍNDICE
// 1. Constantes del sistema de niveles
// 2. Calcular XP necesario para siguiente nivel
// 3. Calcular rango por grado y nivel
// 4. Render de barra de XP
// 5. Animación de subida de nivel
// ============================================

// ============================================
// 1. CONSTANTES
// ============================================
const XP_BASE_POR_NIVEL = 1000; // XP necesario para subir de nivel 1→2

// Rangos por categoría de grado
const RANGOS = {
  Explorador:  ['Bronce', 'Plata', 'Oro', 'Diamante'], // 1°–3°
  Aventurero:  ['Bronce', 'Plata', 'Oro', 'Diamante'], // 4°–6°
  Maestro:     ['Bronce', 'Plata', 'Oro', 'Diamante'], // 7°–8°
};

const COLORES_RANGO = {
  Bronce:   { color: '#cd7f32', glow: 'rgba(205,127,50,0.4)',  emoji: '🥉' },
  Plata:    { color: '#c0c0c0', glow: 'rgba(192,192,192,0.4)', emoji: '🥈' },
  Oro:      { color: '#facc15', glow: 'rgba(250,204,21,0.4)',  emoji: '🥇' },
  Diamante: { color: '#06b6d4', glow: 'rgba(6,182,212,0.6)',   emoji: '💎' },
};

// ============================================
// 2. XP PARA SIGUIENTE NIVEL
// ============================================
export function xpParaNivel(nivel) {
  // Cada nivel requiere 10% más de XP que el anterior
  return Math.floor(XP_BASE_POR_NIVEL * Math.pow(1.1, nivel - 1));
}

export function xpTotalHastaNivel(nivel) {
  let total = 0;
  for (let i = 1; i < nivel; i++) total += xpParaNivel(i);
  return total;
}

export function nivelDesdeXP(xpTotal) {
  let nivel = 1;
  let xpAcum = 0;
  while (xpAcum + xpParaNivel(nivel) <= xpTotal) {
    xpAcum += xpParaNivel(nivel);
    nivel++;
  }
  return { nivel, xpEnNivel: xpTotal - xpAcum, xpParaSiguiente: xpParaNivel(nivel) };
}

// ============================================
// 3. CALCULAR RANGO
// ============================================
export function calcularRango(gradoActual, nivel) {
  // Categoría por grado
  let categoria = 'Explorador';
  if (gradoActual >= 7)      categoria = 'Maestro';
  else if (gradoActual >= 4) categoria = 'Aventurero';

  // Sub-rango por nivel
  let subRango = 'Bronce';
  if (nivel >= 20)      subRango = 'Diamante';
  else if (nivel >= 12) subRango = 'Oro';
  else if (nivel >= 6)  subRango = 'Plata';

  return {
    categoria,
    subRango,
    nombre:  `${categoria} ${subRango}`,
    ...COLORES_RANGO[subRango],
  };
}

// ============================================
// 4. RENDER BARRA DE XP
// ============================================
export function renderBarraXP(contenedor, xpActual, nivel) {
  const { xpEnNivel, xpParaSiguiente } = nivelDesdeXP(xpActual);
  const pct = Math.min(100, Math.round((xpEnNivel / xpParaSiguiente) * 100));

  contenedor.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:.7rem;color:#94a3b8;font-weight:700;margin-bottom:4px;">
      <span>XP Nivel ${nivel}</span>
      <span>${xpEnNivel.toLocaleString('es-CL')} / ${xpParaSiguiente.toLocaleString('es-CL')}</span>
    </div>
    <div style="height:10px;background:rgba(255,255,255,.1);border-radius:5px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#7c3aed,#06b6d4);border-radius:5px;transition:width 1s ease;position:relative;">
        <div style="position:absolute;top:0;right:0;width:4px;height:100%;background:white;border-radius:2px;animation:barShine 1.5s ease-in-out infinite;opacity:.6;"></div>
      </div>
    </div>
    <div style="font-size:.65rem;color:#64748b;margin-top:3px;">${pct}% al siguiente nivel</div>
  `;
}

// ============================================
// 5. ANIMACIÓN SUBIDA DE NIVEL
// ============================================
export function animarSubidaNivel(nuevoNivel, rango) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:99999;
    background:rgba(7,7,26,.9);backdrop-filter:blur(12px);
    display:flex;align-items:center;justify-content:center;flex-direction:column;
    gap:1.5rem;text-align:center;
    animation:fadeIn .5s ease;
  `;
  overlay.innerHTML = `
    <style>
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes levelUp{0%{transform:scale(.5) rotate(-10deg);opacity:0}60%{transform:scale(1.2) rotate(5deg)}100%{transform:scale(1) rotate(0);opacity:1}}
      @keyframes confetti{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(200px) rotate(720deg);opacity:0}}
    </style>
    <div style="font-size:5rem;animation:levelUp .8s ease forwards;">⬆️</div>
    <div style="font-family:'Press Start 2P',monospace;font-size:1.2rem;color:#facc15;text-shadow:0 0 20px rgba(250,204,21,.8);">¡SUBISTE DE NIVEL!</div>
    <div style="font-family:'Press Start 2P',monospace;font-size:2rem;color:white;">NIVEL ${nuevoNivel}</div>
    <div style="font-family:'Nunito',sans-serif;font-size:1.2rem;color:${rango.color};font-weight:800;">${rango.emoji} ${rango.nombre}</div>
    <div style="font-size:.9rem;color:#94a3b8;font-family:'Nunito',sans-serif;font-weight:700;">¡Sigue así, campeón! 🎉</div>
    <button onclick="this.parentElement.remove()" style="
      background:linear-gradient(135deg,#7c3aed,#6d28d9);border:none;border-radius:10px;
      padding:.875rem 2rem;font-family:'Press Start 2P',monospace;font-size:.55rem;
      color:white;cursor:pointer;box-shadow:0 0 20px rgba(124,58,237,.5);margin-top:.5rem;
    ">CONTINUAR →</button>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => { if (overlay.parentElement) overlay.remove(); }, 8000);
}
