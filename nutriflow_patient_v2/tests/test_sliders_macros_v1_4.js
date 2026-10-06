const fs = require('fs');
const path = require('path');
const assert = require('assert');

const vm = require('vm');

function construireContexteReferentiel({ pathologies = [], age = 45, poids = 80, denutrition = false, objectifObesite = 'stabilisation', tca = false } = {}) {
  const debut = script.indexOf('function obtenirPathologiesActivesCalculs()');
  const fin = script.indexOf('function convertirRepereMacroEnQuantite(', debut);
  assert(debut >= 0 && fin > debut);
  const code = script.slice(debut, fin);
  const ids = {
    age: { value: String(age) },
    poids: { value: String(poids) },
    obesiteTcaAlerte: { value: tca ? 'oui' : 'non' }
  };
  const context = {
    Set, Array, Number, Math, String,
    objectifTherapeutiqueObesite: objectifObesite,
    evaluerDenutritionHAS: () => ({ diagnostic: denutrition }),
    document: {
      querySelectorAll: selector => selector === 'input[name="pathologies"]:checked'
        ? pathologies.map(value => ({ value }))
        : [],
      getElementById: id => ids[id] || null
    }
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.obtenirReferentielMacronutrimentsCalculs(2000);
}

const script = fs.readFileSync(path.join(__dirname, '..', 'JS', 'script.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'modules.css'), 'utf8');

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('les sliders utilisent un brouillon distinct de la ration active', () => {
  assert(script.includes('let brouillonRepartitionMacros = { ...etatRepartitionMacros };'));
  assert(script.includes('etatRepartitionMacros = { ...brouillonRepartitionMacros };'));
});

test('modifier un slider ne redistribue plus automatiquement les deux autres macros', () => {
  assert(!script.includes('const reste = 100 - nouvelleValeur'));
  assert(!script.includes('const ancienTotal = etatRepartitionMacros[autres[0]]'));
  assert(script.includes('mettreAJourValeurMacronutriment(idModifie, event.target.value)'));
});

test('une ration ne peut être appliquée que lorsque le total vaut exactement 100 %', () => {
  assert(script.includes('sommeRepartitionMacronutriments(brouillonRepartitionMacros) !== 100'));
  assert(script.includes('appliquer.disabled = total !== 100'));
});

test('la dénutrition ne force plus silencieusement une ration 20/45/35', () => {
  assert(!script.includes('etatRepartitionMacros = { proteines: 20, glucides: 45, lipides: 35 }'));
  assert(script.includes('Une pathologie modifie les repères affichés, jamais silencieusement la'));
});

test('les repères des sliders prennent en compte la dénutrition et son niveau d’âge', () => {
  assert(script.includes('Dénutrition ≥ 70 ans — priorité nutritionnelle'));
  assert(script.includes('1,2 – 1,5 g/kg/j'));
  assert(script.includes('Les proportions glucides/lipides du régime hospitalier ESPEN 2021 ne sont pas utilisées comme cibles ambulatoires automatiques.'));
});

test('les repères des sliders prennent en compte l’obésité avec perte pondérale', () => {
  assert(script.includes('Obésité — perte pondérale progressive'));
  assert(script.includes('15 – 25 % AET'));
  assert(script.includes('20 – 30 % AET'));
  assert(script.includes('objectifTherapeutiqueObesite === "perte"'));
});

test('le diabète n’impose pas artificiellement un pourcentage glucidique fixe', () => {
  assert(script.includes('Répartition individualisée'));
  assert(script.includes('aucune répartition glucidique fixe n\'est imposée automatiquement'));
});

test('HTA et dyslipidémie sont intégrées comme contraintes qualitatives sans faux objectif P/G/L', () => {
  assert(script.includes('HTA : pas d\'adaptation automatique de la répartition P/G/L'));
  assert(script.includes('Dyslipidémie : la qualité des lipides'));
});

test('en pluripathologie obésité + dénutrition, la dénutrition est explicitement prioritaire', () => {
  assert(script.includes('Obésité + dénutrition : la restriction énergétique de perte pondérale est désactivée'));
});

test('comportement réel : diabète seul rend les glucides individualisés', () => {
  const ref = construireContexteReferentiel({ pathologies: ['Diabète'] });
  assert.strictEqual(ref.reperes.glucides.mode, 'individualise');
});


test('comportement réel : dénutrition 18–69 ans ne transforme pas le régime hospitalier ESPEN en cible des sliders', () => {
  const ref = construireContexteReferentiel({ denutrition: true, age: 45, poids: 80 });
  assert.strictEqual(ref.reperes.proteines.mode, 'gkg-min');
  assert.strictEqual(ref.reperes.proteines.min, 0.83);
  assert.strictEqual(ref.reperes.proteines.source, 'CSS 2016');
  assert.strictEqual(ref.reperes.glucides.min, 50);
  assert.strictEqual(ref.reperes.glucides.max, 55);
  assert.strictEqual(ref.reperes.glucides.source, 'CSS 2016');
  assert.strictEqual(ref.reperes.lipides.min, 30);
  assert.strictEqual(ref.reperes.lipides.max, 35);
  assert.strictEqual(ref.reperes.lipides.source, 'CSS 2016');
  assert(ref.detailContexte.includes('régime hospitalier ESPEN 2021'));
});

test('comportement réel : diabète + dénutrition garde les glucides individualisés', () => {
  const ref = construireContexteReferentiel({ pathologies: ['Diabète'], denutrition: true, age: 45 });
  assert.strictEqual(ref.reperes.glucides.mode, 'individualise');
});

test('comportement réel : obésité avec perte active applique les plages BASO', () => {
  const ref = construireContexteReferentiel({ pathologies: ['Obésité'], objectifObesite: 'perte' });
  assert.strictEqual(ref.reperes.proteines.min, 15);
  assert.strictEqual(ref.reperes.proteines.max, 25);
  assert.strictEqual(ref.reperes.lipides.min, 20);
  assert.strictEqual(ref.reperes.lipides.max, 30);
});

test('comportement réel : dénutrition prime sur obésité avec perte', () => {
  const ref = construireContexteReferentiel({ pathologies: ['Obésité'], objectifObesite: 'perte', denutrition: true, age: 75 });
  assert.strictEqual(ref.flags.obesitePerte, false);
  assert.strictEqual(ref.reperes.proteines.mode, 'gkg-range');
  assert.strictEqual(ref.reperes.proteines.min, 1.2);
  assert.strictEqual(ref.reperes.proteines.max, 1.5);
});

test('l’interface distingue repère pertinent, ration active et ration personnalisable', () => {
  assert(script.includes('Ration de travail actuellement utilisée'));
  assert(script.includes('Repère pertinent'));
  assert(script.includes('Personnaliser la ration de travail'));
  assert(css.includes('.nutrition-macro-context'));
  assert(css.includes('.nutrition-macro-status.warning'));
  assert(css.includes('.nutrition-macro-total'));
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    passed += 1;
    console.log(`PASS — ${name}`);
  } catch (err) {
    console.error(`FAIL — ${name}`);
    console.error(err.stack || err.message);
  }
}

console.log(`\n${passed}/${tests.length} tests réussis`);
process.exit(passed === tests.length ? 0 : 1);
