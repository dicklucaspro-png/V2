
function iconeInformationNutrition(texte) {
  return `<button type="button" class="analysis-quality-icon" data-tooltip="${echapperHTML(texte)}" aria-label="Information : ${echapperHTML(texte)}">i</button>`;
}

function remarqueRepereNutrition(texte) {
  return texte.startsWith("Repère hospitalier complémentaire ESPEN 2021")
    ? iconeInformationNutrition(texte)
    : `<small>${echapperHTML(texte)}</small>`;
}

const Stockage = {
  lire(cle, valeurParDefaut) {
    try {
      const donnees = localStorage.getItem(cle);
      if (donnees === null) return valeurParDefaut;
      return JSON.parse(donnees);
    } catch (erreur) {
      console.error(`Lecture impossible pour "${cle}" :`, erreur);
      return valeurParDefaut;
    }
  },
  ecrire(cle, valeur) {
    try {
      localStorage.setItem(cle, JSON.stringify(valeur));
      return true;
    } catch (erreur) {
      console.error(`Écriture impossible pour "${cle}" :`, erreur);
      return false;
    }
  }
};

//! Calcul énergétique //

const NIVEAUX_ACTIVITE_PAL = Object.freeze({
  "1.2": { facteur: 1.2, label: "Inactif — PAL 1,20", categorie: "Inactif" },
  "1.4": { facteur: 1.4, label: "Sédentaire — PAL 1,40", categorie: "Sédentaire" },
  "1.6": { facteur: 1.6, label: "Modérément actif — PAL 1,60", categorie: "Modérément actif" },
  "1.8": { facteur: 1.8, label: "Actif — PAL 1,80", categorie: "Actif" },
  "2.0": { facteur: 2.0, label: "Très actif — PAL 2,00", categorie: "Très actif" },
  "2.2": { facteur: 2.2, label: "Extrêmement actif — PAL 2,20", categorie: "Extrêmement actif" }
});

const FORMULES_METABOLISME = Object.freeze({
  henry2005: { label: "Henry / Oxford (2005)", source: "Henry 2005" },
  schofield1985: { label: "Schofield (1985)", source: "Schofield 1985" },
  mifflin1990: { label: "Mifflin–St Jeor (1990)", source: "Mifflin et al. 1990" },
  harris1919: { label: "Harris–Benedict (1919)", source: "Harris & Benedict 1919" }
});

//! Options diabète //

const DIABETE_TRAITEMENTS = {
  DT1: {
    options: [["insulinotherapie", "Insulinothérapie"], ["pompe", "Pompe à insuline"]],
    blocs: {
      insulinotherapie: "diabeteInsulinotherapie",
      pompe: "diabetePompe"
    }
  },
  DT2: {
    options: [["aucun", "Aucun traitement"], ["metformine", "Metformine"], ["sulfamides", "Sulfamides hypoglycémiants"], ["glinides", "Glinides"], ["dpp4", "Inhibiteurs DPP-4"], ["glp1", "Agonistes GLP-1"], ["sglt2", "Inhibiteurs SGLT2"], ["insuline", "Insuline"], ["association", "Association de traitements"], ["autre", "Autre traitement"]],
    blocs: {
      aucun: "dt2TraitementAucun",
      metformine: "dt2TraitementMetformine",
      sulfamides: "dt2TraitementSulfamides",
      glinides: "dt2TraitementGlinides",
      dpp4: "dt2TraitementDPP4",
      glp1: "dt2TraitementGLP1",
      sglt2: "dt2TraitementSGLT2",
      insuline: "diabeteInsulineDT2",
      association: "dt2TraitementAssociation",
      autre: "dt2TraitementAutre"
    }, 

    //* Détails DT2

    conteneur: "diabeteTraitementDT2Details"
  }
};

const TOUS_LES_BLOCS_TRAITEMENT_DIABETE = [...Object.values(DIABETE_TRAITEMENTS.DT1.blocs), ...Object.values(DIABETE_TRAITEMENTS.DT2.blocs)];


//! CALCULS NUTRITIONNELS //


const REPARTITION_MACRONUTRIMENTS_DEFAUT = {
  proteines: 15,
  glucides: 50,
  lipides: 35
};

//! RÉFÉRENCES ET OBJECTIFS NUTRITIONNELS CSS 2016 //


const REFERENCES_NUTRITIONNELLES = {
  macronutriments: [{
    nom: "Protéines",
    reference: "0,83",
    unite: "g/kg/j"
  }, {
    nom: "Glucides",
    reference: "50 – 55",
    unite: "% AET"
  }, {
    nom: "Lipides",
    reference: "30 – 35",
    unite: "% AET"
  }, {
    nom: "Fibres",
    reference: "≥ 25 - 30",
    unite: "g/j"
  }, {
    nom: "Acides gras saturés (AGS)",
    reference: "< 10",
    unite: "% AET"
  }, {
    nom: "Acides gras mono-insaturés (AGMI)",
    reference: "10 – 20",
    unite: "% AET"
  }, {
    nom: "Acides gras poly-insaturés (AGPI)",
    reference: "5 – 10",
    unite: "% AET"
  }],
  mineraux: [{
    nom: "Calcium",
    reference: "950",
    unite: "mg/j"
  }, {
    nom: "Phosphore",
    reference: "800",
    unite: "mg/j"
  }, {
    nom: "Magnésium",
    reference: "300 – 350",
    unite: "mg/j"
  }, {
    nom: "Sodium",
    reference: "600 – 2 000",
    unite: "mg/j"
  }, {
    nom: "Potassium",
    reference: "3 000 – 4 000",
    unite: "mg/j"
  }, {
    nom: "Fer",
    reference: "9 – 15",
    unite: "mg/j"
  }, {
    nom: "Zinc",
    reference: "8 – 11",
    unite: "mg/j"
  }, {
    nom: "Sélénium",
    reference: "70",
    unite: "µg/j"
  }],
  vitamines: [{
    nom: "Vitamine A",
    reference: "650 – 750",
    unite: "µg ER/j"
  }, {
    nom: "Vitamine D",
    reference: "10 – 15",
    unite: "µg/j"
  }, {
    nom: "Vitamine E",
    reference: "11 – 13",
    unite: "mg/j"
  }, {
    nom: "Vitamine K1",
    reference: "50 – 70",
    unite: "µg/j"
  }, {
    nom: "Vitamine C",
    reference: "110",
    unite: "mg/j"
  }, {
    nom: "Vitamine B1",
    reference: "1,1 – 1,5",
    unite: "mg/j"
  }, {
    nom: "Vitamine B2",
    reference: "1,2 – 1,5",
    unite: "mg/j"
  }, {
    nom: "Vitamine B6",
    reference: "2 – 3",
    unite: "mg/j"
  }, {
    nom: "Vitamine B9",
    reference: "200 – 300",
    unite: "µg/j"
  }, {
    nom: "Vitamine B12",
    reference: "4,0",
    unite: "µg/j"
  }, {
    nom: "Niacine (B3)",
    reference: "14 – 16",
    unite: "mg EN/j"
  }, {
    nom: "Acide pantothénique (B5)",
    reference: "5",
    unite: "mg/j"
  }, {
    nom: "Biotine (B8)",
    reference: "40",
    unite: "µg/j"
  }]
};

const ANM_NUTRIENTS = [
  ["protein", "Protéines", "g"], ["lipids", "Lipides", "g"], ["ags", "AGS", "g"],
  ["agmi", "AGMI", "g"], ["agpi", "AGPI", "g"], ["carbs", "Glucides", "g"],
  ["fiber", "Fibres", "g"], ["water", "Eau", "g"], ["iron", "Fe", "mg"],
  ["zinc", "Zn", "mg"], ["calcium", "Ca", "mg"], ["selenium", "Sélénium", "µg"],
  ["vitC", "Vit C", "mg"], ["vitA", "Vit A", "µg"], ["vitD", "Vit D", "µg"],
  ["vitB1", "Vit B1", "mg"], ["vitB2", "Vit B2", "mg"], ["vitB9", "Vit B9", "µg"],
  ["vitB12", "Vit B12", "µg"], ["omega6", "Acide linoléique (n-6)", "g"],
  ["omega3", "ALA (n-3)", "g"], ["epaDha", "EPA + DHA", "mg"],
  ["phosphorus", "Phosphore", "mg"], ["magnesium", "Magnésium", "mg"],
  ["sodium", "Sodium", "mg"], ["potassium", "Potassium", "mg"],
  ["copper", "Cuivre", "mg"], ["iodine", "Iode", "µg"], ["vitE", "Vitamine E", "mg"],
  ["vitK", "Vitamine K1", "µg"], ["vitB3", "Vitamine B3", "mg"],
  ["vitB5", "Vitamine B5", "mg"], ["vitB6", "Vitamine B6", "mg"],
  ["salt", "Sel", "g"], ["cholesterol", "Cholestérol", "mg"]
];

const ANM_NUTRIENT_INDEXES = {
      protein: 1, lipids: 3, ags: 5, agmi: 6, agpi: 7, carbs: 2, fiber: 4, water: 0,
      iron: 8, zinc: 9, calcium: 10, selenium: 11, vitC: 12, vitA: 13, vitD: 14,
      vitB1: 15, vitB2: 16, vitB9: 17, vitB12: 18, omega6: 19, omega3: 20,
      phosphorus: 24, magnesium: 25, sodium: 26, potassium: 27, copper: 28, iodine: 29,
      vitE: 30, vitK: 31, vitB3: 33, vitB5: 34, vitB6: 35, salt: 36, cholesterol: 37
    };

function anmValeurBilan(bilan, key, accepterPartiel = false) {
  if (!bilan) return null;

  if (key === 'energie') {
    if (Number.isFinite(bilan.kcal)) return bilan.kcal;
    return accepterPartiel && bilan.kcalKnown > 0 ? bilan.kcalPartial : null;
  }

  if (key === 'epaDha') {
    const complet = bilan.complete?.[22] && bilan.complete?.[23];
    const disponible = (bilan.known?.[22] || 0) > 0 || (bilan.known?.[23] || 0) > 0;
    if (!complet && !(accepterPartiel && disponible)) return null;
    return ((bilan.totals?.[22] || 0) + (bilan.totals?.[23] || 0)) * 1000;
  }

  const index = ANM_NUTRIENT_INDEXES[key];
  if (index === undefined) return null;
  if (bilan.complete?.[index]) return bilan.totals[index];
  if (accepterPartiel && (bilan.known?.[index] || 0) > 0) return bilan.totals[index];
  return null;
}

const ANM_MEALS = ["Repas du matin", "Collation du matin", "Repas du midi", "Collation de l'après-midi", "Repas du soir", "Collation du soir"];

//* GESTION DES PATIENTS — INTERFACE VERTICALE 

const PATIENTS_STORAGE_KEY = "dietassist_patients";


//! MENU PARAMÈTRES //


const DARK_MODE_STORAGE_KEY = "dietAssistDarkMode";
/* État de l’application */
let etatRepartitionMacros = {
  proteines: 15,
  glucides: 50,
  lipides: 35
};

// Les sliders servent à préparer une ration de travail. Le brouillon reste
// distinct de la ration réellement utilisée par les calculs tant qu'il n'est
// pas explicitement validé à 100 % par le diététicien.
let brouillonRepartitionMacros = { ...etatRepartitionMacros };


//! ANAMNÈSE ALIMENTAIRE — BASE CIQUAL + CALCULS // 


let CIQUAL_ALIMENTS = typeof CIQUAL_ALIMENTS_DATA !== "undefined" && Array.isArray(CIQUAL_ALIMENTS_DATA) ? CIQUAL_ALIMENTS_DATA : [];
let anmRows = [];
// Validation explicite de la saisie alimentaire avant toute interprétation clinique.
// Une modification de l'anamnèse invalide automatiquement cette validation.
let anamneseValideePourAnalyse = false;
let empreinteStockagePatients = null;
let erreurChargementPatients = false;
let patients = chargerPatients();
let patientActif = null;
let autoSaveTimer = null;
let dossierModifie = false;
let objectifEnergetiquePersonnalise = null;
let objectifEnergetiquePersonnaliseContexte = null; // "general" ou "denutrition"
let poidsCibleTravail = null;
let objectifTherapeutiqueObesite = "stabilisation";
let etatCalculsObesiteCourant = null;
let objectifSelHTASelectionne = "standard";
let objectifSelHTAStrict = null;
let formuleMetabolismeSelectionnee = "henry2005";
let niveauActivitePALSelectionne = "";

function calculerMetabolismeRepos({ age, sexe, tailleCm, poids, formule = formuleMetabolismeSelectionnee }) {
  const tailleM = tailleCm / 100;

  if (formule === "mifflin1990") {

    //* Mifflin–St Jeor, 1990.

    return sexe === "homme"
      ? 10 * poids + 6.25 * tailleCm - 5 * age + 5
      : 10 * poids + 6.25 * tailleCm - 5 * age - 161;
  }

  if (formule === "harris1919") {

    //* Harris–Benedict, équations originales.

    return sexe === "homme"
      ? 66.4730 + 13.7516 * poids + 5.0033 * tailleCm - 6.7550 * age
      : 655.0955 + 9.5634 * poids + 1.8496 * tailleCm - 4.6756 * age;
  }

  if (formule === "schofield1985") {

    //* Schofield, 1985 — équations adultes selon l'âge.

    if (sexe === "homme") {
      if (age < 30) return 15.057 * poids + 692.2;
      if (age < 60) return 11.472 * poids + 873.1;
      return 11.711 * poids + 587.7;
    }
    if (age < 30) return 14.818 * poids + 486.6;
    if (age < 60) return 8.126 * poids + 845.6;
    return 9.082 * poids + 658.5;
  }

  //* Henry / Oxford 2005 — équations poids + taille 

  if (sexe === "homme") {
    if (age < 30) return 14.4 * poids + 313 * tailleM + 113;
    if (age < 60) return 11.4 * poids + 541 * tailleM - 137;
    return 11.4 * poids + 541 * tailleM - 256;
  }
  if (age < 30) return 10.4 * poids + 615 * tailleM - 282;
  if (age < 60) return 8.18 * poids + 502 * tailleM - 11.6;
  return 8.52 * poids + 421 * tailleM + 10.7;
}

function patientAHTAActive() {
  return document.querySelector('input[name="pathologies"][value="Hypertension"]')?.checked === true;
}

function obtenirObjectifSelHTA() {
  if (!patientAHTAActive()) return null;

  if (objectifSelHTASelectionne === "therapeutique5") {
    return {
      mode: "therapeutique5",
      libelle: "Alimentation thérapeutique pauvre en sel",
      selMax: 5,
      sodiumMax: 2000,
      source: "AFDN/SFNCM 2022",
      detail: "5 g de sel/j correspondent à environ 2 000 mg de sodium/j."
    };
  }

  if (objectifSelHTASelectionne === "stricte") {
    const selStrict = Number.parseFloat(String(objectifSelHTAStrict ?? "").replace(",", "."));
    const cibleValide = Number.isFinite(selStrict) && selStrict > 0 && selStrict <= 4;

    return {
      mode: "stricte",
      libelle: "Restriction sodée stricte",
      selMax: cibleValide ? selStrict : null,
      sodiumMax: cibleValide ? selStrict * 400 : null,
      source: "Vigilance AFDN/SFNCM 2022",
      detail: cibleValide
        ? `Objectif explicitement défini par le professionnel : ${selStrict.toFixed(1).replace(".", ",")} g de sel/j.`
        : "La cible stricte doit être définie explicitement par le professionnel (repère des notes de cours : < 3 – 4 g de sel/j)."
    };
  }

  return {
    mode: "standard",
    libelle: "Repère HTA standard",
    selMax: 6,
    sodiumMax: 2400,
    source: "Cours HTA 2025-2026",
    detail: "Le cours HTA retient une limitation à 6 g de sel/j ; la fiche HAS 2016 indique une normalisation de l'apport sodé à 6 – 8 g de sel/j au maximum."
  };
}

function changerObjectifSelHTA(mode) {
  const modes = ["standard", "therapeutique5", "stricte"];
  objectifSelHTASelectionne = modes.includes(mode) ? mode : "standard";
  calculerEtAfficherNutritionnels();
}

function changerObjectifSelHTAStrict(valeur) {
  const nombre = Number.parseFloat(String(valeur ?? "").replace(",", "."));
  objectifSelHTAStrict = Number.isFinite(nombre) && nombre > 0 && nombre <= 4 ? nombre : null;
  calculerEtAfficherNutritionnels();
}

function normaliserPAL(activite) {
  if (activite === null || activite === undefined || activite === "") return null;
  const correspondanceAncienne = {
    Inactif: 1.2,
    "Sédentaire": 1.4,
    "ModérémentActif": 1.6,
    Actif: 1.8,
    "TrèsActif": 2.0,
    "ExtrêmementActif": 2.2
  };
  if (Object.hasOwn(correspondanceAncienne, activite)) return correspondanceAncienne[activite];
  const valeur = Number.parseFloat(String(activite).replace(",", "."));
  if (!Number.isFinite(valeur)) return null;
  return valeur === 2.4 ? 2.2 : valeur;
}

function obtenirClePAL(activite) {
  const valeur = normaliserPAL(activite);
  if (!Number.isFinite(valeur)) return "";
  return Object.keys(NIVEAUX_ACTIVITE_PAL).find(cle => Math.abs(Number(cle) - valeur) < 0.001) ?? "";
}

function obtenirLibelleActiviteSelectionnee() {
  const cle = obtenirClePAL(niveauActivitePALSelectionne);
  return cle ? NIVEAUX_ACTIVITE_PAL[cle].categorie : "";
}

function optionsFormulesMetabolismeHTML() {
  return Object.entries(FORMULES_METABOLISME).map(([cle, info]) => `
    <option value="${cle}" ${cle === formuleMetabolismeSelectionnee ? "selected" : ""}>${info.label}</option>
  `).join("");
}

function optionsNiveauActivitePALHTML() {
  return `
    <option value="" ${niveauActivitePALSelectionne ? "" : "selected"}>-- Choisir le niveau d’activité --</option>
    ${Object.entries(NIVEAUX_ACTIVITE_PAL).map(([cle, info]) => `
      <option value="${cle}" ${cle === niveauActivitePALSelectionne ? "selected" : ""}>${info.label}</option>
    `).join("")}
  `;
}

function construireBlocParametresEnergetiques() {
  return `
    <div class="nutrition-energy-main">
      <div>
        <span>Formule du métabolisme de base / repos</span>
        <select id="formuleMetabolisme" onchange="changerFormuleMetabolisme(this.value)">
          ${optionsFormulesMetabolismeHTML()}
        </select>
      </div>
      <div>
        <span>Niveau d’activité retenu (PAL)</span>
        <select id="activite" onchange="changerNiveauActivitePAL(this.value)">
          ${optionsNiveauActivitePALHTML()}
        </select>
      </div>
    </div>
  `;
}

function changerFormuleMetabolisme(valeur) {
  if (!FORMULES_METABOLISME[valeur]) return;
  formuleMetabolismeSelectionnee = valeur;
  calculerEtAfficherNutritionnels();
}

function changerNiveauActivitePAL(valeur) {
  niveauActivitePALSelectionne = obtenirClePAL(valeur);
  calculerEtAfficherNutritionnels();
}

function calculerReperePonderalIMC(age, tailleCm) {
  const tailleM = Number(tailleCm) / 100;
  if (!Number.isFinite(tailleM) || tailleM <= 0) return null;

  if (!Number.isFinite(Number(age)) || Number(age) < 18) {
    return {
      applicable: false,
      message: "Références pédiatriques spécifiques nécessaires."
    };
  }

  const poidsMin = 18.5 * tailleM * tailleM;
  const poidsMax = 24.9 * tailleM * tailleM;
  const seuilDenutritionSenior = Number(age) >= 70 ? 22 * tailleM * tailleM : null;

  return {
    applicable: true,
    poidsMin,
    poidsMax,
    seuilDenutritionSenior
  };
}

function formaterDetailPoidsCible(poidsCible, poidsActuel, tailleCm) {
  const cible = Number(poidsCible);
  const actuel = Number(poidsActuel);
  const tailleM = Number(tailleCm) / 100;

  if (!Number.isFinite(cible) || cible <= 0) {
    return "À définir par le diététicien selon l’objectif individualisé.";
  }

  const informations = [];
  if (Number.isFinite(tailleM) && tailleM > 0) {
    informations.push(`IMC correspondant : ${(cible / (tailleM * tailleM)).toFixed(1)} kg/m²`);
  }

  if (Number.isFinite(actuel) && actuel > 0) {
    const ecart = cible - actuel;
    const pourcentage = ecart / actuel * 100;
    const signeKg = ecart > 0 ? "+" : "";
    const signePct = pourcentage > 0 ? "+" : "";
    informations.push(`Écart : ${signeKg}${ecart.toFixed(1)} kg (${signePct}${pourcentage.toFixed(1)} %)`);
  }

  return informations.join(" · ");
}

function changerPoidsCibleTravail(valeur) {
  const cible = Number.parseFloat(String(valeur).replace(",", "."));
  poidsCibleTravail = Number.isFinite(cible) && cible > 0 ? cible : null;

  const detail = document.getElementById("poidsCibleCalculsDetail");
  if (detail) {
    const poidsActuel = Number(document.getElementById("poids")?.value);
    const tailleCm = Number(document.getElementById("taille")?.value);
    detail.textContent = formaterDetailPoidsCible(poidsCibleTravail, poidsActuel, tailleCm);
  }
}

function changerObjectifTherapeutiqueObesite(valeur) {
  const valeursAutorisees = ["stabilisation", "perte", "prevention_reprise", "habitudes"];
  objectifTherapeutiqueObesite = valeursAutorisees.includes(valeur) ? valeur : "stabilisation";
  calculerEtAfficherNutritionnels();
  rafraichirSortiesPathologiques();
}

function appliquerDeficitEnergetiqueObesite(deficitKcal) {
  const etat = etatCalculsObesiteCourant;
  const deficit = Number(deficitKcal);
  if (!etat || !etat.obesiteActive || objectifTherapeutiqueObesite !== "perte") return;
  if (etat.restrictionNonProposee) return;
  if (!Number.isFinite(deficit) || ![600, 1000].includes(deficit)) return;
  if (!Number.isFinite(etat.besoinsEnergetiques) || etat.besoinsEnergetiques <= deficit) return;

  objectifEnergetiquePersonnalise = Math.round(etat.besoinsEnergetiques - deficit);
  objectifEnergetiquePersonnaliseContexte = "general";
  calculerEtAfficherNutritionnels();
  rafraichirSortiesPathologiques();
}

function reinitialiserObjectifEnergetiqueObesite() {
  if (objectifEnergetiquePersonnaliseContexte === "general") {
    objectifEnergetiquePersonnalise = null;
    objectifEnergetiquePersonnaliseContexte = null;
  }
  calculerEtAfficherNutritionnels();
  rafraichirSortiesPathologiques();
}

function obtenirEtatCalculsObesite() {
  return etatCalculsObesiteCourant ? { ...etatCalculsObesiteCourant } : null;
}

window.changerObjectifTherapeutiqueObesite = changerObjectifTherapeutiqueObesite;
window.appliquerDeficitEnergetiqueObesite = appliquerDeficitEnergetiqueObesite;
window.reinitialiserObjectifEnergetiqueObesite = reinitialiserObjectifEnergetiqueObesite;
window.obtenirEtatCalculsObesite = obtenirEtatCalculsObesite;

document.addEventListener("change", (event) => {
  const cible = event.target;
  if (!(cible instanceof HTMLSelectElement)) return;

  if (cible.id === "objectifTherapeutiqueObesite") {
    changerObjectifTherapeutiqueObesite(cible.value);
  }
});

document.addEventListener("click", (event) => {
  const bouton = event.target.closest("[data-obesite-deficit]");
  if (bouton) {
    const deficit = Number(bouton.dataset.obesiteDeficit);
    appliquerDeficitEnergetiqueObesite(deficit);
    return;
  }

  const reset = event.target.closest("[data-obesite-reset-energie]");
  if (reset) {
    reinitialiserObjectifEnergetiqueObesite();
  }
});

function calculerIndicateursNutritionnels({
  age,
  sexe,
  tailleCm,
  poids,
  activite = niveauActivitePALSelectionne,
  formule = formuleMetabolismeSelectionnee
}) {
  const tailleM = tailleCm / 100;
  const imc = poids / (tailleM * tailleM);
  let interpretationIMC = "Obésité";
  if (imc < 18.5) {
    interpretationIMC = "Insuffisance pondérale";
  } else if (imc < 25) {
    interpretationIMC = "Corpulence normale";
  } else if (imc < 30) {
    interpretationIMC = "Surpoids";
  }

  const metabolismeRepos = calculerMetabolismeRepos({ age, sexe, tailleCm, poids, formule });
  const facteur = normaliserPAL(activite);
  const besoinsEnergetiques = Number.isFinite(facteur) ? metabolismeRepos * facteur : null;
  return {
    imc,
    interpretationIMC,
    metabolismeRepos,
    facteur,
    besoinsEnergetiques,
    formule
  };
}


// OBJECTIFS NUTRITIONNELS — SOURCE DE VÉRITÉ UNIQUE
// Cette fonction est volontairement pure afin de pouvoir être testée sans DOM.
// Les repères hospitaliers ESPEN 18–69 ans sont conservés comme informations
// complémentaires et ne deviennent pas automatiquement une prescription ambulatoire.
function calculerObjectifsNutritionnelsPatient({
  age,
  poids,
  besoinsEnergetiques,
  denutritionDiagnostiquee = false,
  repartitionMacros = null,
  objectifPersonnalise = null,
  objectifPersonnaliseContexte = null
}) {
  const ageValide = Number.isFinite(age);
  const poidsValide = Number.isFinite(poids) && poids > 0;
  const besoinsValides = Number.isFinite(besoinsEnergetiques) && besoinsEnergetiques > 0;
  const macros = repartitionMacros && Number.isFinite(repartitionMacros.proteines)
    ? repartitionMacros
    : { proteines: 15, glucides: 50, lipides: 35 };

  const seniorDenutri = denutritionDiagnostiquee && ageValide && age >= 70;
  const adulteDenutri1869 = denutritionDiagnostiquee && ageValide && age >= 18 && age < 70;
  const contexte = denutritionDiagnostiquee ? "denutrition" : "general";

  const personnaliseApplicable =
    Number.isFinite(objectifPersonnalise) &&
    objectifPersonnalise > 0 &&
    objectifPersonnaliseContexte === contexte
      ? objectifPersonnalise
      : null;

  const plageEnergieHAS = seniorDenutri && poidsValide
    ? { min: poids * 30, max: poids * 40, source: "HAS 2007" }
    : null;

  const repereHospitalierESPEN = adulteDenutri1869 && poidsValide
    ? {
        energie: poids * 30,
        proteinesMinimum: poids * 1.2,
        source: "ESPEN Hospital Nutrition 2021",
        contexte: "hospitalier"
      }
    : null;

  // ≥70 ans dénutri : la borne basse HAS sert de valeur initiale si aucun
  // objectif individualisé n est enregistré. 18–69 ans : on conserve
  // estimation énergétique générale issue de Calculs nutritionnels.
  const energieParDefaut = seniorDenutri
    ? plageEnergieHAS?.min ?? null
    : besoinsValides
      ? besoinsEnergetiques
      : null;

  const objectifEnergie = personnaliseApplicable ?? energieParDefaut;

  const proteinesSelonRepartition =
    Number.isFinite(objectifEnergie) && objectifEnergie > 0
      ? objectifEnergie * macros.proteines / 100 / 4
      : null;

  const proteinesMinHAS = seniorDenutri && poidsValide ? poids * 1.2 : null;
  const proteinesMaxHAS = seniorDenutri && poidsValide ? poids * 1.5 : null;

  const objectifProteines =
    Number.isFinite(proteinesSelonRepartition) && Number.isFinite(proteinesMinHAS)
      ? Math.max(proteinesSelonRepartition, proteinesMinHAS)
      : (proteinesSelonRepartition ?? proteinesMinHAS);

  return {
    contexte,
    denutritionDiagnostiquee,
    seniorDenutri,
    adulteDenutri1869,
    energie: {
      objectif: objectifEnergie,
      estimationGenerale: besoinsValides ? besoinsEnergetiques : null,
      personnalisee: personnaliseApplicable !== null,
      plageHAS: plageEnergieHAS,
      repereHospitalierESPEN
    },
    proteines: {
      objectif: objectifProteines,
      selonRepartition: proteinesSelonRepartition,
      minimumHAS: proteinesMinHAS,
      maximumHAS: proteinesMaxHAS,
      repereHospitalierESPEN
    }
  };
}

function obtenirObjectifsNutritionnelsPatient() {
  const age = Number(document.getElementById("age")?.value);
  const sexe = document.getElementById("sexe")?.value || "";
  const tailleCm = Number(document.getElementById("taille")?.value);
  const poids = Number(document.getElementById("poids")?.value);
  const activite = niveauActivitePALSelectionne;

  if (!Number.isFinite(age) || !sexe || !Number.isFinite(tailleCm) || !Number.isFinite(poids) || tailleCm <= 0 || poids <= 0) {
    return null;
  }

  const indicateurs = calculerIndicateursNutritionnels({
    age,
    sexe,
    tailleCm,
    poids,
    activite,
    formule: formuleMetabolismeSelectionnee
  });

  const denutrition = typeof evaluerDenutritionHAS === "function"
    ? evaluerDenutritionHAS()
    : null;

  return calculerObjectifsNutritionnelsPatient({
    age,
    poids,
    besoinsEnergetiques: indicateurs?.besoinsEnergetiques ?? null,
    denutritionDiagnostiquee: denutrition?.diagnostic === true,
    repartitionMacros: etatRepartitionMacros,
    objectifPersonnalise: objectifEnergetiquePersonnalise,
    objectifPersonnaliseContexte: objectifEnergetiquePersonnaliseContexte
  });
}

function synchroniserBlocDiabete() {
  const caseDiabete = document.querySelector('input[name="pathologies"][value="Diabète"]');
  const blocDiabete = document.getElementById("diabeteDetails");
  const groupeTraitement = document.getElementById("diabeteTraitementGroupe");
  const typeDiabete = document.getElementById("diabeteType");
  const traitement = document.getElementById("diabeteTraitement");
  if (!caseDiabete || !blocDiabete || !typeDiabete || !traitement) return;
  const diabeteCoche = caseDiabete.checked;

  //* Visibilité

  blocDiabete.style.display = "";
  blocDiabete.classList.toggle("est-visible", diabeteCoche);

  //* Traitements

  if (groupeTraitement) {
    groupeTraitement.hidden = !diabeteCoche;
    groupeTraitement.classList.toggle("est-visible", diabeteCoche);
    if (!diabeteCoche) {
      groupeTraitement.style.display = "none";
    } else {
      groupeTraitement.style.display = "";
    }
  }

  //* Sélection

  traitement.disabled = !diabeteCoche || !typeDiabete.value;

  //* Réinitialisation

  if (!diabeteCoche) {
    traitement.value = "";
    afficherDetailsTraitementDiabete("", "");
    return;
  }

  //* Synchronisation

  remplirOptionsTraitementDiabete(traitement, typeDiabete.value);
  afficherDetailsTraitementDiabete(typeDiabete.value, traitement.value);

  if (typeof actualiserDetailsPatientDiabete === "function") {
    actualiserDetailsPatientDiabete();
  }
}

function synchroniserBlocHTA() {
  const caseHTA = document.querySelector('input[name="pathologies"][value="Hypertension"]');
  const blocHTA = document.getElementById("htaDetails");
  const groupeTraitement = document.getElementById("htaTraitementGroupe");
  const schema = document.getElementById("htaSchemaTherapeutique");

  if (!caseHTA || !blocHTA || !schema) return;

  const htaCochee = caseHTA.checked;

  blocHTA.style.display = "";
  blocHTA.classList.toggle("est-visible", htaCochee);

  if (groupeTraitement) {
    groupeTraitement.hidden = !htaCochee;
    groupeTraitement.classList.toggle("est-visible", htaCochee);
    groupeTraitement.style.display = htaCochee ? "" : "none";
  }

  schema.disabled = !htaCochee;

  if (!htaCochee) {
    schema.value = "";
    afficherDetailsTraitementHTA("");
    return;
  }

  afficherDetailsTraitementHTA(schema.value);
}

function afficherDetailsTraitementHTA(schema) {
  const conteneurClasses = document.getElementById("htaClassesTraitement");
  const classe1 = document.getElementById("htaClasse1Groupe");
  const classe2 = document.getElementById("htaClasse2Groupe");
  const classe3 = document.getElementById("htaClasse3Groupe");
  const details = document.getElementById("htaTraitementDetails");
  const aucun = document.getElementById("htaAucunTraitementDetails");
  const complexe = document.getElementById("htaTraitementComplexeDetails");

  [conteneurClasses, classe1, classe2, classe3, details, aucun, complexe].forEach(bloc => {
    if (bloc) bloc.hidden = true;
  });

  if (!schema) return;

  if (schema === "aucun") {
    if (aucun) aucun.hidden = false;
    return;
  }

  if (schema === "autre") {
    if (complexe) complexe.hidden = false;
    if (details) details.hidden = false;
    return;
  }

  const nombreClasses = {
    monotherapie: 1,
    bitherapie: 2,
    tritherapie: 3
  }[schema];

  if (!nombreClasses) return;

  if (conteneurClasses) conteneurClasses.hidden = false;
  if (classe1) classe1.hidden = nombreClasses < 1;
  if (classe2) classe2.hidden = nombreClasses < 2;
  if (classe3) classe3.hidden = nombreClasses < 3;
  if (details) details.hidden = false;
}

function remplirOptionsTraitementDiabete(selectTraitement, type) {
  const config = DIABETE_TRAITEMENTS[type];
  const valeurPrecedente = selectTraitement.value;
  const options = ['<option value="">-- Sélectionner --</option>'];
  if (config) {
    config.options.forEach(([valeur, libelle]) => {
      options.push(`<option value="${valeur}">${libelle}</option>`);
    });
  }
  selectTraitement.innerHTML = options.join("");
  if (config && config.options.some(([valeur]) => valeur === valeurPrecedente)) {
    selectTraitement.value = valeurPrecedente;
  }
}

//! Détails traitement //

function afficherDetailsTraitementDiabete(type, valeurTraitement) {
  TOUS_LES_BLOCS_TRAITEMENT_DIABETE.forEach(id => {
    const bloc = document.getElementById(id);
    if (bloc) {
      bloc.hidden = true;
      bloc.style.display = "none";
    }
  });
  const conteneurDT2 = document.getElementById(DIABETE_TRAITEMENTS.DT2.conteneur);
  if (conteneurDT2) conteneurDT2.hidden = true;
  const config = DIABETE_TRAITEMENTS[type];
  if (!config) return;
  if (type === "DT2" && conteneurDT2) {
    conteneurDT2.hidden = false;
  }
  const idBloc = config.blocs[valeurTraitement];
  const bloc = idBloc ? document.getElementById(idBloc) : null;
  if (bloc) {
    bloc.hidden = false;
    bloc.style.display = "";
  }
}

//! Écouteurs diabète //

function calculerEtAfficherNutritionnels() {
  const container = document.getElementById("calculsNutritionnels");
  if (!container) return;
  const age = Number(document.getElementById("age")?.value);
  const sexe = document.getElementById("sexe")?.value;
  const tailleCm = Number(document.getElementById("taille")?.value);
  const poids = Number(document.getElementById("poids")?.value);
  const sexePatient = String(recupererValeur("sexe") || "").toLowerCase().trim();
  const estFemme = sexePatient === "femme" || sexePatient === "female";
  const estHomme = sexePatient === "homme" || sexePatient === "male";
  const menopause = estFemme && recupererValeur("menopause") === "oui";
  const ferCSS = estHomme
    ? 9
    : estFemme
      ? (age >= 61 || menopause ? 9 : 15)
      : null;
  const besoinsSexe = {
    magnesium: estFemme ? 300 : estHomme ? 350 : null,
    fer: ferCSS,
    zinc: estFemme ? 8 : estHomme ? 11 : null,
    vitamineA: estFemme ? 650 : estHomme ? 750 : null,
    vitamineDMin: age > 70 ? 20 : 10,
    vitamineDMax: age > 70 ? 20 : 15,
    vitamineE: estFemme ? 11 : estHomme ? 13 : null,
    vitamineB1: age > 70 ? 1.3 : estFemme ? 1.1 : estHomme ? 1.5 : null,
    vitamineB2: age > 70 ? (estFemme ? 1.3 : estHomme ? 1.6 : null) : estFemme ? 1.2 : estHomme ? 1.5 : null,
    vitamineB6: estFemme ? 2 : estHomme ? 3 : null,
    vitamineB9Min: 200,
    vitamineB9Max: age > 70 ? 200 : 300,
    niacine: estFemme ? 14 : estHomme ? 16 : null,
    vitamineB12: age > 70 ? 4.5 : 4.0,
    iode: 150,
    eauTotale: estFemme ? 2000 : estHomme ? 2500 : null,
    sodiumMin: age > 60 ? 500 : 600,
    sodiumMax: age > 60 ? 1600 : 2000
  };

  const proteinesRecommandees = poids * 0.83;
  const diabeteActive = document.querySelector('input[name="pathologies"][value="Diabète"]')?.checked === true;
  const obesiteActiveCalculs = document.querySelector('input[name="pathologies"][value="Obésité"]')?.checked === true;
  const htaActive = patientAHTAActive();
  const objectifSelHTA = htaActive ? obtenirObjectifSelHTA() : null;
  const activite = niveauActivitePALSelectionne;
  if (!age || !sexe || !tailleCm || !poids) {
    container.innerHTML = `
            <div class="module-placeholder">
                <h3>Données anthropométriques insuffisantes</h3>
                <p>Renseignez l’âge, le sexe, la taille et le poids dans l’onglet Patient.</p>
            </div>
        `;
    return;
  }

  const indicateurs = calculerIndicateursNutritionnels({
    age,
    sexe,
    tailleCm,
    poids,
    activite,
    formule: formuleMetabolismeSelectionnee
  });

  const {
    imc,
    interpretationIMC,
    metabolismeRepos,
    besoinsEnergetiques
  } = indicateurs;
  const reperePonderal = calculerReperePonderalIMC(age, tailleCm);
  const detailPoidsCible = formaterDetailPoidsCible(poidsCibleTravail, poids, tailleCm);

  if (!activite || !Number.isFinite(besoinsEnergetiques)) {
    container.innerHTML = `
      <div class="nutrition-top-grid">
        <section class="nutrition-calc-card nutrition-energy-card">
          <div class="nutrition-calc-card-header">
            <span class="nutrition-calc-kicker">Estimation énergétique</span>
            <h3>Métabolisme et activité</h3>
          </div>
          ${construireBlocParametresEnergetiques()}
          <div class="nutrition-energy-main">
            <div>
              <span>Métabolisme de base / repos estimé</span>
              <strong>${Math.round(metabolismeRepos)} <small>kcal/j</small></strong>
              <small>${FORMULES_METABOLISME[formuleMetabolismeSelectionnee].source}</small>
            </div>
            <div>
              <span>Besoins énergétiques journaliers</span>
              <strong>—</strong>
              <small>Choisissez un PAL pour poursuivre le calcul.</small>
            </div>
          </div>
          <p class="nutrition-calc-note">Les équations proposées sont des méthodes prédictives. Le choix de la formule et du PAL reste sous la responsabilité du professionnel.</p>
        </section>
      </div>`;
    return;
  }

  //* DÉNUTRITION

  const resultatDenutrition = typeof evaluerDenutritionHAS === "function" ? evaluerDenutritionHAS() : null;
  const denutritionDiagnostiquee = resultatDenutrition?.diagnostic === true;
  const seniorDenutri = age >= 70 && denutritionDiagnostiquee;
  const adulteDenutri1869 = age >= 18 && age < 70 && denutritionDiagnostiquee;

  // Une pathologie modifie les repères affichés, jamais silencieusement la
  // ration de travail choisie. La dénutrition n'impose donc plus 20/45/35.

  // Un objectif personnalisé n'est réutilisé que dans le contexte dans lequel
  // il a été défini. Cela évite de conserver silencieusement une cible de perte
  // pondérale lorsqu'un diagnostic de dénutrition apparaît, ou inversement.
  const contexteObjectifActuel = denutritionDiagnostiquee ? "denutrition" : "general";
  if (objectifEnergetiquePersonnalise !== null && objectifEnergetiquePersonnaliseContexte !== contexteObjectifActuel) {
    objectifEnergetiquePersonnalise = null;
    objectifEnergetiquePersonnaliseContexte = null;
  }

  const objectifsNutritionnels = calculerObjectifsNutritionnelsPatient({
    age,
    poids,
    besoinsEnergetiques,
    denutritionDiagnostiquee,
    repartitionMacros: etatRepartitionMacros,
    objectifPersonnalise: objectifEnergetiquePersonnalise,
    objectifPersonnaliseContexte: objectifEnergetiquePersonnaliseContexte
  });

  const objectifEnergetique = objectifsNutritionnels.energie.objectif;
  const energieDenutritionMin = objectifsNutritionnels.energie.plageHAS?.min ?? null;
  const energieDenutritionMax = objectifsNutritionnels.energie.plageHAS?.max ?? null;
  const proteinesDenutritionMin = objectifsNutritionnels.proteines.minimumHAS;
  const proteinesDenutritionMax = objectifsNutritionnels.proteines.maximumHAS;
  const repereEspenEnergie1869 = objectifsNutritionnels.energie.repereHospitalierESPEN?.energie ?? null;
  const repereEspenProteines1869 = objectifsNutritionnels.proteines.repereHospitalierESPEN?.proteinesMinimum ?? null;

  //* RÉFÉRENCES MACRONUTRIMENTS — CALCULS PATIENT

  const glucidesMinG = objectifEnergetique * 0.50 / 4;
  const glucidesMaxG = objectifEnergetique * 0.55 / 4;
  const lipidesMinG = objectifEnergetique * 0.30 / 9;
  const lipidesMaxG = objectifEnergetique * 0.35 / 9;
  const agsMaxG = objectifEnergetique * 0.10 / 9;
  const agmiMinG = objectifEnergetique * 0.10 / 9;
  const agpiMinG = objectifEnergetique * 0.05 / 9;
  const agpiMaxG = objectifEnergetique * 0.10 / 9;
  const repartition = {
    proteines: etatRepartitionMacros.proteines / 100,
    glucides: etatRepartitionMacros.glucides / 100,
    lipides: etatRepartitionMacros.lipides / 100
  };
  const proteinesKcal = objectifEnergetique * repartition.proteines;
  const glucidesKcal = objectifEnergetique * repartition.glucides;
  const lipidesKcal = objectifEnergetique * repartition.lipides;
  const proteinesG = proteinesKcal / 4;
  const glucidesG = glucidesKcal / 4;
  const lipidesG = lipidesKcal / 9;

  let obesiteCalculsHTML = "";
  let obesitePerteProgressiveActive = false;
  let plageBasoHaute = null;
  let plageBasoBasse = null;

  if (obesiteActiveCalculs) {
    const tourTaille = Number(document.getElementById("tourTaille")?.value);
    const seuilTourTaille = estHomme ? 94 : estFemme ? 80 : null;
    const tourTailleInterpretable = Number.isFinite(tourTaille) && tourTaille > 0 && Number.isFinite(seuilTourTaille);
    const tourTailleStatut = tourTailleInterpretable
      ? (tourTaille >= seuilTourTaille
          ? `Seuil de risque métabolique atteint (≥ ${seuilTourTaille} cm)`
          : `Sous le seuil de risque utilisé (${seuilTourTaille} cm)`)
      : "À renseigner dans l’onglet Patient";

    const poidsRepere5 = poids * 0.95;
    const poidsRepere10 = poids * 0.90;
    const variationCiblePct = Number.isFinite(poidsCibleTravail) && poidsCibleTravail > 0
      ? ((poidsCibleTravail - poids) / poids) * 100
      : null;

    const deficitActuelKcal = Number.isFinite(objectifEnergetique) && Number.isFinite(besoinsEnergetiques)
      ? besoinsEnergetiques - objectifEnergetique
      : null;
    const deficitActuelPct = Number.isFinite(deficitActuelKcal) && besoinsEnergetiques > 0
      ? (deficitActuelKcal / besoinsEnergetiques) * 100
      : null;

    plageBasoHaute = Math.max(0, Math.round(besoinsEnergetiques - 600));
    plageBasoBasse = Math.max(0, Math.round(besoinsEnergetiques - 1000));
    const alerteTCAObesite = document.getElementById("obesiteTcaAlerte")?.value === "oui";
    const restrictionNonProposee = denutritionDiagnostiquee || alerteTCAObesite;
    obesitePerteProgressiveActive =
      objectifTherapeutiqueObesite === "perte" &&
      !restrictionNonProposee;

    const libelleClasseObesite = imc >= 40
      ? "Obésité de classe III"
      : imc >= 35
        ? "Obésité de classe II"
        : imc >= 30
          ? "Obésité de classe I"
          : imc >= 25
            ? "Surpoids"
            : interpretationIMC;

    const libellesObjectifsObesite = {
      stabilisation: "Stabilisation pondérale",
      perte: "Perte pondérale progressive",
      prevention_reprise: "Prévention de la reprise pondérale",
      habitudes: "Amélioration des habitudes sans objectif pondéral immédiat"
    };

    etatCalculsObesiteCourant = {
      obesiteActive: true,
      objectifTherapeutique: objectifTherapeutiqueObesite,
      objectifTherapeutiqueLibelle: libellesObjectifsObesite[objectifTherapeutiqueObesite],
      besoinsEnergetiques,
      objectifEnergetique,
      deficitActuelKcal,
      deficitActuelPct,
      plageBasoBasse,
      plageBasoHaute,
      poidsActuel: poids,
      poidsCible: poidsCibleTravail,
      variationCiblePct,
      poidsRepere5,
      poidsRepere10,
      denutritionDiagnostiquee,
      alerteTCAObesite,
      restrictionNonProposee
    };

    let blocStrategieEnergetique = "";

    if (objectifTherapeutiqueObesite === "perte") {
      blocStrategieEnergetique = restrictionNonProposee
        ? `
          <div class="nutrition-protein-reference">
            <span>Restriction énergétique non proposée automatiquement</span>
            <strong>Vigilance prioritaire</strong>
            <small>${denutritionDiagnostiquee
              ? "Une dénutrition est diagnostiquée : l'objectif énergétique doit d'abord répondre à la prise en charge de la dénutrition."
              : "Une alerte de trouble des conduites alimentaires est renseignée : ne pas appliquer automatiquement un déficit énergétique avant évaluation adaptée."}</small>
          </div>`
        : `
          <div class="nutrition-protein-reference">
            <span>Stratégie énergétique — perte pondérale</span>
            <strong>${plageBasoBasse} – ${plageBasoHaute} kcal/j</strong>
            <small>Repère BASO 2020 : déficit de 600 à 1 000 kcal/j par rapport aux besoins estimés (${Math.round(besoinsEnergetiques)} kcal/j). Plage indicative à individualiser selon la situation, les capacités et les attentes du patient.</small>
          </div>

          <div class="nutrition-obesity-actions">
            <button type="button" class="btn-secondary" data-obesite-deficit="600">Utiliser −600 kcal/j</button>
            <button type="button" class="btn-secondary" data-obesite-deficit="1000">Utiliser −1000 kcal/j</button>
            <button type="button" class="btn-secondary" data-obesite-reset-energie>Revenir aux besoins estimés</button>
          </div>

          <div class="nutrition-hta-summary">
            <div>
              <span>Repère pondéral</span>
              <strong>${poidsRepere5.toFixed(1)} – ${poidsRepere10.toFixed(1)} kg</strong>
              <small>Correspond à −5 à −10 % du poids actuel. Repère documentaire, jamais une cible automatique.</small>
            </div>
            <div>
              <span>Objectif de soins</span>
              <strong>Progressif et individualisé</strong>
              <small>La HAS recommande de tenir compte du retentissement, de la mobilité, de la qualité de vie, des capacités et des attentes de la personne.</small>
            </div>
          </div>

          <p class="nutrition-calc-note">HAS 2024 : la perte pondérale, lorsqu'elle est indiquée, s'inscrit dans un projet progressif avec anticipation des difficultés et prévention du rebond pondéral.</p>`;
    }

    if (objectifTherapeutiqueObesite === "stabilisation") {
      blocStrategieEnergetique = `
        <div class="nutrition-protein-reference">
          <span>Stratégie énergétique — stabilisation</span>
          <strong>Pas de déficit énergétique systématique</strong>
          <small>La HAS recommande, notamment en situation non complexe, de pouvoir viser d'abord une stabilisation du poids grâce à des modifications durables des habitudes de vie.</small>
        </div>

        <div class="nutrition-hta-summary">
          <div>
            <span>Finalité thérapeutique</span>
            <strong>Stabiliser la trajectoire pondérale</strong>
            <small>Éviter l'évolution vers une obésité plus sévère et soutenir les changements déjà réalisables.</small>
          </div>
          <div>
            <span>Repères de suivi</span>
            <strong>Poids · tour de taille · habitudes</strong>
            <small>Le suivi peut également intégrer la condition physique, la masse musculaire, la santé et le bien-être.</small>
          </div>
          <div>
            <span>Critère de réussite</span>
            <strong>Pas uniquement le poids</strong>
            <small>Les améliorations fonctionnelles, cliniques et comportementales restent pertinentes même sans perte pondérale.</small>
          </div>
        </div>`;
    }

    if (objectifTherapeutiqueObesite === "prevention_reprise") {
      blocStrategieEnergetique = `
        <div class="nutrition-protein-reference">
          <span>Stratégie énergétique — maintien à long terme</span>
          <strong>Prévenir la reprise pondérale</strong>
          <small>Pas de déficit énergétique automatique : l'objectif est de consolider les changements obtenus et de soutenir leur maintien dans le temps.</small>
        </div>

        <div class="nutrition-hta-summary">
          <div>
            <span>Finalité thérapeutique</span>
            <strong>Maintenir les acquis</strong>
            <small>Stabiliser la trajectoire pondérale et préserver les habitudes favorables déjà installées.</small>
          </div>
          <div>
            <span>Prévention des difficultés</span>
            <strong>Anticiper les périodes à risque</strong>
            <small>Repérer les situations de fragilité, la lassitude ou les changements de rythme pouvant déstabiliser les habitudes.</small>
          </div>
          <div>
            <span>Stratégie de maintien</span>
            <strong>Prévoir un plan d'action</strong>
            <small>HAS 2024 : apprendre à faire face aux écarts sans culpabilité et préparer des stratégies personnalisées de type « si… alors… ».</small>
          </div>
        </div>`;
    }

    if (objectifTherapeutiqueObesite === "habitudes") {
      blocStrategieEnergetique = `
        <div class="nutrition-protein-reference">
          <span>Stratégie thérapeutique</span>
          <strong>Pas d'objectif pondéral immédiat</strong>
          <small>La réussite n'est pas conditionnée à une perte de poids. L'objectif prioritaire est l'amélioration progressive de la santé, du bien-être et des habitudes de vie.</small>
        </div>

        <div class="nutrition-hta-summary">
          <div>
            <span>Alimentation</span>
            <strong>Qualité · variété · portions</strong>
            <small>Les objectifs sont choisis selon les habitudes réellement observées et les besoins du patient.</small>
          </div>
          <div>
            <span>Mode de vie</span>
            <strong>Activité · sédentarité</strong>
            <small>La progression est adaptée aux capacités, au contexte et aux préférences de la personne.</small>
          </div>
          <div>
            <span>Rythmes de vie</span>
            <strong>Sommeil · régularité</strong>
            <small>La HAS intègre le sommeil, les rythmes de vie et l'environnement parmi les dimensions de l'accompagnement.</small>
          </div>
          <div>
            <span>Évaluation des progrès</span>
            <strong>Santé · fonctionnement · bien-être</strong>
            <small>Une cible pondérale pourra être réévaluée ultérieurement si elle devient pertinente.</small>
          </div>
        </div>`;
    }

    obesiteCalculsHTML = `
      <section class="nutrition-calc-card nutrition-obesity-card">
        <div class="nutrition-calc-card-header">
          <span class="nutrition-calc-kicker">Adaptation obésité</span>
          <h3>Objectif thérapeutique</h3>
          <p>Le diététicien choisit la stratégie thérapeutique. NutriFlow affiche ensuite uniquement les repères utiles à l’objectif sélectionné.</p>
        </div>

        <div class="nutrition-target-row">
          <label class="nutrition-target-label" for="objectifTherapeutiqueObesite">Objectif thérapeutique</label>
          <select id="objectifTherapeutiqueObesite">
            <option value="stabilisation" ${objectifTherapeutiqueObesite === "stabilisation" ? "selected" : ""}>Stabilisation pondérale</option>
            <option value="perte" ${objectifTherapeutiqueObesite === "perte" ? "selected" : ""}>Perte pondérale progressive</option>
            <option value="prevention_reprise" ${objectifTherapeutiqueObesite === "prevention_reprise" ? "selected" : ""}>Prévention de la reprise pondérale</option>
            <option value="habitudes" ${objectifTherapeutiqueObesite === "habitudes" ? "selected" : ""}>Amélioration des habitudes sans objectif pondéral immédiat</option>
          </select>
        </div>

        ${blocStrategieEnergetique}

        <p class="nutrition-calc-note">Références : HAS, Guide du parcours de soins surpoids et obésité de l'adulte, mise à jour 2024 ; Consensus BASO 2020.</p>
      </section>`;
  } else {
    etatCalculsObesiteCourant = null;
  }

  let diabeteCalculsHTML = "";
  if (diabeteActive) {
    diabeteCalculsHTML = `
      <section class="nutrition-calc-card nutrition-diabetes-card">
        <div class="nutrition-calc-card-header">
          <span class="nutrition-calc-kicker">Adaptation diabète</span>
          <h3>Objectifs nutritionnels individualisés</h3>
          <p>NutriFlow n'impose pas automatiquement une répartition glucidique spécifique en cas de diabète. La ration de travail reste définie par le diététicien selon le patient, son traitement, ses habitudes et les objectifs retenus.</p>
        </div>

        <div class="nutrition-hta-summary">
          <div>
            <span>Glucides actuellement retenus</span>
            <strong>${glucidesG.toFixed(0)} g/j</strong>
            <small>${etatRepartitionMacros.glucides} % de l'objectif énergétique</small>
          </div>
        </div>

        <p class="nutrition-calc-note">
          L'analyse diabète exploite ensuite la quantité et la répartition réelle des glucides dans l'anamnèse, les principales sources glucidiques, les fibres, le traitement et les épisodes d'hypoglycémie. Aucun objectif spécifique de fibres lié au diabète n'est ajouté ici et aucune dose d'insuline n'est calculée automatiquement.
        </p>
      </section>`;
  }

  let htaCalculsHTML = "";
  if (htaActive && objectifSelHTA) {
    const cibleSel = Number.isFinite(objectifSelHTA.selMax)
      ? `${objectifSelHTA.selMax.toFixed(1).replace(".", ",")} g/j`
      : "À définir";
    const cibleSodium = Number.isFinite(objectifSelHTA.sodiumMax)
      ? `${Math.round(objectifSelHTA.sodiumMax).toLocaleString("fr-FR")} mg/j`
      : "À définir";

    htaCalculsHTML = `
      <section class="nutrition-calc-card nutrition-hta-card">
        <div class="nutrition-calc-card-header">
          <span class="nutrition-calc-kicker">Adaptation HTA</span>
          <h3>Objectif sel / sodium</h3>
          <p>Le niveau de restriction est retenu par le professionnel. NutriFlow n'applique jamais automatiquement une restriction sodée stricte.</p>
        </div>

        <div class="nutrition-hta-controls">
          <div class="nutrition-hta-control">
            <label for="objectifSelHTAMode">Niveau retenu</label>
            <select id="objectifSelHTAMode" onchange="changerObjectifSelHTA(this.value)">
              <option value="standard" ${objectifSelHTASelectionne === "standard" ? "selected" : ""}>Repère HTA standard — 6 g/j</option>
              <option value="therapeutique5" ${objectifSelHTASelectionne === "therapeutique5" ? "selected" : ""}>Alimentation thérapeutique — 5 g/j</option>
              <option value="stricte" ${objectifSelHTASelectionne === "stricte" ? "selected" : ""}>Restriction stricte — cible prescrite</option>
            </select>
          </div>

          ${objectifSelHTASelectionne === "stricte" ? `
          <div class="nutrition-hta-control">
            <label for="objectifSelHTAStrict">Cible prescrite / retenue</label>
            <div class="nutrition-target-input">
              <input
                type="number"
                id="objectifSelHTAStrict"
                min="0.1"
                max="4"
                step="0.1"
                value="${Number.isFinite(objectifSelHTAStrict) ? objectifSelHTAStrict : ""}"
                placeholder="Ex. 3,5"
                onchange="changerObjectifSelHTAStrict(this.value)"
              >
              <span>g/j</span>
            </div>
          </div>` : ""}
        </div>

        <div class="nutrition-hta-summary">
          <div>
            <span>Sel (NaCl)</span>
            <strong>${cibleSel}</strong>
            <small>${objectifSelHTA.libelle}</small>
          </div>
          <div>
            <span>Sodium équivalent</span>
            <strong>${cibleSodium}</strong>
            <small>1 g NaCl ≈ 400 mg Na</small>
          </div>
        </div>

        <p class="nutrition-calc-note">${objectifSelHTA.detail}</p>

        ${objectifSelHTASelectionne === "therapeutique5" ? `
          <p class="nutrition-hta-warning">
            La fiche AFDN/SFNCM 2022 recommande de ne pas restreindre l'apport en sel à moins de 5 g/j lorsqu'une alimentation pauvre en sel est indiquée, sauf décompensation aiguë sévère et pour une très courte durée.
          </p>` : ""}

        ${objectifSelHTASelectionne === "stricte" ? `
          <p class="nutrition-hta-warning nutrition-hta-warning-strong">
            Restriction stricte : uniquement sur décision explicite du professionnel. Les notes de cours indiquent un repère &lt; 3 – 4 g/j dans certaines situations sévères, tandis que la fiche AFDN/SFNCM 2022 déconseille généralement de descendre sous 5 g/j hors décompensation aiguë sévère et brève.
          </p>` : ""}

        <p class="nutrition-calc-note">
          Potassium : aucune cible HTA chiffrée supplémentaire n'est créée ici. La référence générale reste affichée ; son interprétation sera contextualisée avec le traitement et la biologie dans l'Analyse.
        </p>
      </section>`;
  }

  let denutritionCalculsHTML = "";
  if (denutritionDiagnostiquee && (seniorDenutri || adulteDenutri1869)) {
    const proteinesRation = proteinesG;
    const azoteRation = proteinesRation > 0 ? proteinesRation / 6.25 : null;
    const glucidesKcalRation = glucidesG * 4;
    const lipidesKcalRation = lipidesG * 9;
    const caloriesNonProteiquesRation = glucidesKcalRation + lipidesKcalRation;
    const rapportRation = azoteRation > 0 ? caloriesNonProteiquesRation / azoteRation : null;
    const fmt = (v, unite, d = 0) => Number.isFinite(v) ? `${v.toFixed(d)} ${unite}` : "—";

    denutritionCalculsHTML = `
      <section class="nutrition-calc-card nutrition-denutrition-card">
        <div class="nutrition-denutrition-ratio">
          <div class="nutrition-denutrition-ratio-header">
            <div>
              <span class="nutrition-calc-kicker">Besoins recommandés</span>
              <h4>Rapport calorico-azoté des besoins recommandés</h4>
            </div>
            <span id="rca-calculs-resultat" class="nutrition-denutrition-ratio-result">${fmt(rapportRation, "kcal/g N")}</span>
          </div>
          <div class="nutrition-denutrition-ratio-grid">
            <div class="nutrition-denutrition-row"><span>Protéines</span><strong id="rca-calculs-proteines">${fmt(proteinesRation, "g", 1)}</strong></div>
            <div class="nutrition-denutrition-row"><span>Azote</span><strong id="rca-calculs-azote">${fmt(azoteRation, "g N", 1)}</strong></div>
            <div class="nutrition-denutrition-row"><span>Énergie glucidique</span><strong id="rca-calculs-glucides">${fmt(glucidesKcalRation, "kcal")}</strong></div>
            <div class="nutrition-denutrition-row"><span>Énergie lipidique</span><strong id="rca-calculs-lipides">${fmt(lipidesKcalRation, "kcal")}</strong></div>
            <div class="nutrition-denutrition-row nutrition-denutrition-ratio-subtotal"><span>Calories non protéiques</span><strong id="rca-calculs-cnp">${fmt(caloriesNonProteiquesRation, "kcal")}</strong></div>
            <div class="nutrition-denutrition-row nutrition-denutrition-ratio-final"><span>Rapport</span><strong id="rca-calculs-rapport">${fmt(rapportRation, "kcal/g N")}</strong></div>
          </div>
          <div class="nutrition-denutrition-formulas">
            <span>Azote = protéines ÷ 6,25</span>
            <span>Calories non protéiques = glucides × 4 + lipides × 9</span>
            <span>Rapport = calories non protéiques ÷ azote</span>
          </div>
        </div>
        <p class="nutrition-calc-note">Calcul fondé sur la ration effectivement retenue dans « Références et objectifs nutritionnels ». Aucune interprétation clinique automatique du rapport n’est appliquée.</p>
      </section>`;
  }

  container.innerHTML = `
        <div class="nutrition-calculs-grid">
            <section class="nutrition-calc-card nutrition-body-card">
                <div class="nutrition-calc-card-header">
                    <span class="nutrition-calc-kicker">Anthropométrie</span>
                    <h3>Profil corporel</h3>
                </div>

                <div class="nutrition-metrics">
                    <div class="nutrition-metric">
                        <span>IMC</span>
                        <strong>${imc.toFixed(1)} kg/m²</strong>
                        <small>${interpretationIMC}</small>
                    </div>

                    <div class="nutrition-metric">
                        <span>Poids</span>
                        <strong>${poids.toFixed(1)} kg</strong>
                        <small>Taille : ${tailleCm} cm</small>
                    </div>

                    <div class="nutrition-metric">
                        <span>Repère pondéral (IMC)</span>
                        <strong>${reperePonderal?.applicable
                          ? `${reperePonderal.poidsMin.toFixed(1)} – ${reperePonderal.poidsMax.toFixed(1)} kg`
                          : "—"}</strong>
                        <small>${reperePonderal?.applicable
                          ? `Correspond à un IMC de 18,5 – 24,9 chez l’adulte — OMS. Ce repère ne constitue pas un objectif pondéral automatique.${age >= 70 && Number.isFinite(reperePonderal.seuilDenutritionSenior)
                              ? `<br>≥70 ans : ${reperePonderal.seuilDenutritionSenior.toFixed(1)} kg correspond à un IMC de 22 ; un IMC &lt;22 est un critère phénotypique de dénutrition — HAS 2021.`
                              : ""}`
                          : (reperePonderal?.message ?? "Repère non disponible.")}</small>
                    </div>

                    <div class="nutrition-metric">
                        <span>Poids cible de travail</span>
                        <div class="nutrition-target-input">
                            <input
                                type="number"
                                id="poidsCibleCalculs"
                                min="0"
                                step="0.1"
                                value="${Number.isFinite(poidsCibleTravail) ? poidsCibleTravail : ""}"
                                placeholder="À définir"
                                oninput="changerPoidsCibleTravail(this.value)"
                                aria-label="Poids cible de travail"
                            >
                            <span>kg</span>
                        </div>
                        <small id="poidsCibleCalculsDetail">${detailPoidsCible}</small>
                    </div>
                </div>
            </section>

            <section class="nutrition-calc-card nutrition-energy-card">
                <div class="nutrition-calc-card-header">
                    <span class="nutrition-calc-kicker">Énergie</span>
                    <h3>Besoins énergétiques</h3>
                </div>

                ${construireBlocParametresEnergetiques()}

                <div class="nutrition-energy-main">
                    <div>
                        <span>Métabolisme de base / repos estimé</span>
                        <strong>${Math.round(metabolismeRepos)} <small>kcal/j</small></strong>
                        <small>${FORMULES_METABOLISME[formuleMetabolismeSelectionnee].source}</small>
                    </div>
                
                    <div>
                        <span>${seniorDenutri ? "Besoins énergétiques — dénutrition" : "Besoins énergétiques journaliers"}</span>
                        <strong>${seniorDenutri
                          ? `${Math.round(energieDenutritionMin)} – ${Math.round(energieDenutritionMax)}`
                          : Math.round(besoinsEnergetiques)} <small>kcal/j</small></strong>
                        ${seniorDenutri
                          ? `<small>30 – 40 kcal/kg/j × ${poids.toFixed(1)} kg — HAS 2007</small>`
                          : `<small>MB × PAL ${normaliserPAL(activite).toFixed(2).replace(".", ",")}</small>`}
                        ${adulteDenutri1869 && Number.isFinite(repereEspenEnergie1869)
                          ? `<small>Repère hospitalier complémentaire ESPEN 2021 : ≈ ${Math.round(repereEspenEnergie1869)} kcal/j (30 kcal/kg/j), non appliqué automatiquement à l'objectif ambulatoire.</small>`
                          : ""}
                    </div>
                </div>


            </section>
                </div>

        ${obesiteCalculsHTML}

        <section class="nutrition-calc-card nutrition-energy-target-card">
                <label class="nutrition-target-label" for="objectifEnergetique">
                    Objectif énergétique de travail
                </label>

                <div class="nutrition-target-input">
                    <input type="number" id="objectifEnergetique" min="0" step="10" value="${Math.round(objectifEnergetique)}" oninput="mettreAJourMacronutriments()">
                    <span>kcal/j</span>
                </div>

                <p class="nutrition-calc-note">${seniorDenutri
                  ? "Une dénutrition est diagnostiquée chez une personne de 70 ans ou plus : NutriFlow applique ici la plage spécifique HAS de 30 – 40 kcal/kg/j. L’objectif de travail est initialisé sur la borne basse et reste à individualiser par le professionnel."
                  : adulteDenutri1869
                    ? `Une dénutrition est diagnostiquée chez un adulte de 18 à 69 ans : l'objectif énergétique de travail reste initialisé sur l'estimation issue de Calculs nutritionnels (MB × PAL). Le repère ESPEN 2021 d'environ ${Math.round(repereEspenEnergie1869)} kcal/j correspond au contexte hospitalier et reste affiché à titre complémentaire, sans être appliqué automatiquement.`
                    : "Valeur initialisée sur les besoins estimés ; à adapter selon l’objectif et l’évaluation du professionnel."}</p>
</section>
${denutritionCalculsHTML}

<section class="nutrition-calc-card nutrition-macros-card">
            <div class="nutrition-calc-card-header">
               <span class="nutrition-calc-kicker">Ration de travail</span>
               <h3>Répartition des macronutriments</h3>
               <p>Les repères s'adaptent au contexte clinique. Les curseurs correspondent uniquement à la ration choisie par le diététicien et ne sont jamais modifiés automatiquement par une pathologie.</p>
            </div>

            <div id="nutritionMacroContext" class="nutrition-macro-context"></div>
            <div id="nutritionMacroActive" class="nutrition-macro-active"></div>

            <details id="nutritionMacroEditor" class="nutrition-macro-editor">
              <summary>
                <span>Personnaliser la ration de travail</span>
                <small>Modifier volontairement protéines, glucides et lipides</small>
              </summary>
              <div class="nutrition-macro-editor-body">
                <div id="nutritionMacros" class="nutrition-macros-grid"></div>
                <div class="nutrition-macro-editor-footer">
                  <div id="nutritionMacroTotal" class="nutrition-macro-total" aria-live="polite"></div>
                  <div class="nutrition-macro-actions">
                    <button type="button" class="btn-secondary" data-macro-reset>Réinitialiser à 15 / 50 / 35</button>
                    <button type="button" class="btn-primary" data-macro-apply>Utiliser comme ration de travail</button>
                  </div>
                </div>
              </div>
            </details>
        </section>


        ${diabeteCalculsHTML}
        ${htaCalculsHTML}

        <section class="nutrition-calc-card nutrition-reference-card">

            <div class="nutrition-calc-card-header">
                <span class="nutrition-calc-kicker">
                    Références nutritionnelles
                </span>

                <h3>Références et objectifs nutritionnels</h3>

                <p>
                    ${denutritionDiagnostiquee
                      ? (seniorDenutri
                          ? "Références générales CSS 2016 avec adaptation spécifique de la dénutrition ≥70 ans selon HAS 2007. Les micronutriments restent individualisés selon le contexte clinique."
                          : "Références générales CSS 2016. Chez les 18 – 69 ans dénutris, les repères protéino-énergétiques ESPEN 2021 sont affichés comme repères hospitaliers complémentaires et ne remplacent pas automatiquement l'objectif ambulatoire de travail. La composition 45–50 % glucides / 35–40 % lipides du régime hospitalier ESPEN n'est pas utilisée comme plage de validation des sliders ambulatoires.")
                      : "Références générales issues du CSS 2016. Les objectifs de travail restent individualisables par le diététicien."}
                </p>
            </div>

            <div class="nutrition-reference-table-wrapper">

                <table class="nutrition-reference-table">

                    <thead>
                        <tr>
                            <th>Nutriment</th>
                            <th>Référence</th>
                            <th>Besoins recommandés</th>
                            <th>Source officielle</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${denutritionDiagnostiquee && (seniorDenutri || adulteDenutri1869) ? `
                        <tr class="nutrition-reference-section">
                            <th colspan="4">Adaptation — Dénutrition</th>
                        </tr>
                        <tr>
                            <td>${seniorDenutri ? "Énergie" : "Énergie — repère hospitalier complémentaire"}</td>
                            <td>${seniorDenutri ? "30 – 40 kcal/kg/j" : "≈ 30 kcal/kg/j"}</td>
                            <td>${seniorDenutri
                              ? `${Math.round(energieDenutritionMin)} – ${Math.round(energieDenutritionMax)} kcal/j`
                              : `${Math.round(repereEspenEnergie1869)} kcal/j ${iconeInformationNutrition("Repère hospitalier complémentaire ESPEN 2021, non appliqué automatiquement à l’objectif ambulatoire.")}`}</td>
                            <td>${seniorDenutri ? "HAS 2007" : "ESPEN 2021 — contexte hospitalier"}</td>
                        </tr>
                        ${adulteDenutri1869 ? `
                        <tr>
                            <td>Protéines — repère hospitalier complémentaire</td>
                            <td>≥ 1,2 g/kg/j</td>
                            <td>≥ ${repereEspenProteines1869.toFixed(1)} g/j ${iconeInformationNutrition("Repère hospitalier complémentaire ESPEN 2021 : ≥ 1,2 g/kg/j. Il n’est pas transformé automatiquement en prescription ambulatoire.")}</td>
                            <td>ESPEN 2021 — contexte hospitalier</td>
                        </tr>` : ""}` : ""}

                        <tr class="nutrition-reference-section">
                            <th colspan="4">Macronutriments</th>
                        </tr>

                        ${obesitePerteProgressiveActive ? `
                        <tr class="nutrition-reference-pathology">
                            <td>Énergie — perte pondérale progressive</td>
                            <td>Déficit de 600 à 1 000 kcal/j</td>
                            <td>
                              <strong>${Math.round(objectifEnergetique)} kcal/j</strong>
                              <br><small>Objectif énergétique de travail retenu</small>
                            </td>
                            <td>BASO 2020</td>
                        </tr>` : ""}

                        <tr>
                            <td>Protéines</td>
                            <td>${seniorDenutri
                              ? "1,2 – 1,5 g/kg/j"
                              : obesitePerteProgressiveActive
                                ? "15 % AET · limite supérieure 25 % AET"
                                : "0,83 g/kg/j · ≈ 15 % AET"}</td>
                            <td id="reference-ration-proteines">
                              ${obesitePerteProgressiveActive
                                ? `<strong>${Math.round(objectifEnergetique * 0.15 / 4)} – ${Math.round(objectifEnergetique * 0.25 / 4)} g/j</strong><br><small>Conversion du repère BASO sur l’objectif énergétique de travail</small>`
                                : `<strong>${Math.round(objectifsNutritionnels.proteines.objectif ?? (objectifEnergetique * etatRepartitionMacros.proteines / 100 / 4))} g/j</strong>${poids > 0 && objectifEnergetique > 0 ? `<br><small>${((objectifsNutritionnels.proteines.objectif ?? (objectifEnergetique * etatRepartitionMacros.proteines / 100 / 4)) / poids).toFixed(2)} g/kg/j</small>` : ""}`}
                            </td>
                            <td>${seniorDenutri
                              ? "HAS 2007"
                              : obesitePerteProgressiveActive
                                ? "BASO 2020"
                                : "CSS 2016"}</td>
                        </tr>

                        <tr>
                            <td>Glucides</td>
                            <td>${obesitePerteProgressiveActive
                              ? "50 – 55 % AET"
                              : diabeteActive
                                ? "Répartition individualisée — aucun pourcentage spécifique imposé"
                                : "50 – 55 % AET"}</td>
                            <td id="reference-ration-glucides">
                              ${obesitePerteProgressiveActive
                                ? `<strong>${Math.round(objectifEnergetique * 0.50 / 4)} – ${Math.round(objectifEnergetique * 0.55 / 4)} g/j</strong><br><small>Conversion du repère BASO sur l’objectif énergétique de travail</small>`
                                : `<strong>${Math.round(objectifEnergetique * etatRepartitionMacros.glucides / 100 / 4)} g/j</strong>`}
                            </td>
                            <td>${obesitePerteProgressiveActive
                              ? "BASO 2020"
                              : diabeteActive
                                ? "Individualisation clinique"
                                : "CSS 2016"}</td>
                        </tr>

                        ${obesitePerteProgressiveActive ? `
                        <tr class="nutrition-reference-pathology">
                            <td>Sucres ajoutés</td>
                            <td>≤ 10 % AET</td>
                            <td>≤ ${Math.round(objectifEnergetique * 0.10 / 4)} g/j</td>
                            <td>BASO 2020</td>
                        </tr>` : ""}

                        <tr>
                            <td>Lipides</td>
                            <td>${obesitePerteProgressiveActive
                              ? "20 – 30 % AET"
                              : "30 – 35 % AET"}</td>
                            <td id="reference-ration-lipides">
                              ${obesitePerteProgressiveActive
                                ? `<strong>${Math.round(objectifEnergetique * 0.20 / 9)} – ${Math.round(objectifEnergetique * 0.30 / 9)} g/j</strong><br><small>Conversion du repère BASO sur l’objectif énergétique de travail</small>`
                                : `<strong>${Math.round(objectifEnergetique * etatRepartitionMacros.lipides / 100 / 9)} g/j</strong>`}
                            </td>
                            <td>${obesitePerteProgressiveActive
                              ? "BASO 2020"
                              : "CSS 2016"}</td>
                        </tr>

                        <tr>
                            <td>Fibres</td>
                            <td>≥ 25 - 30 g/j </td>
                            <td>≥ 25 - 30 g/j </td>
                            <td>${obesitePerteProgressiveActive ? "BASO 2020" : "CSS 2016"}</td>
                        </tr>

                        <tr>
                            <td>Acides gras saturés (AGS)</td>
                            <td>&lt; 10 % AET</td>
                            <td id="reference-ration-ags"><strong>≤ ${agsMaxG.toFixed(0)} g/j</strong></td>
                            <td>${obesitePerteProgressiveActive ? "BASO 2020" : "CSS 2016"}</td>
                        </tr>

                        <tr>
                            <td>Acides gras mono-insaturés (AGMI)</td>
                            <td>10 – 20 % AET</td>
                            <td id="reference-ration-agmi"><strong>${agmiMinG.toFixed(0)} – ${(objectifEnergetique * 0.20 / 9).toFixed(0)} g/j</strong></td>
                            <td>${obesitePerteProgressiveActive ? "BASO 2020" : "CSS 2016"}</td>
                        </tr>

                        <tr>
                            <td>Acides gras poly-insaturés (AGPI)</td>
                            <td>5 – 10 % AET</td>
                            <td id="reference-ration-agpi"><strong>${agpiMinG.toFixed(0)} – ${agpiMaxG.toFixed(0)} g/j</strong></td>
                            <td>${obesitePerteProgressiveActive ? "BASO 2020" : "CSS 2016"}</td>
                        </tr>

                        <tr>
                            <td>Oméga-6 (n-6)</td>
                            <td>4 – 8 % AET</td>
                            <td id="reference-ration-omega6"><strong>${(objectifEnergetique * 0.04 / 9).toFixed(0)} – ${(objectifEnergetique * 0.08 / 9).toFixed(0)} g/j</strong></td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Oméga-3 (n-3)</td>
                            <td>1 – 2 % AET</td>
                            <td id="reference-ration-omega3"><strong>${(objectifEnergetique * 0.01 / 9).toFixed(1)} – ${(objectifEnergetique * 0.02 / 9).toFixed(1)} g/j</strong></td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>EPA + DHA</td>
                            <td>250 – 500 mg/j</td>
                            <td>250 – 500 mg/j</td>
                            <td>CSS 2016</td>
                        </tr>


                        <tr class="nutrition-reference-section">
                            <th colspan="4">Minéraux</th>
                        </tr>

                        ${htaActive && objectifSelHTA ? `
                        <tr class="nutrition-reference-pathology">
                            <td>Sel (NaCl) — adaptation HTA</td>
                            <td>${objectifSelHTA.mode === "standard"
                              ? "≤ 6 g/j"
                              : objectifSelHTA.mode === "therapeutique5"
                                ? "5 g/j"
                                : "Cible stricte prescrite"}</td>
                            <td><strong>${Number.isFinite(objectifSelHTA.selMax)
                              ? `${objectifSelHTA.selMax.toFixed(1).replace(".", ",")} g/j`
                              : "À définir"}</strong></td>
                            <td>${objectifSelHTA.source}</td>
                        </tr>` : ""}

                        <tr>
                            <td>Calcium</td>
                            <td>${obesitePerteProgressiveActive ? "950 – 1 000 mg/j" : "950 mg/j"}</td>
                            <td>${obesitePerteProgressiveActive ? "950 – 1 000 mg/j" : "950 mg/j"}</td>
                            <td>${obesitePerteProgressiveActive ? "BASO 2020" : "CSS 2016"}</td>
                        </tr>

                        <tr>
                            <td>Phosphore</td>
                            <td>800 mg/j</td>
                            <td>800 mg/j</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Magnésium</td>
                            <td>300 – 350 mg/j</td>
                            <td>${besoinsSexe.magnesium !== null ? besoinsSexe.magnesium + " mg/j" : "—"}</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Sodium</td>
                            <td>${age > 60 ? "500 – 1 600 mg/j" : "600 – 2 000 mg/j"}</td>
                            <td>${besoinsSexe.sodiumMin.toLocaleString("fr-FR")} – ${besoinsSexe.sodiumMax.toLocaleString("fr-FR")} mg/j</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Potassium</td>
                            <td>3 000 – 4 000 mg/j</td>
                            <td>3 000 – 4 000 mg/j</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Fer</td>
                            <td>${estHomme ? "9 mg/j" : estFemme ? (age >= 61 || menopause ? "9 mg/j" : "15 mg/j") : "9 – 15 mg/j"}</td>
                            <td>${besoinsSexe.fer !== null ? besoinsSexe.fer + " mg/j" : "—"}</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Zinc</td>
                            <td>8 – 11 mg/j</td>
                            <td>${besoinsSexe.zinc !== null ? besoinsSexe.zinc + " mg/j" : "—"}</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Sélénium</td>
                            <td>70 µg/j</td>
                            <td>70 µg/j</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Cuivre</td>
                            <td>${age > 70 ? "1,7 mg/j" : estFemme ? "1,2 mg/j" : estHomme ? "1,7 mg/j" : "1,2 – 1,7 mg/j"}</td>
                            <td>${age > 70 ? "1,7 mg/j" : estFemme ? "1,2 mg/j" : estHomme ? "1,7 mg/j" : "1,2 – 1,7 mg/j"}</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Iode</td>
                            <td>150 µg/j</td>
                            <td>${besoinsSexe.iode} µg/j</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Sel (NaCl)</td>
                            <td>${htaActive && objectifSelHTA
                              ? (objectifSelHTA.mode === "standard" ? "≤ 6 g/j" : objectifSelHTA.mode === "therapeutique5" ? "5 g/j" : "Cible stricte prescrite")
                              : obesitePerteProgressiveActive
                                ? "≤ 5 g/j"
                                : "≤ 5 g/j"}</td>
                            <td>${htaActive && objectifSelHTA && Number.isFinite(objectifSelHTA.selMax)
                              ? `${objectifSelHTA.selMax.toFixed(1).replace(".", ",")} g/j`
                              : "≤ 5 g/j"}</td>
                            <td>${htaActive && objectifSelHTA
                              ? objectifSelHTA.source
                              : obesitePerteProgressiveActive
                                ? "BASO 2020"
                                : "CSS 2016"}</td>
                        </tr>

                        <tr>
                            <td>Cholestérol</td>
                            <td>&lt; 300 mg/j</td>
                            <td>&lt; 300 mg/j</td>
                            <td>${obesitePerteProgressiveActive ? "BASO 2020" : "CSS 2016"}</td>
                        </tr>


                        <tr class="nutrition-reference-section">
                            <th colspan="4">Vitamines</th>
                        </tr>

                        <tr>
                            <td>Vitamine A</td>
                            <td>650 – 750 µg/j</td>
                            <td>${besoinsSexe.vitamineA !== null ? besoinsSexe.vitamineA + " µg/j" : "—"}</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Vitamine D</td>
                            <td>${age > 70 ? "20 µg/j" : "10 – 15 µg/j"}</td>
                            <td>${besoinsSexe.vitamineDMin === besoinsSexe.vitamineDMax ? `${besoinsSexe.vitamineDMin} µg/j` : `${besoinsSexe.vitamineDMin} – ${besoinsSexe.vitamineDMax} µg/j`}</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Vitamine E</td>
                            <td>11 – 13 mg/j</td>
                            <td>${besoinsSexe.vitamineE !== null ? besoinsSexe.vitamineE + " mg/j" : "—"}</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Vitamine K1</td>
                            <td>50 – 70 µg/j</td>
                            <td>50 – 70 µg/j</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Vitamine C</td>
                            <td>110 mg/j</td>
                            <td>110 mg/j</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Vitamine B1</td>
                            <td>${age > 70 ? "1,3 mg/j" : "1,1 – 1,5 mg/j"}</td>
                            <td>${besoinsSexe.vitamineB1 !== null ? besoinsSexe.vitamineB1.toFixed(1).replace(".", ",") + " mg/j" : "—"}</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Vitamine B2</td>
                            <td>${age > 70 ? "1,3 – 1,6 mg/j" : "1,2 – 1,5 mg/j"}</td>
                            <td>${besoinsSexe.vitamineB2 !== null ? besoinsSexe.vitamineB2.toFixed(1).replace(".", ",") + " mg/j" : "—"}</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Vitamine B6</td>
                            <td>2 – 3 mg/j</td>
                            <td>${besoinsSexe.vitamineB6 !== null ? besoinsSexe.vitamineB6 + " mg/j" : "—"}</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Vitamine B3</td>
                            <td>14 – 16 mg/j</td>
                            <td>${besoinsSexe.niacine !== null ? besoinsSexe.niacine + " mg/j" : "—"}</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Vitamine B5</td>
                            <td>5 mg/j</td>
                            <td>5 mg/j</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Vitamine B8</td>
                            <td>40 µg/j</td>
                            <td>40 µg/j</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Vitamine B9</td>
                            <td>${age > 70 ? "200 µg/j" : "200 – 300 µg/j"}</td>
                            <td>${besoinsSexe.vitamineB9Min === besoinsSexe.vitamineB9Max ? `${besoinsSexe.vitamineB9Min} µg/j` : `${besoinsSexe.vitamineB9Min} – ${besoinsSexe.vitamineB9Max} µg/j`}</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr>
                            <td>Vitamine B12</td>
                            <td>${age > 70 ? "4,5 µg/j" : "4,0 µg/j"}</td>
                            <td>${besoinsSexe.vitamineB12.toFixed(1).replace(".", ",")} µg/j</td>
                            <td>CSS 2016</td>
                        </tr>

                        <tr class="nutrition-reference-section">
                            <th colspan="4">Hydratation</th>
                        </tr>

                        <tr>
                            <td>Eau totale</td>
                            <td>${estHomme ? "2,5 L/j" : estFemme ? "2,0 L/j" : "2,0 – 2,5 L/j"}</td>
                            <td>${besoinsSexe.eauTotale !== null ? `${besoinsSexe.eauTotale.toLocaleString("fr-FR")} mL/j` : "—"}</td>
                            <td>EFSA 2010</td>
                        </tr>

                    </tbody>

                </table>

            </div>

        </section>

        

    `;
  mettreAJourMacronutriments();
}

function sommeRepartitionMacronutriments(repartition = brouillonRepartitionMacros) {
  return ["proteines", "glucides", "lipides"]
    .reduce((total, id) => total + (Number(repartition?.[id]) || 0), 0);
}

function obtenirPathologiesActivesCalculs() {
  return new Set(
    Array.from(document.querySelectorAll('input[name="pathologies"]:checked'))
      .map(input => input.value)
  );
}

function obtenirReferentielMacronutrimentsCalculs(energie) {
  const age = Number(document.getElementById("age")?.value);
  const poids = Number(document.getElementById("poids")?.value) || 0;
  const pathologies = obtenirPathologiesActivesCalculs();
  const denutrition = typeof evaluerDenutritionHAS === "function" ? evaluerDenutritionHAS() : null;
  const denutritionDiagnostiquee = denutrition?.diagnostic === true;
  const seniorDenutri = denutritionDiagnostiquee && Number.isFinite(age) && age >= 70;
  const adulteDenutri1869 = denutritionDiagnostiquee && Number.isFinite(age) && age >= 18 && age < 70;
  const diabete = pathologies.has("Diabète");
  const hta = pathologies.has("Hypertension");
  const dyslipidemie = pathologies.has("Dyslipidémie");
  const obesite = pathologies.has("Obésité");
  const alerteTCAObesite = document.getElementById("obesiteTcaAlerte")?.value === "oui";
  const obesitePerte = obesite && objectifTherapeutiqueObesite === "perte" && !denutritionDiagnostiquee && !alerteTCAObesite;

  let contextePrincipal = "Repères généraux";
  let detailContexte = "Références générales utilisées comme point de comparaison. La ration de travail reste un choix professionnel.";

  const reperes = {
    proteines: {
      mode: "gkg-min",
      min: 0.83,
      max: null,
      libelle: "≥ 0,83 g/kg/j",
      source: "CSS 2016",
      note: "Le pourcentage énergétique n'est pas utilisé seul pour juger l'adéquation protéique."
    },
    glucides: {
      mode: "percent-range",
      min: 50,
      max: 55,
      libelle: "50 – 55 % AET",
      source: "CSS 2016"
    },
    lipides: {
      mode: "percent-range",
      min: 30,
      max: 35,
      libelle: "30 – 35 % AET",
      source: "CSS 2016"
    }
  };

  if (denutritionDiagnostiquee) {
    contextePrincipal = seniorDenutri
      ? "Dénutrition ≥ 70 ans — priorité nutritionnelle"
      : "Dénutrition — contexte prioritaire";
    detailContexte = "La dénutrition prime sur une éventuelle stratégie de perte pondérale. NutriFlow affiche les repères de renutrition sans modifier automatiquement la ration de travail.";

    if (seniorDenutri) {
      reperes.proteines = {
        mode: "gkg-range",
        min: 1.2,
        max: 1.5,
        libelle: "1,2 – 1,5 g/kg/j",
        source: "HAS 2007"
      };
    } else if (adulteDenutri1869) {
      reperes.proteines = {
        mode: "gkg-min",
        min: 0.83,
        max: null,
        libelle: "≥ 0,83 g/kg/j — repère général",
        source: "CSS 2016",
        note: "Repère hospitalier complémentaire ESPEN 2021 : ≥ 1,2 g/kg/j. Il n'est pas transformé automatiquement en prescription ambulatoire."
      };
    }

    // Les proportions 45–50 % glucides / 35–40 % lipides appartiennent au
    // « hospital diet » ESPEN 2021. En consultation ambulatoire elles restent
    // une information de contexte et ne deviennent pas des plages actives de
    // validation des sliders. Les repères généraux restent donc inchangés.
    if (adulteDenutri1869) {
      detailContexte += " Les proportions glucides/lipides du régime hospitalier ESPEN 2021 ne sont pas utilisées comme cibles ambulatoires automatiques.";
    }
  } else if (obesitePerte) {
    contextePrincipal = "Obésité — perte pondérale progressive";
    detailContexte = "Les plages BASO servent de repères. Elles ne déplacent jamais les curseurs à la place du diététicien.";
    reperes.proteines = {
      mode: "percent-range",
      min: 15,
      max: 25,
      libelle: "15 – 25 % AET",
      source: "BASO 2020"
    };
    reperes.glucides = {
      mode: "percent-range",
      min: 50,
      max: 55,
      libelle: "50 – 55 % AET",
      source: "BASO 2020"
    };
    reperes.lipides = {
      mode: "percent-range",
      min: 20,
      max: 30,
      libelle: "20 – 30 % AET",
      source: "BASO 2020"
    };
  } else if (obesite) {
    const libelles = {
      stabilisation: "stabilisation pondérale",
      prevention_reprise: "prévention de la reprise pondérale",
      habitudes: "amélioration des habitudes"
    };
    contextePrincipal = `Obésité — ${libelles[objectifTherapeutiqueObesite] || "objectif individualisé"}`;
    detailContexte = "Aucune répartition P/G/L spécifique n'est imposée pour cet objectif. Les repères généraux restent affichés et la ration est individualisée.";
  }

  const notes = [];
  if (diabete) {
    notes.push("Diabète : aucune répartition glucidique fixe n'est imposée automatiquement ; la quantité et la répartition des glucides restent à individualiser selon le traitement, les habitudes et le profil glycémique.");
    if (!obesitePerte) {
      reperes.glucides = {
        mode: "individualise",
        min: null,
        max: null,
        libelle: "Répartition individualisée",
        source: "Module diabète",
        note: "Aucun pourcentage glucidique spécifique n'est imposé par NutriFlow."
      };
    }
  }
  if (hta) {
    notes.push("HTA : pas d'adaptation automatique de la répartition P/G/L ; les adaptations portent surtout sur le sodium/sel, le potassium selon le traitement et la qualité alimentaire.");
  }
  if (dyslipidemie) {
    notes.push("Dyslipidémie : la qualité des lipides (notamment AGS et profil des sources) est plus informative qu'une modification automatique du pourcentage lipidique total.");
  }
  if (obesite && denutritionDiagnostiquee) {
    notes.push("Obésité + dénutrition : la restriction énergétique de perte pondérale est désactivée ; la correction de la dénutrition est prioritaire.");
  }
  if (obesite && alerteTCAObesite && objectifTherapeutiqueObesite === "perte") {
    notes.push("Obésité + alerte TCA : NutriFlow n'applique pas automatiquement les repères de restriction énergétique avant évaluation adaptée.");
  }

  return {
    energie,
    poids,
    contextePrincipal,
    detailContexte,
    reperes,
    notes,
    flags: { denutritionDiagnostiquee, seniorDenutri, adulteDenutri1869, diabete, hta, dyslipidemie, obesite, obesitePerte }
  };
}

function convertirRepereMacroEnQuantite(id, repere, energie, poids) {
  if (!repere) return "—";
  const kcalParG = id === "lipides" ? 9 : 4;

  if (repere.mode === "percent-range") {
    const minG = energie * repere.min / 100 / kcalParG;
    const maxG = energie * repere.max / 100 / kcalParG;
    return `${Math.round(minG)} – ${Math.round(maxG)} g/j`;
  }

  if (repere.mode === "gkg-range" && poids > 0) {
    return `${(poids * repere.min).toFixed(1)} – ${(poids * repere.max).toFixed(1)} g/j`;
  }

  if (repere.mode === "gkg-min" && poids > 0) {
    return `≥ ${(poids * repere.min).toFixed(1)} g/j`;
  }

  if (repere.mode === "individualise") return "À individualiser";
  return "—";
}

function evaluerRationMacroSelonRepere(id, pourcentage, grammesParKg, repere) {
  if (!repere || repere.mode === "individualise") {
    return { classe: "neutral", label: "À individualiser" };
  }

  let valeur = pourcentage;
  if (repere.mode.startsWith("gkg")) valeur = grammesParKg;
  if (!Number.isFinite(valeur)) return { classe: "neutral", label: "Non interprétable" };

  if (Number.isFinite(repere.min) && valeur < repere.min) {
    return { classe: "warning", label: "Sous le repère" };
  }
  if (Number.isFinite(repere.max) && valeur > repere.max) {
    return { classe: "warning", label: "Au-dessus du repère" };
  }
  return { classe: "ok", label: "Dans le repère" };
}

function actualiserEtatRationTravailUI() {
  const energie = Number(document.getElementById("objectifEnergetique")?.value) || 0;
  const poids = Number(document.getElementById("poids")?.value) || 0;
  const referentiel = obtenirReferentielMacronutrimentsCalculs(energie);
  const total = sommeRepartitionMacronutriments(brouillonRepartitionMacros);

  ["proteines", "glucides", "lipides"].forEach(id => {
    const pourcentage = Number(brouillonRepartitionMacros[id]) || 0;
    const kcalParG = id === "lipides" ? 9 : 4;
    const kcal = energie * pourcentage / 100;
    const grammes = kcal / kcalParG;
    const gkg = id === "proteines" && poids > 0 ? grammes / poids : null;
    const repere = referentiel.reperes[id];
    const statut = evaluerRationMacroSelonRepere(id, pourcentage, gkg, repere);

    const slider = document.getElementById(`macro-${id}-slider`);
    if (slider) {
      slider.value = String(pourcentage);
      slider.style.setProperty("--valeur", pourcentage);
    }
    const exact = document.getElementById(`macro-${id}-exact`);
    if (exact && document.activeElement !== exact) exact.value = String(pourcentage);
    if (slider) slider.setAttribute("aria-valuetext", `${pourcentage} %, ${Math.round(grammes)} grammes par jour`);
    document.querySelectorAll(`[data-macro-step][data-macro-id="${id}"]`).forEach(button => {
      button.disabled = Number(button.dataset.macroStep) < 0 ? pourcentage <= 0 : pourcentage >= 100;
    });
    const pct = document.getElementById(`macro-${id}-pourcentage`);
    if (pct) pct.textContent = `${pourcentage} %`;
    const g = document.getElementById(`macro-${id}-grammes`);
    if (g) g.textContent = `${Math.round(grammes)} g/j`;
    const gkgEl = document.getElementById(`macro-${id}-gkg`);
    if (gkgEl && Number.isFinite(gkg)) gkgEl.textContent = `${gkg.toFixed(2)} g/kg/j`;
    const badge = document.getElementById(`macro-${id}-statut`);
    if (badge) {
      badge.className = `nutrition-macro-status ${statut.classe}`;
      badge.textContent = statut.label;
    }
    const item = document.querySelector(`.nutrition-macro-item[data-macro="${id}"]`);
    if (item) item.dataset.status = statut.classe;
  });

  const totalEl = document.getElementById("nutritionMacroTotal");
  if (totalEl) {
    const valide = total === 100;
    totalEl.className = `nutrition-macro-total ${valide ? "ok" : "warning"}`;
    totalEl.innerHTML = `
      <span>Total de la répartition</span>
      <strong>${total} % ${valide ? "✓" : "⚠"}</strong>
      <small>${valide
        ? "La répartition peut être utilisée comme ration de travail."
        : `Ajustez volontairement les curseurs de ${Math.abs(100 - total)} point${Math.abs(100 - total) > 1 ? "s" : ""} pour atteindre 100 %. Les autres curseurs ne sont pas modifiés automatiquement.`}</small>`;
  }

  const appliquer = document.querySelector("[data-macro-apply]");
  if (appliquer) appliquer.disabled = total !== 100;
}

function mettreAJourMacronutriments() {
  const poids = Number(document.getElementById("poids")?.value) || 0;
  const input = document.getElementById("objectifEnergetique");
  const container = document.getElementById("nutritionMacros");
  if (!input || !container) return;

  const energie = Number(input.value) || 0;
  const referentiel = obtenirReferentielMacronutrimentsCalculs(energie);
  const contexte = document.getElementById("nutritionMacroContext");
  const actif = document.getElementById("nutritionMacroActive");

  if (contexte) {
    contexte.innerHTML = `
      <div class="nutrition-macro-context-main">
        <span>Contexte des repères</span>
        <strong>${referentiel.contextePrincipal}</strong>
        <small>${referentiel.detailContexte}</small>
      </div>
      ${referentiel.notes.length ? `
        <div class="nutrition-macro-context-notes">
          ${referentiel.notes.map(note => `<p>${note}</p>`).join("")}
        </div>` : ""}`;
  }

  if (actif) {
    const p = etatRepartitionMacros.proteines;
    const g = etatRepartitionMacros.glucides;
    const l = etatRepartitionMacros.lipides;
    const statutsActifs = [
      ["Protéines", "proteines", p],
      ["Glucides", "glucides", g],
      ["Lipides", "lipides", l]
    ].map(([label, id, valeur]) => {
      const kcalParG = id === "lipides" ? 9 : 4;
      const grammes = energie * valeur / 100 / kcalParG;
      const gkg = id === "proteines" && poids > 0 ? grammes / poids : null;
      const statut = evaluerRationMacroSelonRepere(id, valeur, gkg, referentiel.reperes[id]);
      return `<span class="nutrition-macro-active-badge ${statut.classe}">${label} : ${statut.label}</span>`;
    }).join("");

    actif.innerHTML = `
      <div>
        <span>Ration de travail actuellement utilisée</span>
        <strong>${p} % protéines · ${g} % glucides · ${l} % lipides</strong>
        <div class="nutrition-macro-active-badges">${statutsActifs}</div>
      </div>
      <small>Cette répartition est celle utilisée par les calculs et les comparaisons tant qu'une nouvelle ration n'est pas validée.</small>`;
  }

  const valeurs = [
    { id: "proteines", nom: "Protéines", kcalParG: 4 },
    { id: "glucides", nom: "Glucides", kcalParG: 4 },
    { id: "lipides", nom: "Lipides", kcalParG: 9 }
  ];

  container.innerHTML = valeurs.map(({ id, nom, kcalParG }) => {
    const ratio = Number(brouillonRepartitionMacros[id]) || 0;
    const kcal = energie * ratio / 100;
    const grammes = kcal / kcalParG;
    const repere = referentiel.reperes[id];
    const conversion = convertirRepereMacroEnQuantite(id, repere, energie, poids);
    const gkg = id === "proteines" && poids > 0 ? grammes / poids : null;
    const statut = evaluerRationMacroSelonRepere(id, ratio, gkg, repere);

    return `
      <div class="nutrition-macro-item" data-macro="${id}" data-status="${statut.classe}">
        <div class="nutrition-macro-header">
          <span>${nom}</span>
          <strong id="macro-${id}-pourcentage">${ratio} %</strong>
        </div>

        <div class="nutrition-macro-reference">
          <span>Repère pertinent</span>
          <strong>${repere.libelle}</strong>
          <small>${conversion} · ${repere.source}</small>
          ${repere.note ? remarqueRepereNutrition(repere.note) : ""}
        </div>

        <div class="macro-adjustment">
          <div class="macro-range-control">
            <button type="button" class="macro-step" data-macro-step="-1" data-macro-id="${id}" aria-label="Diminuer ${nom} de 1 point">−</button>
            <input type="range" class="macro-slider" id="macro-${id}-slider" min="0" max="100" step="1" value="${ratio}" style="--valeur: ${ratio}" aria-label="${nom} en pourcentage de l'apport énergétique">
            <button type="button" class="macro-step" data-macro-step="1" data-macro-id="${id}" aria-label="Augmenter ${nom} de 1 point">+</button>
          </div>
          <div class="macro-exact-control">
            <label for="macro-${id}-exact">Part de l'énergie</label>
            <div><input type="number" class="macro-exact" id="macro-${id}-exact" data-macro-id="${id}" min="0" max="100" step="1" value="${ratio}" aria-label="${nom} : pourcentage exact"><span aria-hidden="true">%</span></div>
          </div>
        </div>

        <div class="nutrition-macro-values">
          <strong id="macro-${id}-grammes">${Math.round(grammes)} g/j</strong>
          ${id === "proteines" ? `
            <span class="nutrition-macro-gkg">
              <strong id="macro-${id}-gkg">${Number.isFinite(gkg) ? gkg.toFixed(2) : "—"} g/kg/j</strong>
            </span>` : ""}
          <span id="macro-${id}-statut" class="nutrition-macro-status ${statut.classe}">${statut.label}</span>
        </div>
      </div>`;
  }).join("");

  actualiserEtatRationTravailUI();
  mettreAJourObjectifsNutritionnelsSelonEnergie(energie);
}

function mettreAJourObjectifsNutritionnelsSelonEnergie(energie) {
  if (!Number.isFinite(energie) || energie <= 0) return;

  const referentiel = obtenirReferentielMacronutrimentsCalculs(energie);
  const poids = Number(document.getElementById("poids")?.value) || 0;

  ["proteines", "glucides", "lipides"].forEach(id => {
    const cellule = document.getElementById(`reference-ration-${id}`);
    if (!cellule) return;
    const repere = referentiel.reperes[id];
    const conversion = convertirRepereMacroEnQuantite(id, repere, energie, poids);

    if (repere.mode === "individualise") {
      cellule.innerHTML = `<strong>À individualiser</strong><br><small>${repere.note || "Aucune cible fixe automatique."}</small>`;
      return;
    }

    const complement = id === "proteines" && repere.note
      ? remarqueRepereNutrition(repere.note)
      : "";
    cellule.innerHTML = `<strong>${conversion}</strong>${complement}`;
  });

  actualiserRapportCaloricoAzoteCalculs();

  const ags = document.getElementById("reference-ration-ags");
  const agmi = document.getElementById("reference-ration-agmi");
  const agpi = document.getElementById("reference-ration-agpi");
  if (ags) ags.innerHTML = `<strong>&lt; ${Math.round(energie * 0.10 / 9)} g/j</strong>`;
  if (agmi) agmi.innerHTML = `<strong>${Math.round(energie * 0.10 / 9)} – ${Math.round(energie * 0.20 / 9)} g/j</strong>`;
  if (agpi) agpi.innerHTML = `<strong>${Math.round(energie * 0.05 / 9)} – ${Math.round(energie * 0.10 / 9)} g/j</strong>`;

  const omega6 = document.getElementById("reference-ration-omega6");
  const omega3 = document.getElementById("reference-ration-omega3");
  if (omega6) omega6.innerHTML = `<strong>${(energie * 0.04 / 9).toFixed(0)} – ${(energie * 0.08 / 9).toFixed(0)} g/j</strong>`;
  if (omega3) omega3.innerHTML = `<strong>${(energie * 0.01 / 9).toFixed(1)} – ${(energie * 0.02 / 9).toFixed(1)} g/j</strong>`;
}

function mettreAJourValeurMacronutriment(id, pourcentage) {
  if (!["proteines", "glucides", "lipides"].includes(id)) return;
  brouillonRepartitionMacros[id] = Math.max(0, Math.min(100, Math.round(Number(pourcentage) || 0)));
  actualiserEtatRationTravailUI();
}

function utiliserRationTravailMacronutriments() {
  if (sommeRepartitionMacronutriments(brouillonRepartitionMacros) !== 100) return false;
  etatRepartitionMacros = { ...brouillonRepartitionMacros };
  calculerEtAfficherNutritionnels();
  if (typeof rafraichirSortiesPathologiques === "function") rafraichirSortiesPathologiques();
  if (typeof sauvegarderDossierAutomatiquement === "function" && patientActif) sauvegarderDossierAutomatiquement();
  return true;
}

function reinitialiserBrouillonMacronutriments() {
  brouillonRepartitionMacros = { ...REPARTITION_MACRONUTRIMENTS_DEFAUT };
  mettreAJourMacronutriments();
}

window.utiliserRationTravailMacronutriments = utiliserRationTravailMacronutriments;
window.reinitialiserBrouillonMacronutriments = reinitialiserBrouillonMacronutriments;

function actualiserRapportCaloricoAzoteCalculs() {
  const resultat = document.getElementById("rca-calculs-resultat");
  if (!resultat) return;
  const energie = Number(document.getElementById("objectifEnergetique")?.value);
  if (!Number.isFinite(energie) || energie <= 0) return;
  const proteines = energie * etatRepartitionMacros.proteines / 100 / 4;
  const glucidesKcal = energie * etatRepartitionMacros.glucides / 100;
  const lipidesKcal = energie * etatRepartitionMacros.lipides / 100;
  const azote = proteines > 0 ? proteines / 6.25 : null;
  const cnp = glucidesKcal + lipidesKcal;
  const rapport = azote > 0 ? cnp / azote : null;
  const set = (id, v, unite, d = 0) => {
    const el = document.getElementById(id);
    if (el) el.textContent = Number.isFinite(v) ? `${v.toFixed(d)} ${unite}` : "—";
  };
  set("rca-calculs-proteines", proteines, "g", 1);
  set("rca-calculs-azote", azote, "g N", 1);
  set("rca-calculs-glucides", glucidesKcal, "kcal");
  set("rca-calculs-lipides", lipidesKcal, "kcal");
  set("rca-calculs-cnp", cnp, "kcal");
  set("rca-calculs-rapport", rapport, "kcal/g N");
  set("rca-calculs-resultat", rapport, "kcal/g N");
}


//! ANALYSE — COMPARAISON RAPPORT CALORICO-AZOTÉ //


function afficherComparaisonRapportCaloricoAzote() {
  const section = document.getElementById("analyseRapportCaloricoAzoteSection");
  const container = document.getElementById("analyseRapportCaloricoAzoteContainer");
  if (!section || !container) return;

  const age = getNombrePatient("age");
  const poids = getNombrePatient("poids");
  const tailleCm = getNombrePatient("taille");
  const sexe = document.getElementById("sexe")?.value || "";
  const activite = niveauActivitePALSelectionne;
  if (![age, poids, tailleCm].every(Number.isFinite) || poids <= 0 || tailleCm <= 0 || !sexe || !activite) {
    section.hidden = true;
    container.innerHTML = "";
    return;
  }

  const denutrition = typeof evaluerDenutritionHAS === "function" ? evaluerDenutritionHAS() : null;

  if (denutrition?.diagnostic !== true) {
    section.hidden = true;
    container.innerHTML = "";
    return;
  }

  const objectifsNutritionnels = obtenirObjectifsNutritionnelsPatient();
  const energieCible = objectifsNutritionnels?.energie?.objectif ?? null;
  if (!Number.isFinite(energieCible) || energieCible <= 0) {
    section.hidden = true;
    container.innerHTML = "";
    return;
  }
  const proteinesCible = energieCible * etatRepartitionMacros.proteines / 100 / 4;
  const glucidesCible = energieCible * etatRepartitionMacros.glucides / 100 / 4;
  const lipidesCible = energieCible * etatRepartitionMacros.lipides / 100 / 9;
  const azoteCible = proteinesCible > 0 ? proteinesCible / 6.25 : null;
  const glucidesCibleKcal = glucidesCible * 4;
  const lipidesCibleKcal = lipidesCible * 9;
  const cnpCible = glucidesCibleKcal + lipidesCibleKcal;
  const rapportCible = azoteCible > 0 ? cnpCible / azoteCible : null;
  const anamnese = typeof obtenirSyntheseAnamnese === "function" ? obtenirSyntheseAnamnese() : null;
  const totaux = anamnese?.totaux ?? null;
  const protObs = Number(totaux?.proteines);
  const glucObsG = Number(totaux?.glucides);
  const lipObsG = Number(totaux?.lipides);
  const azoteObs = Number.isFinite(protObs) && protObs > 0 ? protObs / 6.25 : null;
  const glucidesObsKcal = Number.isFinite(glucObsG) ? glucObsG * 4 : null;
  const lipidesObsKcal = Number.isFinite(lipObsG) ? lipObsG * 9 : null;
  const cnpObs = Number.isFinite(glucidesObsKcal) && Number.isFinite(lipidesObsKcal) ? glucidesObsKcal + lipidesObsKcal : null;
  const rapportObs = azoteObs && Number.isFinite(cnpObs) ? cnpObs / azoteObs : null;
  const fmtObs = (v, unite, dec = 0) => Number.isFinite(v) ? `${v.toFixed(dec)} ${unite}` : "—";
  const ecartTexte = Number.isFinite(rapportObs) && Number.isFinite(rapportCible)
    ? `${rapportObs - rapportCible >= 0 ? "+" : ""}${Math.round(rapportObs - rapportCible)} kcal/g N par rapport aux besoins recommandés`
    : "—";

  section.hidden = false;
  container.innerHTML = `
    <div class="nutrition-calc-card analyse-rca-card">
      <div class="nutrition-calc-card-header">
        <span class="nutrition-calc-kicker">État nutritionnel</span>
        <h3>Comparaison du rapport calorico-azoté</h3>
        <p>Comparaison descriptive entre les besoins recommandés retenus dans Calculs et les apports observés dans l’anamnèse.</p>
      </div>
      <div class="analyse-rca-table-wrap">
        <table class="analyse-rca-table">
          <thead><tr><th>Élément</th><th>Besoins recommandés</th><th>Apports observés (anamnèse)</th></tr></thead>
          <tbody>
            <tr><td>Protéines</td><td>${fmtObs(proteinesCible, "g", 1)}</td><td>${fmtObs(protObs, "g", 1)}</td></tr>
            <tr><td>Azote</td><td>${fmtObs(azoteCible, "g N", 1)}</td><td>${fmtObs(azoteObs, "g N", 1)}</td></tr>
            <tr><td>Énergie glucidique</td><td>${fmtObs(glucidesCibleKcal, "kcal")}</td><td>${fmtObs(glucidesObsKcal, "kcal")}</td></tr>
            <tr><td>Énergie lipidique</td><td>${fmtObs(lipidesCibleKcal, "kcal")}</td><td>${fmtObs(lipidesObsKcal, "kcal")}</td></tr>
            <tr><td>Calories non protéiques</td><td>${fmtObs(cnpCible, "kcal")}</td><td>${fmtObs(cnpObs, "kcal")}</td></tr>
            <tr class="analyse-rca-final"><td>Rapport calorico-azoté</td><td>${fmtObs(rapportCible, "kcal/g N")}</td><td>${fmtObs(rapportObs, "kcal/g N")}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="analyse-rca-summary">
        <span>Écart descriptif</span>
        <strong>${ecartTexte}</strong>
      </div>
      <p class="nutrition-calc-note">Cet écart décrit uniquement la différence entre les besoins recommandés retenus et les apports observés. Il n’est pas interprété automatiquement comme adéquat ou inadéquat.</p>
    </div>`;
}


//! ORCHESTRATEUR CENTRAL DES MODULES PATHOLOGIQUES //


const modulesPathologiques = new Map();
let rafraichissementPathologiqueTimer = null;

function enregistrerModulePathologique(configuration = {}) {
  const id = String(configuration.id ?? "").trim();
  if (!id) return false;

  modulesPathologiques.set(id, {
    id,
    champs: new Set(Array.isArray(configuration.champs) ? configuration.champs.filter(Boolean) : []),
    selecteurs: Array.isArray(configuration.selecteurs) ? configuration.selecteurs.filter(Boolean) : [],
    analyse: typeof configuration.analyse === "function" ? configuration.analyse : null,
    priseEnCharge: typeof configuration.priseEnCharge === "function" ? configuration.priseEnCharge : null
  });

  return true;
}

function cibleConcerneModulePathologique(cible) {
  if (!cible || typeof cible.matches !== "function") return false;

  // Les contrôles purement techniques ne modifient pas l'analyse clinique.
  if (
    cible.id === "darkModeToggle" ||
    cible.id === "recherchePatient" ||
    cible.matches(".anm-food-search")
  ) {
    return false;
  }

  // Principe de sécurité : toute donnée saisie dans le dossier peut, à terme,
  // influencer plusieurs modules. On préfère un rafraîchissement transversal
  // à une liste de dépendances incomplète. Le rendu n'est exécuté que si
  // l'onglet Analyse ou Prise en charge est actuellement visible.
  if (
    cible.matches("input, select, textarea") &&
    cible.closest?.(".workspace")
  ) {
    return true;
  }

  // Les sélecteurs enregistrés restent disponibles pour d'éventuels contrôles
  // cliniques situés hors du workspace principal.
  for (const module of modulesPathologiques.values()) {
    if (cible.id && module.champs.has(cible.id)) return true;

    for (const selecteur of module.selecteurs) {
      try {
        if (cible.matches(selecteur)) return true;
      } catch (erreur) {
        console.warn(`Sélecteur pathologique invalide pour ${module.id} :`, selecteur, erreur);
      }
    }
  }

  return false;
}

function executerRenduModulesPathologiques(type) {
  for (const module of modulesPathologiques.values()) {
    const rendu = type === "analyse" ? module.analyse : module.priseEnCharge;
    if (typeof rendu !== "function") continue;

    try {
      rendu();
    } catch (erreur) {
      console.error(`Échec du rendu ${type} pour le module ${module.id} :`, erreur);
    }
  }
}

function rafraichirAnalysesPathologiques() {
  executerRenduModulesPathologiques("analyse");
}

function rafraichirPrisesEnChargePathologiques() {
  executerRenduModulesPathologiques("priseEnCharge");
}

function rafraichirSortiesPathologiques() {
  const analyseActive = document.getElementById("plan")?.classList.contains("active") === true;
  const priseEnChargeActive = document.getElementById("pathologies")?.classList.contains("active") === true;

  if (analyseActive) rafraichirAnalysesPathologiques();
  if (priseEnChargeActive) rafraichirPrisesEnChargePathologiques();
}

function planifierRafraichissementPathologique() {
  clearTimeout(rafraichissementPathologiqueTimer);
  rafraichissementPathologiqueTimer = setTimeout(() => {
    rafraichissementPathologiqueTimer = null;
    rafraichirSortiesPathologiques();
  }, 0);
}

window.enregistrerModulePathologique = enregistrerModulePathologique;
window.rafraichirAnalysesPathologiques = rafraichirAnalysesPathologiques;
window.rafraichirPrisesEnChargePathologiques = rafraichirPrisesEnChargePathologiques;
window.rafraichirSortiesPathologiques = rafraichirSortiesPathologiques;
window.planifierRafraichissementPathologique = planifierRafraichissementPathologique;

// Un seul point d'écoute pour les sorties Analyse / Prise en charge.
document.addEventListener("input", event => {
  if (cibleConcerneModulePathologique(event.target)) {
    planifierRafraichissementPathologique();
  }
});

document.addEventListener("change", event => {
  if (cibleConcerneModulePathologique(event.target)) {
    planifierRafraichissementPathologique();
  }
});


//! NAVIGATION ENTRE LES ONGLETS //


function ouvrirOnglet(id, bouton) {
  window.clinicalSession?.capture();
  bouton = bouton || document.querySelector(`.nav-tab[aria-controls="${id}"]`);
  anmFermerDetailNutritionnel();
  // Masquer tous les onglets
  const onglets = document.querySelectorAll(".tab-content");
  onglets.forEach(onglet => {
    onglet.classList.remove("active");
  });

  //* Désactiver tous les boutons

  const boutons = document.querySelectorAll(".nav-tab");
  boutons.forEach(btn => {
    btn.classList.remove("active");
    btn.setAttribute("aria-selected", "false");
  });

  //* Afficher l'onglet sélectionné

  const onglet = document.getElementById(id);

  if (onglet) {
    onglet.classList.add("active");
  }

  if (id === "calculs") {
    calculerEtAfficherNutritionnels();
  }

  if (id === "plan") {
    renderRecommandationsNutritionnelles();

    if (typeof afficherComparaisonRapportCaloricoAzote === "function") {
      afficherComparaisonRapportCaloricoAzote();
    }

    rafraichirAnalysesPathologiques();
  }

  if (id === "pathologies") {
    rafraichirPrisesEnChargePathologiques();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  //* Activer le bouton sélectionné

  if (bouton) {
    bouton.classList.add("active");
    bouton.setAttribute("aria-selected", "true");
  }
}

function anmNouvelleLigne(mealIndex = 0, food = null) {
  return {
    id: Date.now() + Math.random(),
    meal: mealIndex,
    foodId: food ? food.id : null,
    foodName: food ? food.name : "",
    group: food ? food.group : "",
    frequency: 7,
    quantity: food ? 100 : "",
    selected: Boolean(food)
  };
}

function anmGetNutrients(row) {
  const food = anmFindFoodById(row.foodId);
  const quantity = anmParseNumber(row.quantity);
  const frequency = anmParseNumber(row.frequency);
  const nutrientCount = 38;

  if (!food || quantity <= 0 || frequency <= 0) {
    return {
      weight: 0,
      values: Array(nutrientCount).fill(null),
      kcal: 0,
      quality: {
        sources: Array(nutrientCount).fill(null),
        censored: Array(nutrientCount).fill(false),
        energySource: null,
        energyCensored: false
      }
    };
  }

  //* poids/j = quantité × fréquence / 7

  const weight = Math.round(quantity * frequency / 7 * 10) / 10;

  //* null reste null : une donnée Ciqual absente ne doit jamais devenir 0.
  //* Les métadonnées p/c de Composition V2 permettent de distinguer une valeur
  //* Ciqual directe d'un fallback documenté sans modifier le contrat historique n[].

  const provenance = food.p && typeof food.p === "object" ? food.p : {};
  const censures = new Set(Array.isArray(food.c) ? food.c.map(String) : []);
  const sources = Array(nutrientCount).fill(null);
  const censored = Array(nutrientCount).fill(false);

  const values = Array.from({ length: nutrientCount }, (_, index) => {
    const value = food.n?.[index];
    if (!Number.isFinite(value)) return null;

    sources[index] = provenance[String(index)] || "CIQUAL_DIRECT";
    censored[index] = censures.has(String(index));
    return Math.round(value * weight / 100 * 1000) / 1000;
  });

  //* Énergie : valeur réglementaire Ciqual en priorité. Le calcul 4/4/9 n'est
  //* qu'un fallback lorsque l'énergie officielle n'est pas disponible.

  const energieCiqual = Number(food.e);
  const macrosComplets = [values[1], values[2], values[3]].every(Number.isFinite);
  let kcal = null;
  let energySource = null;
  let energyCensored = false;

  if (Number.isFinite(energieCiqual)) {
    kcal = Math.round(energieCiqual * weight / 100 * 10) / 10;
    energySource = provenance.e || "CIQUAL_DIRECT";
    energyCensored = censures.has("e");
  } else if (macrosComplets) {
    kcal = Math.round((values[1] * 4 + values[3] * 9 + values[2] * 4) * 10) / 10;
    energySource = "CALCULE_4_4_9";
  }

  return {
    weight,
    values,
    kcal,
    quality: { sources, censored, energySource, energyCensored }
  };
}

const ANM_SEARCH_SYNONYMES = Object.freeze([
  // Boissons gazeuses / sodas — termes usuels et marques courantes vers les libellés CIQUAL.
  { alias: ["soda", "sodas", "soft drink", "soft drinks"], termes: ["boisson gazeuse", "cola", "limonade"] },
  { alias: ["coca", "coca cola", "coca-cola", "coke", "pepsi"], termes: ["cola"] },
  { alias: ["fanta", "orangina"], termes: ["boisson gazeuse aux fruits", "boisson gazeuse aromatisee"] },
  { alias: ["sprite", "7up", "7 up", "seven up"], termes: ["limonade", "boisson gazeuse aromatisee"] },

  // Boissons énergisantes.
  { alias: ["red bull", "redbull", "monster", "energy drink", "energy drinks", "boisson energetique", "boissons energetiques"], termes: ["boisson energisante"] },

  // Thés glacés.
  { alias: ["ice tea", "icetea", "iced tea", "lipton ice tea", "fuze tea", "fuzetea"], termes: ["boisson au the aromatisee"] },

  // Tonics / bitters.
  { alias: ["schweppes", "eau tonique", "tonic water"], termes: ["tonic", "bitter"] },

  // Sirops dilués.
  { alias: ["grenadine", "menthe a l eau", "sirop a l eau", "sirop dilue"], termes: ["boisson preparee a partir de sirop"] },

  // Jus — formulations courantes.
  { alias: ["jus orange", "orange juice"], termes: ["jus d orange"] },
  { alias: ["jus pomme", "apple juice"], termes: ["jus de pomme"] },
  { alias: ["jus multifruit", "jus multi fruit", "multifruit"], termes: ["jus multifruit", "nectar multifruit"] },

  // Autres écritures fréquentes.
  { alias: ["milk shake", "milk-shake"], termes: ["milkshake"] },

  // Qualificatifs commerciaux usuels.
  { alias: ["zero", "zéro", "light", "diet"], termes: ["sans sucres ajoutes avec edulcorants", "a teneur reduite en sucres"] }
]);

function anmNormaliserExpressionRecherche(value) {
  return anmNormalizeSearch(value)
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function anmRechercheContientSynonyme(query) {
  const recherche = anmNormaliserExpressionRecherche(query);
  if (!recherche) return false;
  const encadree = ` ${recherche} `;

  return ANM_SEARCH_SYNONYMES.some(groupe =>
    groupe.alias.some(aliasBrut => {
      const alias = anmNormaliserExpressionRecherche(aliasBrut);
      return alias && encadree.includes(` ${alias} `);
    })
  );
}

function anmEtendreRechercheAvecSynonymes(query) {
  const initial = anmNormaliserExpressionRecherche(query);
  if (!initial) return [];

  const variantes = new Set([initial]);
  const file = [initial];
  const limite = 40;

  while (file.length && variantes.size < limite) {
    const courant = file.shift();

    for (const groupe of ANM_SEARCH_SYNONYMES) {
      for (const aliasBrut of groupe.alias) {
        const alias = anmNormaliserExpressionRecherche(aliasBrut);
        if (!alias) continue;

        const motif = new RegExp(`(^|\\s)${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "\\s+")}(?=\\s|$)`);
        if (!motif.test(courant)) continue;

        for (const termeBrut of groupe.termes) {
          const terme = anmNormaliserExpressionRecherche(termeBrut);
          const remplacee = courant.replace(motif, (match, prefixe) => `${prefixe}${terme}`).replace(/\s+/g, " ").trim();
          if (remplacee && !variantes.has(remplacee)) {
            variantes.add(remplacee);
            file.push(remplacee);
            if (variantes.size >= limite) break;
          }
        }
      }
    }
  }

  return Array.from(variantes);
}

function anmCorrespondanceSynonymeStricte(nomNormalise, requeteNormalisee) {
  const motsRecherche = requeteNormalisee.split(/\s+/).filter(Boolean);
  const motsNom = nomNormalise.split(/\s+/).filter(Boolean);
  return motsRecherche.length > 0 && motsRecherche.every(mot =>
    motsNom.some(motNom => motNom === mot || motNom.startsWith(mot))
  );
}

function anmScoreNomRecherche(nomNormalise, requeteNormalisee) {
  if (!nomNormalise || !requeteNormalisee) return 0;

  const words = requeteNormalisee.split(/\s+/).filter(Boolean);
  const nameWords = nomNormalise.split(/[\s,;:/()\-]+/).filter(Boolean);
  let score = 0;

  //* Correspondance exacte
  if (nomNormalise === requeteNormalisee) score += 100000;

  //* Le nom commence par toute la recherche
  if (nomNormalise.startsWith(requeteNormalisee)) score += 50000;

  //* Chaque mot est évalué selon sa position et sa position dans un mot
  words.forEach(word => {
    const position = nomNormalise.indexOf(word);
    if (position === 0) {
      score += 20000;
    } else if (position > 0) {
      const before = nomNormalise[position - 1];
      score += /[\s,;:/()\-]/.test(before) ? 12000 : 2500;
      score += Math.max(0, 1000 - position);
    }

    if (nameWords.includes(word)) score += 7000;
    if (nameWords.some(nameWord => nameWord.startsWith(word))) score += 3500;
  });

  if (words.length && words.every(word => nomNormalise.includes(word))) score += 15000;
  return score;
}

function anmSearchFoods(query) {
  if (!Array.isArray(CIQUAL_ALIMENTS) || !CIQUAL_ALIMENTS.length) return [];

  const requetes = anmEtendreRechercheAvecSynonymes(query);
  if (!requetes.length) return [];
  const requeteInitiale = requetes[0];
  const utiliseSynonyme = anmRechercheContientSynonyme(requeteInitiale);

  return CIQUAL_ALIMENTS.map(food => {
    const name = String(food.name || "");
    const normalized = anmNormaliserExpressionRecherche(name);
    let score = 0;

    requetes.forEach((requete, index) => {
      // Si un terme usuel a été reconnu (ex. Red Bull), on évite que les mots
      // de la marque produisent des résultats partiels sans rapport dans CIQUAL.
      if (index === 0 && utiliseSynonyme && !normalized.includes(requeteInitiale)) return;

      // Les variantes synonymes utilisent une correspondance plus stricte afin
      // d'éviter par exemple « cola » -> « chocolat ».
      if (index > 0 && !anmCorrespondanceSynonymeStricte(normalized, requete)) return;

      const scoreRequete = anmScoreNomRecherche(normalized, requete);
      // La saisie exacte reste prioritaire sur les synonymes.
      const penaliteSynonyme = index === 0 ? 0 : 1500;
      score = Math.max(score, Math.max(0, scoreRequete - penaliteSynonyme));
    });

    // Bonus si le texte saisi lui-même est présent dans le libellé CIQUAL.
    if (normalized.includes(requeteInitiale)) score += 3000;

    return { food, score, name: normalized };
  })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score !== a.score ? b.score - a.score : a.name.localeCompare(b.name, "fr"))
    .slice(0, 30)
    .map(result => result.food);
}

function anmCloseSearchMenus() {
  document.querySelectorAll(".anm-row-search-results").forEach(box => {
    box.hidden = true;
    box.style.display = "none";
    box.innerHTML = "";
  });
}

function anmPositionSearchMenu(box, input) {
  if (!box || !input) return;
  const rect = input.getBoundingClientRect();
  Object.assign(box.style, {
    position: "absolute",
    left: `${rect.left + window.scrollX}px`,
    top: `${rect.bottom + window.scrollY + 5}px`,
    width: `${rect.width}px`,
    zIndex: "2147483647",
    display: "block"
  });
}

function anmSearchRowFood(id, query) {
  const box = document.getElementById(`anm-food-results-${id}`);
  const input = document.querySelector(`.anm-food-search[data-row-id="${id}"]`);
  if (!box || !input) return;
  const q = String(query || "").trim();
  if (!q) {
    box.hidden = true;
    box.style.display = "none";
    box.innerHTML = "";
    return;
  }
  const results = anmSearchFoods(q);
  if (!results.length) {
    box.innerHTML = `
            <div class="anm-search-empty">
                Aucun aliment trouvé.
            </div>
        `;
  } else {
    box.innerHTML = results.map((food, index) => `
            <button
                type="button"
                class="anm-search-item"
                data-result-index="${index}"
                onclick="event.stopPropagation(); anmChooseRowFood(${id}, ${index}, this)"
            >
                <span class="anm-search-item-main">
                    <strong>${echapperHTML(food.name)}</strong>
                    <small>${echapperHTML(food.group || "Base CIQUAL")}</small>
                </span>

                <span class="anm-search-item-code">
                    ${echapperHTML(food.code)}
                </span>
            </button>
        `).join("");
  }

  if (box.parentElement !== document.body) {
    document.body.appendChild(box);
  }
  box.hidden = false;
  anmPositionSearchMenu(box, input);
}

function anmRepositionOpenSearchMenus() {
  document.querySelectorAll(".anm-row-search-results:not([hidden])").forEach(box => {
    const id = box.id.replace("anm-food-results-", "");
    const input = document.querySelector(`.anm-food-search[data-row-id="${id}"]`);
    if (input) {
      anmPositionSearchMenu(box, input);
    }
  });
}

function anmEvaluerEtatValidation() {
  const lignes = Array.isArray(anmRows) ? anmRows : [];
  const lignesConsommees = lignes.filter(row => {
    const resultat = anmGetNutrients(row);
    return Number.isFinite(resultat?.weight) && resultat.weight > 0;
  });
  const lignesIncompletes = lignes.filter(row => {
    if (!row) return false;
    const aUneSaisie = Boolean(row.selected || row.foodId || String(row.foodName || "").trim() || String(row.quantity || "").trim());
    if (!aUneSaisie) return false;
    const resultat = anmGetNutrients(row);
    return !Number.isFinite(resultat?.weight) || resultat.weight <= 0;
  });

  return {
    aDesAliments: lignesConsommees.length > 0,
    lignesConsommees: lignesConsommees.length,
    lignesIncompletes: lignesIncompletes.length,
    peutValider: lignesConsommees.length > 0 && lignesIncompletes.length === 0
  };
}

function anmMettreAJourEtatValidation() {
  const badge = document.getElementById("anm-validation-state");
  const texte = document.getElementById("anm-validation-text");
  const bouton = document.getElementById("anm-validation-button");
  const evaluation = anmEvaluerEtatValidation();

  if (!badge || !texte || !bouton) return;

  badge.classList.remove("is-ready", "is-warning");

  if (anamneseValideePourAnalyse && evaluation.peutValider) {
    badge.textContent = "Prête pour l’analyse";
    badge.classList.add("is-ready");
    texte.textContent = "La saisie alimentaire a été validée. L’Analyse et les modules pathologiques peuvent interpréter les apports.";
    bouton.textContent = "Anamnèse validée";
    bouton.disabled = true;
    return;
  }

  badge.textContent = evaluation.aDesAliments ? "À valider" : "Saisie en cours";
  badge.classList.add("is-warning");
  bouton.textContent = "Valider l’anamnèse pour l’analyse";
  bouton.disabled = !evaluation.peutValider;

  if (!evaluation.aDesAliments) {
    texte.textContent = "Renseignez l’alimentation habituelle puis validez la saisie avant toute interprétation des apports.";
  } else if (evaluation.lignesIncompletes > 0) {
    texte.textContent = `${evaluation.lignesIncompletes} ligne${evaluation.lignesIncompletes > 1 ? "s sont" : " est"} encore incomplète${evaluation.lignesIncompletes > 1 ? "s" : ""}. Complétez-la ou supprimez-la avant validation.`;
  } else {
    texte.textContent = "Les apports sont calculés, mais aucune conclusion d’insuffisance ou d’excès n’est autorisée tant que vous n’avez pas validé que la saisie représente la journée habituelle.";
  }
}

function anmMarquerARevalider() {
  anamneseValideePourAnalyse = false;
}

function anmValiderPourAnalyse() {
  const evaluation = anmEvaluerEtatValidation();
  if (!evaluation.peutValider) {
    anamneseValideePourAnalyse = false;
    anmMettreAJourEtatValidation();
    return;
  }

  anamneseValideePourAnalyse = true;
  anmMettreAJourEtatValidation();
  sauvegarderDossierAutomatiquement();
  if (document.getElementById("plan")?.classList.contains("active")) {
    renderRecommandationsNutritionnelles();
    rafraichirAnalysesPathologiques();
  }
  if (document.getElementById("pathologies")?.classList.contains("active")) {
    rafraichirPrisesEnChargePathologiques();
  }
}

function anmChooseRowFood(id, resultIndex) {
  const row = anmRows.find(r => r.id === id);
  if (!row) return;
  const input = document.querySelector(`.anm-food-search[data-row-id="${id}"]`);
  if (!input) return;
  const results = anmSearchFoods(input.value);
  const food = results[resultIndex];
  if (!food) return;
  row.foodId = food.id;
  row.foodName = food.name;
  row.group = food.group || "";
  row.selected = true;
  anmMarquerARevalider();
  if (!row.quantity || Number(row.quantity) <= 0) {
    row.quantity = 100;
  }
  anmCloseSearchMenus();
  anmRender();
  sauvegarderDossierAutomatiquement();
}

function anmAjouterLigneRepas(mealIndex) {
  anmRows.push(anmNouvelleLigne(mealIndex, null));
  anmMarquerARevalider();
  anmRender();
  sauvegarderDossierAutomatiquement();
}

function anmSupprimerLigne(id) {
  anmRows = anmRows.filter(row => row.id !== id);
  anmMarquerARevalider();
  anmRender();
  sauvegarderDossierAutomatiquement();
}

function anmEffacerTout() {
  if (!anmRows.length) return;
  if (confirm("Effacer toute l'anamnèse alimentaire ?")) {
    anmRows = [];
    anmMarquerARevalider();
    anmRender();
    sauvegarderDossierAutomatiquement();
  }
}

function anmUpdateRow(id, field, value) {
  const row = anmRows.find(item => item.id === id);
  if (!row) return;
  row[field] = value;
  anmMarquerARevalider();
  anmRender();
  sauvegarderDossierAutomatiquement();
}

function anmAfficherBilan(bilan, key, unit, valeurIndisponible = "Non disponible") {
  const indices = key === "epaDha" ? [22, 23] : [ANM_NUTRIENT_INDEXES[key]];
  const disponible = key === "energie"
    ? (bilan.kcalKnown || 0) > 0
    : indices.some(index => Number.isInteger(index) && (bilan.known?.[index] || 0) > 0);

  if (!disponible) return valeurIndisponible;

  const valeur = key === "energie"
    ? bilan.kcalPartial
    : indices.reduce((somme, index) => somme + (Number.isInteger(index) ? bilan.totals[index] : 0), 0)
      * (key === "epaDha" ? 1000 : 1);

  const complet = key === "energie"
    ? Number.isFinite(bilan.kcal)
    : indices.every(index => Number.isInteger(index) && bilan.complete?.[index] === true);

  const estime = key === "energie"
    ? (bilan.kcalEstimatedWeight || 0) > 0
    : indices.some(index => Number.isInteger(index) && (bilan.estimatedWeight?.[index] || 0) > 0);

  const qualite = typeof anmConstruireQualiteApport === "function"
    ? anmConstruireQualiteApport(bilan, key)
    : null;

  if (!complet && qualite?.intervalleDisponible === true && Number.isFinite(qualite?.valeurEstimee)) {
    return `≈ ${anmFormatValeur(qualite.valeurEstimee, unit)}`;
  }

  const affichage = anmFormatValeur(valeur, unit);
  if (!complet) return `≥ ${affichage} · à préciser`;
  return estime ? `≈ ${affichage}` : affichage;
}

function anmFormatValeur(value, unit, decimals = 1) {
  return Number.isFinite(value) ? value.toFixed(decimals) + ' ' + unit : 'Non disponible';
}

function anmRenderRow(row) {
  const result = anmGetNutrients(row);
  const v = result.values;
  const afficherValeur = (valeur, unite, decimales) => row.selected ? anmFormatValeur(valeur, unite, decimales) : "À renseigner";
  return `
        <tr>
            <td class="anm-food-name">
                ${row.selected ? `<strong>${echapperHTML(row.foodName)}</strong>
                       <span>${echapperHTML(row.group || "CIQUAL")}</span>` : `<div class="anm-food-picker">
                        <input
                            class="anm-food-search"
                            data-row-id="${row.id}"
                            type="search"
                            placeholder="Rechercher un aliment…"
                            autocomplete="off"
                            oninput="anmSearchRowFood(${row.id}, this.value)"
                            onclick="event.stopPropagation()">
                        <div id="anm-food-results-${row.id}" class="anm-search-results anm-row-search-results" hidden></div>
                       </div>`}
            </td>
            <td>
                <input class="anm-number-input" type="number" min="0" max="7" step="1"
                    value="${row.frequency}"
                    aria-label="Fréquence hebdomadaire de ${echapperHTML(row.foodName || 'cet aliment')}"
                    onchange="anmUpdateRow(${row.id}, 'frequency', this.value)">
            </td>
            <td>
                <input class="anm-number-input" type="number" min="0" step="1"
                    value="${row.quantity}"
                    aria-label="Quantité en grammes de ${echapperHTML(row.foodName || 'cet aliment')}"
                    onchange="anmUpdateRow(${row.id}, 'quantity', this.value)">
            </td>
            <td class="anm-result-cell">${row.selected ? `${result.weight.toFixed(1)} g` : "À renseigner"}</td>
            <td class="anm-result-cell">${afficherValeur(v[1], "g")}</td>
            <td class="anm-result-cell">${afficherValeur(v[2], "g")}</td>
            <td class="anm-result-cell">${afficherValeur(v[3], "g")}</td>
            <td class="anm-result-cell">${afficherValeur(result.kcal, "kcal", 0)}</td>
            <td>
                <button type="button" class="anm-delete-button"
                    title="Supprimer" aria-label="Supprimer ${echapperHTML(row.foodName || 'la ligne alimentaire')}" onclick="anmSupprimerLigne(${row.id})">×</button>
            </td>
        </tr>`;
}

function anmRender() {
  anmCloseSearchMenus();
  document.querySelectorAll("body > .anm-row-search-results").forEach(box => box.remove());
  const container = document.getElementById("anm-repas-container");
  if (!container) return;
  container.innerHTML = ANM_MEALS.map((meal, mealIndex) => {
    const rows = anmRows.filter(row => row.meal === mealIndex);
    const daily = anmGetDailyTotals(rows);
    const mealTotals = daily.totals.map((value, index) => daily.complete[index] ? value : null);
    const mealKcal = daily.kcal;
    const mealWeight = daily.weight;
    const mealNutrients = [['energie', 'Énergie', 'kcal'], ...ANM_NUTRIENTS];
    return `
            <section class="anm-meal">
                <div class="anm-meal-header">
                    <div>
                        <h3>${meal}</h3>
                        <span>${rows.length} aliment${rows.length > 1 ? "s" : ""}</span>
                    </div>
                    <button type="button" class="anm-secondary-button"
                        onclick="anmAjouterLigneRepas(${mealIndex})">+ Aliment</button>
                </div>
                ${rows.length ? `<div class="anm-table-wrap">
                        <table class="anm-table">
                            <thead><tr>
                                <th>Aliment</th><th>Fréquence / 7</th><th>Quantité (g)</th>
                                <th>Poids / j</th><th>Protéines</th><th>Glucides</th>
                                <th>Lipides</th><th>Énergie</th><th></th>
                            </tr></thead>
                            <tbody>${rows.map(anmRenderRow).join("")}</tbody>
                        </table>
                       </div>` : `<div class="anm-empty">Aucun aliment renseigné pour ce repas.</div>`}
                <div class="anm-meal-detail-action">
                    <button type="button" class="anm-meal-detail-button"
                            onclick="anmOuvrirDetailNutritionnelRepas(${mealIndex})">
                        Voir le détail nutritionnel de ce repas
                        <span aria-hidden="true">→</span>
                    </button>
                </div>
            </section>`;
  }).join("");
  anmRenderTotals();
  anmMettreAJourEtatValidation();
}

// Composition V2 — moteur de confiance des apports.
// Les valeurs manquantes ne sont jamais transformées silencieusement en zéros.
// Pour réduire les « À préciser » inutiles, NutriFlow construit uniquement un
// intervalle plausible à partir de la distribution CIQUAL du même grand groupe.
// Cet intervalle sert à l'interprétation ; il n'est jamais enregistré comme une
// valeur analytique de l'aliment.
const ANM_STATS_COMPOSITION_GROUPE = new Map();

function anmQuantileComposition(valeursTriees, quantile) {
  if (!Array.isArray(valeursTriees) || valeursTriees.length === 0) return null;
  if (valeursTriees.length === 1) return valeursTriees[0];
  const position = (valeursTriees.length - 1) * quantile;
  const bas = Math.floor(position);
  const haut = Math.ceil(position);
  if (bas === haut) return valeursTriees[bas];
  const fraction = position - bas;
  return valeursTriees[bas] + (valeursTriees[haut] - valeursTriees[bas]) * fraction;
}

function anmSourceAdmissiblePourStatistique(food, indexOuEnergie) {
  const provenance = food?.p && typeof food.p === "object" ? food.p : {};
  const source = indexOuEnergie === "e"
    ? (provenance.e || "CIQUAL_DIRECT")
    : (provenance[String(indexOuEnergie)] || "CIQUAL_DIRECT");

  // On évite de fabriquer une nouvelle estimation de groupe à partir de valeurs
  // déjà imputées par CALNUT. Les alternatives officielles CIQUAL restent admises.
  return !String(source || "").startsWith("CALNUT_2020_");
}

function anmObtenirStatistiquesCompositionGroupe(food, indexOuEnergie) {
  const groupe = String(food?.group || "").trim();
  if (!groupe) return null;

  const cle = `${groupe}::${indexOuEnergie}`;
  if (ANM_STATS_COMPOSITION_GROUPE.has(cle)) {
    return ANM_STATS_COMPOSITION_GROUPE.get(cle);
  }

  const valeurs = (Array.isArray(CIQUAL_ALIMENTS) ? CIQUAL_ALIMENTS : [])
    .filter(item => String(item?.group || "").trim() === groupe)
    .filter(item => anmSourceAdmissiblePourStatistique(item, indexOuEnergie))
    .map(item => indexOuEnergie === "e" ? Number(item?.e) : Number(item?.n?.[indexOuEnergie]))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  // Un groupe trop peu documenté ne permet pas d'encadrer proprement la valeur.
  if (valeurs.length < 12) {
    ANM_STATS_COMPOSITION_GROUPE.set(cle, null);
    return null;
  }

  const statistiques = {
    n: valeurs.length,
    mediane: anmQuantileComposition(valeurs, 0.50),
    haute: anmQuantileComposition(valeurs, 0.95)
  };

  ANM_STATS_COMPOSITION_GROUPE.set(cle, statistiques);
  return statistiques;
}

function anmConstruireQualiteApport(bilan, key) {
  if (!bilan) return null;

  const construire = ({
    valeur,
    complet,
    connus,
    knownWeight,
    estimatedWeight,
    missingMedian,
    missingUpper,
    estimableMissingWeight,
    multiplicateur = 1
  }) => {
    const poidsTotal = Number(bilan.weight) || 0;
    const valeurConnue = Number.isFinite(valeur) ? valeur * multiplicateur : null;
    const poidsConnu = Number(knownWeight) || 0;
    const poidsEstime = Number(estimatedWeight) || 0;
    const poidsManquantEstimable = Number(estimableMissingWeight) || 0;
    const couverturePoids = poidsTotal > 0 ? poidsConnu / poidsTotal : null;
    const couvertureEstimablePoids = poidsTotal > 0
      ? Math.min(1, (poidsConnu + poidsManquantEstimable) / poidsTotal)
      : null;
    const partEstimeePoids = poidsTotal > 0 ? poidsEstime / poidsTotal : null;
    const partEstimationGroupePoids = poidsTotal > 0 ? poidsManquantEstimable / poidsTotal : null;
    const partiel = complet !== true && Number(connus) > 0;

    const medianeManquante = Number(missingMedian) * multiplicateur;
    const hauteManquante = Number(missingUpper) * multiplicateur;
    const intervalleDisponible =
      partiel &&
      Number.isFinite(valeurConnue) &&
      Number.isFinite(couverturePoids) &&
      couverturePoids >= 0.70 &&
      Number.isFinite(couvertureEstimablePoids) &&
      couvertureEstimablePoids >= 0.995 &&
      Number.isFinite(medianeManquante) &&
      Number.isFinite(hauteManquante);

    return {
      valeur: valeurConnue,
      complet: complet === true,
      partiel,
      couverturePoids,
      couvertureEstimablePoids,
      estime: poidsEstime > 0,
      partEstimeePoids,
      partEstimationGroupePoids,
      borneBasse: valeurConnue,
      valeurEstimee: intervalleDisponible ? valeurConnue + medianeManquante : valeurConnue,
      borneHaute: intervalleDisponible ? valeurConnue + hauteManquante : null,
      intervalleDisponible,
      approximatif: poidsEstime > 0 || intervalleDisponible
    };
  };

  if (key === "energie") {
    return construire({
      valeur: Number.isFinite(bilan.kcal) ? bilan.kcal : bilan.kcalPartial,
      complet: Number.isFinite(bilan.kcal),
      connus: bilan.kcalKnown || 0,
      knownWeight: bilan.kcalKnownWeight,
      estimatedWeight: bilan.kcalEstimatedWeight,
      missingMedian: bilan.kcalMissingMedian,
      missingUpper: bilan.kcalMissingUpper,
      estimableMissingWeight: bilan.kcalEstimableMissingWeight
    });
  }

  if (key === "epaDha") {
    const epa = 22;
    const dha = 23;
    const valeur = ((bilan.totals?.[epa] || 0) + (bilan.totals?.[dha] || 0));
    const complet = bilan.complete?.[epa] === true && bilan.complete?.[dha] === true;
    const connus = Math.min(bilan.known?.[epa] || 0, bilan.known?.[dha] || 0);
    const knownWeight = Math.min(bilan.knownWeight?.[epa] || 0, bilan.knownWeight?.[dha] || 0);
    const estimatedWeight = Math.max(bilan.estimatedWeight?.[epa] || 0, bilan.estimatedWeight?.[dha] || 0);
    const missingMedian = (bilan.missingMedian?.[epa] || 0) + (bilan.missingMedian?.[dha] || 0);
    const missingUpper = (bilan.missingUpper?.[epa] || 0) + (bilan.missingUpper?.[dha] || 0);
    const estimableMissingWeight = Math.min(
      bilan.estimableMissingWeight?.[epa] || 0,
      bilan.estimableMissingWeight?.[dha] || 0
    );
    return construire({
      valeur,
      complet,
      connus,
      knownWeight,
      estimatedWeight,
      missingMedian,
      missingUpper,
      estimableMissingWeight,
      multiplicateur: 1000
    });
  }

  const index = ANM_NUTRIENT_INDEXES[key];
  if (!Number.isInteger(index)) return null;

  return construire({
    valeur: bilan.totals?.[index],
    complet: bilan.complete?.[index] === true,
    connus: bilan.known?.[index] || 0,
    knownWeight: bilan.knownWeight?.[index],
    estimatedWeight: bilan.estimatedWeight?.[index],
    missingMedian: bilan.missingMedian?.[index],
    missingUpper: bilan.missingUpper?.[index],
    estimableMissingWeight: bilan.estimableMissingWeight?.[index]
  });
}

function anmGetDailyTotals(rows = anmRows) {
  const nutrientCount = 38;
  const totals = Array(nutrientCount).fill(0);
  const complete = Array(nutrientCount).fill(true);
  const known = Array(nutrientCount).fill(0);
  const knownWeight = Array(nutrientCount).fill(0);
  const estimatedWeight = Array(nutrientCount).fill(0);
  const censoredWeight = Array(nutrientCount).fill(0);
  const missingMedian = Array(nutrientCount).fill(0);
  const missingUpper = Array(nutrientCount).fill(0);
  const estimableMissingWeight = Array(nutrientCount).fill(0);
  let kcalKnown = 0;
  let kcal = 0;
  let kcalComplete = true;
  let kcalKnownWeight = 0;
  let kcalEstimatedWeight = 0;
  let kcalCensoredWeight = 0;
  let kcalMissingMedian = 0;
  let kcalMissingUpper = 0;
  let kcalEstimableMissingWeight = 0;
  let weight = 0;
  let hasFood = false;

  const sourceEstimee = source => {
    const codeSource = String(source || "");
    return [
      "CIQUAL_FOLATES_TOTAUX",
      "CIQUAL_VITE_GENERIQUE",
      "CALCULE_4_4_9"
    ].includes(codeSource) || codeSource.startsWith("CALNUT_2020_");
  };

  rows.forEach(row => {
    const result = anmGetNutrients(row);
    if (result.weight <= 0) return;
    const food = anmFindFoodById(row.foodId);

    hasFood = true;
    weight += result.weight;

    if (Number.isFinite(result.kcal)) {
      kcal += result.kcal;
      kcalKnown++;
      kcalKnownWeight += result.weight;
      if (sourceEstimee(result.quality?.energySource)) kcalEstimatedWeight += result.weight;
      if (result.quality?.energyCensored === true) kcalCensoredWeight += result.weight;
    } else {
      kcalComplete = false;
      const statistiquesEnergie = typeof anmObtenirStatistiquesCompositionGroupe === "function"
        ? anmObtenirStatistiquesCompositionGroupe(food, "e")
        : null;
      if (statistiquesEnergie) {
        kcalMissingMedian += statistiquesEnergie.mediane * result.weight / 100;
        kcalMissingUpper += statistiquesEnergie.haute * result.weight / 100;
        kcalEstimableMissingWeight += result.weight;
      }
    }

    for (let index = 0; index < nutrientCount; index++) {
      const value = result.values[index];
      if (Number.isFinite(value)) {
        totals[index] += value;
        known[index]++;
        knownWeight[index] += result.weight;
        if (sourceEstimee(result.quality?.sources?.[index])) estimatedWeight[index] += result.weight;
        if (result.quality?.censored?.[index] === true) censoredWeight[index] += result.weight;
      } else {
        complete[index] = false;
        const statistiques = typeof anmObtenirStatistiquesCompositionGroupe === "function"
          ? anmObtenirStatistiquesCompositionGroupe(food, index)
          : null;
        if (statistiques) {
          missingMedian[index] += statistiques.mediane * result.weight / 100;
          missingUpper[index] += statistiques.haute * result.weight / 100;
          estimableMissingWeight[index] += result.weight;
        }
      }
    }
  });

  if (!hasFood) complete.fill(false);

  const coverageWeight = knownWeight.map(valeur => weight > 0 ? valeur / weight : null);

  return {
    totals,
    complete,
    known,
    knownWeight,
    estimatedWeight,
    censoredWeight,
    missingMedian,
    missingUpper,
    estimableMissingWeight,
    coverageWeight,
    kcalKnown,
    kcalKnownWeight,
    kcalEstimatedWeight,
    kcalCensoredWeight,
    kcalMissingMedian,
    kcalMissingUpper,
    kcalEstimableMissingWeight,
    kcalCoverageWeight: weight > 0 ? kcalKnownWeight / weight : null,
    kcalPartial: kcal,
    kcal: hasFood && kcalComplete ? kcal : null,
    weight
  };
}

function getRecommandationsBesoinsPatient(options = {}) {
  const contextePathologique = typeof options === "string"
    ? options
    : String(options?.contextePathologique ?? "").trim().toLowerCase();

  // Sans contexte explicite, on conserve le comportement global historique.
  // Lorsqu’un module pathologique demande ses propres repères, seule
  // l’adaptation correspondant à ce module peut modifier les références.
  const appliquerAdaptationObesite =
    !contextePathologique ||
    contextePathologique === "obesite";

  const age = Number(document.getElementById("age")?.value);
  const sexe = document.getElementById("sexe")?.value;
  const tailleCm = Number(document.getElementById("taille")?.value);
  const poids = Number(document.getElementById("poids")?.value);
  const activite = niveauActivitePALSelectionne;
  if (!age || !sexe || !tailleCm || !poids || !activite) return null;

  const denutritionDiagnostiqueeAnalyse = window.evaluerDenutritionHAS?.()?.diagnostic === true;
  const objectifsNutritionnels = obtenirObjectifsNutritionnelsPatient();
  const objectif = objectifsNutritionnels?.energie?.objectif ?? null;
  if (!Number.isFinite(objectif) || objectif <= 0) return null;
  const sexePatient = String(sexe || "").toLowerCase().trim();
  const estFemme = sexePatient === "femme" || sexePatient === "female";
  const estHomme = sexePatient === "homme" || sexePatient === "male";
  const menopause = estFemme && recupererValeur("menopause") === "oui";
  const ferCSS = estHomme ? 9 : estFemme ? (age >= 61 || menopause ? 9 : 15) : null;
  const sodiumMinCSS = age > 60 ? 500 : 600;
  const sodiumMaxCSS = age > 60 ? 1600 : 2000;
  const objectifSelHTA = patientAHTAActive() ? obtenirObjectifSelHTA() : null;
  const eauTotaleCSS = estFemme ? 2000 : estHomme ? 2500 : null;
  const vitamineDMinCSS = age > 70 ? 20 : 10;
  const vitamineDMaxCSS = age > 70 ? 20 : 15;
  const vitamineB1CSS = age > 70 ? 1.3 : estFemme ? 1.1 : estHomme ? 1.5 : null;
  const vitamineB2CSS = age > 70 ? (estFemme ? 1.3 : estHomme ? 1.6 : null) : estFemme ? 1.2 : estHomme ? 1.5 : null;
  const vitamineB9MinCSS = 200;
  const vitamineB9MaxCSS = age > 70 ? 200 : 300;
  const obesitePerteProgressiveAnalyse =
    appliquerAdaptationObesite &&
    document.querySelector('input[name="pathologies"][value="Obésité"]')?.checked === true &&
    objectifTherapeutiqueObesite === "perte" &&
    !denutritionDiagnostiqueeAnalyse &&
    document.getElementById("obesiteTcaAlerte")?.value !== "oui";

  const proteinesSelonRepartition = objectif * etatRepartitionMacros.proteines / 100 / 4;
  const proteinesCible = objectifsNutritionnels?.proteines?.objectif ?? proteinesSelonRepartition;
  const glucidesCible = objectif * etatRepartitionMacros.glucides / 100 / 4;
  const lipidesCible = objectif * etatRepartitionMacros.lipides / 100 / 9;

  return {
    energie: { min: objectif, max: objectif, unite: "kcal/j", type: "exact", source: "Objectif énergétique de travail" },
    protein: denutritionDiagnostiqueeAnalyse && objectifsNutritionnels?.seniorDenutri
      ? { min: proteinesCible, max: null, unite: "g/j", type: "min", affichage: `≥ ${proteinesCible.toFixed(1)} g/j`, source: "Objectif dénutrition ≥70 ans retenu dans Calculs" }
      : obesitePerteProgressiveAnalyse
        ? {
            min: objectif * 0.15 / 4,
            max: objectif * 0.25 / 4,
            unite: "g/j",
            type: "range",
            affichage: `${Math.round(objectif * 0.15 / 4)} – ${Math.round(objectif * 0.25 / 4)} g/j`,
            source: "BASO 2020"
          }
        : { min: proteinesCible, max: proteinesCible, unite: "g/j", type: "exact", source: "Besoins recommandés" },
    carbs: obesitePerteProgressiveAnalyse
      ? {
          min: objectif * 0.50 / 4,
          max: objectif * 0.55 / 4,
          unite: "g/j",
          type: "range",
          affichage: `${Math.round(objectif * 0.50 / 4)} – ${Math.round(objectif * 0.55 / 4)} g/j`,
          source: "BASO 2020"
        }
      : { min: glucidesCible, max: glucidesCible, unite: "g/j", type: "exact", source: "Besoins recommandés" },
    lipids: obesitePerteProgressiveAnalyse
      ? {
          min: objectif * 0.20 / 9,
          max: objectif * 0.30 / 9,
          unite: "g/j",
          type: "range",
          affichage: `${Math.round(objectif * 0.20 / 9)} – ${Math.round(objectif * 0.30 / 9)} g/j`,
          source: "BASO 2020"
        }
      : { min: lipidesCible, max: lipidesCible, unite: "g/j", type: "exact", source: "Besoins recommandés" },
    fiber: obesitePerteProgressiveAnalyse
      ? { min: 25, max: 30, unite: "g/j", type: "range", affichage: "25 – 30 g/j", source: "BASO 2020" }
      : { min: 25, max: null, unite: "g/j", type: "min", affichage: "≥ 25 - 30 g/j ", source: "CSS 2016" },
    ags: { min: null, max: objectif * 0.10 / 9, unite: "g/j", type: "max", affichage: `< ${Math.round(objectif * 0.10 / 9)} g/j`, source: "CSS 2016" },
    agmi: { min: objectif * 0.10 / 9, max: objectif * 0.20 / 9, unite: "g/j", type: "range", affichage: `${Math.round(objectif * 0.10 / 9)} – ${Math.round(objectif * 0.20 / 9)} g/j`, source: "CSS 2016" },
    agpi: { min: objectif * 0.05 / 9, max: objectif * 0.10 / 9, unite: "g/j", type: "range", affichage: `${Math.round(objectif * 0.05 / 9)} – ${Math.round(objectif * 0.10 / 9)} g/j`, source: "CSS 2016" },
    water: eauTotaleCSS !== null
      ? { min: eauTotaleCSS, max: null, unite: "mL/j", type: "min", affichage: `${eauTotaleCSS.toLocaleString("fr-FR")} mL/j`, source: "EFSA 2010" }
      : { label: "2,0 – 2,5 L/j d'eau totale selon le sexe", type: "unavailable", source: "EFSA 2010" },
    calcium: obesitePerteProgressiveAnalyse
      ? { min: 950, max: 1000, unite: "mg/j", type: "range", affichage: "950 – 1 000 mg/j", source: "BASO 2020" }
      : { min: 950, max: null, unite: "mg/j", type: "min", source: "CSS 2016" },
    iron: ferCSS !== null
      ? { min: ferCSS, max: null, unite: "mg/j", type: "min", source: "CSS 2016" }
      : { min: 9, max: 15, unite: "mg/j", type: "range", source: "CSS 2016" },
    zinc: estFemme
      ? { min: 8, max: null, unite: "mg/j", type: "min", source: "CSS 2016" }
      : estHomme
        ? { min: 11, max: null, unite: "mg/j", type: "min", source: "CSS 2016" }
        : { min: 8, max: 11, unite: "mg/j", type: "range", source: "CSS 2016" },
    selenium: { min: 70, max: null, unite: "µg/j", type: "min", source: "CSS 2016" },
    vitC: { min: 110, max: null, unite: "mg/j", type: "min", source: "CSS 2016" },
    vitA: estFemme
      ? { min: 650, recommendedMax: 750, upperLimit: null, unite: "µg/j", type: "recommended", affichage: "650 µg/j", source: "CSS 2016", note: "L’AMT de la vitamine A n’est pas appliqué automatiquement au total en équivalents rétinol issu des aliments." }
      : estHomme
        ? { min: 750, recommendedMax: 750, upperLimit: null, unite: "µg/j", type: "recommended", affichage: "750 µg/j", source: "CSS 2016", note: "L’AMT de la vitamine A n’est pas appliqué automatiquement au total en équivalents rétinol issu des aliments." }
        : { min: 650, recommendedMax: 750, upperLimit: null, unite: "µg/j", type: "recommended", affichage: "650 – 750 µg/j", source: "CSS 2016", note: "L’AMT de la vitamine A n’est pas appliqué automatiquement au total en équivalents rétinol issu des aliments." },
    vitD: {
      min: vitamineDMinCSS,
      recommendedMax: vitamineDMaxCSS,
      upperLimit: 50,
      unite: "µg/j",
      type: "recommended",
      affichage: `${vitamineDMinCSS === vitamineDMaxCSS ? vitamineDMinCSS : `${vitamineDMinCSS} – ${vitamineDMaxCSS}`} µg/j · AMT 50 µg/j`,
      source: "CSS 2016"
    },
    vitB1: vitamineB1CSS !== null
      ? { min: vitamineB1CSS, max: null, unite: "mg/j", type: "min", source: "CSS 2016" }
      : { min: 1.1, max: 1.5, unite: "mg/j", type: "range", source: "CSS 2016" },
    vitB2: vitamineB2CSS !== null
      ? { min: vitamineB2CSS, max: null, unite: "mg/j", type: "min", source: "CSS 2016" }
      : { min: 1.2, max: 1.6, unite: "mg/j", type: "range", source: "CSS 2016" },
    vitB9: {
      min: vitamineB9MinCSS,
      recommendedMax: vitamineB9MaxCSS,
      upperLimit: null,
      unite: "µg/j",
      type: "recommended",
      affichage: `${vitamineB9MinCSS === vitamineB9MaxCSS ? vitamineB9MinCSS : `${vitamineB9MinCSS} – ${vitamineB9MaxCSS}`} µg/j`,
      source: "CSS 2016",
      note: "L’AMT de 1 000 µg/j concerne l’acide folique synthétique ; il n’est pas appliqué aux folates alimentaires estimés par l’anamnèse."
    },
    omega6: { min: objectif * 0.04 / 9, max: objectif * 0.08 / 9, unite: "g/j", type: "range", source: "CSS 2016" },
    omega3: { min: objectif * 0.01 / 9, max: objectif * 0.02 / 9, unite: "g/j", type: "range", source: "CSS 2016" },
    epaDha: { min: 250, max: 500, unite: "mg/j", type: "range", source: "CSS 2016" },
    trans: { label: "Le plus faible possible", source: "CSS 2016" },
    phosphorus: { min: 800, max: null, unite: "mg/j", type: "min", source: "CSS 2016" },
    magnesium: estFemme
      ? { min: 300, max: null, unite: "mg/j", type: "min", source: "CSS 2016" }
      : estHomme
        ? { min: 350, max: null, unite: "mg/j", type: "min", source: "CSS 2016" }
        : { min: 300, max: 350, unite: "mg/j", type: "range", source: "CSS 2016" },
    sodium: { min: sodiumMinCSS, max: sodiumMaxCSS, unite: "mg/j", type: "range", affichage: `${sodiumMinCSS.toLocaleString("fr-FR")} – ${sodiumMaxCSS.toLocaleString("fr-FR")} mg/j`, source: "CSS 2016" },
    potassium: { min: 3000, recommendedMax: 4000, upperLimit: null, unite: "mg/j", type: "recommended", affichage: "3 000 – 4 000 mg/j", source: "CSS 2016", note: "La borne 4 000 mg/j est une recommandation, pas un apport maximal tolérable alimentaire. Les situations rénales ou thérapeutiques sont gérées dans les modules cliniques." },
    vitE: estFemme
      ? { min: 11, recommendedMax: 13, upperLimit: 150, unite: "mg/j", type: "recommended", affichage: "11 mg/j · AMT 150 mg/j", source: "CSS 2016" }
      : estHomme
        ? { min: 13, recommendedMax: 13, upperLimit: 150, unite: "mg/j", type: "recommended", affichage: "13 mg/j · AMT 150 mg/j", source: "CSS 2016" }
        : { min: 11, recommendedMax: 13, upperLimit: 150, unite: "mg/j", type: "recommended", affichage: "11 – 13 mg/j · AMT 150 mg/j", source: "CSS 2016" },
    vitK: { min: 50, recommendedMax: 70, upperLimit: 1000, unite: "µg/j", type: "recommended", affichage: "50 – 70 µg/j · AMT 1 000 µg/j", source: "CSS 2016" },
    vitB3: estFemme
      ? { min: 14, max: null, unite: "mg/j", type: "min", source: "CSS 2016" }
      : estHomme
        ? { min: 16, max: null, unite: "mg/j", type: "min", source: "CSS 2016" }
        : { min: 14, max: 16, unite: "mg/j", type: "range", source: "CSS 2016" },
    vitB5: { min: 5, max: null, unite: "mg/j", type: "min", source: "CSS 2016" },
    vitB6: estFemme
      ? { min: 2, recommendedMax: 3, upperLimit: 25, unite: "mg/j", type: "recommended", affichage: "2 mg/j · AMT 25 mg/j", source: "CSS 2016" }
      : estHomme
        ? { min: 3, recommendedMax: 3, upperLimit: 25, unite: "mg/j", type: "recommended", affichage: "3 mg/j · AMT 25 mg/j", source: "CSS 2016" }
        : { min: 2, recommendedMax: 3, upperLimit: 25, unite: "mg/j", type: "recommended", affichage: "2 – 3 mg/j · AMT 25 mg/j", source: "CSS 2016" },
    vitB8: { label: "40 µg/j", type: "unavailable", source: "CSS 2016" },
    copper: age > 70
      ? { min: 1.7, max: null, unite: "mg/j", type: "min", source: "CSS 2016" }
      : estFemme
        ? { min: 1.2, max: null, unite: "mg/j", type: "min", source: "CSS 2016" }
        : estHomme
          ? { min: 1.7, max: null, unite: "mg/j", type: "min", source: "CSS 2016" }
          : { min: 1.2, max: 1.7, unite: "mg/j", type: "range", source: "CSS 2016" },
    iodine: { min: 150, max: null, unite: "µg/j", type: "min", source: "CSS 2016" },
    salt: objectifSelHTA && Number.isFinite(objectifSelHTA.selMax)
      ? {
          min: null,
          max: objectifSelHTA.selMax,
          unite: "g/j",
          type: "max",
          affichage: `≤ ${objectifSelHTA.selMax.toFixed(1).replace(".", ",")} g/j`,
          source: objectifSelHTA.source
        }
      : { min: null, max: 5, unite: "g/j", type: "max", source: obesitePerteProgressiveAnalyse ? "BASO 2020" : "CSS 2016" },
    cholesterol: { min: null, max: 300, unite: "mg/j", type: "max", source: obesitePerteProgressiveAnalyse ? "BASO 2020" : "CSS 2016" },
    vitB12: { min: age > 70 ? 4.5 : 4.0, max: null, unite: "µg/j", type: "min", source: "CSS 2016" }
  };
}

function analyserStatutApport(value, reference, options = {}) {
  const partiel = typeof options === "boolean" ? options : options?.partiel === true;
  const qualite = typeof options === "object" && options ? options.qualite ?? null : null;

  if (reference?.type === "unavailable") return { label: "Non évalué", classe: "non-evalue", certitude: "non_evaluable" };
  if (!Number.isFinite(value) || !reference) return { label: "Non évalué", classe: "non-evalue", certitude: "non_evaluable" };

  if (partiel) {
    const borneBasse = Number.isFinite(qualite?.borneBasse) ? qualite.borneBasse : value;
    const borneHaute = qualite?.intervalleDisponible === true && Number.isFinite(qualite?.borneHaute)
      ? qualite.borneHaute
      : null;
    const valeurEstimee = qualite?.intervalleDisponible === true && Number.isFinite(qualite?.valeurEstimee)
      ? qualite.valeurEstimee
      : null;

    // Preuve prioritaire : si même la borne haute plausible reste sous le repère
    // minimal, l'insuffisance est déjà démontrée par l'intervalle. Cette conclusion
    // doit primer sur la règle de sécurité « apport très faible » afin de conserver
    // la justification clinique la plus robuste dans `certitude`.
    if (
      Number.isFinite(borneHaute) &&
      ["min", "recommended", "range"].includes(reference.type) &&
      Number.isFinite(Number(reference.min)) &&
      borneHaute < Number(reference.min)
    ) {
      return {
        label: "Sous le repère",
        classe: "insuffisant",
        certitude: "intervalle_plausible",
        partiel: true,
        approximatif: true
      };
    }

    // Repère exact (énergie et certains macronutriments) : la tolérance de ±5 %
    // déjà utilisée pour les données complètes est appliquée au même niveau de
    // décision lorsque l'intervalle plausible est disponible. L'estimation centrale
    // peut valider le repère ; une borne haute entièrement sous la zone de tolérance
    // ou une borne basse entièrement au-dessus apporte une preuve plus forte.
    if (
      reference.type === "exact" &&
      Number.isFinite(Number(reference.min)) &&
      Number(reference.min) > 0 &&
      Number.isFinite(borneHaute)
    ) {
      const cibleExacte = Number(reference.min);
      const borneExacteBasse = cibleExacte * 0.95;
      const borneExacteHaute = cibleExacte * 1.05;

      if (borneHaute < borneExacteBasse) {
        return {
          label: "Sous le repère",
          classe: "insuffisant",
          certitude: "intervalle_plausible",
          partiel: true,
          approximatif: true
        };
      }
      if (borneBasse > borneExacteHaute) {
        return {
          label: "Au-dessus du repère",
          classe: "eleve",
          certitude: "intervalle_plausible",
          partiel: true,
          approximatif: true
        };
      }
      if (
        Number.isFinite(valeurEstimee) &&
        valeurEstimee >= borneExacteBasse &&
        valeurEstimee <= borneExacteHaute
      ) {
        return {
          label: "Repère atteint",
          classe: "adequat",
          certitude: "estimation_repere_atteint",
          partiel: true,
          approximatif: true
        };
      }
      if (borneBasse >= borneExacteBasse && borneHaute <= borneExacteHaute) {
        return {
          label: "Repère atteint",
          classe: "adequat",
          certitude: "intervalle_plausible",
          partiel: true,
          approximatif: true
        };
      }
      return {
        label: "À préciser",
        classe: "non-evalue",
        certitude: "intervalle_traverse_seuil",
        partiel: true,
        approximatif: true
      };
    }

    // Règle de sécurité « apport très faible » : elle n'intervient qu'après la
    // preuve par borne haute. Si au moins 90 % du poids alimentaire est documenté
    // et que l'apport utilisé pour la décision ne dépasse pas 20 % du repère minimal,
    // « Sous le repère » est plus informatif que « À préciser ». Pour un intervalle
    // disponible, l'estimation centrale est utilisée afin de ne pas conclure sur le
    // seul minimum connu. Les repères de type maximum sont volontairement exclus.
    const minimumPourApportTresFaible = ["min", "recommended", "range"].includes(reference.type)
      ? Number(reference.min)
      : null;
    const couverturePourApportTresFaible = Number(qualite?.couverturePoids);
    const valeurPourApportTresFaible = Number.isFinite(valeurEstimee) ? valeurEstimee : value;
    const apportTresFaible =
      Number.isFinite(minimumPourApportTresFaible) && minimumPourApportTresFaible > 0 &&
      Number.isFinite(couverturePourApportTresFaible) && couverturePourApportTresFaible >= 0.90 &&
      Number.isFinite(valeurPourApportTresFaible) && valeurPourApportTresFaible <= minimumPourApportTresFaible * 0.20;

    if (apportTresFaible) {
      return {
        label: "Sous le repère",
        classe: "insuffisant",
        certitude: "apport_tres_faible_couverture_elevee",
        partiel: true,
        approximatif: qualite?.approximatif === true || qualite?.intervalleDisponible === true
      };
    }

    // Quand NutriFlow dispose d'une estimation centrale documentée, le statut affiché
    // suit cette valeur : si elle atteint le repère ou se situe dans la plage cible,
    // on affiche « Repère atteint ». L'intervalle reste utilisé pour repérer les
    // insuffisances/dépassements certains et les situations réellement indécidables.
    if (Number.isFinite(borneHaute)) {
      if (reference.type === "min") {
        if (borneBasse >= reference.min) {
          return { label: "Repère atteint", classe: "adequat", certitude: "borne_basse_suffisante", partiel: true, approximatif: true };
        }
        if (Number.isFinite(valeurEstimee) && valeurEstimee >= reference.min) {
          return { label: "Repère atteint", classe: "adequat", certitude: "estimation_repere_atteint", partiel: true, approximatif: true };
        }
        return { label: "À préciser", classe: "non-evalue", certitude: "intervalle_traverse_seuil", partiel: true, approximatif: true };
      }

      if (reference.type === "max") {
        if (borneBasse > reference.max) {
          return { label: "Au-dessus du repère", classe: "eleve", certitude: "borne_basse_depasse", partiel: true, approximatif: true };
        }
        if (Number.isFinite(valeurEstimee) && valeurEstimee <= reference.max) {
          return { label: "Repère atteint", classe: "adequat", certitude: "estimation_dans_repere", partiel: true, approximatif: true };
        }
        if (borneHaute <= reference.max) {
          return { label: "Repère atteint", classe: "adequat", certitude: "intervalle_plausible", partiel: true, approximatif: true };
        }
        return { label: "À préciser", classe: "non-evalue", certitude: "intervalle_traverse_seuil", partiel: true, approximatif: true };
      }

      if (reference.type === "recommended") {
        const limiteSuperieure = Number.isFinite(reference.upperLimit) ? reference.upperLimit : null;
        if (Number.isFinite(limiteSuperieure) && borneBasse > limiteSuperieure) {
          return { label: "Au-dessus de l’AMT", classe: "eleve", certitude: "borne_basse_depasse_amt", partiel: true, approximatif: true };
        }
        if (Number.isFinite(valeurEstimee) && valeurEstimee >= reference.min && (!Number.isFinite(limiteSuperieure) || valeurEstimee <= limiteSuperieure)) {
          return { label: "Repère atteint", classe: "adequat", certitude: "estimation_repere_atteint", partiel: true, approximatif: true };
        }
        if (borneBasse >= reference.min && (!Number.isFinite(limiteSuperieure) || borneHaute <= limiteSuperieure)) {
          return { label: "Repère atteint", classe: "adequat", certitude: "intervalle_plausible", partiel: true, approximatif: true };
        }
        return { label: "À préciser", classe: "non-evalue", certitude: "intervalle_traverse_seuil", partiel: true, approximatif: true };
      }

      if (reference.type === "range") {
        if (borneBasse > reference.max) {
          return { label: "Au-dessus du repère", classe: "eleve", certitude: "borne_basse_depasse", partiel: true, approximatif: true };
        }
        if (Number.isFinite(valeurEstimee) && valeurEstimee >= reference.min && valeurEstimee <= reference.max) {
          return { label: "Repère atteint", classe: "adequat", certitude: "estimation_dans_plage", partiel: true, approximatif: true };
        }
        if (borneBasse >= reference.min && borneHaute <= reference.max) {
          return { label: "Repère atteint", classe: "adequat", certitude: "intervalle_plausible", partiel: true, approximatif: true };
        }
        return { label: "À préciser", classe: "non-evalue", certitude: "intervalle_traverse_seuil", partiel: true, approximatif: true };
      }
    }

    // Fallback conservateur si l'intervalle n'est pas suffisamment documenté.
    if (reference.type === "min") {
      if (Number.isFinite(reference.min) && value >= reference.min) {
        return { label: "Repère atteint", classe: "adequat", certitude: "minimum_connu_suffisant", partiel: true };
      }
      return { label: "À préciser", classe: "non-evalue", certitude: "minimum_connu_inferieur", partiel: true };
    }

    if (reference.type === "max") {
      if (Number.isFinite(reference.max) && value > reference.max) {
        return { label: "Au-dessus du repère", classe: "eleve", certitude: "depassement_certain", partiel: true };
      }
      return { label: "À préciser", classe: "non-evalue", certitude: "minimum_connu_sous_maximum", partiel: true };
    }

    if (reference.type === "recommended") {
      const limiteSuperieure = Number.isFinite(reference.upperLimit) ? reference.upperLimit : null;
      if (Number.isFinite(limiteSuperieure) && value > limiteSuperieure) {
        return { label: "Au-dessus de l’AMT", classe: "eleve", certitude: "depassement_amt_certain", partiel: true };
      }
      if (Number.isFinite(reference.min) && value >= reference.min && !Number.isFinite(limiteSuperieure)) {
        return { label: "Repère atteint", classe: "adequat", certitude: "minimum_connu_suffisant", partiel: true };
      }
      return { label: "À préciser", classe: "non-evalue", certitude: "minimum_connu_recommande", partiel: true };
    }

    if (reference.type === "range") {
      if (Number.isFinite(reference.max) && value > reference.max) {
        return { label: "Au-dessus du repère", classe: "eleve", certitude: "depassement_certain", partiel: true };
      }
      return { label: "À préciser", classe: "non-evalue", certitude: "minimum_connu_plage", partiel: true };
    }

    const cible = Number(reference.min);
    if (Number.isFinite(cible) && cible > 0 && value > cible * 1.05) {
      return { label: "Au-dessus du repère", classe: "eleve", certitude: "depassement_certain", partiel: true };
    }

    return { label: "À préciser", classe: "non-evalue", certitude: "minimum_connu", partiel: true };
  }

  if (reference.type === "recommended") {
    if (value < reference.min) return { label: "Sous le repère", classe: "insuffisant", certitude: "complete" };
    if (Number.isFinite(reference.upperLimit) && value > reference.upperLimit) {
      return { label: "Au-dessus de l’AMT", classe: "eleve", certitude: "complete" };
    }
    return { label: "Repère atteint", classe: "adequat", certitude: "complete" };
  }

  if (reference.type === "range") {
    if (value < reference.min) return { label: "Sous le repère", classe: "insuffisant", certitude: "complete" };
    if (value > reference.max) return { label: "Au-dessus du repère", classe: "eleve", certitude: "complete" };
    return { label: "Repère atteint", classe: "adequat", certitude: "complete" };
  }

  if (reference.type === "min") {
    return value < reference.min
      ? { label: "Sous le repère", classe: "insuffisant", certitude: "complete" }
      : { label: "Repère atteint", classe: "adequat", certitude: "complete" };
  }

  if (reference.type === "max") {
    return value > reference.max
      ? { label: "Au-dessus du repère", classe: "eleve", certitude: "complete" }
      : { label: "Repère atteint", classe: "adequat", certitude: "complete" };
  }

  const ecart = Math.abs(value - reference.min) / reference.min;
  if (ecart <= 0.05) return { label: "Repère atteint", classe: "adequat", certitude: "complete" };
  return value < reference.min
    ? { label: "Sous le repère", classe: "insuffisant", certitude: "complete" }
    : { label: "Au-dessus du repère", classe: "eleve", certitude: "complete" };
}

function renderRecommandationsNutritionnelles() {
  const container = document.getElementById("recommandationsNutritionnelles");
  if (!container) return;

  const besoins = getRecommandationsBesoinsPatient();
  if (!besoins) {
    container.innerHTML = `<div class="module-placeholder"><h3>Données insuffisantes</h3><p>Renseignez l’âge, le sexe, la taille et le poids dans Patient, puis choisissez le niveau d’activité dans Calculs nutritionnels.</p></div>`;
    return;
  }

  const bilan = anmGetDailyTotals();
  if (!anmRows.some(row => anmGetNutrients(row).weight > 0)) {
    container.innerHTML = `<div class="module-placeholder"><h3>Anamnèse alimentaire incomplète</h3><p>Ajoutez au moins un aliment dans l’anamnèse pour comparer les apports aux besoins.</p></div>`;
    return;
  }

  if (anamneseValideePourAnalyse !== true) {
    container.innerHTML = `<div class="module-placeholder"><h3>Anamnèse à valider</h3><p>Les apports peuvent être calculés pendant la saisie, mais NutriFlow n’interprète pas les insuffisances ou excès tant que vous n’avez pas confirmé dans l’onglet Anamnèse que la journée renseignée est prête pour l’analyse.</p></div>`;
    return;
  }

  const infoApport = key => {
    const qualite = anmConstruireQualiteApport(bilan, key);
    if (!qualite || !Number.isFinite(qualite.valeur)) return { valeur: null, partiel: false, qualite: null };
    return {
      valeur: qualite.valeur,
      partiel: qualite.partiel === true,
      qualite
    };
  };

  const definitions = [
    ["Énergie", "energie", "kcal"], ["Protéines", "protein", "g"], ["Glucides", "carbs", "g"],
    ["Lipides", "lipids", "g"], ["Fibres", "fiber", "g"], ["AGS", "ags", "g"],
    ["AGMI", "agmi", "g"], ["AGPI", "agpi", "g"], ["Acide linoléique (n-6)", "omega6", "g"],
    ["ALA (n-3)", "omega3", "g"], ["EPA + DHA", "epaDha", "mg"],
    ["Calcium", "calcium", "mg"],
    ["Phosphore", "phosphorus", "mg"], ["Magnésium", "magnesium", "mg"], ["Sodium", "sodium", "mg"],
    ["Potassium", "potassium", "mg"], ["Fer", "iron", "mg"], ["Zinc", "zinc", "mg"],
    ["Sélénium", "selenium", "µg"], ["Cuivre", "copper", "mg"], ["Iode", "iodine", "µg"],
    ["Sel", "salt", "g"], ["Cholestérol", "cholesterol", "mg"], ["Vitamine A", "vitA", "µg"],
    ["Vitamine D", "vitD", "µg"], ["Vitamine E", "vitE", "mg"], ["Vitamine K1", "vitK", "µg"],
    ["Vitamine C", "vitC", "mg"], ["Vitamine B1", "vitB1", "mg"], ["Vitamine B2", "vitB2", "mg"],
    ["Vitamine B3", "vitB3", "mg"], ["Vitamine B5", "vitB5", "mg"], ["Vitamine B6", "vitB6", "mg"],
    ["Vitamine B9", "vitB9", "µg"], ["Vitamine B12", "vitB12", "µg"],
    ["Eau totale", "water", "mL"]
  ];

  const analyses = definitions.map(([nom, key, unite]) => {
    const apport = infoApport(key);
    const reference = besoins[key];
    const referenceEvaluable = reference && reference.type && reference.type !== 'unavailable' && !reference.label;
    const statut = !Number.isFinite(apport.valeur) || !referenceEvaluable
      ? { label: "Non évalué", classe: "non-evalue" }
      : analyserStatutApport(apport.valeur, reference, { partiel: apport.partiel, qualite: apport.qualite });
    return { nom, key, unite, apport: apport.valeur, partiel: apport.partiel, qualite: apport.qualite, reference, statut };
  });

  const insuffisants = analyses.filter(x => x.statut.classe === "insuffisant").length;
  const eleves = analyses.filter(x => x.statut.classe === "eleve").length;
  const adequats = analyses.filter(x => x.statut.classe === "adequat").length;
  const nonEvalues = analyses.filter(x => x.statut.classe === "non-evalue").length;

  const formaterApport = item => {
    if (!Number.isFinite(item.apport)) return "Non disponible";
    const qualite = item.qualite || {};
    const utiliseEstimationIntervalle = item.partiel && qualite.intervalleDisponible === true && Number.isFinite(qualite.valeurEstimee);
    const approximatif = utiliseEstimationIntervalle || qualite.estime === true;
    const valeur = utiliseEstimationIntervalle ? qualite.valeurEstimee : item.apport;
    const prefixe = approximatif ? "≈ " : (item.partiel ? "≥ " : "");
    const repereAtteintSansDepassement = item.statut.classe === "adequat" && (!Number.isFinite(item.reference?.upperLimit) || valeur <= item.reference.upperLimit);
    const conclusionApportTresFaible = item.statut?.certitude === "apport_tres_faible_couverture_elevee";
    const explication = conclusionApportTresFaible
      ? "Apport très faible par rapport au repère et composition alimentaire suffisamment documentée pour conclure à un apport insuffisant."
      : repereAtteintSansDepassement ? "" : utiliseEstimationIntervalle
        ? "Une faible partie de la composition manquante est encadrée à partir d'aliments du même groupe CIQUAL."
        : qualite.estime === true
          ? "Une partie de l'apport repose sur une valeur de composition complémentaire documentée (par exemple CALNUT)."
          : item.partiel
            ? "Certaines valeurs de composition restent à compléter pour cet apport."
            : "";
    return `${prefixe}${valeur.toFixed(1)} ${item.unite}${explication ? `<span class="analysis-quality-icon" tabindex="0" data-tooltip="${explication}" title="${explication}" aria-label="${explication}">ⓘ</span>` : ""}`;
  };

  container.innerHTML = `
    <section class="nutrition-calc-card recommendations-summary-card">
      <div class="nutrition-calc-card-header"><span class="nutrition-calc-kicker">Analyse</span><h3>Vue d’ensemble des apports</h3></div>
      <div class="recommendations-summary-grid">
        <div><strong>${insuffisants}</strong><span>sous le repère</span></div>
        <div><strong>${eleves}</strong><span>au-dessus du repère</span></div>
        <div><strong>${adequats}</strong><span>repère${adequats > 1 ? "s" : ""} atteint${adequats > 1 ? "s" : ""}</span></div>
        <div><strong>${nonEvalues}</strong><span>non évalué${nonEvalues > 1 ? "s" : ""}</span></div>
      </div>
    </section>
    <section class="nutrition-calc-card nutrition-reference-card">
      <div class="nutrition-calc-card-header">
        <span class="nutrition-calc-kicker">Comparaison</span><h3>Apports / besoins</h3>
        <p>Les apports observés sont calculés à partir de la composition Ciqual disponible et comparés aux objectifs / références utilisés dans l’onglet Calculs nutritionnels. Lorsqu’une partie de la composition manque, NutriFlow évite de conclure à tort à une insuffisance. Un zéro explicitement renseigné par Ciqual reste un vrai zéro.</p>
      </div>
      <div class="nutrition-reference-table-wrapper">
        <table class="nutrition-reference-table recommendations-table">
          <thead><tr><th>Nutriment</th><th>Apport observé</th><th>Objectif / référence</th><th>Situation</th></tr></thead>
          <tbody>${analyses.map(item => `<tr>
            <td>${item.nom}</td>
            <td>${formaterApport(item)}</td>
            <td>${formatReferenceBesoin(item.reference)}</td>
            <td><span class="recommendation-status ${item.statut.classe}">${item.statut.label}</span></td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </section>
    <section class="nutrition-calc-card">
      <div class="nutrition-calc-card-header"><span class="nutrition-calc-kicker">Synthèse des écarts</span><h3>Points d’attention</h3></div>
      <div class="recommendations-priority-list">
        ${analyses.filter(x => ["insuffisant", "eleve"].includes(x.statut.classe)).map(item => {
          const qualite = item.qualite || {};
          const utiliseEstimation = item.partiel && qualite.intervalleDisponible === true && Number.isFinite(qualite.valeurEstimee);
          const valeur = utiliseEstimation ? qualite.valeurEstimee : item.apport;
          const prefixe = utiliseEstimation || qualite.estime === true ? "≈ " : (item.partiel ? "≥ " : "");
          return `<div class="recommendation-priority ${item.statut.classe}"><strong>${item.nom}</strong> — ${item.statut.label.toLowerCase()} (${prefixe}${valeur.toFixed(1)} ${item.unite} ; référence ${formatReferenceBesoin(item.reference)}).</div>`;
        }).join("") || (nonEvalues > 0
          ? `<div class="recommendation-priority non-evalue"><strong>Aucun écart certain détecté avec les données interprétables.</strong> ${nonEvalues} élément${nonEvalues > 1 ? "s restent" : " reste"} non évalué${nonEvalues > 1 ? "s" : ""}, lorsque l'incertitude de composition peut encore modifier le classement.</div>`
          : `<div class="recommendation-priority adequat"><strong>Aucun point d’attention automatique.</strong> Aucun écart n’est détecté parmi les données complètes disposant d’une référence chiffrée.</div>`)}
      </div>
    </section>`;
}

function anmConstruireDetailNutritionnel(bilan) {
  const groupes = [
    ["Macronutriments", "Répartition générale de la ration", ["protein","carbs","lipids","fiber"]],
    ["Acides gras", "Profil lipidique détaillé", ["ags","agmi","agpi","omega6","omega3","epaDha"]],
    ["Minéraux et oligoéléments", "Apports minéraux estimés", ["calcium","phosphorus","magnesium","sodium","potassium","iron","zinc","selenium","copper","iodine"]],
    ["Vitamines", "Vitamines disponibles dans la base Ciqual", ["vitA","vitD","vitE","vitK","vitC","vitB1","vitB2","vitB3","vitB5","vitB6","vitB9","vitB12"]],
    ["Autres", "Informations complémentaires", ["water","salt","cholesterol"]]
  ];
  const nutriments = new Map(ANM_NUTRIENTS.map(item => [item[0], item]));
  return groupes.map(([titre, description, keys]) => `
    <section class="anm-nutrient-group">
      <div class="anm-nutrient-group-heading"><h4>${titre}</h4><span>${description}</span></div>
      <div class="anm-nutrient-group-grid">
        ${keys.map(key => nutriments.get(key)).filter(Boolean).map(([key, nom, unite]) => `
          <div class="anm-full-total"><span>${nom}</span><strong>${anmAfficherBilan(bilan,key,unite,"Non disponible")}</strong></div>
        `).join("")}
      </div>
    </section>`).join("");
}

function anmPositionnerModalNutritionnelle() {
  const modal = document.getElementById('anm-nutrition-modal');
  const onglet = document.getElementById('anamnese');
  if (!modal || modal.hidden || !onglet) return;
  const rect = onglet.getBoundingClientRect();
  const nav = document.querySelector('.main-nav')?.getBoundingClientRect();
  const viewport = window.visualViewport;
  const viewportTop = viewport?.offsetTop || 0;
  const viewportLeft = viewport?.offsetLeft || 0;
  const viewportBottom = viewportTop + (viewport?.height || innerHeight);
  const viewportRight = viewportLeft + (viewport?.width || innerWidth);
  const left = Math.max(viewportLeft, rect.left);
  const right = Math.min(viewportRight, rect.right);
  const top = Math.max(viewportTop, nav?.bottom || 0) + 12;
  const bottom = viewportBottom - 12;
  Object.assign(modal.style, {
    inset: 'auto', left: left + 'px', top: top + 'px',
    width: Math.max(0, right - left) + 'px', height: Math.max(0, bottom - top) + 'px'
  });
}

window.addEventListener('resize', anmPositionnerModalNutritionnelle);
window.addEventListener('scroll', anmPositionnerModalNutritionnelle, {passive: true});
window.visualViewport?.addEventListener('resize', anmPositionnerModalNutritionnelle);
let anmModalDeclencheur = null;
function anmAfficherModalNutritionnelle(bilan, titre, sousTitre) {
  const modal=document.getElementById("anm-nutrition-modal");
  const contenu=document.getElementById("anm-full-totals");
  const titreEl=document.getElementById("anm-nutrition-modal-title");
  if(!modal||!contenu||!titreEl)return;
  titreEl.textContent=titre;
  const p=modal.querySelector(".anm-nutrition-modal-header p");
  if(p)p.textContent=sousTitre;
  contenu.innerHTML=anmConstruireDetailNutritionnel(bilan);
  anmModalDeclencheur = document.activeElement;
  // Sortir des parents animés pour que les coordonnées fixes restent celles de l'écran.
  document.body.appendChild(modal);
  modal.hidden=false;
  document.body.classList.add("anm-modal-open");
  anmPositionnerModalNutritionnelle();

  modal.querySelector('.anm-nutrition-modal-panel').scrollTop = 0;
  modal.querySelector(".anm-nutrition-modal-close")?.focus({preventScroll: true});
}

function anmOuvrirDetailNutritionnel() {
  anmAfficherModalNutritionnelle(anmGetDailyTotals(),"Détail nutritionnel complet",
    "Apports journaliers estimés à partir des aliments renseignés dans Ciqual.");
}

function anmOuvrirDetailNutritionnelRepas(mealIndex) {
  const repas=ANM_MEALS[mealIndex];
  if(!repas)return;
  const lignes=anmRows.filter(row=>Number(row.meal)===Number(mealIndex));
  anmAfficherModalNutritionnelle(anmGetDailyTotals(lignes),`Détail nutritionnel — ${repas}`,
    "Apports estimés pour ce repas à partir des aliments renseignés dans Ciqual.");
}

function anmFermerDetailNutritionnel() {
  const modal=document.getElementById("anm-nutrition-modal");
  if(!modal||modal.hidden)return;
  modal.hidden=true;
  document.body.classList.remove("anm-modal-open");
  if (anmModalDeclencheur?.isConnected) anmModalDeclencheur.focus({preventScroll: true});
}

function anmFermerDetailNutritionnelDepuisFond(event) {
  if(event.target?.id==="anm-nutrition-modal")anmFermerDetailNutritionnel();
}

document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&!document.getElementById("anm-nutrition-modal")?.hidden)anmFermerDetailNutritionnel();
});

function anmRenderTotals() {
  const bilan = anmGetDailyTotals();
  const {
    totals,
    complete,
    kcal,
    weight
  } = bilan;

  const total = index => complete[index] ? totals[index] : null;
  const grid = document.getElementById("anm-totals-grid");

  if (grid) {
    const cards = [
      ["Énergie", "energie", "kcal"],
      ["Protéines", "protein", "g"],
      ["Glucides", "carbs", "g"],
      ["Lipides", "lipids", "g"]
    ];

    grid.innerHTML = cards.map(([nom, key, unite]) => `
      <div class="anm-total-item">
        <span>${nom}</span>
        <strong>${anmAfficherBilan(bilan, key, unite)}</strong>
      </div>
    `).join("");
  }

  const full = document.getElementById("anm-full-totals");
  if (full && !document.getElementById("anm-nutrition-modal")?.hidden) {
    full.innerHTML = anmConstruireDetailNutritionnel(bilan);
  }
}

function anmInit() {
  anmRender();
  window.CIQUAL_READY = Array.isArray(CIQUAL_ALIMENTS) && CIQUAL_ALIMENTS.length > 0;
  if (!window.CIQUAL_READY) {
    console.error("Base CIQUAL non chargée.");
  }

  document.addEventListener("click", function (event) {
    if (event.target.closest(".anm-food-search") || event.target.closest(".anm-row-search-results")) {
      return;
    }
    anmCloseSearchMenus();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      anmCloseSearchMenus();
    }
  });
}

function anmExporterPDF() {
  const sheet = document.getElementById("anm-pdf-sheet");
  if (!sheet) {
    alert("La feuille récapitulative est introuvable.");
    return;
  }
  try {
    remplirFeuillePDF(sheet);
    window.print();
  } catch (erreur) {
    console.error("Impossible de générer l'export PDF :", erreur);
    alert("L'export PDF a échoué. Merci de réessayer.");
  }
}

function remplirFeuillePDF(sheet) {
  sheet.innerHTML = `
        <div class="anm-pdf-header">
            <h1>NutriFlow</h1>
            <p>Feuille récapitulative de l'anamnèse alimentaire</p>
        </div>

        <div class="anm-pdf-section">
            <h2>Patient</h2>

            <div class="anm-pdf-patient">
                <div>
                    <span>Nom / prénom</span>
                    <strong>-</strong>
                </div>

                <div>
                    <span>Date</span>
                    <strong>${new Date().toLocaleDateString("fr-FR")}</strong>
                </div>
            </div>
        </div>

        <div class="anm-pdf-section">
            <h2>Anamnèse alimentaire</h2>

            <p>
                Récapitulatif des aliments et apports nutritionnels
                enregistrés dans NutriFlow.
            </p>
        </div>
    `;
}

function chargerPatients() {
  try {
    empreinteStockagePatients = localStorage.getItem(PATIENTS_STORAGE_KEY);
    const value = empreinteStockagePatients === null ? [] : JSON.parse(empreinteStockagePatients);
    if (!Array.isArray(value)) throw new Error("Format des dossiers invalide");
    erreurChargementPatients = false;
    return value;
  } catch (error) {
    erreurChargementPatients = true;
    console.error("Chargement des dossiers impossible :", error);
    return [];
  }
}

function sauvegarderPatients() {
  try {
    if (erreurChargementPatients) throw new Error("Stockage illisible : aucun dossier existant ne sera écrasé. Rechargez après récupération du stockage.");
    if (localStorage.getItem(PATIENTS_STORAGE_KEY) !== empreinteStockagePatients) throw new Error("Les dossiers ont changé dans une autre fenêtre. Exportez les modifications en attente puis rechargez.");
    const serialized = JSON.stringify(patients);
    localStorage.setItem(PATIENTS_STORAGE_KEY, serialized);
    empreinteStockagePatients = serialized;
    return true;
  } catch (error) {
    mettreAJourStatutSauvegarde(error.message || "Erreur de sauvegarde", "error");
    return false;
  }
}

function mettreAJourAgeDepuisDateNaissance() {
  const dateNaissance = recupererValeur("dateNaissance");
  const champAge = document.getElementById("age");
  if (!champAge || !dateNaissance) return;
  const naissance = new Date(`${dateNaissance}T00:00:00`);
  if (Number.isNaN(naissance.getTime())) return;
  const aujourdHui = new Date();
  let age = aujourdHui.getFullYear() - naissance.getFullYear();
  const mois = aujourdHui.getMonth() - naissance.getMonth();
  if (mois < 0 || mois === 0 && aujourdHui.getDate() < naissance.getDate()) {
    age--;
  }
  if (age >= 0 && age <= 130) {
    champAge.value = age;
  }
}

function reinitialiserControlesDossier() {
  window.clinicalGoals?.set([]);
  objectifEnergetiquePersonnalise = null;
  objectifEnergetiquePersonnaliseContexte = null;
  poidsCibleTravail = null;
  objectifTherapeutiqueObesite = "stabilisation";
  etatCalculsObesiteCourant = null;
  objectifSelHTASelectionne = "standard";
  objectifSelHTAStrict = null;
  formuleMetabolismeSelectionnee = "henry2005";
  niveauActivitePALSelectionne = "";
  anamneseValideePourAnalyse = false;
  document.querySelectorAll('.workspace input, .workspace select, .workspace textarea').forEach(element => {
    if (element.id === 'darkModeToggle' || element.id === 'recherchePatient') return;
    if (element.type === 'checkbox' || element.type === 'radio') {
      element.checked = element.defaultChecked;
    } else if (element.tagName === 'SELECT') {
      element.selectedIndex = [...element.options].findIndex(option => option.defaultSelected);
      if (element.selectedIndex < 0) element.selectedIndex = 0;
    } else {
      element.value = element.defaultValue;
    }
  });
  etatRepartitionMacros = { ...REPARTITION_MACRONUTRIMENTS_DEFAUT };
  brouillonRepartitionMacros = { ...etatRepartitionMacros };
  if (typeof denutEvaluationOuverteManuellement !== 'undefined') denutEvaluationOuverteManuellement = false;
}

function viderFormulairePatient() {
  reinitialiserControlesDossier();
  ["nom", "prenom", "dateNaissance", "age", "sexe", "telephone", "taille", "poids", "motifConsultation", "motifConsultationDetails", "profession", "horairesTravail", "lieuVie", "transportTravail", "mutuelle", "situationFamiliale", "compositionFoyer", "nombreEnfants", "agesEnfants", "responsableCourses", "responsableCuisine", "animauxCompagnie", "promenadeChien", "sommeilDuree", "sommeilQualite", "contexteVie", "antecedentsFamiliaux", "poidsHabituel", "poidsMax", "poidsMin", "evolutionPoids", "antecedentsRegimes", "evenementsPoids", "tourTaille", "mesuresAnthropometriquesNotes", "hobbies", "sportPratique", "sportType", "sportFrequence", "sportDuree", "sportMoment", "objectif", "objectifDetails", "repas", "petitDejeuner", "boissons", "fruitsLegumes", "habitudes", "autresAllergies", "autresPathologies", "traitements"].forEach(id => definirValeur(id));
  document.querySelectorAll('input[name="allergies"], input[name="pathologies"]').forEach(input => {
    input.checked = false;
  });
  anmRows = [];
  anmRender();
  synchroniserBlocDiabete();
  synchroniserBlocHTA();
  window.actualiserDyslipidemie?.();
  window.actualiserObesite?.();
  window.actualiserEtatNutritionnel?.();
  window.actualiserBiologieAdaptative?.();
}

function chargerAnamnesePatient(patient) {
  anmRows = Array.isArray(patient?.anamnese) ? patient.anamnese.map(row => ({
    ...row
  })) : [];
  anamneseValideePourAnalyse = patient?.anamneseValideePourAnalyse === true;
  // Une ancienne validation n'est conservée que si la saisie actuelle reste cohérente.
  if (anamneseValideePourAnalyse && !anmEvaluerEtatValidation().peutValider) {
    anamneseValideePourAnalyse = false;
  }
  anmRender();
}

function nouveauPatient() {
  window.clinicalSession?.capture();
  if (!finaliserSauvegardeEnAttente()) return;
  patientActif = null;
  viderFormulairePatient();
  mettreAJourPatientActif();
  const accueil = document.getElementById("patients-home");
  if (accueil) accueil.style.display = "none";
  afficherDossier();
  const boutonPatient = document.querySelector('.nav-tab[onclick*="ouvrirOnglet(\'patient\'"]');
  ouvrirOnglet("patient", boutonPatient);
  fermerSidebarMobile();
  mettreAJourStatutSauvegarde("Nouveau dossier — non enregistré", "saving");
  document.getElementById("nom").closest("details").open = true;
  setTimeout(() => {
    const nom = document.getElementById("nom");
    if (nom) nom.focus();
  }, 50);
}

function afficherDossier() {
  const accueil = document.getElementById("patients-home");
  const tabs = document.querySelectorAll(".tab-content");
  if (accueil) accueil.style.display = "none";
  tabs.forEach(onglet => {
    onglet.style.display = "";
  });
}

function afficherAccueilPatients() {
  const accueil = document.getElementById("patients-home");
  document.querySelectorAll(".tab-content").forEach(onglet => {
    onglet.classList.remove("active");
    onglet.style.display = "none";
  });
  document.querySelectorAll(".nav-tab").forEach(bouton => {
    bouton.classList.remove("active");
  });
  if (accueil) accueil.style.display = "block";
  patientActif = null;
  mettreAJourPatientActif();
}

function retourPatients() {
  window.clinicalSession?.capture();
  if (!finaliserSauvegardeEnAttente()) return;
  afficherAccueilPatients();
  afficherPatients();
  fermerSidebarMobile();
}

function collecterDonneesFormulaire() {
  const controles = {};
  document.querySelectorAll(".workspace input[id], .workspace input[name], .workspace select[id], .workspace textarea[id]").forEach(element => {
    if (element.id === "darkModeToggle") return;
    const cle = element.id || `${element.name}::${element.type}`;
    if (!cle) return;
    if (element.type === "checkbox" || element.type === "radio") {
      if (!controles[cle]) {
        controles[cle] = {
          type: element.type,
          name: element.name || "",
          values: []
        };
      }
      if (element.checked) {
        controles[cle].values.push(element.value);
      }
    } else {
      controles[cle] = {
        type: element.type || element.tagName.toLowerCase(),
        value: element.value
      };
    }
  });
  return controles;
}

function restaurerDonneesFormulaire(donnees = {}) {
  // Créer les options avant de restaurer la valeur du traitement.
  const traitement = document.getElementById('diabeteTraitement');
  if (traitement) remplirOptionsTraitementDiabete(traitement, donnees.diabeteType?.value || '');
  document.querySelectorAll(".workspace input[id], .workspace input[name], .workspace select[id], .workspace textarea[id]").forEach(element => {
    if (element.id === "darkModeToggle") return;
    const cle = element.id || `${element.name}::${element.type}`;
    const donneesControle = donnees[cle];
    if (!donneesControle) return;
    if (element.type === "checkbox" || element.type === "radio") {
      element.checked = Array.isArray(donneesControle.values) ? donneesControle.values.includes(element.value) : false;
    } else {
      element.value = donneesControle.value ?? "";
    }
  });
}

function collecterDonneesPatient() {

  return {
    objectifsRetenusConsultation: window.clinicalGoals?.get() ?? [],
    objectifEnergetiquePersonnalise,
    objectifEnergetiquePersonnaliseContexte,
    poidsCibleTravail,
    objectifTherapeutiqueObesite,
    objectifSelHTASelectionne,
    objectifSelHTAStrict,
    formuleMetabolisme: formuleMetabolismeSelectionnee,
    activite: niveauActivitePALSelectionne,
    nom: recupererValeur("nom").trim(),
    prenom: recupererValeur("prenom").trim(),
    dateNaissance: recupererValeur("dateNaissance"),
    age: recupererValeur("age"),
    sexe: recupererValeur("sexe"),
    telephone: recupererValeur("telephone").trim(),
    taille: recupererValeur("taille"),
    poids: recupererValeur("poids"),
    motifConsultation: recupererValeur("motifConsultation"),
    motifConsultationDetails: recupererValeur("motifConsultationDetails"),
    profession: recupererValeur("profession").trim(),
    horairesTravail: recupererValeur("horairesTravail").trim(),
    lieuVie: recupererValeur("lieuVie").trim(),
    transportTravail: recupererValeur("transportTravail"),
    mutuelle: recupererValeur("mutuelle").trim(),
    situationFamiliale: recupererValeur("situationFamiliale"),
    compositionFoyer: recupererValeur("compositionFoyer"),
    nombreEnfants: recupererValeur("nombreEnfants"),
    agesEnfants: recupererValeur("agesEnfants").trim(),
    responsableCourses: recupererValeur("responsableCourses"),
    responsableCuisine: recupererValeur("responsableCuisine"),
    animauxCompagnie: recupererValeur("animauxCompagnie"),
    promenadeChien: recupererValeur("promenadeChien").trim(),
    sommeilDuree: recupererValeur("sommeilDuree").trim(),
    sommeilQualite: recupererValeur("sommeilQualite"),
    contexteVie: recupererValeur("contexteVie"),
    antecedentsFamiliaux: recupererValeur("antecedentsFamiliaux"),
    poidsHabituel: recupererValeur("poidsHabituel"),
    poidsMax: recupererValeur("poidsMax"),
    poidsMin: recupererValeur("poidsMin"),
    evolutionPoids: recupererValeur("evolutionPoids").trim(),
    antecedentsRegimes: recupererValeur("antecedentsRegimes"),
    evenementsPoids: recupererValeur("evenementsPoids"),
    tourTaille: recupererValeur("tourTaille"),
    mesuresAnthropometriquesNotes: recupererValeur("mesuresAnthropometriquesNotes"),
    hobbies: recupererValeur("hobbies"),
    sportPratique: recupererValeur("sportPratique"),
    sportType: recupererValeur("sportType").trim(),
    sportFrequence: recupererValeur("sportFrequence").trim(),
    sportDuree: recupererValeur("sportDuree").trim(),
    sportMoment: recupererValeur("sportMoment").trim(),
    objectif: recupererValeur("objectif"),
    objectifDetails: recupererValeur("objectifDetails"),
    repas: recupererValeur("repas"),
    petitDejeuner: recupererValeur("petitDejeuner"),
    boissons: recupererValeur("boissons"),
    fruitsLegumes: recupererValeur("fruitsLegumes"),
    habitudes: recupererValeur("habitudes"),
    autresAllergies: recupererValeur("autresAllergies"),
    autresPathologies: recupererValeur("autresPathologies"),
    traitements: recupererValeur("traitements"),
    allergies: Array.from(document.querySelectorAll('input[name="allergies"]:checked')).map(input => input.value),
    pathologies: Array.from(document.querySelectorAll('input[name="pathologies"]:checked')).map(input => input.value),
    // Sauvegarde générique de tous les champs présents dans les onglets.
    formulaire: collecterDonneesFormulaire(),
    // L'anamnèse alimentaire possède son propre état JavaScript.
    anamnese: anmRows.map(row => ({
      ...row
    })),
    anamneseValideePourAnalyse: anamneseValideePourAnalyse === true,
    // Sauvegarde les données de la répartition des macros
    repartitionMacros: {
      proteines: etatRepartitionMacros.proteines,
      glucides: etatRepartitionMacros.glucides,
      lipides: etatRepartitionMacros.lipides
    }
  };
}

function mettreAJourStatutSauvegarde(message, type = "saved") {
  const element = document.getElementById("autoSaveStatus");
  if (!element) return;
  element.textContent = message;
  element.classList.remove("saving", "error", "saved");
  element.classList.add(type);
  document.dispatchEvent(new Event("patient-save-status"));
}

function libelleDerniereSauvegarde(patient) {
  if (!patient?.dateModification) return "Dossier enregistré — date non disponible";
  return "Enregistré le " + new Date(patient.dateModification).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function enregistrerDossierMaintenant() {

  clearTimeout(autoSaveTimer);
  autoSaveTimer = null;
  const donnees = collecterDonneesPatient();
  if (!donnees.nom || !donnees.prenom) {
    mettreAJourStatutSauvegarde("Non enregistré : renseignez le nom et le prénom", "saving");
    return false;
  }
  mettreAJourStatutSauvegarde("Enregistrement…", "saving");
  const patient = {
    id: patientActif?.id ?? Date.now(),
    dateCreation: patientActif?.dateCreation ?? new Date().toISOString(),
    ...donnees,
    dateModification: new Date().toISOString()
  };
  const precedents = patients.slice();
  const index = patients.findIndex(item => item.id === patient.id);
  if (index === -1) patients.push(patient);else patients[index] = patient;
  if (!sauvegarderPatients()) {
    patients = precedents;
    // Le message précis de sauvegarderPatients reste visible.
    return false;
  }
  patientActif = patient;
  dossierModifie = false;
  afficherPatients();
  mettreAJourPatientActif();
  mettreAJourStatutSauvegarde(libelleDerniereSauvegarde(patient), "saved");
  return true;
}

function finaliserSauvegardeEnAttente() {
  const statut = document.getElementById("autoSaveStatus");
  if (dossierModifie || autoSaveTimer || statut?.classList.contains("error")) return enregistrerDossierMaintenant();
  return true;
}

function sauvegarderDossierAutomatiquement() {
  dossierModifie = true;
  clearTimeout(autoSaveTimer);
  mettreAJourStatutSauvegarde("Modifications non enregistrées…", "saving");
  autoSaveTimer = setTimeout(enregistrerDossierMaintenant, 200);
}

function basculerActionsPatient(bouton) {
  const carte = bouton.closest(".patient-list-item");
  if (!carte) return;
  const boutonSupprimer = carte.querySelector(".patient-delete-button");
  if (!boutonSupprimer) return;
  const ouvert = carte.classList.toggle("actions-ouvertes");
  bouton.textContent = ouvert ? "−" : "+";
  bouton.setAttribute("aria-label", ouvert ? "Masquer les actions" : "Afficher les actions");
}

function supprimerPatient(id) {

  const patient = patients.find(item => item.id === id);
  if (!patient) return;
  const nom = `${patient.prenom || ""} ${patient.nom || ""}`.trim() || "ce patient";
  if (!confirm(`Supprimer le dossier de ${nom} ?\n\nToutes les données enregistrées pour ce patient seront supprimées.`)) return;
  const precedents = patients;
  patients = patients.filter(item => item.id !== id);
  if (!sauvegarderPatients()) { patients = precedents; return; }
  if (patientActif?.id === id) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
    dossierModifie = false;
    patientActif = null;
    viderFormulairePatient();
    afficherAccueilPatients();
    mettreAJourStatutSauvegarde("✓ Dossier supprimé", "saved");
  }
  afficherPatients();
  mettreAJourPatientActif();
}

function chargerPatientDansFormulaire(patient) {

  reinitialiserControlesDossier();
  window.clinicalGoals?.set(patient.objectifsRetenusConsultation);
  const objectifSauve = Object.hasOwn(patient, "objectifEnergetiquePersonnalise") ? patient.objectifEnergetiquePersonnalise : Number(patient.formulaire?.objectifEnergetique?.value) || null;
  objectifEnergetiquePersonnalise = Number.isFinite(objectifSauve) && objectifSauve > 0 ? objectifSauve : null;
  objectifEnergetiquePersonnaliseContexte = patient.objectifEnergetiquePersonnaliseContexte || null;
  const poidsCibleSauve = Object.hasOwn(patient, "poidsCibleTravail")
    ? Number(patient.poidsCibleTravail)
    : Number(patient.formulaire?.poidsCibleCalculs?.value);
  poidsCibleTravail = Number.isFinite(poidsCibleSauve) && poidsCibleSauve > 0 ? poidsCibleSauve : null;
  objectifTherapeutiqueObesite = ["stabilisation", "perte", "prevention_reprise", "habitudes"].includes(patient.objectifTherapeutiqueObesite)
    ? patient.objectifTherapeutiqueObesite
    : "stabilisation";
  objectifSelHTASelectionne = ["standard", "therapeutique5", "stricte"].includes(patient.objectifSelHTASelectionne)
    ? patient.objectifSelHTASelectionne
    : "standard";
  const selStrictSauve = Number(patient.objectifSelHTAStrict);
  objectifSelHTAStrict = Number.isFinite(selStrictSauve) && selStrictSauve > 0 && selStrictSauve <= 4
    ? selStrictSauve
    : null;
  formuleMetabolismeSelectionnee = FORMULES_METABOLISME[patient.formuleMetabolisme]
    ? patient.formuleMetabolisme
    : "henry2005";
  const activiteSauvee = patient.activite ?? patient.formulaire?.activite?.value ?? "";
  niveauActivitePALSelectionne = obtenirClePAL(activiteSauvee);
  ["nom", "prenom", "dateNaissance", "age", "sexe", "telephone", "taille", "poids", "motifConsultation", "motifConsultationDetails", "profession", "horairesTravail", "lieuVie", "transportTravail", "mutuelle", "situationFamiliale", "compositionFoyer", "nombreEnfants", "agesEnfants", "responsableCourses", "responsableCuisine", "animauxCompagnie", "promenadeChien", "sommeilDuree", "sommeilQualite", "contexteVie", "antecedentsFamiliaux", "poidsHabituel", "poidsMax", "poidsMin", "evolutionPoids", "antecedentsRegimes", "evenementsPoids", "tourTaille", "mesuresAnthropometriquesNotes", "hobbies", "sportPratique", "sportType", "sportFrequence", "sportDuree", "sportMoment", "objectif", "objectifDetails", "repas", "petitDejeuner", "boissons", "fruitsLegumes", "habitudes", "autresAllergies", "autresPathologies", "traitements"].forEach(id => definirValeur(id, patient[id] ?? ""));
  document.querySelectorAll('input[name="allergies"]').forEach(input => {
    input.checked = patient.allergies?.includes(input.value) ?? false;
  });
  document.querySelectorAll('input[name="pathologies"]').forEach(input => {
    input.checked = patient.pathologies?.includes(input.value) ?? false;
  });
  if (patient.formulaire) {
    restaurerDonneesFormulaire(patient.formulaire);
  }
  mettreAJourAgeDepuisDateNaissance();
  synchroniserBlocDiabete();
  synchroniserBlocHTA();
  window.actualiserDyslipidemie?.();
  window.actualiserObesite?.();
  window.actualiserEtatNutritionnel?.();
  window.actualiserBiologieAdaptative?.();
  if (patient.repartitionMacros) {
    etatRepartitionMacros = {
      proteines: Number(patient.repartitionMacros.proteines),
      glucides: Number(patient.repartitionMacros.glucides),
      lipides: Number(patient.repartitionMacros.lipides)
    };
  }
  brouillonRepartitionMacros = { ...etatRepartitionMacros };
}

function ouvrirPatient(id) {
  window.clinicalSession?.capture();

  if (!finaliserSauvegardeEnAttente()) return;
  const patient = patients.find(item => item.id === id);
  if (!patient) return;
  patientActif = patient;
  chargerPatientDansFormulaire(patient);
  mettreAJourStatutSauvegarde(libelleDerniereSauvegarde(patient), "saved");
  chargerAnamnesePatient(patient);
  mettreAJourPatientActif();
  afficherDossier();
  const boutonPatient = document.querySelector('.nav-tab[onclick*="ouvrirOnglet(\'patient\'"]');
  window.clinicalSession?.beginRestore();
  ouvrirOnglet("patient", boutonPatient);
  afficherPatients();
  fermerSidebarMobile();
  window.clinicalSession?.restore(id);
}

function filtrerPatients(recherche = "") {
  const terme = recherche.trim().toLowerCase();
  afficherPatients(terme);
}

function afficherPatients(recherche = "") {
  const liste = document.getElementById("patients-list");
  if (!liste) return;
  const terme = String(recherche).trim().toLowerCase();
  const patientsFiltres = patients.filter(patient => {
    const texte = `${patient.prenom || ""} ${patient.nom || ""}`.toLowerCase();
    return texte.includes(terme);
  });

  if (patientsFiltres.length === 0) {
    liste.innerHTML = `
            <p class="patients-empty">
                ${terme ? "Aucun patient trouvé." : "Aucun patient enregistré."}
            </p>
        `;
    return;
  }

  liste.innerHTML = patientsFiltres.map(patient => {
    const actif = patientActif?.id === patient.id ? " patient-active" : "";
    return `
            <article
                class="patient-list-item${actif}"
                onclick="ouvrirPatient(${patient.id})"
            >
                <div class="patient-avatar">${echapperHTML(initialesPatient(patient))}</div>

                <div class="patient-list-copy">
                    <div class="patient-list-info">
                        <strong>
                            ${echapperHTML(patient.prenom)} ${echapperHTML(patient.nom)}
                        </strong>
                        <span>
                            ${patient.dateCreation ? `Créé le ${new Date(patient.dateCreation).toLocaleDateString("fr-FR")}` : "Date de création non disponible"}
                        </span>
                    </div>
                </div>

   <div class="patient-list-actions">
    <button
        type="button"
        class="patient-delete-button"
        onclick="event.stopPropagation(); supprimerPatient(${patient.id})"
        title="Supprimer le patient"
        aria-label="Supprimer le patient"
    >
            ✕

    </button>

    <button
        type="button"
        class="patient-more-button"
        onclick="event.stopPropagation(); basculerActionsPatient(this)"
        title="Actions"
        aria-label="Afficher les actions"
    >
        +
    </button>
</div>
</div>
            </article>
        `;
  }).join("");
}

function mettreAJourPatientActif() {

  window.actualiserResumePatient?.();
  const titre = document.getElementById("patientActifNom");
  const sousTitre = document.getElementById("patientActifSousTitre");
  if (!patientActif) {
    if (titre) titre.textContent = "Aucun patient sélectionné";
    if (sousTitre) {
      sousTitre.textContent = "Sélectionnez un patient ou créez un nouveau dossier.";
    }
    return;
  }

  const nomComplet = `${patientActif.prenom || ""} ${patientActif.nom || ""}`.trim();
  if (titre) titre.textContent = nomComplet || "Patient sans nom";
  if (sousTitre) {
    const informations = [];
    if (patientActif.age) {
      informations.push(`${patientActif.age} ans`);
    }
    if (patientActif.pathologies?.length) {
      informations.push(patientActif.pathologies.slice(0, 2).join(" · "));
    }
    sousTitre.textContent = informations.length ? informations.join(" · ") : "Dossier patient";
  }
}

function basculerSidebar() {
  const sidebar = document.querySelector(".patients-sidebar");
  const bouton = document.querySelector(".mobile-sidebar-toggle");
  if (!sidebar) return;
  const estOuverte = sidebar.classList.toggle("mobile-open");
  bouton?.setAttribute("aria-expanded", String(estOuverte));
}

function fermerSidebarMobile() {
  const sidebar = document.querySelector(".patients-sidebar");
  const bouton = document.querySelector(".mobile-sidebar-toggle");
  if (sidebar) sidebar.classList.remove("mobile-open");
  bouton?.setAttribute("aria-expanded", "false");
}

function activerModeSombre(active) {
  document.body.classList.toggle("dark-mode", active);
  Stockage.ecrire(DARK_MODE_STORAGE_KEY, active);
}

function definirEtatMenuParametres(ouvert) {
  const menu = document.getElementById("settingsMenu");
  const bouton = document.querySelector(".settings-button");
  if (!menu) return;
  menu.style.display = ouvert ? "block" : "none";
  menu.setAttribute("aria-hidden", String(!ouvert));
  bouton?.setAttribute("aria-expanded", String(ouvert));
}

function toggleSettingsMenu() {
  const menu = document.getElementById("settingsMenu");
  if (!menu) return;
  definirEtatMenuParametres(menu.style.display !== "block");
}


//! Fonctions utilitaires //


function anmParseNumber(value) {
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function anmFindFoodById(id) {
  if (id === null || id === undefined || id === "") return undefined;
  return CIQUAL_ALIMENTS.find(food => food.id === Number(id));
}

function anmNormalizeSearch(value) {
  return String(value || "").toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatReferenceBesoin(reference) {
  if (!reference) return "Non défini";
  if (reference.affichage) return reference.affichage;
  if (reference.label) return reference.label;
  if (reference.type === "unavailable") return "Non défini";
  if (reference.type === "recommended" && Number.isFinite(reference.min)) {
    const recommandation = Number.isFinite(reference.recommendedMax) && reference.recommendedMax !== reference.min
      ? `${reference.min.toFixed(1)} – ${reference.recommendedMax.toFixed(1)} ${reference.unite}`
      : `${reference.min.toFixed(1)} ${reference.unite}`;
    return Number.isFinite(reference.upperLimit)
      ? `${recommandation} · AMT ${reference.upperLimit.toFixed(1)} ${reference.unite}`
      : recommandation;
  }
  if (reference.type === "range" && Number.isFinite(reference.min) && Number.isFinite(reference.max)) return `${reference.min.toFixed(1)} – ${reference.max.toFixed(1)} ${reference.unite}`;
  if (reference.type === "min" && Number.isFinite(reference.min)) return `≥ ${reference.min.toFixed(1)} ${reference.unite}`;
  if (reference.type === "max" && Number.isFinite(reference.max)) return `≤ ${reference.max.toFixed(1)} ${reference.unite}`;
  if (reference.type === "exact" && Number.isFinite(reference.min)) return `${reference.min.toFixed(0)} ${reference.unite}`;
  return "Non défini";
}

function recupererValeur(id) {
  const element = document.getElementById(id);
  return element ? element.value : "";
}

function definirValeur(id, valeur = "") {
  const element = document.getElementById(id);
  if (element) element.value = valeur;
}

function initialesPatient(patient) {
  const prenom = String(patient.prenom || "").trim();
  const nom = String(patient.nom || "").trim();
  return (prenom.charAt(0) + nom.charAt(0)).toUpperCase() || "P";
}

function echapperHTML(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}


//! Colonnes patient //


document.addEventListener("change", function (event) {
  if (event.target.matches('input[name="pathologies"][value="Diabète"]') || event.target.id === "diabeteType") {
    synchroniserBlocDiabete();
    return;
  }

  if (event.target.matches('input[name="pathologies"][value="Hypertension"]')) {
    synchroniserBlocHTA();
    return;
  }

  if (event.target.id === "htaSchemaTherapeutique") {
    afficherDetailsTraitementHTA(event.target.value);
    return;
  }

  // Détails traitement
  if (event.target.id === "diabeteTraitement") {
    const typeDiabete = document.getElementById("diabeteType");
    afficherDetailsTraitementDiabete(typeDiabete?.value ?? "", event.target.value);
  }
});

document.addEventListener("input", function (event) {
  if (!event.target.classList.contains("macro-slider")) return;
  const idModifie = event.target.id.replace("macro-", "").replace("-slider", "");
  mettreAJourValeurMacronutriment(idModifie, event.target.value);
});

document.addEventListener("click", function (event) {
  const step = event.target.closest("[data-macro-step]");
  if (step) {
    const id = step.dataset.macroId;
    mettreAJourValeurMacronutriment(id, Number(brouillonRepartitionMacros[id]) + Number(step.dataset.macroStep));
    return;
  }
  const appliquer = event.target.closest("[data-macro-apply]");
  if (appliquer) {
    utiliserRationTravailMacronutriments();
    return;
  }

  const reinitialiser = event.target.closest("[data-macro-reset]");
  if (reinitialiser) {
    reinitialiserBrouillonMacronutriments();
  }
});

document.addEventListener("change", function (event) {
  const calculsOuverts = document.getElementById("calculs")?.classList.contains("active");
  if (!calculsOuverts) return;

  const changementPathologie = event.target.matches?.('input[name="pathologies"]');
  const changementEtatNutritionnel = event.target.closest?.("#etatNutritionnelDetails");
  if (changementPathologie || changementEtatNutritionnel) {
    calculerEtAfficherNutritionnels();
  }
});

window.addEventListener("resize", anmRepositionOpenSearchMenus);


//! INFOBULLES — QUALITÉ DES DONNÉES DE COMPOSITION //

let infoBulleQualiteCompositionActive = null;

function obtenirInfoBulleQualiteComposition() {
  let infoBulle = document.getElementById("analysisQualityTooltip");
  if (infoBulle) return infoBulle;

  infoBulle = document.createElement("div");
  infoBulle.id = "analysisQualityTooltip";
  infoBulle.className = "analysis-quality-tooltip";
  infoBulle.setAttribute("role", "tooltip");
  infoBulle.hidden = true;
  document.body.appendChild(infoBulle);
  return infoBulle;
}

function positionnerInfoBulleQualiteComposition(icone, infoBulle) {
  if (!icone || !infoBulle || infoBulle.hidden) return;

  const marge = 10;
  const rectIcone = icone.getBoundingClientRect();
  const rectBulle = infoBulle.getBoundingClientRect();
  const largeurViewport = document.documentElement.clientWidth || window.innerWidth;
  const hauteurViewport = document.documentElement.clientHeight || window.innerHeight;

  let gauche = rectIcone.left + rectIcone.width / 2 - rectBulle.width / 2;
  gauche = Math.max(marge, Math.min(gauche, largeurViewport - rectBulle.width - marge));

  let haut = rectIcone.top - rectBulle.height - marge;
  if (haut < marge) haut = rectIcone.bottom + marge;
  haut = Math.max(marge, Math.min(haut, hauteurViewport - rectBulle.height - marge));

  infoBulle.style.left = `${Math.round(gauche)}px`;
  infoBulle.style.top = `${Math.round(haut)}px`;
}

function afficherInfoBulleQualiteComposition(icone) {
  if (!(icone instanceof Element) || !icone.classList.contains("analysis-quality-icon")) return;

  const texte =
    icone.dataset.tooltip ||
    icone.getAttribute("title") ||
    icone.getAttribute("aria-label") ||
    "";

  if (!texte.trim()) return;

  // Le titre natif est conservé comme secours dans le HTML, puis retiré dès
  // qu'une vraie infobulle NutriFlow prend le relais afin d'éviter un doublon.
  if (!icone.dataset.tooltip) icone.dataset.tooltip = texte;
  if (icone.hasAttribute("title")) icone.removeAttribute("title");
  if (!icone.hasAttribute("tabindex")) icone.setAttribute("tabindex", "0");

  const infoBulle = obtenirInfoBulleQualiteComposition();
  infoBulle.textContent = texte;
  infoBulle.hidden = false;
  icone.setAttribute("aria-describedby", infoBulle.id);
  infoBulleQualiteCompositionActive = icone;

  requestAnimationFrame(() => positionnerInfoBulleQualiteComposition(icone, infoBulle));
}

function masquerInfoBulleQualiteComposition(icone = infoBulleQualiteCompositionActive) {
  const infoBulle = document.getElementById("analysisQualityTooltip");
  if (icone?.removeAttribute) icone.removeAttribute("aria-describedby");
  if (infoBulle) {
    infoBulle.hidden = true;
    infoBulle.textContent = "";
  }
  if (!icone || icone === infoBulleQualiteCompositionActive) {
    infoBulleQualiteCompositionActive = null;
  }
}

document.addEventListener("pointerover", event => {
  const icone = event.target.closest?.(".analysis-quality-icon");
  if (!icone) return;
  afficherInfoBulleQualiteComposition(icone);
});

document.addEventListener("pointerout", event => {
  const icone = event.target.closest?.(".analysis-quality-icon");
  if (!icone) return;
  if (event.relatedTarget && icone.contains(event.relatedTarget)) return;
  masquerInfoBulleQualiteComposition(icone);
});

document.addEventListener("focusin", event => {
  const icone = event.target.closest?.(".analysis-quality-icon");
  if (icone) afficherInfoBulleQualiteComposition(icone);
});

document.addEventListener("focusout", event => {
  const icone = event.target.closest?.(".analysis-quality-icon");
  if (icone) masquerInfoBulleQualiteComposition(icone);
});

window.addEventListener("scroll", () => { const icone = infoBulleQualiteCompositionActive; const bulle = document.getElementById("analysisQualityTooltip"); if (icone && bulle && !bulle.hidden) positionnerInfoBulleQualiteComposition(icone, bulle); }, { passive: true, capture: true });
window.addEventListener("resize", () => masquerInfoBulleQualiteComposition());


//! INITIALISATION DE L'APPLICATION //


document.addEventListener("DOMContentLoaded", () => {

  document.querySelectorAll(".tab-content").forEach(onglet => {
    onglet.style.display = "";
  });
  anmInit();
  synchroniserBlocDiabete();
  synchroniserBlocHTA();
  window.actualiserDyslipidemie?.();
  window.actualiserObesite?.();
  afficherAccueilPatients();
  afficherPatients();

  const workspace = document.querySelector(".workspace");
  if (workspace) {
    const declencherSauvegarde = event => {
      const element = event.target;
      if (!element || element.id === "darkModeToggle" || element.id === "recherchePatient" || element.matches(".anm-food-search")) {
        return;
      }

      if (!element.matches("input, select, textarea")) return;
      if (element.id === 'objectifEnergetique') {
        const valeur = Number(element.value);
        objectifEnergetiquePersonnalise = Number.isFinite(valeur) && valeur > 0 ? valeur : null;
        const denutritionActive = typeof evaluerDenutritionHAS === "function" && evaluerDenutritionHAS()?.diagnostic === true;
        objectifEnergetiquePersonnaliseContexte = objectifEnergetiquePersonnalise !== null
          ? (denutritionActive ? "denutrition" : "general")
          : null;
      }

      if (element.id === 'poidsCibleCalculs') {
        const valeur = Number.parseFloat(String(element.value).replace(",", "."));
        poidsCibleTravail = Number.isFinite(valeur) && valeur > 0 ? valeur : null;
      }

      if (element.id === 'dateNaissance') {
        mettreAJourAgeDepuisDateNaissance();
        window.actualiserEtatNutritionnel?.();
      }
      mettreAJourStatutSauvegarde("⟳ Modification détectée…", "saving");
      sauvegarderDossierAutomatiquement();
    };
    workspace.addEventListener("input", declencherSauvegarde);
    workspace.addEventListener("change", declencherSauvegarde);
  }

  const toggle = document.getElementById("darkModeToggle");
  if (toggle) {
    const modeSombre = Stockage.lire(DARK_MODE_STORAGE_KEY, false);
    toggle.checked = modeSombre;
    activerModeSombre(modeSombre);
    toggle.addEventListener("change", event => {
      activerModeSombre(event.target.checked);
    });
  }
});

document.addEventListener("click", function (event) {
  const menu = document.getElementById("settingsMenu");
  const bouton = document.querySelector(".settings-button");
  if (!menu || !bouton) return;
  if (menu.style.display === "block" && !menu.contains(event.target) && !bouton.contains(event.target)) {
    definirEtatMenuParametres(false);
  }
});

document.addEventListener("keydown", function (event) {
  if (event.key !== "Escape") return;
  masquerInfoBulleQualiteComposition();
  const menu = document.getElementById("settingsMenu");
  if (menu) {
    definirEtatMenuParametres(false);
  }
});


//! NAVIGATION //


document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".main-nav");
  if (!nav) return;
  const repere = document.createElement("div");
  repere.className = "nav-scroll-anchor";
  repere.setAttribute("aria-hidden", "true");
  nav.before(repere);
  let frame = null;
  function mettreAJourNav() {
    frame = null;
    if (!nav.getClientRects().length) return;
    const top = repere.getBoundingClientRect().top;
    const etendue = nav.classList.contains("nav-sticky-expanded");
    // Une petite zone de tolérance évite les oscillations autour du seuil.
    nav.classList.toggle("nav-sticky-expanded", etendue ? top < 8 : top <= 0);
  }

  function planifierMiseAJour() {
    if (frame === null) frame = requestAnimationFrame(mettreAJourNav);
  }

  mettreAJourNav();
  window.addEventListener("scroll", planifierMiseAJour, { passive: true });
  window.addEventListener("resize", planifierMiseAJour);
  window.addEventListener("pageshow", planifierMiseAJour);
  document.addEventListener("visibilitychange", planifierMiseAJour);
  const observer = new ResizeObserver(planifierMiseAJour);
  observer.observe(nav.parentElement);
  const header = document.querySelector(".workspace-header");
  if (header) observer.observe(header);
  document.fonts?.ready.then(planifierMiseAJour);
});

window.addEventListener('beforeunload', event => {
  if (!finaliserSauvegardeEnAttente()) {
    event.preventDefault();
    event.returnValue = '';
  }
});
window.addEventListener('pagehide', () => finaliserSauvegardeEnAttente());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') finaliserSauvegardeEnAttente();
});

// La saisie peut rester temporairement vide sans modifier le brouillon.
document.addEventListener("input", event => {
  if (!event.target.matches(".macro-exact")) return;
  const value = event.target.valueAsNumber;
  if (Number.isFinite(value) && value >= 0 && value <= 100 && Number.isInteger(value)) {
    mettreAJourValeurMacronutriment(event.target.dataset.macroId, value);
  }
});
document.addEventListener("change", event => {
  if (!event.target.matches(".macro-exact")) return;
  const id = event.target.dataset.macroId;
  const value = event.target.valueAsNumber;
  if (Number.isFinite(value)) mettreAJourValeurMacronutriment(id, value);
  event.target.value = String(brouillonRepartitionMacros[id]);
});

document.addEventListener("click", event => {
  const icone = event.target.closest?.(".analysis-quality-icon");
  if (icone) afficherInfoBulleQualiteComposition(icone);
  else masquerInfoBulleQualiteComposition();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") masquerInfoBulleQualiteComposition();
});

window.addEventListener("storage", event => {
  if (event.key === PATIENTS_STORAGE_KEY || event.key === null) mettreAJourStatutSauvegarde("Dossiers modifiés dans une autre fenêtre : exportez vos changements avant de recharger.", "error");
});
document.addEventListener("DOMContentLoaded", () => {
  if (erreurChargementPatients) mettreAJourStatutSauvegarde("Stockage illisible : enregistrement bloqué pour préserver les dossiers existants.", "error");
});
