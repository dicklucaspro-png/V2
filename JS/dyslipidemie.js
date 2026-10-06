// =========================================================
// NUTRIFLOW — MODULE DYSLIPIDÉMIE V1
// Références de travail : ESC/EAS 2019 + Focused Update 2025,
// OMS 2023, cours Diététique et pathologies cardiovasculaires 2025-2026.
// Le module aide à structurer l'analyse ; il ne pose pas de diagnostic
// et ne prescrit ni n'ajuste un traitement médicamenteux.
// =========================================================
(function (global) {
  "use strict";

  const $ = id => document.getElementById(id);
  const val = id => String($(id)?.value ?? "").trim();
  const num = id => {
    const n = Number.parseFloat(String($(id)?.value ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const esc = value => typeof global.echapperHTML === "function"
    ? global.echapperHTML(value)
    : String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

  const CIBLES_LDL_ESC_MG_DL = Object.freeze({
    faible: { absolue: 116, reduction: null, label: "Risque faible" },
    modere: { absolue: 100, reduction: null, label: "Risque modéré" },
    eleve: { absolue: 70, reduction: 50, label: "Risque élevé" },
    tres_eleve: { absolue: 55, reduction: 50, label: "Risque très élevé" }
  });

  const CIBLES_NON_HDL_ESC_MG_DL = Object.freeze({
    modere: 130,
    eleve: 100,
    tres_eleve: 85
  });

  const CIBLES_APOB_ESC_MG_DL = Object.freeze({
    modere: 100,
    eleve: 80,
    tres_eleve: 65
  });

  // Seuils de lecture des triglycérides utilisés par le module.
  // 150 mg/dL : seuil d'analyse cardiovasculaire.
  // 440–879 mg/dL (~5–10 mmol/L) : des pancréatites peuvent survenir ;
  //                              une vigilance médicale renforcée est nécessaire.
  // ≥880 mg/dL (~10 mmol/L) : hypertriglycéridémie sévère avec risque
  //                           de pancréatite cliniquement significatif (ESC/EAS).
  const SEUILS_TG_ESC_MG_DL = Object.freeze({
    analyse: 150,
    vigilancePancreatite: 440,
    severe: 880
  });

  function dyslipidemieActive() {
    return document.querySelector('input[name="pathologies"][value="Dyslipidémie"]')?.checked === true;
  }

  function normaliserUnite(unite) {
    return String(unite ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace("ℓ", "l");
  }

  function convertirCholesterolVersMgDl(valeur, unite) {
    if (!Number.isFinite(valeur)) return null;
    const u = normaliserUnite(unite);
    if (["mg/dl", "mgdl"].includes(u)) return valeur;
    if (["g/l", "gl"].includes(u)) return valeur * 100;
    if (["mmol/l", "mmoll"].includes(u)) return valeur * 38.67;
    return null;
  }

  function convertirTriglyceridesVersMgDl(valeur, unite) {
    if (!Number.isFinite(valeur)) return null;
    const u = normaliserUnite(unite);
    if (["mg/dl", "mgdl"].includes(u)) return valeur;
    if (["g/l", "gl"].includes(u)) return valeur * 100;
    if (["mmol/l", "mmoll"].includes(u)) return valeur * 88.57;
    return null;
  }

  function convertirApoBVersMgDl(valeur, unite) {
    if (!Number.isFinite(valeur)) return null;
    const u = normaliserUnite(unite);
    if (["mg/dl", "mgdl"].includes(u)) return valeur;
    if (["g/l", "gl"].includes(u)) return valeur * 100;
    return null;
  }

  function convertirLpAVersSeuil(valeur, unite) {
    if (!Number.isFinite(valeur)) return { interpretable: false, elevee: false, unite: "" };
    const u = normaliserUnite(unite);
    if (["mg/dl", "mgdl"].includes(u)) {
      return { interpretable: true, elevee: valeur > 50, seuil: 50, unite: "mg/dL" };
    }
    if (["nmol/l", "nmoll"].includes(u)) {
      return { interpretable: true, elevee: valeur > 105, seuil: 105, unite: "nmol/L" };
    }
    return { interpretable: false, elevee: false, unite: unite || "" };
  }

  function formatNombre(n, dec = 0) {
    return Number.isFinite(n)
      ? n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: dec })
      : "—";
  }

  function formatMgDl(n) {
    return Number.isFinite(n) ? `${formatNombre(n, n < 20 ? 1 : 0)} mg/dL` : "Non disponible";
  }

  function obtenirCibleLdl(dyslipidemie) {
    const objectif = dyslipidemie?.objectifLdl;
    const objectifPersonnalise = convertirCholesterolVersMgDl(objectif?.valeur, objectif?.unite);
    const risque = dyslipidemie?.risqueCv || "";
    const reference = CIBLES_LDL_ESC_MG_DL[risque] || null;

    if (Number.isFinite(objectifPersonnalise) && objectifPersonnalise > 0) {
      return {
        absolueMgDl: objectifPersonnalise,
        reductionPourcent: reference?.reduction ?? null,
        origine: "individualisee",
        libelle: "Objectif LDL-C individualisé renseigné"
      };
    }

    if (reference) {
      return {
        absolueMgDl: reference.absolue,
        reductionPourcent: reference.reduction,
        origine: "categorie_risque",
        libelle: `${reference.label} — repère ESC/EAS`
      };
    }

    return null;
  }

  function evaluerLdl(dyslipidemie, lipidique) {
    const ldlMgDl = convertirCholesterolVersMgDl(lipidique?.ldl?.valeur, lipidique?.ldl?.unite);
    const cible = obtenirCibleLdl(dyslipidemie);
    const baselineMgDl = convertirCholesterolVersMgDl(
      dyslipidemie?.ldlAvantTraitement?.valeur,
      dyslipidemie?.ldlAvantTraitement?.unite
    );

    let reductionPourcent = null;
    if (Number.isFinite(ldlMgDl) && Number.isFinite(baselineMgDl) && baselineMgDl > 0) {
      reductionPourcent = ((baselineMgDl - ldlMgDl) / baselineMgDl) * 100;
    }

    if (!Number.isFinite(ldlMgDl)) {
      return {
        disponible: false,
        ldlMgDl: null,
        cible,
        reductionPourcent,
        objectifAbsoluAtteint: null,
        reductionAtteinte: null,
        statut: "non_evalue",
        libelle: "LDL-C non renseigné"
      };
    }

    if (!cible) {
      return {
        disponible: true,
        ldlMgDl,
        cible: null,
        reductionPourcent,
        objectifAbsoluAtteint: null,
        reductionAtteinte: null,
        statut: "objectif_inconnu",
        libelle: "Objectif LDL-C non déterminé"
      };
    }

    const objectifAbsoluAtteint = ldlMgDl < cible.absolueMgDl;
    const reductionAtteinte = Number.isFinite(cible.reductionPourcent)
      ? (Number.isFinite(reductionPourcent) ? reductionPourcent >= cible.reductionPourcent : null)
      : true;

    const completementAtteint = objectifAbsoluAtteint && reductionAtteinte !== false && reductionAtteinte !== null;
    const partiellementEvaluable = objectifAbsoluAtteint && reductionAtteinte === null;

    return {
      disponible: true,
      ldlMgDl,
      cible,
      baselineMgDl,
      reductionPourcent,
      objectifAbsoluAtteint,
      reductionAtteinte,
      statut: completementAtteint ? "objectif_atteint" : partiellementEvaluable ? "partiel" : "hors_objectif",
      libelle: completementAtteint
        ? "Objectif LDL-C atteint"
        : partiellementEvaluable
          ? "Objectif absolu atteint — réduction relative non évaluable"
          : "Objectif LDL-C non atteint"
    };
  }

  function evaluerTriglycerides(lipidique) {
    const tgMgDl = convertirTriglyceridesVersMgDl(
      lipidique?.triglycerides?.valeur,
      lipidique?.triglycerides?.unite
    );

    if (!Number.isFinite(tgMgDl)) {
      return {
        disponible: false,
        tgMgDl: null,
        eleves: null,
        statut: "non_evalue",
        severite: "non_evaluee",
        vigilancePancreatite: false,
        risquePancreatiteSignificatif: false,
        prioriteMedicale: false,
        libelle: "Triglycérides non évalués"
      };
    }

    if (tgMgDl >= SEUILS_TG_ESC_MG_DL.severe) {
      return {
        disponible: true,
        tgMgDl,
        eleves: true,
        statut: "severe",
        severite: "severe",
        vigilancePancreatite: true,
        risquePancreatiteSignificatif: true,
        prioriteMedicale: true,
        libelle: "Hypertriglycéridémie sévère — risque de pancréatite cliniquement significatif"
      };
    }

    if (tgMgDl >= SEUILS_TG_ESC_MG_DL.vigilancePancreatite) {
      return {
        disponible: true,
        tgMgDl,
        eleves: true,
        statut: "tres_eleve",
        severite: "tres_elevee",
        vigilancePancreatite: true,
        risquePancreatiteSignificatif: false,
        prioriteMedicale: true,
        libelle: "Triglycérides très élevés — vigilance pancréatique"
      };
    }

    if (tgMgDl >= SEUILS_TG_ESC_MG_DL.analyse) {
      return {
        disponible: true,
        tgMgDl,
        eleves: true,
        statut: "eleve",
        severite: "elevee",
        vigilancePancreatite: false,
        risquePancreatiteSignificatif: false,
        prioriteMedicale: false,
        libelle: "Triglycérides élevés"
      };
    }

    return {
      disponible: true,
      tgMgDl,
      eleves: false,
      statut: "adequat",
      severite: "sans_signal",
      vigilancePancreatite: false,
      risquePancreatiteSignificatif: false,
      prioriteMedicale: false,
      libelle: "Pas de signal triglycéridique ≥ 150 mg/dL"
    };
  }

  function evaluerNonHdl(dyslipidemie, lipidique) {
    const risque = dyslipidemie?.risqueCv || "";
    const cible = CIBLES_NON_HDL_ESC_MG_DL[risque] ?? null;
    const nonHdlMgDl = convertirCholesterolVersMgDl(
      lipidique?.nonHdl?.valeur,
      lipidique?.nonHdl?.unite
    );

    if (!Number.isFinite(nonHdlMgDl)) {
      return { disponible: false, valeurMgDl: null, cibleMgDl: cible, statut: "non_evalue" };
    }
    if (!Number.isFinite(cible)) {
      return { disponible: true, valeurMgDl: nonHdlMgDl, cibleMgDl: null, statut: "sans_cible" };
    }

    return {
      disponible: true,
      valeurMgDl: nonHdlMgDl,
      cibleMgDl: cible,
      statut: nonHdlMgDl < cible ? "adequat" : "eleve"
    };
  }

  function evaluerApoB(dyslipidemie, lipidique) {
    const risque = dyslipidemie?.risqueCv || "";
    const cible = CIBLES_APOB_ESC_MG_DL[risque] ?? null;
    const apoBMgDl = convertirApoBVersMgDl(lipidique?.apoB?.valeur, lipidique?.apoB?.unite);

    if (!Number.isFinite(apoBMgDl)) {
      return { disponible: false, valeurMgDl: null, cibleMgDl: cible, statut: "non_evalue" };
    }
    if (!Number.isFinite(cible)) {
      return { disponible: true, valeurMgDl: apoBMgDl, cibleMgDl: null, statut: "sans_cible" };
    }

    return {
      disponible: true,
      valeurMgDl: apoBMgDl,
      cibleMgDl: cible,
      statut: apoBMgDl < cible ? "adequat" : "eleve"
    };
  }

  function evaluerLpA(lipidique) {
    const lpA = lipidique?.lpA || null;
    const interpretation = convertirLpAVersSeuil(lpA?.valeur, lpA?.unite);
    return {
      disponible: Number.isFinite(lpA?.valeur),
      valeur: lpA?.valeur ?? null,
      unite: lpA?.unite || "",
      ...interpretation
    };
  }

  const DEFINITIONS_LIPIDES_ANAMNESE = Object.freeze([
    { key: "lipides", label: "Lipides totaux", unite: "g", energie: true, partLipides: true },
    { key: "ags", label: "Acides gras saturés (AGS)", unite: "g", energie: true, partLipides: true },
    { key: "agmi", label: "Acides gras mono-insaturés (AGMI)", unite: "g", energie: true, partLipides: true },
    { key: "agpi", label: "Acides gras polyinsaturés (AGPI)", unite: "g", energie: true, partLipides: true },
    { key: "omega6", label: "Acide linoléique (n-6)", unite: "g", energie: true, partLipides: true },
    { key: "omega3", label: "ALA (n-3)", unite: "g", energie: true, partLipides: true },
    { key: "epaDha", label: "EPA + DHA", unite: "mg", energie: false, partLipides: true },
    { key: "cholesterol", label: "Cholestérol alimentaire", unite: "mg", energie: false, partLipides: false }
  ]);

  function obtenirAlimentsAnamneseDyslipidemie(synthese) {
    const repas = synthese?.anamnese?.repas || {};
    const aliments = [];

    Object.entries(repas).forEach(([nomRepas, donneesRepas]) => {
      (donneesRepas?.aliments || []).forEach(aliment => {
        if (!(Number(aliment?.poidsJournalier) > 0)) return;
        aliments.push({ ...aliment, repas: nomRepas });
      });
    });

    return aliments;
  }


  function normaliserTexteDyslipidemie(texte) {
    return String(texte ?? "")
      .toLocaleLowerCase("fr")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function estBoissonAlcooliseeDyslipidemie(aliment) {
    const texte = normaliserTexteDyslipidemie(`${aliment?.groupe || ""} ${aliment?.nom || ""}`);
    if (texte.includes("sans alcool")) return false;
    return /\b(vin|biere|cidre|champagne|rhum|gin|vodka|whisky|whiskey|pastis|liqueur|spiritueux|alcoolise|alcoolisee)\b/.test(texte);
  }

  function detecterBoissonsGlucidiquesAnamnese(aliments) {
    const liste = Array.isArray(aliments) ? aliments : [];
    const seuilGlucidesPour100g = 4;

    const motifsBoissons = [
      /\bcola\b/,
      /\bsoda\b/,
      /\blimonade\b/,
      /boisson energisante/,
      /energy drink/,
      /\bdiabolo\b/,
      /boisson[^,]*sirop/,
      /sirop a diluer/,
      /\bnectar\b/,
      /\bsmoothie\b/,
      /the glace/,
      /ice tea/,
      /petillant de fruits/,
      /boisson aux fruits/,
      /boisson fruit/,
      /boisson sportive/,
      /boisson isotonique/,
      /jus de fruit/,
      /jus d'orange/,
      /jus de pomme/,
      /jus de raisin/,
      /jus de pamplemousse/,
      /jus de mangue/,
      /jus de grenade/,
      /jus de pruneau/
    ];

    const motifsSansSucres = [
      /sans sucres? ajoutes?/,
      /sans sucres?\b/,
      /\bzero\b/,
      /\blight\b/
    ];

    const detectees = [];

    liste.forEach(aliment => {
      if (!(Number(aliment?.poidsJournalier) > 0)) return;
      if (estBoissonAlcooliseeDyslipidemie(aliment)) return;

      const nom = normaliserTexteDyslipidemie(aliment?.nom);
      const groupe = normaliserTexteDyslipidemie(aliment?.groupe);
      const texte = `${groupe} ${nom}`;
      const estDansGroupeBoisson = groupe.includes("boisson") || groupe.includes("eaux et autres boissons");
      const typeBoissonEvident = motifsBoissons.some(motif => motif.test(texte));
      const mentionSansSucres = motifsSansSucres.some(motif => motif.test(texte));

      const glucides = Number.isFinite(aliment?.glucides) ? Number(aliment.glucides) : null;
      const poids = Number(aliment?.poidsJournalier);
      const glucidesPour100g = Number.isFinite(glucides) && poids > 0
        ? glucides / poids * 100
        : null;

      const glucidiqueParComposition = estDansGroupeBoisson && Number.isFinite(glucidesPour100g) && glucidesPour100g >= seuilGlucidesPour100g;
      const sucreeParLibelle = typeBoissonEvident && !mentionSansSucres && (!Number.isFinite(glucidesPour100g) || glucidesPour100g > 0.5);

      if (!glucidiqueParComposition && !sucreeParLibelle) return;

      detectees.push({
        nom: aliment?.nom || "Boisson non nommée",
        repas: aliment?.repas || "Repas non renseigné",
        frequence: Number.isFinite(Number(aliment?.frequence)) ? Number(aliment.frequence) : null,
        poidsJournalier: poids,
        glucides,
        glucidesPour100g,
        detection: glucidiqueParComposition ? "composition" : "libelle"
      });
    });

    detectees.sort((a, b) => {
      const ga = Number.isFinite(a.glucides) ? a.glucides : -1;
      const gb = Number.isFinite(b.glucides) ? b.glucides : -1;
      return gb - ga;
    });

    const glucidesConnus = detectees.filter(item => Number.isFinite(item.glucides));
    const totalGlucidesConnus = glucidesConnus.reduce((somme, item) => somme + item.glucides, 0);
    const glucidesComplets = detectees.length > 0 && glucidesConnus.length === detectees.length;

    return {
      detectees,
      presente: detectees.length > 0,
      totalGlucidesConnus: glucidesConnus.length > 0 ? totalGlucidesConnus : null,
      glucidesComplets,
      boissonsAvecGlucidesConnus: glucidesConnus.length,
      boissonsTotal: detectees.length,
      seuilGlucidesPour100g
    };
  }

  function libellerHabitudeBoissonsSucrees(valeur) {
    const libelles = {
      jamais: "Jamais",
      occasionnelle: "Occasionnelles",
      occasionnel: "Occasionnelles",
      reguliere: "Régulières",
      regulieres: "Régulières",
      quotidienne: "Quotidiennes",
      quotidiennes: "Quotidiennes"
    };
    return libelles[String(valeur || "").toLowerCase()] || String(valeur || "");
  }

  function libellerBoissonsGlucidiquesAnamnese(boissons, limite = 3) {
    const detectees = boissons?.detectees || [];
    if (!detectees.length) return "";
    return detectees.slice(0, limite).map(item => item.nom).join(", ");
  }

  function analyserNutrimentAnamnese(aliments, definition) {
    const totalAliments = aliments.length;
    const connus = aliments.filter(aliment => Number.isFinite(aliment?.[definition.key]));
    const totalConnu = connus.reduce((somme, aliment) => somme + Number(aliment[definition.key]), 0);
    const complet = totalAliments > 0 && connus.length === totalAliments;
    const partiel = connus.length > 0 && connus.length < totalAliments;

    const contributeurs = connus
      .filter(aliment => Number(aliment[definition.key]) > 0)
      .map(aliment => ({
        nom: aliment.nom || "Aliment non nommé",
        repas: aliment.repas || "Repas non renseigné",
        poidsJournalier: Number(aliment.poidsJournalier) || 0,
        valeur: Number(aliment[definition.key]),
        partTotalConnu: totalConnu > 0 ? Number(aliment[definition.key]) / totalConnu * 100 : null
      }))
      .sort((a, b) => b.valeur - a.valeur);

    return {
      ...definition,
      disponible: connus.length > 0,
      total: connus.length > 0 ? totalConnu : null,
      complet,
      partiel,
      alimentsConnus: connus.length,
      alimentsTotal: totalAliments,
      contributeurs
    };
  }

  function evaluerNutritionDyslipidemie(synthese) {
    const aliments = obtenirAlimentsAnamneseDyslipidemie(synthese);
    const energieAnalyse = analyserNutrimentAnamnese(aliments, {
      key: "energie",
      label: "Énergie",
      unite: "kcal",
      energie: false,
      partLipides: false
    });

    const nutriments = {};
    DEFINITIONS_LIPIDES_ANAMNESE.forEach(definition => {
      nutriments[definition.key] = analyserNutrimentAnamnese(aliments, definition);
    });

    const fibresAnalyse = analyserNutrimentAnamnese(aliments, {
      key: "fibres",
      label: "Fibres",
      unite: "g",
      energie: false,
      partLipides: false
    });

    const lipides = nutriments.lipides;
    const ags = nutriments.ags;
    const agmi = nutriments.agmi;
    const agpi = nutriments.agpi;

    Object.values(nutriments).forEach(nutriment => {
      // Valeur exacte : uniquement lorsque le nutriment ET l'énergie sont complets.
      nutriment.pourcentAet = nutriment.energie && nutriment.complet && energieAnalyse.complet && energieAnalyse.total > 0
        ? (nutriment.total * 9 / energieAnalyse.total) * 100
        : null;

      // Valeur minimale connue : lorsqu'un nutriment lipidique est partiellement
      // renseigné mais que l'énergie est complète, la somme connue est un minimum.
      // Cette information est valable pour tous les lipides énergétiques, pas
      // seulement les AGS. Elle ne devient jamais une valeur exacte.
      nutriment.pourcentAetMinimum = nutriment.energie && nutriment.partiel && energieAnalyse.complet && energieAnalyse.total > 0 && Number.isFinite(nutriment.total)
        ? (nutriment.total * 9 / energieAnalyse.total) * 100
        : null;

      const valeurGrammes = nutriment.unite === "mg" && Number.isFinite(nutriment.total)
        ? nutriment.total / 1000
        : nutriment.total;

      // Part exacte des lipides : numérateur et dénominateur complets.
      nutriment.partLipidesPourcent = nutriment.partLipides && nutriment.complet && lipides.complet && lipides.total > 0 && Number.isFinite(valeurGrammes)
        ? valeurGrammes / lipides.total * 100
        : null;

      // Part minimale connue : numérateur partiel mais lipides totaux complets.
      // Si le dénominateur est lui-même incomplet, aucun minimum fiable du ratio
      // n'est affiché car le total réel de lipides pourrait être plus élevé.
      nutriment.partLipidesPourcentMinimum = nutriment.partLipides && nutriment.partiel && lipides.complet && lipides.total > 0 && Number.isFinite(valeurGrammes)
        ? valeurGrammes / lipides.total * 100
        : null;
    });

    const agsPourcent = ags?.pourcentAet ?? null;

    // Les AGS utilisent la même logique générique de minimum connu que les autres
    // composantes lipidiques. Comme leur repère est un maximum (10 % AET), un
    // minimum connu déjà >= 10 % suffit à prouver le dépassement. En dessous, on
    // reste non évaluable car les valeurs CIQUAL manquantes peuvent encore augmenter
    // l'apport réel.
    const agsPourcentMinimum = ags?.pourcentAetMinimum ?? null;

    let agsAuDessusRepere = null;
    let agsStatut = "non_evaluable";

    if (Number.isFinite(agsPourcent)) {
      agsAuDessusRepere = agsPourcent >= 10;
      agsStatut = agsAuDessusRepere ? "eleve" : "adequat";
    } else if (Number.isFinite(agsPourcentMinimum) && agsPourcentMinimum >= 10) {
      agsAuDessusRepere = true;
      agsStatut = "eleve_minimum_connu";
    }

    const boissons = synthese?.habitudes?.boissonsSucrees || "";
    const boissonsRegulieres = ["reguliere", "quotidienne"].includes(boissons);
    const boissonsAnamnese = detecterBoissonsGlucidiquesAnamnese(aliments);

    return {
      anamneseDisponible: synthese?.anamnese?.disponible === true && aliments.length > 0,
      aliments,
      energie: energieAnalyse.disponible ? energieAnalyse.total : null,
      energieComplete: energieAnalyse.complet,
      nutriments,
      lipides: lipides?.total ?? null,
      ags: ags?.total ?? null,
      agmi: agmi?.total ?? null,
      agpi: agpi?.total ?? null,
      agsPourcent,
      agsPourcentMinimum,
      agsStatut,
      agsAuDessusRepere,
      fibres: fibresAnalyse.complet ? fibresAnalyse.total : null,
      fibresAnalyse,
      fibresInsuffisantes: fibresAnalyse.complet && Number.isFinite(fibresAnalyse.total) ? fibresAnalyse.total < 25 : null,
      boissonsSucrees: boissons,
      boissonsRegulieres,
      boissonsAnamnese,
      boissonsAnamneseDetectees: boissonsAnamnese.presente
    };
  }

  function evaluerSuspicionHF(dyslipidemie, ldlEvaluation) {
    if (dyslipidemie?.hfDiagnostiquee === "oui" || dyslipidemie?.type === "familiale") {
      return {
        statut: "connue",
        signal: true,
        libelle: "Hypercholestérolémie familiale renseignée comme diagnostiquée"
      };
    }

    const baseline = ldlEvaluation?.baselineMgDl;
    const sansTraitement = dyslipidemie?.traitement?.type === "aucun";
    const ldlActuelSansTraitement = sansTraitement ? ldlEvaluation?.ldlMgDl : null;
    const ldlTresEleve = (Number.isFinite(baseline) && baseline >= 190) ||
      (Number.isFinite(ldlActuelSansTraitement) && ldlActuelSansTraitement >= 190);

    if (!ldlTresEleve) {
      return { statut: "non_signalee", signal: false, libelle: "Pas de signal automatique d'HF" };
    }

    return {
      statut: dyslipidemie?.evenementCvFamilialPrecoce === "oui" ? "signal_renforce" : "signal",
      signal: true,
      libelle: dyslipidemie?.evenementCvFamilialPrecoce === "oui"
        ? "LDL-C non traité très élevé + antécédent familial prématuré : HF à évaluer"
        : "LDL-C non traité très élevé : HF à évaluer"
    };
  }

  function analyserDyslipidemie() {
    if (!dyslipidemieActive()) return null;

    const synthese = typeof global.construireSynthesePatient === "function"
      ? global.construireSynthesePatient()
      : null;
    const dyslipidemie = synthese?.dyslipidemie || null;
    if (!dyslipidemie) return null;

    const lipidique = synthese?.biologie?.lipidique || {};
    const ldl = evaluerLdl(dyslipidemie, lipidique);
    const triglycerides = evaluerTriglycerides(lipidique);
    const nonHdl = evaluerNonHdl(dyslipidemie, lipidique);
    const apoB = evaluerApoB(dyslipidemie, lipidique);
    const lpA = evaluerLpA(lipidique);
    const nutrition = evaluerNutritionDyslipidemie(synthese);
    const hf = evaluerSuspicionHF(dyslipidemie, ldl);

    const manquants = [];
    if (!ldl.disponible) manquants.push("LDL-C");
    if (!triglycerides.disponible) manquants.push("triglycérides");
    if (!dyslipidemie.risqueCv && !Number.isFinite(convertirCholesterolVersMgDl(dyslipidemie.objectifLdl?.valeur, dyslipidemie.objectifLdl?.unite))) {
      manquants.push("niveau de risque cardiovasculaire ou objectif LDL-C individualisé");
    }
    if (Number.isFinite(ldl?.cible?.reductionPourcent) && !Number.isFinite(ldl.baselineMgDl)) {
      manquants.push("LDL-C avant traitement pour évaluer la réduction relative");
    }

    // Les priorités de prise en charge ne sont plus construites ici.
    // analyserDyslipidemie() expose uniquement les résultats interprétés ;
    // la hiérarchisation clinique est centralisée dans
    // construirePrioritesPriseEnChargeDyslipidemie() et les vigilances dédiées.

    return {
      synthese,
      dyslipidemie,
      lipidique,
      ldl,
      triglycerides,
      nonHdl,
      apoB,
      lpA,
      nutrition,
      hf,
      manquants
    };
  }

  function construireLigneBiologie(label, donnee, convertisseur = null) {
    const valeur = donnee?.valeur;
    const unite = donnee?.unite || "";
    const exploitable = Number.isFinite(valeur);
    const convertie = convertisseur && exploitable ? convertisseur(valeur, unite) : null;
    const affichage = exploitable ? `${formatNombre(valeur, Math.abs(valeur) < 10 ? 2 : 1)} ${esc(unite)}` : "Non renseigné";
    const standard = Number.isFinite(convertie) ? `<span>${formatMgDl(convertie)}</span>` : "";
    return `<div class="dyslip-biology-row"><span>${esc(label)}</span><strong>${affichage}</strong>${standard}</div>`;
  }

  function afficherResumeBiologieDyslipidemie() {
    const conteneur = $("dyslipidemieBiologieResume");
    if (!conteneur) return;

    const synthese = typeof global.construireSynthesePatient === "function"
      ? global.construireSynthesePatient()
      : null;
    const lipidique = synthese?.biologie?.lipidique || {};

    const nonHdl = lipidique.nonHdl;
    conteneur.innerHTML = `
      <div class="dyslip-biology-summary-head">
        <div>
          <strong>Bilan lipidique central</strong>
          <span>Lecture seule — saisie dans Biologie sanguine</span>
        </div>
      </div>
      <div class="dyslip-biology-summary-grid">
        ${construireLigneBiologie("LDL-C", lipidique.ldl, convertirCholesterolVersMgDl)}
        ${construireLigneBiologie("Triglycérides", lipidique.triglycerides, convertirTriglyceridesVersMgDl)}
        ${construireLigneBiologie("HDL-C", lipidique.hdl, convertirCholesterolVersMgDl)}
        ${construireLigneBiologie("Cholestérol total", lipidique.cholesterolTotal, convertirCholesterolVersMgDl)}
        ${construireLigneBiologie("non-HDL-C", nonHdl, convertirCholesterolVersMgDl)}
        ${construireLigneBiologie("ApoB", lipidique.apoB, convertirApoBVersMgDl)}
        ${construireLigneBiologie("Lp(a)", lipidique.lpA, null)}
      </div>`;
  }

  function synchroniserDetailsTraitementDyslipidemie() {
    const select = $("dyslipidemieTraitement");
    const afficher = dyslipidemieActive() && !!select?.value && select.value !== "aucun";
    ["dyslipidemieTraitementDetails", "dyslipidemieToleranceTraitement", "dyslipidemieObservanceTraitement"].forEach(id => {
      const champ = $(id);
      if (champ) {
        champ.closest('.treatment-field').hidden = !afficher;
        champ.disabled = !afficher;
      }
    });
  }

  function actualiserDyslipidemie() {
    const actif = dyslipidemieActive();
    const bloc = $("dyslipidemieDetails");
    const traitement = $("dyslipidemieTraitementGroupe");
    const selectTraitement = $("dyslipidemieTraitement");

    if (bloc) {
      bloc.style.display = "";
      bloc.classList.toggle("est-visible", actif);
    }

    if (traitement) {
      traitement.hidden = !actif;
      traitement.style.display = actif ? "" : "none";
      traitement.classList.toggle("est-visible", actif);
    }

    if (selectTraitement) {
      selectTraitement.disabled = !actif;
      if (!actif) selectTraitement.value = "";
    }

    synchroniserDetailsTraitementDyslipidemie();
    if (actif) afficherResumeBiologieDyslipidemie();
    global.actualiserBiologieAdaptative?.();
    global.rafraichirSortiesPathologiques?.();
  }

  function statutClasseLdl(statut) {
    if (statut === "objectif_atteint") return "adequat";
    if (statut === "hors_objectif") return "eleve";
    return "non-evalue";
  }

  function libelleCouvertureNutriment(nutriment) {
    if (!nutriment?.disponible) return "Non disponible";
    if (nutriment.complet) return `Complet — ${nutriment.alimentsConnus}/${nutriment.alimentsTotal} aliments`;
    return `Partiel — ${nutriment.alimentsConnus}/${nutriment.alimentsTotal} aliments`;
  }

  function formaterApportNutriment(nutriment) {
    if (!nutriment?.disponible || !Number.isFinite(nutriment.total)) return "Non disponible";
    const decimales = nutriment.unite === "mg" ? 0 : 1;
    const valeur = `${formatNombre(nutriment.total, decimales)} ${nutriment.unite}`;
    return nutriment.partiel ? `≥ ${valeur}` : valeur;
  }

  function construireTableauSyntheseLipides(nutrition) {
    const lignes = DEFINITIONS_LIPIDES_ANAMNESE.map(definition => {
      const nutriment = nutrition.nutriments?.[definition.key];
      const aet = Number.isFinite(nutriment?.pourcentAet)
        ? `${formatNombre(nutriment.pourcentAet, 1)} %`
        : Number.isFinite(nutriment?.pourcentAetMinimum)
          ? `≥ ${formatNombre(nutriment.pourcentAetMinimum, 1)} %`
          : "—";
      const partLipides = Number.isFinite(nutriment?.partLipidesPourcent)
        ? `${formatNombre(nutriment.partLipidesPourcent, 1)} %`
        : Number.isFinite(nutriment?.partLipidesPourcentMinimum)
          ? `≥ ${formatNombre(nutriment.partLipidesPourcentMinimum, 1)} %`
          : "—";

      return `
        <tr>
          <td><strong>${esc(definition.label)}</strong></td>
          <td>${esc(formaterApportNutriment(nutriment))}</td>
          <td>${aet}</td>
          <td>${partLipides}</td>
          <td><span class="dyslip-coverage ${nutriment?.complet ? "complete" : nutriment?.partiel ? "partial" : "missing"}">${esc(libelleCouvertureNutriment(nutriment))}</span></td>
        </tr>`;
    }).join("");

    return `
      <div class="dyslip-table-wrap">
        <table class="dyslip-table dyslip-lipid-summary-table">
          <thead>
            <tr>
              <th>Composante lipidique</th>
              <th>Apport estimé</th>
              <th>% AET</th>
              <th>Part des lipides</th>
              <th>Couverture CIQUAL</th>
            </tr>
          </thead>
          <tbody>${lignes}</tbody>
        </table>
      </div>`;
  }

  function construireTableauContributeursLipidiques(nutriment, limite = 5) {
    if (!nutriment?.disponible || !nutriment.contributeurs?.length) {
      return `<p class="dyslip-empty">Aucun contributeur exploitable avec les données CIQUAL disponibles.</p>`;
    }

    const lignes = nutriment.contributeurs.slice(0, limite).map((source, index) => `
      <tr>
        <td class="dyslip-rank-cell">${index + 1}</td>
        <td><strong>${esc(source.nom)}</strong></td>
        <td>${esc(source.repas)}</td>
        <td>${formatNombre(source.poidsJournalier, 1)} g/j</td>
        <td>${formatNombre(source.valeur, nutriment.unite === "mg" ? 0 : 2)} ${esc(nutriment.unite)}/j</td>
        <td>${Number.isFinite(source.partTotalConnu) ? `${formatNombre(source.partTotalConnu, 1)} %` : "—"}</td>
      </tr>`).join("");

    const notePartielle = nutriment.partiel
      ? `<p class="dyslip-data-note">Données partielles : le classement porte uniquement sur les aliments pour lesquels CIQUAL renseigne ce nutriment.</p>`
      : "";

    return `
      ${notePartielle}
      <div class="dyslip-table-wrap">
        <table class="dyslip-table dyslip-contributors-table">
          <thead>
            <tr><th>#</th><th>Aliment</th><th>Repas</th><th>Quantité</th><th>Contribution</th><th>Part du total connu</th></tr>
          </thead>
          <tbody>${lignes}</tbody>
        </table>
      </div>`;
  }

  function construireBlocContributeursLipidiques(nutrition) {
    return DEFINITIONS_LIPIDES_ANAMNESE.map((definition, index) => {
      const nutriment = nutrition.nutriments?.[definition.key];
      return `
        <details class="dyslip-contributor-card" ${index === 1 ? "open" : ""}>
          <summary>
            <span>${esc(definition.label)}</span>
            <strong>${esc(formaterApportNutriment(nutriment))}</strong>
          </summary>
          <div class="dyslip-contributor-content">
            ${construireTableauContributeursLipidiques(nutriment)}
          </div>
        </details>`;
    }).join("");
  }

  function construireLignesInterpretation(analyse) {
    const { ldl, triglycerides: tg, nonHdl, apoB, lpA, hf } = analyse;
    const lignes = [];

    let detailLdl = "Objectif LDL-C non déterminé.";
    if (ldl.cible) {
      detailLdl = `Objectif appliqué : < ${formatNombre(ldl.cible.absolueMgDl)} mg/dL — ${ldl.cible.origine === "individualisee" ? "objectif individualisé renseigné" : ldl.cible.libelle}.`;
      if (Number.isFinite(ldl.cible.reductionPourcent)) {
        detailLdl += Number.isFinite(ldl.reductionPourcent)
          ? ` Réduction relative calculée : ${formatNombre(ldl.reductionPourcent, 1)} % (attendue ≥ ${ldl.cible.reductionPourcent} %).`
          : ` Réduction relative attendue ≥ ${ldl.cible.reductionPourcent} %, non évaluable sans LDL-C non traité.`;
      }
    }
    lignes.push({
      indicateur: "LDL-C",
      interpretation: ldl.libelle,
      classe: statutClasseLdl(ldl.statut),
      detail: detailLdl
    });

    let interpretationTg = "Non évalués";
    let classeTg = "non-evalue";
    let detailTg = "Résultat exploitable absent du bilan biologique central.";

    if (tg.disponible) {
      classeTg = tg.eleves ? "eleve" : "adequat";

      if (tg.statut === "severe") {
        interpretationTg = "Hypertriglycéridémie sévère — priorité médicale";
        detailTg = "À partir d’environ 880 mg/dL (≈10 mmol/L), le risque de pancréatite devient cliniquement significatif. La valeur brute reste consultable dans Biologie sanguine ; NutriFlow signale une évaluation médicale prioritaire et ne réduit pas cette situation à une simple action diététique.";
      } else if (tg.statut === "tres_eleve") {
        interpretationTg = "Triglycérides très élevés — vigilance pancréatique";
        detailTg = "Entre environ 440 et 879 mg/dL (≈5–10 mmol/L), une pancréatite peut survenir. Le module renforce donc la vigilance médicale tout en conservant l’analyse des facteurs nutritionnels modifiables.";
      } else if (tg.statut === "eleve") {
        interpretationTg = "Seuil ≥ 150 mg/dL atteint";
        detailTg = "Élévation du profil triglycéridique justifiant de rechercher les facteurs associés ; la valeur brute reste consultable dans Biologie sanguine.";
      } else {
        interpretationTg = "Pas de signal ≥ 150 mg/dL";
        detailTg = "Aucun signal triglycéridique selon le seuil d’analyse du module ; la valeur brute reste consultable dans Biologie sanguine.";
      }
    }

    lignes.push({
      indicateur: "Triglycérides",
      interpretation: interpretationTg,
      classe: classeTg,
      detail: detailTg
    });

    if (nonHdl.disponible || Number.isFinite(nonHdl.cibleMgDl)) {
      lignes.push({
        indicateur: "non-HDL-C",
        interpretation: nonHdl.statut === "adequat" ? "Dans la cible secondaire" : nonHdl.statut === "eleve" ? "Au-dessus de la cible secondaire" : "Interprétation incomplète",
        classe: nonHdl.statut === "adequat" ? "adequat" : nonHdl.statut === "eleve" ? "eleve" : "non-evalue",
        detail: Number.isFinite(nonHdl.cibleMgDl) ? `Cible secondaire appliquée : < ${formatNombre(nonHdl.cibleMgDl)} mg/dL.` : "Aucune cible secondaire appliquée avec le contexte renseigné."
      });
    }

    if (apoB.disponible || Number.isFinite(apoB.cibleMgDl)) {
      lignes.push({
        indicateur: "ApoB",
        interpretation: apoB.statut === "adequat" ? "Dans la cible secondaire" : apoB.statut === "eleve" ? "Au-dessus de la cible secondaire" : "Interprétation incomplète",
        classe: apoB.statut === "adequat" ? "adequat" : apoB.statut === "eleve" ? "eleve" : "non-evalue",
        detail: Number.isFinite(apoB.cibleMgDl) ? `Cible secondaire appliquée : < ${formatNombre(apoB.cibleMgDl)} mg/dL.` : "Aucune cible secondaire appliquée avec le contexte renseigné."
      });
    }

    if (lpA.disponible) {
      lignes.push({
        indicateur: "Lp(a)",
        interpretation: !lpA.interpretable ? "Unité non interprétable automatiquement" : lpA.elevee ? "Modificateur de risque identifié" : "Pas de signal au-dessus du seuil utilisé",
        classe: !lpA.interpretable ? "non-evalue" : lpA.elevee ? "eleve" : "adequat",
        detail: lpA.interpretable ? `Seuil utilisé : > ${lpA.seuil} ${lpA.unite}.` : "Interprétation automatique uniquement en mg/dL ou nmol/L."
      });
    }

    if (hf.signal) {
      lignes.push({
        indicateur: "Hypercholestérolémie familiale",
        interpretation: hf.statut === "connue" ? "Diagnostic renseigné dans le dossier" : "Signal nécessitant une évaluation spécifique",
        classe: hf.statut === "connue" ? "adequat" : "eleve",
        detail: hf.libelle
      });
    }

    return lignes;
  }

  function afficherAnalyseDyslipidemie() {
    const section = $("analyseDyslipidemieSection");
    const container = $("analyseDyslipidemieContainer");
    if (!section || !container) return;

    const analyse = analyserDyslipidemie();
    if (!analyse) {
      section.hidden = true;
      container.innerHTML = "";
      return;
    }

    section.hidden = false;

    const { nutrition, triglycerides: tg } = analyse;
    const interpretations = construireLignesInterpretation(analyse);

    container.innerHTML = `
      <section class="nutrition-calc-card dyslip-analysis-card">
        <div class="nutrition-calc-card-header dyslip-analysis-header">
          <div>
            <span class="nutrition-calc-kicker">DYSLIPIDÉMIE</span>
            <h3>Analyse lipidique spécifique</h3>
            <p>Ce bloc interprète les données du dossier sans recopier le bilan biologique et sans anticiper les priorités de prise en charge. Une donnée manquante n'est jamais assimilée à une valeur normale.</p>
          </div>
        </div>

        <section class="dyslip-analysis-section">
          <div class="dyslip-section-heading">
            <div>
              <h4>Interprétation biologique</h4>
              <p>Les valeurs brutes restent dans Biologie sanguine ; seules les conclusions utiles à l'analyse sont affichées ici.</p>
            </div>
          </div>
          <div class="dyslip-interpretation-list">
            ${interpretations.map(item => `
              <article class="dyslip-interpretation-item">
                <div class="dyslip-interpretation-title">
                  <strong>${esc(item.indicateur)}</strong>
                  <span class="recommendation-status ${item.classe}">${esc(item.interpretation)}</span>
                </div>
                <p>${esc(item.detail)}</p>
              </article>`).join("")}
          </div>
        </section>

        <section class="dyslip-analysis-section">
          <div class="dyslip-section-heading">
            <div>
              <h4>Profil lipidique de l'anamnèse</h4>
              <p>Lipides disponibles dans CIQUAL, avec distinction entre bilan complet et données partielles. Quand le calcul le permet, une donnée partielle est affichée comme un minimum connu (≥) et jamais comme une valeur exacte ; une donnée absente n'est jamais assimilée à zéro.</p>
            </div>
          </div>

          ${nutrition.anamneseDisponible
            ? construireTableauSyntheseLipides(nutrition)
            : `<p class="dyslip-empty">Anamnèse alimentaire non disponible.</p>`}

          ${nutrition.anamneseDisponible ? `
            <div class="dyslip-related-nutrition">
              <div>
                <span>Fibres</span>
                <strong>${nutrition.fibresAnalyse?.disponible ? esc(formaterApportNutriment(nutrition.fibresAnalyse)) : "Non disponible"}</strong>
                <small>${nutrition.fibresAnalyse?.partiel ? "Données CIQUAL partielles" : nutrition.fibresAnalyse?.complet ? "Données complètes pour les aliments saisis" : ""}</small>
              </div>
              <div>
                <span>AGS — interprétation</span>
                <strong>${Number.isFinite(nutrition.agsPourcent)
                  ? `${formatNombre(nutrition.agsPourcent, 1)} % AET`
                  : Number.isFinite(nutrition.agsPourcentMinimum)
                    ? `≥ ${formatNombre(nutrition.agsPourcentMinimum, 1)} % AET connus`
                    : "Non calculable fiablement"}</strong>
                <small>${Number.isFinite(nutrition.agsPourcent)
                  ? (nutrition.agsAuDessusRepere ? "Au-dessus du repère de 10 % AET" : "Sous le repère de 10 % AET")
                  : Number.isFinite(nutrition.agsPourcentMinimum) && nutrition.agsAuDessusRepere === true
                    ? "Repère de 10 % déjà dépassé avec les seules données AGS connues"
                    : Number.isFinite(nutrition.agsPourcentMinimum)
                      ? "Minimum connu ; couverture AGS incomplète, impossible de conclure sous le repère"
                      : "Nécessite une énergie exploitable pour interpréter les AGS"}</small>
              </div>
              ${tg.eleves ? `<div>
                <span>Boissons sucrées / glucidiques</span>
                <strong>${nutrition.boissonsAnamneseDetectees
                  ? esc(libellerBoissonsGlucidiquesAnamnese(nutrition.boissonsAnamnese))
                  : nutrition.boissonsSucrees
                    ? esc(libellerHabitudeBoissonsSucrees(nutrition.boissonsSucrees))
                    : "À explorer"}</strong>
                <small><strong>Contexte biologique : triglycérides élevés (seuil d’analyse ≥ 150 mg/dL).</strong> ${nutrition.boissonsAnamneseDetectees
                  ? `${nutrition.boissonsAnamnese.glucidesComplets ? "" : "Au moins "}${Number.isFinite(nutrition.boissonsAnamnese.totalGlucidesConnus) ? `${formatNombre(nutrition.boissonsAnamnese.totalGlucidesConnus, 1)} g/j de glucides connus · ` : ""}détecté automatiquement dans l'anamnèse.`
                  : nutrition.boissonsSucrees
                    ? "Habitude déclarée dans le dossier patient ; à confronter à l'anamnèse."
                    : "Aucune boisson glucidique objectivée dans l'anamnèse saisie ; consommation à préciser si nécessaire."}</small>
              </div>` : ""}
            </div>` : ""}
        </section>

        ${nutrition.anamneseDisponible ? `
          <section class="dyslip-analysis-section">
            <div class="dyslip-section-heading">
              <div>
                <h4>Principaux contributeurs alimentaires</h4>
                <p>Classement issu directement des aliments et quantités de l'anamnèse. Les pourcentages portent sur le total connu lorsque CIQUAL est incomplet.</p>
              </div>
            </div>
            <div class="dyslip-contributors-grid">
              ${construireBlocContributeursLipidiques(nutrition)}
            </div>
          </section>` : ""}

        <section class="dyslip-analysis-section dyslip-completeness-section">
          <div class="dyslip-section-heading">
            <div><h4>Données limitant l'interprétation</h4></div>
          </div>
          ${analyse.manquants.length
            ? `<ul>${analyse.manquants.map(item => `<li>${esc(item)}</li>`).join("")}</ul>`
            : `<p class="dyslip-ok">Aucune donnée clinique indispensable manquante pour les règles actuellement appliquées.</p>`}
        </section>

        <div class="dyslip-source-note">
          Références de travail : ESC/EAS 2019, Focused Update ESC/EAS 2025, OMS 2023 et cours de diététique cardiovasculaire 2025-2026. L'analyse distingue les données brutes, leur interprétation et la prise en charge afin d'éviter les répétitions.
        </div>
      </section>`;
  }

  function obtenirPrincipauxContributeursPEC(analyse, cle, limite = 3) {
    const sources = cle === "fibres"
      ? analyse?.nutrition?.fibresAnalyse?.contributeurs
      : analyse?.nutrition?.nutriments?.[cle]?.contributeurs;

    return Array.isArray(sources)
      ? sources.slice(0, limite).filter(source => source?.nom)
      : [];
  }

  function libellerContributeursPEC(analyse, cle, limite = 3) {
    const sources = obtenirPrincipauxContributeursPEC(analyse, cle, limite);
    if (!sources.length) return "";
    return sources.map(source => source.nom).join(", ");
  }

  function ajouterPrioritePEC(liste, priorite) {
    if (!priorite?.code || liste.some(item => item.code === priorite.code)) return;

    const constats = Array.isArray(priorite.constats)
      ? Array.from(new Set(priorite.constats.filter(Boolean)))
      : [];

    const actions = Array.isArray(priorite.actions)
      ? Array.from(new Set(priorite.actions.filter(Boolean)))
      : [];

    liste.push({
      niveau: priorite.niveau || "moyenne",
      code: priorite.code,
      titre: priorite.titre || "Priorité nutritionnelle",
      detail: priorite.detail || "",
      constats,
      objectif: priorite.objectif || "À individualiser avec le patient.",
      actions,
      suivi: priorite.suivi || "Réévaluer à la prochaine consultation.",
      origine: priorite.origine || "Dossier patient"
    });
  }

  function construirePrioritesPriseEnChargeDyslipidemie(analyse) {
    if (!analyse) return [];

    const priorites = [];
    const nutrition = analyse.nutrition || {};

    const ldlHorsObjectif = analyse.ldl?.statut === "hors_objectif";
    const nonHdlEleve = analyse.nonHdl?.statut === "eleve";
    const apoBElevee = analyse.apoB?.statut === "eleve";
    const profilAtherogeneNonControle = ldlHorsObjectif || nonHdlEleve || apoBElevee;
    const tgEleves = analyse.triglycerides?.eleves === true;

    // ---------------------------------------------------------
    // AXE 1 — PROFIL ATHÉROGÈNE
    // Les anomalies LDL / non-HDL / ApoB sont consolidées dans
    // une seule priorité afin de ne pas créer trois cartes
    // décrivant le même problème clinique.
    // ---------------------------------------------------------

    if (profilAtherogeneNonControle) {
      const constats = [];
      const actions = [];

      if (ldlHorsObjectif) {
        constats.push("LDL-C hors de l'objectif applicable.");
      }
      if (nonHdlEleve) {
        constats.push("non-HDL-C au-dessus de la cible secondaire applicable.");
      }
      if (apoBElevee) {
        constats.push("ApoB au-dessus de la cible secondaire applicable.");
      }

      const contributeursAGS = libellerContributeursPEC(analyse, "ags");
      const contributeursFibres = libellerContributeursPEC(analyse, "fibres");

      if (nutrition.agsAuDessusRepere === true) {
        constats.push(
          nutrition.agsStatut === "eleve_minimum_connu"
            ? "Le minimum d'AGS déjà documenté dépasse le repère utilisé par le module malgré une couverture CIQUAL partielle."
            : "Apport en AGS supérieur au repère utilisé par le module."
        );
        actions.push(
          contributeursAGS
            ? `Cibler en priorité les principales sources d'AGS identifiées dans l'anamnèse : ${contributeursAGS}, puis construire avec le patient des substitutions réalistes par des sources de graisses insaturées.`
            : "Réduire les principales sources d'AGS identifiées dans l'anamnèse et privilégier leur remplacement par des sources de graisses insaturées adaptées au patient."
        );
      }

      if (nutrition.fibresInsuffisantes === true) {
        constats.push("Apport en fibres inférieur au repère minimal utilisé pour le contrôle lipidique.");
        actions.push(
          contributeursFibres
            ? `Renforcer progressivement les apports en fibres en s'appuyant sur les sources déjà présentes (${contributeursFibres}) et en ajoutant, selon la tolérance et les habitudes, légumineuses, fruits, légumes et produits céréaliers complets.`
            : "Augmenter progressivement les aliments riches en fibres, notamment légumineuses, fruits, légumes et produits céréaliers complets, selon la tolérance et les habitudes."
        );
      }

      if (nutrition.agsAuDessusRepere !== true && nutrition.fibresInsuffisantes !== true) {
        actions.push(
          nutrition.anamneseDisponible
            ? "Aucun levier alimentaire prioritaire n'est automatiquement objectivé par les règles AGS/fibres actuelles : revoir le profil alimentaire global avec le patient et individualiser les changements sans inventer de restriction."
            : "Compléter l'anamnèse alimentaire avant d'attribuer une action nutritionnelle spécifique au profil athérogène."
        );
      }

      if (analyse.synthese?.obesite) {
        constats.push("Obésité associée prise en compte dans un module dédié.");
        actions.push(
          "Coordonner l'éventuelle stratégie pondérale avec le module Obésité afin d'éviter un objectif de poids concurrent ou redondant."
        );
      }

      const cible = analyse.ldl?.cible;
      let objectif = "Améliorer le profil athérogène en agissant sur les leviers nutritionnels réellement identifiés, en complément de la stratégie médicale.";

      if (ldlHorsObjectif && cible) {
        objectif = `Contribuer à l'atteinte de l'objectif LDL-C retenu (< ${formatNombre(cible.absolueMgDl)} mg/dL${Number.isFinite(cible.reductionPourcent) ? ` avec une réduction ≥ ${cible.reductionPourcent} % lorsque le LDL-C non traité est documenté` : ""}), tout en améliorant les marqueurs athérogènes secondaires lorsqu'ils sont également hors cible.`;
      } else if (nonHdlEleve || apoBElevee) {
        objectif = "Améliorer les marqueurs athérogènes secondaires hors cible sans créer de cible alimentaire autonome ni modifier la stratégie médicamenteuse.";
      }

      ajouterPrioritePEC(priorites, {
        niveau: "haute",
        code: "profil-atherogene",
        titre: "Profil athérogène à améliorer",
        detail: "Les résultats interprétés dans l'onglet Analyse sont regroupés ici en un seul axe de prise en charge afin d'éviter de dupliquer LDL-C, non-HDL-C et ApoB en plusieurs priorités concurrentes.",
        constats,
        objectif,
        actions,
        suivi: "Réévaluer les marqueurs lipidiques concernés au prochain bilan disponible et vérifier l'évolution des leviers alimentaires réellement travaillés.",
        origine: "Analyse Dyslipidémie — LDL-C / non-HDL-C / ApoB + anamnèse alimentaire"
      });
    }

    // ---------------------------------------------------------
    // AXE 2 — PROFIL TRIGLYCÉRIDIQUE
    // Reste distinct du profil athérogène car les leviers
    // alimentaires et la logique clinique ne sont pas identiques.
    // ---------------------------------------------------------

    if (tgEleves) {
      const tg = analyse.triglycerides || {};
      const constats = [];
      const actions = [];

      if (tg.statut === "severe") {
        constats.push("Hypertriglycéridémie sévère (≥ 880 mg/dL environ) : risque de pancréatite cliniquement significatif.");
        actions.push(
          "Ne pas traiter cette situation comme une simple priorité nutritionnelle : coordonner rapidement une évaluation médicale. En présence de symptômes évocateurs de pancréatite, une prise en charge urgente est nécessaire."
        );
      } else if (tg.statut === "tres_eleve") {
        constats.push("Triglycérides très élevés (≈ 440–879 mg/dL) : une pancréatite peut survenir dans cette zone.");
        actions.push(
          "Renforcer la coordination médicale et le suivi biologique ; la prise en charge nutritionnelle reste complémentaire et ne doit pas retarder l'évaluation clinique."
        );
      } else {
        constats.push("Triglycérides au-dessus du seuil d'analyse retenu (≥ 150 mg/dL).");
      }

      const boissonsDetectees = nutrition.boissonsAnamnese?.detectees || [];
      const libelleBoissonsDetectees = libellerBoissonsGlucidiquesAnamnese(nutrition.boissonsAnamnese);

      if (boissonsDetectees.length > 0) {
        constats.push(`Boisson(s) sucrée(s) / glucidique(s) détectée(s) dans l'anamnèse : ${libelleBoissonsDetectees}.`);
        if (Number.isFinite(nutrition.boissonsAnamnese?.totalGlucidesConnus)) {
          constats.push(
            `${nutrition.boissonsAnamnese.glucidesComplets ? "" : "Au moins "}${formatNombre(nutrition.boissonsAnamnese.totalGlucidesConnus, 1)} g/j de glucides proviennent des boissons détectées dans les données disponibles.`
          );
        }
        actions.push(
          `Travailler la fréquence, la quantité et le contexte de consommation des boissons réellement identifiées (${libelleBoissonsDetectees}), puis définir avec le patient une réduction ou une substitution réaliste si cet axe est retenu.`
        );
        if (nutrition.boissonsRegulieres) {
          constats.push("L'habitude déclarée de boissons sucrées régulières/quotidiennes est cohérente avec l'anamnèse.");
        }
      } else if (nutrition.boissonsRegulieres) {
        constats.push("Consommation régulière ou quotidienne de boissons sucrées renseignée dans les habitudes, sans boisson correspondante objectivée dans l'anamnèse saisie.");
        actions.push(
          "Préciser les boissons sucrées concernées, leur fréquence et leur quantité, puis décider avec le patient d'une réduction ou d'une substitution réaliste si ce facteur est confirmé."
        );
      } else {
        actions.push(
          "À explorer : préciser la consommation de sodas, boissons énergisantes, limonades, nectars, jus et autres boissons glucidiques ; aucune consommation n'est supposée en l'absence de donnée."
        );
      }

      actions.push(
        "Examiner le contexte alimentaire global, notamment l'excès énergétique éventuel, les glucides très raffinés et l'alcool s'il est consommé, puis n'intervenir que sur les facteurs réellement présents."
      );

      if (analyse.synthese?.obesite) {
        constats.push("Obésité associée prise en compte dans un module dédié.");
        actions.push(
          "Coordonner les éventuels objectifs liés au poids avec le module Obésité plutôt que les dupliquer dans Dyslipidémie."
        );
      }

      const detailTg = tg.statut === "severe"
        ? "L'analyse identifie une hypertriglycéridémie sévère. L'axe nutritionnel reste utile pour rechercher les facteurs modifiables, mais la sécurité clinique et la coordination médicale deviennent prioritaires."
        : tg.statut === "tres_eleve"
          ? "L'analyse identifie des triglycérides très élevés. La prise en charge associe recherche des facteurs modifiables et vigilance médicale renforcée en raison du risque pancréatique possible."
          : "L'analyse met en évidence une hypertriglycéridémie. La prise en charge recherche puis cible les facteurs modifiables réellement présents chez le patient.";

      const objectifTg = tg.statut === "severe"
        ? "Sécuriser la situation par une évaluation médicale prioritaire et contribuer à la diminution des triglycérides en corrigeant les facteurs nutritionnels réellement identifiés, sans retarder la prise en charge clinique."
        : tg.statut === "tres_eleve"
          ? "Obtenir une diminution des triglycérides avec coordination médicale rapprochée et correction des facteurs modifiables identifiés."
          : "Obtenir une évolution favorable des triglycérides au prochain contrôle biologique en agissant sur les facteurs modifiables identifiés, sans fixer une cible thérapeutique supplémentaire non renseignée.";

      ajouterPrioritePEC(priorites, {
        niveau: "haute",
        code: "triglycerides",
        titre: tg.statut === "severe"
          ? "Hypertriglycéridémie sévère — prise en charge prioritaire"
          : tg.statut === "tres_eleve"
            ? "Profil triglycéridique très élevé"
            : "Profil triglycéridique à améliorer",
        detail: detailTg,
        constats,
        objectif: objectifTg,
        actions,
        suivi: tg.prioriteMedicale
          ? "Contrôle biologique rapproché selon l'organisation médicale et réévaluation des facteurs nutritionnels ciblés ; documenter l'évolution des triglycérides."
          : "Suivre l'évolution des triglycérides et réévaluer les facteurs alimentaires ciblés, notamment les boissons sucrées lorsqu'elles sont concernées.",
        origine: "Analyse Dyslipidémie — triglycérides + habitudes alimentaires"
      });
    }

    // ---------------------------------------------------------
    // AXES NUTRITIONNELS AUTONOMES
    // Ils ne sont créés que si aucun axe athérogène ne les
    // absorbe déjà, afin d'éviter les répétitions.
    // ---------------------------------------------------------

    if (!profilAtherogeneNonControle && nutrition.agsAuDessusRepere === true) {
      const contributeurs = libellerContributeursPEC(analyse, "ags");
      ajouterPrioritePEC(priorites, {
        niveau: "moyenne",
        code: "ags",
        titre: "Qualité des graisses — AGS à réduire",
        detail: nutrition.agsStatut === "eleve_minimum_connu"
          ? "Même avec une couverture CIQUAL partielle, le minimum d'AGS déjà documenté dépasse le repère utilisé par le module."
          : "L'analyse alimentaire met en évidence une part énergétique provenant des acides gras saturés supérieure au repère utilisé par le module.",
        constats: [
          nutrition.agsStatut === "eleve_minimum_connu"
            ? "Le minimum d'AGS connu dépasse déjà 10 % de l'apport énergétique."
            : "Apport en AGS supérieur au repère utilisé par le module."
        ],
        objectif: "Ramener progressivement les AGS sous 10 % de l'apport énergétique en privilégiant leur remplacement par des graisses insaturées.",
        actions: [
          contributeurs
            ? `Travailler d'abord sur les principaux contributeurs identifiés : ${contributeurs}.`
            : "Identifier les principales sources d'AGS de l'anamnèse avant de proposer des changements.",
          "Choisir avec le patient des substitutions concrètes compatibles avec ses habitudes plutôt qu'une suppression globale des matières grasses."
        ],
        suivi: "Recalculer la part des AGS dans l'apport énergétique et comparer les principaux contributeurs lors de la prochaine anamnèse.",
        origine: "Analyse Dyslipidémie — anamnèse alimentaire / AGS"
      });
    }

    if (!profilAtherogeneNonControle && nutrition.fibresInsuffisantes === true) {
      const contributeurs = libellerContributeursPEC(analyse, "fibres");
      ajouterPrioritePEC(priorites, {
        niveau: "moyenne",
        code: "fibres",
        titre: "Apport en fibres à renforcer",
        detail: "L'analyse alimentaire met en évidence un apport en fibres inférieur au repère minimal utilisé pour le contrôle lipidique.",
        constats: [
          "Apport en fibres inférieur au repère minimal utilisé par le module."
        ],
        objectif: "Atteindre progressivement au moins 25 g/j de fibres, en adaptant la progression à la tolérance et au contexte du patient.",
        actions: [
          contributeurs
            ? `Conserver et renforcer les sources déjà présentes dans l'alimentation : ${contributeurs}.`
            : "Identifier avec le patient des sources de fibres adaptées à ses habitudes.",
          "Augmenter progressivement légumineuses, légumes, fruits et produits céréaliers complets lorsque cela est pertinent et bien toléré."
        ],
        suivi: "Réévaluer l'apport total en fibres, la tolérance digestive et la place des principales sources alimentaires.",
        origine: "Analyse Dyslipidémie — anamnèse alimentaire / fibres"
      });
    }

    const ordre = { haute: 1, moyenne: 2, information: 3 };
    return priorites.sort((a, b) => (ordre[a.niveau] || 9) - (ordre[b.niveau] || 9));
  }

  function cartePriseEnChargeDyslipidemie(element, index) {
    const niveaux = {
      haute: "Priorité élevée",
      moyenne: "Priorité nutritionnelle",
      information: "À documenter"
    };

    const actions = element.actions?.length
      ? element.actions.map(action => `<li>${esc(action)}</li>`).join("")
      : "<li>Aucune action automatique supplémentaire n'est proposée.</li>";

    return `
      <article class="pec-diabetes-item">
        <div class="pec-diabetes-item-head">
          <span class="pec-diabetes-rank">${index + 1}</span>
          <div>
            <h4>${esc(element.titre)}</h4>
            <span>${esc(niveaux[element.niveau] || "Priorité à valider")}</span>
          </div>
        </div>
        <p>${esc(element.detail)}</p>

        <div class="pec-diabetes-source">Déclencheur : ${esc(element.origine || "Analyse Dyslipidémie")}</div>

        <div class="pec-diabetes-objective">
          <strong>Objectif proposé</strong>
          <span>${esc(element.objectif)}</span>
        </div>
        <div class="pec-diabetes-section pec-diabetes-panel" style="margin-top:12px">
          <strong>Actions proposées</strong>
          <ul>${actions}</ul>
        </div>
        <div class="pec-diabetes-notice" style="margin-top:12px"><strong>Suivi :</strong> ${esc(element.suivi)}</div>
      </article>`;
  }

  function construireEducationNutritionnelleDyslipidemie(analyse, priorites) {
    const education = [];
    const codes = new Set(priorites.map(item => item.code));
    const ajouter = (code, titre, detail) => {
      if (education.some(item => item.code === code)) return;
      education.push({ code, titre, detail });
    };

    if (codes.has("profil-atherogene") || codes.has("ags")) {
      ajouter(
        "qualite-graisses",
        "Qualité des matières grasses",
        "Savoir distinguer les principales sources de graisses saturées et insaturées dans l'alimentation habituelle et comprendre l'intérêt de la substitution plutôt que de la suppression globale des lipides."
      );
      ajouter(
        "etiquettes",
        "Lecture pratique des étiquettes",
        "Apprendre à repérer les produits fréquemment contributeurs en graisses saturées et à comparer des alternatives réalistes, sans instaurer une liste rigide d'aliments interdits."
      );
    }

    if (
      codes.has("fibres") ||
      (codes.has("profil-atherogene") && analyse.nutrition?.fibresInsuffisantes === true)
    ) {
      ajouter(
        "fibres",
        "Fibres alimentaires",
        "Identifier des moyens concrets d'augmenter progressivement les fibres et savoir les répartir dans l'alimentation selon la tolérance digestive."
      );
    }

    if (codes.has("triglycerides")) {
      ajouter(
        "tg",
        "Comprendre les facteurs associés aux triglycérides",
        "Relier les habitudes réellement présentes au profil triglycéridique, notamment boissons sucrées, alcool lorsqu'il est consommé, qualité des glucides, équilibre énergétique et contexte métabolique."
      );
    }

    if (!education.length) {
      ajouter(
        "maintien",
        "Repères cardioprotecteurs",
        "Consolider une alimentation variée, riche en végétaux et fondée sur la qualité des matières grasses, en restant centrée sur les habitudes et objectifs du patient."
      );
    }

    return education;
  }

  function obtenirLibelleTraitementDyslipidemie(type) {
    return ({
      aucun: "Aucun traitement hypolipémiant renseigné",
      statine: "Statine",
      ezetimibe: "Ézétimibe",
      fibrate: "Fibrate",
      pcsk9: "Inhibiteur de PCSK9",
      bempedoique: "Acide bempédoïque",
      association: "Association de traitements",
      autre: "Autre traitement"
    })[type] || "Traitement non renseigné";
  }

  function construireTraitementsImplicationsDyslipidemie(analyse) {
    const traitement = analyse?.dyslipidemie?.traitement || {};
    const items = [];
    const type = traitement.type || "";
    const libelle = obtenirLibelleTraitementDyslipidemie(type);

    if (!type || type === "aucun") {
      items.push({
        titre: libelle,
        detail: "L'absence de traitement renseigné n'est pas interprétée comme une absence d'indication. NutriFlow ne propose ni initiation ni modification d'un traitement hypolipémiant."
      });
    } else {
      items.push({
        titre: libelle,
        detail: "Le traitement actuel est intégré comme contexte de suivi. La prise en charge nutritionnelle reste complémentaire et NutriFlow ne propose aucune initiation, substitution ni adaptation de dose."
      });
    }

    if (traitement.details) {
      items.push({
        titre: "Détails thérapeutiques renseignés",
        detail: traitement.details
      });
    }

    if (traitement.tolerance) {
      items.push({
        titre: "Tolérance renseignée",
        detail: traitement.tolerance
      });
    }

    if (traitement.observance) {
      items.push({
        titre: "Observance renseignée",
        detail: traitement.observance
      });
    }

    return items;
  }

  function construireVigilancesPriseEnChargeDyslipidemie(analyse) {
    const vigilances = [];
    const ajouter = (niveau, code, titre, detail) => {
      if (vigilances.some(item => item.code === code)) return;
      vigilances.push({ niveau, code, titre, detail });
    };

    const tg = analyse?.triglycerides || {};

    if (tg.statut === "severe") {
      ajouter(
        "haute",
        "tg-severe-pancreatite",
        "Hypertriglycéridémie sévère — risque de pancréatite",
        "À partir d’environ 880 mg/dL (≈10 mmol/L), le risque de pancréatite est cliniquement significatif. Une évaluation médicale prioritaire est nécessaire ; NutriFlow ne réduit pas cette situation à une intervention nutritionnelle isolée."
      );
    } else if (tg.statut === "tres_eleve") {
      ajouter(
        "haute",
        "tg-tres-eleves-pancreatite",
        "Triglycérides très élevés — vigilance pancréatique",
        "Entre environ 440 et 879 mg/dL (≈5–10 mmol/L), une pancréatite peut survenir. Une coordination médicale et un suivi biologique renforcés sont indiqués en complément de la prise en charge nutritionnelle."
      );
    }

    if (analyse.hf?.signal && analyse.hf?.statut !== "connue") {
      ajouter(
        "haute",
        "hf",
        "Possible hypercholestérolémie familiale",
        "Le profil doit conduire à une évaluation médicale spécifique ; NutriFlow ne transforme pas ce signal en diagnostic et ne remplace pas l'exploration familiale."
      );
    }

    if (analyse.lpA?.interpretable && analyse.lpA?.elevee) {
      ajouter(
        "moyenne",
        "lpa",
        "Lp(a) élevée",
        "La Lp(a) est un modificateur du risque cardiovasculaire. Le module ne crée pas de cible nutritionnelle spécifique destinée à la faire diminuer."
      );
    }

    if (analyse.ldl?.statut === "partiel") {
      ajouter(
        "moyenne",
        "ldl-partiel",
        "Objectif LDL-C partiellement évaluable",
        "La cible absolue est atteinte, mais la réduction relative ne peut pas être vérifiée sans LDL-C non traité documenté."
      );
    }

    if (analyse.ldl?.statut === "objectif_inconnu") {
      ajouter(
        "moyenne",
        "cible-ldl",
        "Objectif LDL-C non documenté",
        analyse.synthese?.diabete
          ? "Un diabète est présent et aucun niveau de risque / objectif LDL-C n'est renseigné. La catégorie de risque doit être établie dans le contexte clinique approprié ; NutriFlow ne calcule pas automatiquement SCORE2 ici."
          : "Le LDL-C ne doit pas être classé comme dans ou hors objectif sans catégorie de risque ou objectif individualisé renseigné."
      );
    }

    if (analyse.ldl?.statut === "non_evalue") {
      ajouter(
        "basse",
        "ldl-manquant",
        "LDL-C non évaluable",
        "Une donnée manquante n'est jamais assimilée à une valeur normale ; compléter le dossier si le résultat est disponible."
      );
    }

    const ordre = { haute: 1, moyenne: 2, basse: 3 };
    return vigilances.sort((a, b) => (ordre[a.niveau] || 9) - (ordre[b.niveau] || 9));
  }

  function construireSuiviGlobalDyslipidemie(analyse, priorites) {
    const suivi = [];
    const ajouter = texte => {
      if (texte && !suivi.includes(texte)) suivi.push(texte);
    };

    ajouter("Bilan lipidique et échéance du prochain contrôle selon le suivi médical prévu.");

    if (priorites.some(item => ["profil-atherogene", "ags", "fibres", "triglycerides"].includes(item.code))) {
      ajouter("Nouvelle anamnèse ciblée pour vérifier l'évolution des leviers alimentaires réellement travaillés.");
    }

    if (analyse?.triglycerides?.prioriteMedicale) {
      ajouter("Coordination médicale et contrôle biologique rapproché adaptés au niveau de triglycérides, en particulier pour la prévention du risque pancréatique.");
    }

    if (analyse?.dyslipidemie?.traitement?.type && analyse.dyslipidemie.traitement.type !== "aucun") {
      ajouter("Tolérance et observance du traitement hypolipémiant telles que rapportées par le patient.");
    }

    if (analyse?.ldl?.statut === "objectif_inconnu" || analyse?.ldl?.statut === "partiel") {
      ajouter("Complétude des données nécessaires à l'interprétation de l'objectif LDL-C.");
    }

    if (analyse?.synthese?.obesite) {
      ajouter("Coordination avec la prise en charge Obésité pour éviter les objectifs pondéraux redondants.");
    }

    return suivi;
  }

  function afficherPriseEnChargeDyslipidemie() {
    const conteneur = $("priseEnChargePathologies");
    if (!conteneur) return;

    let bloc = $("priseEnChargeDyslipidemie");
    const analyse = analyserDyslipidemie();

    if (!analyse) {
      bloc?.remove();

      const autrePriseEnCharge = conteneur.querySelector(
        ':scope > section:not(#priseEnChargeDyslipidemie), :scope > [id^="priseEnCharge"]:not(#priseEnChargeDyslipidemie)'
      );

      if (!autrePriseEnCharge) {
        let placeholder = conteneur.querySelector(":scope > .module-placeholder");
        if (!placeholder) {
          placeholder = document.createElement("div");
          placeholder.className = "module-placeholder";
          conteneur.appendChild(placeholder);
        }
        placeholder.innerHTML = `<h3>Prise en charge personnalisée</h3><p>Sélectionnez une pathologie dans l'onglet Patient pour afficher les propositions correspondantes.</p>`;
      }
      return;
    }

    conteneur.querySelectorAll(":scope > .module-placeholder").forEach(el => el.remove());

    if (!bloc) {
      bloc = document.createElement("div");
      bloc.id = "priseEnChargeDyslipidemie";
      conteneur.appendChild(bloc);
    }

    const priorites = construirePrioritesPriseEnChargeDyslipidemie(analyse);
    const education = construireEducationNutritionnelleDyslipidemie(analyse, priorites);
    const traitements = construireTraitementsImplicationsDyslipidemie(analyse);
    const vigilances = construireVigilancesPriseEnChargeDyslipidemie(analyse);
    const suiviGlobal = construireSuiviGlobalDyslipidemie(analyse, priorites);

    const prioritesHTML = priorites.length
      ? priorites.map(cartePriseEnChargeDyslipidemie).join("")
      : `<div class="pec-diabetes-empty">Aucune priorité nutritionnelle spécifique n'est générée avec les données actuellement renseignées. Les résultats biologiques restent interprétés dans l'onglet Analyse.</div>`;

    const educationHTML = education.length
      ? education.map(item => `
          <li>
            <strong>${esc(item.titre)}.</strong>
            ${esc(item.detail)}
          </li>`).join("")
      : `<li>Aucun axe éducatif supplémentaire n'est généré automatiquement.</li>`;

    const traitementsHTML = traitements.length
      ? traitements.map(item => `
          <li>
            <strong>${esc(item.titre)}.</strong>
            ${esc(item.detail)}
          </li>`).join("")
      : `<li>Aucune implication thérapeutique spécifique n'est générée.</li>`;

    const libellesVigilance = {
      haute: "Vigilance élevée",
      moyenne: "À surveiller",
      basse: "Information"
    };

    const vigilancesHTML = vigilances.length
      ? vigilances.map(item => `
          <li>
            <strong>${esc(item.titre)} — ${esc(libellesVigilance[item.niveau] || "À surveiller")}.</strong>
            ${esc(item.detail)}
          </li>`).join("")
      : `<li>Aucune vigilance de sécurité supplémentaire n'est générée à partir des données actuellement renseignées.</li>`;

    const typeLibelle = ({
      hypercholesterolemie: "Hypercholestérolémie",
      hypertriglyceridemie: "Hypertriglycéridémie",
      mixte: "Dyslipidémie mixte",
      familiale: "Hypercholestérolémie familiale",
      autre: "Autre profil"
    })[analyse.dyslipidemie?.type] || "Profil à préciser";

    bloc.innerHTML = `
      <section class="nutrition-calc-card pec-diabetes-card dyslip-pec-card">
        <div class="pec-diabetes-header">
          <div>
            <span class="pec-diabetes-kicker">DYSLIPIDÉMIE</span>
            <h3>Prise en charge — Dyslipidémie</h3>
            <p>${esc(typeLibelle)} · ${analyse.nutrition?.anamneseDisponible ? "Données alimentaires disponibles" : "Anamnèse alimentaire à compléter"}</p>
          </div>
          <span class="pec-diabetes-validation">À valider par le diététicien</span>
        </div>

        <div class="pec-diabetes-notice">
          Ce bloc transforme les constats de l'analyse Dyslipidémie en priorités, objectifs et actions individualisés. Il ne répète pas le bilan biologique brut et ne propose aucune initiation, substitution ni adaptation de traitement médicamenteux.
        </div>

        <div class="pec-diabetes-section">
          <div class="pec-diabetes-section-title">
            <h4>Priorités et objectifs proposés</h4>
            <span>Constat → objectif → actions → suivi</span>
          </div>
          <div class="pec-diabetes-grid">${prioritesHTML}</div>
        </div>

        <div class="pec-diabetes-two-columns">
          <div class="pec-diabetes-section pec-diabetes-panel">
            <div class="pec-diabetes-section-title">
              <h4>Éducation nutritionnelle</h4>
              <span>Compétences et autonomie à développer selon le profil</span>
            </div>
            <ul>${educationHTML}</ul>
          </div>

          <div class="pec-diabetes-section pec-diabetes-panel">
            <div class="pec-diabetes-section-title">
              <h4>Traitements et implications nutritionnelles</h4>
              <span>${esc(obtenirLibelleTraitementDyslipidemie(analyse.dyslipidemie?.traitement?.type))}</span>
            </div>
            <ul>${traitementsHTML}</ul>
          </div>
        </div>

        <div class="pec-diabetes-section pec-diabetes-panel dyslip-vigilances-panel">
          <div class="pec-diabetes-section-title">
            <h4>Vigilances</h4>
            <span>Situations à surveiller sans les transformer automatiquement en priorités nutritionnelles</span>
          </div>
          <ul>${vigilancesHTML}</ul>
        </div>

        <div class="pec-diabetes-section pec-diabetes-followup dyslip-followup-panel">
          <div class="pec-diabetes-section-title">
            <h4>Suivi global</h4>
            <span>Complète le suivi propre à chaque priorité</span>
          </div>
          <div class="pec-diabetes-followup-grid">
            ${suiviGlobal.map(item => `<span>${esc(item)}</span>`).join("")}
          </div>
        </div>

        <div class="dyslip-source-note">
          Références de travail : ESC/EAS 2019 ; Focused Update ESC/EAS 2025 ; OMS 2023 ; cours de diététique cardiovasculaire 2025-2026. Utilisation éducative/prototype ; vérifier les conditions de réutilisation des recommandations avant toute commercialisation.
        </div>
      </section>`;
  }

  global.dyslipidemieActive = dyslipidemieActive;
  global.convertirCholesterolVersMgDlDyslipidemie = convertirCholesterolVersMgDl;
  global.SEUILS_TG_ESC_MG_DL_DYSLIPIDEMIE = SEUILS_TG_ESC_MG_DL;
  global.convertirTriglyceridesVersMgDlDyslipidemie = convertirTriglyceridesVersMgDl;
  global.obtenirCibleLdlDyslipidemie = obtenirCibleLdl;
  global.evaluerLdlDyslipidemie = evaluerLdl;
  global.evaluerTriglyceridesDyslipidemie = evaluerTriglycerides;
  global.evaluerLpADyslipidemie = evaluerLpA;
  global.evaluerSuspicionHFDyslipidemie = evaluerSuspicionHF;
  global.analyserDyslipidemie = analyserDyslipidemie;
  global.actualiserDyslipidemie = actualiserDyslipidemie;
  global.afficherAnalyseDyslipidemie = afficherAnalyseDyslipidemie;
  global.afficherPriseEnChargeDyslipidemie = afficherPriseEnChargeDyslipidemie;
  global.construirePrioritesPriseEnChargeDyslipidemie = construirePrioritesPriseEnChargeDyslipidemie;
  global.construireEducationNutritionnelleDyslipidemie = construireEducationNutritionnelleDyslipidemie;
  global.construireTraitementsImplicationsDyslipidemie = construireTraitementsImplicationsDyslipidemie;
  global.construireVigilancesPriseEnChargeDyslipidemie = construireVigilancesPriseEnChargeDyslipidemie;
  global.construireSuiviGlobalDyslipidemie = construireSuiviGlobalDyslipidemie;
  global.detecterBoissonsGlucidiquesAnamneseDyslipidemie = detecterBoissonsGlucidiquesAnamnese;

  global.enregistrerModulePathologique?.({
    id: "dyslipidemie",
    champs: [
      "dyslipidemieType", "dyslipidemieDateDiagnostic", "dyslipidemieContexteDetails",
      "dyslipidemieRisqueCv", "dyslipidemieObjectifLdl", "dyslipidemieObjectifLdlUnite",
      "dyslipidemieLdlAvantTraitement", "dyslipidemieLdlAvantTraitementUnite",
      "dyslipidemieHfDiagnostiquee", "dyslipidemieEvenementCvFamilialPrecoce",
      "dyslipidemieContexteFamilialDetails", "dyslipidemieTraitement",
      "dyslipidemieTraitementDetails", "dyslipidemieToleranceTraitement",
      "dyslipidemieObservanceTraitement", "bioCholesterolTotal", "bioLdl", "bioHdl",
      "bioTriglycerides", "bioApoB", "bioLpA", "bioGlycemie", "bioHba1c", "bioTsh",
      "poids", "taille", "tourTaille", "boissons", "sportPratique"
    ],
    selecteurs: ['input[name="pathologies"][value="Dyslipidémie"]'],
    analyse: afficherAnalyseDyslipidemie,
    priseEnCharge: afficherPriseEnChargeDyslipidemie
  });

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelector('input[name="pathologies"][value="Dyslipidémie"]')
        ?.addEventListener("change", actualiserDyslipidemie);

      document.querySelectorAll(
        "#dyslipidemieDetails input, #dyslipidemieDetails select, #dyslipidemieDetails textarea, " +
        "#dyslipidemieTraitementGroupe input, #dyslipidemieTraitementGroupe select, #dyslipidemieTraitementGroupe textarea, " +
        ".biology-card input"
      ).forEach(element => {
        element.addEventListener("input", afficherResumeBiologieDyslipidemie);
        element.addEventListener("change", afficherResumeBiologieDyslipidemie);
      });

      $("dyslipidemieTraitement")?.addEventListener("change", synchroniserDetailsTraitementDyslipidemie);
      const placeholder = $("dyslipidemieTraitement")?.querySelector('option[value=""]');
      if (placeholder) { placeholder.textContent = "Choisir…"; placeholder.hidden = true; placeholder.disabled = true; }
      actualiserDyslipidemie();
    });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      CIBLES_LDL_ESC_MG_DL,
      CIBLES_NON_HDL_ESC_MG_DL,
      CIBLES_APOB_ESC_MG_DL,
      SEUILS_TG_ESC_MG_DL,
      convertirCholesterolVersMgDl,
      convertirTriglyceridesVersMgDl,
      convertirApoBVersMgDl,
      convertirLpAVersSeuil,
      obtenirCibleLdl,
      evaluerLdl,
      evaluerTriglycerides,
      evaluerNonHdl,
      evaluerApoB,
      evaluerSuspicionHF,
      evaluerNutritionDyslipidemie,
      DEFINITIONS_LIPIDES_ANAMNESE,
      analyserNutrimentAnamnese,
      detecterBoissonsGlucidiquesAnamnese,
      construirePrioritesPriseEnChargeDyslipidemie,
      construireEducationNutritionnelleDyslipidemie,
      construireTraitementsImplicationsDyslipidemie,
      construireVigilancesPriseEnChargeDyslipidemie,
      construireSuiviGlobalDyslipidemie
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
