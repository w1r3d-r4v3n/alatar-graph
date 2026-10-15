(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const dialog = $('connections-dialog');
  const api = window.ALATARS_GRAPH_API;
  const desktopLocalOnly = new URLSearchParams(location.search).get('desktop') === '1';
  let serverInfo = null, driveToken = null, driveExpires = 0, driveClient = null, driveFileId = null, driveGraphId = null, gisPromise = null;
  let revisions = new Map();
  const message = text => { $('connection-message').textContent = text; };
  if (desktopLocalOnly) {
    $('connections-button').textContent = 'Local graphs';
    $('connections-title').textContent = 'Local graphs';
    $('storage-hint').textContent = 'SAVE GRAPHS ON THIS COMPUTER';
    dialog.querySelector('.eyebrow').textContent = 'ON THIS COMPUTER';
    dialog.querySelector('.connections-head p').textContent = 'Save and reopen graph projects in your Windows profile.';
    $('connection-local').querySelector('p').textContent = 'Save graph projects on this computer. A separate draft is kept for recovery.';
    dialog.querySelector('.connection-tabs').hidden = true;
    for (const name of ['postgres','drive','mcp']) {
      dialog.querySelector(`[data-connection-tab="${name}"]`).hidden = true;
      $('connection-' + name).hidden = true;
    }
  }
  function errorText(error) { return error?.message || 'Connection failed.'; }
  async function request(url, options) {
    const response = await fetch(url,options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
    return body;
  }
  async function refreshServer() {
    try {
      serverInfo = await request('/api/connections');
      $('postgres-status').textContent = serverInfo.postgresConfigured ? 'PostgreSQL is configured on this server.' : 'PostgreSQL is not configured. Set the environment variable and restart the server.';
      document.querySelectorAll('[data-action="save-local"],[data-action="list-local"]').forEach(b => b.disabled = serverInfo.storage !== 'local');
      document.querySelectorAll('[data-action="save-postgres"],[data-action="list-postgres"]').forEach(b => b.disabled = serverInfo.storage !== 'postgres');
      $('mcp-config').textContent = JSON.stringify({mcpServers:{'alatars-graph':serverInfo.mcp}},null,2);
    } catch (error) { message(errorText(error)); }
  }
  function tab(name) {
    if (desktopLocalOnly && name !== 'local') return;
    document.querySelectorAll('[data-connection-tab]').forEach(button => button.classList.toggle('active',button.dataset.connectionTab === name));
    for (const item of ['local','postgres','drive','mcp']) $('connection-' + item).hidden = item !== name;
    $('connection-list').hidden = true;message('');
    if (name === 'drive') loadGis().catch(error => message(errorText(error)));
  }
  function showList(items, open) {
    const box = $('connection-list');box.replaceChildren();box.hidden = false;
    message(`${items.length} saved graph${items.length===1?'':'s'} found. Choose one to open.`);
    if (!items.length) { box.textContent = 'No saved graphs found for this connection.';return; }
    for (const item of items) {
      const button = document.createElement('button'),title = document.createElement('span'),date = document.createElement('small');
      title.textContent = item.title || item.name || item.id;
      date.textContent = item.updatedAt || item.modifiedTime ? new Date(item.updatedAt || item.modifiedTime).toLocaleString() : '';
      button.append(title,date);button.addEventListener('click',() => open(item));box.append(button);
    }
  }
  async function saveServer() {
    if (!serverInfo) { await refreshServer();if (!serverInfo) throw new Error('Local server is unavailable.'); }
    const project = api.project(), expectedRevision = revisions.get(project.id) || null;
    const result = await request('/api/graphs/' + encodeURIComponent(project.id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({project,expectedRevision})});
    revisions.set(project.id,result.revision);
    $('connection-list').hidden = true;
    message(`Saved “${project.title}” to ${serverInfo.storage === 'postgres' ? 'PostgreSQL' : 'this computer'} at ${new Date(result.updatedAt).toLocaleString()}.`);
    api.toast('Graph saved to ' + (serverInfo.storage === 'postgres' ? 'PostgreSQL' : 'this computer'));
  }
  async function listServer() {
    const data = await request('/api/graphs');
    showList(data.graphs,async item => {
      try {
        const data = await request('/api/graphs/' + encodeURIComponent(item.id));
        api.load(data.project);revisions.set(item.id,data.revision);driveFileId = null;driveGraphId = null;
        message(`Opened “${data.project.title}”.`);dialog.close();
      } catch (error) { message(errorText(error)); }
    });
  }
  function loadGis() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    if (gisPromise) return gisPromise;
    gisPromise = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';script.async = true;
      script.onload = resolve;script.onerror = () => reject(new Error('Google Identity Services could not load. Check network access.'));
      document.head.append(script);
    });
    return gisPromise;
  }
  function connectDrive() {
    const clientId = $('drive-client-id').value.trim();
    if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId)) throw new Error('Enter a valid Google OAuth web client ID.');
    if (!window.google?.accounts?.oauth2) throw new Error('Google sign-in is still loading. Try Connect again.');
    localStorage.setItem('alatars-graph-drive-client-id',clientId);
    driveClient = window.google.accounts.oauth2.initTokenClient({client_id:clientId,scope:'https://www.googleapis.com/auth/drive.file',callback:response => {
      if (response.error || !response.access_token) { message(response.error_description || response.error || 'Google authorization was not completed.');return; }
      driveToken = response.access_token;driveExpires = Date.now() + Math.max(0,Number(response.expires_in || 3600)-60)*1000;
      message('Google Drive connected for this session. Choose Save or Open.');
    },error_callback:response => message(response.type || 'Google sign-in did not open.')});
    driveClient.requestAccessToken();
  }
  function token() { if (!driveToken || Date.now() >= driveExpires) throw new Error('Connect Google Drive again to authorize this action.');return driveToken; }
  async function driveRequest(url,options = {}) {
    const response = await fetch(url,{...options,headers:{Authorization:'Bearer ' + token(),...options.headers}});
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error?.message || `Google Drive returned ${response.status}.`);
    return body;
  }
  async function listDrive() {
    const query = "trashed = false and appProperties has { key='alatarGraph' and value='1' }";
    const fields = 'nextPageToken,files(id,name,modifiedTime,appProperties)';
    const result = await driveRequest('https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({q:query,fields,pageSize:'100',orderBy:'modifiedTime desc'}));
    showList(result.files || [],async item => {
      try {
        const project = await driveRequest('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(item.id) + '?alt=media');
        api.load(project);driveFileId = item.id;driveGraphId = project.id;message(`Opened “${project.title}” from Google Drive.`);dialog.close();
      } catch (error) { message(errorText(error)); }
    });
  }
  async function saveDrive() {
    const project = api.project(), name = (project.title || 'Graph').replace(/[\\/:*?"<>|]/g,'-').slice(0,75) + '-alatars-graph.json';
    if (driveFileId && driveGraphId === project.id) {
      await driveRequest('https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(driveFileId) + '?uploadType=media',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(project)});
    } else {
      const boundary = 'alatar_' + crypto.randomUUID().replace(/-/g,'');
      const metadata = {name,mimeType:'application/json',appProperties:{alatarGraph:'1',graphId:project.id}};
      const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(project)}\r\n--${boundary}--`;
      const created = await driveRequest('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',{method:'POST',headers:{'Content-Type':'multipart/related; boundary=' + boundary},body});
      driveFileId = created.id;driveGraphId = project.id;
    }
    $('connection-list').hidden = true;message(`Saved “${project.title}” to Google Drive.`);api.toast('Graph saved to Google Drive');
  }
  $('connections-button').addEventListener('click',() => { dialog.showModal();refreshServer(); });
  $('connections-close').addEventListener('click',() => dialog.close());
  document.querySelectorAll('[data-connection-tab]').forEach(button => button.addEventListener('click',() => tab(button.dataset.connectionTab)));
  dialog.addEventListener('click',async event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (desktopLocalOnly && action !== 'save-local' && action !== 'list-local') return;
    try {
      if (action === 'connect-drive') { connectDrive();return; }
      message('Working…');
      if (action === 'save-local' || action === 'save-postgres') await saveServer();
      if (action === 'list-local' || action === 'list-postgres') await listServer();
      if (action === 'save-drive') await saveDrive();
      if (action === 'list-drive') await listDrive();
      if (action === 'copy-mcp') { await navigator.clipboard.writeText($('mcp-config').textContent);message('MCP configuration copied.'); }
    } catch (error) { message(errorText(error)); }
  });
  try { $('drive-client-id').value = localStorage.getItem('alatars-graph-drive-client-id') || ''; } catch {}
})();
