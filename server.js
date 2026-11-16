// 꼬순내 마켓 로컬 서버 (의존성 없음, Node 18+)
// 브라우저는 키를 모르고, 이 서버가 .env의 키로 Anthropic API를 대신 호출합니다.
const http = require('http');
const fs = require('fs');
const path = require('path');

function loadEnv(file = path.join(__dirname, '.env')) {
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !m[1].startsWith('#') && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  } catch { /* .env 없음 */ }
}
loadEnv();

const MODELS = () => ({
  quick: process.env.MODEL_QUICK || 'claude-haiku-5-5',
  default: process.env.MODEL_DEFAULT || 'claude-sonnet-5-5',
  complex: process.env.MODEL_COMPLEX || 'claude-opus-5-5',
});
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
const readBody = (req) => new Promise((resolve, reject) => {
  let b = ''; req.on('data', (c) => { b += c; if (b.length > 200_000) { reject(new Error('too large')); req.destroy(); } });
  req.on('end', () => resolve(b)); req.on('error', reject);
});

async function ask(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(res, 500, { code: 'no_key', message: '.env 파일에 ANTHROPIC_API_KEY가 없어요. 키를 넣고 서버를 다시 시작해 주세요.' });
  let body;
  try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { message: '요청 형식이 올바르지 않아요.' }); }
  const msgs = body.messages;
  if (!Array.isArray(msgs) || !msgs.length || msgs.length > 40 ||
      !msgs.every((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.length < 30000)) {
    return json(res, 400, { message: 'messages 형식이 올바르지 않아요.' });
  }
  const model = MODELS()[body.tier] || MODELS().quick;
  let up;
  try {
    up = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 700, stream: true, messages: msgs }),
    });
  } catch { return json(res, 502, { message: 'Anthropic 서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.' }); }
  if (!up.ok) {
    let m = ''; try { m = (await up.json()).error.message; } catch {}
    const msg = up.status === 401 ? 'API 키가 올바르지 않아요. .env의 키를 확인해 주세요.' : `Anthropic 오류(${up.status}) ${m}`;
    return json(res, up.status === 429 ? 429 : 502, { message: msg });
  }
  res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache' });
  try { for await (const chunk of up.body) res.write(chunk); } catch { /* 연결 종료 */ }
  res.end();
}

function serveStatic(req, res) {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
  const file = path.join(__dirname, 'public', rel);
  if (!file.startsWith(path.join(__dirname, 'public') + path.sep)) return json(res, 403, { message: 'forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) return json(res, 404, { message: 'not found' });
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

async function handler(req, res) {
  const url = (req.url || '/').split('?')[0];
  if (req.method === 'GET' && url === '/api/health') return json(res, 200, { keyLoaded: !!process.env.ANTHROPIC_API_KEY, models: MODELS() });
  if (req.method === 'POST' && url === '/api/ask') return ask(req, res);
  if (req.method === 'GET') return serveStatic(req, res);
  return json(res, 405, { message: 'method not allowed' });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  http.createServer(handler).listen(port, '127.0.0.1', () => {
    console.log(`꼬순내 마켓 로컬 서버: http://localhost:${port}   (관리자: http://localhost:${port}/#admin)`);
    console.log(process.env.ANTHROPIC_API_KEY ? '✅ .env에서 API 키를 읽었어요.' : '⚠️  .env에 ANTHROPIC_API_KEY가 없어요. AI 답변을 쓰려면 키를 넣고 다시 시작해 주세요.');
  });
}
module.exports = { handler, loadEnv };
