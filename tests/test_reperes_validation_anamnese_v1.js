const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'JS', 'script.js'), 'utf8');
const synthese = fs.readFileSync(path.join(root, 'JS', 'synthese.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const ctx = { console, Number, String, Array, Object, Math };
vm.createContext(ctx);
const debutStatut = script.indexOf('function analyserStatutApport(');
const finStatut = script.indexOf('\nfunction renderRecommandationsNutritionnelles', debutStatut);
if (debutStatut < 0 || finStatut < 0) throw new Error('analyserStatutApport introuvable');
vm.runInContext(script.slice(debutStatut, finStatut), ctx);

test('une plage recommandée n’est plus traitée comme une borne maximale', () => {
  const r = ctx.analyserStatutApport(500, {
    type: 'recommended', min: 200, recommendedMax: 300, upperLimit: null
  }, { partiel: false });
  assert.strictEqual(r.classe, 'adequat');
});

test('vitamine D au-dessus de la recommandation mais sous l’AMT reste adéquate', () => {
  const r = ctx.analyserStatutApport(30, {
    type: 'recommended', min: 10, recommendedMax: 15, upperLimit: 50
  }, { partiel: false });
  assert.strictEqual(r.classe, 'adequat');
});

test('un dépassement réel de l’AMT est signalé', () => {
  const r = ctx.analyserStatutApport(60, {
    type: 'recommended', min: 10, recommendedMax: 15, upperLimit: 50
  }, { partiel: false });
  assert.strictEqual(r.classe, 'eleve');
  assert.strictEqual(r.label, 'Au-dessus de l’AMT');
});

test('vitamine K à 200 µg/j n’est plus classée élevée', () => {
  const r = ctx.analyserStatutApport(200, {
    type: 'recommended', min: 50, recommendedMax: 70, upperLimit: 1000
  }, { partiel: false });
  assert.strictEqual(r.classe, 'adequat');
});

test('potassium à 5 g/j n’est pas traité comme un dépassement d’AMT alimentaire', () => {
  const r = ctx.analyserStatutApport(5000, {
    type: 'recommended', min: 3000, recommendedMax: 4000, upperLimit: null
  }, { partiel: false });
  assert.strictEqual(r.classe, 'adequat');
});

test('une valeur complète dans son repère affiche Repère atteint', () => {
  const cas = [
    ctx.analyserStatutApport(3500, { type: 'min', min: 3000 }, { partiel: false }),
    ctx.analyserStatutApport(1500, { type: 'max', max: 2000 }, { partiel: false }),
    ctx.analyserStatutApport(55, { type: 'range', min: 50, max: 60 }, { partiel: false }),
    ctx.analyserStatutApport(30, { type: 'recommended', min: 10, recommendedMax: 15, upperLimit: 50 }, { partiel: false })
  ];
  cas.forEach(r => assert.strictEqual(r.label, 'Repère atteint'));
});

test('une estimation centrale dans la recommandation affiche Repère atteint même si l’intervalle traverse le repère', () => {
  const r = ctx.analyserStatutApport(148, {
    type: 'min', min: 150
  }, {
    partiel: true,
    qualite: { borneBasse: 148, valeurEstimee: 151, borneHaute: 168, intervalleDisponible: true }
  });
  assert.strictEqual(r.classe, 'adequat');
  assert.strictEqual(r.label, 'Repère atteint');
});

test('une donnée partielle recommandée est classable si tout l’intervalle est sûr', () => {
  const r = ctx.analyserStatutApport(20, {
    type: 'recommended', min: 10, recommendedMax: 15, upperLimit: 50
  }, {
    partiel: true,
    qualite: { borneBasse: 20, borneHaute: 35, intervalleDisponible: true }
  });
  assert.strictEqual(r.classe, 'adequat');
  assert.strictEqual(r.label, 'Repère atteint');
});

test('une donnée partielle qui peut franchir l’AMT reste à préciser', () => {
  const r = ctx.analyserStatutApport(40, {
    type: 'recommended', min: 10, recommendedMax: 15, upperLimit: 50
  }, {
    partiel: true,
    qualite: { borneBasse: 40, borneHaute: 65, intervalleDisponible: true }
  });
  assert.strictEqual(r.classe, 'non-evalue');
  assert.strictEqual(r.label, 'À préciser');
});

test('les références dynamiques distinguent recommandation et AMT', () => {
  assert(script.includes('vitK: { min: 50, recommendedMax: 70, upperLimit: 1000'));
  assert(script.includes('upperLimit: 50'));
  assert(script.includes('L’AMT de 1 000 µg/j concerne l’acide folique synthétique'));
  assert(script.includes('potassium: { min: 3000, recommendedMax: 4000, upperLimit: null'));
});

test('l’interface Anamnèse contient une validation explicite avant analyse', () => {
  assert(html.includes('id="anm-validation-state"'));
  assert(html.includes('id="anm-validation-button"'));
  assert(html.includes('onclick="anmValiderPourAnalyse()"'));
});

test('toute modification de l’anamnèse invalide la validation', () => {
  const bloc = script.slice(script.indexOf('function anmChooseRowFood'), script.indexOf('function anmAfficherBilan'));
  assert(bloc.includes('anmMarquerARevalider();'));
  assert(script.includes('function anmMarquerARevalider()'));
});

test('l’Analyse générale refuse d’interpréter une saisie non validée', () => {
  const debut = script.indexOf('function renderRecommandationsNutritionnelles');
  const fin = script.indexOf('\nfunction anmConstruireDetailNutritionnel', debut);
  const bloc = script.slice(debut, fin);
  assert(bloc.includes('anamneseValideePourAnalyse !== true'));
  assert(bloc.includes('Anamnèse à valider'));
});

test('la validation est sauvegardée avec le dossier patient et restaurée', () => {
  assert(script.includes('anamneseValideePourAnalyse: anamneseValideePourAnalyse === true'));
  assert(script.includes('anamneseValideePourAnalyse = patient?.anamneseValideePourAnalyse === true'));
});

function construireContexteSynthese(validee) {
  const row = { id: 'r1', foodId: 1, foodName: 'Aliment test', group: 'Test', meal: 2, quantity: 100, frequency: 7 };
  const values = Array(38).fill(null);
  values[1] = 10;
  values[26] = 500;
  const totals = Array(38).fill(0);
  totals[1] = 10;
  totals[26] = 500;
  const complete = Array(38).fill(false);
  complete[1] = true;
  complete[26] = true;
  const known = Array(38).fill(0);
  known[1] = 1;
  known[26] = 1;
  const doc = { getElementById(){ return null; }, querySelectorAll(){ return []; } };
  const c = {
    console,
    document: doc,
    window: null,
    anmRows: [row],
    anamneseValideePourAnalyse: validee,
    ANM_MEALS: ['Matin','Collation','Midi','Goûter','Soir','Collation soir'],
    ANM_NUTRIENT_INDEXES: { protein: 1, sodium: 26 },
    anmGetNutrients: () => ({ weight: 100, kcal: 200, values, quality: null }),
    anmGetDailyTotals: () => ({
      totals, complete, known,
      knownWeight: Array(38).fill(100),
      estimatedWeight: Array(38).fill(0),
      coverageWeight: Array(38).fill(1),
      kcal: 200, kcalKnown: 1, kcalPartial: 200, kcalCoverageWeight: 1,
      weight: 100
    }),
    obtenirObjectifsNutritionnelsPatient: () => null
  };
  c.window = c;
  vm.createContext(c);
  vm.runInContext(synthese, c, { filename: 'synthese-validation.js' });
  return c;
}

test('SynthesePatient masque les apports cliniques tant que l’anamnèse n’est pas validée', () => {
  const c = construireContexteSynthese(false);
  const a = c.construireSynthesePatient().anamnese;
  assert.strictEqual(a.saisieDisponible, true);
  assert.strictEqual(a.pretPourAnalyse, false);
  assert.strictEqual(a.disponible, false);
  assert.deepStrictEqual(Object.keys(a.apports), []);
});

test('SynthesePatient expose les apports après validation explicite', () => {
  const c = construireContexteSynthese(true);
  const a = c.construireSynthesePatient().anamnese;
  assert.strictEqual(a.disponible, true);
  assert.strictEqual(a.pretPourAnalyse, true);
  assert.strictEqual(a.apports.sodium.valeur, 500);
});

let ok = 0;
for (const t of tests) {
  try {
    t.fn();
    ok++;
    console.log(`PASS — ${t.name}`);
  } catch (e) {
    console.error(`FAIL — ${t.name}`);
    console.error(e.stack || e);
  }
}

console.log(`\n${ok}/${tests.length} tests réussis`);
if (ok !== tests.length) process.exit(1);
