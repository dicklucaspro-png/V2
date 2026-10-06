const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'JS', 'mrc.js'), 'utf8');
const syntheseSource = fs.readFileSync(path.join(root, 'JS', 'synthese.js'), 'utf8');
const biologieSource = fs.readFileSync(path.join(root, 'JS', 'biologie.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const contexte = {
  console,
  Number,
  String,
  Array,
  Object,
  Math,
  Set,
  Map,
  Date,
  document: {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  },
  window: null,
  globalThis: null,
  echapperHTML: v => String(v ?? ''),
  enregistrerModulePathologique() {}
};
contexte.window = contexte;
contexte.globalThis = contexte;
vm.createContext(contexte);
vm.runInContext(source, contexte, { filename: 'mrc.js' });

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

function bio(valeur, unite = '', referenceLaboratoire = '', date = '2026-10-01') {
  return { valeur, unite, referenceLaboratoire, date };
}

function baseSynthese(overrides = {}) {
  const s = {
    patient: { age: 60, sexe: 'homme' },
    anthropometrie: { poids: 70, imc: 22.9 },
    etatNutritionnel: {
      has: { diagnostic: false },
      glim: { diagnostic: false },
      donneesDenutrition: { sarcopenieConfirmee: false }
    },
    objectifsNutritionnels: { energie: { objectif: 2100 } },
    contexteRenal: {
      pathologieSelectionnee: true,
      biologie: {
        dfg: bio(42, 'mL/min/1,73 m²'),
        creatinine: bio(130, 'µmol/L'),
        rac: bio(85, 'mg/g'),
        bicarbonates: bio(24, 'mmol/L'),
        potassium: bio(4.6, 'mmol/L', '3,5 - 5,1'),
        sodium: bio(139, 'mmol/L'),
        phosphore: bio(1.2, 'mmol/L', '0,8 - 1,5'),
        calcium: bio(2.3, 'mmol/L', '2,15 - 2,55'),
        pth: bio(70, 'pg/mL', '15 - 65'),
        albumine: bio(39, 'g/L'),
        crp: bio(2, 'mg/L'),
        hemoglobine: bio(14, 'g/dL'),
        reticulocytes: bio(60, 'G/L'),
        vgm: bio(90, 'fL'),
        ferritine: bio(120, 'µg/L'),
        cst: bio(30, '%'),
        vitamineB9: bio(8, 'ng/mL'),
        vitamineB12: bio(400, 'pg/mL'),
        vitamineD: bio(35, 'ng/mL', '30 - 100')
      },
      dossierMRC: {
        present: true,
        dateDiagnostic: '2024-01-01',
        chroniciteDocumentee: 'oui',
        contexteAigu: 'non',
        cause: '',
        historique: {
          dfgPrecedent: 46,
          dfgPrecedentDate: '2025-10-01',
          racPrecedent: 50,
          racPrecedentUnite: 'mg/g',
          racPrecedentDate: '2025-10-01'
        },
        suppleance: { dialyse: 'aucune', traitementConservateur: 'non' },
        hydratation: { diurese24h: 1500, oedemes: 'non', deshydratation: 'non', objectifHydriqueMl: null },
        modulateurs: { fragilite: 'non', instabiliteMetabolique: 'non', pertesSodees: 'non' },
        prescriptionNutritionnelle: { poidsReference: null, objectifProteinesGKg: null }
      },
      marqueurs: {},
      traitementsConnus: { antihypertenseurs: [], sglt2: '' },
      apports: {
        energie: { valeur: 2100, complet: true },
        proteines: { valeur: 65, complet: true },
        sodium: { valeur: 1800, complet: true },
        potassium: { valeur: 3300, complet: true },
        phosphore: { valeur: 900, complet: true },
        calcium: { valeur: 850, complet: true },
        eau: { valeur: 1600, complet: true }
      }
    },
    mrc: { present: true }
  };
  const copy = structuredClone(s);
  Object.assign(copy, overrides);
  if (overrides.patient) copy.patient = { ...s.patient, ...overrides.patient };
  if (overrides.anthropometrie) copy.anthropometrie = { ...s.anthropometrie, ...overrides.anthropometrie };
  if (overrides.etatNutritionnel) copy.etatNutritionnel = { ...s.etatNutritionnel, ...overrides.etatNutritionnel };
  if (overrides.contexteRenal) copy.contexteRenal = { ...s.contexteRenal, ...overrides.contexteRenal };
  return copy;
}

// Architecture / champs

test('le module MRC est enregistré dans l’orchestrateur central', () => {
  assert(source.includes('id: "mrc"'));
  assert(source.includes('analyse: afficherAnalyseMRC'));
  assert(source.includes('priseEnCharge: afficherPriseEnChargeMRC'));
});

test('la case MRC est activée et son bloc de détail existe', () => {
  assert(html.includes('value="Maladie rénale">'));
  assert(!html.includes('value="Maladie rénale" disabled'));
  assert(html.includes('id="mrcDetails"'));
});

test('la biologie centrale contient RAC, bicarbonates, PTH et hémoglobine', () => {
  for (const id of ['bioRac', 'bioBicarbonates', 'bioPth', 'bioHemoglobine', 'bioReticulocytes', 'bioVgm']) {
    assert(html.includes(`id="${id}"`), id);
    assert(biologieSource.includes(`${id}:`), id);
  }
  assert(syntheseSource.includes('hematologie:'));
  assert(syntheseSource.includes('rac,'));
  assert(syntheseSource.includes('bicarbonates,'));
});

test('mrc.js ne relit pas les apports alimentaires depuis anmRows', () => {
  assert(!source.includes('anmRows'));
  assert(source.includes('analyse.contexte?.apports'));
});

// G/A

test('catégories G aux bornes KDIGO', () => {
  const cas = [[90,'G1'],[89,'G2'],[60,'G2'],[59,'G3a'],[45,'G3a'],[44,'G3b'],[30,'G3b'],[29,'G4'],[15,'G4'],[14,'G5']];
  for (const [v, attendu] of cas) assert.strictEqual(contexte.classerDFGMRC(v), attendu);
});

test('catégories A aux bornes KDIGO', () => {
  assert.strictEqual(contexte.classerAlbuminurieMRC(29.9), 'A1');
  assert.strictEqual(contexte.classerAlbuminurieMRC(30), 'A2');
  assert.strictEqual(contexte.classerAlbuminurieMRC(300), 'A2');
  assert.strictEqual(contexte.classerAlbuminurieMRC(300.1), 'A3');
});

test('RAC mg/mmol est converti en mg/g', () => {
  assert(Math.abs(contexte.convertirRACVersMgGMRC(10, 'mg/mmol') - 88.4) < 0.001);
});

test('G3b A2 confirmé donne un risque G×A très élevé', () => {
  assert.strictEqual(contexte.niveauRisqueGAMRC('G3b', 'A2', true), 'tres_eleve');
  assert.strictEqual(contexte.niveauRisqueGAMRC('G3b', 'A2', false), null);
});

// Diagnostic / chronicité

test('une MRC cochée est considérée documentée mais peut garder un signal aigu associé', () => {
  const s = baseSynthese();
  s.contexteRenal.dossierMRC.contexteAigu = 'oui';
  const a = contexte.analyserMRC(s);
  assert.strictEqual(a.statutMRC.code, 'MRC_CONFIRMEE');
  assert.strictEqual(a.statutMRC.contexteAiguPossible, true);
});

test('DFG isolé <60 sans MRC cochée donne MRC à confirmer', () => {
  const s = baseSynthese();
  s.contexteRenal.pathologieSelectionnee = false;
  s.mrc = null;
  s.contexteRenal.dossierMRC = null;
  const a = contexte.analyserMRC(s);
  assert.strictEqual(a.statutMRC.code, 'MRC_A_CONFIRMER');
  assert.strictEqual(a.risqueGA, null);
});

test('DFG >=60 + ACR A1 sans diagnostic connu ne documente pas une MRC', () => {
  const s = baseSynthese();
  s.contexteRenal.pathologieSelectionnee = false;
  s.mrc = null;
  s.contexteRenal.dossierMRC = null;
  s.contexteRenal.biologie.dfg = bio(75, 'mL/min/1,73 m²');
  s.contexteRenal.biologie.rac = bio(12, 'mg/g');
  const a = contexte.analyserMRC(s);
  assert.strictEqual(a.statutMRC.code, 'PAS_DE_MRC_OBJECTIVEE');
});

test('variation DFG >20 % sur 5 jours crée un garde-fou aigu possible sans diagnostiquer une IRA', () => {
  const e = contexte.evaluerEvolutionMRC({ dfgActuel: 38, dateActuelle: '2026-10-06', dfgPrecedent: 85, datePrecedente: '2026-10-01' });
  assert.strictEqual(e.variationSignificative, true);
  assert.strictEqual(e.variationRecenteImportante, true);
  assert(!source.includes('diagnostic IRA'));
});

test('déclin annuel ≥5 est classé rapide', () => {
  const e = contexte.evaluerEvolutionMRC({ dfgActuel: 40, dateActuelle: '2026-10-01', dfgPrecedent: 50, datePrecedente: '2025-10-01' });
  assert.strictEqual(e.categorieDeclin, 'rapide');
});

// Potassium / acidose

test('MRC + kaliémie normale ne génère pas de restriction potassique automatique', () => {
  const a = contexte.analyserMRC(baseSynthese());
  const objectifs = contexte.construireObjectifsMRC(a);
  const k = objectifs.find(x => x.titre === 'Potassium');
  assert(k && /Pas de restriction automatique/.test(k.valeur));
});

test('K >5,5 = hyperkaliémie et K >=6,0 = alerte prioritaire', () => {
  assert.strictEqual(contexte.evaluerPotassiumMRC(bio(5.6, 'mmol/L')).statut, 'hyperkaliemie');
  assert.strictEqual(contexte.evaluerPotassiumMRC(bio(6.0, 'mmol/L')).statut, 'hyperkaliemie_alerte');
});

test('bicarbonates <23, <18 et <10 sont distingués', () => {
  assert.strictEqual(contexte.evaluerAcidoseMRC(bio(22, 'mmol/L')).statut, 'basse');
  assert.strictEqual(contexte.evaluerAcidoseMRC(bio(17, 'mmol/L')).statut, 'importante');
  assert.strictEqual(contexte.evaluerAcidoseMRC(bio(9, 'mmol/L')).statut, 'tres_basse');
});

// Protéines / sodium / dialyse

test('MRC G3-G5 non dialysée stable : objectif protéique 0,8 g/kg/j', () => {
  const a = contexte.analyserMRC(baseSynthese());
  assert.strictEqual(a.objectifProteique.mode, 'standard');
  assert.strictEqual(a.objectifProteique.cibleGKg, 0.8);
  assert(Math.abs(a.objectifProteique.grammesJour - 56) < 0.001);
});

test('dialyse remplace la règle prédialyse par 1,0–1,2 g/kg/j', () => {
  const s = baseSynthese();
  s.contexteRenal.dossierMRC.suppleance.dialyse = 'hemodialyse';
  const a = contexte.analyserMRC(s);
  assert.strictEqual(a.objectifProteique.mode, 'dialyse');
  assert.strictEqual(a.objectifProteique.minGKg, 1);
  assert.strictEqual(a.objectifProteique.maxGKg, 1.2);
});

test('dénutrition bloque l’objectif automatique à 0,8 g/kg/j', () => {
  const s = baseSynthese();
  s.etatNutritionnel.has.diagnostic = true;
  const a = contexte.analyserMRC(s);
  assert.strictEqual(a.objectifProteique.mode, 'individualiser');
  assert(contexte.construireVigilancesMRC(a).some(x => x.code === 'mrc-risque-nutritionnel'));
});

test('un objectif protéique spécialisé documenté prime sur la valeur automatique', () => {
  const s = baseSynthese();
  s.contexteRenal.dossierMRC.prescriptionNutritionnelle.objectifProteinesGKg = 0.65;
  const a = contexte.analyserMRC(s);
  assert.strictEqual(a.objectifProteique.mode, 'prescription_documentee');
  assert.strictEqual(a.objectifProteique.cibleGKg, 0.65);
});

test('la cible sodium MRC standard est <2 g/j et les pertes sodées la neutralisent', () => {
  let a = contexte.analyserMRC(baseSynthese());
  assert.strictEqual(a.objectifSodium.maxMg, 2000);
  const s = baseSynthese();
  s.contexteRenal.dossierMRC.modulateurs.pertesSodees = 'oui';
  a = contexte.analyserMRC(s);
  assert.strictEqual(a.objectifSodium.mode, 'individualiser');
  assert.strictEqual(a.objectifSodium.maxMg, null);
});

// Hydratation

test('hydratation : absence de surcharge/dialyse ne déclenche pas de restriction', () => {
  const a = contexte.analyserMRC(baseSynthese());
  assert.strictEqual(a.hydratation.mode, 'libre_adapte');
});

test('œdèmes ou dialyse entraînent une individualisation hydrique sans formule inventée', () => {
  const s = baseSynthese();
  s.contexteRenal.dossierMRC.hydratation.oedemes = 'oui';
  const a = contexte.analyserMRC(s);
  assert.strictEqual(a.hydratation.mode, 'individualiser');
  assert.strictEqual(a.hydratation.objectifMl, null);
  assert(!source.includes('diurese24h + 500'));
});

// Anémie / CKD-MBD

test('Hb basse est une anémie mais pas automatiquement une carence martiale ou une anémie rénale', () => {
  const s = baseSynthese();
  s.contexteRenal.biologie.hemoglobine = bio(11.5, 'g/dL');
  const a = contexte.analyserMRC(s);
  assert.strictEqual(a.anemie.anemie, true);
  const v = contexte.construireVigilancesMRC(a).find(x => x.code === 'mrc-anemie');
  assert(v && /ne pas conclure automatiquement/i.test(v.detail));
});

test('phosphate élevé sur une mesure génère une vigilance de tendance, pas un diagnostic persistant', () => {
  const s = baseSynthese();
  s.contexteRenal.biologie.phosphore = bio(1.8, 'mmol/L', '0,8 - 1,5');
  const a = contexte.analyserMRC(s);
  assert.strictEqual(a.ckdMbd.phosphore.statut, 'haut');
  const v = contexte.construireVigilancesMRC(a).find(x => x.code === 'mrc-phosphore');
  assert(v && /seule valeur isolée/i.test(v.detail));
});

test('PTH élevée non dialysée reste une tendance à interpréter et non un traitement automatique', () => {
  const a = contexte.analyserMRC(baseSynthese());
  const v = contexte.construireVigilancesMRC(a).find(x => x.code === 'mrc-pth');
  assert(v && /valeur isolée/i.test(v.detail));
  assert(!source.includes('prescrire calcitriol'));
});

// KFRE

test('KFRE : le moteur vérifie l’éligibilité mais n’invente pas de formule numérique', () => {
  const a = contexte.analyserMRC(baseSynthese());
  assert.strictEqual(a.kfre.calculable, true);
  assert.strictEqual(a.kfre.risque2ans, null);
  assert(/formule.*(n'est pas|non).*intégrée/i.test(a.kfre.raison));
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    passed++;
    console.log(`PASS — ${name}`);
  } catch (err) {
    console.error(`FAIL — ${name}`);
    console.error(err.stack || err.message);
  }
}
console.log(`\n${passed}/${tests.length} tests réussis`);
process.exit(passed === tests.length ? 0 : 1);
