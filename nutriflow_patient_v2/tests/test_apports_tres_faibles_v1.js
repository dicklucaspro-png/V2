const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'JS', 'script.js'), 'utf8');

const debut = script.indexOf('function analyserStatutApport(');
const fin = script.indexOf('\nfunction renderRecommandationsNutritionnelles', debut);
if (debut < 0 || fin < 0) throw new Error('analyserStatutApport introuvable');

const ctx = { Number, Math };
vm.createContext(ctx);
vm.runInContext(script.slice(debut, fin), ctx);

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('apport partiel quasi nul + couverture ≥90 % = Sous le repère', () => {
  const r = ctx.analyserStatutApport(20, { type: 'min', min: 150 }, {
    partiel: true,
    qualite: { couverturePoids: 0.96, intervalleDisponible: false }
  });
  assert.strictEqual(r.label, 'Sous le repère');
  assert.strictEqual(r.classe, 'insuffisant');
  assert.strictEqual(r.certitude, 'apport_tres_faible_couverture_elevee');
});

test('le seuil de 20 % est inclus', () => {
  const r = ctx.analyserStatutApport(30, { type: 'min', min: 150 }, {
    partiel: true,
    qualite: { couverturePoids: 0.90, intervalleDisponible: false }
  });
  assert.strictEqual(r.label, 'Sous le repère');
});

test('au-dessus de 20 % sans intervalle fiable reste À préciser', () => {
  const r = ctx.analyserStatutApport(31, { type: 'min', min: 150 }, {
    partiel: true,
    qualite: { couverturePoids: 0.96, intervalleDisponible: false }
  });
  assert.strictEqual(r.label, 'À préciser');
  assert.strictEqual(r.classe, 'non-evalue');
});

test('une couverture <90 % ne suffit pas à conclure même si la valeur est très faible', () => {
  const r = ctx.analyserStatutApport(5, { type: 'min', min: 150 }, {
    partiel: true,
    qualite: { couverturePoids: 0.89, intervalleDisponible: false }
  });
  assert.strictEqual(r.label, 'À préciser');
});

test('avec intervalle disponible, la règle utilise l’estimation centrale et non le seul minimum connu', () => {
  const r = ctx.analyserStatutApport(5, { type: 'min', min: 150 }, {
    partiel: true,
    qualite: {
      couverturePoids: 0.95,
      borneBasse: 5,
      valeurEstimee: 40,
      borneHaute: 170,
      intervalleDisponible: true
    }
  });
  assert.strictEqual(r.label, 'À préciser');
  assert.strictEqual(r.classe, 'non-evalue');
});

test('borne haute sous le repère reste la preuve prioritaire sur la règle 20 % / 90 %', () => {
  const r = ctx.analyserStatutApport(5, { type: 'min', min: 150 }, {
    partiel: true,
    qualite: {
      couverturePoids: 0.95,
      borneBasse: 5,
      valeurEstimee: 20,
      borneHaute: 25,
      intervalleDisponible: true,
      approximatif: true
    }
  });
  assert.strictEqual(r.label, 'Sous le repère');
  assert.strictEqual(r.classe, 'insuffisant');
  assert.strictEqual(r.certitude, 'intervalle_plausible');
});

test('estimation centrale ≤20 % + forte couverture = Sous le repère même si la borne haute est large', () => {
  const r = ctx.analyserStatutApport(5, { type: 'min', min: 150 }, {
    partiel: true,
    qualite: {
      couverturePoids: 0.95,
      borneBasse: 5,
      valeurEstimee: 25,
      borneHaute: 170,
      intervalleDisponible: true,
      approximatif: true
    }
  });
  assert.strictEqual(r.label, 'Sous le repère');
  assert.strictEqual(r.classe, 'insuffisant');
});

test('la règle s’applique aussi aux repères recommended', () => {
  const r = ctx.analyserStatutApport(2, { type: 'recommended', min: 15, recommendedMax: 20, upperLimit: 100 }, {
    partiel: true,
    qualite: { couverturePoids: 0.94, intervalleDisponible: false }
  });
  assert.strictEqual(r.label, 'Sous le repère');
});

test('la règle s’applique à la borne basse des plages', () => {
  const r = ctx.analyserStatutApport(8, { type: 'range', min: 50, max: 70 }, {
    partiel: true,
    qualite: { couverturePoids: 0.93, intervalleDisponible: false }
  });
  assert.strictEqual(r.label, 'Sous le repère');
});

test('la règle ne s’applique jamais aux repères maximum', () => {
  const r = ctx.analyserStatutApport(1, { type: 'max', max: 2000 }, {
    partiel: true,
    qualite: { couverturePoids: 0.99, intervalleDisponible: false }
  });
  assert.strictEqual(r.label, 'À préciser');
  assert.strictEqual(r.classe, 'non-evalue');
});

test('une donnée complète conserve la logique normale', () => {
  const r = ctx.analyserStatutApport(20, { type: 'min', min: 150 }, { partiel: false });
  assert.strictEqual(r.label, 'Sous le repère');
  assert.strictEqual(r.classe, 'insuffisant');
});

test('l’infobulle spécifique est liée à la certitude apport très faible', () => {
  assert(script.includes('item.statut?.certitude === "apport_tres_faible_couverture_elevee"'));
  assert(script.includes('Apport très faible par rapport au repère et composition alimentaire suffisamment documentée pour conclure à un apport insuffisant.'));
});

test('le code documente explicitement les deux garde-fous 20 % et 90 %', () => {
  assert(script.includes('couverturePourApportTresFaible >= 0.90'));
  assert(script.includes('valeurPourApportTresFaible <= minimumPourApportTresFaible * 0.20'));
});

let ok = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    ok += 1;
    console.log(`PASS — ${name}`);
  } catch (error) {
    console.error(`FAIL — ${name}`);
    console.error(error.stack || error);
  }
}

console.log(`\n${ok}/${tests.length} tests réussis`);
process.exit(ok === tests.length ? 0 : 1);
