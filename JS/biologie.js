// =========================================================
// NUTRIFLOW — BIOLOGIE SANGUINE ADAPTATIVE V1
// Source de vérité : synthese.biologie
// =========================================================
(function (global) {
  "use strict";

  const NIVEAU_PERTINENCE = Object.freeze({
    pertinent: 1,
    prioritaire: 2
  });

  const PARAMETRES_BIOLOGIQUES = Object.freeze({
    bioGlycemie: { label: "Glycémie à jeun", chemin: ["glycemique", "glycemie"] },
    bioHba1c: { label: "HbA1c", chemin: ["glycemique", "hba1c"] },
    bioInsulineJeun: { label: "Insulinémie à jeun", chemin: ["glycemique", "insulineJeun"] },
    bioHoma: { label: "HOMA-IR", chemin: ["glycemique", "homa"] },
    bioFerritine: { label: "Ferritine", chemin: ["martial", "ferritine"] },
    bioFerSerique: { label: "Fer sérique", chemin: ["martial", "ferSerique"] },
    bioTransferrine: { label: "Transferrine", chemin: ["martial", "transferrine"] },
    bioCst: { label: "CST", chemin: ["martial", "cst"] },
    bioHemoglobine: { label: "Hémoglobine", chemin: ["hematologie", "hemoglobine"] },
    bioReticulocytes: { label: "Réticulocytes", chemin: ["hematologie", "reticulocytes"] },
    bioVgm: { label: "VGM", chemin: ["hematologie", "vgm"] },
    bioCrp: { label: "CRP", chemin: ["inflammation", "crp"] },
    bioVs: { label: "VS", chemin: ["inflammation", "vs"] },
    bioAlbumine: { label: "Albumine", chemin: ["inflammation", "albumine"] },
    bioAsat: { label: "ASAT", chemin: ["hepatique", "asat"] },
    bioAlat: { label: "ALAT", chemin: ["hepatique", "alat"] },
    bioGgt: { label: "GGT", chemin: ["hepatique", "ggt"] },
    bioPal: { label: "Phosphatases alcalines", chemin: ["hepatique", "pal"] },
    bioBilirubine: { label: "Bilirubine", chemin: ["hepatique", "bilirubine"] },
    bioSodium: { label: "Sodium plasmatique", chemin: ["renal", "sodium"] },
    bioPotassium: { label: "Potassium plasmatique", chemin: ["renal", "potassium"] },
    bioCreatinine: { label: "Créatinine", chemin: ["renal", "creatinine"] },
    bioDfg: { label: "DFG estimé", chemin: ["renal", "dfg"] },
    bioRac: { label: "RAC", chemin: ["renal", "rac"] },
    bioBicarbonates: { label: "Bicarbonates", chemin: ["renal", "bicarbonates"] },
    bioAcideUrique: { label: "Acide urique", chemin: ["renal", "acideUrique"] },
    bioCholesterolTotal: { label: "Cholestérol total", chemin: ["lipidique", "cholesterolTotal"] },
    bioLdl: { label: "LDL-cholestérol", chemin: ["lipidique", "ldl"] },
    bioHdl: { label: "HDL-cholestérol", chemin: ["lipidique", "hdl"] },
    bioNonHdl: { label: "non-HDL-cholestérol", chemin: ["lipidique", "nonHdl"], calcule: true },
    bioTriglycerides: { label: "Triglycérides", chemin: ["lipidique", "triglycerides"] },
    bioApoB: { label: "Apolipoprotéine B", chemin: ["lipidique", "apoB"] },
    bioLpA: { label: "Lipoprotéine(a)", chemin: ["lipidique", "lpA"] },
    bioCalcium: { label: "Calcium", chemin: ["mineraux", "calcium"] },
    bioMagnesium: { label: "Magnésium", chemin: ["mineraux", "magnesium"] },
    bioPhosphore: { label: "Phosphate", chemin: ["mineraux", "phosphore"] },
    bioPth: { label: "PTH", chemin: ["mineraux", "pth"] },
    bioZinc: { label: "Zinc", chemin: ["mineraux", "zinc"] },
    bioVitamineB1: { label: "Vitamine B1", chemin: ["vitamines", "vitamineB1"] },
    bioVitamineB9: { label: "Folates (B9)", chemin: ["vitamines", "vitamineB9"] },
    bioVitamineB12: { label: "Vitamine B12", chemin: ["vitamines", "vitamineB12"] },
    bioVitamineD: { label: "25-OH vitamine D", chemin: ["vitamines", "vitamineD"] },
    bioTsh: { label: "TSH", chemin: ["thyroidien", "tsh"] },
    bioT4l: { label: "T4 libre", chemin: ["thyroidien", "t4l"] },
    bioT3l: { label: "T3 libre", chemin: ["thyroidien", "t3l"] }
  });

  // Ce registre pilote uniquement l'ergonomie : il met en avant les données
  // utiles au contexte, sans poser de diagnostic et sans masquer le bilan complet.
  const BIOLOGIE_PAR_PATHOLOGIE = Object.freeze({
    "Diabète": {
      label: "Diabète",
      prioritaires: ["bioHba1c", "bioGlycemie"],
      pertinents: ["bioDfg", "bioCreatinine", "bioLdl", "bioTriglycerides", "bioHdl"]
    },
    "Hypertension": {
      label: "HTA",
      prioritaires: ["bioPotassium", "bioDfg"],
      pertinents: ["bioSodium", "bioCreatinine", "bioGlycemie", "bioHba1c", "bioLdl"]
    },
    "Obésité": {
      label: "Obésité",
      prioritaires: [],
      pertinents: ["bioGlycemie", "bioHba1c", "bioLdl", "bioHdl", "bioTriglycerides", "bioAlat", "bioGgt"]
    },
    "Dyslipidémie": {
      label: "Dyslipidémie",
      prioritaires: ["bioLdl", "bioTriglycerides"],
      pertinents: ["bioCholesterolTotal", "bioHdl", "bioNonHdl", "bioApoB", "bioLpA", "bioGlycemie", "bioHba1c", "bioTsh"]
    },
    "Maladie rénale": {
      label: "MRC",
      prioritaires: ["bioDfg", "bioRac", "bioPotassium", "bioBicarbonates"],
      pertinents: [
        "bioCreatinine", "bioSodium", "bioPhosphore", "bioCalcium", "bioPth",
        "bioAlbumine", "bioHemoglobine", "bioFerritine", "bioCst", "bioVitamineD"
      ]
    },
    "Maladie cœliaque": {
      label: "Maladie cœliaque",
      prioritaires: [],
      pertinents: ["bioFerritine", "bioFerSerique", "bioTransferrine", "bioCst", "bioAlbumine", "bioVitamineD"]
    }
  });

  function fusionnerPertinenceBiologique(pathologies = []) {
    const resultat = new Map();

    const ajouter = (id, niveau, pathologie) => {
      if (!PARAMETRES_BIOLOGIQUES[id]) return;

      const existant = resultat.get(id) || {
        id,
        niveau: "pertinent",
        score: 0,
        pathologies: []
      };

      const score = NIVEAU_PERTINENCE[niveau] || 0;
      if (score > existant.score) {
        existant.niveau = niveau;
        existant.score = score;
      }

      if (!existant.pathologies.includes(pathologie)) {
        existant.pathologies.push(pathologie);
      }

      resultat.set(id, existant);
    };

    for (const pathologie of pathologies) {
      const configuration = BIOLOGIE_PAR_PATHOLOGIE[pathologie];
      if (!configuration) continue;

      for (const id of configuration.prioritaires || []) {
        ajouter(id, "prioritaire", configuration.label || pathologie);
      }

      for (const id of configuration.pertinents || []) {
        ajouter(id, "pertinent", configuration.label || pathologie);
      }
    }

    return resultat;
  }

  function lireChemin(objet, chemin = []) {
    return chemin.reduce((courant, cle) => courant?.[cle], objet);
  }

  function obtenirPathologiesActives() {
    if (typeof document === "undefined") return [];
    return Array.from(document.querySelectorAll('input[name="pathologies"]:checked'))
      .map(element => element.value)
      .filter(Boolean);
  }

  function obtenirSyntheseBiologiqueCourante() {
    if (typeof global.obtenirSyntheseBiologie === "function") {
      return global.obtenirSyntheseBiologie();
    }
    return null;
  }

  function formaterValeurBiologique(valeur) {
    if (!Number.isFinite(valeur)) return "Non renseigné";

    const absolue = Math.abs(valeur);
    const decimales = absolue >= 100 ? 0 : absolue >= 10 ? 1 : 2;

    return valeur.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimales
    });
  }

  function formaterDateBiologique(date) {
    if (!date) return "";
    const objetDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(objetDate.getTime())) return date;
    return objetDate.toLocaleDateString("fr-FR");
  }

  function obtenirDonneeBiologique(synthese, id) {
    const configuration = PARAMETRES_BIOLOGIQUES[id];
    if (!configuration || !synthese) return null;
    return lireChemin(synthese, configuration.chemin) || null;
  }

  function trouverLigneBiologique(id) {
    if (typeof document === "undefined") return null;
    return document.getElementById(id)?.closest("tr") || null;
  }

  function nettoyerMisesEnValeur() {
    if (typeof document === "undefined") return;

    document.querySelectorAll(".biology-table tbody tr").forEach(ligne => {
      ligne.classList.remove("biology-row-priority", "biology-row-relevant");
      ligne.querySelectorAll(".biology-row-contexts").forEach(element => element.remove());
    });
  }

  function ajouterBadgesLigne(ligne, contextes, niveau) {
    if (!ligne || !contextes?.length) return;

    const cellule = ligne.querySelector('th[scope="row"]');
    if (!cellule) return;

    const groupe = document.createElement("span");
    groupe.className = "biology-row-contexts";
    groupe.setAttribute("aria-label", `Pertinent pour : ${contextes.join(", ")}`);

    for (const contexte of contextes) {
      const badge = document.createElement("span");
      badge.className = `biology-row-context biology-row-context-${niveau}`;
      badge.textContent = contexte;
      groupe.appendChild(badge);
    }

    cellule.appendChild(groupe);
  }

  function actualiserNonHdlAffiche(synthese) {
    if (typeof document === "undefined") return;

    const valeur = document.getElementById("bioNonHdl");
    const unite = document.getElementById("bioNonHdlUnite");
    const date = document.getElementById("bioNonHdlDate");

    if (!valeur || !unite || !date) return;

    const nonHdl = synthese?.lipidique?.nonHdl;

    if (!nonHdl?.calculable || !Number.isFinite(nonHdl.valeur)) {
      valeur.textContent = "—";
      unite.textContent = nonHdl?.unite || "—";
      date.textContent = "—";
      valeur.title = nonHdl?.raison === "unites_incompatibles"
        ? "Calcul impossible : unités du cholestérol total et du HDL-C incompatibles."
        : nonHdl?.raison === "resultats_incoherents"
          ? "Calcul impossible : résultats biologiques incohérents."
          : "Renseignez le cholestérol total et le HDL-C pour calculer le non-HDL-C.";
      return;
    }

    valeur.textContent = formaterValeurBiologique(nonHdl.valeur);
    unite.textContent = nonHdl.unite || "—";

    if (nonHdl.datesDifferentes) {
      date.textContent = "Dates différentes";
      date.title = "Le cholestérol total et le HDL-C proviennent de dates différentes.";
    } else {
      date.textContent = formaterDateBiologique(nonHdl.date) || "—";
      date.removeAttribute("title");
    }

    valeur.title = "Calcul automatique : cholestérol total − HDL-C";
  }

  function construireCarteBiologique(id, meta, synthese) {
    const configuration = PARAMETRES_BIOLOGIQUES[id];
    if (!configuration) return null;

    const donnee = obtenirDonneeBiologique(synthese, id);
    const carte = document.createElement("article");
    carte.className = `biology-context-card biology-context-card-${meta.niveau}`;

    const tete = document.createElement("div");
    tete.className = "biology-context-card-head";

    const libelle = document.createElement("span");
    libelle.className = "biology-context-card-label";
    libelle.textContent = configuration.label;

    const niveau = document.createElement("span");
    niveau.className = `biology-context-level biology-context-level-${meta.niveau}`;
    niveau.textContent = meta.niveau === "prioritaire" ? "Prioritaire" : "Pertinent";

    tete.append(libelle, niveau);

    const valeur = document.createElement("strong");
    valeur.className = "biology-context-card-value";

    if (Number.isFinite(donnee?.valeur)) {
      valeur.textContent = `${formaterValeurBiologique(donnee.valeur)}${donnee.unite ? ` ${donnee.unite}` : ""}`;
    } else {
      valeur.textContent = "Non renseigné";
      valeur.classList.add("is-missing");
    }

    const pied = document.createElement("div");
    pied.className = "biology-context-card-foot";

    const contextes = document.createElement("span");
    contextes.textContent = meta.pathologies.join(" · ");
    pied.appendChild(contextes);

    const dateEffective = donnee?.date || "";
    if (dateEffective) {
      const date = document.createElement("span");
      date.textContent = formaterDateBiologique(dateEffective);
      if (donnee.sourceDate === "bilan") {
        date.title = "Date générale du bilan";
      }
      pied.appendChild(date);
    }

    if (configuration.calcule) {
      const calcul = document.createElement("span");
      calcul.textContent = "Calculé";
      pied.appendChild(calcul);
    }

    carte.append(tete, valeur, pied);
    return carte;
  }

  function ajouterPertinenceContextuelle(pertinence) {
    const ajouter = (id, niveau, contexte) => {
      if (!PARAMETRES_BIOLOGIQUES[id]) return;
      const score = NIVEAU_PERTINENCE[niveau] || 0;
      const existant = pertinence.get(id) || { id, niveau: "pertinent", score: 0, pathologies: [] };
      if (score > existant.score) { existant.score = score; existant.niveau = niveau; }
      if (contexte && !existant.pathologies.includes(contexte)) existant.pathologies.push(contexte);
      pertinence.set(id, existant);
    };

    const diabeteActif = document.querySelector('input[name="pathologies"][value="Diabète"]')?.checked === true;
    if (diabeteActif && document.getElementById("diabeteTraitement")?.value === "metformine") {
      ajouter("bioVitamineB12", "prioritaire", "Diabète + metformine");
    }

    const bari = document.getElementById("obesiteChirurgieBariatrique")?.value || "";
    if (["projet", "sleeve", "bypass", "autre_postop"].includes(bari)) {
      const contexte = bari === "projet" ? "Obésité — projet bariatrique" : "Obésité — post-bariatrique";
      ["bioFerritine", "bioVitamineB9", "bioVitamineB12", "bioVitamineD", "bioCalcium", "bioMagnesium", "bioPhosphore", "bioZinc"].forEach(id => ajouter(id, "pertinent", contexte));
      // La B1 reste disponible dans le bilan, mais n'est pas imposée comme dosage
      // biologique systématique en post-bariatrique : la clinique garde une place centrale.
    }

    if (typeof global.evaluerDenutritionHAS === "function") {
      const denut = global.evaluerDenutritionHAS();
      if (denut?.diagnostic === true) {
        ["bioFerritine", "bioVitamineB9", "bioVitamineB12", "bioVitamineD", "bioCalcium", "bioZinc"].forEach(id => ajouter(id, "pertinent", "Dénutrition"));
        ["bioVitamineB1", "bioPotassium", "bioMagnesium", "bioPhosphore"].forEach(id => ajouter(id, "prioritaire", "Dénutrition — sécurité de renutrition"));
      }
    }
  }

  function actualiserBiologieAdaptative() {
    if (typeof document === "undefined") return;

    const synthese = obtenirSyntheseBiologiqueCourante();
    actualiserNonHdlAffiche(synthese);

    const pathologies = obtenirPathologiesActives();
    const pertinence = fusionnerPertinenceBiologique(pathologies);
    ajouterPertinenceContextuelle(pertinence);

    nettoyerMisesEnValeur();

    for (const meta of pertinence.values()) {
      const ligne = trouverLigneBiologique(meta.id);
      if (!ligne) continue;

      ligne.classList.add(
        meta.niveau === "prioritaire"
          ? "biology-row-priority"
          : "biology-row-relevant"
      );

      ajouterBadgesLigne(ligne, meta.pathologies, meta.niveau);
    }

    const resume = document.getElementById("biologyContextSummary");
    const grille = document.getElementById("biologyContextGrid");
    const description = document.getElementById("biologyContextDescription");

    if (!resume || !grille || !description) return;

    if (pertinence.size === 0) {
      resume.hidden = true;
      grille.replaceChildren();
      return;
    }

    const contextesActifs = pathologies
      .filter(pathologie => BIOLOGIE_PAR_PATHOLOGIE[pathologie])
      .map(pathologie => BIOLOGIE_PAR_PATHOLOGIE[pathologie].label || pathologie);

    description.textContent = contextesActifs.length
      ? `Mise en avant selon : ${contextesActifs.join(" · ")}. Les valeurs restent saisies une seule fois dans ce bilan.`
      : "Les valeurs restent saisies une seule fois dans ce bilan.";

    grille.replaceChildren();

    const elementsTries = [...pertinence.values()].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const labelA = PARAMETRES_BIOLOGIQUES[a.id]?.label || a.id;
      const labelB = PARAMETRES_BIOLOGIQUES[b.id]?.label || b.id;
      return labelA.localeCompare(labelB, "fr");
    });

    for (const meta of elementsTries) {
      const carte = construireCarteBiologique(meta.id, meta, synthese);
      if (carte) grille.appendChild(carte);
    }

    resume.hidden = false;
  }

  function ciblePeutModifierBiologie(cible) {
    if (!cible || typeof cible.matches !== "function") return false;

    return Boolean(
      cible.matches('input[name="pathologies"]') ||
      cible.id === "biologieDateBilan" ||
      cible.id === "diabeteTraitement" ||
      cible.id === "obesiteChirurgieBariatrique" ||
      cible.id?.startsWith("denut") ||
      cible.id?.startsWith("bio")
    );
  }

  if (typeof document !== "undefined") {
    document.addEventListener("input", event => {
      if (ciblePeutModifierBiologie(event.target)) {
        actualiserBiologieAdaptative();
      }
    });

    document.addEventListener("change", event => {
      if (ciblePeutModifierBiologie(event.target)) {
        actualiserBiologieAdaptative();
      }
    });

    document.addEventListener("DOMContentLoaded", actualiserBiologieAdaptative);
  }

  global.BIOLOGIE_PAR_PATHOLOGIE = BIOLOGIE_PAR_PATHOLOGIE;
  global.PARAMETRES_BIOLOGIQUES = PARAMETRES_BIOLOGIQUES;
  global.fusionnerPertinenceBiologique = fusionnerPertinenceBiologique;
  global.actualiserBiologieAdaptative = actualiserBiologieAdaptative;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      BIOLOGIE_PAR_PATHOLOGIE,
      PARAMETRES_BIOLOGIQUES,
      fusionnerPertinenceBiologique
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
