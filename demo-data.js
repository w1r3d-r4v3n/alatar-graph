// Fictional entities and source notes for product demonstration only.
window.ALATARS_GRAPH_DEMO = {
  name: "Harborlight Network",
  nodes: [
    {id:"harborlight",label:"Harborlight Logistics",type:"organization",subtitle:"Freight services",description:"Central organization in this fictional case. Explore its people, domains, records, and payments.",confidence:"high",tags:["central entity","shipping"],sources:["Demo corporate registry extract","Demo company website"],position:{x:540,y:320}},
    {id:"northstar",label:"northstar-freight.example",type:"domain",subtitle:"Website domain",description:"A fictional domain that points to the Northstar Freight brand and shares a contact record with Harborlight.",confidence:"medium",tags:["web infrastructure"],sources:["Demo WHOIS record","Demo website snapshot"],position:{x:270,y:175}},
    {id:"northstar-co",label:"Northstar Freight",type:"organization",subtitle:"Trade name",description:"An associated trade name in this sample investigation.",confidence:"medium",tags:["trade name"],sources:["Demo business filing"],position:{x:335,y:75}},
    {id:"mara",label:"Mara Ellison",type:"person",subtitle:"Operations director",description:"Fictional operations director listed on a corporate filing and in an archived team page.",confidence:"high",tags:["director"],sources:["Demo annual filing","Demo team page"],position:{x:355,y:350}},
    {id:"jonas",label:"Jonas Reed",type:"person",subtitle:"Registered contact",description:"Fictional contact named on the sample domain registration record.",confidence:"medium",tags:["registrant"],sources:["Demo WHOIS record"],position:{x:125,y:290}},
    {id:"elyse",label:"Elyse Park",type:"person",subtitle:"Accounts manager",description:"Fictional accounts manager appearing on a sample invoice.",confidence:"medium",tags:["billing"],sources:["Demo invoice"],position:{x:675,y:120}},
    {id:"dock",label:"Dockside Warehouse",type:"location",subtitle:"Port district · Bay City",description:"A fictional warehouse address shared by several case entities.",confidence:"medium",tags:["shared address"],sources:["Demo corporate registry extract","Demo invoice"],position:{x:820,y:375}},
    {id:"baycity",label:"Bay City",type:"location",subtitle:"Fictional municipality",description:"Illustrative location used to show geographic links.",confidence:"high",tags:["geography"],sources:["Demo address records"],position:{x:960,y:490}},
    {id:"invoice",label:"Invoice HL-1042",type:"document",subtitle:"Billing record · sample",description:"A fictional invoice connecting Harborlight, Dockside Warehouse, and a payment account.",confidence:"high",tags:["invoice","source document"],sources:["Demo invoice HL-1042"],position:{x:690,y:520}},
    {id:"account",label:"Account •• 8421",type:"account",subtitle:"Payment reference",description:"A fictional masked account identifier. No real financial account data is included.",confidence:"low",tags:["payment"],sources:["Demo invoice HL-1042"],position:{x:520,y:600}},
    {id:"registry",label:"2025 Business Filing",type:"document",subtitle:"Registry record · sample",description:"A fictional filing naming the organization, director, and registered address.",confidence:"high",tags:["corporate record"],sources:["Demo corporate registry extract"],position:{x:800,y:190}},
    {id:"signal",label:"signal-route.example",type:"domain",subtitle:"Email domain",description:"A fictional service domain shown on an archived contact page.",confidence:"low",tags:["web infrastructure"],sources:["Demo archived contact page"],position:{x:170,y:520}},
    {id:"meridian",label:"Meridian Supply Co.",type:"organization",subtitle:"Supplier",description:"A fictional supplier named in the sample billing record.",confidence:"medium",tags:["supplier"],sources:["Demo invoice HL-1042"],position:{x:865,y:620}}
  ],
  edges: [
    {id:"e1",source:"mara",target:"harborlight",label:"directs",confidence:"high",sourceNote:"Demo annual filing"},
    {id:"e2",source:"harborlight",target:"northstar",label:"uses domain",confidence:"medium",sourceNote:"Demo website snapshot"},
    {id:"e3",source:"northstar",target:"northstar-co",label:"represents",confidence:"medium",sourceNote:"Demo website snapshot"},
    {id:"e4",source:"jonas",target:"northstar",label:"registered",confidence:"medium",sourceNote:"Demo WHOIS record"},
    {id:"e5",source:"harborlight",target:"dock",label:"operates at",confidence:"medium",sourceNote:"Demo corporate registry extract"},
    {id:"e6",source:"dock",target:"baycity",label:"located in",confidence:"high",sourceNote:"Demo address records"},
    {id:"e7",source:"harborlight",target:"registry",label:"named in",confidence:"high",sourceNote:"Demo corporate registry extract"},
    {id:"e8",source:"registry",target:"mara",label:"lists director",confidence:"high",sourceNote:"Demo annual filing"},
    {id:"e9",source:"registry",target:"dock",label:"lists address",confidence:"medium",sourceNote:"Demo corporate registry extract"},
    {id:"e10",source:"elyse",target:"harborlight",label:"manages billing",confidence:"medium",sourceNote:"Demo invoice HL-1042"},
    {id:"e11",source:"elyse",target:"invoice",label:"issued",confidence:"medium",sourceNote:"Demo invoice HL-1042"},
    {id:"e12",source:"invoice",target:"harborlight",label:"bills",confidence:"high",sourceNote:"Demo invoice HL-1042"},
    {id:"e13",source:"invoice",target:"account",label:"references",confidence:"low",sourceNote:"Demo invoice HL-1042"},
    {id:"e14",source:"invoice",target:"meridian",label:"names supplier",confidence:"medium",sourceNote:"Demo invoice HL-1042"},
    {id:"e15",source:"invoice",target:"dock",label:"delivery address",confidence:"medium",sourceNote:"Demo invoice HL-1042"},
    {id:"e16",source:"mara",target:"signal",label:"listed with",confidence:"low",sourceNote:"Demo archived contact page"},
    {id:"e17",source:"northstar-co",target:"harborlight",label:"trade name of",confidence:"medium",sourceNote:"Demo business filing"}
  ]
};
window.ALATARS_GRAPH_DEMO.id = "fictional-harborlight-demo";
window.ALATARS_GRAPH_DEMO.description = "A fictional training network for exploring entities, relationships, and source records.";
window.ALATARS_GRAPH_DEMO.nodes.forEach(node => {
  node.country = "";
  node.notes = node.description;
  node.properties = { Dataset: "Fictional training sample" };
  node.sources = node.sources.map(file => ({ file, excerpt: "Invented for demonstration; no real-world assertion." }));
});
window.ALATARS_GRAPH_DEMO.edges.forEach(edge => {
  edge.directed = true;
  edge.status = edge.confidence === "high" ? "Documented" : edge.confidence === "medium" ? "Reported" : "Uncertain";
  edge.startDate = "";
  edge.endDate = "";
  edge.notes = edge.sourceNote;
  edge.properties = { Dataset: "Fictional training sample" };
  edge.sources = [{ file: edge.sourceNote, excerpt: "Invented for demonstration; no real-world assertion." }];
});
