const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'JS', 'script.js'), 'utf8');
const hta = fs.readFileSync(path.join(root, 'JS', 'hta.js'), 'utf8');
const micro = fs.readFileSync(path.join(root, 'JS', 'micronutrition.js'), 'utf8');
const obesite = fs.readFileSync(path.join(root, 'JS', 'obesite.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'modules.css'), 'utf8');

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

test('les icônes qualité sont focusables', () => {
  for (const source of [script, hta, micro, obesite]) {
    assert(source.includes('analysis-quality-icon'));
    assert(source.includes('tabindex="0"'));
  }
});

test('les icônes exposent le texte de l’infobulle', () => {
  assert(script.includes('data-tooltip="${explication}"'));
  assert(hta.includes('data-tooltip='));
  assert(micro.includes('data-tooltip='));
});

test('une vraie infobulle NutriFlow est créée', () => {
  assert(script.includes('function obtenirInfoBulleQualiteComposition()'));
  assert(script.includes('analysisQualityTooltip'));
  assert(script.includes('role", "tooltip"'));
});

test('le survol et le focus affichent l’infobulle', () => {
  assert(script.includes('document.addEventListener("pointerover"'));
  assert(script.includes('document.addEventListener("focusin"'));
  assert(script.includes('afficherInfoBulleQualiteComposition(icone)'));
});

test('la sortie, le focusout et Escape peuvent masquer l’infobulle', () => {
  assert(script.includes('document.addEventListener("pointerout"'));
  assert(script.includes('document.addEventListener("focusout"'));
  assert(script.includes('masquerInfoBulleQualiteComposition();'));
});

test('l’infobulle est positionnée dans le viewport', () => {
  assert(script.includes('function positionnerInfoBulleQualiteComposition'));
  assert(script.includes('getBoundingClientRect()'));
  assert(script.includes('document.documentElement.clientWidth'));
});

test('le CSS de l’infobulle est présent et au-dessus des autres couches', () => {
  assert(css.includes('.analysis-quality-tooltip'));
  assert(css.includes('z-index: 2147483647'));
  assert(css.includes('.analysis-quality-icon:focus-visible'));
});

let passed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    passed += 1;
    console.log(`PASS — ${name}`);
  } catch (error) {
    console.error(`FAIL — ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

console.log(`\nInfobulle qualité : ${passed}/${tests.length} tests réussis.`);
if (passed !== tests.length) process.exit(1);
