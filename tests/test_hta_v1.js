const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'JS', 'hta.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const syntheseSource = fs.readFileSync(path.join(root, 'JS', 'synthese.js'), 'utf8');

const contexte = {
  console,
  Number,
  String,
  Array,
  Object,
  Math,
  Set,
  Map,
  document: {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  },
  window: { enregistrerModulePathologique() {} },
  echapperHTML: valeur => String(valeur ?? '')
};
vm.createContext(contexte);
vm.runInContext(source, contexte, { filename: 'hta.js' });

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const aCode = (liste, code) => (liste || []).some(item => item.code === code);

function baseDonnees(overrides = {}) {
  const base = {
    synthese: {
      patient: { age: 55 },
      contexte: { activite: 'Modérément actif', activitePAL: 1.6 },
      habitudes: { fruitsLegumes: 'adequat' },
      anthropometrie: { imc: 23 },
      pathologies: { selectionnees: ['Hypertension'] },
      etatNutritionnel: { has: { diagnostic: false } }
    },
    sodium: { valeur: 1800, partiel: false },
    sel: { valeur: 4.5, partiel: false },
    potassium: { valeur: 3800, partiel: false },
    sodiumMax: 2400,
    selMax: 6,
    potassiumMin: 3510,
    evaluationSel: { ajoutFrequent: false, substitutPotassium: false },
    classesTraitement: [],
    hta: {
      alcoolVerresJour: 0,
      tabac: 'non',
      pressionArterielle: { cabinet: {} },
      traitement: { classes: [] },
      biologie: {}
    },
    sourcesSodium: [],
    analyseNatriurese: null
  };
  const d = structuredClone(base);
  Object.assign(d, overrides);
  if (overrides.synthese) d.synthese = { ...base.synthese, ...overrides.synthese };
  if (overrides.hta) d.hta = { ...base.hta, ...overrides.hta };
  return d;
}

// Architecture

test('le module HTA est enregistré dans l’orchestrateur central', () => {
  assert(source.includes('id: "hta"'));
  assert(source.includes('analyse: afficherAnalyseHTA'));
  assert(source.includes('priseEnCharge: afficherPriseEnChargeHTA'));
});

test('SynthesePatient centralise les données HTA et la biologie reste centralisée', () => {
  assert(syntheseSource.includes('function obtenirDonneesHTA'));
  assert(syntheseSource.includes('pressionArterielle'));
  assert(syntheseSource.includes('traitement:'));
});

test('HTA consomme l’anamnèse centralisée sans lire anmRows directement', () => {
  assert(!source.includes('anmRows'));
  assert(source.includes('synthese?.anamnese'));
  assert(source.includes('anamnese?.apports?.[key]'));
  assert(source.includes('anamnese?.aliments'));
});


// Statuts de comparaison

test('un maximum est classé adéquat à la limite et élevé au-dessus', () => {
  assert.strictEqual(contexte.obtenirStatutMaximumHTA(2000, 2000).classe, 'adequat');
  assert.strictEqual(contexte.obtenirStatutMaximumHTA(2001, 2000).classe, 'eleve');
});

test('un minimum est classé insuffisant sous la limite et adéquat à la limite', () => {
  assert.strictEqual(contexte.obtenirStatutMinimumHTA(3509, 3510).classe, 'insuffisant');
  assert.strictEqual(contexte.obtenirStatutMinimumHTA(3510, 3510).classe, 'adequat');
});

// Traitements / potassium

test('thiazidique et diurétique de l’anse déclenchent une vigilance hypokaliémie', () => {
  for (const classe of ['diuretique_thiazidique', 'diuretique_anse']) {
    const v = contexte.obtenirVigilancesTraitementHTA({ traitement: { classes: [classe] } });
    assert(v.some(item => /hypokali/i.test(item.titre)));
  }
});

test('IEC, ARA2 et spironolactone déclenchent une vigilance hyperkaliémie', () => {
  for (const classe of ['iec', 'ara2', 'spironolactone']) {
    const v = contexte.obtenirVigilancesTraitementHTA({ traitement: { classes: [classe] } });
    assert(v.some(item => /hyperkali/i.test(item.titre)));
  }
});

test('un substitut potassique avec IEC/ARA2/spironolactone devient une vigilance haute', () => {
  const d = baseDonnees({
    evaluationSel: { ajoutFrequent: false, substitutPotassium: true },
    classesTraitement: ['iec']
  });
  const v = contexte.construireVigilancesPriseEnChargeHTA(d);
  const item = v.find(x => x.code === 'hta-substitut-potassium');
  assert(item && item.niveau === 'haute');
});

// Sodium / sel / potassium

test('un apport sodé au-dessus de l’objectif devient une priorité haute', () => {
  const d = baseDonnees({ sodium: { valeur: 2800 }, sodiumMax: 2400 });
  const p = contexte.construirePrioritesPriseEnChargeHTA(d);
  const item = p.find(x => x.code === 'hta-sodium-eleve');
  assert(item && item.niveau === 'haute');
});

test('un apport sodé et salé dans les objectifs ne génère pas de fausse priorité sodium', () => {
  const p = contexte.construirePrioritesPriseEnChargeHTA(baseDonnees());
  assert(!aCode(p, 'hta-sodium-eleve'));
});

test('le sel discrétionnaire est traité séparément du total CIQUAL', () => {
  const d = baseDonnees({ evaluationSel: { ajoutFrequent: true, substitutPotassium: false } });
  const p = contexte.construirePrioritesPriseEnChargeHTA(d);
  const item = p.find(x => x.code === 'hta-sel-discretionnaire');
  assert(item);
  assert(/n'est pas quantifié automatiquement/i.test(item.detail));
});

test('un potassium alimentaire bas sous contexte IEC ne déclenche jamais une augmentation systématique', () => {
  const d = baseDonnees({
    potassium: { valeur: 2500 },
    classesTraitement: ['iec'],
    hta: { traitement: { classes: ['iec'] }, biologie: {} }
  });
  const p = contexte.construirePrioritesPriseEnChargeHTA(d);
  const item = p.find(x => x.code === 'hta-qualite-vegetale-potassium');
  assert(item);
  assert(/ne pas proposer d'augmentation systématique du potassium/i.test(item.actions.join(' ')));
});

// Natriurèse

test('100 mmol/24 h de natriurèse correspondent à 2300 mg sodium et 5,85 g de sel', () => {
  const r = contexte.analyserNatriureseHTA({ natriurese24h: 100 }, null);
  assert(Math.abs(r.sodiumUrinaireMg - 2300) < 0.001);
  assert(Math.abs(r.equivalentSelG - 5.85) < 0.001);
});

test('la natriurèse absente reste non interprétée', () => {
  assert.strictEqual(contexte.analyserNatriureseHTA({}, 2000), null);
});

// Alcool — correction audit patch 01

test('le seuil alcool n’est plus différencié selon le sexe', () => {
  assert(!source.includes('sexe === "homme" ? 3'));
  assert(!source.includes('sexe === "femme" ? 2'));
  assert(source.includes('alcool > 2'));
});

test('le module affiche les trois dimensions du repère actuel de réduction des risques', () => {
  assert(source.includes('maximum 2 verres standard par jour'));
  assert(source.includes('maximum 10 par semaine'));
  assert(source.includes('des jours sans alcool'));
});

test('NutriFlow ne prétend pas déduire le total hebdomadaire à partir du seul champ quotidien', () => {
  assert(source.includes('les données actuelles ne suffisent pas à conclure sur le'));
  assert(source.includes('total hebdomadaire ni sur les jours sans alcool'));
});

test('2 verres/j ne devient pas une priorité faute de données hebdomadaires, >2 verres/j oui', () => {
  const d2 = baseDonnees({ hta: { alcoolVerresJour: 2, traitement: { classes: [] }, biologie: {}, pressionArterielle: { cabinet: {} } } });
  const d3 = baseDonnees({ hta: { alcoolVerresJour: 3, traitement: { classes: [] }, biologie: {}, pressionArterielle: { cabinet: {} } } });
  const p2 = contexte.construirePrioritesPriseEnChargeHTA(d2);
  const p3 = contexte.construirePrioritesPriseEnChargeHTA(d3);
  assert(!p2.find(x => x.code === 'hta-alcool'));
  assert.strictEqual(p3.find(x => x.code === 'hta-alcool').niveau, 'moyenne');
  const education = contexte.construireEducationNutritionnelleHTA(d2, p2);
  assert(education.some(x => /alcool/i.test(x.titre)));
});

test('le suivi demande explicitement le total hebdomadaire et les jours sans alcool', () => {
  assert(source.includes('Préciser le nombre de jours de consommation, le total hebdomadaire'));
  assert(source.includes('Réévaluer la quantité quotidienne, le total hebdomadaire et les jours sans alcool.'));
});

test('le champ patient précise qu’il s’agit de verres standard', () => {
  assert(html.includes('<span>verre(s) standard/j</span>'));
});

// Vigilances de sécurité / pluripathologie

test('PAS >180 ou PAD >110 déclenche une vigilance médicale haute', () => {
  const d = baseDonnees({ hta: { pressionArterielle: { cabinet: { pas: 181, pad: 90 } }, traitement: { classes: [] }, biologie: {} } });
  const v = contexte.construireVigilancesPriseEnChargeHTA(d);
  const item = v.find(x => x.code === 'hta-pa-severe');
  assert(item && item.niveau === 'haute');
});

test('HTA avant 30 ans déclenche une vigilance spécialisée', () => {
  const d = baseDonnees({ synthese: { ...baseDonnees().synthese, patient: { age: 25 } } });
  const v = contexte.construireVigilancesPriseEnChargeHTA(d);
  assert(aCode(v, 'hta-age-jeune'));
});

test('DFG <30 déclenche une vigilance rénale haute', () => {
  const d = baseDonnees({ hta: { traitement: { classes: [] }, pressionArterielle: { cabinet: {} }, biologie: { dfg: 25 } } });
  const item = contexte.construireVigilancesPriseEnChargeHTA(d).find(x => x.code === 'hta-dfg-bas');
  assert(item && item.niveau === 'haute');
});

test('une dénutrition associée empêche d’empiler automatiquement les restrictions', () => {
  const s = baseDonnees().synthese;
  s.etatNutritionnel = { has: { diagnostic: true } };
  const d = baseDonnees({ synthese: s });
  const item = contexte.construireVigilancesPriseEnChargeHTA(d).find(x => x.code === 'hta-denutrition');
  assert(item && item.niveau === 'haute');
  assert(/éviter d'empiler les restrictions/i.test(item.detail));
});

test('un objectif sel <5 g/j est marqué comme situation particulière et non standard', () => {
  const d = baseDonnees({ selMax: 4 });
  const item = contexte.construireVigilancesPriseEnChargeHTA(d).find(x => x.code === 'hta-objectif-sel-strict');
  assert(item && item.niveau === 'moyenne');
  assert(/situation particulière/i.test(item.detail));
});

test('si le module obésité/surpoids est déjà actif, HTA ne crée pas un axe poids redondant', () => {
  const s = baseDonnees().synthese;
  s.anthropometrie = { imc: 31 };
  s.pathologies = { selectionnees: ['Hypertension', 'Obésité'] };
  const p = contexte.construirePrioritesPriseEnChargeHTA(baseDonnees({ synthese: s }));
  assert(!aCode(p, 'hta-surcharge-ponderale'));
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
