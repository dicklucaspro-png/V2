const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'JS');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const denut = fs.readFileSync(path.join(root, 'denut.js'), 'utf8');
const diabete = fs.readFileSync(path.join(root, 'diabete.js'), 'utf8');
const hta = fs.readFileSync(path.join(root, 'hta.js'), 'utf8');
const obesite = fs.readFileSync(path.join(root, 'obesite.js'), 'utf8');

let ok=0, ko=0;
function test(n,fn){try{fn();console.log('✓',n);ok++;}catch(e){console.error('✗',n,'-',e.message);ko++;}}
function assert(c,m){if(!c)throw new Error(m);}

// 1-4 : API centrale
test('registre central des modules pathologiques présent',()=>assert(script.includes('const modulesPathologiques = new Map()'),'registre absent'));
test('fonction centrale analyses présente',()=>assert(script.includes('function rafraichirAnalysesPathologiques()'),'fonction absente'));
test('fonction centrale prises en charge présente',()=>assert(script.includes('function rafraichirPrisesEnChargePathologiques()'),'fonction absente'));
test('ouvrirOnglet utilise les deux rendus centraux',()=>{
  assert(script.includes('rafraichirAnalysesPathologiques();'),'analyse non centralisée');
  assert(script.includes('rafraichirPrisesEnChargePathologiques();'),'PEC non centralisée');
});

// 5-8 : chaque module se déclare au même orchestrateur
test('dénutrition enregistrée',()=>assert(denut.includes('id: "denutrition"') && denut.includes('enregistrerModulePathologique'),'non enregistrée'));
test('diabète enregistré',()=>assert(diabete.includes('id: "diabete"') && diabete.includes('enregistrerModulePathologique'),'non enregistré'));
test('HTA enregistrée',()=>assert(hta.includes('id: "hta"') && hta.includes('enregistrerModulePathologique'),'non enregistrée'));
test('obésité enregistrée',()=>assert(obesite.includes('id: "obesite"') && obesite.includes('enregistrerModulePathologique'),'non enregistrée'));

// 9-11 : anciens réveils de rendu supprimés
test('ancien listener clic Diabète supprimé',()=>assert(!diabete.includes("closest('.nav-tab[onclick*=\"pathologies\"]')"),'listener clic encore présent'));
test('ancien listener clic HTA supprimé',()=>assert(!hta.includes("closest('.nav-tab[onclick*=\"pathologies\"]')"),'listener clic encore présent'));
test('anciens listeners anamnèse Dénutrition supprimés',()=>{
  const tail = denut.slice(denut.lastIndexOf('function afficherPriseEnChargeDenutrition'));
  assert(!/closest\?\.\("#anamnese"\)/.test(tail),'listener anamnèse direct encore présent');
});

// 12-14 : pas de rafraîchissement clinique direct dans les synchroniseurs locaux
test('actualiserEtatNutritionnel ne rend plus Analyse/PEC directement',()=>{
  const m=denut.match(/function actualiserEtatNutritionnel\(\) \{([\s\S]*?)\n\}/);
  assert(m,'fonction absente');
  assert(!m[1].includes('afficherAnalyseDenutrition'),'analyse directe');
  assert(!m[1].includes('afficherPriseEnChargeDenutrition'),'PEC directe');
});
test('actualiserObesite délègue les sorties à l’orchestrateur',()=>{
  const m=obesite.match(/function actualiserObesite\(\) \{([\s\S]*?)\n  \}/);
  assert(m,'fonction absente');
  assert(m[1].includes('rafraichirSortiesPathologiques'),'délégation absente');
  assert(!m[1].includes('afficherAnalyseObesite()'),'analyse directe');
  assert(!m[1].includes('afficherPriseEnChargeObesite()'),'PEC directe');
});
test('orchestrateur écoute input et change en un point central',()=>{
  const section=script.slice(script.indexOf('//! ORCHESTRATEUR CENTRAL'),script.indexOf('//! NAVIGATION ENTRE LES ONGLETS'));
  assert(section.includes('document.addEventListener("input"'),'input absent');
  assert(section.includes('document.addEventListener("change"'),'change absent');
});

// 15-16 : toute anamnèse est un déclencheur transversal et les erreurs d'un module sont isolées
test('toute saisie clinique du workspace est transversale',()=>assert(script.includes('cible.closest?.(".workspace")'),'workspace non reconnu'));
test('une erreur de rendu module est isolée',()=>assert(script.includes('try {\n      rendu();') && script.includes('Échec du rendu ${type}'),'isolation absente'));

console.log(`\n${ok}/${ok+ko} tests réussis`);
process.exitCode = ko ? 1 : 0;
