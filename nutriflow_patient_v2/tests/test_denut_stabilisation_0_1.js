const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach(n => this.values.add(n)); }
  remove(...names) { names.forEach(n => this.values.delete(n)); }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor({ value = "", checked = false } = {}) {
    this.value = value;
    this.checked = checked;
    this.hidden = false;
    this.disabled = false;
    this.textContent = "";
    this.innerHTML = "";
    this.className = "";
    this.classList = new FakeClassList();
    this.attributes = {};
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener() {}
}

const elements = new Map();
const documentStub = {
  getElementById(id) { return elements.get(id) || null; },
  addEventListener() {},
  createElement() { return new FakeElement(); }
};

const context = {
  console,
  document: documentStub,
  window: { setTimeout(fn) { fn(); } },
  setTimeout(fn) { fn(); },
  clearTimeout() {},
  Number,
  Math,
  Array,
  Object,
  String,
  Boolean,
  Date
};
vm.createContext(context);
const denutPath = path.join(__dirname, "..", "JS", "denut.js");
vm.runInContext(fs.readFileSync(denutPath, "utf8"), context);

function set(id, props = {}) {
  const el = new FakeElement(props);
  elements.set(id, el);
  return el;
}

function resetBase() {
  elements.clear();
  set("age");
  set("poids");
  set("taille");
  set("denutPoidsHabituel");
  set("denutPoids1Mois");
  set("denutPoids6Mois");
  set("denutReductionApports");
  set("denutDureeReduction");
  set("denutMalabsorption", { checked: false });
  set("denutAgression", { checked: false });
  set("denutMasseMusculaire", { checked: false });
  set("denutSarcopenieConfirmee", { checked: false });
  set("denutAlbumine");
  set("denutAlerte");
  set("denutHASBadge");
  set("denutHASDetails");
  set("denutEvaluationApprofondie");
  set("denutScreeningType");
  set("denutScreeningTitle");
  set("denutScreeningText");
  set("denutEvaluationToggle");
  set("mnaApports");
  set("mnaPertePoids");
  set("mnaMotricite");
  set("mnaMaladieAigue");
  set("mnaNeuro");
  set("mnaMollet");
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test("HAS incomplet sans critère ne produit jamais 'Aucun critère'", () => {
  resetBase();
  elements.get("age").value = "45";
  elements.get("poids").value = "70";
  elements.get("taille").value = "175";
  context.afficherEvaluationNutritionnelleHAS();
  assert.strictEqual(elements.get("denutHASBadge").textContent, "Incomplet");
  assert.ok(elements.get("denutAlerte").innerHTML.includes("Évaluation HAS incomplète"));
  assert.ok(!elements.get("denutAlerte").innerHTML.includes("Aucun critère de dénutrition identifié"));
});

test("HAS complet sans critère peut conclure 'Aucun critère'", () => {
  resetBase();
  elements.get("age").value = "45";
  elements.get("poids").value = "70";
  elements.get("taille").value = "175";
  elements.get("denutPoidsHabituel").value = "70";
  elements.get("denutReductionApports").value = "aucune";
  context.afficherEvaluationNutritionnelleHAS();
  assert.strictEqual(elements.get("denutHASBadge").textContent, "Aucun critère");
  assert.ok(elements.get("denutAlerte").innerHTML.includes("Aucun critère de dénutrition identifié"));
});

test("Diagnostic HAS positif reste positif même si des données secondaires manquent", () => {
  resetBase();
  elements.get("age").value = "45";
  elements.get("poids").value = "70";
  elements.get("taille").value = "175";
  elements.get("denutMasseMusculaire").checked = true;
  elements.get("denutMalabsorption").checked = true;
  const r = context.evaluerDenutritionHAS();
  assert.strictEqual(r.diagnostic, true);
  assert.strictEqual(r.completude.complete, false);
  context.afficherEvaluationNutritionnelleHAS();
  assert.notStrictEqual(elements.get("denutHASBadge").textContent, "Incomplet");
  assert.ok(elements.get("denutAlerte").innerHTML.includes("critères diagnostiques HAS sont réunis"));
});

test("MNA-SF positif chez ≥70 ans déclenche le repérage", () => {
  resetBase();
  elements.get("age").value = "75";
  elements.get("poids").value = "58";
  elements.get("taille").value = "170";
  elements.get("mnaApports").value = "0";
  elements.get("mnaPertePoids").value = "0";
  elements.get("mnaMotricite").value = "0";
  elements.get("mnaMaladieAigue").value = "0";
  elements.get("mnaNeuro").value = "0";
  const p = context.evaluerPertinenceDenutrition();
  assert.strictEqual(p.pertinente, true);
  assert.ok(p.signaux.some(s => s.includes("MNA-SF")));
  assert.strictEqual(p.mna.interpretation.niveau, "malnutrition");
});

test("MNA-SF normal ne devient pas à lui seul un signal d'alerte", () => {
  resetBase();
  elements.get("age").value = "75";
  elements.get("poids").value = "72";
  elements.get("taille").value = "170";
  elements.get("mnaApports").value = "2";
  elements.get("mnaPertePoids").value = "3";
  elements.get("mnaMotricite").value = "2";
  elements.get("mnaMaladieAigue").value = "2";
  elements.get("mnaNeuro").value = "2";
  const p = context.evaluerPertinenceDenutrition();
  assert.strictEqual(p.mna.score, 14);
  assert.strictEqual(p.mna.interpretation.niveau, "normal");
  assert.strictEqual(p.pertinente, false);
});

test("Malabsorption est un signal de repérage", () => {
  resetBase();
  elements.get("age").value = "50";
  elements.get("poids").value = "70";
  elements.get("taille").value = "175";
  elements.get("denutMalabsorption").checked = true;
  const p = context.evaluerPertinenceDenutrition();
  assert.ok(p.signaux.includes("malabsorption / maldigestion"));
});

test("Agression / hypercatabolisme est un signal de repérage", () => {
  resetBase();
  elements.get("age").value = "50";
  elements.get("poids").value = "70";
  elements.get("taille").value = "175";
  elements.get("denutAgression").checked = true;
  const p = context.evaluerPertinenceDenutrition();
  assert.ok(p.signaux.includes("agression / hypercatabolisme"));
});

test("Réduction musculaire <70 ans est un signal de repérage", () => {
  resetBase();
  elements.get("age").value = "50";
  elements.get("poids").value = "70";
  elements.get("taille").value = "175";
  elements.get("denutMasseMusculaire").checked = true;
  const p = context.evaluerPertinenceDenutrition();
  assert.ok(p.signaux.includes("réduction musculaire quantifiée"));
});

test("Sarcopénie ≥70 ans est un signal de repérage", () => {
  resetBase();
  elements.get("age").value = "75";
  elements.get("poids").value = "72";
  elements.get("taille").value = "170";
  elements.get("denutSarcopenieConfirmee").checked = true;
  const p = context.evaluerPertinenceDenutrition();
  assert.ok(p.signaux.includes("sarcopénie confirmée"));
});


test("HAS peut être évalué à partir d'un objet de données sans relire le DOM", () => {
  resetBase();
  const r = context.evaluerDenutritionHAS({
    age: 50,
    poidsActuel: 70,
    tailleCm: 175,
    poidsHabituel: 70,
    poids1Mois: null,
    poids6Mois: null,
    albumine: null,
    masseMusculaireReduite: true,
    sarcopenieConfirmee: false,
    reductionApports: "aucune",
    dureeReduction: "",
    malabsorption: true,
    agression: false
  });
  assert.strictEqual(r.diagnostic, true);
  assert.ok(r.phenotype.some(x => x.code === "muscle"));
  assert.ok(r.etiologie.some(x => x.code === "malabsorption"));
});

test("GLIM peut être évalué à partir du même contrat de données central", () => {
  resetBase();
  const r = context.evaluerDenutritionGLIM({
    age: 50,
    poidsActuel: 60,
    tailleCm: 175,
    poids1Mois: 66,
    poids6Mois: null,
    masseMusculaireReduite: false,
    sarcopenieConfirmee: false,
    reductionApports: "plus50",
    dureeReduction: "plus1semaine",
    malabsorption: false,
    agression: false
  });
  assert.strictEqual(r.diagnostic, true);
  assert.ok(r.phenotype.some(x => x.code === "perte-poids"));
  assert.ok(r.etiologie.some(x => x.code === "apports"));
  assert.ok(r.severite);
});

test("le moteur fourni par SynthesePatient ne dépend plus des cases DOM musculaires", () => {
  resetBase();
  elements.get("denutMasseMusculaire").checked = false;
  const r = context.evaluerDenutritionHAS({
    age: 45, poidsActuel: 70, tailleCm: 175, poidsHabituel: 70,
    masseMusculaireReduite: true, sarcopenieConfirmee: false,
    reductionApports: "aucune", dureeReduction: "", malabsorption: true, agression: false
  });
  assert.strictEqual(r.diagnostic, true);
  assert.ok(r.phenotype.some(x => x.code === "muscle"));
});

test("HAS et GLIM partagent désormais le même contrat réduction/malabsorption/agression", () => {
  const donnees = {
    age: 75, poidsActuel: 60, tailleCm: 170, poidsHabituel: 70, poids6Mois: 70,
    masseMusculaireReduite: false, sarcopenieConfirmee: true,
    reductionApports: "plus50", dureeReduction: "plus2semaines", malabsorption: true, agression: true
  };
  const has = context.evaluerDenutritionHAS(donnees);
  const glim = context.evaluerDenutritionGLIM(donnees);
  assert.strictEqual(has.diagnostic, true);
  assert.strictEqual(glim.diagnostic, true);
  assert.ok(has.etiologie.length >= 1 && glim.etiologie.length >= 1);
});

let ok = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    ok += 1;
    console.log(`PASS — ${name}`);
  } catch (e) {
    console.error(`FAIL — ${name}`);
    console.error(e.stack || e);
  }
}
console.log(`\\n${ok}/${tests.length} tests réussis`);
if (ok !== tests.length) process.exit(1);
