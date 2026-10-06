const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'JS', 'script.js'), 'utf8');
const patientExperience = fs.readFileSync(path.join(root, 'JS', 'patient-experience.js'), 'utf8');
const components = fs.readFileSync(path.join(root, 'css', 'components.css'), 'utf8');
const responsive = fs.readFileSync(path.join(root, 'css', 'responsives.css'), 'utf8');

const tests = [];
const test = (nom, fn) => tests.push({ nom, fn });

test('la navigation principale expose un tablist', () => {
  assert(/class="main-nav"[^>]*role="tablist"/.test(html));
});

test('les 9 onglets exposent role=tab, aria-controls et aria-selected', () => {
  const ids = ['patient','calculs','anamnese','plan','pathologies','recettes','aliments','suivi','documents'];
  for (const id of ids) {
    assert(new RegExp(`id="tab-${id}"[^>]*role="tab"[^>]*aria-controls="${id}"[^>]*aria-selected="(?:true|false)"`).test(html), id);
    assert(new RegExp(`id="${id}"[^>]*class="tab-content(?: active)?"[^>]*role="tabpanel"[^>]*aria-labelledby="tab-${id}"`).test(html), `panel ${id}`);
  }
});

test('ouvrirOnglet synchronise aria-selected avec l’état visuel', () => {
  assert(script.includes('btn.setAttribute("aria-selected", "false")'));
  assert(script.includes('bouton.setAttribute("aria-selected", "true")'));
});

test('les contrôles cliniques auparavant sans nom accessible en ont un', () => {
  const ids = ['diabeteType','diabeteHba1c','diabeteGlycemie','htaNatriurese24h','htaAlcoolVerresJour','obesitePoidsForme','obesiteEoss','traitements'];
  for (const id of ids) {
    assert(new RegExp(`<(?:input|select|textarea)[^>]*id="${id}"[^>]*aria-label="[^"]+"`, 's').test(html), id);
  }
});

test('la recherche patient possède un nom accessible', () => {
  assert(/id="recherchePatient"[^>]*aria-label="Rechercher un patient"/s.test(html));
});

test('le bouton mobile expose l’état de la sidebar', () => {
  assert(/class="mobile-sidebar-toggle"[^>]*aria-controls="patientsSidebar"[^>]*aria-expanded="false"/s.test(html));
  assert(script.includes('bouton?.setAttribute("aria-expanded", String(estOuverte))'));
});

test('le menu Paramètres expose son état aux technologies d’assistance', () => {
  assert(/class="settings-button"[^>]*aria-controls="settingsMenu"[^>]*aria-expanded="false"/s.test(html));
  assert(/id="settingsMenu"[^>]*aria-hidden="true"/s.test(html));
  assert(script.includes('function definirEtatMenuParametres(ouvert)'));
});

test('l’interface patient ne contient plus le titre anglais Overview', () => {
  assert(!patientExperience.includes('<h2>Overview</h2>'));
  assert(patientExperience.includes('<h2>Vue d’ensemble</h2>'));
});

test('l’export PDF utilise le branding NutriFlow', () => {
  assert(!script.includes('DIET-ASSIST'));
  assert(!script.includes('Diet-Assist'));
  assert(script.includes('<h1>NutriFlow</h1>'));
  assert(script.includes('enregistrés dans NutriFlow.'));
});

test('l’indicateur actif des onglets est ancré sur le bouton', () => {
  const bloc = components.slice(components.indexOf('.nav-tab {'), components.indexOf('.nav-tab:hover'));
  assert(bloc.includes('position: relative;'));
});

test('la grille mobile des détails nutritionnels utilise une valeur CSS valide', () => {
  assert(!/grid-template-columns:\s*fr\s*;/.test(responsive));
  assert(/\.anm-full-totals\s*\{[^}]*grid-template-columns:\s*1fr\s*;/s.test(responsive));
});

let passed = 0;
for (const { nom, fn } of tests) {
  try {
    fn();
    passed += 1;
    console.log(`PASS — ${nom}`);
  } catch (e) {
    console.error(`FAIL — ${nom}`);
    console.error(e.stack || e.message);
  }
}

console.log(`\n${passed}/${tests.length} tests réussis`);
process.exit(passed === tests.length ? 0 : 1);
