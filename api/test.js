import { neon } from '@neondatabase/serverless';

export default async function handler(req) {
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql('SELECT 1 AS ok');
  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json' }
  });
}
