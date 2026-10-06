const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const syntheseSource = fs.readFileSync(path.join(root, 'JS', 'synthese.js'), 'utf8');
const dyslipSource = fs.readFileSync(path.join(root, 'JS', 'dyslipidemie.js'), 'utf8');
const scriptSource = fs.readFileSync(path.join(root, 'JS', 'script.js'), 'utf8');

const dyslip = require(path.join(root, 'JS', 'dyslipidemie.js'));

let ok = 0;
let ko = 0;

function test(nom, condition) {
  if (condition) {
    ok += 1;
    console.log(`PASS — ${nom}`);
  } else {
    ko += 1;
    console.error(`FAIL — ${nom}`);
  }
}

function proche(a, b, tol = 0.2) {
  return Number.isFinite(a) && Math.abs(a - b) <= tol;
}

// ---------------------------------------------------------
// Structure UI / architecture
// ---------------------------------------------------------

test(
  'la case Dyslipidémie est activée',
  /name="pathologies"\s+value="Dyslipidémie"(?![^>]*disabled)/.test(html)
);

test('le panneau Détail dyslipidémie existe', html.includes('id="dyslipidemieDetails"'));
test('le résumé biologique en lecture seule existe', html.includes('id="dyslipidemieBiologieResume"'));
test('le groupe traitement dyslipidémie existe', html.includes('id="dyslipidemieTraitementGroupe"'));
test('la section Analyse dyslipidémie existe', html.includes('id="analyseDyslipidemieSection"') && html.includes('id="analyseDyslipidemieContainer"'));
test('les ressources Dyslipidémie sont chargées', html.includes('css/dyslipidemie.css') && html.includes('JS/dyslipidemie.js'));

const debutDetails = html.indexOf('id="dyslipidemieDetails"');
const finDetails = html.indexOf('for="autresPathologies"', debutDetails);
const detailsHtml = debutDetails >= 0 && finDetails > debutDetails ? html.slice(debutDetails, finDetails) : '';

test(
  'le détail dyslipidémie ne duplique pas les champs du bilan biologique central',
  !/id="bio(?:CholesterolTotal|Ldl|Hdl|Triglycerides|ApoB|LpA)"/.test(detailsHtml)
);

test(
  'le niveau de risque est renseigné par le professionnel et SCORE2 n’est pas calculé automatiquement',
  html.includes('id="dyslipidemieRisqueCv"') && html.includes('ne calcule pas automatiquement SCORE2')
);

test(
  'SynthesePatient centralise les données dyslipidémie',
  syntheseSource.includes('function obtenirDonneesDyslipidemie()') && /\n\s*dyslipidemie,\n/.test(syntheseSource)
);

test(
  'la biologie reste à la racine de SynthesePatient et n’est pas copiée dans dyslipidemie',
  /\n\s*biologie,\n/.test(syntheseSource) && !/function obtenirDonneesDyslipidemie\([\s\S]*?bioLdl/.test(syntheseSource)
);

test(
  'le module Dyslipidémie est enregistré dans l’orchestrateur central',
  dyslipSource.includes('id: "dyslipidemie"') && dyslipSource.includes('analyse: afficherAnalyseDyslipidemie') && dyslipSource.includes('priseEnCharge: afficherPriseEnChargeDyslipidemie')
);

test(
  'le chargement / reset patient resynchronise Dyslipidémie',
  (scriptSource.match(/actualiserDyslipidemie/g) || []).length >= 2
);

// ---------------------------------------------------------
// Conversions
// ---------------------------------------------------------

test('conversion LDL g/L vers mg/dL', proche(dyslip.convertirCholesterolVersMgDl(1.4, 'g/L'), 140, 0.001));
test('conversion LDL mmol/L vers mg/dL', proche(dyslip.convertirCholesterolVersMgDl(3.0, 'mmol/L'), 116.01, 0.05));
test('conversion TG mmol/L vers mg/dL', proche(dyslip.convertirTriglyceridesVersMgDl(2.0, 'mmol/L'), 177.14, 0.05));
test('une unité lipidique inconnue n’est pas convertie', dyslip.convertirCholesterolVersMgDl(1.4, 'unité inconnue') === null);

// ---------------------------------------------------------
// Cibles LDL-C
// ---------------------------------------------------------

test(
  'les cibles LDL ESC/EAS V1 sont 116 / 100 / 70 / 55 mg/dL',
  dyslip.CIBLES_LDL_ESC_MG_DL.faible.absolue === 116 &&
  dyslip.CIBLES_LDL_ESC_MG_DL.modere.absolue === 100 &&
  dyslip.CIBLES_LDL_ESC_MG_DL.eleve.absolue === 70 &&
  dyslip.CIBLES_LDL_ESC_MG_DL.tres_eleve.absolue === 55
);

test(
  'risque élevé et très élevé exigent une réduction relative de 50 %',
  dyslip.CIBLES_LDL_ESC_MG_DL.eleve.reduction === 50 && dyslip.CIBLES_LDL_ESC_MG_DL.tres_eleve.reduction === 50
);

const ciblePerso = dyslip.obtenirCibleLdl({
  risqueCv: 'eleve',
  objectifLdl: { valeur: 0.65, unite: 'g/L' }
});
test('un objectif LDL individualisé renseigné a priorité sur la cible de catégorie', proche(ciblePerso.absolueMgDl, 65, 0.001) && ciblePerso.origine === 'individualisee');

const ldlEleveOk = dyslip.evaluerLdl(
  {
    risqueCv: 'eleve',
    objectifLdl: { valeur: null, unite: 'mg/dL' },
    ldlAvantTraitement: { valeur: 150, unite: 'mg/dL' }
  },
  { ldl: { valeur: 65, unite: 'mg/dL' } }
);
test('risque élevé : LDL <70 et réduction ≥50 % = objectif atteint', ldlEleveOk.statut === 'objectif_atteint' && ldlEleveOk.reductionPourcent >= 50);

const ldlEleveSansBaseline = dyslip.evaluerLdl(
  {
    risqueCv: 'eleve',
    objectifLdl: { valeur: null, unite: 'mg/dL' },
    ldlAvantTraitement: { valeur: null, unite: 'mg/dL' }
  },
  { ldl: { valeur: 65, unite: 'mg/dL' } }
);
test('risque élevé : cible absolue atteinte sans baseline reste partiellement évaluable', ldlEleveSansBaseline.statut === 'partiel' && ldlEleveSansBaseline.reductionAtteinte === null);

const ldlModere = dyslip.evaluerLdl(
  {
    risqueCv: 'modere',
    objectifLdl: { valeur: null, unite: 'mg/dL' },
    ldlAvantTraitement: { valeur: null, unite: 'mg/dL' }
  },
  { ldl: { valeur: 99, unite: 'mg/dL' } }
);
test('risque modéré : LDL <100 suffit pour la règle V1', ldlModere.statut === 'objectif_atteint');

const ldlSansCible = dyslip.evaluerLdl(
  {
    risqueCv: '',
    objectifLdl: { valeur: null, unite: 'mg/dL' },
    ldlAvantTraitement: { valeur: null, unite: 'mg/dL' }
  },
  { ldl: { valeur: 120, unite: 'mg/dL' } }
);
test('LDL disponible sans risque/cible n’est jamais classé automatiquement normal ou anormal', ldlSansCible.statut === 'objectif_inconnu');

const ldlManquant = dyslip.evaluerLdl(
  { risqueCv: 'eleve', objectifLdl: {}, ldlAvantTraitement: {} },
  { ldl: { valeur: null, unite: 'mg/dL' } }
);
test('LDL manquant reste non évalué', ldlManquant.statut === 'non_evalue' && ldlManquant.objectifAbsoluAtteint === null);

// ---------------------------------------------------------
// TG / non-HDL / ApoB / Lp(a)
// ---------------------------------------------------------

test('TG à 149 mg/dL ne déclenchent pas le signal ≥150', dyslip.evaluerTriglycerides({ triglycerides: { valeur: 149, unite: 'mg/dL' } }).eleves === false);
test('TG à 150 mg/dL déclenchent le signal ≥150', dyslip.evaluerTriglycerides({ triglycerides: { valeur: 150, unite: 'mg/dL' } }).eleves === true);

test(
  'cible secondaire non-HDL à haut risque = 100 mg/dL',
  dyslip.evaluerNonHdl({ risqueCv: 'eleve' }, { nonHdl: { valeur: 0.95, unite: 'g/L' } }).cibleMgDl === 100
);

test(
  'cible secondaire ApoB à haut risque = 80 mg/dL',
  dyslip.evaluerApoB({ risqueCv: 'eleve' }, { apoB: { valeur: 0.75, unite: 'g/L' } }).cibleMgDl === 80
);

test('Lp(a) >50 mg/dL est signalée comme modificateur de risque', dyslip.convertirLpAVersSeuil(60, 'mg/dL').elevee === true);
test('Lp(a) >105 nmol/L est signalée comme modificateur de risque', dyslip.convertirLpAVersSeuil(120, 'nmol/L').elevee === true);
test('Lp(a) avec unité inconnue n’est pas interprétée', dyslip.convertirLpAVersSeuil(120, 'g/L').interpretable === false);

// ---------------------------------------------------------
// Hypercholestérolémie familiale : signal ≠ diagnostic
// ---------------------------------------------------------

const hfSignal = dyslip.evaluerSuspicionHF(
  {
    hfDiagnostiquee: 'non',
    type: '',
    evenementCvFamilialPrecoce: 'oui',
    traitement: { type: 'aucun' }
  },
  { ldlMgDl: 205, baselineMgDl: null }
);
test('LDL non traité ≥190 + histoire familiale génère un signal HF sans poser un diagnostic', hfSignal.signal === true && hfSignal.statut === 'signal_renforce' && !/diagnostiqu/i.test(hfSignal.libelle));

const hfConnue = dyslip.evaluerSuspicionHF(
  { hfDiagnostiquee: 'oui', type: '', evenementCvFamilialPrecoce: '', traitement: { type: 'statine' } },
  { ldlMgDl: 110, baselineMgDl: 220 }
);
test('HF explicitement diagnostiquée reste distinguée d’une simple suspicion', hfConnue.statut === 'connue');


// ---------------------------------------------------------
// Analyse V1.1 — séparation données / interprétation / PEC
// ---------------------------------------------------------

const debutAnalyse = dyslipSource.indexOf('function afficherAnalyseDyslipidemie()');
const finAnalyse = dyslipSource.indexOf('function obtenirPrincipauxContributeursPEC', debutAnalyse);
const analyseSource = debutAnalyse >= 0 && finAnalyse > debutAnalyse
  ? dyslipSource.slice(debutAnalyse, finAnalyse)
  : '';

test(
  'Analyse ne répète plus les valeurs brutes LDL/TG du bilan biologique',
  !analyseSource.includes('LDL-C actuel') &&
  !analyseSource.includes('formatMgDl(ldl.ldlMgDl)') &&
  !analyseSource.includes('formatMgDl(tg.tgMgDl)')
);

test(
  'Analyse ne contient plus le bloc points de vigilance / priorités',
  !analyseSource.includes('Points de vigilance / priorités détectés') &&
  !analyseSource.includes('dyslip-priority-list')
);

test(
  'Analyse distingue explicitement interprétation biologique et prise en charge',
  analyseSource.includes('Interprétation biologique') &&
  analyseSource.includes('sans anticiper les priorités de prise en charge')
);

test(
  'Analyse exploite les 8 composantes lipidiques disponibles de l’anamnèse',
  ['lipides', 'ags', 'agmi', 'agpi', 'omega6', 'omega3', 'epaDha', 'cholesterol']
    .every(key => dyslip.DEFINITIONS_LIPIDES_ANAMNESE.some(item => item.key === key))
);

test(
  'SynthesePatient expose les lipides détaillés par aliment pour Dyslipidémie',
  ['omega6: valeurs[19]', 'omega3: valeurs[20]', 'epaDha:', 'cholesterol: valeurs[37]']
    .every(fragment => syntheseSource.includes(fragment))
);

const analysePartielle = dyslip.analyserNutrimentAnamnese([
  { nom: 'A', ags: 5, poidsJournalier: 100 },
  { nom: 'B', ags: null, poidsJournalier: 100 },
  { nom: 'C', ags: 2, poidsJournalier: 100 }
], { key: 'ags', label: 'AGS', unite: 'g', energie: true, partLipides: true });

test(
  'une donnée CIQUAL manquante rend le total lipidique partiel au lieu de devenir zéro',
  analysePartielle.partiel === true &&
  analysePartielle.complet === false &&
  analysePartielle.alimentsConnus === 2 &&
  proche(analysePartielle.total, 7, 0.001)
);

test(
  'les contributeurs sont triés par contribution décroissante',
  analysePartielle.contributeurs.length === 2 &&
  analysePartielle.contributeurs[0].nom === 'A' &&
  analysePartielle.contributeurs[1].nom === 'C'
);

test(
  'la part de chaque contributeur est calculée sur le total connu',
  proche(analysePartielle.contributeurs[0].partTotalConnu, 5 / 7 * 100, 0.01)
);

test(
  'Analyse affiche un tableau de synthèse lipidique et des tableaux de contributeurs',
  analyseSource.includes('Profil lipidique de l\'anamnèse') &&
  analyseSource.includes('Principaux contributeurs alimentaires') &&
  dyslipSource.includes('Part du total connu')
);



// ---------------------------------------------------------
// Prise en charge V1.3 — Analyse → axes consolidés de prise en charge
// ---------------------------------------------------------

const analysePecAtherogene = {
  ldl: {
    statut: 'hors_objectif',
    cible: { absolueMgDl: 70, reductionPourcent: 50 }
  },
  nonHdl: { statut: 'eleve', cibleMgDl: 100 },
  apoB: { statut: 'eleve', cibleMgDl: 80 },
  triglycerides: { eleves: false },
  nutrition: {
    anamneseDisponible: true,
    agsAuDessusRepere: true,
    fibresInsuffisantes: true,
    boissonsRegulieres: false,
    nutriments: {
      ags: {
        contributeurs: [
          { nom: 'Fromage', valeur: 5 },
          { nom: 'Beurre', valeur: 4 },
          { nom: 'Charcuterie', valeur: 3 }
        ]
      }
    },
    fibresAnalyse: {
      contributeurs: [
        { nom: 'Pain complet', valeur: 4 },
        { nom: 'Pomme', valeur: 3 }
      ]
    }
  },
  synthese: { obesite: null },
  dyslipidemie: { traitement: { type: 'statine', details: '', tolerance: '', observance: '' } },
  hf: { signal: false, statut: 'non_signalee' },
  lpA: { interpretable: false, elevee: false }
};

const prioritesAtherogenes = dyslip.construirePrioritesPriseEnChargeDyslipidemie(analysePecAtherogene);

test(
  'PEC V1.3 : LDL, non-HDL et ApoB hors cible sont consolidés dans un seul axe athérogène',
  prioritesAtherogenes.length === 1 &&
  prioritesAtherogenes[0].code === 'profil-atherogene' &&
  prioritesAtherogenes[0].constats.some(x => /LDL-C hors/i.test(x)) &&
  prioritesAtherogenes[0].constats.some(x => /non-HDL-C/i.test(x)) &&
  prioritesAtherogenes[0].constats.some(x => /ApoB/i.test(x))
);

test(
  'PEC V1.3 : les AGS et fibres enrichissent l’axe athérogène sans créer de cartes redondantes',
  prioritesAtherogenes.every(item => !['ags', 'fibres'].includes(item.code)) &&
  prioritesAtherogenes[0].constats.some(x => /AGS/i.test(x)) &&
  prioritesAtherogenes[0].constats.some(x => /fibres/i.test(x))
);

test(
  'PEC V1.3 : les principaux contributeurs AGS alimentent directement les actions du profil athérogène',
  prioritesAtherogenes[0].actions.some(action => /Fromage/.test(action) && /Beurre/.test(action))
);

test(
  'PEC V1.3 : chaque axe expose constat(s), objectif, actions, suivi et origine',
  Array.isArray(prioritesAtherogenes[0].constats) &&
  prioritesAtherogenes[0].constats.length >= 3 &&
  Boolean(prioritesAtherogenes[0].objectif) &&
  Array.isArray(prioritesAtherogenes[0].actions) &&
  prioritesAtherogenes[0].actions.length >= 2 &&
  Boolean(prioritesAtherogenes[0].suivi) &&
  Boolean(prioritesAtherogenes[0].origine)
);

const analysePecNonHdlSeul = {
  ldl: { statut: 'objectif_atteint', cible: { absolueMgDl: 70, reductionPourcent: 50 } },
  nonHdl: { statut: 'eleve', cibleMgDl: 100 },
  apoB: { statut: 'adequat', cibleMgDl: 80 },
  triglycerides: { eleves: false },
  nutrition: {
    anamneseDisponible: true,
    agsAuDessusRepere: false,
    fibresInsuffisantes: false,
    boissonsRegulieres: false,
    nutriments: { ags: { contributeurs: [] } },
    fibresAnalyse: { contributeurs: [] }
  },
  synthese: { obesite: null },
  dyslipidemie: { traitement: { type: 'statine' } },
  hf: { signal: false, statut: 'non_signalee' },
  lpA: { interpretable: false, elevee: false }
};

const prioritesNonHdlSeul = dyslip.construirePrioritesPriseEnChargeDyslipidemie(analysePecNonHdlSeul);

test(
  'PEC V1.3 : non-HDL au-dessus de la cible génère un axe athérogène même si le LDL est dans l’objectif',
  prioritesNonHdlSeul.length === 1 &&
  prioritesNonHdlSeul[0].code === 'profil-atherogene' &&
  prioritesNonHdlSeul[0].constats.some(x => /non-HDL-C/i.test(x))
);

const analysePecApoBSeule = {
  ...analysePecNonHdlSeul,
  nonHdl: { statut: 'adequat', cibleMgDl: 100 },
  apoB: { statut: 'eleve', cibleMgDl: 80 }
};

const prioritesApoBSeule = dyslip.construirePrioritesPriseEnChargeDyslipidemie(analysePecApoBSeule);

test(
  'PEC V1.3 : ApoB au-dessus de la cible alimente elle aussi l’axe athérogène',
  prioritesApoBSeule.length === 1 &&
  prioritesApoBSeule[0].code === 'profil-atherogene' &&
  prioritesApoBSeule[0].constats.some(x => /ApoB/i.test(x))
);

const analysePecTg = {
  ldl: { statut: 'objectif_atteint', cible: { absolueMgDl: 100, reductionPourcent: null } },
  nonHdl: { statut: 'adequat', cibleMgDl: 130 },
  apoB: { statut: 'adequat', cibleMgDl: 100 },
  triglycerides: { eleves: true },
  nutrition: {
    anamneseDisponible: true,
    agsAuDessusRepere: false,
    fibresInsuffisantes: false,
    boissonsRegulieres: true,
    nutriments: { ags: { contributeurs: [] } },
    fibresAnalyse: { contributeurs: [] }
  },
  synthese: { obesite: null },
  dyslipidemie: { traitement: { type: 'aucun' } },
  hf: { signal: false, statut: 'non_signalee' },
  lpA: { interpretable: false, elevee: false }
};

const prioritesPecTg = dyslip.construirePrioritesPriseEnChargeDyslipidemie(analysePecTg);

test(
  'PEC V1.3 : hypertriglycéridémie + boissons sucrées génère un axe TG avec constat et action ciblée',
  prioritesPecTg.filter(item => item.code === 'triglycerides').length === 1 &&
  prioritesPecTg[0].constats.some(x => /boissons sucrées/i.test(x)) &&
  prioritesPecTg.some(item => item.actions.some(action => /boissons sucrées/i.test(action)))
);

const analysePecMixte = {
  ...analysePecAtherogene,
  triglycerides: { eleves: true },
  nutrition: {
    ...analysePecAtherogene.nutrition,
    boissonsRegulieres: true
  }
};

const prioritesPecMixte = dyslip.construirePrioritesPriseEnChargeDyslipidemie(analysePecMixte);

test(
  'PEC V1.3 : profil athérogène + TG élevés produisent deux axes distincts et non une carte par biomarqueur',
  prioritesPecMixte.length === 2 &&
  prioritesPecMixte.some(item => item.code === 'profil-atherogene') &&
  prioritesPecMixte.some(item => item.code === 'triglycerides')
);

const analysePecNutrition = {
  ldl: { statut: 'objectif_atteint', cible: { absolueMgDl: 100, reductionPourcent: null } },
  nonHdl: { statut: 'adequat', cibleMgDl: 130 },
  apoB: { statut: 'adequat', cibleMgDl: 100 },
  triglycerides: { eleves: false },
  nutrition: {
    anamneseDisponible: true,
    agsAuDessusRepere: true,
    fibresInsuffisantes: true,
    boissonsRegulieres: false,
    nutriments: { ags: { contributeurs: [{ nom: 'Beurre', valeur: 3 }] } },
    fibresAnalyse: { contributeurs: [{ nom: 'Lentilles', valeur: 6 }] }
  },
  synthese: { obesite: null },
  dyslipidemie: { traitement: { type: 'aucun' } },
  hf: { signal: false, statut: 'non_signalee' },
  lpA: { interpretable: false, elevee: false }
};

const prioritesPecNutrition = dyslip.construirePrioritesPriseEnChargeDyslipidemie(analysePecNutrition);

test(
  'PEC V1.3 : AGS et fibres restent des axes nutritionnels autonomes si aucun marqueur athérogène n’est hors cible',
  prioritesPecNutrition.some(item => item.code === 'ags') &&
  prioritesPecNutrition.some(item => item.code === 'fibres')
);

const analysePecVigilances = {
  ldl: { statut: 'partiel', cible: { absolueMgDl: 70, reductionPourcent: 50 } },
  nonHdl: { statut: 'adequat', cibleMgDl: 100 },
  apoB: { statut: 'adequat', cibleMgDl: 80 },
  triglycerides: { eleves: false },
  nutrition: {
    anamneseDisponible: true,
    agsAuDessusRepere: false,
    fibresInsuffisantes: false,
    boissonsRegulieres: false,
    nutriments: {},
    fibresAnalyse: { contributeurs: [] }
  },
  synthese: { diabete: null, obesite: null },
  dyslipidemie: { traitement: { type: 'statine' } },
  hf: { signal: true, statut: 'signal_renforce' },
  lpA: { interpretable: true, elevee: true }
};

const vigilancesPec = dyslip.construireVigilancesPriseEnChargeDyslipidemie(analysePecVigilances);
const prioritesVigilances = dyslip.construirePrioritesPriseEnChargeDyslipidemie(analysePecVigilances);

test(
  'PEC V1.3 : suspicion HF et Lp(a) élevée restent des vigilances et non des priorités nutritionnelles',
  vigilancesPec.some(item => item.code === 'hf') &&
  vigilancesPec.some(item => item.code === 'lpa') &&
  !prioritesVigilances.some(item => ['hf', 'lpa'].includes(item.code))
);

test(
  'PEC V1.3 : traitement actuel est décrit sans proposition d’adaptation médicamenteuse',
  dyslip.construireTraitementsImplicationsDyslipidemie(analysePecAtherogene)
    .some(item => /aucune initiation, substitution ni adaptation de dose/i.test(item.detail))
);

const debutPec = dyslipSource.indexOf('function afficherPriseEnChargeDyslipidemie()');
const finPec = dyslipSource.indexOf('global.dyslipidemieActive', debutPec);
const pecSource = debutPec >= 0 && finPec > debutPec ? dyslipSource.slice(debutPec, finPec) : '';

test(
  'PEC V1.3 : les blocs génériques Objectifs et Actions nutritionnelles ont disparu',
  !pecSource.includes('<h4>Objectifs</h4>') &&
  !pecSource.includes('<h4>Actions nutritionnelles</h4>')
);

test(
  'PEC V1.3 : la structure reprend Priorités, Éducation, Traitements, Vigilances et Suivi global',
  pecSource.includes('Priorités et objectifs proposés') &&
  pecSource.includes('Éducation nutritionnelle') &&
  pecSource.includes('Traitements et implications nutritionnelles') &&
  pecSource.includes('Vigilances') &&
  pecSource.includes('Suivi global')
);

test(
  'PEC audit : les cartes ne répètent plus la liste détaillée des constats de l’Analyse',
  !dyslipSource.includes("Constats issus de l'analyse") &&
  dyslipSource.includes('Déclencheur :') &&
  dyslipSource.includes('Constat → objectif → actions → suivi')
);

test(
  'PEC V1.3 : non-HDL et ApoB ne sont pas transformés en cartes séparées',
  !prioritesAtherogenes.some(item => ['non-hdl', 'apob', 'ldl'].includes(item.code))
);

// ---------------------------------------------------------
// Sécurité / rôle
// ---------------------------------------------------------

test('le module interdit explicitement l’adaptation automatique de traitement', dyslipSource.includes('ne propose aucune initiation, substitution ni adaptation de dose'));
test('les données manquantes sont explicitement traitées comme non évaluées', dyslipSource.includes("Une donnée manquante n'est jamais assimilée à une valeur normale"));


// ---------------------------------------------------------
// V1.4 — AGS partiels : un minimum connu peut prouver le dépassement
// ---------------------------------------------------------

const nutritionAgsPartielsEleves = dyslip.evaluerNutritionDyslipidemie({
  anamnese: {
    disponible: true,
    repas: {
      Midi: {
        aliments: [
          { nom: 'Aliment A', poidsJournalier: 100, energie: 500, ags: 12 },
          { nom: 'Aliment B', poidsJournalier: 100, energie: 500, ags: null }
        ]
      }
    }
  },
  habitudes: { boissonsSucrees: '' }
});

test(
  'PEC V1.4 : des AGS partiels peuvent prouver un dépassement si le minimum connu dépasse déjà 10 % AET',
  nutritionAgsPartielsEleves.agsPourcent === null &&
  proche(nutritionAgsPartielsEleves.agsPourcentMinimum, 10.8, 0.01) &&
  nutritionAgsPartielsEleves.agsAuDessusRepere === true &&
  nutritionAgsPartielsEleves.agsStatut === 'eleve_minimum_connu'
);

const prioritesAgsPartielsEleves = dyslip.construirePrioritesPriseEnChargeDyslipidemie({
  ldl: { statut: 'objectif_atteint', cible: { absolueMgDl: 100, reductionPourcent: null } },
  nonHdl: { statut: 'adequat', cibleMgDl: 130 },
  apoB: { statut: 'adequat', cibleMgDl: 100 },
  triglycerides: { eleves: false },
  nutrition: {
    ...nutritionAgsPartielsEleves,
    fibresInsuffisantes: false,
    boissonsRegulieres: false
  },
  synthese: { obesite: null },
  dyslipidemie: { traitement: { type: 'aucun' } },
  hf: { signal: false, statut: 'non_signalee' },
  lpA: { interpretable: false, elevee: false }
});

test(
  'PEC V1.4 : le dépassement AGS certain malgré couverture partielle génère bien une priorité nutritionnelle',
  prioritesAgsPartielsEleves.some(item => item.code === 'ags')
);

const nutritionAgsPartielsNonConclusifs = dyslip.evaluerNutritionDyslipidemie({
  anamnese: {
    disponible: true,
    repas: {
      Midi: {
        aliments: [
          { nom: 'Aliment A', poidsJournalier: 100, energie: 500, ags: 5 },
          { nom: 'Aliment B', poidsJournalier: 100, energie: 500, ags: null }
        ]
      }
    }
  },
  habitudes: { boissonsSucrees: '' }
});

test(
  'PEC V1.4 : un minimum AGS partiel sous 10 % ne permet jamais de conclure à un apport adéquat',
  proche(nutritionAgsPartielsNonConclusifs.agsPourcentMinimum, 4.5, 0.01) &&
  nutritionAgsPartielsNonConclusifs.agsAuDessusRepere === null &&
  nutritionAgsPartielsNonConclusifs.agsStatut === 'non_evaluable'
);


// ---------------------------------------------------------
// V1.5 — données lipidiques partielles généralisées
// ---------------------------------------------------------

const nutritionLipidesPartiels = dyslip.evaluerNutritionDyslipidemie({
  anamnese: {
    disponible: true,
    repas: {
      Midi: {
        aliments: [
          {
            nom: 'Aliment A', poidsJournalier: 100, energie: 500,
            lipides: 20, ags: 12, agmi: 8, agpi: 4,
            omega6: 3, omega3: 0.5, epaDha: 200, cholesterol: 100
          },
          {
            nom: 'Aliment B', poidsJournalier: 100, energie: 500,
            lipides: 20, ags: null, agmi: null, agpi: null,
            omega6: null, omega3: null, epaDha: null, cholesterol: null
          }
        ]
      }
    }
  },
  habitudes: { boissonsSucrees: '' }
});

test(
  'Analyse V1.5 : tous les types de lipides conservent leur total connu et leur statut partiel',
  ['ags', 'agmi', 'agpi', 'omega6', 'omega3', 'epaDha', 'cholesterol'].every(cle =>
    nutritionLipidesPartiels.nutriments[cle].partiel === true &&
    Number.isFinite(nutritionLipidesPartiels.nutriments[cle].total)
  )
);

test(
  'Analyse V1.5 : AGMI, AGPI, n-6 et ALA partiels exposent un minimum connu en % AET lorsque l’énergie est complète',
  proche(nutritionLipidesPartiels.nutriments.agmi.pourcentAetMinimum, 7.2, 0.01) &&
  proche(nutritionLipidesPartiels.nutriments.agpi.pourcentAetMinimum, 3.6, 0.01) &&
  proche(nutritionLipidesPartiels.nutriments.omega6.pourcentAetMinimum, 2.7, 0.01) &&
  proche(nutritionLipidesPartiels.nutriments.omega3.pourcentAetMinimum, 0.45, 0.01) &&
  nutritionLipidesPartiels.nutriments.agmi.pourcentAet === null
);

test(
  'Analyse V1.5 : une composante lipidique partielle peut exposer une part minimale des lipides si les lipides totaux sont complets',
  proche(nutritionLipidesPartiels.nutriments.agmi.partLipidesPourcentMinimum, 20, 0.01) &&
  proche(nutritionLipidesPartiels.nutriments.agpi.partLipidesPourcentMinimum, 10, 0.01) &&
  proche(nutritionLipidesPartiels.nutriments.epaDha.partLipidesPourcentMinimum, 0.5, 0.01)
);

test(
  'Analyse V1.5 : EPA+DHA et cholestérol partiels restent des minimums connus sans inventer de % AET',
  nutritionLipidesPartiels.nutriments.epaDha.total === 200 &&
  nutritionLipidesPartiels.nutriments.epaDha.pourcentAetMinimum === null &&
  nutritionLipidesPartiels.nutriments.cholesterol.total === 100 &&
  nutritionLipidesPartiels.nutriments.cholesterol.pourcentAetMinimum === null
);



// ---------------------------------------------------------
// V1.6 — boissons glucidiques détectées dans l'anamnèse
// ---------------------------------------------------------

const boissonsDetecteesV16 = dyslip.detecterBoissonsGlucidiquesAnamnese([
  {
    nom: 'Cola, sucré',
    groupe: 'eaux et autres boissons',
    poidsJournalier: 330,
    glucides: 35,
    frequence: 7,
    repas: 'Repas du midi'
  },
  {
    nom: 'Boisson énergisante, sucrée',
    groupe: 'eaux et autres boissons',
    poidsJournalier: 250,
    glucides: 27,
    frequence: 7,
    repas: "Collation de l'après-midi"
  }
]);

test(
  'Analyse V1.6 : soda et boisson énergisante sucrés sont détectés automatiquement dans l’anamnèse',
  boissonsDetecteesV16.presente === true &&
  boissonsDetecteesV16.detectees.length === 2 &&
  boissonsDetecteesV16.detectees.some(item => /Cola/.test(item.nom)) &&
  boissonsDetecteesV16.detectees.some(item => /énergisante/.test(item.nom)) &&
  proche(boissonsDetecteesV16.totalGlucidesConnus, 62, 0.01)
);

const boissonZeroV16 = dyslip.detecterBoissonsGlucidiquesAnamnese([
  {
    nom: 'Cola, sans sucres ajoutés, avec édulcorants',
    groupe: 'eaux et autres boissons',
    poidsJournalier: 330,
    glucides: 0,
    frequence: 7
  }
]);

test(
  'Analyse V1.6 : un cola sans sucres avec glucides nuls n’est pas classé comme boisson glucidique',
  boissonZeroV16.presente === false && boissonZeroV16.detectees.length === 0
);

const boissonAlcoolV16 = dyslip.detecterBoissonsGlucidiquesAnamnese([
  {
    nom: 'Vin doux',
    groupe: 'eaux et autres boissons',
    poidsJournalier: 150,
    glucides: 18,
    frequence: 7
  }
]);

test(
  'Analyse V1.6 : les boissons alcoolisées ne sont pas confondues avec les boissons sucrées/glucidiques',
  boissonAlcoolV16.presente === false
);

const jusV16 = dyslip.detecterBoissonsGlucidiquesAnamnese([
  {
    nom: "Jus d'orange, pur jus",
    groupe: 'eaux et autres boissons',
    poidsJournalier: 200,
    glucides: 18,
    frequence: 7
  }
]);

test(
  'Analyse V1.6 : un jus riche en glucides est détecté comme boisson glucidique même sans mention de sucre ajouté',
  jusV16.presente === true && jusV16.detectees.length === 1
);

const nutritionBoissonsV16 = dyslip.evaluerNutritionDyslipidemie({
  anamnese: {
    disponible: true,
    repas: {
      Midi: {
        aliments: [
          {
            nom: 'Cola, sucré', groupe: 'eaux et autres boissons', poidsJournalier: 330,
            frequence: 7, energie: 140, glucides: 35, lipides: 0, ags: 0, agmi: 0, agpi: 0,
            fibres: 0, omega6: 0, omega3: 0, epaDha: 0, cholesterol: 0
          },
          {
            nom: 'Pain complet', groupe: 'céréales', poidsJournalier: 100,
            frequence: 7, energie: 250, glucides: 45, lipides: 3, ags: 0.5, agmi: 1, agpi: 1,
            fibres: 7, omega6: 0.8, omega3: 0.1, epaDha: 0, cholesterol: 0
          }
        ]
      }
    }
  },
  habitudes: { boissonsSucrees: '' }
});

test(
  'Analyse V1.6 : evaluerNutritionDyslipidemie expose les boissons détectées même si le champ Habitudes est vide',
  nutritionBoissonsV16.boissonsRegulieres === false &&
  nutritionBoissonsV16.boissonsAnamneseDetectees === true &&
  nutritionBoissonsV16.boissonsAnamnese.detectees[0].nom === 'Cola, sucré'
);

const prioritesBoissonsV16 = dyslip.construirePrioritesPriseEnChargeDyslipidemie({
  ldl: { statut: 'objectif_atteint', cible: { absolueMgDl: 100, reductionPourcent: null } },
  nonHdl: { statut: 'adequat', cibleMgDl: 130 },
  apoB: { statut: 'adequat', cibleMgDl: 100 },
  triglycerides: { eleves: true },
  nutrition: {
    ...nutritionBoissonsV16,
    agsAuDessusRepere: false,
    fibresInsuffisantes: false,
    nutriments: { ags: { contributeurs: [] } },
    fibresAnalyse: { contributeurs: [] }
  },
  synthese: { obesite: null },
  dyslipidemie: { traitement: { type: 'aucun' } },
  hf: { signal: false, statut: 'non_signalee' },
  lpA: { interpretable: false, elevee: false }
});

const axeTgBoissonsV16 = prioritesBoissonsV16.find(item => item.code === 'triglycerides');

test(
  'PEC V1.6 : les TG élevés utilisent directement les boissons détectées dans l’anamnèse, sans dépendre du champ Habitudes',
  Boolean(axeTgBoissonsV16) &&
  axeTgBoissonsV16.constats.some(x => /Cola, sucré/.test(x)) &&
  axeTgBoissonsV16.constats.some(x => /35(?:[,.]0)? g\/j/.test(x)) &&
  axeTgBoissonsV16.actions.some(x => /Cola, sucré/.test(x))
);

test(
  'Analyse V1.6 : le rendu distingue désormais boissons détectées, habitude déclarée et donnée à explorer',
  analyseSource.includes('Boissons sucrées / glucidiques') &&
  analyseSource.includes('détecté automatiquement dans l\'anamnèse') &&
  analyseSource.includes('À explorer')
);



// ---------------------------------------------------------
// V1.7 — couche de synonymes pour la recherche CIQUAL
// ---------------------------------------------------------

test(
  'Recherche V1.7 : une couche de synonymes est définie pour les termes usuels',
  scriptSource.includes('const ANM_SEARCH_SYNONYMES') &&
  scriptSource.includes('function anmEtendreRechercheAvecSynonymes') &&
  scriptSource.includes('function anmScoreNomRecherche') &&
  scriptSource.includes('function anmCorrespondanceSynonymeStricte') &&
  scriptSource.includes('function anmRechercheContientSynonyme')
);

test(
  'Recherche V1.7 : soda / coca / boissons énergisantes sont reliés aux libellés CIQUAL',
  scriptSource.includes('["soda", "sodas", "soft drink", "soft drinks"]') &&
  scriptSource.includes('["coca", "coca cola", "coca-cola", "coke", "pepsi"]') &&
  scriptSource.includes('["red bull", "redbull", "monster", "energy drink", "energy drinks", "boisson energetique", "boissons energetiques"]') &&
  scriptSource.includes('["boisson energisante"]')
);

test(
  'Recherche V1.7 : ice tea / tonic / sirop / jus usuels possèdent des synonymes',
  scriptSource.includes('"ice tea"') &&
  scriptSource.includes('"schweppes"') &&
  scriptSource.includes('"grenadine"') &&
  scriptSource.includes('"jus orange"') &&
  scriptSource.includes('"jus pomme"')
);

test(
  'Recherche V1.7 : zero / light / diet sont traduits vers les formulations CIQUAL',
  scriptSource.includes('["zero", "zéro", "light", "diet"]') &&
  scriptSource.includes('"sans sucres ajoutes avec edulcorants"')
);

test(
  'Recherche V1.7 : anmSearchFoods utilise les requêtes enrichies et garde la saisie exacte prioritaire',
  /function anmSearchFoods\(query\)[\s\S]*?anmEtendreRechercheAvecSynonymes\(query\)/.test(scriptSource) &&
  scriptSource.includes('penaliteSynonyme')
);



// ---------------------------------------------------------
// V1.8 — contexte triglycéridique explicite pour les boissons
// ---------------------------------------------------------

test(
  'Analyse V1.8 : le bloc boissons rend explicite le lien avec les triglycérides élevés',
  analyseSource.includes('Contexte biologique : triglycérides élevés') &&
  analyseSource.includes('seuil d’analyse ≥ 150 mg/dL')
);



// ---------------------------------------------------------
// V1.9 — sévérité des TG + nettoyage + scénarios finaux
// ---------------------------------------------------------

test(
  'PEC V1.9 : les seuils TG de sécurité sont centralisés à 150 / 440 / 880 mg/dL',
  dyslip.SEUILS_TG_ESC_MG_DL.analyse === 150 &&
  dyslip.SEUILS_TG_ESC_MG_DL.vigilancePancreatite === 440 &&
  dyslip.SEUILS_TG_ESC_MG_DL.severe === 880
);

const tg439 = dyslip.evaluerTriglycerides({ triglycerides: { valeur: 439, unite: 'mg/dL' } });
const tg440 = dyslip.evaluerTriglycerides({ triglycerides: { valeur: 440, unite: 'mg/dL' } });
const tg879 = dyslip.evaluerTriglycerides({ triglycerides: { valeur: 879, unite: 'mg/dL' } });
const tg880 = dyslip.evaluerTriglycerides({ triglycerides: { valeur: 880, unite: 'mg/dL' } });
const tg5mmol = dyslip.evaluerTriglycerides({ triglycerides: { valeur: 5, unite: 'mmol/L' } });
const tg10mmol = dyslip.evaluerTriglycerides({ triglycerides: { valeur: 10, unite: 'mmol/L' } });

test(
  'PEC V1.9 : 150–439 mg/dL reste une élévation sans alerte pancréatique automatique',
  tg439.statut === 'eleve' &&
  tg439.vigilancePancreatite === false &&
  tg439.prioriteMedicale === false
);

test(
  'PEC V1.9 : 440 mg/dL ouvre la zone de vigilance pancréatique',
  tg440.statut === 'tres_eleve' &&
  tg440.vigilancePancreatite === true &&
  tg440.risquePancreatiteSignificatif === false &&
  tg440.prioriteMedicale === true
);

test(
  'PEC V1.9 : 879 mg/dL reste dans la zone très élevée avant le seuil sévère',
  tg879.statut === 'tres_eleve' &&
  tg879.vigilancePancreatite === true &&
  tg879.risquePancreatiteSignificatif === false
);

test(
  'PEC V1.9 : 880 mg/dL déclenche le statut sévère et le risque pancréatique significatif',
  tg880.statut === 'severe' &&
  tg880.vigilancePancreatite === true &&
  tg880.risquePancreatiteSignificatif === true &&
  tg880.prioriteMedicale === true
);

test(
  'PEC V1.9 : les conversions 5 et 10 mmol/L rejoignent correctement les zones de sécurité',
  tg5mmol.statut === 'tres_eleve' &&
  tg10mmol.statut === 'severe'
);

function analyseTgFinal(tg) {
  return {
    ldl: { statut: 'objectif_atteint', cible: { absolueMgDl: 100, reductionPourcent: null } },
    nonHdl: { statut: 'adequat', cibleMgDl: 130 },
    apoB: { statut: 'adequat', cibleMgDl: 100 },
    triglycerides: tg,
    nutrition: {
      anamneseDisponible: true,
      agsAuDessusRepere: false,
      fibresInsuffisantes: false,
      boissonsRegulieres: false,
      boissonsAnamneseDetectees: false,
      boissonsAnamnese: { detectees: [], totalGlucidesConnus: 0, glucidesComplets: true },
      nutriments: { ags: { contributeurs: [] } },
      fibresAnalyse: { contributeurs: [] }
    },
    synthese: { obesite: null },
    dyslipidemie: { risqueCv: 'modere', traitement: { type: 'aucun' } },
    hf: { signal: false, statut: 'non_signalee' },
    lpA: { interpretable: false, elevee: false }
  };
}

const analyseTgModereeFinale = analyseTgFinal(
  dyslip.evaluerTriglycerides({ triglycerides: { valeur: 250, unite: 'mg/dL' } })
);
const analyseTgTresEleveeFinale = analyseTgFinal(
  dyslip.evaluerTriglycerides({ triglycerides: { valeur: 500, unite: 'mg/dL' } })
);
const analyseTgSevereFinale = analyseTgFinal(
  dyslip.evaluerTriglycerides({ triglycerides: { valeur: 900, unite: 'mg/dL' } })
);

const vigTgModereeFinale = dyslip.construireVigilancesPriseEnChargeDyslipidemie(analyseTgModereeFinale);
const vigTgTresEleveeFinale = dyslip.construireVigilancesPriseEnChargeDyslipidemie(analyseTgTresEleveeFinale);
const vigTgSevereFinale = dyslip.construireVigilancesPriseEnChargeDyslipidemie(analyseTgSevereFinale);

test(
  'PEC V1.9 : une élévation TG modérée ne crée pas artificiellement une vigilance pancréatite',
  !vigTgModereeFinale.some(item => /pancr/i.test(item.code) || /pancr/i.test(item.titre))
);

test(
  'PEC V1.9 : 500 mg/dL génère une vigilance médicale renforcée sans qualifier le risque de significatif',
  vigTgTresEleveeFinale.some(item =>
    item.code === 'tg-tres-eleves-pancreatite' &&
    item.niveau === 'haute' &&
    /440/.test(item.detail) &&
    /879/.test(item.detail)
  )
);

test(
  'PEC V1.9 : 900 mg/dL génère une vigilance sévère de risque pancréatique',
  vigTgSevereFinale.some(item =>
    item.code === 'tg-severe-pancreatite' &&
    item.niveau === 'haute' &&
    /880/.test(item.detail) &&
    /prioritaire/i.test(item.detail)
  )
);

const prioriteTgSevereFinale = dyslip
  .construirePrioritesPriseEnChargeDyslipidemie(analyseTgSevereFinale)
  .find(item => item.code === 'triglycerides');

test(
  'PEC V1.9 : la carte TG sévère devient explicitement une prise en charge prioritaire',
  Boolean(prioriteTgSevereFinale) &&
  /sévère/i.test(prioriteTgSevereFinale.titre) &&
  prioriteTgSevereFinale.constats.some(x => /pancréatite/i.test(x)) &&
  prioriteTgSevereFinale.actions.some(x => /évaluation médicale/i.test(x))
);

test(
  'PEC V1.9 : sans boisson renseignée, même des TG sévères n’inventent aucune consommation',
  prioriteTgSevereFinale.actions.some(x => /À explorer/i.test(x)) &&
  !prioriteTgSevereFinale.constats.some(x => /détectée.*anamnèse/i.test(x))
);

const analyseMixteSevereFinale = {
  ...analyseTgSevereFinale,
  ldl: {
    statut: 'hors_objectif',
    cible: { absolueMgDl: 70, reductionPourcent: 50 }
  },
  nonHdl: { statut: 'eleve', cibleMgDl: 100 },
  apoB: { statut: 'eleve', cibleMgDl: 80 }
};
const prioritesMixtesSeveresFinales = dyslip.construirePrioritesPriseEnChargeDyslipidemie(analyseMixteSevereFinale);

test(
  'PEC V1.9 : profil athérogène + TG sévères restent exactement deux axes consolidés',
  prioritesMixtesSeveresFinales.length === 2 &&
  prioritesMixtesSeveresFinales.some(item => item.code === 'profil-atherogene') &&
  prioritesMixtesSeveresFinales.some(item => item.code === 'triglycerides')
);

const analyseControleeFinale = analyseTgFinal(
  dyslip.evaluerTriglycerides({ triglycerides: { valeur: 100, unite: 'mg/dL' } })
);
const prioritesControleesFinales = dyslip.construirePrioritesPriseEnChargeDyslipidemie(analyseControleeFinale);
const vigilancesControleesFinales = dyslip.construireVigilancesPriseEnChargeDyslipidemie(analyseControleeFinale);

test(
  'PEC V1.9 : scénario final entièrement contrôlé ne génère aucune fausse priorité ni vigilance',
  prioritesControleesFinales.length === 0 &&
  vigilancesControleesFinales.length === 0
);

const tgManquantsFinal = dyslip.evaluerTriglycerides({ triglycerides: { valeur: null, unite: 'mg/dL' } });
test(
  'PEC V1.9 : TG manquants restent non évalués et ne déclenchent aucune alerte',
  tgManquantsFinal.statut === 'non_evalue' &&
  tgManquantsFinal.eleves === null &&
  tgManquantsFinal.vigilancePancreatite === false &&
  tgManquantsFinal.prioriteMedicale === false
);

const debutAnalyserFinal = dyslipSource.indexOf('function analyserDyslipidemie()');
const finAnalyserFinal = dyslipSource.indexOf('function construireLigneBiologie', debutAnalyserFinal);
const sourceAnalyserFinal = debutAnalyserFinal >= 0 && finAnalyserFinal > debutAnalyserFinal
  ? dyslipSource.slice(debutAnalyserFinal, finAnalyserFinal)
  : '';

test(
  'Nettoyage V1.9 : analyserDyslipidemie ne construit plus une ancienne liste de priorités concurrente',
  !sourceAnalyserFinal.includes('const priorites = []') &&
  !sourceAnalyserFinal.includes('priorites.sort') &&
  !sourceAnalyserFinal.includes('priorites\\n')
);

test(
  'Analyse V1.9 : le rendu distingue élévation, zone très élevée et hypertriglycéridémie sévère',
  dyslipSource.includes('Triglycérides très élevés — vigilance pancréatique') &&
  dyslipSource.includes('Hypertriglycéridémie sévère — priorité médicale') &&
  dyslipSource.includes('880 mg/dL') &&
  dyslipSource.includes('440 et 879 mg/dL')
);

console.log(`\n${ok} réussis / ${ko} échecs / ${ok + ko} total`);
if (ko > 0) process.exit(1);
