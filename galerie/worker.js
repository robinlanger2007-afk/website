// Cloudflare Worker für die Kundengalerie von langer-photo.de
// Bindings: BUCKET (R2-Bucket), Secret ADMIN_KEY
// Öffentlich lesbar sind nur die verschlüsselten Galerie-Dateien. Hochladen, Auflisten
// und Löschen geht nur mit dem Admin-Schlüssel.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, PUT, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400'
};
const FILE = /^g\/[0-9a-f]{24}\/(m|[tpo]\/\d{1,6})\.bin$/;
const ID = /^[0-9a-f]{24}$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
function sameKey(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    // Öffentlich: verschlüsselte Dateien lesen
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (path === '' || path === 'ping') return json({ ok: true, bucket: !!env.BUCKET });
      if (FILE.test(path)) {
        const obj = await env.BUCKET.get(path);
        if (!obj) return new Response('Not found', { status: 404, headers: CORS });
        const h = new Headers(CORS);
        h.set('Content-Type', 'application/octet-stream');
        h.set('Content-Length', String(obj.size));
        h.set('ETag', obj.httpEtag);
        h.set('Cache-Control', path.endsWith('/m.bin') ? 'no-store' : 'public, max-age=86400');
        return new Response(req.method === 'HEAD' ? null : obj.body, { headers: h });
      }
    }

    // Ab hier nur mit Admin-Schlüssel
    const auth = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!env.ADMIN_KEY) return json({ error: 'ADMIN_KEY fehlt im Worker' }, 500);
    if (!env.BUCKET) return json({ error: 'R2-Bucket ist nicht als BUCKET verbunden' }, 500);
    if (!sameKey(auth, env.ADMIN_KEY)) return json({ error: 'Falscher Admin-Schlüssel' }, 401);

    if (path === 'admin/check') return json({ ok: true });

    if (req.method === 'PUT' && FILE.test(path)) {
      await env.BUCKET.put(path, req.body, { httpMetadata: { contentType: 'application/octet-stream' } });
      return json({ ok: true }, 201);
    }

    if (req.method === 'GET' && path === 'admin/list') {
      const out = [];
      let cursor;
      do {
        const r = await env.BUCKET.list({ prefix: 'g/', cursor, limit: 1000 });
        r.objects.forEach(o => out.push({ key: o.key, size: o.size }));
        cursor = r.truncated ? r.cursor : undefined;
      } while (cursor);
      return json({ objects: out });
    }

    if (req.method === 'POST' && path === 'admin/delete') {
      const { id } = await req.json().catch(() => ({}));
      if (!ID.test(id || '')) return json({ error: 'Ungültige Galerie' }, 400);
      let n = 0;
      for (;;) {
        const r = await env.BUCKET.list({ prefix: 'g/' + id + '/', limit: 1000 });
        const keys = r.objects.map(o => o.key);
        if (!keys.length) break;
        await env.BUCKET.delete(keys);
        n += keys.length;
      }
      return json({ ok: true, deleted: n });
    }

    return json({ error: 'Nicht gefunden' }, 404);
  }
};
