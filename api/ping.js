import {
  query, getPerfil, verificarAuth, res, resError
} from '../lib/neon.js';

export default async function handler(request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  const auth = await verificarAuth(request);
  if (!auth.ok) return resError('No autorizado', 401);

  const perfil = await getPerfil(auth.clerkId);
  if (!perfil) return resError('Perfil no encontrado', 404);

  return res({ test123: true, nombre: perfil.nombre, timestamp: Date.now() });
}
