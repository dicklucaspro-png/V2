const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const syntheseSource = fs.readFileSync(path.join(root, 'JS', 'synthese.js'), 'utf8');
const denutSource = fs.readFileSync(path.join(root, 'JS', 'denut.js'), 'utf8');
const obesiteSource = fs.readFileSync(path.join(root, 'JS', 'obesite.js'), 'utf8');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
    passed++;
  } catch (error) {
    console.error('✗', name, '-', error.message);
    failed++;
  }
}

function makeContext(values = {}, pathologies = []) {
  const elements = new Map(
    Object.entries(values).map(([id, value]) => [id, { id, value: String(value), checked: Boolean(value === true) }])
  );

  const document = {
    getElementById(id) { return elements.get(id) || null; },
    querySelectorAll(selector) {
      if (selector === 'input[name="pathologies"]:checked') {
        return pathologies.map(value => ({ value, checked: true }));
      }
      if (selector === 'input[name="allergies"]:checked') return [];
      return [];
    }
  };

  const context = {
    console,
    document,
    window: null,
    anmRows: [],
    obtenirObjectifsNutritionnelsPatient: () => ({
      energie: { objectif: 2000 },
      proteines: { objectif: 80 }
    })
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(syntheseSource, context, { filename: 'synthese.js' });
  return context;
}

test('IMC de SynthesePatient ne dépend plus d’un calculateur externe', () => {
  const context = makeContext({ poids: 70, taille: 175 });
  assert.strictEqual(typeof context.calculerIMCPatient, 'undefined');
  const s = context.construireSynthesePatient();
  assert.ok(Math.abs(s.anthropometrie.imc - (70 / 1.75 ** 2)) < 1e-10);
});

test('le contexte rénal transversal rassemble les données existantes sans les interpréter', () => {
  const context = makeContext();
  const dfg = { valeur: 42, unite: 'mL/min/1,73 m²' };
  const creatinine = { valeur: 135, unite: 'µmol/L' };
  const potassium = { valeur: 5.1, unite: 'mmol/L' };
  const sodium = { valeur: 139, unite: 'mmol/L' };
  const phosphore = { valeur: 1.3, unite: 'mmol/L' };
  const calcium = { valeur: 2.25, unite: 'mmol/L' };
  const magnesium = { valeur: 0.82, unite: 'mmol/L' };
  const albumine = { valeur: 38, unite: 'g/L' };

  const renal = context.obtenirContexteRenalSynthese({
    biologie: {
      renal: { dfg, creatinine, potassium, sodium },
      mineraux: { phosphore, calcium, magnesium },
      inflammation: { albumine }
    },
    diabete: {
      complications: { nephropathie: 'oui' },
      dt2: { sglt2: { traitement: 'dapagliflozine' } }
    },
    hta: {
      proteinurie: 'oui',
      traitement: { classes: ['iec', 'diuretique_anse'] }
    },
    anamnese: {
      apports: {
        energie: { valeur: 1800 },
        protein: { valeur: 72 },
        sodium: { valeur: 2100 },
        potassium: { valeur: 3200 },
        phosphorus: { valeur: 950 },
        calcium: { valeur: 800 },
        water: { valeur: 1600 }
      }
    },
    pathologiesSelectionnees: ['Maladie rénale']
  });

  assert.strictEqual(renal.pathologieSelectionnee, true);
  assert.strictEqual(renal.biologie.dfg, dfg);
  assert.strictEqual(renal.biologie.phosphore, phosphore);
  assert.strictEqual(renal.marqueurs.proteinurieHTA, 'oui');
  assert.strictEqual(renal.marqueurs.nephropathieDiabetique, 'oui');
  assert.deepStrictEqual(Array.from(renal.traitementsConnus.antihypertenseurs), ['iec', 'diuretique_anse']);
  assert.strictEqual(renal.traitementsConnus.sglt2, 'dapagliflozine');
  assert.strictEqual(renal.apports.proteines.valeur, 72);
  assert.strictEqual(renal.apports.phosphore.valeur, 950);
  assert.strictEqual(renal.disponible, true);
  assert.strictEqual('stade' in renal, false, 'la synthèse ne doit pas inventer un stade MRC');
  assert.strictEqual('diagnostic' in renal, false, 'la synthèse ne doit pas poser de diagnostic MRC');
});

test('construireSynthesePatient expose le contexte rénal avec DFG, créatinine et phosphate', () => {
  const context = makeContext({
    bioDfg: 55,
    bioDfgUnite: 'mL/min/1,73 m²',
    bioCreatinine: 110,
    bioCreatinineUnite: 'µmol/L',
    bioPotassium: 4.8,
    bioPotassiumUnite: 'mmol/L',
    bioPhosphore: 1.1,
    bioPhosphoreUnite: 'mmol/L',
    htaProteinurie: 'oui',
    diabeteNephropathie: 'oui',
    htaClasse1: 'ara2',
    dt2SGLT2Traitement: 'empagliflozine'
  }, ['Maladie rénale', 'Hypertension', 'Diabète']);

  const s = context.construireSynthesePatient();
  assert.strictEqual(s.contexteRenal.biologie.dfg.valeur, 55);
  assert.strictEqual(s.contexteRenal.biologie.creatinine.valeur, 110);
  assert.strictEqual(s.contexteRenal.biologie.phosphore.valeur, 1.1);
  assert.strictEqual(s.contexteRenal.marqueurs.proteinurieHTA, 'oui');
  assert.strictEqual(s.contexteRenal.marqueurs.nephropathieDiabetique, 'oui');
  assert.strictEqual(s.contexteRenal.pathologieSelectionnee, true);
});

test('la prise en charge dénutrition réutilise SynthesePatient pour objectifs et HAS', () => {
  const analyserStart = denutSource.indexOf('function analyserDenutritionNutritionnelle()');
  const analyserEnd = denutSource.indexOf('\nfunction ', analyserStart + 20);
  const block = denutSource.slice(analyserStart, analyserEnd > 0 ? analyserEnd : undefined);
  assert.ok(block.includes('synthese?.etatNutritionnel?.has'));
  assert.ok(block.includes('obtenirObjectifsDenutrition'));
  assert.ok(!block.includes('evaluerDenutritionHAS()'));

  const objectifsStart = denutSource.indexOf('function obtenirObjectifsDenutrition(');
  const objectifsEnd = denutSource.indexOf('\nfunction ', objectifsStart + 20);
  const objectifsBlock = denutSource.slice(objectifsStart, objectifsEnd > 0 ? objectifsEnd : undefined);
  assert.ok(objectifsBlock.includes('synthese?.objectifsNutritionnels'));
  assert.ok(!objectifsBlock.includes('obtenirObjectifsNutritionnelsPatient('));
});

test('le risque de renutrition ne relit plus la malabsorption directement dans le DOM', () => {
  const start = denutSource.indexOf('function evaluerRisqueRenutritionDenutrition(');
  const end = denutSource.indexOf('\nfunction ', start + 20);
  const block = denutSource.slice(start, end > 0 ? end : undefined);
  assert.ok(block.includes('synthese?.etatNutritionnel?.donneesDenutrition?.malabsorption'));
  assert.ok(!block.includes('document.getElementById("denutMalabsorption")'));
});

test('les vigilances obésité réutilisent le diagnostic de dénutrition déjà synthétisé', () => {
  const start = obesiteSource.indexOf('function construireVigilancesObesite(');
  const end = obesiteSource.indexOf('\n  function ', start + 20);
  const block = obesiteSource.slice(start, end > 0 ? end : undefined);
  assert.ok(block.includes('analyse?.synthese?.etatNutritionnel?.has'));
  assert.ok(!block.includes('evaluerDenutritionHAS()'));
});

console.log(`\n${passed} réussis / ${failed} échecs / ${passed + failed} total`);
if (failed) process.exit(1);
