const API = 'https://dpcarswiki.com/api.php';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
};

function response(body, init = {}) {
  const headers = new Headers(init.headers);
  Object.entries(CORS).forEach(([key, value]) => headers.set(key, value));
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(body, { ...init, headers });
}

function withCors(original) {
  return response(original.body, {
    status: original.status,
    statusText: original.statusText,
    headers: original.headers
  });
}

async function api(params) {
  const url = new URL(API);
  Object.entries({ format: 'json', origin: '*', ...params }).forEach(([key, value]) => url.searchParams.set(key, value));
  let response;
  try {
    response = await Promise.race([
      fetch(url),
      new Promise((resolve, reject) => setTimeout(() => reject(new Error(`A DPCarsWiki não respondeu em 25 segundos (${params.action || 'consulta'}).`)), 25000))
    ]);
  } catch (error) {
    throw error;
  }
  if (!response.ok) throw new Error(`DPCarsWiki respondeu ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(`DPCarsWiki API: ${data.error.info || data.error.code || 'erro desconhecido'}`);
  return data;
}

function orthosFromText(text = '') {
  const block = text.match(/\{\{\s*Orthos\b([\s\S]*?)\}\}/i);
  if (!block) return [];
  const images = [];
  for (const view of ['front', 'right', 'left', 'back', 'top', 'bottom']) {
    const match = block[1].match(new RegExp(`\\|\\s*${view}\\s*=\\s*(?:\\[\\[)?(?:File:|Image:)?([^|\\]\\n}]+)`, 'i'));
    if (match?.[1]) images.push({ view, file: match[1].trim().replace(/_/g, ' ') });
  }
  return images;
}

const chunks = (items, size = 50) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));

async function characters() {
  const listing = await api({ action: 'query', list: 'embeddedin', eititle: 'Template:Orthos', einamespace: '0', eilimit: 'max' });
  const embedded = listing.query?.embeddedin || [];
  const pages = [];
  const files = new Set();

  for (const batch of chunks(embedded.map(item => item.title))) {
    const result = await api({ action: 'query', prop: 'images', titles: batch.join('|'), imlimit: 'max' });
    Object.values(result.query?.pages || {}).forEach(page => {
      const pageFiles = (page.images || []).map(image => String(image.title || '').replace(/^File:/i, ''));
      const preview = pageFiles.find(file => /front|frente/i.test(file)) || pageFiles[0];
      if (preview) files.add(preview);
      pages.push({ title: page.title, pageid: page.pageid, preview });
    });
  }

  const urls = new Map();
  for (const batch of chunks([...files])) {
    const result = await api({ action: 'query', prop: 'imageinfo', titles: batch.map(file => `File:${file}`).join('|'), iiprop: 'url' });
    Object.values(result.query?.pages || {}).forEach(page => {
      const file = String(page.title || '').replace(/^File:/i, '');
      if (page.imageinfo?.[0]?.url) urls.set(file, page.imageinfo[0].url);
    });
  }

  return pages.sort((a, b) => a.title.localeCompare(b.title)).map(page => ({
    title: page.title,
    pageid: page.pageid,
    url: `https://dpcarswiki.com/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`,
    thumbnail: page.preview ? urls.get(page.preview.file) || null : null,
    previewView: page.preview?.view || null
  }));
}

function viewFromFile(file) {
  const match = String(file).match(/front|frente|back|traseira|right|direita|left|esquerda|top|cima|bottom|baixo|side|lado/i);
  return match ? match[0] : 'vista';
}

async function orthos(title) {
  const result = await api({ action: 'query', prop: 'images', titles: title, imlimit: 'max' });
  const page = Object.values(result.query?.pages || {})[0];
  const allFiles = (page?.images || []).map(image => String(image.title || '').replace(/^File:/i, ''));
  const files = allFiles.filter(file => /front|frente|back|traseira|right|direita|left|esquerda|top|cima|bottom|baixo|side|lado|ortho|view/i.test(file));
  const selectedFiles = files.length ? files : allFiles;
  const images = [];
  if (selectedFiles.length) {
    const media = await api({ action: 'query', prop: 'imageinfo', titles: selectedFiles.map(file => `File:${file}`).join('|'), iiprop: 'url' });
    const urls = new Map(Object.values(media.query?.pages || {}).map(item => [String(item.title || '').replace(/^File:/i, ''), item.imageinfo?.[0]?.url]));
    selectedFiles.forEach(file => { if (urls.get(file)) images.push({ view: viewFromFile(file), file, url: urls.get(file) }); });
  }
  return { title: page?.title || title, url: `https://dpcarswiki.com/wiki/${encodeURIComponent((page?.title || title).replaceAll(' ', '_'))}`, images };
}

async function media(continuation = null, limit = 50) {
  const result = await api({
    action: 'query',
    list: 'categorymembers',
    cmtitle: 'Category:Orthographic views',
    cmtype: 'file',
    cmlimit: String(Math.min(Math.max(Number(limit) || 50, 1), 100)),
    ...(continuation ? { cmcontinue: continuation } : {})
  });
  const files = (result.query?.categorymembers || []).map(item => String(item.title || '').replace(/^File:/i, ''));
  return { media: files.map(title => ({ title })), continuation: result.continue?.cmcontinue || null };
}

async function previews(files) {
  const result = await api({ action: 'query', prop: 'imageinfo', titles: files.map(file => `File:${file}`).join('|'), iiprop: 'url', iiurlwidth: '640' });
  return Object.values(result.query?.pages || {}).map(page => {
    const info = page.imageinfo?.[0];
    return { title: String(page.title || '').replace(/^File:/i, ''), url: info?.thumburl || info?.url || null };
  }).filter(item => item.url);
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return response(null, { status: 204 });
    try {
      const url = new URL(request.url);
      const action = url.searchParams.get('action');
      if (action === 'media') {
        const cacheKey = new Request(url.toString());
        const cached = await caches.default.match(cacheKey);
        if (cached) return withCors(cached);
        const payload = await media(url.searchParams.get('continue'), url.searchParams.get('limit'));
        const cachedResponse = response(JSON.stringify(payload), { headers: { 'Cache-Control': 'public, max-age=21600' } });
        ctx.waitUntil(caches.default.put(cacheKey, cachedResponse.clone()));
        return cachedResponse;
      }
      if (action === 'image') {
        const remote = new URL(url.searchParams.get('url') || '');
        if (remote.hostname !== 'dpcarswiki.com' || !remote.pathname.startsWith('/images/')) throw new Error('Imagem inválida.');
        const image = await fetch(remote.toString(), { headers: { referer: 'https://dpcarswiki.com/' } });
        if (!image.ok) throw new Error(`Imagem respondeu ${image.status}`);
        return response(image.body, { headers: { 'Content-Type': image.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } });
      }
      const files = (url.searchParams.get('files') || '').split('|').filter(Boolean).slice(0,50);
      const body = action === 'previews' && files.length ? { previews: await previews(files) } : action === 'characters' ? { characters: await characters() } : action === 'orthos' && url.searchParams.get('title') ? await orthos(url.searchParams.get('title')) : { service: 'Pixar Orthos API', endpoints: ['?action=media', '?action=previews&files=Example.png', '?action=characters', '?action=orthos&title=Doc%20Hudson'] };
      return response(JSON.stringify(body), { headers: { 'Cache-Control': 'public, max-age=3600' } });
    } catch (error) {
      console.error('Pixar Orthos API failure:', error?.stack || error?.message || String(error));
      return response(JSON.stringify({ error: 'Não foi possível consultar a DPCarsWiki.', detail: error.message }), { status: 502 });
    }
  }
};
