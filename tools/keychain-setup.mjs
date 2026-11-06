// One-use, loopback-only form. Secrets go through stdin to Security.framework.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const path = `/setup/${randomBytes(24).toString('hex')}`;
let origin;
const server = createServer(async (req, res) => {
  const send = (code, body) => { res.writeHead(code, { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store', 'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'", 'Referrer-Policy':'same-origin' }); res.end(body); };
  if (req.url !== path) return send(404, '찾을 수 없습니다.');
  if (req.method === 'GET') return send(200, `<!doctype html><html lang="ko"><meta charset="utf-8"><title>면접 일정 키체인 연결</title><style>body{font:16px system-ui;max-width:560px;margin:60px auto;padding:20px}label{display:block;margin-top:20px}input{display:block;width:100%;box-sizing:border-box;padding:12px;margin:8px 0}button{padding:12px 20px;margin-top:20px}</style><h1>면접 일정 키체인 연결</h1><p>이 Mac의 키체인에 연결 토큰 두 개를 저장합니다.</p><form method="POST" autocomplete="off"><label>봇 토큰<input type="password" name="bot" required autocomplete="off"></label><label>앱 연결 토큰<input type="password" name="app" required autocomplete="off"></label><button type="submit">Mac 키체인에 저장</button></form></html>`);
  if (req.method !== 'POST' || req.headers.origin !== origin) return send(403, '접근할 수 없습니다.');
  try {
    let body = '';
    for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 16384) return send(413, '요청이 너무 큽니다.'); }
    const form = new URLSearchParams(body), bot = form.get('bot'), app = form.get('app');
    if (!/^xoxb-[A-Za-z0-9-]+$/.test(bot || '') || !/^xapp-[A-Za-z0-9-]+$/.test(app || '')) return send(400, '토큰 형식을 확인하세요.');
    execFileSync(fileURLToPath(new URL('./keychain-save', import.meta.url)), [], { input: JSON.stringify({ 'slack-interview-bot-token':bot, 'slack-interview-app-token':app }), stdio:['pipe','ignore','ignore'], timeout:30000 });
    send(200, '<!doctype html><html lang="ko"><meta charset="utf-8"><title>키체인 저장 완료</title><h1>키체인 저장 완료</h1><p>봇 토큰과 앱 연결 토큰을 Mac 키체인에 저장했습니다.</p></html>');
    server.close();
  } catch { send(500, '키체인에 저장하지 못했습니다. Mac의 키체인 접근 요청을 확인하세요.'); }
});
server.requestTimeout = 30000;
server.listen(0, '127.0.0.1', () => { origin = `http://127.0.0.1:${server.address().port}`; console.log(origin + path); });
setTimeout(() => server.close(), 600000).unref();
