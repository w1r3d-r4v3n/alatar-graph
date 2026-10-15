const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const {spawn} = require('node:child_process');
const readline = require('node:readline');

function freePort() { return new Promise(resolve => { const listener=net.createServer();listener.listen(0,'127.0.0.1',()=>{const port=listener.address().port;listener.close(()=>resolve(port));}); }); }
function untilReady(child) { return new Promise((resolve,reject) => { child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(Error('Server exited: '+code))); }); }
function mcpClient(child) {
  const pending = new Map();let nextId=0;
  readline.createInterface({input:child.stdout}).on('line',line => { const result=JSON.parse(line);const entry=pending.get(result.id);if(entry){pending.delete(result.id);entry(result);} });
  return (method,params) => new Promise(resolve => { const id=++nextId;pending.set(id,resolve);child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n'); });
}
test('desktop mode uses a free local port and exposes local storage only',async t => {
  const env={...process.env,PORT:'0',ALATARS_GRAPH_DESKTOP_LOCAL_ONLY:'1',ALATARS_GRAPH_DATABASE_URL:''};
  const child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env,stdio:['ignore','pipe','pipe']});
  t.after(()=>child.kill());
  const output=String(await untilReady(child));
  const match=output.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
  assert.ok(match,'server should report its chosen port');
  assert.ok(Number(match[1])>0);
  const response=await fetch(`http://127.0.0.1:${match[1]}/api/connections`);
  const settings=await response.json();
  assert.equal(response.status,200);
  assert.equal(settings.storage,'local');
  assert.equal(settings.desktopLocalOnly,true);
  assert.equal(settings.mcp,null);
});
test('local API and MCP share graph data and reject stale writes',async t => {
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'alatar-test-'));
  const port=await freePort(),base=`http://127.0.0.1:${port}`;
  const env={...process.env,ALATARS_GRAPH_DATA_DIR:dataDir,PORT:String(port)};
  delete env.ALATARS_GRAPH_DATABASE_URL;
  const server=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env,stdio:['ignore','pipe','pipe']});
  const mcp=spawn(process.execPath,['mcp-server.js'],{cwd:path.join(__dirname,'..'),env,stdio:['pipe','pipe','pipe']});
  t.after(async()=>{
    server.kill();mcp.kill();
    const root=path.resolve(os.tmpdir());
    if(!path.resolve(dataDir).startsWith(root+path.sep)||!path.basename(dataDir).startsWith('alatar-test-'))throw Error('Unexpected test path');
    await fs.rm(dataDir,{recursive:true,force:true});
  });
  await untilReady(server);
  const rpc=mcpClient(mcp);
  const init=await rpc('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'test',version:'1'}});
  assert.equal(init.result.protocolVersion,'2025-11-25');
  const listed=await rpc('tools/list');
  assert.ok(listed.result.tools.some(tool=>tool.name==='upsert_connection'));
  const created=await rpc('tools/call',{name:'create_graph',arguments:{title:'Test case'}});
  assert.equal(created.result.isError,undefined);
  const graphId=created.result.structuredContent.id;
  for(const [id,label] of [['a','Alpha'],['b','Beta']]){
    const result=await rpc('tools/call',{name:'upsert_entity',arguments:{graph_id:graphId,id,label,type:'Organization'}});
    assert.equal(result.result.isError,undefined);
  }
  const edge=await rpc('tools/call',{name:'upsert_connection',arguments:{graph_id:graphId,id:'edge-a-b',source:'a',target:'b',label:'controls',status:'Reported'}});
  assert.equal(edge.result.isError,undefined);
  const response=await fetch(`${base}/api/graphs/${graphId}`),saved=await response.json();
  assert.equal(response.status,200);assert.equal(saved.project.format,'alatar-graph');assert.equal(saved.project.nodes.length,2);assert.equal(saved.project.edges.length,1);
  const denied=await fetch(`${base}/api/graphs/${graphId}`,{method:'PUT',headers:{Origin:'http://untrusted.example','Content-Type':'application/json'},body:JSON.stringify({project:saved.project,expectedRevision:saved.revision})});
  assert.equal(denied.status,403);
  const stale=await fetch(`${base}/api/graphs/${graphId}`,{method:'PUT',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({project:saved.project,expectedRevision:'stale'})});
  assert.equal(stale.status,409);
  const updated={...saved.project,title:'Updated case'};
  const accepted=await fetch(`${base}/api/graphs/${graphId}`,{method:'PUT',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({project:updated,expectedRevision:saved.revision})});
  assert.equal(accepted.status,200);
  const reread=await rpc('tools/call',{name:'get_graph',arguments:{graph_id:graphId}});
  assert.equal(reread.result.structuredContent.project.title,'Updated case');
  assert.equal((await fetch(`${base}/storage.js`)).status,404);
  assert.equal((await fetch(`${base}/data/graphs/${graphId}.json`)).status,404);
});
