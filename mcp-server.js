#!/usr/bin/env node
'use strict';
const readline = require('node:readline');
const crypto = require('node:crypto');
const storage = require('./storage');

const object = (properties,required=[]) => ({type:'object',properties,required,additionalProperties:false});
const string = description => ({type:'string',description});
const tools = [
  {name:'list_graphs',description:'List graph projects in Alatar’s Graph storage.',inputSchema:object({})},
  {name:'get_graph',description:'Read a graph and its entities, connections, attributes, and sources.',inputSchema:object({graph_id:string('Graph ID')},['graph_id'])},
  {name:'create_graph',description:'Create a blank graph project.',inputSchema:object({title:string('Graph title'),description:string('Optional context')},['title'])},
  {name:'upsert_entity',description:'Add or update one graph entity. Preserve source attribution for investigative claims.',inputSchema:object({graph_id:string('Graph ID'),id:string('Entity ID; omit to create'),label:string('Display label'),type:{type:'string',enum:['Person','Organization','Location','Account','Other']},notes:string('Analyst notes'),country:string('Jurisdiction'),properties:{type:'object',description:'Additional attributes'},sources:{type:'array',items:{type:'object'},description:'Source records'}},['graph_id','label'])},
  {name:'upsert_connection',description:'Add or update a directed relationship between two existing entities.',inputSchema:object({graph_id:string('Graph ID'),id:string('Connection ID; omit to create'),source:string('Source entity ID'),target:string('Target entity ID'),label:string('Relationship label'),status:{type:'string',enum:['Documented','Reported','Uncertain','Historical']},notes:string('Evidence notes'),sources:{type:'array',items:{type:'object'}}},['graph_id','source','target','label'])},
  {name:'delete_record',description:'Delete one entity or connection by ID. Deleting an entity also removes its connections.',inputSchema:object({graph_id:string('Graph ID'),record_id:string('Entity or connection ID')},['graph_id','record_id'])}
];
function required(args,field,max=500) { const value=args[field];if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(`Provide ${field} as nonempty text of at most ${max} characters.`);return value.trim(); }
function optional(args,field,max=5000) { const value=args[field];if(value===undefined)return undefined;if(typeof value!=='string'||value.length>max)throw Error(`Invalid ${field}.`);return value.trim(); }
function safeObject(value) { if(value===undefined)return undefined;if(!value||typeof value!=='object'||Array.isArray(value))throw Error('properties must be an object.');const result={};for(const [key,v] of Object.entries(value).slice(0,200))if(!['__proto__','constructor','prototype'].includes(key))result[key.slice(0,100)]=typeof v==='string'?v.slice(0,5000):JSON.stringify(v).slice(0,5000);return result; }
function safeSources(value) { if(value===undefined)return undefined;if(!Array.isArray(value)||value.length>200)throw Error('sources must be an array of at most 200 records.');return value.map(s=>{if(!s||typeof s!=='object'||Array.isArray(s))throw Error('Each source must be an object.');return {file:optional(s,'file',200),url:optional(s,'url',2000),excerpt:optional(s,'excerpt',5000)};}); }
async function graph(id) { const found=await storage.get(required({id},'id',100));if(!found)throw Error('Graph not found.');return found; }
async function call(name,args={}) {
  if(!tools.some(tool=>tool.name===name))throw Error('Unknown tool.');
  if(!args||typeof args!=='object'||Array.isArray(args))throw Error('Tool arguments must be an object.');
  if(name==='list_graphs')return {graphs:await storage.list(),storage:storage.mode};
  if(name==='get_graph')return await graph(args.graph_id);
  if(name==='create_graph') {
    const title=required(args,'title',100),description=optional(args,'description',1000)||'';
    const project={format:'alatar-graph',version:1,id:'graph-'+crypto.randomUUID(),title,description,updatedAt:new Date().toISOString(),nodes:[],edges:[]};
    return await storage.save(project);
  }
  const {project,revision}=await graph(args.graph_id);
  if(name==='upsert_entity') {
    const id=args.id===undefined?'n-'+crypto.randomUUID():required(args,'id',80);
    if(project.edges.some(e=>e.id===id))throw Error('ID already belongs to a connection.');
    const old=project.nodes.find(n=>n.id===id);
    const node={...old,id,label:required(args,'label',80),type:args.type||old?.type||'Other',notes:optional(args,'notes')??old?.notes??'',country:optional(args,'country',100)??old?.country??'',properties:safeObject(args.properties)??old?.properties??{},sources:safeSources(args.sources)??old?.sources??[]};
    if(!['Person','Organization','Location','Account','Other'].includes(node.type))throw Error('Invalid entity type.');
    if(old)Object.assign(old,node);else project.nodes.push(node);
    project.updatedAt=new Date().toISOString();
    return {id,created:!old,...await storage.save(project,revision)};
  }
  if(name==='upsert_connection') {
    const id=args.id===undefined?'e-'+crypto.randomUUID():required(args,'id',80);
    if(project.nodes.some(n=>n.id===id))throw Error('ID already belongs to an entity.');
    const source=required(args,'source',80),target=required(args,'target',80);
    if(source===target||!project.nodes.some(n=>n.id===source)||!project.nodes.some(n=>n.id===target))throw Error('Source and target must be different existing entities.');
    const old=project.edges.find(e=>e.id===id);
    const edge={...old,id,source,target,label:required(args,'label',60),directed:true,status:args.status||old?.status||'Reported',notes:optional(args,'notes')??old?.notes??'',properties:old?.properties||{},sources:safeSources(args.sources)??old?.sources??[]};
    if(!['Documented','Reported','Uncertain','Historical'].includes(edge.status))throw Error('Invalid evidence status.');
    if(old)Object.assign(old,edge);else project.edges.push(edge);
    project.updatedAt=new Date().toISOString();
    return {id,created:!old,...await storage.save(project,revision)};
  }
  if(name==='delete_record') {
    const id=required(args,'record_id',80);
    const before=project.nodes.length+project.edges.length;
    project.nodes=project.nodes.filter(n=>n.id!==id);
    project.edges=project.edges.filter(e=>e.id!==id&&e.source!==id&&e.target!==id);
    if(project.nodes.length+project.edges.length===before)throw Error('Record not found.');
    project.updatedAt=new Date().toISOString();
    return {deleted:id,...await storage.save(project,revision)};
  }
}
function send(message) { process.stdout.write(JSON.stringify({jsonrpc:'2.0',...message})+'\n'); }
async function handle(request) {
  if(!request||request.jsonrpc!=='2.0'||typeof request.method!=='string')return;
  if(request.id===undefined)return;
  try {
    if(request.method==='initialize')return send({id:request.id,result:{protocolVersion:['2024-11-05','2025-03-26','2025-06-18','2025-11-25'].includes(request.params?.protocolVersion)?request.params.protocolVersion:'2025-11-25',capabilities:{tools:{}},serverInfo:{name:'alatars-graph',version:'0.2.0'}}});
    if(request.method==='ping')return send({id:request.id,result:{}});
    if(request.method==='tools/list')return send({id:request.id,result:{tools}});
    if(request.method==='tools/call') {
      try {
        const result=await call(request.params?.name,request.params?.arguments);
        return send({id:request.id,result:{content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result}});
      } catch(error) { return send({id:request.id,result:{content:[{type:'text',text:error.message||'Tool failed.'}],isError:true}}); }
    }
    return send({id:request.id,error:{code:-32601,message:'Method not found.'}});
  } catch(error) { return send({id:request.id,error:{code:-32603,message:error.message||'Internal error.'}}); }
}
readline.createInterface({input:process.stdin,crlfDelay:Infinity}).on('line',line=>{
  try { handle(JSON.parse(line)); }
  catch { send({id:null,error:{code:-32700,message:'Invalid JSON.'}}); }
});
