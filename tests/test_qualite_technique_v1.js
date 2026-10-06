const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const jsDir = path.join(root, 'JS');
const jsFiles = fs.readdirSync(jsDir).filter(name => name.endsWith('.js')).sort();
const sources = Object.fromEntries(jsFiles.map(name => [name, fs.readFileSync(path.join(jsDir, name), 'utf8')]));
const script = sources['script.js'];
const synthese = sources['synthese.js'];
const diabete = sources['diabete.js'];
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const responsive = fs.readFileSync(path.join(root, 'css', 'responsives.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const tests = [];
const test = (nom, fn) => tests.push({ nom, fn });

test('aucune fonction nommée n’est déclarée deux fois dans les fichiers JS', () => {
  const occurrences = new Map();
  for (const [file, source] of Object.entries(sources)) {
    for (const match of source.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
      const nom = match[1];
      if (!occurrences.has(nom)) occurrences.set(nom, []);
      occurrences.get(nom).push(file);
    }
  }
  const doublons = [...occurrences.entries()].filter(([, files]) => files.length > 1);
  assert.deepStrictEqual(doublons, []);
});

test('l’ancien moteur générique Analyse #resultat est supprimé du JavaScript', () => {
  const marqueurs = ['GUIDES_PATHOLOGIES', 'construireGuidePathologie', 'analyserPatient(', 'analyserEtAfficherResultatPatient', 'actualiserAnalysePatient', 'toggleAnalyseNutritionnelle', 'reinitialiserAnalyseNutritionnelle', 'getElementById("resultat")'];
  for (const marqueur of marqueurs) assert(!script.includes(marqueur), marqueur);
  assert(!/id="resultat"/.test(html));
});

test('les helpers de debug console supprimés ne reviennent pas', () => {
  assert(!synthese.includes('afficherSyntheseConsole'));
  assert(!diabete.includes('afficherAnalyseDiabeteConsole'));
});

test('aucun console.log ou console.debug de développement ne reste dans les JS de production', () => {
  for (const [file, source] of Object.entries(sources)) {
    assert(!/console\.(?:log|debug)\s*\(/.test(source), file);
  }
});

test('les helpers script.js démontrés inutilisés lors de l’audit ont été retirés', () => {
  const noms = ['genererTableauReferencesNutritionnelles', 'anmAjouterAliment', 'function anmAjouterLigne()', 'anmSelectFood', 'function valeurChamp('];
  for (const nom of noms) assert(!script.includes(nom), nom);
});

test('les scripts npm utilisent le dossier portable tests en minuscules', () => {
  for (const [nom, commande] of Object.entries(pkg.scripts || {})) {
    assert(!/\bTests\//.test(commande), `${nom}: ${commande}`);
  }
  assert.strictEqual(pkg.scripts.test, 'node tests/run-all.js');
});

test('aucune valeur responsive invalide grid-template-columns: fr ne subsiste', () => {
  assert(!/grid-template-columns:\s*fr\s*;/.test(responsive));
});

let passed = 0;
for (const { nom, fn } of tests) {
  try {
    fn();
    passed += 1;
    console.log(`PASS — ${nom}`);
  } catch (e) {
    console.error(`FAIL — ${nom}`);
    console.error(e.stack || e.message);
  }
}

console.log(`\n${passed}/${tests.length} tests réussis`);
process.exit(passed === tests.length ? 0 : 1);
