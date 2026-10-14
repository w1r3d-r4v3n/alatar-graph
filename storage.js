const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const dataDir = process.env.ALATARS_GRAPH_DATA_DIR || path.join(__dirname, 'data', 'graphs');
const databaseUrl = process.env.ALATARS_GRAPH_DATABASE_URL || '';
let pool;
let schemaReady;

function graphId(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new Error('Invalid graph ID. Use letters, digits, underscores, or hyphens.');
  return id;
}
function validate(project) {
  if (!project || typeof project !== 'object' || Array.isArray(project) || !Array.isArray(project.nodes) || !Array.isArray(project.edges)) throw new Error('A graph needs nodes and edges arrays.');
  graphId(project.id);
  if (typeof project.title !== 'string' || !project.title.trim() || project.title.length > 100) throw new Error('A graph needs a title of at most 100 characters.');
  if (project.nodes.length > 5000 || project.edges.length > 12000) throw new Error('Graph exceeds record limits.');
  if (Buffer.byteLength(JSON.stringify(project)) > 2_000_000) throw new Error('Graph exceeds the 2 MB limit.');
  const ids = new Set();
  for (const node of project.nodes) {
    if (!node || typeof node.id !== 'string' || !node.id || typeof node.label !== 'string' || !node.label || ids.has(node.id)) throw new Error('Invalid or duplicate node.');
    ids.add(node.id);
  }
  for (const edge of project.edges) {
    if (!edge || typeof edge.id !== 'string' || !edge.id || ids.has(edge.id) || !ids.has(edge.source) || !ids.has(edge.target)) throw new Error('Invalid edge or missing endpoint.');
    ids.add(edge.id);
  }
  return project;
}
function conflict() { const error = new Error('This graph changed in storage. Reload it before saving.'); error.status = 409; throw error; }
async function db() {
  if (!databaseUrl) return null;
  if (!pool) {
    let Pool;
    try { ({Pool} = require('pg')); } catch { throw new Error('PostgreSQL requires the pg package. Run npm install in this repository.'); }
    pool = new Pool({connectionString: databaseUrl, max: 5, connectionTimeoutMillis: 5000});
    schemaReady = pool.query('CREATE TABLE IF NOT EXISTS alatar_graphs (id text PRIMARY KEY, title text NOT NULL, project jsonb NOT NULL, revision text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
  }
  await schemaReady;
  return pool;
}
async function list() {
  const database = await db();
  if (database) {
    const {rows} = await database.query('SELECT id, title, revision, updated_at AS "updatedAt" FROM alatar_graphs ORDER BY updated_at DESC LIMIT 200');
    return rows;
  }
  await fs.mkdir(dataDir, {recursive:true});
  const names = (await fs.readdir(dataDir)).filter(name => /^[A-Za-z0-9_-]+\.json$/.test(name)).slice(0, 500);
  const items = await Promise.all(names.map(async name => {
    try { const item = JSON.parse(await fs.readFile(path.join(dataDir, name), 'utf8')); return {id:item.project.id,title:item.project.title,revision:item.revision,updatedAt:item.updatedAt}; } catch { return null; }
  }));
  return items.filter(Boolean).sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 200);
}
async function get(id) {
  graphId(id);
  const database = await db();
  if (database) {
    const {rows} = await database.query('SELECT project, revision FROM alatar_graphs WHERE id=$1', [id]);
    return rows[0] || null;
  }
  try { const item = JSON.parse(await fs.readFile(path.join(dataDir, id + '.json'), 'utf8')); return {project:item.project,revision:item.revision}; }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
async function save(project, expectedRevision = null) {
  validate(project);
  const id = graphId(project.id), revision = crypto.randomUUID(), updatedAt = new Date().toISOString();
  const database = await db();
  if (database) {
    if (expectedRevision) {
      const {rowCount} = await database.query('UPDATE alatar_graphs SET title=$2, project=$3, revision=$4, updated_at=now() WHERE id=$1 AND revision=$5', [id,project.title,JSON.stringify(project),revision,expectedRevision]);
      if (!rowCount) conflict();
    } else {
      const {rowCount} = await database.query('INSERT INTO alatar_graphs (id,title,project,revision) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [id,project.title,JSON.stringify(project),revision]);
      if (!rowCount) conflict();
    }
    return {id,revision,updatedAt};
  }
  await fs.mkdir(dataDir, {recursive:true});
  const file = path.join(dataDir, id + '.json');
  const lockPath = path.join(dataDir, '.' + id + '.lock');
  let lock;
  for (let attempt=0;attempt<100;attempt++) {
    try { lock=await fs.open(lockPath,'wx',0o600);break; }
    catch(error) { if(error.code!=='EEXIST')throw error;await new Promise(resolve=>setTimeout(resolve,30)); }
  }
  if (!lock) throw new Error('Graph is busy. Try saving again.');
  const temp = path.join(dataDir, '.' + id + '.' + crypto.randomUUID() + '.tmp');
  try {
    const current = await get(id);
    if ((current?.revision || null) !== expectedRevision) conflict();
    await fs.writeFile(temp, JSON.stringify({project,revision,updatedAt}), {flag:'wx',mode:0o600});
    await fs.rename(temp,file);
    return {id,revision,updatedAt};
  } finally {
    await fs.rm(temp,{force:true}).catch(()=>{});
    await lock.close();await fs.rm(lockPath,{force:true});
  }
}
module.exports = {list,get,save,validate,mode:databaseUrl?'postgres':'local'};
