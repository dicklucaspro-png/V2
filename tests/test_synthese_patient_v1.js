const fs = require('fs');
const path = require('path');
const vm = require('vm');

const synthesePath = path.join(__dirname, '..', 'JS', 'synthese.js');
const diabetePath = path.join(__dirname, '..', 'JS', 'diabete.js');
const source = fs.readFileSync(synthesePath, 'utf8');
const sourceDiabete = fs.readFileSync(diabetePath, 'utf8');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
    passed++;
  } catch (e) {
    console.error('✗', name, '-', e.message);
    failed++;
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function eq(a,b,msg) { if (a !== b) throw new Error(`${msg}: attendu ${JSON.stringify(b)}, reçu ${JSON.stringify(a)}`); }

const values = {
  nom:'Test', prenom:'Patient', age:'74', sexe:'femme', poids:'70', taille:'165', tourTaille:'90',
  traitements:'Traitement général',
  diabeteType:'DT2', diabeteTraitement:'sulfamides', diabeteHba1c:'8.2', diabeteGlycemieUnite:'g/L',
  dt1TypeInsulinotherapie:'basal-bolus', dt1InsulineUtilisee:'Insuline test', dt1NombreInjections:'4',
  dt1ComptageGlucides:'oui', dt1RatioInsulineGlucides:'1/10', dt1Hypoglycemies:'oui', dt1HypoglycemiesDetails:'nuit', dt1RepasActivite:'sport',
  dt1TypePompe:'hybride', dt1TypeInsulinePompe:'rapide', dt1BolusRepas:'oui', dt1ComptageGlucidesPompe:'oui',
  dt1RatioPompe:'10', dt1FacteurCorrectionPompe:'40', dt1HypoglycemiesPompe:'non', dt1GestionActivitePompe:'mode activité', dt1ProblemesPompe:'aucun',
  dt2AucunInformations:'information',
  dt2MetforminePosologie:'1000 mg', dt2MetformineTolerance:'bonne', dt2MetformineRepas:'pendant', dt2MetformineObservance:'bonne',
  dt2SulfamidesTraitement:'gliclazide', dt2SulfamidesHypoglycemies:'oui', dt2SulfamidesDetails:'matin', dt2SulfamidesObservance:'bonne',
  dt2GlinidesTraitement:'repaglinide', dt2GlinidesRepas:'avant repas', dt2GlinidesHypoglycemies:'non', dt2GlinidesObservance:'bonne',
  dt2DPP4Traitement:'sitagliptine', dt2DPP4Tolerance:'bonne', dt2DPP4Observance:'bonne',
  dt2GLP1Traitement:'semaglutide', dt2GLP1Appetit:'diminué', dt2GLP1Poids:'-4 kg', dt2GLP1Tolerance:'nausées', dt2GLP1Observance:'bonne',
  dt2SGLT2Traitement:'dapagliflozine', dt2SGLT2Hydratation:'correcte', dt2SGLT2Tolerance:'bonne', dt2SGLT2Observance:'bonne',
  dt2TypeInsulinotherapie:'basale', dt2InsulineUtilisee:'glargine', dt2NombreInjections:'1', dt2MomentsInjections:'soir', dt2ComptageGlucides:'non',
  dt2Hypoglycemies:'oui', dt2HypoglycemiesDetails:'rare', dt2RepasActivite:'marche après repas',
  dt2AssociationTraitements:'metformine + SGLT2', dt2AssociationHypoglycemies:'non', dt2AssociationRemarques:'RAS', dt2AutreTraitement:'autre molécule',
  obesiteAgeDebut:'30 ans', obesitePoidsForme:'62', obesiteDynamiquePoids:'progressive', obesiteHistoireDetails:'histoire',
  obesiteRetentissementFonctionnel:'modere', obesiteRetentissementDetails:'escaliers', obesiteStigmatisation:'oui', obesiteSommeilAlerte:'non',
  obesiteMedicamentPoids:'oui', obesiteHyperphagiePrandiale:'non', obesiteTachyphagie:'oui', obesiteAlimentationEmotionnelle:'oui',
  obesiteGrignotageCompulsions:'non', obesiteRestrictionCognitive:'oui', obesiteTcaAlerte:'non', obesiteEoss:'2', obesitePrioritePatient:'mobilité', obesiteAttentes:'mieux manger'
};

const selectedPathologies = ['Diabète','Obésité'];
const elements = new Map();
for (const [id,value] of Object.entries(values)) elements.set(id, { id, value, checked:false });

const documentMock = {
  getElementById(id) { return elements.get(id) || null; },
  querySelectorAll(selector) {
    if (selector === 'input[name="pathologies"]:checked') return selectedPathologies.map(value => ({value, checked:true}));
    if (selector === 'input[name="allergies"]:checked') return [];
    return [];
  }
};

const context = {
  console,
  document: documentMock,
  anmRows: [],
  window: null,
  calculerIMCPatient: () => 70 / ((1.65)**2),
  obtenirObjectifsNutritionnelsPatient: () => ({ energie:{objectif:2100}, proteines:{objectif:100}, contexte:'denutrition' })
};
context.window = context;
vm.createContext(context);
vm.runInContext(source, context, {filename:'synthese.js'});

const s = context.construireSynthesePatient();



test('SynthesePatient expose un contrat d’anamnèse exploitable par les modules cliniques', () => {
  assert(source.includes('aliments,'), 'liste d’aliments centralisée absente');
  assert(source.includes('apports'), 'apports enrichis absents');
  assert(source.includes('const nutriments = construireNutrimentsAliment(resultat)'), 'nutriments par aliment absents');
  assert(source.includes('partiel: !complet && connu'), 'complétude des apports absente');
});
test('contrat SynthesePatient porte schemaVersion 1', () => eq(s.schemaVersion,1,'schemaVersion'));
test('objectifs nutritionnels centraux sont exposés', () => eq(s.objectifsNutritionnels.energie.objectif,2100,'objectif énergie'));
test('traitements généraux sont exposés', () => eq(s.traitements.generaux,'Traitement général','traitements généraux'));
test('diabète sélectionné est exposé', () => assert(s.diabete && s.diabete.present === true,'diabète absent'));
test('pompe DT1 est entièrement exposée', () => {
  eq(s.diabete.dt1.pompe.typePompe,'hybride','type pompe');
  eq(s.diabete.dt1.pompe.ratioInsulineGlucides,10,'ratio pompe');
  eq(s.diabete.dt1.pompe.facteurCorrection,40,'facteur correction');
});
test('sulfamides DT2 sont centralisés', () => {
  eq(s.diabete.dt2.sulfamides.traitement,'gliclazide','sulfamide');
  eq(s.diabete.dt2.sulfamides.hypoglycemies,'oui','hypoglycémies sulfamide');
});
test('glinides, DPP4 et GLP1 sont centralisés', () => {
  eq(s.diabete.dt2.glinides.traitement,'repaglinide','glinide');
  eq(s.diabete.dt2.dpp4.traitement,'sitagliptine','DPP4');
  eq(s.diabete.dt2.glp1.traitement,'semaglutide','GLP1');
});
test('insuline DT2 inclut repas/activité et hypoglycémies', () => {
  eq(s.diabete.dt2.insuline.hypoglycemies,'oui','hypoglycémies insuline');
  eq(s.diabete.dt2.insuline.repasActivite,'marche après repas','repas activité');
});
test('autre traitement et absence de traitement sont centralisés', () => {
  eq(s.diabete.dt2.autre.traitement,'autre molécule','autre traitement');
  eq(s.diabete.dt2.aucun.informations,'information','aucun traitement');
});
test('obésité est intégrée à SynthesePatient V1', () => {
  assert(s.obesite && s.obesite.present === true,'obésité absente');
  eq(s.obesite.classeIMC,'Surpoids','classe IMC');
  eq(s.obesite.tourTaille.seuil,80,'seuil tour de taille');
  eq(s.obesite.dynamiquePoids,'progressive','dynamique');
});
test('module diabète ne contient plus la couche de secours DOM', () => {
  assert(!sourceDiabete.includes('completerDonneesTraitementsDiabete'), 'ancienne fonction encore présente');
  assert(!sourceDiabete.includes('valeurChampDiabete'), 'lecture de secours encore présente');
  assert(!sourceDiabete.includes('texteChampDiabete'), 'lecture texte de secours encore présente');
});


test('SynthesePatient expose désormais le contrat Dénutrition et GLIM', () => {
  assert(source.includes('function obtenirDonneesDenutritionSynthese()'), 'contrat dénutrition absent');
  assert(source.includes('function obtenirSyntheseGLIM('), 'synthèse GLIM absente');
  assert(source.includes('donneesDenutrition,'), 'données dénutrition non exposées');
  assert(source.includes('glim: obtenirSyntheseGLIM(donneesDenutrition)'), 'GLIM non relié à SynthesePatient');
});


test('contrat fonctionnel : HAS et GLIM sont calculés depuis les mêmes données centralisées', () => {
  const denutSource = fs.readFileSync(path.join(__dirname, '..', 'JS', 'denut.js'), 'utf8');
  const vals = new Map([
    ['age', { value: '50', checked: false }],
    ['poids', { value: '60', checked: false }],
    ['taille', { value: '175', checked: false }],
    ['denutPoidsHabituel', { value: '66', checked: false }],
    ['denutPoids1Mois', { value: '66', checked: false }],
    ['denutPoids6Mois', { value: '', checked: false }],
    ['denutAlbumine', { value: '', checked: false }],
    ['denutMasseMusculaire', { value: '', checked: false }],
    ['denutSarcopenieConfirmee', { value: '', checked: false }],
    ['denutReductionApports', { value: 'plus50', checked: false }],
    ['denutDureeReduction', { value: 'plus1semaine', checked: false }],
    ['denutMalabsorption', { value: '', checked: false }],
    ['denutAgression', { value: '', checked: false }]
  ]);
  const doc = {
    getElementById(id) { return vals.get(id) || null; },
    querySelectorAll(selector) {
      if (selector === 'input[name="pathologies"]:checked' || selector === 'input[name="allergies"]:checked') return [];
      return [];
    },
    addEventListener() {},
    createElement() { return { classList:{add(){},remove(){}}, addEventListener(){}, setAttribute(){}, style:{} }; }
  };
  const ctx = {
    console,
    document: doc,
    window: null,
    Number, Math, Array, Object, String, Boolean, Date,
    setTimeout(fn){ fn(); }, clearTimeout(){},
    anmRows: [],
    obtenirObjectifsNutritionnelsPatient: () => null
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(denutSource, ctx, { filename: 'denut.js' });
  vm.runInContext(source, ctx, { filename: 'synthese.js' });
  const synthese = ctx.construireSynthesePatient();
  assert(synthese.etatNutritionnel.donneesDenutrition, 'données dénutrition absentes');
  assert(synthese.etatNutritionnel.has?.diagnostic === true, 'HAS non calculé depuis la synthèse');
  assert(synthese.etatNutritionnel.glim?.diagnostic === true, 'GLIM non calculé depuis la synthèse');
});



test('contrat fonctionnel : l’anamnèse centralisée expose apports, complétude et nutriments par aliment', () => {
  const row = { id: 'r1', foodId: 1, foodName: 'Aliment test', group: 'Test', meal: 2, quantity: 100, frequency: 1 };
  const values = Array(38).fill(null);
  values[1] = 10;   // protéines
  values[3] = 5;    // lipides
  values[4] = 3;    // fibres
  values[5] = 2;    // AGS
  values[26] = 500; // sodium
  values[27] = 800; // potassium
  values[36] = 1.2; // sel

  const complete = Array(38).fill(false);
  const known = Array(38).fill(0);
  for (const index of [1,3,4,5,26,27,36]) { complete[index] = true; known[index] = 1; }
  complete[27] = false; // potassium volontairement partiel

  const totals = Array(38).fill(0);
  for (let i = 0; i < values.length; i++) if (Number.isFinite(values[i])) totals[i] = values[i];

  const doc = {
    getElementById() { return null; },
    querySelectorAll() { return []; }
  };
  const ctx = {
    console,
    document: doc,
    window: null,
    anmRows: [row],
    anamneseValideePourAnalyse: true,
    ANM_MEALS: ['Matin','Collation','Midi','Goûter','Soir','Collation soir'],
    ANM_NUTRIENT_INDEXES: { protein:1, lipids:3, fiber:4, ags:5, sodium:26, potassium:27, salt:36 },
    anmGetNutrients: () => ({ weight:100, kcal:200, values }),
    anmGetDailyTotals: () => ({
      totals, complete, known, kcal:200, kcalKnown:1, kcalPartial:200, weight:100
    }),
    obtenirObjectifsNutritionnelsPatient: () => null
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename:'synthese-anamnese.js' });
  const a = ctx.construireSynthesePatient().anamnese;

  assert(a.disponible === true, 'anamnèse devrait être disponible');
  eq(a.apports.sodium.valeur, 500, 'sodium centralisé');
  assert(a.apports.potassium.partiel === true, 'potassium partiel non conservé');
  eq(a.aliments[0].nutriments.sodium, 500, 'sodium par aliment');
  eq(a.aliments[0].repas, 'Midi', 'repas par aliment');
});
test('obésité non sélectionnée retourne null', () => {
  selectedPathologies.splice(0, selectedPathologies.length, 'Diabète');
  const s2 = context.construireSynthesePatient();
  eq(s2.obesite, null, 'obésité doit être null');
});

console.log(`\n${passed} réussis / ${failed} échecs / ${passed+failed} total`);
if (failed) process.exit(1);
