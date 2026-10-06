// =========================================================
// NUTRIFLOW — MODULE MALADIE RÉNALE CHRONIQUE V1
// Références de travail : KDIGO CKD 2024, KDIGO CKD-MBD 2017,
// KDIGO Anemia in CKD 2026, KDOQI Nutrition CKD 2020,
// HAS parcours MRC 2023.
//
// Le module structure l'analyse diététique et les vigilances.
// Il ne pose pas un diagnostic médical à partir d'une donnée isolée,
// ne diagnostique pas une IRA et ne prescrit aucun traitement.
// =========================================================
(function (global) {
  "use strict";

  const $ = id => typeof document !== "undefined" ? document.getElementById(id) : null;
  const esc = value => typeof global.echapperHTML === "function"
    ? global.echapperHTML(value)
    : String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

  const STATUTS_MRC = Object.freeze({
    CONFIRMEE: "MRC_CONFIRMEE",
    A_CONFIRMER: "MRC_A_CONFIRMER",
    AIGU_POSSIBLE: "CONTEXTE_AIGU_POSSIBLE",
    NON_OBJECTIVEE: "PAS_DE_MRC_OBJECTIVEE",
    INSUFFISANT: "DONNEES_INSUFFISANTES"
  });

  const RISQUE_GA = Object.freeze({
    G1: { A1: "faible", A2: "modere", A3: "eleve" },
    G2: { A1: "faible", A2: "modere", A3: "eleve" },
    G3a: { A1: "modere", A2: "eleve", A3: "tres_eleve" },
    G3b: { A1: "eleve", A2: "tres_eleve", A3: "tres_eleve" },
    G4: { A1: "tres_eleve", A2: "tres_eleve", A3: "tres_eleve" },
    G5: { A1: "tres_eleve", A2: "tres_eleve", A3: "tres_eleve" }
  });

  function nombreMRC(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function valeurBiologiqueMRC(parametre) {
    return nombreMRC(parametre?.valeur);
  }

  function normaliserUniteMRC(unite) {
    return String(unite ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/ℓ/g, "l")
      .replace(/²/g, "2");
  }

  function convertirRACVersMgGMRC(valeur, unite) {
    if (!Number.isFinite(valeur)) return null;
    const u = normaliserUniteMRC(unite);
    if (["mg/g", "mgg", "mg/gcréat", "mg/gcreat"].includes(u)) return valeur;
    if (["mg/mmol", "mgmmol"].includes(u)) return valeur * 8.84;
    return null;
  }

  function convertirHemoglobineVersGdlMRC(valeur, unite) {
    if (!Number.isFinite(valeur)) return null;
    const u = normaliserUniteMRC(unite);
    if (["g/dl", "gdl"].includes(u) || !u) return valeur;
    if (["g/l", "gl"].includes(u)) return valeur / 10;
    return null;
  }

  function convertirPourcentageMRC(valeur, unite) {
    if (!Number.isFinite(valeur)) return null;
    const u = normaliserUniteMRC(unite);
    if (["%", "pourcent", "percent"].includes(u) || !u) return valeur;
    return null;
  }

  function classerDFGMRC(dfg) {
    if (!Number.isFinite(dfg) || dfg < 0) return null;
    if (dfg >= 90) return "G1";
    if (dfg >= 60) return "G2";
    if (dfg >= 45) return "G3a";
    if (dfg >= 30) return "G3b";
    if (dfg >= 15) return "G4";
    return "G5";
  }

  function classerAlbuminurieMRC(racMgG) {
    if (!Number.isFinite(racMgG) || racMgG < 0) return null;
    if (racMgG < 30) return "A1";
    if (racMgG <= 300) return "A2";
    return "A3";
  }

  function niveauRisqueGAMRC(g, a, mrcConfirmee = false) {
    if (!mrcConfirmee || !g || !a) return null;
    return RISQUE_GA[g]?.[a] ?? null;
  }

  function parserDateMRC(value) {
    if (!value) return null;
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function differenceJoursMRC(dateAncienne, dateRecente) {
    const a = parserDateMRC(dateAncienne);
    const b = parserDateMRC(dateRecente);
    if (!a || !b || b <= a) return null;
    return (b - a) / 86400000;
  }

  function evaluerEvolutionMRC({ dfgActuel, dateActuelle, dfgPrecedent, datePrecedente, racActuelMgG, racPrecedentMgG, dateRacActuelle, dateRacPrecedente } = {}) {
    const joursDfg = differenceJoursMRC(datePrecedente, dateActuelle);
    const variationPourcent = Number.isFinite(dfgActuel) && Number.isFinite(dfgPrecedent) && dfgPrecedent > 0
      ? ((dfgActuel - dfgPrecedent) / dfgPrecedent) * 100
      : null;

    const variationSignificative = Number.isFinite(variationPourcent)
      ? Math.abs(variationPourcent) > 20
      : false;

    const variationRecenteImportante = variationSignificative && Number.isFinite(joursDfg) && joursDfg <= 7;

    let declinAnnuel = null;
    let categorieDeclin = null;
    if (
      Number.isFinite(dfgActuel) && Number.isFinite(dfgPrecedent) &&
      Number.isFinite(joursDfg) && joursDfg >= 90
    ) {
      declinAnnuel = (dfgPrecedent - dfgActuel) / (joursDfg / 365.25);
      if (declinAnnuel < 2) categorieDeclin = "faible";
      else if (declinAnnuel < 5) categorieDeclin = "modere";
      else categorieDeclin = "rapide";
    }

    const joursRac = differenceJoursMRC(dateRacPrecedente, dateRacActuelle);
    const doublementRAC = Number.isFinite(racActuelMgG) && Number.isFinite(racPrecedentMgG) && racPrecedentMgG > 0
      ? racActuelMgG >= racPrecedentMgG * 2
      : false;

    return {
      joursDfg,
      variationPourcent,
      variationSignificative,
      variationRecenteImportante,
      declinAnnuel,
      categorieDeclin,
      joursRac,
      doublementRAC
    };
  }

  function extraireBornesReferenceMRC(reference) {
    const texte = String(reference ?? "").replace(/,/g, ".");
    const valeurs = [...texte.matchAll(/-?\d+(?:\.\d+)?/g)].map(m => Number(m[0])).filter(Number.isFinite);
    if (!valeurs.length) return { min: null, max: null };

    const contientInferieur = /<|inf[eé]rieur|jusqu/i.test(texte);
    const contientSuperieur = />|sup[eé]rieur/i.test(texte);

    if (valeurs.length >= 2) {
      return { min: Math.min(valeurs[0], valeurs[1]), max: Math.max(valeurs[0], valeurs[1]) };
    }
    if (contientInferieur && !contientSuperieur) return { min: null, max: valeurs[0] };
    if (contientSuperieur && !contientInferieur) return { min: valeurs[0], max: null };
    return { min: null, max: null };
  }

  function evaluerParReferenceMRC(parametre) {
    const valeur = valeurBiologiqueMRC(parametre);
    if (!Number.isFinite(valeur)) return { disponible: false, statut: "non_evalue" };
    const bornes = extraireBornesReferenceMRC(parametre?.referenceLaboratoire);
    if (Number.isFinite(bornes.min) && valeur < bornes.min) return { disponible: true, statut: "bas", ...bornes, valeur };
    if (Number.isFinite(bornes.max) && valeur > bornes.max) return { disponible: true, statut: "haut", ...bornes, valeur };
    if (Number.isFinite(bornes.min) || Number.isFinite(bornes.max)) return { disponible: true, statut: "dans_reference", ...bornes, valeur };
    return { disponible: true, statut: "reference_inconnue", ...bornes, valeur };
  }

  function evaluerPotassiumMRC(parametre) {
    const valeur = valeurBiologiqueMRC(parametre);
    if (!Number.isFinite(valeur)) return { disponible: false, statut: "non_evalue", valeur: null };

    const u = normaliserUniteMRC(parametre?.unite);
    const interpretable = !u || ["mmol/l", "mmoll", "meq/l", "meql"].includes(u);
    if (!interpretable) return { disponible: true, statut: "unite_non_interpretable", valeur };

    if (valeur >= 6.0) return { disponible: true, statut: "hyperkaliemie_alerte", valeur, urgence: true };
    if (valeur > 5.5) return { disponible: true, statut: "hyperkaliemie", valeur, urgence: false };

    const reference = evaluerParReferenceMRC(parametre);
    if (reference.statut === "bas") return { disponible: true, statut: "hypokaliemie", valeur, urgence: false };
    return { disponible: true, statut: "sans_hyperkaliemie", valeur, urgence: false };
  }

  function evaluerAcidoseMRC(parametre) {
    const valeur = valeurBiologiqueMRC(parametre);
    if (!Number.isFinite(valeur)) return { disponible: false, statut: "non_evalue", valeur: null };
    const u = normaliserUniteMRC(parametre?.unite);
    if (u && !["mmol/l", "mmoll", "meq/l", "meql"].includes(u)) {
      return { disponible: true, statut: "unite_non_interpretable", valeur };
    }
    if (valeur < 10) return { disponible: true, statut: "tres_basse", valeur };
    if (valeur < 18) return { disponible: true, statut: "importante", valeur };
    if (valeur < 23) return { disponible: true, statut: "basse", valeur };
    return { disponible: true, statut: "sans_acidose_selon_seuil_has", valeur };
  }

  function evaluerAnemieMRC(synthese, contexte) {
    const hbParam = contexte?.biologie?.hemoglobine;
    const hb = convertirHemoglobineVersGdlMRC(valeurBiologiqueMRC(hbParam), hbParam?.unite);
    const sexe = synthese?.patient?.sexe || "";
    const seuil = sexe === "homme" ? 13 : sexe === "femme" ? 12 : null;
    const anemie = Number.isFinite(hb) && Number.isFinite(seuil) ? hb < seuil : null;

    const ferritine = valeurBiologiqueMRC(contexte?.biologie?.ferritine);
    const cstParam = contexte?.biologie?.cst;
    const tsat = convertirPourcentageMRC(valeurBiologiqueMRC(cstParam), cstParam?.unite);
    const vgm = valeurBiologiqueMRC(contexte?.biologie?.vgm);
    const dialyse = contexte?.dossierMRC?.suppleance?.dialyse || "aucune";

    const deficitMartialSevere = Number.isFinite(ferritine) && ferritine < 45;
    let profilMartialAExplorer = false;
    if (Number.isFinite(ferritine) && Number.isFinite(tsat)) {
      if (dialyse === "hemodialyse") {
        profilMartialAExplorer = ferritine <= 500 && tsat <= 30;
      } else {
        profilMartialAExplorer = (ferritine < 100 && tsat < 40) ||
          (ferritine >= 100 && ferritine < 300 && tsat < 25);
      }
    }

    return {
      disponible: Number.isFinite(hb),
      hemoglobineGdl: hb,
      seuil,
      anemie,
      ferritine,
      tsat,
      vgm,
      deficitMartialSevere,
      profilMartialAExplorer,
      bilanInitialComplet: [hb, ferritine, tsat].every(Number.isFinite) && Number.isFinite(valeurBiologiqueMRC(contexte?.biologie?.reticulocytes))
    };
  }

  function evaluerStatutMRC(synthese, contexte, categorieG, categorieA, evolution) {
    const dfg = valeurBiologiqueMRC(contexte?.biologie?.dfg);
    const racParam = contexte?.biologie?.rac;
    const racMgG = convertirRACVersMgGMRC(valeurBiologiqueMRC(racParam), racParam?.unite);
    const selectionnee = contexte?.pathologieSelectionnee === true || synthese?.mrc?.present === true;
    const aiguManuel = contexte?.dossierMRC?.contexteAigu === "oui";
    const contexteAiguPossible = aiguManuel || evolution?.variationRecenteImportante === true;

    if (selectionnee) {
      return {
        code: STATUTS_MRC.CONFIRMEE,
        confirmee: true,
        contexteAiguPossible,
        libelle: "MRC documentée dans le dossier"
      };
    }

    const anomalieCompatible = (Number.isFinite(dfg) && dfg < 60) || (Number.isFinite(racMgG) && racMgG >= 30);
    if (anomalieCompatible && contexteAiguPossible) {
      return {
        code: STATUTS_MRC.AIGU_POSSIBLE,
        confirmee: false,
        contexteAiguPossible: true,
        libelle: "Anomalie rénale actuelle avec contexte aigu possible"
      };
    }
    if (anomalieCompatible) {
      return {
        code: STATUTS_MRC.A_CONFIRMER,
        confirmee: false,
        contexteAiguPossible: false,
        libelle: "Anomalie rénale compatible avec une MRC — chronicité à confirmer"
      };
    }
    if (Number.isFinite(dfg) && dfg >= 60 && Number.isFinite(racMgG) && racMgG < 30) {
      return {
        code: STATUTS_MRC.NON_OBJECTIVEE,
        confirmee: false,
        contexteAiguPossible,
        libelle: "Pas de MRC objectivée par le DFG et le RAC actuellement renseignés"
      };
    }
    return {
      code: STATUTS_MRC.INSUFFISANT,
      confirmee: false,
      contexteAiguPossible,
      libelle: "Données insuffisantes pour statuer sur une MRC"
    };
  }

  function obtenirPoidsReferenceMRC(synthese, contexte) {
    const specifique = nombreMRC(contexte?.dossierMRC?.prescriptionNutritionnelle?.poidsReference);
    if (Number.isFinite(specifique) && specifique > 0) return { valeur: specifique, source: "documente" };

    if (contexte?.dossierMRC?.hydratation?.oedemes === "oui") {
      return { valeur: null, source: "poids_actuel_non_retenu_oedemes" };
    }

    const actuel = nombreMRC(synthese?.anthropometrie?.poids);
    return Number.isFinite(actuel) && actuel > 0
      ? { valeur: actuel, source: "poids_actuel" }
      : { valeur: null, source: "indisponible" };
  }

  function evaluerObjectifProteiqueMRC(analyse) {
    const { statutMRC, categorieG, contexte, synthese, etatNutritionnel } = analyse;
    const dossier = contexte?.dossierMRC;
    const dialyse = dossier?.suppleance?.dialyse || "aucune";
    const cibleDocumentee = nombreMRC(dossier?.prescriptionNutritionnelle?.objectifProteinesGKg);
    const poidsRef = obtenirPoidsReferenceMRC(synthese, contexte);
    const fragilite = dossier?.modulateurs?.fragilite === "oui";
    const instable = dossier?.modulateurs?.instabiliteMetabolique === "oui";
    const denutrition = etatNutritionnel?.denutrition === true;
    const sarcopenie = etatNutritionnel?.sarcopenie === true;

    let resultat = {
      mode: "aucun",
      cibleGKg: null,
      minGKg: null,
      maxGKg: null,
      grammesJour: null,
      poidsReference: poidsRef,
      raison: "Pas d'objectif protéique MRC automatique"
    };

    if (Number.isFinite(cibleDocumentee) && cibleDocumentee > 0) {
      resultat = {
        ...resultat,
        mode: "prescription_documentee",
        cibleGKg: cibleDocumentee,
        raison: "Objectif spécialisé documenté dans le dossier"
      };
    } else if (dialyse === "hemodialyse" || dialyse === "peritoneale") {
      resultat = {
        ...resultat,
        mode: "dialyse",
        minGKg: 1.0,
        maxGKg: 1.2,
        raison: "MRC G5D — objectif protéique de dialyse"
      };
    } else if (
      statutMRC?.confirmee && ["G3a", "G3b", "G4", "G5"].includes(categorieG)
    ) {
      if (denutrition || sarcopenie || fragilite || instable) {
        resultat = {
          ...resultat,
          mode: "individualiser",
          raison: "Risque nutritionnel / fragilité / instabilité : ne pas appliquer une restriction protéique automatique"
        };
      } else {
        resultat = {
          ...resultat,
          mode: "standard",
          cibleGKg: 0.8,
          raison: "MRC G3–G5 non dialysée et métaboliquement stable"
        };
      }
    }

    if (Number.isFinite(poidsRef.valeur)) {
      if (Number.isFinite(resultat.cibleGKg)) resultat.grammesJour = resultat.cibleGKg * poidsRef.valeur;
      if (Number.isFinite(resultat.minGKg)) resultat.minGrammesJour = resultat.minGKg * poidsRef.valeur;
      if (Number.isFinite(resultat.maxGKg)) resultat.maxGrammesJour = resultat.maxGKg * poidsRef.valeur;
    }

    return resultat;
  }

  function evaluerObjectifSodiumMRC(analyse) {
    const { statutMRC, contexte, etatNutritionnel } = analyse;
    if (!statutMRC?.confirmee) return { mode: "aucun", maxMg: null, raison: "MRC non confirmée" };

    const pertesSodees = contexte?.dossierMRC?.modulateurs?.pertesSodees === "oui";
    const fragilite = contexte?.dossierMRC?.modulateurs?.fragilite === "oui";
    const denutrition = etatNutritionnel?.denutrition === true;
    if (pertesSodees) return { mode: "individualiser", maxMg: null, raison: "Pertes sodées documentées" };
    if (fragilite || denutrition) return { mode: "individualiser", maxMg: 2000, raison: "Repère théorique à individualiser pour préserver l'état nutritionnel" };
    return { mode: "standard", maxMg: 2000, equivalentSelG: 5, raison: "Repère MRC KDIGO" };
  }

  function evaluerHydratationMRC(analyse) {
    const hyd = analyse?.contexte?.dossierMRC?.hydratation || {};
    const dialyse = analyse?.contexte?.dossierMRC?.suppleance?.dialyse || "aucune";
    const cible = nombreMRC(hyd.objectifHydriqueMl);
    if (Number.isFinite(cible) && cible > 0) {
      return { mode: "prescription_documentee", objectifMl: cible, raison: "Objectif hydrique spécialisé documenté" };
    }
    if (hyd.deshydratation === "oui") {
      return { mode: "individualiser", objectifMl: null, raison: "Déshydratation / pertes : ne pas restreindre automatiquement" };
    }
    if (hyd.oedemes === "oui" || dialyse !== "aucune" || (Number.isFinite(hyd.diurese24h) && hyd.diurese24h < 500)) {
      return { mode: "individualiser", objectifMl: null, raison: "État volémique / diurèse / dialyse : objectif à individualiser" };
    }
    return { mode: "libre_adapte", objectifMl: null, repereMl: 1500, raison: "Apports ni forcés ni restreints, adaptés à la soif et à la diurèse" };
  }

  function apportCertainementAuDessusMRC(apport, seuil) {
    if (!apport || !Number.isFinite(seuil)) return false;
    if (Number.isFinite(apport.valeur) && apport.valeur > seuil) return true;
    if (Number.isFinite(apport.borneBasse) && apport.borneBasse > seuil) return true;
    return false;
  }

  function evaluerApportProteiqueMRC(analyse, objectif) {
    const apport = analyse?.contexte?.apports?.proteines;
    const poids = objectif?.poidsReference?.valeur;
    if (!Number.isFinite(poids) || poids <= 0 || !apport) return { evaluable: false };

    const valeur = apport?.complet === true && Number.isFinite(apport.valeur)
      ? apport.valeur
      : null;
    if (!Number.isFinite(valeur)) return { evaluable: false, partiel: apport?.partiel === true };

    const gKg = valeur / poids;
    return {
      evaluable: true,
      grammesJour: valeur,
      gKg,
      hautPlus13: gKg > 1.3
    };
  }

  function evaluerKfreMRC(synthese, statutMRC, categorieG, racMgG) {
    const age = nombreMRC(synthese?.patient?.age);
    const sexe = synthese?.patient?.sexe || "";
    const dfg = valeurBiologiqueMRC(synthese?.contexteRenal?.biologie?.dfg);
    const gEligible = ["G3a", "G3b", "G4", "G5"].includes(categorieG);
    const calculable = statutMRC?.confirmee && gEligible && Number.isFinite(age) && !!sexe && Number.isFinite(dfg) && Number.isFinite(racMgG);
    return {
      calculable,
      risque2ans: null,
      risque5ans: null,
      statut: calculable ? "donnees_suffisantes_formule_non_integree_v1" : "non_calculable",
      raison: calculable
        ? "Données requises présentes ; la formule KFRE numérique n'est pas intégrée dans cette V1 afin de ne pas utiliser une équation non validée dans le projet."
        : !statutMRC?.confirmee ? "MRC non confirmée"
          : !gEligible ? "KFRE standard non retenu en G1–G2"
            : !Number.isFinite(racMgG) ? "RAC manquant"
              : "Âge, sexe ou DFG manquant"
    };
  }

  function analyserMRC(syntheseFournie = null) {
    const synthese = syntheseFournie || (typeof global.construireSynthesePatient === "function" ? global.construireSynthesePatient() : null);
    const contexte = synthese?.contexteRenal;
    if (!synthese || !contexte) return null;

    const dfg = valeurBiologiqueMRC(contexte.biologie?.dfg);
    const racParam = contexte.biologie?.rac;
    const racMgG = convertirRACVersMgGMRC(valeurBiologiqueMRC(racParam), racParam?.unite);
    const categorieG = classerDFGMRC(dfg);
    const categorieA = classerAlbuminurieMRC(racMgG);

    const dossier = contexte.dossierMRC || {};
    const historique = dossier.historique || {};
    const racPrecedentMgG = convertirRACVersMgGMRC(nombreMRC(historique.racPrecedent), historique.racPrecedentUnite);
    const evolution = evaluerEvolutionMRC({
      dfgActuel: dfg,
      dateActuelle: contexte.biologie?.dfg?.date,
      dfgPrecedent: nombreMRC(historique.dfgPrecedent),
      datePrecedente: historique.dfgPrecedentDate,
      racActuelMgG: racMgG,
      racPrecedentMgG,
      dateRacActuelle: contexte.biologie?.rac?.date,
      dateRacPrecedente: historique.racPrecedentDate
    });

    const statutMRC = evaluerStatutMRC(synthese, contexte, categorieG, categorieA, evolution);

    const donneesRenalesMinimales = contexte.pathologieSelectionnee || Number.isFinite(dfg) || Number.isFinite(racMgG);
    if (!donneesRenalesMinimales) return null;

    const risqueGA = niveauRisqueGAMRC(categorieG, categorieA, statutMRC.confirmee);
    const potassium = evaluerPotassiumMRC(contexte.biologie?.potassium);
    const acidose = evaluerAcidoseMRC(contexte.biologie?.bicarbonates);
    const anemie = evaluerAnemieMRC(synthese, contexte);
    const phosphore = evaluerParReferenceMRC(contexte.biologie?.phosphore);
    const calcium = evaluerParReferenceMRC(contexte.biologie?.calcium);
    const pth = evaluerParReferenceMRC(contexte.biologie?.pth);
    const vitamineD = evaluerParReferenceMRC(contexte.biologie?.vitamineD);

    const denutrition = synthese?.etatNutritionnel?.has?.diagnostic === true || synthese?.etatNutritionnel?.glim?.diagnostic === true;
    const sarcopenie = synthese?.etatNutritionnel?.donneesDenutrition?.sarcopenieConfirmee === true;
    const etatNutritionnel = { denutrition, sarcopenie };

    const analyse = {
      synthese,
      contexte,
      statutMRC,
      categorieG,
      categorieA,
      dfg,
      racMgG,
      risqueGA,
      evolution,
      potassium,
      acidose,
      anemie,
      ckdMbd: { phosphore, calcium, pth, vitamineD },
      etatNutritionnel
    };

    analyse.objectifProteique = evaluerObjectifProteiqueMRC(analyse);
    analyse.objectifSodium = evaluerObjectifSodiumMRC(analyse);
    analyse.hydratation = evaluerHydratationMRC(analyse);
    analyse.apportProteique = evaluerApportProteiqueMRC(analyse, analyse.objectifProteique);
    analyse.kfre = evaluerKfreMRC(synthese, statutMRC, categorieG, racMgG);

    return analyse;
  }

  function construireVigilancesMRC(analyse) {
    if (!analyse) return [];
    const items = [];
    const ajouter = (code, niveau, titre, detail) => items.push({ code, niveau, titre, detail });

    if (analyse.statutMRC.code === STATUTS_MRC.A_CONFIRMER) {
      ajouter("mrc-chronicite", "haute", "Chronicité à confirmer", "Une baisse isolée du DFG ou un RAC élevé isolé ne suffit pas à confirmer une MRC. Vérifier les données antérieures ou répéter les mesures selon le contexte clinique.");
    }
    if (analyse.statutMRC.code === STATUTS_MRC.AIGU_POSSIBLE || analyse.statutMRC.contexteAiguPossible) {
      ajouter("mrc-aigu", "haute", "Contexte aigu rénal possible", "Ne pas appliquer automatiquement les objectifs nutritionnels chroniques tant qu'une atteinte aiguë ou aiguë sur chronique n'a pas été écartée médicalement.");
    }
    if (analyse.evolution?.variationSignificative) {
      ajouter("mrc-dfg-variation", "moyenne", "Variation du DFG >20 %", "Cette variation dépasse la variabilité attendue selon KDIGO et mérite une évaluation clinique ; elle ne suffit pas, à elle seule, à conclure à une progression de MRC.");
    }
    if (analyse.evolution?.doublementRAC) {
      ajouter("mrc-rac-double", "moyenne", "Doublement du RAC", "Un doublement du RAC dépasse la variabilité biologique attendue et justifie une réévaluation du contexte rénal.");
    }
    if (analyse.evolution?.categorieDeclin === "rapide") {
      ajouter("mrc-declin-rapide", "haute", "Déclin rénal rapide", "Le déclin calculé atteint au moins 5 mL/min/1,73 m²/an sur les données disponibles ; une évaluation néphrologique du contexte est prioritaire.");
    }

    if (analyse.potassium?.statut === "hyperkaliemie_alerte") {
      ajouter("mrc-hyperkaliemie-urgence", "haute", "Kaliémie ≥6,0 mmol/L", "Vigilance médicale prioritaire : ne pas traiter cette situation comme un simple problème alimentaire.");
    } else if (analyse.potassium?.statut === "hyperkaliemie") {
      ajouter("mrc-hyperkaliemie", "haute", "Hyperkaliémie", "Rechercher conjointement les facteurs médicamenteux, métaboliques et alimentaires. Une restriction alimentaire globale n'est pas automatique.");
    } else if (analyse.potassium?.statut === "hypokaliemie") {
      ajouter("mrc-hypokaliemie", "moyenne", "Kaliémie sous la référence du laboratoire", "Ne pas appliquer de restriction potassique ; l'apport doit être individualisé selon le contexte clinique.");
    }

    if (["basse", "importante", "tres_basse"].includes(analyse.acidose?.statut)) {
      const niveau = analyse.acidose.statut === "importante" || analyse.acidose.statut === "tres_basse" ? "haute" : "moyenne";
      ajouter("mrc-acidose", niveau, "Bicarbonates bas", analyse.acidose.statut === "tres_basse"
        ? "Bicarbonates <10 mmol/L : anomalie très importante. L'urgence dépend notamment du pH et du contexte clinique ; orientation médicale rapide."
        : analyse.acidose.statut === "importante"
          ? "Bicarbonates <18 mmol/L : acidose à implications cliniques importantes selon KDIGO ; prise en charge médicale à considérer."
          : "Bicarbonates <23 mmol/L : acidose métabolique à considérer selon le parcours HAS.");
    }

    if (analyse.anemie?.anemie === true) {
      let detail = "Anémie présente dans un contexte de MRC : ne pas conclure automatiquement à une anémie rénale ni à une carence en fer.";
      if (analyse.anemie.deficitMartialSevere) detail += " La ferritine <45 µg/L constitue un signal fort de déficit martial sévère à explorer.";
      else if (analyse.anemie.profilMartialAExplorer) detail += " Le profil ferritine/TSAT justifie une interprétation martiale clinique.";
      ajouter("mrc-anemie", "moyenne", "Anémie à caractériser", detail);
    }

    if (analyse.ckdMbd?.phosphore?.statut === "haut") {
      ajouter("mrc-phosphore", "moyenne", "Phosphatémie au-dessus de la référence", "Interpréter la tendance avec calcium et PTH. Une restriction phosphorée définitive ne doit pas être décidée sur une seule valeur isolée.");
    }
    if (analyse.ckdMbd?.calcium?.statut === "haut") {
      ajouter("mrc-calcium-haut", "moyenne", "Calcémie élevée", "Éviter d'augmenter automatiquement les apports ou suppléments calciques ; considérer l'exposition totale et les traitements.");
    }
    if (analyse.ckdMbd?.pth?.statut === "haut" && analyse.contexte?.dossierMRC?.suppleance?.dialyse === "aucune") {
      ajouter("mrc-pth", "moyenne", "PTH élevée sur la mesure actuelle", "Chez les patients non dialysés, l'objectif optimal n'est pas défini. Rechercher les facteurs modifiables et interpréter l'évolution, pas une valeur isolée.");
    }

    if (analyse.etatNutritionnel.denutrition || analyse.etatNutritionnel.sarcopenie || analyse.contexte?.dossierMRC?.modulateurs?.fragilite === "oui") {
      ajouter("mrc-risque-nutritionnel", "haute", "Risque nutritionnel prioritaire", "Éviter d'empiler les restrictions. La préservation de l'état nutritionnel peut primer sur une restriction néphroprotectrice non urgente.");
    }

    if (analyse.contexte?.dossierMRC?.suppleance?.traitementConservateur === "oui") {
      ajouter("mrc-conservateur", "moyenne", "Traitement conservateur documenté", "Privilégier confort, qualité de vie, contrôle des symptômes et sécurité nutritionnelle plutôt qu'une accumulation de contraintes alimentaires.");
    }

    return items;
  }

  function construirePrioritesMRC(analyse) {
    if (!analyse || !analyse.statutMRC?.confirmee) return [];
    const priorites = [];
    const ajouter = item => priorites.push(item);
    const dossier = analyse.contexte?.dossierMRC || {};

    if (analyse.etatNutritionnel.denutrition || analyse.etatNutritionnel.sarcopenie || dossier?.modulateurs?.fragilite === "oui") {
      ajouter({
        code: "mrc-securite-nutritionnelle",
        niveau: "haute",
        titre: "Préserver l'état nutritionnel",
        constat: "Dénutrition, sarcopénie ou fragilité associée à la MRC.",
        objectif: "Éviter une restriction protéino-énergétique non individualisée.",
        actions: ["Sécuriser d'abord les apports énergétiques et protéiques.", "Réduire uniquement les contraintes réellement justifiées par la biologie et le contexte."],
        suivi: ["Poids et trajectoire pondérale", "Apports alimentaires", "Force / masse musculaire / autonomie"]
      });
    }

    if (analyse.objectifSodium.mode === "standard" && apportCertainementAuDessusMRC(analyse.contexte?.apports?.sodium, analyse.objectifSodium.maxMg)) {
      ajouter({
        code: "mrc-sodium",
        niveau: analyse.categorieA === "A3" || dossier?.hydratation?.oedemes === "oui" ? "haute" : "moyenne",
        titre: "Réduire l'excès sodé",
        constat: `Apport sodé au-dessus du repère MRC de ${analyse.objectifSodium.maxMg} mg/j.`,
        objectif: "Tendre vers <2 g de sodium/j (≈5 g de sel/j).",
        actions: ["Cibler les principales sources réellement consommées.", "Réduire en priorité produits ultra-transformés, charcuteries, fromages très salés, plats préparés et sel ajouté si concernés."],
        suivi: ["Apport sodé estimé", "Pression artérielle et état volémique selon suivi médical"]
      });
    }

    if (analyse.objectifProteique.mode === "standard" && analyse.apportProteique?.evaluable && analyse.apportProteique.hautPlus13) {
      ajouter({
        code: "mrc-proteines-hautes",
        niveau: "moyenne",
        titre: "Apport protéique élevé",
        constat: `${analyse.apportProteique.gKg.toFixed(2).replace(".", ",")} g/kg/j estimés, au-dessus de 1,3 g/kg/j.`,
        objectif: "Éviter un apport protéique élevé tout en conservant une couverture nutritionnelle suffisante.",
        actions: ["Identifier les excès protéiques et les portions les plus contributrices.", "Ne pas réduire les protéines au détriment de l'énergie ou de l'état nutritionnel."],
        suivi: ["Apports protéiques", "État nutritionnel", "Fonction rénale"]
      });
    }

    if (analyse.potassium?.statut === "hyperkaliemie" || analyse.potassium?.statut === "hyperkaliemie_alerte") {
      ajouter({
        code: "mrc-potassium",
        niveau: "haute",
        titre: "Individualiser le potassium alimentaire",
        constat: `Kaliémie ${analyse.potassium.valeur.toLocaleString("fr-FR")} mmol/L.`,
        objectif: "Réduire les sources les plus pertinentes sans supprimer systématiquement fruits et légumes.",
        actions: ["Rechercher additifs potassiques, sels de régime au KCl, produits ultra-transformés et grandes quantités de sources concentrées.", "Tenir compte des médicaments, de l'acidose, de l'hydratation et du contexte clinique."],
        suivi: ["Kaliémie", "Sources alimentaires identifiées", "Tolérance et qualité globale de l'alimentation"]
      });
    }

    if (analyse.ckdMbd?.phosphore?.statut === "haut") {
      ajouter({
        code: "mrc-phosphore-cibler",
        niveau: "moyenne",
        titre: "Cibler la charge phosphatée",
        constat: "Phosphatémie actuellement supérieure à la référence du laboratoire.",
        objectif: "Réduire prioritairement les sources de phosphore très biodisponible si l'anomalie est confirmée/persistante.",
        actions: ["Repérer les additifs phosphatés et produits ultra-transformés.", "Privilégier un meilleur ratio phosphore/protéines afin de préserver la couverture protéique."],
        suivi: ["Tendance de la phosphatémie", "Calcium et PTH", "État nutritionnel"]
      });
    }

    if (["basse", "importante", "tres_basse"].includes(analyse.acidose?.statut)) {
      ajouter({
        code: "mrc-charge-acide",
        niveau: analyse.acidose.statut === "basse" ? "moyenne" : "haute",
        titre: "Tenir compte de l'acidose métabolique",
        constat: `Bicarbonates ${analyse.acidose.valeur.toLocaleString("fr-FR")} mmol/L.`,
        objectif: "Favoriser une alimentation de bonne qualité compatible avec la kaliémie, en complément de l'évaluation médicale.",
        actions: ["Éviter de prescrire aveuglément davantage de fruits/légumes en présence d'hyperkaliémie.", "Articuler l'action diététique avec la prise en charge médicale de l'acidose."],
        suivi: ["Bicarbonates", "Kaliémie", "État volémique et pression artérielle"]
      });
    }

    return priorites;
  }

  function construireObjectifsMRC(analyse) {
    if (!analyse) return [];
    const objectifs = [];
    const p = analyse.objectifProteique;
    if (p.mode === "standard" && Number.isFinite(p.cibleGKg)) {
      objectifs.push({ titre: "Protéines", valeur: `${p.cibleGKg.toLocaleString("fr-FR")} g/kg/j${Number.isFinite(p.grammesJour) ? ` (≈ ${Math.round(p.grammesJour)} g/j)` : ""}`, note: p.raison });
    } else if (p.mode === "dialyse") {
      objectifs.push({ titre: "Protéines", valeur: `${p.minGKg.toLocaleString("fr-FR")}–${p.maxGKg.toLocaleString("fr-FR")} g/kg/j`, note: p.raison });
    } else if (p.mode === "prescription_documentee") {
      objectifs.push({ titre: "Protéines", valeur: `${p.cibleGKg.toLocaleString("fr-FR")} g/kg/j`, note: "Objectif spécialisé documenté" });
    } else if (p.mode === "individualiser") {
      objectifs.push({ titre: "Protéines", valeur: "À individualiser", note: p.raison });
    }

    const s = analyse.objectifSodium;
    if (s.mode === "standard") objectifs.push({ titre: "Sodium", valeur: "<2 000 mg/j (≈ <5 g sel/j)", note: s.raison });
    else if (s.mode === "individualiser") objectifs.push({ titre: "Sodium", valeur: "À individualiser", note: s.raison });

    const h = analyse.hydratation;
    if (h.mode === "prescription_documentee") objectifs.push({ titre: "Hydratation", valeur: `${Math.round(h.objectifMl)} mL/j`, note: h.raison });
    else if (h.mode === "individualiser") objectifs.push({ titre: "Hydratation", valeur: "À individualiser", note: h.raison });
    else if (h.mode === "libre_adapte") objectifs.push({ titre: "Hydratation", valeur: "Ni forcée ni restreinte", note: "À adapter à la soif et à la diurèse ; repère général HAS proche de 1,5 L/j." });

    if (analyse.potassium?.statut === "sans_hyperkaliemie") {
      objectifs.push({ titre: "Potassium", valeur: "Pas de restriction automatique", note: "Kaliémie sans hyperkaliémie selon le seuil MRC retenu." });
    } else if (["hyperkaliemie", "hyperkaliemie_alerte", "hypokaliemie"].includes(analyse.potassium?.statut)) {
      objectifs.push({ titre: "Potassium", valeur: "À individualiser", note: "Selon kaliémie, traitements, causes associées et apports réels." });
    }

    return objectifs;
  }

  function formaterNombreMRC(value, dec = 1) {
    return Number.isFinite(value)
      ? value.toLocaleString("fr-FR", { maximumFractionDigits: dec })
      : "—";
  }

  function libelleStatutMRC(code) {
    return ({
      [STATUTS_MRC.CONFIRMEE]: "MRC confirmée/documentée",
      [STATUTS_MRC.A_CONFIRMER]: "MRC à confirmer",
      [STATUTS_MRC.AIGU_POSSIBLE]: "Contexte aigu possible",
      [STATUTS_MRC.NON_OBJECTIVEE]: "Pas de MRC objectivée",
      [STATUTS_MRC.INSUFFISANT]: "Données insuffisantes"
    })[code] || "Situation rénale";
  }

  function libelleRisqueMRC(niveau) {
    return ({ faible: "Faible", modere: "Modéré", eleve: "Élevé", tres_eleve: "Très élevé" })[niveau] || "Non classé";
  }

  function afficherResumeBiologieMRC() {
    const conteneur = $("mrcBiologieResume");
    if (!conteneur) return;
    const synthese = typeof global.construireSynthesePatient === "function" ? global.construireSynthesePatient() : null;
    const b = synthese?.contexteRenal?.biologie || {};
    const ligne = (label, param, convertisseur = null) => {
      const brut = valeurBiologiqueMRC(param);
      const valeur = convertisseur ? convertisseur(brut, param?.unite) : brut;
      return `<div class="dyslip-biology-item"><span>${esc(label)}</span><strong>${Number.isFinite(valeur) ? esc(formaterNombreMRC(valeur, 2)) : "—"}</strong><small>${esc(param?.unite || "")}</small></div>`;
    };
    conteneur.innerHTML = `<div class="dyslip-biology-summary-grid">
      ${ligne("DFG", b.dfg)}
      ${ligne("RAC", b.rac)}
      ${ligne("K⁺", b.potassium)}
      ${ligne("HCO₃⁻", b.bicarbonates)}
      ${ligne("Phosphate", b.phosphore)}
      ${ligne("Calcium", b.calcium)}
      ${ligne("PTH", b.pth)}
      ${ligne("Hémoglobine", b.hemoglobine)}
    </div>`;
  }

  function afficherAnalyseMRC() {
    const section = $("analyseMRCSection");
    const container = $("analyseMRCContainer");
    if (!section || !container) return;

    const analyse = analyserMRC();
    if (!analyse) {
      section.hidden = true;
      container.innerHTML = "";
      return;
    }

    section.hidden = false;
    const statut = libelleStatutMRC(analyse.statutMRC.code);
    const profil = [analyse.categorieG, analyse.categorieA].filter(Boolean).join(" ") || "Non classable";
    const risque = analyse.risqueGA ? libelleRisqueMRC(analyse.risqueGA) : "Non attribué";
    const vigilances = construireVigilancesMRC(analyse);

    const faits = [
      ["DFG actuel", Number.isFinite(analyse.dfg) ? `${formaterNombreMRC(analyse.dfg)} mL/min/1,73 m²` : "Non renseigné"],
      ["Catégorie G", analyse.categorieG || "Non classable"],
      ["RAC actuel", Number.isFinite(analyse.racMgG) ? `${formaterNombreMRC(analyse.racMgG, 0)} mg/g` : "Non renseigné / unité non interprétable"],
      ["Catégorie A", analyse.categorieA || "Non classable"],
      ["Risque G×A", risque],
      ["Dialyse", ({ aucune: "Non", hemodialyse: "Hémodialyse", peritoneale: "Dialyse péritonéale" })[analyse.contexte?.dossierMRC?.suppleance?.dialyse] || "Non documentée"]
    ];

    const evolutions = [];
    if (Number.isFinite(analyse.evolution?.variationPourcent)) evolutions.push(`Variation du DFG : ${formaterNombreMRC(analyse.evolution.variationPourcent, 1)} %`);
    if (Number.isFinite(analyse.evolution?.declinAnnuel)) evolutions.push(`Déclin annualisé : ${formaterNombreMRC(analyse.evolution.declinAnnuel, 1)} mL/min/1,73 m²/an (${analyse.evolution.categorieDeclin || "—"})`);
    if (analyse.evolution?.doublementRAC) evolutions.push("RAC au moins doublé par rapport à la valeur antérieure documentée");

    container.innerHTML = `
      <section class="nutrition-calc-card hta-analysis-card">
        <div class="nutrition-calc-card-header">
          <span class="nutrition-calc-kicker">MALADIE RÉNALE CHRONIQUE</span>
          <h3>Analyse rénale et nutritionnelle</h3>
          <p>${esc(statut)}${analyse.statutMRC.confirmee && profil !== "Non classable" ? ` · ${esc(profil)}` : ""}</p>
        </div>

        <div class="hta-analysis-grid">
          ${faits.map(([label, valeur]) => `<div class="hta-analysis-item"><span>${esc(label)}</span><strong>${esc(valeur)}</strong></div>`).join("")}
        </div>

        ${evolutions.length ? `<div class="hta-analysis-note"><strong>Évolution documentée</strong><ul>${evolutions.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}

        <div class="hta-analysis-note">
          <strong>Interprétation</strong>
          <p>${esc(analyse.statutMRC.libelle)}. Les catégories G et A décrivent les données actuelles ; elles ne remplacent pas la confirmation de la chronicité.</p>
        </div>

        ${vigilances.length ? `<div class="hta-analysis-note"><strong>Points de vigilance</strong><ul>${vigilances.map(v => `<li><strong>${esc(v.titre)}.</strong> ${esc(v.detail)}</li>`).join("")}</ul></div>` : ""}

        <div class="hta-analysis-note">
          <strong>KFRE</strong>
          <p>${esc(analyse.kfre.raison)}</p>
        </div>

        <p class="nutrition-calc-note">Références de travail : KDIGO CKD 2024 ; KDIGO CKD-MBD 2017 ; KDIGO Anemia in CKD 2026 ; KDOQI Nutrition CKD 2020 ; HAS parcours MRC 2023. NutriFlow ne diagnostique pas une MRC ou une atteinte rénale aiguë à partir d'une donnée isolée.</p>
      </section>`;
  }

  function cartePrioriteMRC(item) {
    return `<article class="pec-diabetes-item">
      <div class="pec-diabetes-item-head"><div><h4>${esc(item.titre)}</h4><span>${esc(item.niveau === "haute" ? "Priorité élevée" : "Priorité")}</span></div></div>
      <p><strong>Constat :</strong> ${esc(item.constat)}</p>
      <div class="pec-diabetes-objective"><strong>Objectif</strong><span>${esc(item.objectif)}</span></div>
      <div class="pec-diabetes-actions"><strong>Actions proposées</strong><ul>${item.actions.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="pec-diabetes-follow"><strong>Suivi</strong><ul>${item.suivi.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
    </article>`;
  }

  function afficherPriseEnChargeMRC() {
    const conteneur = $("priseEnChargePathologies");
    if (!conteneur) return;
    let bloc = $("priseEnChargeMRC");
    const analyse = analyserMRC();

    if (!analyse || !analyse.statutMRC?.confirmee) {
      bloc?.remove();
      return;
    }

    conteneur.querySelectorAll(":scope > .module-placeholder").forEach(el => el.remove());
    if (!bloc) {
      bloc = document.createElement("div");
      bloc.id = "priseEnChargeMRC";
      conteneur.appendChild(bloc);
    }

    const priorites = construirePrioritesMRC(analyse);
    const objectifs = construireObjectifsMRC(analyse);
    const vigilances = construireVigilancesMRC(analyse);

    bloc.innerHTML = `
      <section class="nutrition-calc-card pec-diabetes-card">
        <div class="pec-diabetes-header">
          <div>
            <span class="pec-diabetes-kicker">MRC</span>
            <h3>Prise en charge — Maladie rénale chronique</h3>
            <p>${esc([analyse.categorieG, analyse.categorieA].filter(Boolean).join(" ") || "Catégories à compléter")} · risque G×A ${esc(libelleRisqueMRC(analyse.risqueGA).toLowerCase())}</p>
          </div>
          <span class="pec-diabetes-validation">À valider par le diététicien</span>
        </div>

        <div class="pec-diabetes-notice">La MRC ne déclenche pas automatiquement une restriction du potassium, du phosphore ou des liquides. Les objectifs sont individualisés selon la biologie, la dialyse, l'état nutritionnel et les prescriptions déjà documentées.</div>

        <div class="pec-diabetes-section">
          <div class="pec-diabetes-section-title"><h4>Objectifs nutritionnels MRC</h4><span>Repères applicables au contexte actuel</span></div>
          <div class="pec-diabetes-grid">
            ${objectifs.map(o => `<article class="pec-diabetes-item"><h4>${esc(o.titre)}</h4><div class="pec-diabetes-objective"><strong>Repère</strong><span>${esc(o.valeur)}</span></div><p>${esc(o.note)}</p></article>`).join("") || `<div class="pec-diabetes-empty">Aucun objectif MRC chiffré ne peut être proposé avec les données actuelles.</div>`}
          </div>
        </div>

        <div class="pec-diabetes-section">
          <div class="pec-diabetes-section-title"><h4>Priorités et actions</h4><span>Contexte → objectif → actions → suivi</span></div>
          <div class="pec-diabetes-grid">${priorites.length ? priorites.map(cartePrioriteMRC).join("") : `<div class="pec-diabetes-empty">Aucune priorité nutritionnelle spécifique supplémentaire n'est générée avec les données actuellement renseignées.</div>`}</div>
        </div>

        <div class="pec-diabetes-section pec-diabetes-panel">
          <div class="pec-diabetes-section-title"><h4>Vigilances</h4><span>Ne pas transformer ces éléments automatiquement en restrictions</span></div>
          <ul>${vigilances.length ? vigilances.map(v => `<li><strong>${esc(v.titre)}.</strong> ${esc(v.detail)}</li>`).join("") : `<li>Aucune vigilance supplémentaire générée.</li>`}</ul>
        </div>

        <div class="pec-diabetes-section pec-diabetes-followup">
          <div class="pec-diabetes-section-title"><h4>Suivi global</h4><span>À adapter au parcours néphrologique</span></div>
          <div class="pec-diabetes-followup-grid">
            <span>DFG et RAC selon le suivi prévu</span>
            <span>Poids, appétit et état nutritionnel</span>
            <span>Kaliémie et bicarbonates si concernés</span>
            <span>Phosphate, calcium et PTH à partir de G3a selon contexte</span>
            <span>Hémoglobine et bilan martial si anémie ou stade avancé</span>
          </div>
        </div>

        <p class="nutrition-calc-note">Références de travail : KDIGO CKD 2024 ; KDIGO CKD-MBD 2017 ; KDIGO Anemia in CKD 2026 ; KDOQI Nutrition CKD 2020 ; HAS parcours MRC 2023. Les propositions ne remplacent pas une prescription néphrologique ou médicale.</p>
      </section>`;
  }

  function synchroniserDetailMRC() {
    const checkbox = typeof document !== "undefined" ? document.querySelector('input[name="pathologies"][value="Maladie rénale"]') : null;
    const bloc = $("mrcDetails");
    if (!checkbox || !bloc) return;
    bloc.style.display = "";
    bloc.classList.toggle("est-visible", checkbox.checked);
    if (checkbox.checked) afficherResumeBiologieMRC();
    global.actualiserBiologieAdaptative?.();
  }

  function actualiserMRC() {
    synchroniserDetailMRC();
    global.rafraichirSortiesPathologiques?.();
  }

  global.STATUTS_MRC = STATUTS_MRC;
  global.convertirRACVersMgGMRC = convertirRACVersMgGMRC;
  global.classerDFGMRC = classerDFGMRC;
  global.classerAlbuminurieMRC = classerAlbuminurieMRC;
  global.niveauRisqueGAMRC = niveauRisqueGAMRC;
  global.evaluerEvolutionMRC = evaluerEvolutionMRC;
  global.evaluerPotassiumMRC = evaluerPotassiumMRC;
  global.evaluerAcidoseMRC = evaluerAcidoseMRC;
  global.evaluerAnemieMRC = evaluerAnemieMRC;
  global.analyserMRC = analyserMRC;
  global.construireVigilancesMRC = construireVigilancesMRC;
  global.construirePrioritesMRC = construirePrioritesMRC;
  global.construireObjectifsMRC = construireObjectifsMRC;
  global.afficherAnalyseMRC = afficherAnalyseMRC;
  global.afficherPriseEnChargeMRC = afficherPriseEnChargeMRC;
  global.actualiserMRC = actualiserMRC;

  global.enregistrerModulePathologique?.({
    id: "mrc",
    champs: [
      "mrcDateDiagnostic", "mrcChroniciteDocumentee", "mrcContexteAigu", "mrcCause",
      "mrcDfgPrecedent", "mrcDfgPrecedentDate", "mrcRacPrecedent", "mrcRacPrecedentUnite", "mrcRacPrecedentDate",
      "mrcDialyse", "mrcTraitementConservateur", "mrcDiurese24h", "mrcOedemes", "mrcDeshydratation",
      "mrcFragilite", "mrcInstabiliteMetabolique", "mrcPertesSodees", "mrcPoidsReference",
      "mrcObjectifProteines", "mrcObjectifHydrique", "bioDfg", "bioRac", "bioCreatinine", "bioPotassium",
      "bioBicarbonates", "bioPhosphore", "bioCalcium", "bioPth", "bioVitamineD", "bioHemoglobine",
      "bioReticulocytes", "bioVgm", "bioFerritine", "bioCst", "bioCrp", "bioAlbumine"
    ],
    selecteurs: ['input[name="pathologies"][value="Maladie rénale"]'],
    analyse: afficherAnalyseMRC,
    priseEnCharge: afficherPriseEnChargeMRC
  });

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelector('input[name="pathologies"][value="Maladie rénale"]')?.addEventListener("change", actualiserMRC);
      document.querySelectorAll("#mrcDetails input, #mrcDetails select, #mrcDetails textarea, .biology-card input").forEach(element => {
        element.addEventListener("input", afficherResumeBiologieMRC);
        element.addEventListener("change", afficherResumeBiologieMRC);
      });
      synchroniserDetailMRC();
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
