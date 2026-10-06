const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const errors = [];
const infos = [];

function fail(message) { errors.push(message); }
function info(message) { infos.push(message); }

function walk(dir, predicate = () => true) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

// 1) Syntaxe JavaScript — production + tests.
const jsFiles = [
  ...walk(path.join(root, 'JS'), file => file.endsWith('.js')),
  ...walk(path.join(root, 'tests'), file => file.endsWith('.js'))
];

for (const file of jsFiles) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) fail(`Syntaxe JS invalide : ${path.relative(root, file)}\n${r.stderr}`);
}
info(`${jsFiles.length} fichier(s) JavaScript : syntaxe valide`);

// 2) IDs HTML uniques.
const indexPath = path.join(root, 'index.html');
if (!fs.existsSync(indexPath)) {
  fail('index.html introuvable');
} else {
  const html = fs.readFileSync(indexPath, 'utf8');
  const ids = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
  const duplicates = [...counts.entries()].filter(([, count]) => count > 1);
  if (duplicates.length) {
    fail(`ID HTML dupliqué(s) : ${duplicates.map(([id,count]) => `${id} ×${count}`).join(', ')}`);
  }
  info(`${ids.length} ID HTML / ${counts.size} unique(s)`);

  // 3) Fichiers locaux référencés par index.html présents.
  const refs = [
    ...[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]),
    ...[...html.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)].map(m => m[1])
  ].filter(ref => !/^(?:https?:|data:|#)/i.test(ref));

  for (const ref of refs) {
    const normalized = ref.replace(/\\/g, '/');
    const full = path.join(root, ...normalized.split('/'));
    if (!fs.existsSync(full)) fail(`Ressource référencée mais absente : ${ref}`);
  }
  info(`${refs.length} ressource(s) locale(s) référencée(s) par index.html : présentes`);

  // 4) Ordre de chargement critique.
  const expectedOrder = [
    'JS/compo.js',
    'JS/script.js',
    'JS/denut.js',
    'JS/patient-experience.js',
    'JS/synthese.js',
    'JS/biologie.js',
    'JS/micronutrition.js',
    'JS/diabete.js',
    'JS/hta.js',
    'JS/dyslipidemie.js',
    'JS/obesite.js'
  ];
  const positions = expectedOrder.map(ref => ({ ref, pos: html.indexOf(`src="${ref}"`) }));
  const missing = positions.filter(x => x.pos < 0);
  if (missing.length) {
    fail(`Scripts critiques absents de index.html : ${missing.map(x => x.ref).join(', ')}`);
  } else {
    for (let i = 1; i < positions.length; i++) {
      if (positions[i].pos <= positions[i - 1].pos) {
        fail(`Ordre de chargement inattendu : ${positions[i - 1].ref} doit précéder ${positions[i].ref}`);
      }
    }
    info('Ordre de chargement des scripts critiques : cohérent');
  }
}

// 5) Tests portables : aucun chemin sandbox /mnt/data codé en dur.
const testFiles = walk(path.join(root, 'tests'), file => /^test_.*\.js$/i.test(path.basename(file)));
for (const file of testFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('/mnt/data/') || source.includes('NutriFlow_Stabilisation_0_')) {
    fail(`Test non portable (chemin absolu détecté) : ${path.relative(root, file)}`);
  }
}
info(`${testFiles.length} fichier(s) de tests : chemins portables`);

console.log('NutriFlow — contrôle du projet\n');
for (const line of infos) console.log(`PASS — ${line}`);

if (errors.length) {
  console.error('\nÉCHECS :');
  for (const line of errors) console.error(`FAIL — ${line}`);
  process.exit(1);
}

console.log('\nValidation structurelle réussie.');
