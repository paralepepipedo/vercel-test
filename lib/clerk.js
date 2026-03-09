// ============================================
// lib/clerk.js — Verificación de auth en APIs
//
// Este archivo corre en el SERVIDOR (Vercel),
// no en el navegador.
//
// Propósito:
//   Verificar que el token JWT que manda el
//   frontend (window.CLERK_TOKEN) es válido
//   y obtener el clerkId del usuario.
//
// Uso en cada /api/*.js:
//   import { verificarAuth } from '../lib/clerk.js';
//   const auth = await verificarAuth(request);
//   if (!auth.ok) return resError('No autorizado', 401);
//   const { clerkId } = auth;
// ============================================

// Clerk provee un SDK para verificar tokens
// en el servidor. Lo importamos desde npm.
// (ya declarado en package.json como dependencia)
import { createClerkClient } from '@clerk/backend';

// Instancia singleton del cliente de Clerk
// Usa la SECRET KEY del servidor (nunca expuesta al frontend)
let _clerkClient = null;

function getClerkClient() {
  if (!_clerkClient) {
    if (!process.env.CLERK_SECRET_KEY) {
      throw new Error('[clerk.js] Falta CLERK_SECRET_KEY en las variables de entorno');
    }
    _clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
  }
  return _clerkClient;
}

// ============================================
// verificarAuth(request)
//
// Extrae el JWT del header Authorization,
// lo verifica con Clerk y retorna el clerkId.
//
// Retorna:
//   { ok: true,  clerkId: 'user_2abc...' }
//   { ok: false, error:   'No autorizado' }
// ============================================
export async function verificarAuth(request) {
  try {
    // 1. Obtener el token del header
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return { ok: false, error: 'Token no proporcionado' };
    }

    // 2. Verificar el token con Clerk
    //    authenticateRequest verifica la firma,
    //    la expiración y que pertenezca a tu app
    const clerk  = getClerkClient();
    const result = await clerk.authenticateRequest(request, {
      // Clerk necesita la publishable key también
      // para verificar el issuer del JWT
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    });

    if (!result.isSignedIn) {
      return { ok: false, error: 'Sesión inválida o expirada' };
    }

    // 3. Extraer el clerkId del payload del token
    const clerkId = result.toAuth().userId;

    return { ok: true, clerkId };

  } catch (err) {
    console.error('[clerk.js] Error verificando token:', err.message);
    return { ok: false, error: 'Error de autenticación' };
  }
}

// ============================================
// verificarAdmin(request, neonQuery)
//
// Igual que verificarAuth pero además verifica
// que el usuario tenga rol 'admin' en Neon.
//
// Uso en /api/admin*.js:
//   const auth = await verificarAdmin(request, query);
//   if (!auth.ok) return resError(auth.error, 403);
// ============================================
export async function verificarAdmin(request, query) {
  const auth = await verificarAuth(request);
  if (!auth.ok) return auth;

  try {
    const rows = await query(
      'SELECT rol FROM perfiles WHERE clerk_id = $1',
      [auth.clerkId]
    );
    if (!rows.length || rows[0].rol !== 'admin') {
      return { ok: false, error: 'Acceso restringido a administradores' };
    }
    return { ok: true, clerkId: auth.clerkId };
  } catch (err) {
    return { ok: false, error: 'Error verificando rol' };
  }
}
