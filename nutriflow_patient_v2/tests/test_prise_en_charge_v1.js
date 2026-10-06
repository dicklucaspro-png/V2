const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'JS', name), 'utf8');
const diabete = read('diabete.js');
const hta = read('hta.js');
const obesite = read('obesite.js');
const denut = read('denut.js');
const dyslip = read('dyslipidemie.js');
const micronutrition = read('micronutrition.js');

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('PEC : les modules principaux affichent explicitement objectif, actions et suivi', () => {
  for (const source of [diabete, hta, obesite, denut, dyslip]) {
    assert(/Objectif proposé|Objectifs proposés|Objectifs nutritionnels de travail/.test(source));
    assert(/Actions proposées|Actions proposées|Agir sur les causes identifiées/.test(source));
    assert(/Suivi/.test(source));
  }
});

test('Diabète : les axes descriptifs ou favorables ne sont plus promus automatiquement en priorités', () => {
  assert(diabete.includes('["haute", "moyenne"].includes(axe.niveau)'));
  assert(!diabete.includes('axe.niveau === "favorable"\n                            ? "faible"'));
});

test('Diabète : une boisson sucrée isolée doit être documentée avant de devenir une priorité', () => {
  assert(diabete.includes('consommationReguliere ? "moyenne" : "information"'));
  assert(diabete.includes('avant de décider si cet axe doit devenir une priorité'));
});

test('HTA : une consommation ≤2 verres/j n’est pas transformée automatiquement en priorité', () => {
  assert(hta.includes('if (Number.isFinite(alcool) && alcool > 2)'));
  assert(hta.includes('à documenter, sans devenir automatiquement une priorité'));
});

test('Obésité : la PEC ne crée plus une fausse priorité de maintien quand aucun problème n’est identifié', () => {
  assert(!obesite.includes('Maintien des habitudes favorables'));
  assert(obesite.includes("Aucune priorité spécifique n'est générée"));
});

test('Obésité : les chiffres énergétiques restent dans Calculs au lieu d’être répétés comme actions', () => {
  const pec = obesite.slice(obesite.indexOf('function priorites(analyse)'), obesite.indexOf('function afficherAnalyseObesite'));
  assert(pec.includes("Utiliser l'objectif énergétique validé dans Calculs nutritionnels"));
  assert(!pec.includes('`Besoins estimés : ${Math.round(calculs.besoinsEnergetiques)} kcal/j.`'));
  assert(!pec.includes('`Repère BASO : ${calculs.plageBasoBasse}'));
});

test('Dénutrition : la PEC lit le diagnostic et les données brutes depuis SynthesePatient', () => {
  const pec = denut.slice(denut.indexOf('function afficherPriseEnChargeDenutrition'), denut.indexOf('window.enregistrerModulePathologique'));
  assert(pec.includes('synthese?.etatNutritionnel?.has'));
  assert(pec.includes('synthese?.etatNutritionnel?.donneesDenutrition'));
  assert(!pec.includes('document.getElementById("denutReductionApports")'));
  assert(!pec.includes('document.getElementById("denutMalabsorption")'));
});

test('Dénutrition : un minimum CIQUAL partiel sous la cible ne déclenche pas un enrichissement ciblé', () => {
  assert(denut.includes('energieComplete &&'));
  assert(denut.includes('proteinesCompletes &&'));
  assert(denut.includes("La composition disponible ne permet pas encore de confirmer un apport inférieur à l'objectif"));
  assert(denut.includes('les données disponibles ne suffisent pas encore à identifier une prise prioritaire'));
});

test('Dyslipidémie : la PEC conserve la traçabilité sans répéter toute la liste des constats', () => {
  assert(!dyslip.includes("Constats issus de l'analyse"));
  assert(dyslip.includes('Déclencheur :'));
});

test('Micronutrition : une donnée partielle basse reste non évaluée et ne génère pas une action d’insuffisance', () => {
  assert(micronutrition.includes('qualite: apport?.qualite ?? null'));
  assert(micronutrition.includes('intervalleDisponible'));
  assert(micronutrition.includes('else if (alimentation.statut === "insuffisant")'));
});

test('PEC : les traitements ne sont jamais modifiés automatiquement par les modules audités', () => {
  assert(/ne calcule pas de dose|ne modifie pas le traitement/i.test(diabete));
  assert(/NutriFlow ne propose aucune modification du traitement/i.test(hta));
  assert(/sans modifier le traitement/i.test(obesite));
  assert(/ne propose aucune initiation, substitution ni adaptation de dose/i.test(dyslip));
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
if (ok !== tests.length) process.exit(1);
