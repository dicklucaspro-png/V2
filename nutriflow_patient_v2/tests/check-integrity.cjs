const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');const file=path.join(root,'INTEGRITY.json');
const files=['index.html','package.json',...['JS','css'].flatMap(dir=>fs.readdirSync(path.join(root,dir)).filter(name=>/\.(js|css)$/.test(name)).map(name=>dir+'/'+name))].sort();
const current=Object.fromEntries(files.map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex')]));
if(process.argv.includes('--refresh')){fs.writeFileSync(file,JSON.stringify({createdAt:new Date().toISOString(),files:current},null,2)+'\n');console.log('Empreinte des fichiers enregistrée.');}
else{if(!fs.existsSync(file))throw Error('Empreinte absente. Exécuter avec --refresh après validation des changements.');const baseline=JSON.parse(fs.readFileSync(file,'utf8')).files;const changed=[...new Set([...Object.keys(baseline),...files])].filter(name=>baseline[name]!==current[name]);if(changed.length){console.error('Fichiers différents de la version validée :\n'+changed.join('\n'));process.exitCode=1;}else console.log('Fichiers conformes à la version validée.');}
