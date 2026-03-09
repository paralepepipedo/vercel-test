import { verificarAuth, getPerfil, resError } from '../lib/neon.js';

export default async function handler(req) {
  try {
    const auth = await verificarAuth(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const perfil = await getPerfil(auth.clerkId);
    return new Response(JSON.stringify({ ok: true, perfil: perfil ? perfil.nombre : null }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
