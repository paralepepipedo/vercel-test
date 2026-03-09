export default async function handler(request) {
  return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

Crea un repo nuevo en GitHub llamado `vercel-test`, sube estos 3 archivos (recuerda crear la carpeta `api` dentro), conéctalo a Vercel como proyecto nuevo y prueba:
```
https://vercel-test-xxx.vercel.app/api/ping
