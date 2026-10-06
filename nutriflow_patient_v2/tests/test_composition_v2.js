const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const compoSource = fs.readFileSync(path.join(root, 'JS', 'compo.js'), 'utf8');
const scriptSource = fs.readFileSync(path.join(root, 'JS', 'script.js'), 'utf8');
const syntheseSource = fs.readFileSync(path.join(root, 'JS', 'synthese.js'), 'utf8');

function loadFoods() {
  const start = compoSource.indexOf('[');
  const end = compoSource.lastIndexOf('];');
  return JSON.parse(compoSource.slice(start, end + 1));
}

function extraireFonction(source, nom) {
  const debut = source.indexOf(`function ${nom}(`);
  if (debut < 0) throw new Error(`Fonction ${nom} introuvable`);
  const accolade = source.indexOf('{', debut);
  let profondeur = 0, chaine = null, echappe = false;
  for (let i = accolade; i < source.length; i++) {
    const c = source[i];
    if (chaine) {
      if (echappe) { echappe = false; continue; }
      if (c === '\\') { echappe = true; continue; }
      if (c === chaine) chaine = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { chaine = c; continue; }
    if (c === '{') profondeur++;
    if (c === '}' && --profondeur === 0) return source.slice(debut, i + 1);
  }
  throw new Error(`Fin de ${nom} introuvable`);
}

const foods = loadFoods();
const byCode = new Map(foods.map(f => [String(f.code), f]));
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('Composition V2 conserve les 3 484 aliments Ciqual 2025', () => {
  assert.strictEqual(foods.length, 3484);
});

test('le sel alimentaire garde un vrai zéro pour protéines/glucides/lipides', () => {
  const sel = byCode.get('11017');
  assert(sel, 'sel alimentaire 11017 absent');
  assert.strictEqual(sel.n[1], 0);
  assert.strictEqual(sel.n[2], 0);
  assert.strictEqual(sel.n[3], 0);
});

test('l’énergie réglementaire Ciqual est embarquée séparément', () => {
  const disponibles = foods.filter(f => Number.isFinite(f.e)).length;
  assert(disponibles > 3300, `couverture énergie trop basse: ${disponibles}`);
});

test('la vitamine E utilise alpha-tocophérol en priorité et améliore fortement la couverture', () => {
  const disponibles = foods.filter(f => Number.isFinite(f.n?.[30])).length;
  assert(disponibles >= 2300, `couverture vitamine E insuffisante: ${disponibles}`);
  assert(compoSource.includes('Alpha-tocophérol') || compoSource.includes('alpha-tocophérol'));
});

test('la B9 utilise DFE puis un fallback documenté et approche 70 % de couverture', () => {
  const disponibles = foods.filter(f => Number.isFinite(f.n?.[17])).length;
  assert(disponibles >= 2400, `couverture B9 insuffisante: ${disponibles}`);
  assert(foods.some(f => f.p?.['17'] === 'CIQUAL_FOLATES_TOTAUX'));
});

test('les aliments moyens officiels sont identifiés dans la base', () => {
  assert.strictEqual(foods.filter(f => f.a === 1).length, 166);
});

test('les fallbacks de composition conservent une provenance sparse', () => {
  assert(foods.some(f => f.p?.['30'] === 'CIQUAL_VITE_GENERIQUE'));
  assert(foods.some(f => f.p?.['17'] === 'CIQUAL_FOLATES_TOTAUX'));
});

test('CALNUT 2020 complète uniquement les valeurs absentes de Ciqual 2025', () => {
  const direct = byCode.get('25186');
  const impute = byCode.get('26263');
  assert(direct && impute, 'aliments CALNUT de contrôle absents');
  assert.strictEqual(direct.n[27], 250);
  assert.strictEqual(direct.p?.['27'], 'CALNUT_2020_NON_IMPUTE_MB');
  assert.strictEqual(impute.n[27], 220);
  assert.strictEqual(impute.p?.['27'], 'CALNUT_2020_IMPUTE_MB');
});

test('les valeurs Ciqual 2025 existantes ne sont jamais écrasées par CALNUT', () => {
  const sel = byCode.get('11017');
  assert(sel);
  assert.strictEqual(sel.n[1], 0);
  assert.notStrictEqual(sel.p?.['1'], 'CALNUT_2020_IMPUTE_MB');
  assert.notStrictEqual(sel.p?.['1'], 'CALNUT_2020_NON_IMPUTE_MB');
});

test('CALNUT améliore fortement les micronutriments utiles aux futurs modules', () => {
  const coverage = index => foods.filter(f => Number.isFinite(f.n?.[index])).length;
  assert(coverage(24) >= 2900, `phosphore trop incomplet: ${coverage(24)}`);
  assert(coverage(25) >= 2900, `magnésium trop incomplet: ${coverage(25)}`);
  assert(coverage(27) >= 2940, `potassium trop incomplet: ${coverage(27)}`);
  assert(coverage(18) >= 2700, `B12 trop incomplète: ${coverage(18)}`);
  assert(coverage(14) >= 2740, `vitamine D trop incomplète: ${coverage(14)}`);
  assert(coverage(31) >= 2540, `vitamine K1 trop incomplète: ${coverage(31)}`);
});

test('les valeurs CALNUT sont reconnues comme estimations par le moteur journalier', () => {
  assert(scriptSource.includes('codeSource.startsWith("CALNUT_2020_")'));
});

test('anmGetNutrients privilégie food.e avant le calcul 4/4/9', () => {
  assert(scriptSource.includes('const energieCiqual = Number(food.e)'));
  assert(scriptSource.includes('energySource = provenance.e || "CIQUAL_DIRECT"'));
  assert(scriptSource.includes('energySource = "CALCULE_4_4_9"'));
});

test('les totaux journalier exposent une couverture pondérée et une part estimée', () => {
  assert(scriptSource.includes('knownWeight'));
  assert(scriptSource.includes('estimatedWeight'));
  assert(scriptSource.includes('coverageWeight'));
  assert(syntheseSource.includes('couverturePoids'));
  assert(syntheseSource.includes('partEstimeePoids'));
});

test('l’interface ne réutilise plus les deux formulations techniques rejetées', () => {
  for (const rel of ['JS/script.js','JS/hta.js','JS/micronutrition.js']) {
    const txt = fs.readFileSync(path.join(root, rel), 'utf8');
    assert(!txt.includes('Donnée partielle — non concluant'), rel);
    assert(!txt.includes('Dépassement certain'), rel);
  }
});

let ok = 0;
for (const {name, fn} of tests) {
  try { fn(); ok++; console.log(`PASS — ${name}`); }
  catch (e) { console.error(`FAIL — ${name}`); console.error(e.stack || e.message); }
}
console.log(`\n${ok}/${tests.length} tests réussis`);
process.exit(ok === tests.length ? 0 : 1);
