const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'JS', 'diabete.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const syntheseSource = fs.readFileSync(path.join(root, 'JS', 'synthese.js'), 'utf8');

let syntheseCourante = null;
const contexte = {
  console,
  Date,
  Number,
  String,
  Array,
  Object,
  Math,
  Set,
  Map,
  Intl,
  document: {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  },
  window: {
    enregistrerModulePathologique() {}
  },
  echapperHTML: valeur => String(valeur ?? ''),
  construireSynthesePatient: () => syntheseCourante,
  construireHTMLAnalyseMicronutritionnelle: () => '<div>micro</div>',
  construirePriseEnChargeMicronutritionnelle: (code, options) => ({
    titre: code,
    lien: options?.lien || '',
    action: 'Action test',
    niveau: 'information'
  })
};
vm.createContext(contexte);
vm.runInContext(source, contexte, { filename: 'diabete.js' });

const tests = [];
const test = (nom, fn) => tests.push({ nom, fn });

function baseSynthese(overrides = {}) {
  const base = {
    patient: { age: 55 },
    diabete: {
      present: true,
      type: 'DT2',
      dateDiagnostic: '2020-01-01',
      hba1c: 7,
      hba1cDate: '2026-09-01',
      hba1cObjectif: 7,
      glycemie: null,
      glycemieUnite: 'mg/dL',
      glycemieContexte: '',
      glycemieDate: '',
      surveillance: {},
      episodes: {},
      complications: {},
      dietetique: {},
      traitement: 'metformine',
      dt1: { pompe: {} },
      dt2: {
        aucun: {}, metformine: {}, sulfamides: {}, glinides: {}, dpp4: {}, glp1: {}, sglt2: {},
        insuline: {}, association: {}, autre: {}
      }
    },
    contexte: { activite: 'Modérément actif' },
    anamnese: { disponible: false, repas: {}, totaux: null },
    habitudes: {},
    etatNutritionnel: { has: { diagnostic: false, phenotype: [], etiologie: [], severite: null } }
  };
  const fusion = structuredClone(base);
  if (overrides.diabete) Object.assign(fusion.diabete, overrides.diabete);
  if (overrides.contexte) Object.assign(fusion.contexte, overrides.contexte);
  if (overrides.anamnese) Object.assign(fusion.anamnese, overrides.anamnese);
  if (overrides.habitudes) Object.assign(fusion.habitudes, overrides.habitudes);
  if (overrides.etatNutritionnel) fusion.etatNutritionnel = overrides.etatNutritionnel;
  if (overrides.patient) Object.assign(fusion.patient, overrides.patient);
  return fusion;
}

function analyser(synthese) {
  syntheseCourante = synthese;
  return contexte.analyserDiabete();
}

function aCode(liste, code) {
  return (liste || []).some(item => item.code === code);
}

// Architecture / centralisation

test('le module Diabète est enregistré dans l’orchestrateur central', () => {
  assert(source.includes('id: "diabete"'));
  assert(source.includes('analyse: afficherAnalyseDiabete'));
  assert(source.includes('priseEnCharge: afficherPriseEnChargeDiabete'));
});

test('SynthesePatient centralise les traitements DT1 et DT2', () => {
  assert(syntheseSource.includes('function obtenirDonneesDiabete()'));
  assert(syntheseSource.includes('association: {'));
  assert(syntheseSource.includes('traitements: texteSynthese("dt2AssociationTraitements")'));
  assert(syntheseSource.includes('ratioInsulineGlucides'));
});

test('le module clinique ne réintroduit pas une couche de lecture DOM thérapeutique de secours', () => {
  assert(source.includes('Les données thérapeutiques du diabète sont désormais centralisées'));
  const blocAnalyse = source.slice(source.indexOf('function analyserDiabete()'), source.indexOf('//! GLUCIDES — QUALITE'));
  assert(!blocAnalyse.includes('document.getElementById'));
});

// Traitements / hypoglycémies

test('DT1 seul ne suffit jamais à déduire une exposition thérapeutique aux hypoglycémies', () => {
  assert.strictEqual(contexte.traitementExposeHypoglycemieDiabete({ type: 'DT1', traitement: '' }), false);
  assert.strictEqual(contexte.traitementExposeHypoglycemieDiabete({ type: 'DT1', traitement: 'insulinotherapie' }), true);
  assert.strictEqual(contexte.traitementExposeHypoglycemieDiabete({ type: 'DT1', traitement: 'pompe' }), true);
});

test('DT2 : sulfamide, glinide et insuline sont reconnus comme traitements à risque hypo', () => {
  for (const traitement of ['sulfamides', 'glinides', 'insuline']) {
    assert.strictEqual(contexte.traitementExposeHypoglycemieDiabete({ type: 'DT2', traitement }), true);
  }
  assert.strictEqual(contexte.traitementExposeHypoglycemieDiabete({ type: 'DT2', traitement: 'metformine' }), false);
});

test('une association non structurée n’est pas classée automatiquement à risque hypo sans épisode renseigné', () => {
  assert.strictEqual(contexte.traitementExposeHypoglycemieDiabete({ type: 'DT2', traitement: 'association' }), false);
});

test('une hypoglycémie récente rapportée devient une priorité haute', () => {
  const s = baseSynthese({ diabete: { episodes: { hypoglycemies: 'oui' } } });
  const a = analyser(s);
  const item = a.priorites.find(x => x.code === 'hypoglycemies-recentes');
  assert(item && item.niveau === 'haute');
});

test('une hyperglycémie symptomatique rapportée reste une vigilance de sécurité', () => {
  const s = baseSynthese({ diabete: { episodes: { hyperglycemies: 'oui' } } });
  const a = analyser(s);
  const item = a.vigilances.find(x => x.code === 'hyperglycemies-symptomatiques');
  assert(item && item.niveau === 'haute');
  assert(/coordination médicale/i.test(item.detail));
});

// Glycémie / objectifs individualisés

test('HbA1c au-dessus d’un objectif explicitement renseigné génère une priorité', () => {
  const s = baseSynthese({ diabete: { hba1c: 8.2, hba1cObjectif: 7.0 } });
  assert(aCode(analyser(s).priorites, 'hba1c-au-dessus-objectif'));
});

test('sans objectif HbA1c renseigné, NutriFlow n’invente pas de seuil universel', () => {
  const s = baseSynthese({ diabete: { hba1c: 9.5, hba1cObjectif: null } });
  assert(!aCode(analyser(s).priorites, 'hba1c-au-dessus-objectif'));
});

test('des repas irréguliers sont reliés au traitement et au risque hypo sans imposer une fréquence universelle', () => {
  const s = baseSynthese({ diabete: { dietetique: { repasIrreguliers: 'oui' } } });
  const item = analyser(s).priorites.find(x => x.code === 'repas-irreguliers-diabete');
  assert(item);
  assert(/traitement/i.test(item.detail));
});

test('les boissons sucrées quotidiennes sont une priorité nutritionnelle distincte', () => {
  const s = baseSynthese({ habitudes: { boissonsSucrees: 'quotidienne' } });
  assert(aCode(analyser(s).priorites, 'boissons-sucrees-quotidiennes'));
});

// État nutritionnel / pluripathologie

test('une dénutrition modérée devient une priorité haute et bloque l’empilement de restrictions', () => {
  const s = baseSynthese({
    etatNutritionnel: { has: { diagnostic: true, severite: { niveau: 'moderee' }, phenotype: [], etiologie: [] } }
  });
  const item = analyser(s).priorites.find(x => x.code === 'denutrition-moderee');
  assert(item && item.niveau === 'haute');
  assert(/avant de proposer des objectifs nutritionnels pouvant majorer une restriction/i.test(item.detail));
});

test('une dénutrition sévère reste prioritaire dans l’analyse diabète', () => {
  const s = baseSynthese({
    etatNutritionnel: { has: { diagnostic: true, severite: { niveau: 'severe' }, phenotype: [], etiologie: [] } }
  });
  const item = analyser(s).priorites.find(x => x.code === 'denutrition-severe');
  assert(item && item.niveau === 'haute');
});

// B12 / metformine

test('la metformine seule déclenche le contexte micronutrition B12', () => {
  assert.strictEqual(contexte.traitementInclutMetformineDiabete({ type: 'DT2', traitement: 'metformine' }), true);
});

test('une association contenant explicitement la metformine déclenche aussi B12', () => {
  assert.strictEqual(contexte.traitementInclutMetformineDiabete({
    type: 'DT2', traitement: 'association', dt2: { association: { traitements: 'Empagliflozine + Metformine' } }
  }), true);
});

test('une association sans metformine ne déclenche pas artificiellement B12', () => {
  assert.strictEqual(contexte.traitementInclutMetformineDiabete({
    type: 'DT2', traitement: 'association', dt2: { association: { traitements: 'Empagliflozine + sitagliptine' } }
  }), false);
});

test('la B12 n’est pas déclenchée par un DT1', () => {
  assert.strictEqual(contexte.traitementInclutMetformineDiabete({ type: 'DT1', traitement: 'insulinotherapie' }), false);
});

test('la prise en charge micronutrition B12 n’est construite que si la metformine est présente', () => {
  const sansSynthese = baseSynthese({ diabete: { traitement: 'sglt2' } });
  const avecSynthese = baseSynthese({ diabete: { traitement: 'metformine' } });
  const sans = contexte.construireMicronutritionDiabete({ type: 'DT2', traitement: 'sglt2', synthese: sansSynthese });
  const avec = contexte.construireMicronutritionDiabete({ type: 'DT2', traitement: 'metformine', synthese: avecSynthese });
  assert.strictEqual(sans.length, 0);
  assert.strictEqual(avec.length, 1);
  assert(/metformine/i.test(avec[0].lien));
});

// Sécurité de formulation / UI

test('NutriFlow rappelle explicitement qu’il ne calcule ni ne modifie les doses d’insuline', () => {
  assert(/ne calcule pas[^.]*dose/i.test(source));
  assert(/ne modifie pas[^.]*dose/i.test(source));
});

test('le formulaire distingue bien DT1 et DT2 et les grandes classes thérapeutiques', () => {
  assert(html.includes('value="DT1"'));
  assert(html.includes('value="DT2"'));
  for (const value of ['metformine', 'sulfamides', 'glinides', 'dpp4', 'glp1', 'sglt2', 'insuline', 'association']) {
    assert(html.includes(`value="${value}"`));
  }
});

test('la complétude exige type, traitement et données glycémiques sans exiger une valeur HbA1c arbitraire', () => {
  const s = baseSynthese({ diabete: { hba1c: null, glycemie: null } });
  const c = contexte.evaluerCompletudeDiabete(s);
  assert.strictEqual(c.complete, false);
  assert(c.manquants.includes('HbA1c ou glycémie récente'));
});

let passed = 0;
for (const { nom, fn } of tests) {
  try {
    fn();
    passed += 1;
    console.log(`PASS — ${nom}`);
  } catch (err) {
    console.error(`FAIL — ${nom}`);
    console.error(err.stack || err.message);
  }
}

console.log(`\n${passed}/${tests.length} tests réussis`);
process.exit(passed === tests.length ? 0 : 1);
