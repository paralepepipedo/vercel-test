// ============================================
// lib/telegram.js — Alertas por Telegram Bot
// Usado desde: /api/ (servidor) y como cron
// ============================================
// ÍNDICE
// 1. Función principal: enviarAlertaEvaluacion()
// 2. Verificar si debe enviar alerta (3 días o menos)
// 3. Chequeo masivo (para cron job o login diario)
// 4. Formatear mensaje
// ============================================

// ============================================
// 1. ENVIAR ALERTA DE EVALUACIÓN
// Llamar desde servidor (/api/) para no exponer el token
// ============================================
export async function enviarAlertaEvaluacion(evaluacion, usuario) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = usuario.telegram_chat_id;

  if (!token || !chatId) {
    console.warn('[Telegram] Token o chat_id no configurados para usuario:', usuario.nombre);
    return { ok: false, razon: 'Sin configuración de Telegram' };
  }

  const diasRestantes = calcularDiasRestantes(evaluacion.fecha_evaluacion);
  if (diasRestantes > 3 || diasRestantes < 0) {
    return { ok: false, razon: 'No corresponde enviar alerta (más de 3 días o ya pasó)' };
  }

  const mensaje = formatearMensaje(evaluacion, usuario, diasRestantes);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    chatId,
          text:       mensaje,
          parse_mode: 'HTML',
        }),
      }
    );

    const data = await response.json();
    if (!data.ok) {
      console.error('[Telegram] Error al enviar:', data.description);
      return { ok: false, razon: data.description };
    }

    return { ok: true, message_id: data.result.message_id };
  } catch (err) {
    console.error('[Telegram] Error de red:', err.message);
    return { ok: false, razon: err.message };
  }
}

// ============================================
// 2. VERIFICAR SI CORRESPONDE ALERTAR
// ============================================
export function calcularDiasRestantes(fechaEvaluacion) {
  const hoy   = new Date();
  const fecha = new Date(fechaEvaluacion + 'T00:00:00');
  hoy.setHours(0, 0, 0, 0);
  const diffMs   = fecha - hoy;
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDias;
}

export function debeAlertarse(evaluacion) {
  if (['rendida', 'nota_ingresada'].includes(evaluacion.estado)) return false;
  const dias = calcularDiasRestantes(evaluacion.fecha_evaluacion);
  return dias >= 0 && dias <= 3;
}

// ============================================
// 3. CHEQUEO MASIVO — para login diario
// Recibe array de evaluaciones y datos del usuario
// ============================================
export async function chequearAlertas(evaluaciones, usuario) {
  const resultados = [];

  for (const ev of evaluaciones) {
    if (!debeAlertarse(ev)) continue;

    const resultado = await enviarAlertaEvaluacion(ev, usuario);
    resultados.push({ evaluacion_id: ev.id, ...resultado });

    // Pequeña pausa entre mensajes (evitar rate limit de Telegram)
    await new Promise(r => setTimeout(r, 300));
  }

  return resultados;
}

// ============================================
// 4. FORMATEAR MENSAJE
// ============================================
function formatearMensaje(evaluacion, usuario, diasRestantes) {
  const emojisAsignatura = {
    'Matematicas': '➗',
    'Lenguaje':    '📖',
    'Historia':    '🏛️',
    'Ciencias':    '🔬',
    'Ingles':      '🇬🇧',
    'Ed. Fisica':  '⚽',
    'Musica':      '🎵',
    'Artes':       '🎨',
    'Tecnologia':  '💻',
  };

  const emoji       = emojisAsignatura[evaluacion.asignatura] || '📚';
  const urgencia    = diasRestantes === 0 ? '🚨 ¡ES HOY!' : diasRestantes === 1 ? '⚠️ ¡MAÑANA!' : `⏰ En ${diasRestantes} días`;
  const fechaFormat = new Date(evaluacion.fecha_evaluacion + 'T00:00:00')
    .toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  let mensaje = `
🎓 <b>EduCoins — Alerta de Evaluación</b>

Hola <b>${usuario.nombre}</b> ${urgencia}

${emoji} <b>${evaluacion.asignatura}</b>
📅 <b>Fecha:</b> ${fechaFormat}
📊 <b>Estado:</b> ${evaluacion.estado === 'pendiente' ? '⏳ Sin estudiar' : '📖 Estudiando'}
`.trim();

  if (evaluacion.nota_esperada) {
    mensaje += `\n🎯 <b>Meta:</b> ${evaluacion.nota_esperada} (rango ${evaluacion.rango_min}–${evaluacion.rango_max})`;
  }

  if (evaluacion.contenidos) {
    const contenidoCorto = evaluacion.contenidos.length > 200
      ? evaluacion.contenidos.substring(0, 200) + '...'
      : evaluacion.contenidos;
    mensaje += `\n\n📝 <b>Contenidos:</b>\n${contenidoCorto}`;
  }

  mensaje += `\n\n💪 ¡Tú puedes! Marca la prueba como "estudiada" en EduCoins para ganar monedas extra 🪙`;

  return mensaje;
}
