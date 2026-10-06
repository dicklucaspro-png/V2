const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const scriptPath = path.join(__dirname, '..', 'JS', 'script.js');
const denutPath = path.join(__dirname, '..', 'JS', 'denut.js');
const script = fs.readFileSync(scriptPath, 'utf8');
const denut = fs.readFileSync(denutPath, 'utf8');

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Fonction ${name} introuvable`);

  let parenDepth = 0;
  let inString = null;
  let escape = false;
  let bodyStart = -1;

  for (let i = source.indexOf('(', start); i < source.length; i++) {
    const c = source[i];
    if (inString) {
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === inString) inString = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inString = c; continue; }
    if (c === '(') parenDepth++;
    if (c === ')') {
      parenDepth--;
      if (parenDepth === 0) {
        bodyStart = source.indexOf('{', i);
        break;
      }
    }
  }

  if (bodyStart < 0) throw new Error(`Corps de ${name} introuvable`);

  let depth = 0;
  inString = null;
  escape = false;
  for (let i = bodyStart; i < source.length; i++) {
    const c = source[i];
    if (inString) {
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === inString) inString = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inString = c; continue; }
    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Fin de ${name} introuvable`);
}

const context = { Number, Math };
vm.createContext(context);
vm.runInContext(extractFunction(script, 'calculerObjectifsNutritionnelsPatient'), context);
const calc = context.calculerObjectifsNutritionnelsPatient;

const macros = { proteines: 15, glucides: 50, lipides: 35 };
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

function base(overrides = {}) {
  return {
    age: 45,
    poids: 80,
    besoinsEnergetiques: 2400,
    denutritionDiagnostiquee: false,
    repartitionMacros: macros,
    objectifPersonnalise: null,
    objectifPersonnaliseContexte: null,
    ...overrides
  };
}

test('Adulte sans dénutrition : objectif énergie = estimation générale', () => {
  const r = calc(base());
  assert.strictEqual(r.energie.objectif, 2400);
  assert.strictEqual(r.contexte, 'general');
});

test('18–69 ans dénutri : ne bascule PAS automatiquement à 30 kcal/kg', () => {
  const r = calc(base({ denutritionDiagnostiquee: true, besoinsEnergetiques: 2200 }));
  assert.strictEqual(r.energie.objectif, 2200);
  assert.notStrictEqual(r.energie.objectif, 80 * 30);
  assert.strictEqual(r.adulteDenutri1869, true);
});

test('18–69 ans dénutri : repère ESPEN hospitalier reste disponible séparément', () => {
  const r = calc(base({ denutritionDiagnostiquee: true }));
  assert.strictEqual(r.energie.repereHospitalierESPEN.energie, 2400);
  assert.strictEqual(r.proteines.repereHospitalierESPEN.proteinesMinimum, 96);
  assert.strictEqual(r.energie.repereHospitalierESPEN.contexte, 'hospitalier');
});

test('18–69 ans dénutri : le repère protéique ESPEN 1,2 g/kg n’est pas imposé', () => {
  const r = calc(base({
    denutritionDiagnostiquee: true,
    repartitionMacros: { proteines: 10, glucides: 55, lipides: 35 },
    besoinsEnergetiques: 2000,
    poids: 100
  }));
  assert.strictEqual(r.proteines.selonRepartition, 50);
  assert.strictEqual(r.proteines.objectif, 50);
  assert.strictEqual(r.proteines.repereHospitalierESPEN.proteinesMinimum, 120);
});

test('≥70 ans dénutri : objectif énergétique initial = 30 kcal/kg et plage HAS 30–40', () => {
  const r = calc(base({ age: 75, poids: 60, besoinsEnergetiques: 2100, denutritionDiagnostiquee: true }));
  assert.strictEqual(r.energie.objectif, 1800);
  assert.strictEqual(r.energie.plageHAS.min, 1800);
  assert.strictEqual(r.energie.plageHAS.max, 2400);
});

test('≥70 ans dénutri : objectif protéique respecte au minimum 1,2 g/kg', () => {
  const r = calc(base({
    age: 75,
    poids: 60,
    besoinsEnergetiques: 2100,
    denutritionDiagnostiquee: true,
    repartitionMacros: { proteines: 10, glucides: 55, lipides: 35 }
  }));
  assert.strictEqual(r.proteines.selonRepartition, 45);
  assert.strictEqual(r.proteines.minimumHAS, 72);
  assert.strictEqual(r.proteines.objectif, 72);
});

test('Objectif personnalisé général : utilisé uniquement en contexte général', () => {
  const general = calc(base({ objectifPersonnalise: 1900, objectifPersonnaliseContexte: 'general' }));
  const denut = calc(base({ denutritionDiagnostiquee: true, objectifPersonnalise: 1900, objectifPersonnaliseContexte: 'general' }));
  assert.strictEqual(general.energie.objectif, 1900);
  assert.strictEqual(denut.energie.objectif, 2400);
});

test('Objectif personnalisé dénutrition : appliqué dans le bon contexte', () => {
  const r = calc(base({ denutritionDiagnostiquee: true, objectifPersonnalise: 2250, objectifPersonnaliseContexte: 'denutrition' }));
  assert.strictEqual(r.energie.objectif, 2250);
  assert.strictEqual(r.energie.personnalisee, true);
});

test('18–69 ans dénutri sans estimation générale : aucune cible énergétique inventée', () => {
  const r = calc(base({ denutritionDiagnostiquee: true, besoinsEnergetiques: null }));
  assert.strictEqual(r.energie.objectif, null);
});

test('Les anciens raccourcis 30 kcal/kg et 1,2 g/kg ne subsistent pas hors moteur central', () => {
  const helper = extractFunction(script, 'calculerObjectifsNutritionnelsPatient');
  const horsHelper = script.replace(helper, '');
  assert.ok(!/denutrition[^\n]{0,100}\?\s*poids\s*\*\s*30/.test(horsHelper));
  assert.ok(!/proteinesMinimumDenutrition\s*=/.test(horsHelper));
  assert.ok(!/objectifParDefaut\s*=\s*denutrition/.test(horsHelper));
  assert.ok(!/energieParDefaut\s*=\s*denutrition/.test(horsHelper));
});

test('denut.js réutilise les objectifs déjà exposés par SynthesePatient', () => {
  const fn = extractFunction(denut, 'obtenirObjectifsDenutrition');
  assert.ok(fn.includes('synthese?.objectifsNutritionnels'));
  assert.ok(!fn.includes('obtenirObjectifsNutritionnelsPatient('));
  assert.ok(!fn.includes('poids * 30'));
  assert.ok(!fn.includes('poids * 1.2'));
});

let ok = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    ok++;
    console.log(`PASS — ${name}`);
  } catch (e) {
    console.error(`FAIL — ${name}`);
    console.error(e.stack || e);
  }
}
console.log(`\n${ok}/${tests.length} tests réussis`);
if (ok !== tests.length) process.exit(1);
