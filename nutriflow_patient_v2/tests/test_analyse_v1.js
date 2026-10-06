const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'JS', 'script.js'), 'utf8');
const synthese = fs.readFileSync(path.join(root, 'JS', 'synthese.js'), 'utf8');
const micro = fs.readFileSync(path.join(root, 'JS', 'micronutrition.js'), 'utf8');
const hta = fs.readFileSync(path.join(root, 'JS', 'hta.js'), 'utf8');
const denut = fs.readFileSync(path.join(root, 'JS', 'denut.js'), 'utf8');
const obesite = fs.readFileSync(path.join(root, 'JS', 'obesite.js'), 'utf8');
const diabete = fs.readFileSync(path.join(root, 'JS', 'diabete.js'), 'utf8');

function extraireFonction(source, nom) {
  const debut = source.indexOf(`function ${nom}(`);
  if (debut < 0) throw new Error(`Fonction ${nom} introuvable`);
  const accolade = source.indexOf('{', debut);
  let profondeur = 0;
  let dansChaine = null;
  let echappe = false;
  for (let i = accolade; i < source.length; i++) {
    const c = source[i];
    if (dansChaine) {
      if (echappe) { echappe = false; continue; }
      if (c === '\\') { echappe = true; continue; }
      if (c === dansChaine) dansChaine = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { dansChaine = c; continue; }
    if (c === '{') profondeur++;
    if (c === '}') {
      profondeur--;
      if (profondeur === 0) return source.slice(debut, i + 1);
    }
  }
  throw new Error(`Fin de ${nom} introuvable`);
}

const ctx = { console, Number, String, Array, Object, Math };
vm.createContext(ctx);
const debutStatut = script.indexOf('function analyserStatutApport(');
const finStatut = script.indexOf('\nfunction renderRecommandationsNutritionnelles', debutStatut);
if (debutStatut < 0 || finStatut < 0) throw new Error('Bloc analyserStatutApport introuvable');
vm.runInContext(script.slice(debutStatut, finStatut), ctx);

const tests = [];
const test = (nom, fn) => tests.push({ nom, fn });

// Règle centrale : valeur partielle = minimum connu.
test('donnée complète sous un minimum = insuffisante', () => {
  assert.strictEqual(ctx.analyserStatutApport(2000, {type:'min', min:3000}, {partiel:false}).classe, 'insuffisant');
});

test('minimum connu sous un minimum = non concluant, jamais insuffisant', () => {
  const r = ctx.analyserStatutApport(2000, {type:'min', min:3000}, {partiel:true});
  assert.strictEqual(r.classe, 'non-evalue');
  assert.strictEqual(r.label, 'À préciser');
});

test('minimum connu déjà au-dessus d’un repère minimal = repère minimal atteint', () => {
  const r = ctx.analyserStatutApport(3500, {type:'min', min:3000}, {partiel:true});
  assert.strictEqual(r.classe, 'adequat');
  assert.strictEqual(r.label, 'Repère atteint');
});

test('minimum connu sous un maximum = non concluant, jamais adéquat', () => {
  assert.strictEqual(ctx.analyserStatutApport(1500, {type:'max', max:2000}, {partiel:true}).classe, 'non-evalue');
});

test('minimum connu au-dessus d’un maximum = dépassement certain', () => {
  const r = ctx.analyserStatutApport(2500, {type:'max', max:2000}, {partiel:true});
  assert.strictEqual(r.classe, 'eleve');
  assert.strictEqual(r.label, 'Au-dessus du repère');
});

test('minimum connu dans une plage = non concluant tant que la couverture est partielle', () => {
  assert.strictEqual(ctx.analyserStatutApport(55, {type:'range', min:50, max:60}, {partiel:true}).classe, 'non-evalue');
});

// Analyse générale.
test('Analyse générale transmet le statut partiel au moteur de comparaison', () => {
  assert(script.includes('analyserStatutApport(apport.valeur, reference, { partiel: apport.partiel, qualite: apport.qualite })'));
});

test('Analyse générale garde le signe de borne sans afficher le jargon CIQUAL partiel', () => {
  assert(script.includes('const utiliseEstimationIntervalle = item.partiel && qualite.intervalleDisponible === true'));
  assert(script.includes('analysis-quality-icon'));
  assert(!script.includes('minimum connu · CIQUAL partiel'));
});

test('SynthesePatient expose la couverture CIQUAL par nutriment', () => {
  assert(synthese.includes('totalAliments: totalAlimentsAnamnese'));
  assert(synthese.includes('couverture: totalAlimentsAnamnese > 0'));
});


test('Analyse générale ne présente plus les écarts comme des priorités de prise en charge', () => {
  const debut = script.indexOf('function renderRecommandationsNutritionnelles');
  const fin = script.indexOf('\nfunction anmConstruireDetailNutritionnel', debut);
  const bloc = script.slice(debut, fin);
  assert(bloc.includes('Synthèse des écarts'));
  assert(!bloc.includes('nutrition-calc-kicker">Priorités'));
});

test('Analyse générale ne rassure pas à tort lorsque des éléments restent non évaluables', () => {
  assert(script.includes('Aucun écart certain détecté avec les données interprétables.'));
  assert(script.includes("l'incertitude de composition peut encore modifier le classement"));
});

// Micronutrition.
test('Micronutrition transmet la couverture partielle au moteur de statut', () => {
  assert(micro.includes('qualite: apport?.qualite ?? null'));
  assert(micro.includes('analysis-quality-icon'));
  assert(!micro.includes('Minimum connu · CIQUAL partiel'));
});

// HTA.
test('HTA ne classe pas un sodium partiel sous le maximum comme adéquat', () => {
  const hctx = { console, Number, String, Array, Object, Math, Set, Map,
    document:{addEventListener(){},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return[];}},
    window:{enregistrerModulePathologique(){}}, echapperHTML:v=>String(v??'') };
  vm.createContext(hctx);
  vm.runInContext(hta, hctx, {filename:'hta.js'});
  assert.strictEqual(hctx.obtenirStatutMaximumHTA(1800, 2400, true).classe, 'non-evalue');
  assert.strictEqual(hctx.obtenirStatutMaximumHTA(2600, 2400, true).classe, 'eleve');
});

test('HTA ne transforme pas un potassium partiel bas en priorité alimentaire', () => {
  assert(hta.includes('const potassiumBas = statutPotassiumPEC?.classe === "insuffisant"'));
});

// Dénutrition, obésité, diabète.
test('Dénutrition ne calcule pas de couverture énergétique/protéique sur des minima partiels', () => {
  assert(denut.includes('!energiePartielle &&'));
  assert(denut.includes('!proteinesPartielles &&'));
  assert(denut.includes('estimation à préciser'));
});

test('Obésité ne calcule pas l’écart à l’objectif énergétique si l’énergie CIQUAL est partielle', () => {
  assert(obesite.includes('anamnese.energiePartielle !== true &&'));
  assert(obesite.includes('Non interprétable — données partielles'));
});

test('Diabète ne reconstruit pas un faux total glucidique depuis seulement les repas complets', () => {
  assert(diabete.includes('!glucidesPartiels && Number.isFinite(totaux?.glucides)'));
  assert(!diabete.includes(': repasGlucidiques.reduce('));
  assert(diabete.includes('à préciser'));
});

let passed = 0;
for (const {nom, fn} of tests) {
  try { fn(); passed++; console.log(`PASS — ${nom}`); }
  catch (e) { console.error(`FAIL — ${nom}`); console.error(e.stack || e.message); }
}
console.log(`\n${passed}/${tests.length} tests réussis`);
process.exit(passed === tests.length ? 0 : 1);
