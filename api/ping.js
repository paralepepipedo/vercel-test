import { verificarAuth, resError } from '../lib/neon.js';

export default async function handler(req) {
  try {
    const auth = await verificarAuth(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: 'No autorizado', detail: auth.error }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ ok: true, clerkId: auth.clerkId }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
