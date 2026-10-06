const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const sourceOriginal = fs.readFileSync(path.join(root, 'JS', 'obesite.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const syntheseSource = fs.readFileSync(path.join(root, 'JS', 'synthese.js'), 'utf8');

let champs = {};
let active = true;
let denutrition = { diagnostic: false };
let calculs = null;

const documentStub = {
  addEventListener() {},
  getElementById(id) {
    if (!(id in champs)) return null;
    return { value: String(champs[id] ?? '') };
  },
  querySelector(selector) {
    if (selector.includes('pathologies') && selector.includes('Obésité')) {
      return { checked: active, addEventListener() {} };
    }
    return null;
  },
  querySelectorAll() { return []; }
};

const contexte = {
  console,
  Number,
  String,
  Array,
  Object,
  Math,
  Set,
  Map,
  document: documentStub,
  window: {
    enregistrerModulePathologique() {},
    rafraichirSortiesPathologiques() {},
    obtenirEtatCalculsObesite: () => calculs
  },
  anmRows: [],
  ANM_MEALS: [
    'Repas du matin', 'Collation du matin', 'Repas du midi',
    "Collation de l'après-midi", 'Repas du soir', 'Collation du soir'
  ],
  anmGetNutrients: () => ({ weight: 0, kcal: null, values: [] }),
  evaluerDenutritionHAS: () => denutrition,
  construireSynthesePatient: () => {
    const p = Number.parseFloat(champs.poids);
    const t = Number.parseFloat(champs.taille);
    const imc = Number.isFinite(p) && Number.isFinite(t) && t > 0 ? p / ((t / 100) ** 2) : null;
    const classe = !Number.isFinite(imc) ? null : imc < 18.5 ? 'Insuffisance pondérale' : imc < 25 ? 'Corpulence normale' : imc < 30 ? 'Surpoids' : imc < 35 ? 'Obésité de classe I' : imc < 40 ? 'Obésité de classe II' : 'Obésité de classe III';
    const tt = Number.parseFloat(champs.tourTaille);
    const sexe = champs.sexe || '';
    const seuil = sexe === 'homme' ? 94 : sexe === 'femme' ? 80 : null;
    return {
      anthropometrie: { poids: Number.isFinite(p) ? p : null },
      contexte: { objectif: champs.objectif || '', sportPratique: champs.sportPratique || '' },
      anamnese: { disponible: false, aliments: [], apports: {} },
      etatNutritionnel: { has: denutrition },
      obesite: active ? {
        present: true, imc, classeIMC: classe,
        tourTaille: Number.isFinite(tt) && Number.isFinite(seuil) ? { valeur: tt, seuil, risque: tt >= seuil } : null,
        ageDebut: champs.obesiteAgeDebut || '', poidsForme: Number.parseFloat(champs.obesitePoidsForme) || null,
        dynamiquePoids: champs.obesiteDynamiquePoids || '', histoireDetails: champs.obesiteHistoireDetails || '',
        retentissementFonctionnel: champs.obesiteRetentissementFonctionnel || '', stigmatisation: champs.obesiteStigmatisation || '',
        sommeilAlerte: champs.obesiteSommeilAlerte || '', medicamentPoids: champs.obesiteMedicamentPoids || '',
        chirurgieBariatrique: champs.obesiteChirurgieBariatrique || '', hyperphagiePrandiale: champs.obesiteHyperphagiePrandiale || '',
        tachyphagie: champs.obesiteTachyphagie || '', alimentationEmotionnelle: champs.obesiteAlimentationEmotionnelle || '',
        grignotageCompulsions: champs.obesiteGrignotageCompulsions || '', restrictionCognitive: champs.obesiteRestrictionCognitive || '',
        tcaAlerte: champs.obesiteTcaAlerte || '', eoss: champs.obesiteEoss || '', prioritePatient: champs.obesitePrioritePatient || '',
        attentes: champs.obesiteAttentes || ''
      } : null
    };
  },
  construireHTMLAnalyseMicronutritionnelle: () => '<div>micro</div>',
  construirePriseEnChargeMicronutritionnelle: (code, options) => ({
    titre: code,
    lien: options?.lien || '',
    action: 'Action test',
    niveau: 'information'
  })
};
vm.createContext(contexte);

// Expose quelques fonctions internes uniquement dans le contexte de test,
// sans modifier l'API publique du module en production.
const sourceTest = sourceOriginal.replace(
  /\}\)\(\);\s*$/,
  'window.__testPrioritesObesite = priorites; window.__testCompletudeObesite = completude; window.__testClasseIMC = classeIMC; window.__testTourTaille = evaluerTourTailleObesite; window.__testConstruireVigilancesObesite = construireVigilancesObesite; window.__testConstruireTraitementsObesite = construireTraitementsObesite; })();'
);
vm.runInContext(sourceTest, contexte, { filename: 'obesite.js' });

const tests = [];
const test = (nom, fn) => tests.push({ nom, fn });
const aTitre = (liste, motif) => (liste || []).some(item => motif.test(item.titre || ''));

function resetChamps() {
  champs = {
    poids: '100',
    taille: '170',
    sexe: 'homme',
    tourTaille: '105',
    obesiteDynamiquePoids: 'stable',
    obesiteAgeDebut: '35',
    obesitePoidsForme: '80',
    obesiteHistoireDetails: '',
    obesiteRetentissementFonctionnel: 'faible',
    obesiteStigmatisation: 'non',
    obesiteSommeilAlerte: 'non',
    obesiteMedicamentPoids: 'non',
    obesiteChirurgieBariatrique: 'non',
    obesiteHyperphagiePrandiale: 'non',
    obesiteTachyphagie: 'non',
    obesiteAlimentationEmotionnelle: 'non',
    obesiteGrignotageCompulsions: 'non',
    obesiteRestrictionCognitive: 'non',
    obesiteTcaAlerte: 'non',
    obesiteEoss: '',
    obesitePrioritePatient: 'Améliorer la santé',
    obesiteAttentes: '',
    objectif: '',
    sportPratique: 'oui'
  };
  active = true;
  denutrition = { diagnostic: false };
  calculs = {
    obesiteActive: true,
    objectifTherapeutique: 'stabilisation',
    objectifTherapeutiqueLibelle: 'Stabilisation pondérale',
    besoinsEnergetiques: 2500,
    objectifEnergetique: 2500,
    deficitActuelKcal: 0,
    deficitActuelPct: 0,
    plageBasoBasse: 1500,
    plageBasoHaute: 1900,
    restrictionNonProposee: false,
    poidsCible: null,
    variationCiblePct: null
  };
}

function analyser() {
  return contexte.window.analyserObesite();
}

resetChamps();

// Architecture

test('le module Obésité est enregistré dans l’orchestrateur central', () => {
  assert(sourceOriginal.includes('id: "obesite"'));
  assert(sourceOriginal.includes('analyse: afficherAnalyseObesite'));
  assert(sourceOriginal.includes('priseEnCharge: afficherPriseEnChargeObesite'));
});

test('SynthesePatient possède une branche obésité', () => {
  assert(syntheseSource.includes('function obtenirDonneesObesiteSynthese()'));
  assert(syntheseSource.includes('const obesite = obtenirDonneesObesiteSynthese();'));
  assert(/\n\s*obesite\n/.test(syntheseSource));
});

test('Obésité consomme l’anamnèse centralisée sans lire anmRows directement', () => {
  assert(!sourceOriginal.includes('anmRows'));
  assert(sourceOriginal.includes('dossier?.anamnese'));
  assert(sourceOriginal.includes('anamnese?.aliments'));
  assert(sourceOriginal.includes('anamnese?.apports?.energie'));
});

test('Obésité consomme aussi ses données cliniques depuis SynthesePatient', () => {
  assert(sourceOriginal.includes('const obesite = synthese?.obesite ?? null'));
  assert(sourceOriginal.includes('const d = donnees(synthese)'));
  assert(!sourceOriginal.includes('const val = id =>'));
  assert(!sourceOriginal.includes('const num = id =>'));
});



// Anthropométrie

test('les classes IMC adultes sont correctement distinguées', () => {
  const f = contexte.window.__testClasseIMC;
  assert.strictEqual(f(24.9), 'Corpulence normale');
  assert.strictEqual(f(25), 'Surpoids');
  assert.strictEqual(f(30), 'Obésité de classe I');
  assert.strictEqual(f(35), 'Obésité de classe II');
  assert.strictEqual(f(40), 'Obésité de classe III');
});

test('le tour de taille utilise les seuils prévus selon le sexe sans poser un diagnostic automatique', () => {
  resetChamps();
  assert.strictEqual(contexte.window.__testTourTaille(94, 'homme').risque, true);
  assert.strictEqual(contexte.window.__testTourTaille(79, 'femme').risque, false);
  assert.strictEqual(contexte.window.__testTourTaille(80, 'femme').risque, true);
});

test('si Obésité n’est pas sélectionnée, le module ne génère aucune analyse', () => {
  resetChamps();
  active = false;
  assert.strictEqual(analyser(), null);
});

test('EOSS est affiché uniquement comme stade renseigné par le professionnel', () => {
  resetChamps();
  champs.obesiteEoss = '2';
  const a = analyser();
  const eoss = a.constats.find(x => x.titre === 'EOSS');
  assert(eoss);
  assert(/renseigné par le professionnel/i.test(eoss.texte));
  assert(/ne l'attribue pas automatiquement/i.test(eoss.texte));
});

// Complétude / alertes

test('la complétude exige corpulence, dynamique, retentissement et objectif patient', () => {
  const f = contexte.window.__testCompletudeObesite;
  const c = f({ imc: null, dynamique: '', retentissement: '', prioritePatient: '', objectif: '' });
  assert.strictEqual(c.complet, false);
  assert(c.manque.includes('poids et taille'));
  assert(c.manque.includes('dynamique pondérale'));
  assert(c.manque.includes('retentissement fonctionnel'));
  assert(c.manque.includes('objectif / priorité du patient'));
});

test('une prise de poids rapide devient une alerte haute', () => {
  resetChamps();
  champs.obesiteDynamiquePoids = 'rapide';
  const a = analyser();
  const item = a.alertes.find(x => /Prise de poids rapide/i.test(x.titre));
  assert(item && item.niveau === 'haute');
});

test('une alerte TCA reste une alerte de sécurité et NutriFlow ne pose pas le diagnostic', () => {
  resetChamps();
  champs.obesiteTcaAlerte = 'oui';
  const a = analyser();
  const item = a.alertes.find(x => /TCA/i.test(x.titre));
  assert(item && item.niveau === 'haute');
  assert(/ne pose pas de diagnostic/i.test(item.texte));
});

test('les comportements alimentaires sont décrits sans être confondus avec un diagnostic de TCA', () => {
  resetChamps();
  champs.obesiteTachyphagie = 'oui';
  champs.obesiteAlimentationEmotionnelle = 'oui';
  const a = analyser();
  const item = a.constats.find(x => x.titre === 'Comportement alimentaire');
  assert(item && /tachyphagie/i.test(item.texte) && /émotionnelle/i.test(item.texte));
});

// Stratégies / pluripathologie

test('une dénutrition associée devient la première priorité de sécurité nutritionnelle', () => {
  resetChamps();
  denutrition = { diagnostic: true };
  const a = analyser();
  const p = contexte.window.__testPrioritesObesite(a);
  assert.strictEqual(p[0].niveau, 'haute');
  assert(/Dénutrition associée/i.test(p[0].titre));
  assert(/avant toute restriction énergétique/i.test(p[0].objectif));
});

test('garde-fou : même si Calculs est incohérent, dénutrition + objectif perte ne génère pas de priorité de déficit', () => {
  resetChamps();
  denutrition = { diagnostic: true };
  calculs.objectifTherapeutique = 'perte';
  calculs.objectifTherapeutiqueLibelle = 'Perte pondérale progressive';
  calculs.restrictionNonProposee = false; // état volontairement incohérent / ancien
  const p = contexte.window.__testPrioritesObesite(analyser());
  assert(aTitre(p, /Dénutrition associée/i));
  assert(!aTitre(p, /Perte pondérale progressive choisie/i));
});

test('garde-fou : alerte TCA + objectif perte ne génère pas de priorité de déficit même si Calculs est ancien', () => {
  resetChamps();
  champs.obesiteTcaAlerte = 'oui';
  calculs.objectifTherapeutique = 'perte';
  calculs.restrictionNonProposee = false;
  const p = contexte.window.__testPrioritesObesite(analyser());
  assert(aTitre(p, /Trouble des conduites alimentaires/i));
  assert(!aTitre(p, /Perte pondérale progressive choisie/i));
});

test('hors contre-indication, une perte pondérale choisie utilise le repère BASO sans imposer une cible automatique', () => {
  resetChamps();
  calculs.objectifTherapeutique = 'perte';
  calculs.objectifTherapeutiqueLibelle = 'Perte pondérale progressive';
  calculs.objectifEnergetique = 1900;
  calculs.deficitActuelKcal = 600;
  calculs.deficitActuelPct = 24;
  const p = contexte.window.__testPrioritesObesite(analyser());
  const item = p.find(x => /Perte pondérale progressive choisie/i.test(x.titre));
  assert(item);
  assert(item.actions.some(x => /objectif énergétique validé dans Calculs nutritionnels/i.test(x)));
  assert(!item.actions.some(x => /Besoins estimés|Repère BASO|Déficit actuellement retenu/i.test(x)));
  assert(/individualisé/i.test(item.objectif));
});

test('la stabilisation ne crée pas de déficit énergétique systématique', () => {
  resetChamps();
  calculs.objectifTherapeutique = 'stabilisation';
  const p = contexte.window.__testPrioritesObesite(analyser());
  const item = p.find(x => /Stabilisation pondérale/i.test(x.titre));
  assert(item);
  assert(item.actions.some(x => /Ne pas appliquer de déficit énergétique systématique/i.test(x)));
});

test('l’objectif habitudes peut être choisi sans objectif pondéral immédiat', () => {
  resetChamps();
  calculs.objectifTherapeutique = 'habitudes';
  const p = contexte.window.__testPrioritesObesite(analyser());
  assert(aTitre(p, /Pas d’objectif pondéral immédiat/i));
});

// Traitements / chirurgie / micronutrition

test('le module ne propose jamais de modifier un traitement favorisant la prise de poids', () => {
  resetChamps();
  champs.obesiteMedicamentPoids = 'oui';
  const traitements = contexte.window.__testConstruireTraitementsObesite(analyser());
  assert(traitements.some(x => /ne jamais modifier le traitement/i.test(x.texte)));
});

test('un contexte bariatrique est explicitement reconnu dans l’analyse', () => {
  resetChamps();
  champs.obesiteChirurgieBariatrique = 'bypass';
  const a = analyser();
  assert(a.constats.some(x => x.titre === 'Contexte bariatrique' && /bypass/i.test(x.texte)));
});

test('hors chirurgie bariatrique, l’obésité seule n’est pas transformée en indication systématique de supplémentation', () => {
  assert(sourceOriginal.includes("L'obésité seule ne justifie pas une supplémentation ou un dosage systématique"));
});

test('la dénutrition associée est aussi conservée dans les vigilances de prise en charge', () => {
  resetChamps();
  denutrition = { diagnostic: true };
  const v = contexte.window.__testConstruireVigilancesObesite(analyser());
  const item = v.find(x => /Dénutrition associée/i.test(x.titre));
  assert(item && item.niveau === 'haute');
});

test('aucune priorité artificielle de maintien n’est créée lorsqu’aucun problème n’est identifié', () => {
  assert(!sourceOriginal.includes('Maintien des habitudes favorables'));
  assert(sourceOriginal.includes('Aucune priorité spécifique n\'est générée'));
});

test('la PEC Obésité utilise la dénutrition centralisée dans SynthesePatient', () => {
  assert(sourceOriginal.includes('analyse?.synthese?.etatNutritionnel?.has'));
  const blocPriorites = sourceOriginal.slice(sourceOriginal.indexOf('function priorites(analyse)'), sourceOriginal.indexOf('function afficherAnalyseObesite'));
  assert(!blocPriorites.includes('evaluerDenutritionHAS'));
});

test('le formulaire contient les champs structurants TCA, retentissement, EOSS et chirurgie bariatrique', () => {
  for (const id of ['obesiteTcaAlerte', 'obesiteRetentissementFonctionnel', 'obesiteEoss', 'obesiteChirurgieBariatrique']) {
    assert(html.includes(`id="${id}"`));
  }
});

let passed = 0;
for (const { nom, fn } of tests) {
  try {
    resetChamps();
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
