const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const syntheseSource = fs.readFileSync(path.join(root, 'JS', 'synthese.js'), 'utf8');
const scriptSource = fs.readFileSync(path.join(root, 'JS', 'script.js'), 'utf8');

const {
  BIOLOGIE_PAR_PATHOLOGIE,
  PARAMETRES_BIOLOGIQUES,
  fusionnerPertinenceBiologique
} = require(path.join(root, 'JS', 'biologie.js'));

let ok = 0;
let ko = 0;

function test(nom, condition) {
  if (condition) {
    ok += 1;
    console.log(`PASS — ${nom}`);
  } else {
    ko += 1;
    console.error(`FAIL — ${nom}`);
  }
}

// Structure UI.
test('ApoB est ajouté au bilan lipidique central', html.includes('id="bioApoB"'));
test('Lp(a) est ajoutée au bilan lipidique central', html.includes('id="bioLpA"'));
test('non-HDL-C est un résultat calculé et non un champ de saisie', html.includes('id="bioNonHdl"') && !html.includes('<input type="number" id="bioNonHdl"'));
test('le résumé de biologie adaptative est présent', html.includes('id="biologyContextSummary"') && html.includes('id="biologyContextGrid"'));
test('les ressources biologie adaptative sont chargées', html.includes('css/biologie-adaptive.css') && html.includes('JS/biologie.js'));

// Contrat central.
test('SynthesePatient expose une racine biologie', /\n\s*biologie,\n/.test(syntheseSource));
test('la synthèse biologique centrale existe', syntheseSource.includes('function obtenirSyntheseBiologie()'));
test('HTA conserve un alias compatible tout en lisant la biologie centrale', syntheseSource.includes('La source de vérité est désormais synthese.biologie') && syntheseSource.includes('biologie?.renal?.potassium?.valeur'));
test('la date biologique effective utilise la date spécifique puis la date générale', syntheseSource.includes('date: dateSpecifique || dateGenerale || ""'));
test('le chargement et la remise à zéro patient rafraîchissent la biologie adaptative', (scriptSource.match(/actualiserBiologieAdaptative/g) || []).length >= 2);

// Registre ergonomique.
test('Dyslipidémie priorise LDL-C et triglycérides', BIOLOGIE_PAR_PATHOLOGIE['Dyslipidémie'].prioritaires.includes('bioLdl') && BIOLOGIE_PAR_PATHOLOGIE['Dyslipidémie'].prioritaires.includes('bioTriglycerides'));
test('Dyslipidémie expose non-HDL, ApoB et Lp(a) comme données pertinentes', ['bioNonHdl', 'bioApoB', 'bioLpA'].every(id => BIOLOGIE_PAR_PATHOLOGIE['Dyslipidémie'].pertinents.includes(id)));
test('HTA priorise potassium et DFG', ['bioPotassium', 'bioDfg'].every(id => BIOLOGIE_PAR_PATHOLOGIE['Hypertension'].prioritaires.includes(id)));
test('les métadonnées des paramètres biologiques incluent le non-HDL', PARAMETRES_BIOLOGIQUES.bioNonHdl?.calcule === true);

const fusion = fusionnerPertinenceBiologique(['Hypertension', 'Dyslipidémie']);
const ldlFusionne = fusion.get('bioLdl');
test('une donnée commune n’est pas dupliquée dans un contexte pluripathologique', fusion instanceof Map && [...fusion.keys()].filter(id => id === 'bioLdl').length === 1);
test('le niveau le plus fort l’emporte en cas de plusieurs pathologies', ldlFusionne?.niveau === 'prioritaire');
test('les contextes multiples sont conservés sur une même donnée', ldlFusionne?.pathologies.includes('HTA') && ldlFusionne?.pathologies.includes('Dyslipidémie'));

// Moteur non-HDL : exécution isolée de synthese.js.
const contexte = {
  window: {},
  console,
  document: {
    getElementById() { return null; },
    querySelectorAll() { return []; }
  }
};
vm.createContext(contexte);
vm.runInContext(syntheseSource, contexte, { filename: 'synthese.js' });

const calculerNonHdl = contexte.calculerNonHdlBiologique || contexte.window.calculerNonHdlBiologique;
const nonHdlGL = calculerNonHdl(
  { valeur: 2.0, unite: 'g/L', date: '2026-10-01' },
  { valeur: 0.5, unite: 'g/L', date: '2026-10-01' }
);
test('non-HDL-C se calcule correctement en g/L', nonHdlGL.calculable === true && Math.abs(nonHdlGL.valeur - 1.5) < 1e-9 && nonHdlGL.unite === 'g/L');

const nonHdlMixte = calculerNonHdl(
  { valeur: 200, unite: 'mg/dL', date: '2026-10-01' },
  { valeur: 0.5, unite: 'g/L', date: '2026-10-01' }
);
test('non-HDL-C sait harmoniser g/L et mg/dL', nonHdlMixte.calculable === true && Math.abs(nonHdlMixte.valeur - 150) < 1e-9 && nonHdlMixte.unite === 'mg/dL');

const nonHdlIncompatible = calculerNonHdl(
  { valeur: 2.0, unite: 'unite-inconnue' },
  { valeur: 0.5, unite: 'g/L' }
);
test('non-HDL-C refuse des unités incompatibles au lieu d’inventer une valeur', nonHdlIncompatible.calculable === false && nonHdlIncompatible.raison === 'unites_incompatibles');

console.log(`\n${ok} réussis / ${ko} échecs / ${ok + ko} total`);
if (ko > 0) process.exit(1);
