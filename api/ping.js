import { query } from '../lib/neon.js';

export default async function handler(req) {
  try {
    const rows = await query('SELECT 1 AS ok');
    return new Response(JSON.stringify(rows), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
