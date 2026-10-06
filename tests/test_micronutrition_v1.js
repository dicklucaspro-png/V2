const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const synthese = fs.readFileSync(path.join(root, 'JS', 'synthese.js'), 'utf8');
const biologieSource = fs.readFileSync(path.join(root, 'JS', 'biologie.js'), 'utf8');
const diabete = fs.readFileSync(path.join(root, 'JS', 'diabete.js'), 'utf8');
const obesite = fs.readFileSync(path.join(root, 'JS', 'obesite.js'), 'utf8');
const hta = fs.readFileSync(path.join(root, 'JS', 'hta.js'), 'utf8');
const denut = fs.readFileSync(path.join(root, 'JS', 'denut.js'), 'utf8');
const dyslip = fs.readFileSync(path.join(root, 'JS', 'dyslipidemie.js'), 'utf8');
const script = fs.readFileSync(path.join(root, 'JS', 'script.js'), 'utf8');

const {
  DEFINITIONS_MICRONUTRIMENTS,
  parserReferenceLaboratoire,
  interpreterBiologieMicronutriment,
  construireHTMLAnalyseMicronutritionnelle,
  construirePriseEnChargeMicronutritionnelle
} = require(path.join(root, 'JS', 'micronutrition.js'));

const { PARAMETRES_BIOLOGIQUES } = require(path.join(root, 'JS', 'biologie.js'));

let ok = 0;
let ko = 0;
function test(nom, condition) {
  if (condition) { ok++; console.log(`PASS — ${nom}`); }
  else { ko++; console.error(`FAIL — ${nom}`); }
}

const nouveauxIds = [
  'bioCalcium', 'bioMagnesium', 'bioPhosphore', 'bioZinc',
  'bioVitamineB1', 'bioVitamineB9', 'bioVitamineB12'
];

test('Biologie centrale contient les nouveaux micronutriments prioritaires',
  nouveauxIds.every(id => html.includes(`id="${id}"`))
);

test('Le moteur micronutritionnel est chargé après Biologie et avant les modules pathologiques',
  html.indexOf('JS/biologie.js') < html.indexOf('JS/micronutrition.js') &&
  html.indexOf('JS/micronutrition.js') < html.indexOf('JS/diabete.js')
);

test('SynthesePatient centralise minéraux et vitamines micronutritionnelles',
  synthese.includes('mineraux: {') &&
  synthese.includes('vitamineB1,') && synthese.includes('vitamineB9,') && synthese.includes('vitamineB12,') &&
  synthese.includes('magnesium,') && synthese.includes('phosphore,') && synthese.includes('zinc')
);

test('Le registre de biologie connaît tous les nouveaux paramètres',
  nouveauxIds.every(id => Boolean(PARAMETRES_BIOLOGIQUES[id]))
);

test('Le moteur micronutritionnel relie B12 à anamnèse et biologie',
  DEFINITIONS_MICRONUTRIMENTS.vitamineB12?.anamneseKey === 'vitB12' &&
  DEFINITIONS_MICRONUTRIMENTS.vitamineB12?.biologiePath?.join('.') === 'vitamines.vitamineB12'
);

const plage = parserReferenceLaboratoire('200 - 900 pg/mL');
const minimum = parserReferenceLaboratoire('>= 3,5 mmol/L');
const maximum = parserReferenceLaboratoire('< 5.1 mmol/L');

test('Les références laboratoire en plage sont interprétées', plage.type === 'plage' && plage.min === 200 && plage.max === 900);
test('Les références laboratoire avec seuil minimal sont interprétées', minimum.type === 'minimum' && minimum.min === 3.5);
test('Les références laboratoire avec seuil maximal sont interprétées', maximum.type === 'maximum' && maximum.max === 5.1);

test('Une valeur sous la référence est classée basse sans seuil universel codé en dur',
  interpreterBiologieMicronutriment({ valeur: 150, referenceLaboratoire: '200-900' }).statut === 'bas'
);

test('Une valeur sans référence laboratoire reste non interprétable',
  interpreterBiologieMicronutriment({ valeur: 150, referenceLaboratoire: '' }).statut === 'renseigne_non_interpretable'
);

test('Architecture V1.2 : le moteur sépare Analyse et Prise en charge micronutritionnelles',
  typeof construireHTMLAnalyseMicronutritionnelle === 'function' &&
  typeof construirePriseEnChargeMicronutritionnelle === 'function'
);



test('Architecture audit : Micronutrition consomme SynthesePatient.anamnese sans lire anmRows directement',
  !fs.readFileSync(path.join(root, 'JS', 'micronutrition.js'), 'utf8').includes('anmRows') &&
  fs.readFileSync(path.join(root, 'JS', 'micronutrition.js'), 'utf8').includes('dossier?.anamnese?.apports') &&
  fs.readFileSync(path.join(root, 'JS', 'micronutrition.js'), 'utf8').includes('dossier?.anamnese?.aliments')
);

test('Architecture V1.2 : les principaux contributeurs sont intégrés à Analyse',
  fs.readFileSync(path.join(root, 'JS', 'micronutrition.js'), 'utf8').includes('Principaux contributeurs :') &&
  fs.readFileSync(path.join(root, 'JS', 'micronutrition.js'), 'utf8').includes('Analyse micronutritionnelle')
);

test('Architecture V1.2 : les modules cliniques n’utilisent plus l’ancien message détaillé en Prise en charge',
  ![diabete, obesite, hta, denut].some(source => source.includes('construireMessageMicronutritionnel('))
);

test('Diabète V1.2.1 : la metformine seule ou en association déclenche l’analyse B12',
  diabete.includes('function traitementInclutMetformineDiabete') &&
  diabete.includes('traitementInclutMetformineDiabete(analyse)') &&
  diabete.includes('construireHTMLAnalyseMicronutritionnelle') &&
  diabete.includes('["vitamineB12"]')
);

test('Diabète V1.2 : la Prise en charge B12 ne garde que lien clinique et action',
  diabete.includes('construirePriseEnChargeMicronutritionnelle') &&
  diabete.includes('Lien avec le diabète / traitement') &&
  diabete.includes('Action :')
);

test('Obésité : un contexte bariatrique est désormais structuré dans le dossier',
  html.includes('id="obesiteChirurgieBariatrique"') &&
  synthese.includes('chirurgieBariatrique: valeurSynthese("obesiteChirurgieBariatrique")') &&
  obesite.includes('function construireMicronutritionObesite')
);

test('Obésité V1.2 : hors chirurgie, l’analyse micronutritionnelle ne devient pas un dosage systématique',
  obesite.includes("l'obésité seule ne transforme pas ces données en indication de dosage ou de supplémentation") ||
  obesite.includes("L'obésité seule n'est pas une indication de dosage systématique")
);

test('Obésité post-bariatrique : B1, B12, B9, D, fer, calcium, zinc, magnésium et phosphore sont couverts',
  ['vitamineB1','vitamineB12','vitamineB9','vitamineD','fer','calcium','zinc','magnesium','phosphore']
    .every(code => obesite.includes(`"${code}"`))
);

test('Obésité V1.2 : les contributeurs restent dans Analyse et la PEC affiche lien + action',
  obesite.includes('construireHTMLAnalyseMicronutritionnelle') &&
  obesite.includes("Lien avec l'obésité / le contexte") &&
  obesite.includes('Action :')
);

test('HTA V1.2 : calcium et magnésium sont comparés aux repères dans Analyse sans dupliquer sodium/potassium',
  hta.includes('construireHTMLAnalyseMicronutritionnelle') &&
  hta.includes('["magnesium", "calcium"]') &&
  hta.includes('Sodium et potassium restent analysés dans le bloc principal')
);

test('HTA V1.2 : la Prise en charge calcium/magnésium est structurée en lien clinique + action',
  hta.includes('construirePriseEnChargeMicronutritionnelle') &&
  hta.includes("Lien avec l'HTA") &&
  hta.includes('Action :')
);

test('Dénutrition : K, Mg et phosphate bas peuvent renforcer le risque de renutrition',
  denut.includes('Potassium plasmatique sous la référence du laboratoire') &&
  denut.includes('Magnésium sous la référence du laboratoire') &&
  denut.includes('Phosphate sous la référence du laboratoire')
);

test('Dénutrition V1.2 : B1, B12, B9, fer, D, zinc, calcium, magnésium, phosphate et potassium sont comparés dans Analyse',
  denut.includes('Micronutriments — apports, repères et biologie') &&
  ['vitamineB1','vitamineB12','vitamineB9','fer','vitamineD','zinc','calcium','magnesium','phosphore','potassium']
    .every(code => denut.includes(`"${code}"`))
);

test('Dénutrition V1.2 : la sécurité de renutrition est formulée en lien clinique + action',
  denut.includes('titre: "Sécurité de renutrition"') &&
  denut.includes('Lien avec la dénutrition') &&
  denut.includes('Action :')
);

test('Dénutrition : les modifications GLIM de la version utilisateur sont conservées',
  denut.includes('function evaluerDenutritionGLIM(donneesEntree = null)') &&
  denut.includes('function comparerHASGLIM(') &&
  denut.includes('Évaluation GLIM')
);


test('V1.3 : les repères micronutritionnels sont contextualisés par module pathologique',
  script.includes('function getRecommandationsBesoinsPatient(options = {})') &&
  script.includes('const appliquerAdaptationObesite') &&
  diabete.includes('contextePathologique: "diabete"') &&
  obesite.includes('contextePathologique: "obesite"') &&
  hta.includes('contextePathologique: "hta"') &&
  denut.includes('contextePathologique: "denutrition"')
);

test('V1.3 : un module non obésité ne doit pas hériter automatiquement des repères BASO',
  script.includes('appliquerAdaptationObesite &&') &&
  fs.readFileSync(path.join(root, 'JS', 'micronutrition.js'), 'utf8').includes('contextePathologique: options.contextePathologique ?? null')
);

test('Obésité V1.3 : les conversions g/j du tableau suivent les plages BASO',
  script.includes('Math.round(objectifEnergetique * 0.15 / 4)} – ${Math.round(objectifEnergetique * 0.25 / 4)} g/j') &&
  script.includes('Math.round(objectifEnergetique * 0.50 / 4)} – ${Math.round(objectifEnergetique * 0.55 / 4)} g/j') &&
  script.includes('Math.round(objectifEnergetique * 0.20 / 9)} – ${Math.round(objectifEnergetique * 0.30 / 9)} g/j')
);

test('Dyslipidémie : aucun micronutriment artificiel n’est transformé en cible spécifique',
  !dyslip.includes('construireMicronutritionDyslipidemie')
);

test('Dyslipidémie : la PEC ne duplique plus le détail des constats déjà visible dans Analyse',
  !dyslip.includes("Constats issus de l'analyse") &&
  dyslip.includes('Déclencheur :')
);

console.log(`\n${ok} réussis / ${ko} échecs / ${ok + ko} total`);
if (ko > 0) process.exit(1);
