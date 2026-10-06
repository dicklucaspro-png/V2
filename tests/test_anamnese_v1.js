const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'JS', 'script.js'), 'utf8');
const synthese = fs.readFileSync(path.join(root, 'JS', 'synthese.js'), 'utf8');

function extraireFonction(nom) {
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

const fonctions = [
  'anmParseNumber', 'anmFindFoodById', 'anmFormatValeur',
  'anmGetNutrients', 'anmGetDailyTotals', 'anmAfficherBilan'
].map(extraireFonction).join('\n\n');

const nutrientIndexes = {
  protein:1, carbs:2, lipids:3, fiber:4, ags:5,
  sodium:26, potassium:27, salt:36
};

const foodComplet = {
  id: 1,
  name: 'Aliment complet',
  group: 'Test',
  n: Array(38).fill(null)
};
foodComplet.n[1] = 10;
foodComplet.n[2] = 20;
foodComplet.n[3] = 5;
foodComplet.n[4] = 4;
foodComplet.n[5] = 2;
foodComplet.n[26] = 300;
foodComplet.n[27] = 500;
foodComplet.n[36] = 0.8;

const foodPartiel = {
  id: 2,
  name: 'Aliment partiel',
  group: 'Test',
  n: Array(38).fill(null)
};
foodPartiel.n[1] = 8;
foodPartiel.n[2] = 15;
foodPartiel.n[3] = 4;
foodPartiel.n[26] = 200;
// potassium volontairement absent

const ctx = {
  console,
  Number, String, Array, Object, Math,
  CIQUAL_ALIMENTS: [foodComplet, foodPartiel],
  ANM_NUTRIENT_INDEXES: nutrientIndexes,
  anmRows: []
};
vm.createContext(ctx);
vm.runInContext(fonctions, ctx, { filename: 'anamnese-core.js' });

const tests = [];
const test = (nom, fn) => tests.push({nom, fn});

function row(foodId, quantity=100, frequency=7) {
  return { id: Math.random(), meal:0, foodId, quantity, frequency, selected:true };
}


test('un zéro explicitement renseigné par CIQUAL reste un vrai zéro', () => {
  const zero = structuredClone(foodComplet);
  zero.id = 4;
  zero.n[3] = 0; // lipides explicitement absents
  ctx.CIQUAL_ALIMENTS.push(zero);
  const r = ctx.anmGetNutrients(row(4));
  assert.strictEqual(r.values[3], 0);
  const bilan = ctx.anmGetDailyTotals([row(4)]);
  assert.strictEqual(bilan.complete[3], true);
  assert.strictEqual(bilan.totals[3], 0);
  assert.strictEqual(ctx.anmAfficherBilan(bilan, 'lipids', 'g'), '0.0 g');
});

test('une donnée CIQUAL absente reste null et ne devient jamais zéro', () => {
  const r = ctx.anmGetNutrients(row(2));
  assert.strictEqual(r.values[27], null);
});

test('la pondération quantité × fréquence / 7 est correcte', () => {
  const r = ctx.anmGetNutrients(row(1, 140, 3.5));
  assert.strictEqual(r.weight, 70);
});

test('une ligne vide ou invalide ne contribue pas aux totaux', () => {
  const r = ctx.anmGetNutrients(row(null, 100, 7));
  assert.strictEqual(r.weight, 0);
  assert(r.values.every(v => v === null));
});

test('un nutriment complet sur tous les aliments reste marqué complet', () => {
  const bilan = ctx.anmGetDailyTotals([row(1), row(1,50,7)]);
  assert.strictEqual(bilan.complete[26], true);
  assert.strictEqual(bilan.known[26], 2);
});

test('un nutriment manquant sur un aliment devient partiel tout en conservant le minimum connu', () => {
  const bilan = ctx.anmGetDailyTotals([row(1), row(2)]);
  assert.strictEqual(bilan.complete[27], false);
  assert.strictEqual(bilan.known[27], 1);
  assert.strictEqual(bilan.totals[27], 500);
});

test('l’énergie devient partielle si un aliment ne permet pas son calcul', () => {
  const incomplet = structuredClone(foodPartiel);
  incomplet.id = 3;
  incomplet.n[3] = null;
  ctx.CIQUAL_ALIMENTS.push(incomplet);
  const bilan = ctx.anmGetDailyTotals([row(1), row(3)]);
  assert.strictEqual(bilan.kcal, null);
  assert.strictEqual(bilan.kcalKnown, 1);
  assert(Number.isFinite(bilan.kcalPartial));
});

test('l’affichage d’un total incomplet reste prudent sans jargon technique', () => {
  const bilan = ctx.anmGetDailyTotals([row(1), row(2)]);
  const texte = ctx.anmAfficherBilan(bilan, 'potassium', 'mg');
  assert(/^≥ /.test(texte));
  assert(/à préciser/i.test(texte));
  assert(!/partiel/i.test(texte));
});

test('l’affichage ne remplace plus une donnée absente par 0', () => {
  const bilan = ctx.anmGetDailyTotals([row(2)]);
  const texte = ctx.anmAfficherBilan(bilan, 'fiber', 'g');
  assert.strictEqual(texte, 'Non disponible');
  assert(!/\b0(?:[.,]0)?\s*g\b/.test(texte));
});

test('le détail nutritionnel n’utilise plus 0 comme valeur de secours', () => {
  assert(!source.includes('anmAfficherBilan(bilan,key,unite,"0")'));
  assert(source.includes('anmAfficherBilan(bilan,key,unite,"Non disponible")'));
});

test('l’anamnèse brute est sauvegardée et restaurée avec le dossier patient', () => {
  assert(source.includes('anamnese: anmRows.map(row => ({'));
  assert(source.includes('anmRows = Array.isArray(patient?.anamnese)'));
});

test('SynthesePatient distingue une vraie consommation d’une simple ligne vide', () => {
  assert(synthese.includes('const lignesConsommees = lignes.filter'));
  assert(synthese.includes('resultat.weight > 0'));
  assert(synthese.includes('if (lignesConsommees.length === 0)'));
});

test('SynthesePatient expose les apports partiels et les nutriments par aliment', () => {
  assert(synthese.includes('apports[cle] = apportIndex(index, cle)'));
  assert(synthese.includes('intervalleDisponible'));
  assert(synthese.includes('valeurEstimee'));
  assert(synthese.includes('const nutriments = construireNutrimentsAliment(resultat)'));
});

let passed = 0;
for (const {nom, fn} of tests) {
  try { fn(); passed++; console.log(`PASS — ${nom}`); }
  catch (e) { console.error(`FAIL — ${nom}`); console.error(e.stack || e.message); }
}
console.log(`\n${passed}/${tests.length} tests réussis`);
process.exit(passed === tests.length ? 0 : 1);
