const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const storage = require('./storage');

const root = __dirname;
let port = Number(process.env.PORT || 4173);
const host = '127.0.0.1';
let origin = `http://${host}:${port}`;
const desktopLocalOnly = process.env.ALATARS_GRAPH_DESKTOP_LOCAL_ONLY === '1';
const publicFiles = new Set(['/index.html','/styles.css','/app.js','/demo-data.js','/connections.js','/vendor/cytoscape.min.js','/assets/alatar-mark.png']);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png'};
const contentSecurityPolicy = desktopLocalOnly
  ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'"
  : "default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com; frame-src https://accounts.google.com; object-src 'none'; base-uri 'none'";
function json(res, status, body) { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(body)); }
function readBody(req) {
  return new Promise((resolve,reject) => {
    let bytes = 0, chunks = [];
    req.on('data',chunk => { bytes += chunk.length; if (bytes <= 2_100_000) chunks.push(chunk); });
    req.on('end',() => { if (bytes > 2_100_000) return reject(Object.assign(new Error('Request exceeds 2 MB.'),{status:413}));try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(Object.assign(new Error('Invalid JSON.'),{status:400})); } });
    req.on('error',reject);
  });
}
const server = http.createServer(async (req,res) => {
  if (req.headers.host !== `${host}:${port}` && req.headers.host !== `localhost:${port}`) { res.writeHead(403).end(); return; }
  let pathname;
  try { pathname = new URL(req.url, origin).pathname; } catch { res.writeHead(400).end();return; }
  if (pathname.startsWith('/api/')) {
    try {
      if (req.method !== 'GET' && req.headers.origin !== origin && req.headers.origin !== `http://localhost:${port}`) return json(res,403,{error:'Requests must originate from this local app.'});
      if (pathname === '/api/connections' && req.method === 'GET') return json(res,200,{storage:storage.mode,postgresConfigured:storage.mode==='postgres',desktopLocalOnly,mcp:desktopLocalOnly?null:{command:process.execPath,args:[path.join(root,'mcp-server.js')]}});
      if (pathname === '/api/graphs' && req.method === 'GET') return json(res,200,{graphs:await storage.list()});
      const match = /^\/api\/graphs\/([A-Za-z0-9_-]{1,100})$/.exec(pathname);
      if (match && req.method === 'GET') {
        const value = await storage.get(match[1]);
        return value ? json(res,200,value) : json(res,404,{error:'Graph not found.'});
      }
      if (match && req.method === 'PUT') {
        if (!String(req.headers['content-type']||'').startsWith('application/json')) return json(res,415,{error:'Expected JSON.'});
        const body = await readBody(req);
        if (body.project?.id !== match[1]) return json(res,400,{error:'Graph ID mismatch.'});
        return json(res,200,await storage.save(body.project,body.expectedRevision || null));
      }
      return json(res,404,{error:'Unknown endpoint.'});
    } catch (error) { return json(res,error.status || 400,{error:error.message || 'Storage error.'}); }
  }
  const requested = pathname === '/' ? '/index.html' : pathname;
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  if (!publicFiles.has(requested)) { res.writeHead(404).end(); return; }
  const file = path.join(root, requested);
  fs.stat(file,(error,stat) => {
    if (error || !stat.isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':contentSecurityPolicy});
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  });
});
function startServer(listenPort = port) {
  if (server.listening) return Promise.resolve({server,port,origin});
  return new Promise((resolve,reject) => {
    const onError = error => reject(error);
    server.once('error',onError);
    server.listen(listenPort,host,() => {
      server.off('error',onError);
      port = server.address().port;
      origin = `http://${host}:${port}`;
      resolve({server,port,origin});
    });
  });
}

if (require.main === module) startServer().then(({origin}) => console.log(`Alatar's Graph demo: ${origin}/`)).catch(error => { console.error(error);process.exitCode = 1; });

module.exports = {startServer};
