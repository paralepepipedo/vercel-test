// ============================================
// lib/neon.js — Conexión central a Neon DB
// Usado SOLO en /api/*.js (servidor)
// NUNCA importar desde el frontend (expone credenciales)
// ============================================
// ÍNDICE
// 1. Importación del driver Neon
// 2. Pool de conexión singleton
// 3. Función query() principal
// 4. Helpers CRUD genéricos
// 5. Helper de respuesta HTTP
// 6. Helper de autenticación (Clerk verify)
// ============================================

import { neon } from '@neondatabase/serverless';
import { createClerkClient, verifyToken } from '@clerk/backend';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });


// ============================================
// 1. CONEXIÓN SINGLETON
// Se reutiliza entre invocaciones en el mismo
// contenedor Vercel (warm start)
// ============================================
let _sql = null;

function getSQL() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL no definida en variables de entorno');
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// ============================================
// 2. FUNCIÓN QUERY PRINCIPAL
// Uso: await query('SELECT * FROM perfiles WHERE clerk_id = $1', [clerkId])
// ============================================
export async function query(sql, params = []) {
  const sqlFn = getSQL();
  try {
    return await sqlFn(sql, params);
  } catch (err) {
    console.error('[Neon] Error en query:', err.message);
    console.error('[Neon] SQL:', sql);
    throw err;
  }
}

// ============================================
// 3. HELPERS CRUD GENÉRICOS
// ============================================

/** Obtener un perfil por clerk_id */
export async function getPerfil(clerkId) {
  const rows = await query(
    'SELECT * FROM perfiles WHERE clerk_id = $1 LIMIT 1',
    [clerkId]
  );
  return rows[0] || null;
}

/** Actualizar campos del perfil */
export async function updatePerfil(clerkId, campos) {
  const keys = Object.keys(campos);
  const values = Object.values(campos);
  const set = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const rows = await query(
    `UPDATE perfiles SET ${set}, updated_at = NOW() WHERE clerk_id = $1 RETURNING *`,
    [clerkId, ...values]
  );
  return rows[0] || null;
}

/** Agregar monedas y registrar transacción */
export async function agregarMonedas(userId, monto, concepto, referenciaId = null) {
  // Actualizar saldo
  await query(
    'UPDATE perfiles SET monedas = monedas + $1 WHERE id = $2',
    [monto, userId]
  );
  // Registrar transacción
  await query(
    `INSERT INTO transacciones (user_id, tipo, monto, concepto, referencia_id)
     VALUES ($1, 'ganancia', $2, $3, $4)`,
    [userId, monto, concepto, referenciaId]
  );
}

/** Gastar monedas (verifica saldo antes) */
export async function gastarMonedas(userId, monto, concepto) {
  const rows = await query('SELECT monedas FROM perfiles WHERE id = $1', [userId]);
  const perfil = rows[0];
  if (!perfil || perfil.monedas < monto) {
    throw new Error('Saldo insuficiente');
  }
  await query(
    'UPDATE perfiles SET monedas = monedas - $1 WHERE id = $2',
    [monto, userId]
  );
  await query(
    `INSERT INTO transacciones (user_id, tipo, monto, concepto)
     VALUES ($1, 'gasto', $2, $3)`,
    [userId, monto, concepto]
  );
}

/** Agregar XP y calcular subida de nivel */
export async function agregarXP(userId, xp) {
  const XP_POR_NIVEL = 1000; // cada nivel requiere 1000 XP
  const rows = await query(
    'SELECT nivel, xp FROM perfiles WHERE id = $1',
    [userId]
  );
  const perfil = rows[0];
  if (!perfil) return;

  const nuevoXP = perfil.xp + xp;
  const nuevoNivel = Math.floor(nuevoXP / XP_POR_NIVEL) + 1;
  const subioNivel = nuevoNivel > perfil.nivel;

  await query(
    'UPDATE perfiles SET xp = $1, nivel = $2, updated_at = NOW() WHERE id = $3',
    [nuevoXP, nuevoNivel, userId]
  );

  return { subioNivel, nuevoNivel, nuevoXP };
}

/**
 * Actualizar racha diaria del alumno.
 * Llamar desde cualquier acción que cuente para la racha:
 *   - GET /api/perfil (login diario / dashboard)
 *   - POST /api/misiones (completar misión)
 *   - POST /api/tareas (tarea correcta)
 *   - POST /api/juegos (completar juego)
 *
 * Lógica:
 *   - ultimo_login = hoy       → ya contó, no cambiar racha
 *   - ultimo_login = ayer      → racha + 1, actualizar racha_max si aplica
 *   - ultimo_login = hace 2+d  → resetear racha a 1
 *   - nunca logueado           → racha = 1
 */
export async function actualizarRacha(userId) {
  const rows = await query(
    'SELECT racha_dias, racha_max, ultimo_login FROM perfiles WHERE id = $1',
    [userId]
  );
  const p = rows[0];
  if (!p) return;

  const ahora = new Date();
  const hoy = new Date(ahora); hoy.setHours(0, 0, 0, 0);
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);

  let nuevaRacha = p.racha_dias || 0;

  if (p.ultimo_login) {
    const login = new Date(p.ultimo_login); login.setHours(0, 0, 0, 0);
    const loginTs = login.getTime();

    if (loginTs === hoy.getTime()) {
      // Ya entró hoy — no hacer nada
      return;
    } else if (loginTs === ayer.getTime()) {
      // Entró ayer — continúa la racha
      nuevaRacha = nuevaRacha + 1;
    } else {
      // Saltó un día o más — resetear
      nuevaRacha = 1;
    }
  } else {
    // Primera vez
    nuevaRacha = 1;
  }

  const nuevaRachaMax = Math.max(nuevaRacha, p.racha_max || 0);

  await query(
    `UPDATE perfiles
     SET racha_dias = $1, racha_max = $2, ultimo_login = NOW(), updated_at = NOW()
     WHERE id = $3`,
    [nuevaRacha, nuevaRachaMax, userId]
  );

  return { nuevaRacha, nuevaRachaMax };
}

/** Obtener config de economía (con caché en memoria 5 min) */
let _configCache = null;
let _configCacheAt = 0;
export async function getConfigEconomia() {
  const CACHE_MS = 5 * 60 * 1000;
  if (_configCache && Date.now() - _configCacheAt < CACHE_MS) {
    return _configCache;
  }
  const rows = await query('SELECT clave, valor FROM config_economia');
  _configCache = Object.fromEntries(rows.map(r => [r.clave, Number(r.valor)]));
  _configCacheAt = Date.now();
  return _configCache;
}

// ============================================
// 4. HELPER DE RESPUESTA HTTP
// Estandariza todas las respuestas de /api/
// ============================================
export function res(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export function resError(mensaje, status = 400) {
  return res({ error: true, mensaje }, status);
}

// ============================================
// 5. HELPER DE AUTENTICACIÓN CLERK
// Verifica el JWT de Clerk en cada request
// Uso en /api/: const { clerkId } = await verificarAuth(request)
// ============================================
export async function verificarAuth(request) {
  try {
    // Para POST: usar Bearer token (siempre fresco gracias al intervalo)
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (token) {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      return { clerkId: payload.sub, ok: true };
    }

    // Para GET: usar cookie de sesión
    const requestState = await clerkClient.authenticateRequest(request, {
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    });
    if (requestState.isSignedIn) {
      return { clerkId: requestState.toAuth().userId, ok: true };
    }

    throw new Error('No autenticado');
  } catch (err) {
    return { clerkId: null, ok: false, error: err.message };
  }
}