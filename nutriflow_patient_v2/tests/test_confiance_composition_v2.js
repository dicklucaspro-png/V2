const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'JS', 'script.js'), 'utf8');
const synthese = fs.readFileSync(path.join(root, 'JS', 'synthese.js'), 'utf8');
const hta = fs.readFileSync(path.join(root, 'JS', 'hta.js'), 'utf8');
const micro = fs.readFileSync(path.join(root, 'JS', 'micronutrition.js'), 'utf8');

const debut = source.indexOf('function analyserStatutApport(');
const fin = source.indexOf('\nfunction renderRecommandationsNutritionnelles', debut);
if (debut < 0 || fin < 0) throw new Error('analyserStatutApport introuvable');
const ctx = { Number, Math };
vm.createContext(ctx);
vm.runInContext(source.slice(debut, fin), ctx);

const tests=[]; const test=(n,f)=>tests.push({n,f});

test('le moteur journalier construit une estimation médiane et une borne haute uniquement pour les valeurs manquantes',()=>{
  assert(source.includes('const missingMedian = Array(nutrientCount).fill(0)'));
  assert(source.includes('const missingUpper = Array(nutrientCount).fill(0)'));
  assert(source.includes('const estimableMissingWeight = Array(nutrientCount).fill(0)'));
  assert(source.includes('anmObtenirStatistiquesCompositionGroupe(food, index)'));
});

test('les statistiques de groupe excluent les valeurs déjà imputées par CALNUT',()=>{
  assert(source.includes('!String(source || "").startsWith("CALNUT_2020_")'));
});

test('l’intervalle n’est activé que si au moins 70 % du poids possède une valeur réelle et presque tout le reste est encadrable',()=>{
  assert(source.includes('couverturePoids >= 0.70'));
  assert(source.includes('couvertureEstimablePoids >= 0.995'));
});

test('un intervalle entièrement sous un minimum évite À préciser',()=>{
  const r=ctx.analyserStatutApport(90,{type:'min',min:150},{partiel:true,qualite:{borneBasse:90,borneHaute:110,intervalleDisponible:true}});
  assert.strictEqual(r.classe,'insuffisant');
  assert.strictEqual(r.label,'Sous le repère');
});

test('un intervalle qui traverse le minimum reste À préciser',()=>{
  const r=ctx.analyserStatutApport(120,{type:'min',min:150},{partiel:true,qualite:{borneBasse:120,borneHaute:170,intervalleDisponible:true}});
  assert.strictEqual(r.classe,'non-evalue');
  assert.strictEqual(r.label,'À préciser');
});

test('si l’estimation centrale atteint un minimum, le statut est Repère atteint même si l’intervalle traverse le seuil',()=>{
  const r=ctx.analyserStatutApport(148,{type:'min',min:150},{partiel:true,qualite:{borneBasse:148,valeurEstimee:151,borneHaute:168,intervalleDisponible:true}});
  assert.strictEqual(r.classe,'adequat');
  assert.strictEqual(r.label,'Repère atteint');
});

test('si l’estimation centrale est dans une plage, le statut est Repère atteint même si les bornes débordent',()=>{
  const r=ctx.analyserStatutApport(48,{type:'range',min:50,max:60},{partiel:true,qualite:{borneBasse:48,valeurEstimee:55,borneHaute:64,intervalleDisponible:true}});
  assert.strictEqual(r.classe,'adequat');
  assert.strictEqual(r.label,'Repère atteint');
});

test('si l’estimation centrale respecte un maximum, le statut est Repère atteint même si la borne haute le dépasse',()=>{
  const r=ctx.analyserStatutApport(140,{type:'max',max:150},{partiel:true,qualite:{borneBasse:140,valeurEstimee:145,borneHaute:165,intervalleDisponible:true}});
  assert.strictEqual(r.classe,'adequat');
  assert.strictEqual(r.label,'Repère atteint');
});

test('un intervalle entièrement sous un maximum est classable',()=>{
  const r=ctx.analyserStatutApport(100,{type:'max',max:150},{partiel:true,qualite:{borneBasse:100,borneHaute:130,intervalleDisponible:true}});
  assert.strictEqual(r.classe,'adequat');
  assert.strictEqual(r.label,'Repère atteint');
});

test('un intervalle entièrement dans une plage est classable',()=>{
  const r=ctx.analyserStatutApport(52,{type:'range',min:50,max:60},{partiel:true,qualite:{borneBasse:52,borneHaute:58,intervalleDisponible:true}});
  assert.strictEqual(r.classe,'adequat');
});

test('sans intervalle fiable le comportement conservateur est maintenu',()=>{
  const r=ctx.analyserStatutApport(100,{type:'max',max:150},{partiel:true,qualite:{intervalleDisponible:false}});
  assert.strictEqual(r.classe,'non-evalue');
});

test('SynthesePatient transporte l’intervalle de confiance de composition',()=>{
  assert(synthese.includes('valeurEstimee'));
  assert(synthese.includes('borneBasse'));
  assert(synthese.includes('borneHaute'));
  assert(synthese.includes('intervalleDisponible'));
});

test('Analyse, HTA et micronutrition consomment la qualité centralisée',()=>{
  assert(source.includes('qualite: apport.qualite'));
  assert(hta.includes('qualite: apport?.qualite ?? null'));
  assert(micro.includes('qualite: apport?.qualite ?? null'));
});

test('les valeurs estimées sont affichées avec ≈ plutôt qu’avec un faux niveau de précision',()=>{
  assert(source.includes('const prefixe = approximatif ? "≈ " : (item.partiel ? "≥ " : "")'));
  assert(hta.includes('const prefixe = utiliseEstimation || item.qualite?.estime === true ? "≈ "'));
  assert(micro.includes('approximatif ? "≈ "'));
});

let ok=0;
for(const {n,f} of tests){try{f();ok++;console.log(`PASS — ${n}`)}catch(e){console.error(`FAIL — ${n}`);console.error(e.stack||e)}}
console.log(`\n${ok}/${tests.length} tests réussis`);
process.exit(ok===tests.length?0:1);
