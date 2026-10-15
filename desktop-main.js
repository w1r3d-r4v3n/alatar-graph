'use strict';

const path = require('node:path');
const {app,BrowserWindow,dialog,session} = require('electron');

let mainWindow;
let localServer;

app.setName("Alatar's Graph");

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance',() => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    process.env.ALATARS_GRAPH_DATA_DIR = path.join(app.getPath('userData'),'graphs');
    process.env.ALATARS_GRAPH_DESKTOP_LOCAL_ONLY = '1';
    delete process.env.ALATARS_GRAPH_DATABASE_URL;

    const {startServer} = require('./server');
    const {server,origin} = await startServer(0);
    localServer = server;

    session.defaultSession.setPermissionRequestHandler((_webContents,_permission,respond) => respond(false));

    mainWindow = new BrowserWindow({
      title: "Alatar's Graph",
      width: 1440,
      height: 900,
      minWidth: 900,
      minHeight: 650,
      backgroundColor: '#071225',
      icon: path.join(__dirname,'assets','alatar-mark.png'),
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true
      }
    });

    mainWindow.webContents.setWindowOpenHandler(() => ({action:'deny'}));
    mainWindow.webContents.on('will-navigate',(event,url) => {
      try { if (new URL(url).origin === origin) return; } catch {}
      event.preventDefault();
    });
    mainWindow.on('closed',() => { mainWindow = null; });
    await mainWindow.loadURL(`${origin}/?desktop=1`);
    mainWindow.show();
  }).catch(error => {
    dialog.showErrorBox("Alatar's Graph could not start",error.message || String(error));
    app.quit();
  });
}

app.on('window-all-closed',() => app.quit());
app.on('before-quit',() => { if (localServer?.listening) localServer.close(); });
