/* Alatar's Graph local demo. Investigation data stays in this browser. */
(() => {
  "use strict";
  const TYPES = {
    organization:{label:"Organizations",singular:"Organization",color:"#59dec8"},
    person:{label:"People",singular:"Person",color:"#77b7f7"},
    domain:{label:"Domains",singular:"Domain",color:"#c2a4f7"},
    location:{label:"Locations",singular:"Location",color:"#eeb665"},
    document:{label:"Documents",singular:"Document",color:"#f394a9"},
    account:{label:"Accounts",singular:"Account",color:"#9bdc9d"},
    other:{label:"Other",singular:"Other",color:"#a9b3bf"}
  };
  const ICONS = {
    organization:{label:"Building",paths:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3"/>'},
    person:{label:"Person",paths:'<circle cx="12" cy="8" r="3.2"/><path d="M5 21v-2a7 7 0 0 1 14 0v2H5Z"/>'},
    domain:{label:"Globe",paths:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3 2.4-4.5 5.4-4.5 9S9 18.6 12 21M12 3c3 2.4 4.5 5.4 4.5 9S15 18.6 12 21"/>'},
    location:{label:"Map pin",paths:'<path d="M20 10c0 5.5-8 11-8 11S4 15.5 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>'},
    document:{label:"Document",paths:'<path d="M6 2.5h8l4 4V21H6a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2Z"/><path d="M14 2.5V7h4M8 11h7M8 15h7M8 19h5"/>'},
    account:{label:"Account card",paths:'<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9h19M6 15h5"/>'},
    other:{label:"Circle",paths:'<circle cx="12" cy="12" r="8"/>'},
    group:{label:"Group",paths:'<circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><path d="M2 20c0-4 2-6 6-6s6 2 6 6M11 15c1-.7 2.7-1 5-1 4 0 6 2 6 6"/>'},
    government:{label:"Government",paths:'<path d="M2 9 12 3l10 6H2ZM4 20h16M6 10v9m4-9v9m4-9v9m4-9v9"/>'},
    website:{label:"Website",paths:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20M6 6.5h.01M9 6.5h.01M7 14h10"/>'},
    phone:{label:"Phone",paths:'<path d="M6 3h4l1 4-2 2a14 14 0 0 0 6 6l2-2 4 1v4c0 2-2 3-4 3C9 20 4 15 3 7c0-2 1-4 3-4Z"/>'},
    financial:{label:"Financial",paths:'<circle cx="12" cy="12" r="9"/><path d="M15 8c-1-1-5-1-6 1-2 3 6 2 6 5 0 2-4 3-6 1M12 5v14"/>'},
    vehicle:{label:"Vehicle",paths:'<path d="M4 16 6 9h12l2 7M3 16h18v3H3zM7 19v2m10-2v2M8 12h8"/>'},
    vessel:{label:"Vessel",paths:'<path d="M3 14h18l-3 6H6l-3-6ZM12 3v11M12 4l6 7h-6M3 22c3-2 5-2 8 0 3-2 5-2 8 0"/>'},
    aircraft:{label:"Aircraft",paths:'<path d="m2 13 8-2V4a2 2 0 0 1 4 0v7l8 2v3l-8-1v4l3 2v1l-5-1-5 1v-1l3-2v-4l-8 1v-3Z"/>'},
    device:{label:"Device",paths:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 5h6M11 19h2"/>'}
  };
  const SHAPES = {ellipse:"Circle","round-rectangle":"Rounded square",diamond:"Diamond",hexagon:"Hexagon"};
  const LINE_STYLES = {solid:"Solid",dashed:"Dashed",dotted:"Dotted"};
  const ARROWS = {triangle:"Arrow",vee:"Open arrow",none:"None"};
  const STATUSES = {Documented:"Documented",Reported:"Reported",Uncertain:"Uncertain",Historical:"Historical"};
  const DRAFT_KEY = "alatar-graph-draft-v1";
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const pairsToObject = pairs => {const result=Object.create(null);for(const [key,value] of pairs)result[key]=value;return result;};
  const element = (tag,className,content) => {const e=document.createElement(tag);if(className)e.className=className;if(content!==undefined)e.textContent=String(content);return e;};
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  const safeText = (value,max=500) => typeof value==="string"?value.trim().slice(0,max):"";
  const numeric = (value,fallback,min,max) => Number.isFinite(Number(value))?clamp(Number(value),min,max):fallback;
  const color = (value,fallback) => typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value)?value:fallback;
  const iconCache = {};
  function iconUri(name){
    if(!ICONS[name])name="organization";
    if(!iconCache[name]){
      const svg='<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e9faf6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+ICONS[name].paths+"</svg>";
      iconCache[name]="data:image/svg+xml;utf8,"+encodeURIComponent(svg);
    }
    return iconCache[name];
  }
  function nodeAppearance(n,a){
    a=a||{};
    return {color:color(a.color,TYPES[n.type].color),shape:SHAPES[a.shape]?a.shape:"ellipse",size:numeric(a.size,n.id==="harborlight"?58:n.type==="organization"?48:42,28,80),icon:ICONS[a.icon]?a.icon:n.type,labelDx:numeric(a.labelDx,0,-220,220),labelDy:numeric(a.labelDy,0,-220,220)};
  }
  function edgeAppearance(a){
    a=a||{};
    return {color:color(a.color,"#668998"),width:numeric(a.width,2,1,10),lineStyle:LINE_STYLES[a.lineStyle]?a.lineStyle:"solid",arrow:ARROWS[a.arrow]?a.arrow:"triangle",labelT:numeric(a.labelT,.5,.05,.95)};
  }
  let caseData=clone(window.ALATARS_GRAPH_DEMO);
  let enabled=new Set(Object.keys(TYPES));
  let selected=null;
  let selectedIds=new Set();
  let mode="entity";
  let graphDialogMode="create";
  let imported=false;
  let toastTimer,cy,resizeObserver,visualFrame,draftTimer;
  const undoStack=[],redoStack=[];
  function recordSnapshot(){return clone(caseData);}
  function historyButtons(){ $("undo-button").disabled=!undoStack.length;$("redo-button").disabled=!redoStack.length;$("delete-button").disabled=!selectedIds.size; }
  function checkpoint(){undoStack.push(recordSnapshot());if(undoStack.length>50)undoStack.shift();redoStack.length=0;historyButtons();}
  function markDirty(){
    $("save-status").textContent="SAVING DRAFT…";
    clearTimeout(draftTimer);
    draftTimer=setTimeout(()=>{
      try{localStorage.setItem(DRAFT_KEY,JSON.stringify(toProject()));$("save-status").textContent="BROWSER DRAFT";}
      catch{$("save-status").textContent="UNSAVED · EXPORT FILE";showToast("Browser storage unavailable; export a project file.");}
    },800);
  }
  function restoreHistory(stack,other){
    if(!stack.length)return;
    other.push(recordSnapshot());caseData=stack.pop();selected=null;selectedIds.clear();
    initGraph();historyButtons();markDirty();
  }
  function prepareAppearance(){
    caseData.nodes.forEach(n=>n.appearance=nodeAppearance(n,n.appearance));
    caseData.edges.forEach(e=>e.appearance=edgeAppearance(e.appearance));
  }
  function graphElements(){
    return [
      ...caseData.nodes.map(n=>({group:"nodes",data:{id:n.id,label:n.label,type:n.type,appearance:n.appearance},position:n.position})),
      ...caseData.edges.map(e=>({group:"edges",data:{id:e.id,source:e.source,target:e.target,label:e.label,appearance:e.appearance}}))
    ];
  }
  function syncEdgeLabel(edge){
    const a=edge.data("appearance")||edgeAppearance();
    const s=edge.source().position(),t=edge.target().position();
    edge.style({"text-margin-x":(a.labelT-.5)*(t.x-s.x),"text-margin-y":(a.labelT-.5)*(t.y-s.y)});
  }
  function syncVisuals(){
    if(!cy)return;
    cy.edges().forEach(syncEdgeLabel);
    updateLabelHandle();
  }
  function scheduleVisualSync(){
    if(visualFrame)cancelAnimationFrame(visualFrame);
    visualFrame=requestAnimationFrame(()=>{visualFrame=0;syncVisuals();});
  }
  function initGraph(){
    if(resizeObserver)resizeObserver.disconnect();
    if(cy)cy.destroy();
    $("label-handle").hidden=true;
    prepareAppearance();
    cy=cytoscape({
      container:$("cy"),elements:graphElements(),layout:{name:"preset",fit:true,padding:72},
      minZoom:.25,maxZoom:3,wheelSensitivity:.16,boxSelectionEnabled:true,selectionType:"single",
      style:[
        {selector:"node",style:{
          "background-color":"#17313b","border-width":3,"border-color":ele=>ele.data("appearance").color,
          "shape":ele=>ele.data("appearance").shape,"width":ele=>ele.data("appearance").size,"height":ele=>ele.data("appearance").size,
          "background-image":ele=>iconUri(ele.data("appearance").icon),"background-fit":"none","background-width":"52%","background-height":"52%","background-repeat":"no-repeat",
          "label":"data(label)","text-events":"yes","color":"#e0efed","font-size":11,"font-family":"Segoe UI, Arial, sans-serif","font-weight":600,
          "text-wrap":"wrap","text-max-width":120,"text-valign":"center","text-halign":"center",
          "text-margin-x":ele=>ele.data("appearance").labelDx,
          "text-margin-y":ele=>ele.data("appearance").size/2+17+ele.data("appearance").labelDy,
          "text-outline-width":3,"text-outline-color":"#0a1720","overlay-opacity":0
        }},
        {selector:"edge",style:{
          "width":ele=>ele.data("appearance").width,"line-color":ele=>ele.data("appearance").color,
          "line-style":ele=>ele.data("appearance").lineStyle,"target-arrow-color":ele=>ele.data("appearance").color,
          "target-arrow-shape":ele=>ele.data("appearance").arrow,"arrow-scale":.8,"curve-style":"straight","opacity":.78,
          "label":"data(label)","text-events":"yes","font-size":9,"font-family":"Segoe UI, Arial, sans-serif","color":"#b8d2d5",
          "text-rotation":"none","text-background-color":"#0b1b24","text-background-opacity":.94,
          "text-background-padding":"3px","text-background-shape":"roundrectangle",
          "text-margin-x":ele=>{const a=ele.data("appearance"),s=ele.source().position(),t=ele.target().position();return (a.labelT-.5)*(t.x-s.x);},
          "text-margin-y":ele=>{const a=ele.data("appearance"),s=ele.source().position(),t=ele.target().position();return (a.labelT-.5)*(t.y-s.y);}
        }},
        {selector:".dimmed",style:{"opacity":.14}},
        {selector:"node.focused",style:{"border-width":5,"border-color":"#f2faf9","overlay-color":"#7af3db","overlay-opacity":.15,"overlay-padding":12}},
        {selector:"edge.focused",style:{"width":ele=>Math.max(3,ele.data("appearance").width+1),"opacity":1,"color":"#e7f4f1"}},
        {selector:".filtered",style:{"display":"none"}}
      ]
    });
    cy.on("tap","node, edge",event=>{
      const original=event.originalEvent||{};
      if(original.shiftKey||original.ctrlKey||original.metaKey){
        const next=new Set(selectedIds);next.has(event.target.id())?next.delete(event.target.id()):next.add(event.target.id());setSelection(next);
      }else selectElement(event.target.id());
    });
    cy.on("boxend",()=>setTimeout(()=>setSelection(new Set(cy.elements(":selected").not(".filtered").map(item=>item.id()))),0));
    cy.on("tap",event=>{if(event.target===cy)clearSelection();});
    cy.on("grab","node",()=>checkpoint());
    cy.on("dragfree","node",()=>{caseData.nodes.forEach(n=>{const p=cy.getElementById(n.id).position();n.position={x:p.x,y:p.y};});markDirty();});
    cy.on("position","node",scheduleVisualSync);
    cy.on("pan zoom layoutstop",scheduleVisualSync);
    resizeObserver=new ResizeObserver(()=>{cy.resize();scheduleVisualSync();});
    resizeObserver.observe($("cy"));
    if(cy.zoom()>1.35){cy.zoom(1.35);cy.center(cy.elements());}
    selected=null;selectedIds.clear();document.body.classList.remove("inspector-open","has-selection");syncSidePanels();renderCaseInfo();updateFilters();updateCounts();renderEmptyInspector();scheduleVisualSync();historyButtons();
  }
  function renderCaseInfo(){
    const isDemo=caseData.id==="fictional-harborlight-demo";
    $("case-id").textContent=isDemo?"DEMO / 001":"IMPORTED";
    $("case-title").textContent=caseData.name;
    $("case-summary").textContent=caseData.description|| (imported?"Local investigation graph. Review imported claims and sources.":"An example link analysis of organizations, infrastructure, and public records.");
    $("case-banner-title").textContent=isDemo?"Synthetic demo data":"Local case data";
    $("case-banner-text").textContent=isDemo?"All names, domains, and relationships in this case are fictional.":"Source notes and connections are analyst-provided. Review them before drawing conclusions.";
    document.querySelectorAll(".leads-title,.lead").forEach(item=>item.style.display=isDemo?"":"none");
  }
  function updateCounts(){
    const nodes=cy.nodes().not(".filtered").length,edges=cy.edges().not(".filtered").length;
    $("count-label").textContent=nodes+" "+(nodes===1?"ENTITY":"ENTITIES")+" · "+edges+" "+(edges===1?"CONNECTION":"CONNECTIONS");
  }
  function updateFilters(){
    const target=$("type-filters");target.replaceChildren();
    Object.entries(TYPES).forEach(([key,type])=>{
      const label=element("label","filter"),input=element("input");
      input.type="checkbox";input.checked=enabled.has(key);input.dataset.type=key;
      input.addEventListener("change",()=>{input.checked?enabled.add(key):enabled.delete(key);applyFilters();});
      const dot=element("span","type-dot");dot.style.background=type.color;
      label.append(input,dot,element("span","filter-label",type.label),element("span","filter-count",caseData.nodes.filter(n=>n.type===key).length));
      target.append(label);
    });
    const relationship=$("relationship-filter"),country=$("country-filter");
    const previousRelationship=relationship.value,previousCountry=country.value;
    for(const [control,values,caption] of [[relationship,[...new Set(caseData.edges.map(e=>e.label))].sort(),"All relationships"],[country,[...new Set(caseData.nodes.map(n=>n.country).filter(Boolean))].sort(),"All jurisdictions"]]){
      control.replaceChildren();const all=element("option","",caption);all.value="all";control.append(all);
      values.forEach(value=>{const option=element("option","",value);option.value=value;control.append(option);});
    }
    relationship.value=previousRelationship||"all";country.value=previousCountry||"all";
    applyFilters();
  }
  function applyFilters(){
    const query=$("search").value.trim().toLowerCase(),country=$("country-filter").value,relationship=$("relationship-filter").value,status=$("status-filter").value,date=$("date-filter").value;
    const nodeRecords=new Map(caseData.nodes.map(n=>[n.id,n])),edgeRecords=new Map(caseData.edges.map(e=>[e.id,e]));
    cy.nodes().forEach(node=>{
      const n=nodeRecords.get(node.id());
      const haystack=[n.id,n.label,n.description,n.notes,...Object.values(n.properties||{})].join(" ").toLowerCase();
      node.toggleClass("filtered",!enabled.has(n.type)||(country!=="all"&&n.country!==country)||(query&&!haystack.includes(query)));
    });
    cy.edges().forEach(edge=>{
      const e=edgeRecords.get(edge.id());
      edge.toggleClass("filtered",edge.source().hasClass("filtered")||edge.target().hasClass("filtered")||(relationship!=="all"&&e.label!==relationship)||(status!=="all"&&e.status!==status)||(date&&((e.startDate&&e.startDate>date)||(e.endDate&&e.endDate<date))));
    });
    if($("neighborhood-filter").checked&&selected){
      const anchor=cy.getElementById(selected);
      if(anchor.isNode()&&!anchor.hasClass("filtered")){
        const near=new Set([selected]);
        cy.edges().not(".filtered").forEach(edge=>{if(edge.source().id()===selected||edge.target().id()===selected){near.add(edge.source().id());near.add(edge.target().id());}else edge.addClass("filtered");});
        cy.nodes().forEach(node=>{if(!near.has(node.id()))node.addClass("filtered");});
      }
    }
    if($("isolated-filter").checked){
      cy.nodes().not(".filtered").forEach(node=>{if(node.connectedEdges().not(".filtered").empty())node.addClass("filtered");});
    }
    const visibleSelection=[...selectedIds].filter(id=>!cy.getElementById(id).hasClass("filtered"));
    if(visibleSelection.length!==selectedIds.size)setSelection(new Set(visibleSelection));
    updateCounts();updateLabelHandle();
  }
  function clearSelection(){setSelection(new Set());}
  function syncSidePanels(){
    $("panel-scrim").hidden=!document.body.classList.contains("filters-open")&&!document.body.classList.contains("inspector-open");
    $("mobile-filters-button").setAttribute("aria-expanded",String(document.body.classList.contains("filters-open")));
  }
  function setSelection(ids){
    const previous=selected;
    selectedIds=new Set([...ids].filter(id=>{const item=cy.getElementById(id);return !item.empty()&&!item.hasClass("filtered");}));
    selected=selectedIds.size===1?[...selectedIds][0]:null;
    cy.elements().unselect();selectedIds.forEach(id=>cy.getElementById(id).select());
    cy.elements().removeClass("dimmed focused");
    if(selectedIds.size===1){
      const item=cy.getElementById(selected),family=item.isNode()?item.closedNeighborhood():item.union(item.connectedNodes());
      cy.elements().not(family).addClass("dimmed");item.addClass("focused");renderInspector(selected);
    }else if(selectedIds.size>1){
      cy.elements().forEach(item=>item.toggleClass("dimmed",!selectedIds.has(item.id())));
      selectedIds.forEach(id=>cy.getElementById(id).addClass("focused"));renderMultiInspector();
    }else renderEmptyInspector();
    document.body.classList.remove("filters-open");
    document.body.classList.toggle("has-selection",selectedIds.size>0);
    document.body.classList.toggle("inspector-open",selectedIds.size>0);
    syncSidePanels();
    if(!previous&&selected&&window.matchMedia("(min-width:721px) and (max-width:960px)").matches){
      const focusId=selected;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{if(selected===focusId){cy.resize();cy.center(cy.getElementById(focusId));scheduleVisualSync();}}));
    }
    if(previous&&!selected&&window.matchMedia("(min-width:721px) and (max-width:960px)").matches){
      requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!selected){cy.resize();const visible=cy.elements().not(".filtered");if(visible.length)cy.fit(visible,45);scheduleVisualSync();}}));
    }
    updateLabelHandle();historyButtons();
    if($("neighborhood-filter").checked&&previous!==selected)applyFilters();
  }
  function selectElement(id,center=false){
    const item=cy.getElementById(id);
    if(!item||item.empty()||item.hasClass("filtered"))return;
    setSelection(new Set([id]));
    if(center){
      if(window.matchMedia("(min-width:721px) and (max-width:960px)").matches){
        requestAnimationFrame(()=>requestAnimationFrame(()=>{cy.resize();cy.center(item);scheduleVisualSync();}));
      }else cy.animate({center:{eles:item},zoom:Math.min(1.2,Math.max(cy.zoom(),.9))},{duration:350});
    }
  }
  function updateLabelHandle(){
    const handle=$("label-handle");
    if(!selected||!cy){handle.hidden=true;return;}
    const item=cy.getElementById(selected);
    if(item.empty()||item.hasClass("filtered")){handle.hidden=true;return;}
    let x,y;
    if(item.isNode()){
      const a=item.data("appearance"),p=item.renderedPosition(),z=cy.zoom();
      x=p.x+a.labelDx*z;y=p.y+(a.size/2+17+a.labelDy)*z;
    }else{
      const a=item.data("appearance"),s=item.source().renderedPosition(),t=item.target().renderedPosition();
      x=s.x+(t.x-s.x)*a.labelT;y=s.y+(t.y-s.y)*a.labelT;
    }
    handle.style.left=(x+22)+"px";handle.style.top=(y-15)+"px";handle.hidden=false;
    handle.title=item.isNode()?"Drag to move this node label":"Drag to slide this connection label";
  }
  function updateRangeDisplay(key,value){
    const input=document.querySelector('[data-range="'+key+'"]'),output=document.querySelector('[data-output="'+key+'"]');
    if(input)input.value=String(key==="edge-label"?Math.round(value*100):value);
    if(output)output.textContent=key==="edge-label"?Math.round(value*100)+"%":Math.round(value)+" px";
  }
  function moveSelectedLabel(clientX,clientY){
    if(!selected)return;
    const item=cy.getElementById(selected),rect=cy.container().getBoundingClientRect();
    const x=clientX-rect.left,y=clientY-rect.top;
    if(item.isNode()){
      const n=caseData.nodes.find(v=>v.id===selected),p=item.renderedPosition(),z=cy.zoom();
      n.appearance.labelDx=clamp(Math.round((x-p.x)/z),-220,220);
      n.appearance.labelDy=clamp(Math.round((y-p.y)/z-n.appearance.size/2-17),-220,220);
      item.data("appearance",{...n.appearance});
      updateRangeDisplay("node-label-x",n.appearance.labelDx);
      updateRangeDisplay("node-label-y",n.appearance.labelDy);
    }else{
      const e=caseData.edges.find(v=>v.id===selected),s=item.source().renderedPosition(),t=item.target().renderedPosition();
      const dx=t.x-s.x,dy=t.y-s.y,denom=dx*dx+dy*dy||1;
      e.appearance.labelT=clamp(Math.round(((x-s.x)*dx+(y-s.y)*dy)/denom*100)/100,.05,.95);
      item.data("appearance",{...e.appearance});syncEdgeLabel(item);
      updateRangeDisplay("edge-label",e.appearance.labelT);
    }
    updateLabelHandle();markDirty();
  }
  const handle=$("label-handle");
  handle.addEventListener("pointerdown",event=>{event.preventDefault();event.stopPropagation();checkpoint();handle.setPointerCapture(event.pointerId);handle.classList.add("dragging");});
  handle.addEventListener("pointermove",event=>{if(handle.hasPointerCapture(event.pointerId))moveSelectedLabel(event.clientX-22,event.clientY+15);});
  for(const eventName of ["pointerup","pointercancel"])handle.addEventListener(eventName,()=>handle.classList.remove("dragging"));
  handle.addEventListener("keydown",event=>{
    if(!selected||!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;
    event.preventDefault();checkpoint();
    const item=cy.getElementById(selected);
    if(item.isNode()){
      const n=caseData.nodes.find(v=>v.id===selected),a=n.appearance;
      if(event.key==="ArrowLeft")a.labelDx=clamp(a.labelDx-5,-220,220);
      if(event.key==="ArrowRight")a.labelDx=clamp(a.labelDx+5,-220,220);
      if(event.key==="ArrowUp")a.labelDy=clamp(a.labelDy-5,-220,220);
      if(event.key==="ArrowDown")a.labelDy=clamp(a.labelDy+5,-220,220);
      item.data("appearance",{...a});updateRangeDisplay("node-label-x",a.labelDx);updateRangeDisplay("node-label-y",a.labelDy);
    }else if(["ArrowLeft","ArrowRight"].includes(event.key)){
      const e=caseData.edges.find(v=>v.id===selected),a=e.appearance;
      a.labelT=clamp(Math.round((a.labelT+(event.key==="ArrowLeft"?-.02:.02))*100)/100,.05,.95);
      item.data("appearance",{...a});syncEdgeLabel(item);updateRangeDisplay("edge-label",a.labelT);
    }
    updateLabelHandle();markDirty();
  });
  function setupPanelResize(){
    const grip=$("inspector-resizer"),workspace=document.querySelector(".workspace");
    function setWidth(width){
      const left=document.querySelector(".left-panel").getBoundingClientRect().width;
      const compact=window.matchMedia("(max-width:960px)").matches;
      const min=compact?230:270;
      const max=Math.min(620,Math.max(min,workspace.getBoundingClientRect().width-left-(compact?270:350)));
      const next=Math.round(clamp(width,min,max));
      workspace.style.setProperty("--inspector-width",next+"px");
      grip.setAttribute("aria-valuemin",String(min));
      grip.setAttribute("aria-valuemax",String(Math.round(max)));
      grip.setAttribute("aria-valuenow",String(next));
      if(cy){cy.resize();scheduleVisualSync();}
    }
    grip.addEventListener("pointerdown",event=>{
      if(window.matchMedia("(max-width:720px)").matches)return;
      event.preventDefault();grip.setPointerCapture(event.pointerId);grip.classList.add("dragging");document.body.classList.add("resizing-panel");
    });
    grip.addEventListener("pointermove",event=>{if(grip.hasPointerCapture(event.pointerId))setWidth(workspace.getBoundingClientRect().right-event.clientX);});
    for(const eventName of ["pointerup","pointercancel"])grip.addEventListener(eventName,()=>{grip.classList.remove("dragging");document.body.classList.remove("resizing-panel");});
    grip.addEventListener("keydown",event=>{if(!["ArrowLeft","ArrowRight"].includes(event.key))return;event.preventDefault();const current=Number(grip.getAttribute("aria-valuenow"));setWidth(current+(event.key==="ArrowLeft"?20:-20));});
    window.addEventListener("resize",()=>{if(!window.matchMedia("(max-width:720px)").matches)setWidth(Number(grip.getAttribute("aria-valuenow")));});
    if(!window.matchMedia("(max-width:720px)").matches)setWidth(Number(grip.getAttribute("aria-valuenow")));
  }
  function inspectorTop(root){
    const top=element("div","inspector-top"),heading=element("div","inspector-heading");
    const close=element("button","mobile-panel-close","×");close.type="button";close.setAttribute("aria-label","Close attribute view");
    close.addEventListener("click",()=>{document.body.classList.remove("inspector-open");syncSidePanels();});
    heading.append(element("span","","ATTRIBUTE VIEW"),element("span","panel-hint","⇔ DRAG EDGE"),close);top.append(heading);root.append(top);
  }
  function renderEmptyInspector(){
    const root=$("inspector");root.replaceChildren();inspectorTop(root);
    const body=element("div","inspector-empty");
    body.append(element("div","empty-symbol","◎"),element("h2","","Select an element"),element("p","","Inspect and edit entity attributes, visual styles, and label positions."));
    const hint=element("div","hint-card");
    hint.append(element("strong","","Working with labels"),document.createTextNode("Select a node or connection, then drag its teal label handle on the canvas or use the controls here."));
    body.append(hint);root.append(body);
  }
  function renderMultiInspector(){
    const root=$("inspector");root.replaceChildren();root.scrollTop=0;inspectorTop(root);
    const items=[...selectedIds].map(id=>cy.getElementById(id));
    const nodes=items.filter(item=>item.isNode()),edges=items.filter(item=>item.isEdge());
    const header=element("div","entity-header");
    header.append(element("div","entity-kind","MULTI-SELECTION"),element("h2","",`${nodes.length} entities · ${edges.length} connections`),element("div","entity-subtitle","Changes below apply to every selected record."));root.append(header);
    const content=element("div","inspector-content"),list=section(content,"SELECTED RECORDS");
    const names=element("div","multi-list");items.slice(0,30).forEach(item=>names.append(element("div","",item.data("label")||item.id())));
    if(items.length>30)names.append(element("div","",`+ ${items.length-30} more`));list.append(names);
    const style=section(content,"BATCH APPEARANCE");
    colorField(style,"#59dec8",value=>items.forEach(item=>{const record=item.isNode()?caseData.nodes.find(n=>n.id===item.id()):caseData.edges.find(e=>e.id===item.id());if(record)applyAppearance(record,{color:value});}));
    if(nodes.length)selectField(style,"Entity icon",nodes[0].data("appearance").icon,pairsToObject(Object.entries(ICONS).map(([key,v])=>[key,v.label])),value=>nodes.forEach(item=>{const n=caseData.nodes.find(record=>record.id===item.id());if(n)applyAppearance(n,{icon:value});}));
    const clear=element("button","reset-position","Clear selection");clear.type="button";clear.addEventListener("click",clearSelection);content.append(clear);root.append(content);
  }
  function section(parent,title,subtext){
    const box=element("section","attribute-section"),heading=element("div","attribute-section-heading");
    heading.append(element("span","",title));
    if(subtext)heading.append(element("small","",subtext));
    box.append(heading);parent.append(box);return box;
  }
  function textField(parent,title,value,max,onInput,multiline=false){
    const label=element("label","attribute-control"),name=element("span","",title);
    const input=element(multiline?"textarea":"input","attribute-input");
    if(!multiline)input.type="text";
    input.maxLength=max;input.value=value||"";
    input.addEventListener("focus",checkpoint);
    input.addEventListener("input",()=>{onInput(input.value);markDirty();});
    label.append(name,input);parent.append(label);return input;
  }
  function selectField(parent,title,value,options,onChange){
    const label=element("label","attribute-control"),name=element("span","",title),select=element("select","attribute-input");
    Object.entries(options).forEach(([key,caption])=>{const opt=element("option","",caption);opt.value=key;select.append(opt);});
    select.value=value;
    select.addEventListener("change",()=>{checkpoint();onChange(select.value);markDirty();});
    label.append(name,select);parent.append(label);return select;
  }
  function rangeField(parent,key,title,value,min,max,step,onInput,display){
    const box=element("div",""),head=element("div","range-header");
    const label=element("label","",title),output=element("output","",display(value));
    const input=element("input","attribute-range");input.type="range";input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(value);
    input.id="range-"+key;input.dataset.range=key;output.dataset.output=key;label.htmlFor=input.id;
    input.addEventListener("focus",checkpoint);
    input.addEventListener("input",()=>{const n=Number(input.value);output.textContent=display(n);onInput(n);markDirty();});
    head.append(label,output);box.append(head,input);parent.append(box);return input;
  }
  function colorField(parent,value,onInput){
    const label=element("label","attribute-control"),title=element("span","","Color"),row=element("span","color-control");
    const input=element("input");input.type="color";input.value=value;
    const code=element("code","",value.toUpperCase());
    input.addEventListener("focus",checkpoint);
    input.addEventListener("input",()=>{code.textContent=input.value.toUpperCase();onInput(input.value);markDirty();});
    row.append(input,code);label.append(title,row);parent.append(label);
  }
  function dateField(parent,title,value,onChange){
    const label=element("label","attribute-control"),input=element("input","attribute-input");
    input.type="date";input.value=value||"";
    input.addEventListener("change",()=>{checkpoint();onChange(input.value);markDirty();});
    label.append(element("span","",title),input);parent.append(label);
  }
  function jsonField(parent,title,value,kind,onChange){
    const label=element("label","attribute-control"),input=element("textarea","attribute-input structured-input"),hint=element("small","field-hint","JSON "+(kind==="array"?"array of source records":"object of attribute values"));
    input.value=JSON.stringify(value|| (kind==="array"?[]:{}),null,2);
    input.spellcheck=false;input.addEventListener("focus",checkpoint);
    input.addEventListener("change",()=>{
      try{
        const parsed=JSON.parse(input.value);
        if(kind==="array"?!Array.isArray(parsed):!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw Error("Wrong JSON shape");
        onChange(parsed);input.setCustomValidity("");hint.textContent="Saved";markDirty();
      }catch{input.setCustomValidity("Enter valid "+kind+" JSON");hint.textContent="Invalid JSON — changes not saved";}
    });
    label.append(element("span","",title),input,hint);parent.append(label);
  }
  function applyAppearance(record,changes){
    const isNode=Boolean(record.type);
    record.appearance=isNode?nodeAppearance(record,{...record.appearance,...changes}):edgeAppearance({...record.appearance,...changes});
    const item=cy.getElementById(record.id);
    item.data("appearance",{...record.appearance});
    if(!isNode)syncEdgeLabel(item);
    updateLabelHandle();
  }
  function iconHeader(header,n){
    const box=element("div","entity-icon"),img=element("img");
    img.src=iconUri(n.appearance.icon);img.alt="";img.width=26;img.height=26;
    box.style.color=n.appearance.color;box.style.background=n.appearance.color+"1b";
    box.append(img);header.append(box);
  }
  function renderInspector(id){
    const root=$("inspector"),item=cy.getElementById(id);
    root.replaceChildren();root.scrollTop=0;inspectorTop(root);
    if(item.isNode()){
      const n=caseData.nodes.find(v=>v.id===id),a=n.appearance,type=TYPES[n.type];
      const header=element("div","entity-header");iconHeader(header,n);
      header.append(element("div","entity-kind",type.singular),element("h2","",n.label),element("div","entity-subtitle",n.subtitle||"Investigation entity"));
      root.append(header);
      const content=element("div","inspector-content"),attributes=section(content,"ENTITY ATTRIBUTES");
      const labelInput=textField(attributes,"Display label",n.label,80,value=>{
        n.label=value;item.data("label",value);header.querySelector("h2").textContent=value||"Untitled entity";
      });
      labelInput.addEventListener("change",()=>{if(!n.label.trim()){n.label="Untitled entity";labelInput.value=n.label;item.data("label",n.label);header.querySelector("h2").textContent=n.label;}});
      selectField(attributes,"Entity type",n.type,pairsToObject(Object.entries(TYPES).map(([key,v])=>[key,v.singular])),value=>{
        const old=n.type,oldColor=TYPES[old].color;
        n.type=value;if(n.appearance.icon===old)n.appearance.icon=value;
        if(n.appearance.color===oldColor)n.appearance.color=TYPES[value].color;
        item.data("type",value);applyAppearance(n,{});enabled.add(value);updateFilters();renderInspector(id);
      });
      selectField(attributes,"Confidence",n.confidence||"low",{high:"High",medium:"Medium",low:"Low"},value=>{n.confidence=value;});
      textField(attributes,"Jurisdiction / country",n.country||"",100,value=>{n.country=value;});
      textField(attributes,"Context / note",n.notes||n.description,500,value=>{n.notes=value;n.description=value;},true);
      textField(attributes,"Tags (comma separated)",(n.tags||[]).join(", "),300,value=>{n.tags=value.split(",").map(x=>x.trim()).filter(Boolean).slice(0,15);});
      jsonField(attributes,"Additional attributes",n.properties,"object",value=>{n.properties=value;});
      jsonField(attributes,"Source excerpts",n.sources,"array",value=>{n.sources=value;});
      const appearance=section(content,"NODE APPEARANCE");
      colorField(appearance,a.color,value=>{applyAppearance(n,{color:value});header.querySelector(".entity-icon").style.color=value;});
      const iconRow=element("div","icon-preview"),preview=element("img");
      preview.src=iconUri(a.icon);preview.alt="";
      const iconSelect=selectField(appearance,"Icon",a.icon,pairsToObject(Object.entries(ICONS).map(([key,v])=>[key,v.label])),value=>{
        applyAppearance(n,{icon:value});preview.src=iconUri(value);header.querySelector(".entity-icon img").src=iconUri(value);
      });
      iconSelect.parentElement.insertBefore(iconRow,iconSelect);iconRow.append(preview,iconSelect);
      const grid=element("div","attribute-grid");appearance.append(grid);
      selectField(grid,"Shape",a.shape,SHAPES,value=>applyAppearance(n,{shape:value}));
      rangeField(grid,"node-size","Size",a.size,28,80,1,value=>applyAppearance(n,{size:value}),value=>Math.round(value)+" px");
      const labels=section(content,"NODE LABEL","Drag the teal handle");
      labels.append(element("p","attribute-hint","Move the label freely around its node. Use the handle on the canvas for direct placement."));
      rangeField(labels,"node-label-x","Horizontal offset",a.labelDx,-220,220,1,value=>applyAppearance(n,{labelDx:value}),value=>Math.round(value)+" px");
      rangeField(labels,"node-label-y","Vertical offset",a.labelDy,-220,220,1,value=>applyAppearance(n,{labelDy:value}),value=>Math.round(value)+" px");
      const reset=element("button","reset-position","Reset label position");reset.type="button";
      reset.addEventListener("click",()=>{checkpoint();applyAppearance(n,{labelDx:0,labelDy:0});updateRangeDisplay("node-label-x",0);updateRangeDisplay("node-label-y",0);markDirty();});
      labels.append(reset);
      const links=section(content,"CONNECTIONS",String(item.connectedEdges().length));
      item.connectedEdges().forEach(edge=>{
        const other=edge.source().id()===id?edge.target():edge.source();
        const btn=element("button","connection-row"),line=element("span");
        line.append(element("span","",other.data("label")),element("small","",edge.data("label")));
        btn.append(line,element("span","arrow","↗"));btn.addEventListener("click",()=>selectElement(other.id(),true));links.append(btn);
      });
      root.append(content);
    }else{
      const e=caseData.edges.find(v=>v.id===id),a=e.appearance;
      const header=element("div","entity-header"),icon=element("div","entity-icon","↗");
      icon.style.color=a.color;icon.style.background=a.color+"1b";
      header.append(icon,element("div","entity-kind","CONNECTION"),element("h2","",e.label),element("div","entity-subtitle","Relationship between two entities"));root.append(header);
      const content=element("div","inspector-content"),attributes=section(content,"CONNECTION ATTRIBUTES");
      const from=caseData.nodes.find(n=>n.id===e.source)?.label||e.source,to=caseData.nodes.find(n=>n.id===e.target)?.label||e.target;
      const flow=element("div","edge-flow");flow.append(document.createTextNode(from),element("span","","→"),document.createTextNode(to));attributes.append(flow);
      const labelInput=textField(attributes,"Relationship label",e.label,60,value=>{e.label=value;item.data("label",value);header.querySelector("h2").textContent=value||"Untitled connection";});
      labelInput.addEventListener("change",()=>{if(!e.label.trim()){e.label="connected to";labelInput.value=e.label;item.data("label",e.label);header.querySelector("h2").textContent=e.label;}});
      selectField(attributes,"Confidence",e.confidence||"low",{high:"High",medium:"Medium",low:"Low"},value=>{e.confidence=value;});
      selectField(attributes,"Evidence status",e.status||"Documented",STATUSES,value=>{e.status=value;});
      selectField(attributes,"Direction",e.directed===false?"undirected":"directed",{directed:"Directed",undirected:"Undirected"},value=>{e.directed=value==="directed";applyAppearance(e,{arrow:e.directed?"triangle":"none"});});
      const dateGrid=element("div","attribute-grid");attributes.append(dateGrid);
      dateField(dateGrid,"Start date",e.startDate,value=>{e.startDate=value;});
      dateField(dateGrid,"End date",e.endDate,value=>{e.endDate=value;});
      textField(attributes,"Notes",e.notes||e.sourceNote,500,value=>{e.notes=value;e.sourceNote=value;},true);
      jsonField(attributes,"Additional attributes",e.properties,"object",value=>{e.properties=value;});
      jsonField(attributes,"Source excerpts",e.sources,"array",value=>{e.sources=value;});
      const appearance=section(content,"CONNECTION APPEARANCE");
      colorField(appearance,a.color,value=>{applyAppearance(e,{color:value});icon.style.color=value;});
      rangeField(appearance,"edge-width","Line width",a.width,1,10,.5,value=>applyAppearance(e,{width:value}),value=>Number(value).toFixed(1)+" px");
      const grid=element("div","attribute-grid");appearance.append(grid);
      selectField(grid,"Line style",a.lineStyle,LINE_STYLES,value=>applyAppearance(e,{lineStyle:value}));
      selectField(grid,"Arrowhead",a.arrow,ARROWS,value=>applyAppearance(e,{arrow:value}));
      const labels=section(content,"EDGE LABEL","Slide along connection");
      labels.append(element("p","attribute-hint","Drag the teal handle on the canvas or slide below. Position follows the edge when nodes move."));
      rangeField(labels,"edge-label","Label along edge",Math.round(a.labelT*100),5,95,1,value=>applyAppearance(e,{labelT:value/100}),value=>Math.round(value)+"%");
      const reset=element("button","reset-position","Center label");reset.type="button";
      reset.addEventListener("click",()=>{checkpoint();applyAppearance(e,{labelT:.5});updateRangeDisplay("edge-label",.5);markDirty();});
      labels.append(reset);root.append(content);
    }
  }
  function runLayout(name){
    checkpoint();
    if(name==="preset"){
      caseData.nodes.forEach(n=>{if(n.position)cy.getElementById(n.id).position(n.position);});
      cy.fit(cy.elements().not(".filtered"),60);scheduleVisualSync();markDirty();return;
    }
    const opts={name,fit:true,padding:65,animate:true,animationDuration:500};
    if(name==="cose")Object.assign(opts,{randomize:false,nodeRepulsion:90000,idealEdgeLength:120});
    if(name==="breadthfirst")Object.assign(opts,{roots:cy.getElementById("harborlight").empty()?undefined:cy.getElementById("harborlight"),directed:false,spacingFactor:1.25});
    if(name==="concentric")Object.assign(opts,{concentric:n=>n.degree(),levelWidth:()=>2,spacingFactor:1.2});
    cy.layout(opts).run();
    cy.one("layoutstop",()=>{caseData.nodes.forEach(n=>{const p=cy.getElementById(n.id).position();n.position={x:p.x,y:p.y};});markDirty();});
  }
  function showToast(message){
    const t=$("toast");t.textContent=message;t.classList.add("show");
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),3000);
  }
  function download(data,name,type){
    const url=URL.createObjectURL(new Blob([data],{type})),link=element("a");
    link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function normalizedSources(value){
    if(!Array.isArray(value))return [];
    return value.slice(0,200).map(source=>typeof source==="string"?{excerpt:source}:source&&typeof source==="object"?{
      file:safeText(source.file,200),sheet:safeText(source.sheet,200),row:Number.isInteger(source.row)?source.row:undefined,
      url:/^https?:\/\//i.test(source.url||"")?safeText(source.url,2000):undefined,excerpt:safeText(source.excerpt,5000)
    }:null).filter(Boolean);
  }
  function normalizedProperties(value){
    if(!value||typeof value!=="object"||Array.isArray(value))return {};
    return pairsToObject(Object.entries(value).filter(([key])=>!["__proto__","constructor","prototype"].includes(key)).slice(0,200).map(([key,v])=>[safeText(key,100),typeof v==="string"?v:JSON.stringify(v)]));
  }
  function toProject(){
    return {format:"alatar-graph",version:1,id:caseData.id||"graph-local",title:caseData.name,description:caseData.description||"",updatedAt:new Date().toISOString(),
      nodes:caseData.nodes.map(n=>({id:n.id,label:n.label,type:n.type,country:n.country||"",notes:n.notes||n.description||"",properties:normalizedProperties(n.properties),sources:normalizedSources(n.sources),position:cy?.getElementById(n.id)?.position()||n.position,color:n.appearance?.color,icon:n.appearance?.icon,appearance:n.appearance})),
      edges:caseData.edges.map(e=>({id:e.id,source:e.source,target:e.target,label:e.label,directed:e.directed!==false,status:STATUSES[e.status]?e.status:"Reported",startDate:e.startDate||"",endDate:e.endDate||"",notes:e.notes||e.sourceNote||"",properties:normalizedProperties(e.properties),sources:normalizedSources(e.sources),appearance:e.appearance}))};
  }
  function exportCase(){
    const filename=(caseData.name||"network").replace(/[^\p{L}\p{N}_-]+/gu,"-").replace(/^-|-$/g,"").slice(0,70)||"network";
    download(JSON.stringify(toProject(),null,2),filename+"-alatars-graph.json","application/json");
    showToast("Alatar's Graph project file saved");
  }
  function validateCase(raw){
    if(!raw||!Array.isArray(raw.nodes)||!Array.isArray(raw.edges))throw Error("JSON must contain nodes and edges arrays.");
    if(raw.nodes.length>5000||raw.edges.length>12000)throw Error("Limit: 5,000 entities and 12,000 connections.");
    if(raw.format!=="alatar-graph"||raw.version!==1)throw Error("Unsupported project format.");
    const ids=new Set();
    const nodes=raw.nodes.map((n,i)=>{
      const id=safeText(n.id,80),label=safeText(n.label,80);
      const sourceType=safeText(n.type,30).toLowerCase();
      const type=TYPES[sourceType]?sourceType:"other";
      if(!id||!label||!TYPES[type]||ids.has(id))throw Error("Invalid or duplicate entity at row "+(i+1)+".");
      ids.add(id);
      const p=n.position&&Number.isFinite(n.position.x)&&Number.isFinite(n.position.y)?
        {x:clamp(n.position.x,-10000,10000),y:clamp(n.position.y,-10000,10000)}:undefined;
      const record={id,label,type,subtitle:safeText(n.subtitle,100),description:safeText(n.notes||n.description,5000),notes:safeText(n.notes||n.description,5000),country:safeText(n.country,100),properties:normalizedProperties(n.properties),
        confidence:["high","medium","low"].includes(n.confidence)?n.confidence:"low",
        tags:Array.isArray(n.tags)?n.tags.slice(0,15).map(x=>safeText(x,40)).filter(Boolean):[],
        sources:normalizedSources(n.sources),position:p};
      record.appearance=nodeAppearance(record,{...n.appearance,color:n.color||n.appearance?.color,icon:ICONS[n.appearance?.icon]?n.appearance.icon:n.icon});
      return record;
    });
    const edges=raw.edges.map((e,i)=>{
      const id=safeText(e.id,80),source=safeText(e.source,80),target=safeText(e.target,80);
      if(!id||ids.has(id)||!ids.has(source)||!ids.has(target)||source===target)throw Error("Invalid connection at row "+(i+1)+".");
      ids.add(id);
      return {id,source,target,label:safeText(e.label,60)||"connected to",
        confidence:["high","medium","low"].includes(e.confidence)?e.confidence:"low",
        status:STATUSES[e.status]?e.status:"Reported",directed:e.directed!==false,startDate:safeText(e.startDate,10),endDate:safeText(e.endDate,10),
        notes:safeText(e.notes||e.sourceNote,5000),sourceNote:safeText(e.notes||e.sourceNote,5000),properties:normalizedProperties(e.properties),sources:normalizedSources(e.sources),
        appearance:edgeAppearance({...e.appearance,arrow:e.directed===false?"none":e.appearance?.arrow})};
    });
    return {id:safeText(raw.id,100)||"graph-"+crypto.randomUUID(),name:safeText(raw.title||raw.name,100)||"Imported case",description:safeText(raw.description,1000),nodes,edges};
  }
  function parseCsv(text){
    const rows=[];let row=[],cell="",quoted=false;
    text=String(text).replace(/^\uFEFF/,"");
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
      else if(c===","&&!quoted){row.push(cell);cell="";}
      else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell="";}
      else cell+=c;
    }
    if(quoted)throw Error("CSV has an unclosed quoted field.");
    row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
    if(!rows.length)throw Error("CSV file is empty.");
    const headers=rows.shift().map(v=>v.trim().toLowerCase().replace(/[^a-z0-9]/g,""));
    return rows.map((values,index)=>({row:index+2,values:pairsToObject(headers.map((header,j)=>[header,(values[j]||"").trim()]))}));
  }
  function field(record,...names){for(const name of names){const value=record[name.toLowerCase().replace(/[^a-z0-9]/g,"")];if(value)return value;}return "";}
  function csvType(value){const v=value.toLowerCase();return /person|individual/.test(v)?"Person":/org|company|business|fund|association/.test(v)?"Organization":/location|address|place/.test(v)?"Location":/account|email|social/.test(v)?"Account":"Other";}
  function csvStatus(value){return /histor|former|inactive/i.test(value)?"Historical":/uncertain|unconfirmed|possible/i.test(value)?"Uncertain":/report|alleg/i.test(value)?"Reported":"Documented";}
  let csvSheets=[];
  function buildCsvGraph(createPlaceholders){
    const nodes=new Map(),edges=[],warnings=[];let skipped=0,placeholders=0;
    const source=(sheet,row,record)=>({file:sheet.name,row,excerpt:field(record,"notes","evidence","description","comment")||undefined,url:/^https?:\/\//i.test(field(record,"source_url","url"))?field(record,"source_url","url"):undefined});
    for(const sheet of csvSheets){
      if(sheet.kind==="edges")continue;
      for(const item of sheet.rows){
        const r=item.values,id=field(r,"entity_id","node_id","id","sayari_id"),label=field(r,"canonical_name","entity_name","name","label","display_name"),attr=field(r,"attribute","property","field"),value=field(r,"value","attribute_value");
        if(!id){skipped++;warnings.push(`${sheet.name} row ${item.row}: missing entity ID`);continue;}
        let n=nodes.get(id);
        if(!n){n={id,label:label||id,type:csvType(field(r,"entity_type","type","category")),country:field(r,"country","jurisdiction"),notes:field(r,"notes","description"),properties:{},sources:[],position:undefined};nodes.set(id,n);}
        if(sheet.kind==="attributes"){
          if(attr&&value&&!['__proto__','constructor','prototype'].includes(attr))n.properties[attr]=value;
          if(/^(name|legal_name|canonical_name)$/i.test(attr)&&value&&n.label===id)n.label=value;
        }else for(const [key,v] of Object.entries(r))if(v&&!['__proto__','constructor','prototype'].includes(key))n.properties[key]=v;
        n.sources.push(source(sheet,item.row,r));
      }
    }
    const edgeIds=new Set();
    for(const sheet of csvSheets){
      if(sheet.kind!=="edges")continue;
      for(const item of sheet.rows){
        const r=item.values,from=field(r,"source_id","source_entity_id","source","from_id","from"),to=field(r,"target_id","target_entity_id","target","to_id","to");
        if(!from||!to){skipped++;warnings.push(`${sheet.name} row ${item.row}: missing endpoint ID`);continue;}
        for(const id of [from,to])if(!nodes.has(id)&&createPlaceholders){nodes.set(id,{id,label:id,type:"Other",country:"",notes:"Unresolved endpoint created from a connection row. Identity needs review.",properties:{"Import status":"Unresolved endpoint"},sources:[source(sheet,item.row,r)]});placeholders++;}
        if(!nodes.has(from)||!nodes.has(to)){skipped++;warnings.push(`${sheet.name} row ${item.row}: endpoint ID was not found`);continue;}
        let id=field(r,"connection_id","relationship_id","link_id","id")||`edge:${sheet.name}:${item.row}`;
        if(edgeIds.has(id)||nodes.has(id))id=`edge:${sheet.name}:${item.row}`;
        edgeIds.add(id);
        edges.push({id,source:from,target:to,label:field(r,"relationship","relationship_type","label","relation","type")||"Related to",directed:!(/^(false|no|0)$/i).test(field(r,"directed","is_directed")),status:csvStatus(field(r,"status","relationship_status","evidence_status")),startDate:field(r,"start_date","date_from","valid_from"),endDate:field(r,"end_date","date_to","valid_to"),notes:field(r,"notes","evidence","description"),properties:{...r},sources:[source(sheet,item.row,r)]});
      }
    }
    if(!nodes.size)throw Error("No entities found. Include an entity CSV or enable endpoint placeholders.");
    const raw={format:"alatar-graph",version:1,id:"graph-"+crypto.randomUUID(),title:csvSheets[0]?.name.replace(/\.[^.]+$/,"")||"Imported network",description:"Imported CSV graph; source claims require review.",nodes:[...nodes.values()],edges,updatedAt:new Date().toISOString()};
    return {graph:validateCase(raw),warnings,skipped,placeholders};
  }
  function renderCsvPreview(){
    const box=$("import-preview");box.replaceChildren();
    try{
      const result=buildCsvGraph($("create-placeholders").checked);
      box.append(element("strong","",`${result.graph.nodes.length} entities · ${result.graph.edges.length} connections`));
      box.append(element("p","",`${result.skipped} skipped rows · ${result.placeholders} unresolved endpoint placeholders`));
      csvSheets.forEach(sheet=>box.append(element("div","",`${sheet.name}: ${sheet.kind} · ${sheet.rows.length} rows`)));
      result.warnings.slice(0,8).forEach(w=>box.append(element("small","import-warning",w)));
      if(result.warnings.length>8)box.append(element("small","",`+ ${result.warnings.length-8} more warnings`));
      $("import-form").querySelector('[type="submit"]').disabled=false;
    }catch(error){box.append(element("p","import-warning",error.message));$("import-form").querySelector('[type="submit"]').disabled=true;}
  }
  function populateEntitySelects(){
    for(const id of ["link-source","link-target"]){
      const select=$(id);select.replaceChildren();
      caseData.nodes.forEach(n=>{const option=element("option","",n.label);option.value=n.id;select.append(option);});
    }
  }
  function setMode(next){
    mode=next;
    $("entity-tab").classList.toggle("active",mode==="entity");
    $("link-tab").classList.toggle("active",mode==="link");
    $("entity-fields").hidden=mode!=="entity";$("link-fields").hidden=mode!=="link";
    $("entity-name").required=mode==="entity";$("form-error").textContent="";
  }
  function addEntity(){
    const label=$("entity-name").value.trim(),type=$("entity-type").value,note=$("entity-note").value.trim();
    if(!label)throw Error("Enter an entity name.");
    const id="n-"+crypto.randomUUID(),center=cy.extent();
    const position={x:(center.x1+center.x2)/2+Math.random()*80-40,y:(center.y1+center.y2)/2+Math.random()*80-40};
    checkpoint();
    const n={id,label,type,subtitle:"Added in this session",description:note,notes:note,country:"",properties:{},confidence:"low",tags:[],sources:[],position};
    n.appearance=nodeAppearance(n);
    caseData.nodes.push(n);cy.add({group:"nodes",data:{id,label,type,appearance:n.appearance},position});
    enabled.add(type);updateFilters();selectElement(id,true);markDirty();showToast("Entity added to chart");
  }
  function addLink(){
    const source=$("link-source").value,target=$("link-target").value,label=$("link-label").value.trim(),note=$("link-note").value.trim();
    if(source===target)throw Error("Choose two different entities.");
    if(!label)throw Error("Enter a relationship label.");
    checkpoint();
    const id="e-"+crypto.randomUUID(),e={id,source,target,label,confidence:"low",status:"Reported",directed:true,startDate:"",endDate:"",notes:note,sourceNote:note,properties:{},sources:[],appearance:edgeAppearance()};
    caseData.edges.push(e);const item=cy.add({group:"edges",data:{id,source,target,label,appearance:e.appearance}});
    syncEdgeLabel(item);selectElement(id);updateFilters();markDirty();showToast("Connection added to chart");
  }
  function search(){
    const query=$("search").value.trim().toLowerCase(),box=$("search-results");
    box.replaceChildren();applyFilters();if(!query){box.hidden=true;return;}
    const matches=caseData.nodes.filter(n=>[n.id,n.label,n.subtitle,n.description,n.notes,...Object.values(n.properties||{}),...(n.tags||[])].join(" ").toLowerCase().includes(query)).slice(0,8);
    if(matches.length){
      matches.forEach(n=>{
        const btn=element("button","search-result"),dot=element("span","type-dot");
        dot.style.background=n.appearance.color;
        const text=element("span");
        text.append(element("strong","",n.label),element("small","",TYPES[n.type].singular+(n.subtitle?" · "+n.subtitle:"")));
        btn.append(dot,text);
        btn.addEventListener("click",()=>{enabled.add(n.type);$("search").value="";updateFilters();selectElement(n.id,true);box.hidden=true;});
        box.append(btn);
      });
    }else box.append(element("div","empty-result","No matching entities"));
    box.hidden=false;
  }
  $("show-all").addEventListener("click",()=>{enabled=new Set(Object.keys(TYPES));updateFilters();});
  $("clear-filters").addEventListener("click",()=>{
    enabled=new Set(Object.keys(TYPES));$("search").value="";$("relationship-filter").value="all";$("country-filter").value="all";$("status-filter").value="all";$("date-filter").value="";$("neighborhood-filter").checked=false;$("isolated-filter").checked=false;updateFilters();$("search-results").hidden=true;
  });
  for(const id of ["relationship-filter","country-filter","status-filter","date-filter","neighborhood-filter","isolated-filter"])$(id).addEventListener("change",applyFilters);
  $("reset-button").addEventListener("click",()=>{checkpoint();clearTimeout(draftTimer);localStorage.removeItem(DRAFT_KEY);caseData=clone(window.ALATARS_GRAPH_DEMO);imported=false;enabled=new Set(Object.keys(TYPES));selected=null;$("layout-select").value="preset";$("save-status").textContent="LOCAL DEMO";initGraph();showToast("Demo case reset");});
  $("new-graph-button").addEventListener("click",()=>{
    graphDialogMode="create";$("graph-dialog-title").textContent="New graph";$("graph-submit").textContent="Create graph";$("graph-name").value="Untitled investigation";$("graph-dialog").showModal();
  });
  $("case-title").addEventListener("click",()=>{
    graphDialogMode="rename";$("graph-dialog-title").textContent="Rename graph";$("graph-submit").textContent="Save title";$("graph-name").value=caseData.name;$("graph-dialog").showModal();
  });
  $("graph-form").addEventListener("submit",event=>{
    event.preventDefault();const title=safeText($("graph-name").value,100);if(!title)return;
    checkpoint();
    if(graphDialogMode==="create"){
      caseData={id:"graph-"+crypto.randomUUID(),name:title,description:"",nodes:[],edges:[]};
      imported=true;selected=null;enabled=new Set(Object.keys(TYPES));$("layout-select").value="preset";initGraph();showToast("Blank graph ready");
    }else{caseData.name=title;renderCaseInfo();showToast("Graph renamed");}
    $("graph-dialog").close();markDirty();
  });
  document.querySelectorAll("[data-close]").forEach(button=>button.addEventListener("click",()=>$(button.dataset.close).close()));
  $("undo-button").addEventListener("click",()=>restoreHistory(undoStack,redoStack));
  $("redo-button").addEventListener("click",()=>restoreHistory(redoStack,undoStack));
  $("delete-button").addEventListener("click",()=>{
    if(!selectedIds.size)return;
    const nodeIds=new Set([...selectedIds].filter(id=>cy.getElementById(id).isNode()));
    const edgeIds=new Set(caseData.edges.filter(e=>selectedIds.has(e.id)||nodeIds.has(e.source)||nodeIds.has(e.target)).map(e=>e.id));
    $("delete-message").textContent=`Delete ${nodeIds.size} entit${nodeIds.size===1?"y":"ies"} and ${edgeIds.size} connection${edgeIds.size===1?"":"s"}? Connections attached to selected entities are included even when filters hide them.`;
    $("delete-dialog").showModal();
  });
  $("delete-form").addEventListener("submit",event=>{
    event.preventDefault();if(!selectedIds.size){$("delete-dialog").close();return;}
    const nodeIds=new Set([...selectedIds].filter(id=>cy.getElementById(id).isNode()));
    const edgeIds=new Set([...selectedIds].filter(id=>cy.getElementById(id).isEdge()));
    checkpoint();
    caseData.nodes=caseData.nodes.filter(n=>!nodeIds.has(n.id));
    caseData.edges=caseData.edges.filter(e=>!edgeIds.has(e.id)&&!nodeIds.has(e.source)&&!nodeIds.has(e.target));
    selected=null;selectedIds.clear();$("delete-dialog").close();initGraph();markDirty();showToast("Selection deleted");
  });
  document.querySelectorAll(".lead").forEach(btn=>btn.addEventListener("click",()=>{
    const n=caseData.nodes.find(v=>v.id===btn.dataset.target);
    if(!n)return;enabled.add(n.type);updateFilters();selectElement(n.id,true);
  }));
  $("layout-select").addEventListener("change",event=>runLayout(event.target.value));
  $("fit-button").addEventListener("click",()=>cy.fit(cy.elements().not(".filtered"),55));
  $("zoom-in").addEventListener("click",()=>cy.zoom({level:Math.min(3,cy.zoom()*1.25),renderedPosition:{x:cy.width()/2,y:cy.height()/2}}));
  $("zoom-out").addEventListener("click",()=>cy.zoom({level:Math.max(.25,cy.zoom()/1.25),renderedPosition:{x:cy.width()/2,y:cy.height()/2}}));
  $("png-button").addEventListener("click",()=>{
    try{
      const a=element("a");a.href=cy.png({output:"base64uri",full:true,bg:"#0a1720",scale:2});
      a.download="alatars-graph-chart.png";document.body.append(a);a.click();a.remove();showToast("Chart PNG exported");
    }catch{showToast("PNG export is unavailable in this browser");}
  });
  $("export-button").addEventListener("click",exportCase);
  $("import-button").addEventListener("click",()=>$("import-file").click());
  $("import-file").addEventListener("change",async event=>{
    const files=[...(event.target.files||[])];event.target.value="";
    if(!files.length)return;
    if(files.some(file=>file.size>2_000_000)){showToast("Each file must be 2 MB or less");return;}
    try{
      if(files.some(file=>/\.json$/i.test(file.name))){
        if(files.length!==1)throw Error("Open one JSON project at a time.");
        const parsed=validateCase(JSON.parse(await files[0].text()));
        checkpoint();caseData=parsed;imported=true;enabled=new Set(Object.keys(TYPES));selected=null;
        $("layout-select").value="preset";initGraph();
        if(caseData.nodes.some(n=>!n.position))runLayout("cose");
        markDirty();showToast("Project opened locally");
      }else{
        csvSheets=await Promise.all(files.map(async file=>{
          if(!/\.csv$/i.test(file.name))throw Error("Use an Alatar's Graph JSON project or CSV files.");
          const rows=parseCsv(await file.text()),headers=Object.keys(rows[0]?.values||{});
          const has=(...names)=>names.some(name=>headers.includes(name));
          const kind=has("source","sourceid","sourceentityid","from","fromid")&&has("target","targetid","targetentityid","to","toid")?"edges":has("attribute","property","field")&&has("value","attributevalue")?"attributes":"nodes";
          return {name:file.name,rows,kind};
        }));
        $("create-placeholders").checked=false;renderCsvPreview();$("import-dialog").showModal();
      }
    }catch(error){showToast(error.message||"Could not import JSON");}
  });
  $("create-placeholders").addEventListener("change",renderCsvPreview);
  $("import-form").addEventListener("submit",event=>{
    event.preventDefault();
    try{
      const result=buildCsvGraph($("create-placeholders").checked);
      checkpoint();caseData=result.graph;imported=true;enabled=new Set(Object.keys(TYPES));selected=null;
      $("layout-select").value="cose";$("import-dialog").close();initGraph();runLayout("cose");markDirty();
      showToast(`CSV graph opened · ${result.skipped} rows skipped`);
    }catch(error){showToast(error.message||"Could not build CSV graph");}
  });
  $("new-button").addEventListener("click",()=>{$("editor-form").reset();populateEntitySelects();setMode("entity");$("editor-dialog").showModal();});
  $("close-dialog").addEventListener("click",()=>$("editor-dialog").close());
  $("cancel-dialog").addEventListener("click",()=>$("editor-dialog").close());
  $("entity-tab").addEventListener("click",()=>setMode("entity"));
  $("link-tab").addEventListener("click",()=>setMode("link"));
  $("editor-form").addEventListener("submit",event=>{
    event.preventDefault();
    try{mode==="entity"?addEntity():addLink();$("editor-dialog").close();updateCounts();}
    catch(error){$("form-error").textContent=error.message;}
  });
  $("search").addEventListener("input",search);
  document.addEventListener("keydown",event=>{
    if(event.key==="/"&&!$("editor-dialog").open&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){event.preventDefault();$("search").focus();}
    if(event.key==="Escape"){$("search-results").hidden=true;$("search").blur();if(!document.querySelector("dialog[open]"))clearSelection();}
    if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)||$("editor-dialog").open)return;
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="a"){event.preventDefault();setSelection(new Set(cy.elements().not(".filtered").map(item=>item.id())));}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="z"){event.preventDefault();restoreHistory(event.shiftKey?redoStack:undoStack,event.shiftKey?undoStack:redoStack);}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="y"){event.preventDefault();restoreHistory(redoStack,undoStack);}
    if((event.key==="Delete"||event.key==="Backspace")&&selectedIds.size){event.preventDefault();$("delete-button").click();}
  });
  document.addEventListener("click",event=>{if(!event.target.closest(".search-wrap,.search-results"))$("search-results").hidden=true;});
  $("filter-drawer").open=true;
  $("mobile-filters-button").addEventListener("click",()=>{document.body.classList.toggle("filters-open");document.body.classList.remove("inspector-open");syncSidePanels();});
  $("mobile-filters-close").addEventListener("click",()=>{document.body.classList.remove("filters-open");syncSidePanels();});
  $("panel-scrim").addEventListener("click",()=>{document.body.classList.remove("filters-open","inspector-open");syncSidePanels();});
  window.addEventListener("resize",()=>{
    if(window.matchMedia("(min-width:721px)").matches)document.body.classList.remove("filters-open","inspector-open");
    else if(selectedIds.size)document.body.classList.add("inspector-open");
    syncSidePanels();
  });
  setupPanelResize();
  try{const draft=localStorage.getItem(DRAFT_KEY);if(draft){caseData=validateCase(JSON.parse(draft));imported=true;$("save-status").textContent="BROWSER DRAFT";}}catch{localStorage.removeItem(DRAFT_KEY);}
  initGraph();
  window.ALATARS_GRAPH_API={
    project:()=>toProject(),
    load:raw=>{
      const next=validateCase(raw);
      checkpoint();caseData=next;imported=true;enabled=new Set(Object.keys(TYPES));selected=null;
      $("layout-select").value="preset";initGraph();
      if(caseData.nodes.some(n=>!n.position))runLayout("cose");
      markDirty();showToast("Stored graph opened");
    },
    toast:showToast
  };
})();
