const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'JS', 'script.js'), 'utf8');

const debut = script.indexOf('function analyserStatutApport(');
const fin = script.indexOf('\nfunction renderRecommandationsNutritionnelles', debut);
if (debut < 0 || fin < 0) throw new Error('analyserStatutApport introuvable');

const ctx = { Number, Math };
vm.createContext(ctx);
vm.runInContext(script.slice(debut, fin), ctx);

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const verifier = (resultat, label, classe, certitude = null) => {
  assert.strictEqual(resultat.label, label);
  assert.strictEqual(resultat.classe, classe);
  if (certitude !== null) assert.strictEqual(resultat.certitude, certitude);
};

// Dix profils de journée verrouillent le comportement fonctionnel du moteur
// Apports/Besoins. Ils couvrent les sorties réellement attendues après validation
// de l'anamnèse : Sous le repère, Repère atteint, Au-dessus du repère/AMT et À préciser.

test('J1 — journée complète : apport minimal sous le repère = Sous le repère', () => {
  verifier(
    ctx.analyserStatutApport(800, { type: 'min', min: 950 }, { partiel: false }),
    'Sous le repère', 'insuffisant', 'complete'
  );
});

test('J2 — apport très faible bien documenté : règle 20 % / 90 %', () => {
  verifier(
    ctx.analyserStatutApport(95, { type: 'min', min: 950 }, {
      partiel: true,
      qualite: { couverturePoids: 0.96, intervalleDisponible: false }
    }),
    'Sous le repère', 'insuffisant', 'apport_tres_faible_couverture_elevee'
  );
});

test('J3 — même apport avec couverture faible : reste À préciser', () => {
  verifier(
    ctx.analyserStatutApport(95, { type: 'min', min: 950 }, {
      partiel: true,
      qualite: { couverturePoids: 0.45, intervalleDisponible: false }
    }),
    'À préciser', 'non-evalue', 'minimum_connu_inferieur'
  );
});

test('J4 — borne haute plausible sous le repère : preuve prioritaire', () => {
  verifier(
    ctx.analyserStatutApport(700, { type: 'min', min: 950 }, {
      partiel: true,
      qualite: {
        couverturePoids: 0.82,
        borneBasse: 700,
        valeurEstimee: 760,
        borneHaute: 880,
        intervalleDisponible: true
      }
    }),
    'Sous le repère', 'insuffisant', 'intervalle_plausible'
  );
});

test('J5 — estimation centrale atteint le minimum malgré intervalle traversant', () => {
  verifier(
    ctx.analyserStatutApport(900, { type: 'min', min: 950 }, {
      partiel: true,
      qualite: {
        couverturePoids: 0.80,
        borneBasse: 900,
        valeurEstimee: 970,
        borneHaute: 1050,
        intervalleDisponible: true
      }
    }),
    'Repère atteint', 'adequat', 'estimation_repere_atteint'
  );
});

test('J6 — sodium/sel déjà au-dessus d’un maximum : dépassement certain', () => {
  verifier(
    ctx.analyserStatutApport(4259, { type: 'max', max: 2000 }, {
      partiel: true,
      qualite: { couverturePoids: 0.91, intervalleDisponible: false }
    }),
    'Au-dessus du repère', 'eleve', 'depassement_certain'
  );
});

test('J7 — maximum : estimation centrale sous le seuil malgré borne haute au-dessus', () => {
  verifier(
    ctx.analyserStatutApport(1700, { type: 'max', max: 2000 }, {
      partiel: true,
      qualite: {
        couverturePoids: 0.78,
        borneBasse: 1700,
        valeurEstimee: 1900,
        borneHaute: 2250,
        intervalleDisponible: true
      }
    }),
    'Repère atteint', 'adequat', 'estimation_dans_repere'
  );
});

test('J8 — plage : estimation centrale dans le repère malgré incertitude résiduelle', () => {
  verifier(
    ctx.analyserStatutApport(500, { type: 'range', min: 600, max: 2000 }, {
      partiel: true,
      qualite: {
        couverturePoids: 0.76,
        borneBasse: 500,
        valeurEstimee: 1500,
        borneHaute: 2300,
        intervalleDisponible: true
      }
    }),
    'Repère atteint', 'adequat', 'estimation_dans_plage'
  );
});

test('J9 — recommandation avec AMT : incertitude qui peut franchir l’AMT = À préciser', () => {
  verifier(
    ctx.analyserStatutApport(40, { type: 'recommended', min: 10, recommendedMax: 15, upperLimit: 50 }, {
      partiel: true,
      qualite: {
        couverturePoids: 0.85,
        borneBasse: 40,
        valeurEstimee: 55,
        borneHaute: 65,
        intervalleDisponible: true
      }
    }),
    'À préciser', 'non-evalue', 'intervalle_traverse_seuil'
  );
});

test('J10 — objectif exact : estimation centrale dans la tolérance ±5 % = Repère atteint', () => {
  verifier(
    ctx.analyserStatutApport(1700, { type: 'exact', min: 2000, max: 2000 }, {
      partiel: true,
      qualite: {
        couverturePoids: 0.86,
        borneBasse: 1700,
        valeurEstimee: 1980,
        borneHaute: 2200,
        intervalleDisponible: true
      }
    }),
    'Repère atteint', 'adequat', 'estimation_repere_atteint'
  );
});

// Garde-fous spécifiques du type exact, auparavant non couvert par l'intervalle.
test('exact — borne haute entièrement sous -5 % = Sous le repère', () => {
  verifier(
    ctx.analyserStatutApport(1500, { type: 'exact', min: 2000 }, {
      partiel: true,
      qualite: { borneBasse: 1500, valeurEstimee: 1700, borneHaute: 1850, intervalleDisponible: true }
    }),
    'Sous le repère', 'insuffisant', 'intervalle_plausible'
  );
});

test('exact — borne basse entièrement au-dessus de +5 % = Au-dessus du repère', () => {
  verifier(
    ctx.analyserStatutApport(2150, { type: 'exact', min: 2000 }, {
      partiel: true,
      qualite: { borneBasse: 2150, valeurEstimee: 2200, borneHaute: 2300, intervalleDisponible: true }
    }),
    'Au-dessus du repère', 'eleve', 'intervalle_plausible'
  );
});

test('exact — estimation hors tolérance et intervalle traversant = À préciser', () => {
  verifier(
    ctx.analyserStatutApport(1750, { type: 'exact', min: 2000 }, {
      partiel: true,
      qualite: { borneBasse: 1750, valeurEstimee: 1850, borneHaute: 2050, intervalleDisponible: true }
    }),
    'À préciser', 'non-evalue', 'intervalle_traverse_seuil'
  );
});

test('contrat UI — les statuts bas utilisent Sous le repère et non Insuffisant', () => {
  const bloc = script.slice(debut, fin);
  assert(!bloc.includes('label: "Insuffisant"'));
  assert(script.includes('<span>sous le repère</span>'));
});

test('contrat UI — les dépassements utilisent Au-dessus du repère et non Élevé', () => {
  const bloc = script.slice(debut, fin);
  assert(!bloc.includes('label: "Élevé"'));
  assert.strictEqual(
    ctx.analyserStatutApport(2500, { type: 'max', max: 2000 }, { partiel: false }).label,
    'Au-dessus du repère'
  );
  assert(script.includes('<span>au-dessus du repère</span>'));
});

test('contrat sécurité — le rendu refuse toujours une anamnèse non validée', () => {
  const debutRender = script.indexOf('function renderRecommandationsNutritionnelles');
  const finRender = script.indexOf('\nfunction anmConstruireDetailNutritionnel', debutRender);
  const bloc = script.slice(debutRender, finRender);
  assert(bloc.includes('anamneseValideePourAnalyse !== true'));
  assert(bloc.includes('Anamnèse à valider'));
});


test('contrat source unique — Analyse reprend l’objectif énergétique central de Calculs', () => {
  assert(script.includes('const objectif = objectifsNutritionnels?.energie?.objectif ?? null;'));
  assert(script.includes('const proteinesCible = objectifsNutritionnels?.proteines?.objectif ?? proteinesSelonRepartition;'));
});

test('contrat composition — Analyse utilise le moteur qualité commun de l’anamnèse', () => {
  const debutRender = script.indexOf('function renderRecommandationsNutritionnelles');
  const finRender = script.indexOf('\nfunction anmConstruireDetailNutritionnel', debutRender);
  const bloc = script.slice(debutRender, finRender);
  assert(bloc.includes('const qualite = anmConstruireQualiteApport(bilan, key);'));
  assert(bloc.includes('qualite: apport.qualite'));
});

test('contrat nutriments — B8 et trans ne sont pas classés automatiquement dans le tableau', () => {
  const debutRender = script.indexOf('function renderRecommandationsNutritionnelles');
  const finRender = script.indexOf('\nfunction anmConstruireDetailNutritionnel', debutRender);
  const bloc = script.slice(debutRender, finRender);
  const debutDefinitions = bloc.indexOf('const definitions = [');
  const finDefinitions = bloc.indexOf('];', debutDefinitions);
  const definitions = bloc.slice(debutDefinitions, finDefinitions);
  assert(!definitions.includes('vitB8'));
  assert(!definitions.includes('trans'));
});

let ok = 0;
for (const t of tests) {
  try {
    t.fn();
    ok++;
    console.log(`PASS — ${t.name}`);
  } catch (e) {
    console.error(`FAIL — ${t.name}`);
    console.error(e.stack || e);
  }
}

console.log(`\n${ok}/${tests.length} tests réussis`);
if (ok !== tests.length) process.exit(1);
