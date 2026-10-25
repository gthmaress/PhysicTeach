import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const base=path.resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.json':'application/json'};
http.createServer((req,res)=>{try{let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(url==='/')url='/index.html';const p=path.resolve(base,'.'+url);if(p!==base&&!p.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}const content=fs.readFileSync(p);res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);}catch(e){res.writeHead(404);res.end('Not found');}}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
