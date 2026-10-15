'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

if (process.platform !== 'win32') throw new Error('This prototype build targets Windows only.');

const root = path.resolve(__dirname,'..');
const out = path.join(root,'dist');
const stage = fs.mkdtempSync(path.join(os.tmpdir(),'alatar-desktop-stage-'));
const files = [
  'package.json','desktop-main.js','server.js','storage.js',
  'index.html','styles.css','app.js','connections.js','demo-data.js',
  'LICENSE','vendor/CYTOSCAPE-LICENSE','vendor/cytoscape.min.js',
  'assets/alatar-mark.png'
];

async function main() {
  try {
    const {packager} = await import('@electron/packager');
    for (const relative of files) {
      const target = path.join(stage,relative);
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.copyFileSync(path.join(root,relative),target);
    }
    const [appPath] = await packager({
      dir: stage,
      out,
      name: 'AlatarsGraph',
      executableName: 'AlatarsGraph',
      platform: 'win32',
      arch: 'x64',
      icon: path.join(root,'assets','alatar-mark.ico'),
      electronVersion: require('electron/package.json').version,
      asar: true,
      prune: false,
      overwrite: true,
      win32metadata: {
        CompanyName: "Alatar's Graph",
        FileDescription: "Alatar's Graph desktop prototype",
        ProductName: "Alatar's Graph"
      }
    });
    const zip = path.join(out,'AlatarsGraph-Windows-x64.zip');
    if (fs.existsSync(zip)) fs.unlinkSync(zip);
    const result = spawnSync('tar.exe',['-a','-c','-f',zip,'-C',out,path.basename(appPath)],{stdio:'inherit'});
    if (result.status !== 0) throw new Error('Could not create Windows ZIP package.');
    console.log(`Windows app: ${path.join(appPath,'AlatarsGraph.exe')}`);
    console.log(`Portable ZIP: ${zip}`);
  } finally {
    const resolved = path.resolve(stage);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('alatar-desktop-stage-')) throw new Error('Unsafe staging cleanup target.');
    fs.rmSync(resolved,{recursive:true,force:true});
  }
}

main().catch(error => {console.error(error);process.exitCode = 1;});
