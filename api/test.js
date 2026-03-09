import { neon } from '@neondatabase/serverless';

export default async function handler(req) {
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20));
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    console.log('neon() created OK');
    const rows = await sql('SELECT 1 AS ok');
    console.log('query result:', rows);
    return new Response(JSON.stringify(rows), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.log('ERROR:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
