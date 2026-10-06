/* Fonctions principales */

// IMC

function calculerIMCPatient() {
  const poids = getNombrePatient("poids");
  const tailleCm = getNombrePatient("taille");
  return calculerIMCDenutrition(poids, tailleCm);
}

function calculerIMCDenutrition(poids, tailleCm) {
  if (!estNombre(poids) || !estNombre(tailleCm) || poids <= 0 || tailleCm <= 0) {
    return null;
  }
  const tailleM = tailleCm / 100;
  return poids / (tailleM * tailleM);
}

// Contrat de données commun HAS / GLIM. Lorsque des données sont fournies
// (notamment par SynthesePatient), les moteurs n'ont plus besoin de relire le DOM.
// Sans argument, le comportement historique reste disponible pour l'interface.
function obtenirDonneesEvaluationDenutrition(donnees = null) {
  if (donnees && typeof donnees === "object") {
    const poidsActuel = estNombre(donnees.poidsActuel) ? donnees.poidsActuel : null;
    const tailleCm = estNombre(donnees.tailleCm) ? donnees.tailleCm : null;
    return {
      age: estNombre(donnees.age) ? donnees.age : null,
      poidsActuel,
      tailleCm,
      imc: estNombre(donnees.imc) ? donnees.imc : calculerIMCDenutrition(poidsActuel, tailleCm),
      poidsHabituel: estNombre(donnees.poidsHabituel) ? donnees.poidsHabituel : null,
      poids1Mois: estNombre(donnees.poids1Mois) ? donnees.poids1Mois : null,
      poids6Mois: estNombre(donnees.poids6Mois) ? donnees.poids6Mois : null,
      albumine: estNombre(donnees.albumine) ? donnees.albumine : null,
      masseMusculaireReduite: donnees.masseMusculaireReduite === true,
      sarcopenieConfirmee: donnees.sarcopenieConfirmee === true,
      reductionApports: String(donnees.reductionApports ?? ""),
      dureeReduction: String(donnees.dureeReduction ?? ""),
      malabsorption: donnees.malabsorption === true,
      agression: donnees.agression === true
    };
  }

  const poidsActuel = getNombrePatient("poids");
  const tailleCm = getNombrePatient("taille");
  return {
    age: getNombrePatient("age"),
    poidsActuel,
    tailleCm,
    imc: calculerIMCDenutrition(poidsActuel, tailleCm),
    poidsHabituel: getNombrePatient("denutPoidsHabituel"),
    poids1Mois: getNombrePatient("denutPoids1Mois"),
    poids6Mois: getNombrePatient("denutPoids6Mois"),
    albumine: getNombrePatient("denutAlbumine"),
    masseMusculaireReduite: document.getElementById("denutMasseMusculaire")?.checked ?? false,
    sarcopenieConfirmee: document.getElementById("denutSarcopenieConfirmee")?.checked ?? false,
    reductionApports: document.getElementById("denutReductionApports")?.value ?? "",
    dureeReduction: document.getElementById("denutDureeReduction")?.value ?? "",
    malabsorption: document.getElementById("denutMalabsorption")?.checked ?? false,
    agression: document.getElementById("denutAgression")?.checked ?? false
  };
}

// AFFICHAGE PERTES

function afficherPourcentagePerte(id, valeur) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = estNombre(valeur) ? `${valeur.toFixed(1)} %` : "—";
}

// AGE

function adapterEvaluationNutritionnelleAge() {
  const age = getNombrePatient("age");
  const groupeMuscle = document.getElementById("denutMasseMusculaireGroupe");
  const groupeSarcopenie = document.getElementById("denutSarcopenieGroupe");
  const muscle = document.getElementById("denutMasseMusculaire");
  const sarcopenie = document.getElementById("denutSarcopenieConfirmee");
  if (!groupeMuscle || !groupeSarcopenie) return;
  const senior = estNombre(age) && age >= 70;
  groupeMuscle.hidden = senior;
  groupeSarcopenie.hidden = !senior;
  if (senior && muscle) muscle.checked = false;
  if (!senior && sarcopenie) sarcopenie.checked = false;
}

// HAS — PERTE DE POIDS

function evaluerPertePoidsHAS({
  perte1Mois,
  perte6Mois,
  perteHabituel
}) {
  const criteres = [];

  // 1 MOIS

  if (estNombre(perte1Mois) && perte1Mois >= 5) {
    criteres.push({
      code: "perte1Mois",
      valeur: perte1Mois,
      label: `Perte de poids à 1 mois : ${perte1Mois.toFixed(1)} %`
    });
  }

  // 6 MOIS

  if (estNombre(perte6Mois) && perte6Mois >= 10) {
    criteres.push({
      code: "perte6Mois",
      valeur: perte6Mois,
      label: `Perte de poids à 6 mois : ${perte6Mois.toFixed(1)} %`
    });
  }

  // POIDS HABITUEL

  if (estNombre(perteHabituel) && perteHabituel >= 10) {
    criteres.push({
      code: "perteHabituel",
      valeur: perteHabituel,
      label: `Perte par rapport au poids habituel : ${perteHabituel.toFixed(1)} %`
    });
  }
  return criteres;
}
function evaluerPhenotypeHAS({
  age,
  imc,
  perte1Mois,
  perte6Mois,
  perteHabituel,
  masseMusculaireReduite = false,
  sarcopenieConfirmee = false
}) {

  // PERTE DE POIDS

  const criteres = evaluerPertePoidsHAS({
    perte1Mois,
    perte6Mois,
    perteHabituel
  });

  // IMC — 18-69 ANS

  if (age >= 18 && age < 70) {
    if (estInferieur(imc, 18.5)) {
      criteres.push({
        code: "imc",
        label: `IMC < 18,5 kg/m² (${imc.toFixed(1)})`
      });
    }
    if (masseMusculaireReduite) {
      criteres.push({
        code: "muscle",
        label: "Réduction quantifiée de la masse et/ou de la fonction musculaire"
      });
    }
  }

  // IMC — ≥ 70 ANS

  if (age >= 70) {
    if (estInferieur(imc, 22)) {
      criteres.push({
        code: "imc",
        label: `IMC < 22 kg/m² (${imc.toFixed(1)})`
      });
    }
    if (sarcopenieConfirmee) {
      criteres.push({
        code: "sarcopenie",
        label: "Sarcopénie confirmée"
      });
    }
  }
  return criteres;
}

// HAS — ETIOLOGIE

function evaluerEtiologieHAS(donnees = null) {
  const criteres = [];
  const source = obtenirDonneesEvaluationDenutrition(donnees);
  const reduction = source.reductionApports;
  const duree = source.dureeReduction;
  const malabsorption = source.malabsorption;
  const agression = source.agression;
  const reduction50 = ["plus50", "50plus"].includes(reduction);
  const reductionPresente = reduction !== "" && reduction !== "aucune";
  const plusUneSemaine = ["plus1semaine", "plus1", "plus2semaines", "plus2"].includes(duree);
  const plusDeuxSemaines = ["plus2semaines", "plus2"].includes(duree);
  if (reduction50 && plusUneSemaine || reductionPresente && plusDeuxSemaines) {
    criteres.push({
      code: "apports",
      label: "Réduction significative ou prolongée des apports alimentaires"
    });
  }
  if (malabsorption) {
    criteres.push({
      code: "malabsorption",
      label: "Absorption réduite / maldigestion / malabsorption"
    });
  }
  if (agression) {
    criteres.push({
      code: "agression",
      label: "Situation d'agression / hypercatabolisme"
    });
  }
  return criteres;
}

// HAS — DIAGNOSTIC

function evaluerDiagnosticHAS(donnees) {
  const phenotype = evaluerPhenotypeHAS(donnees);
  const etiologie = evaluerEtiologieHAS(donnees);
  return {
    diagnostic: phenotype.length > 0 && etiologie.length > 0,
    phenotype,
    etiologie
  };
}

// HAS — SEVERITE 18-69 ANS

function evaluerSeveriteAdulteHAS({
  imc,
  perte1Mois,
  perte6Mois,
  perteHabituel,
  albumine
}) {
  const severe = [];
  const moderee = [];
  if (estNombre(imc) && imc <= 17) {
    severe.push("IMC ≤ 17 kg/m²");
  }
  if (estAuMoins(perte1Mois, 10)) {
    severe.push("Perte ≥ 10 % en 1 mois");
  }
  if (estAuMoins(perte6Mois, 15)) {
    severe.push("Perte ≥ 15 % en 6 mois");
  }
  if (estAuMoins(perteHabituel, 15)) {
    severe.push("Perte ≥ 15 % par rapport au poids habituel");
  }
  if (estNombre(albumine) && albumine <= 30) {
    severe.push("Albuminémie ≤ 30 g/L");
  }
  if (estNombre(imc) && imc > 17 && imc < 18.5) {
    moderee.push("17 < IMC < 18,5 kg/m²");
  }
  if (estNombre(perte1Mois) && perte1Mois >= 5 && perte1Mois < 10) {
    moderee.push("Perte entre 5 et 10 % en 1 mois");
  }
  if (estNombre(perte6Mois) && perte6Mois >= 10 && perte6Mois < 15) {
    moderee.push("Perte entre 10 et 15 % en 6 mois");
  }
  if (estNombre(perteHabituel) && perteHabituel >= 10 && perteHabituel < 15) {
    moderee.push("Perte entre 10 et 15 % par rapport au poids habituel");
  }
  if (estNombre(albumine) && albumine > 30 && albumine < 35) {
    moderee.push("Albuminémie entre 30 et 35 g/L");
  }
  if (severe.length > 0) {
    return {
      niveau: "severe",
      label: "Dénutrition sévère",
      criteres: severe
    };
  }
  if (moderee.length > 0) {
    return {
      niveau: "moderee",
      label: "Dénutrition modérée",
      criteres: moderee
    };
  }
  return {
    niveau: "indeterminee",
    label: "Sévérité non déterminée",
    criteres: []
  };
}

// HAS — SEVERITE ≥ 70 ANS

function evaluerSeveriteSeniorHAS({
  imc,
  perte1Mois,
  perte6Mois,
  perteHabituel,
  albumine
}) {
  const severe = [];
  const moderee = [];
  if (estNombre(imc) && imc < 20) {
    severe.push("IMC < 20 kg/m²");
  }
  if (estAuMoins(perte1Mois, 10)) {
    severe.push("Perte ≥ 10 % en 1 mois");
  }
  if (estAuMoins(perte6Mois, 15)) {
    severe.push("Perte ≥ 15 % en 6 mois");
  }
  if (estAuMoins(perteHabituel, 15)) {
    severe.push("Perte ≥ 15 % par rapport au poids habituel");
  }
  if (estNombre(albumine) && albumine <= 30) {
    severe.push("Albuminémie ≤ 30 g/L");
  }
  if (estNombre(imc) && imc >= 20 && imc < 22) {
    moderee.push("20 ≤ IMC < 22 kg/m²");
  }
  if (estNombre(perte1Mois) && perte1Mois >= 5 && perte1Mois < 10) {
    moderee.push("Perte entre 5 et 10 % en 1 mois");
  }
  if (estNombre(perte6Mois) && perte6Mois >= 10 && perte6Mois < 15) {
    moderee.push("Perte entre 10 et 15 % en 6 mois");
  }
  if (estNombre(perteHabituel) && perteHabituel >= 10 && perteHabituel < 15) {
    moderee.push("Perte entre 10 et 15 % par rapport au poids habituel");
  }
  if (estNombre(albumine) && albumine >= 30) {
    moderee.push("Albuminémie ≥ 30 g/L");
  }
  if (severe.length > 0) {
    return {
      niveau: "severe",
      label: "Dénutrition sévère",
      criteres: severe
    };
  }
  if (moderee.length > 0) {
    return {
      niveau: "moderee",
      label: "Dénutrition modérée",
      criteres: moderee
    };
  }
  return {
    niveau: "indeterminee",
    label: "Sévérité non déterminée",
    criteres: []
  };
}

// HAS — COMPLETUDE

function evaluerCompletudeHAS(donnees = null) {
  const source = obtenirDonneesEvaluationDenutrition(donnees);
  const age = source.age;
  const poids = source.poidsActuel;
  const taille = source.tailleCm;
  const poidsHabituel = source.poidsHabituel;
  const poids1Mois = source.poids1Mois;
  const poids6Mois = source.poids6Mois;
  const reduction = source.reductionApports;
  const duree = source.dureeReduction;
  const manquants = [];

  // AGE

  if (!estNombre(age) || age < 18) {
    manquants.push("âge");
  }

  // IMC

  if (!poidsValide(poids) || !estNombre(taille) || taille <= 0) {
    manquants.push("poids actuel et taille");
  }

  // EVOLUTION PONDERALE

  const auMoinsUnPoidsReference = poidsValide(poidsHabituel) || poidsValide(poids1Mois) || poidsValide(poids6Mois);
  if (!auMoinsUnPoidsReference) {
    manquants.push("au moins un poids antérieur");
  }

  // APPORTS

  if (reduction === "") {
    manquants.push("réduction des apports");
  }

  // DUREE

  if (reduction !== "" && reduction !== "aucune" && duree === "") {
    manquants.push("durée de la réduction des apports");
  }
  return {
    complete: manquants.length === 0,
    manquants
  };
}

// HAS — MOTEUR

function evaluerDenutritionHAS(donneesEntree = null) {
  const source = obtenirDonneesEvaluationDenutrition(donneesEntree);
  const age = source.age;
  const poidsActuel = source.poidsActuel;
  const poidsHabituel = source.poidsHabituel;
  const poids1Mois = source.poids1Mois;
  const poids6Mois = source.poids6Mois;
  const albumine = source.albumine;
  const imc = source.imc;
  const completude = evaluerCompletudeHAS(source);
  if (!estNombre(age) || age < 18) {
    return null;
  }
  const perte1Mois = calculerPertePoids(poids1Mois, poidsActuel);
  const perte6Mois = calculerPertePoids(poids6Mois, poidsActuel);
  const perteHabituel = calculerPertePoids(poidsHabituel, poidsActuel);
  const donnees = {
    age,
    imc,
    perte1Mois,
    perte6Mois,
    perteHabituel,
    albumine,
    masseMusculaireReduite: source.masseMusculaireReduite,
    sarcopenieConfirmee: source.sarcopenieConfirmee,
    reductionApports: source.reductionApports,
    dureeReduction: source.dureeReduction,
    malabsorption: source.malabsorption,
    agression: source.agression
  };
  const evaluation = evaluerDiagnosticHAS(donnees);
  if (!evaluation.diagnostic) {
    return {
      ...donnees,
      diagnostic: false,
      phenotype: evaluation.phenotype,
      etiologie: evaluation.etiologie,
      severite: null,
      completude
    };
  }
  const severite = age < 70 ? evaluerSeveriteAdulteHAS(donnees) : evaluerSeveriteSeniorHAS(donnees);
  return {
    ...donnees,
    diagnostic: true,
    phenotype: evaluation.phenotype,
    etiologie: evaluation.etiologie,
    severite,
    completude
  };
}

// PATIENT — EVALUATION

// HAS — DETAILS

function afficherDetailsHAS(resultat, conteneur) {
  if (!resultat || !conteneur) return;
  const phenotypeHTML = resultat.phenotype.length > 0 ? resultat.phenotype.map(critere => `<li>${critere.label}</li>`).join("") : "<li>Aucun critère phénotypique identifié</li>";
  const etiologieHTML = resultat.etiologie.length > 0 ? resultat.etiologie.map(critere => `<li>${critere.label}</li>`).join("") : "<li>Aucun critère étiologique identifié</li>";
  let severiteHTML = "";
  if (resultat.diagnostic && resultat.severite) {
    const criteresSeverite = resultat.severite.criteres.length > 0 ? resultat.severite.criteres.map(critere => `<li>${critere}</li>`).join("") : "<li>Aucun critère de sévérité supplémentaire renseigné</li>";
    severiteHTML = `
            <div>
                <h5>Sévérité</h5>
                <strong>${resultat.severite.label}</strong>
                <ul>${criteresSeverite}</ul>
            </div>
        `;
  }
  conteneur.innerHTML = `
        <div>
            <h5>Critères phénotypiques</h5>
            <ul>${phenotypeHTML}</ul>
        </div>

        <div>
            <h5>Critères étiologiques</h5>
            <ul>${etiologieHTML}</ul>
        </div>

        ${severiteHTML}
    `;
  conteneur.hidden = false;
}

// HAS — AFFICHAGE

function afficherEvaluationNutritionnelleHAS() {
  const alerte = document.getElementById("denutAlerte");
  const badge = document.getElementById("denutHASBadge");
  const details = document.getElementById("denutHASDetails");
  if (!alerte || !badge || !details) return;

  const resultat = evaluerDenutritionHAS();

  alerte.classList.remove("neutral", "ok", "warning", "danger");
  badge.className = "nutrition-evaluation-badge";
  details.hidden = true;
  details.innerHTML = "";

  // NON ÉVALUABLE : âge absent / hors périmètre adulte
  if (!resultat) {
    badge.classList.add("neutral");
    badge.textContent = "Non évalué";
    alerte.classList.add("neutral");
    alerte.innerHTML = `
      <strong>Évaluation en attente</strong>
      <span>Renseignez au minimum l'âge du patient pour démarrer l'évaluation.</span>
    `;
    return;
  }

  // DIAGNOSTIC POSITIF : la présence d'un couple phénotype + étiologie suffit.
  // Des données secondaires manquantes ne doivent pas annuler un diagnostic déjà établi.
  if (resultat.diagnostic === true) {
    const severite = resultat.severite?.label ?? "Dénutrition identifiée";
    const classeSeverite = resultat.severite?.niveau === "severe" ? "danger" : "warning";
    badge.classList.add(classeSeverite);
    badge.textContent = severite;
    alerte.classList.add(classeSeverite);
    alerte.innerHTML = `
      <strong>${severite}</strong>
      <span>Les critères diagnostiques HAS sont réunis.</span>
    `;
    afficherDetailsHAS(resultat, details);
    return;
  }

  const criteresPresents =
    resultat.phenotype.length > 0 ||
    resultat.etiologie.length > 0;

  // CRITÈRES PARTIELS : on les montre même si d'autres données sont absentes.
  if (criteresPresents) {
    badge.classList.add("warning");
    badge.textContent = "À approfondir";
    alerte.classList.add("warning");

    const complement = resultat.completude?.complete === false && resultat.completude.manquants?.length
      ? ` Données encore à compléter : ${resultat.completude.manquants.join(", ")}.`
      : "";

    alerte.innerHTML = `
      <strong>Évaluation nutritionnelle à approfondir</strong>
      <span>Certains critères sont présents, mais les critères diagnostiques HAS ne sont pas actuellement réunis.${complement}</span>
    `;
    afficherDetailsHAS(resultat, details);
    return;
  }

  // AUCUN CRITÈRE + DONNÉES INCOMPLÈTES : ne jamais produire de fausse réassurance.
  if (resultat.completude?.complete === false) {
    const manquants = resultat.completude.manquants ?? [];
    badge.classList.add("neutral");
    badge.textContent = "Incomplet";
    alerte.classList.add("neutral");
    alerte.innerHTML = `
      <strong>Évaluation HAS incomplète</strong>
      <span>${manquants.length ? `Données à compléter : ${manquants.join(", ")}.` : "Les données disponibles ne permettent pas encore de conclure."}</span>
    `;
    return;
  }

  // AUCUN CRITÈRE uniquement lorsque l'évaluation minimale est complète.
  badge.classList.add("ok");
  badge.textContent = "Aucun critère";
  alerte.classList.add("ok");
  alerte.innerHTML = `
    <strong>Aucun critère de dénutrition identifié</strong>
    <span>Aucun critère diagnostique HAS n'est retrouvé dans les données actuellement évaluées.</span>
  `;
}


// GLIM — EVALUATION COMPLEMENTAIRE

let denutGLIMOuvert = false;

function evaluerPhenotypeGLIM({
  age,
  imc,
  perte1Mois,
  perte6Mois,
  masseMusculaireReduite = false,
  sarcopenieConfirmee = false
}) {
  const criteres = [];

  const pertesDans6Mois = [
    perte1Mois,
    perte6Mois
  ].filter(estNombre);

  const perteMaxDans6Mois =
    pertesDans6Mois.length > 0
      ? Math.max(...pertesDans6Mois)
      : null;

  if (
    estNombre(perteMaxDans6Mois) &&
    perteMaxDans6Mois > 5
  ) {
    criteres.push({
      code: "perte-poids",
      label: `Perte de poids > 5 % au cours des 6 derniers mois (${perteMaxDans6Mois.toFixed(1)} %)`
    });
  }

  if (
    estNombre(age) &&
    estNombre(imc)
  ) {
    const seuilImc =
      age < 70
        ? 20
        : 22;

    if (
      imc < seuilImc
    ) {
      criteres.push({
        code: "imc",
        label: `IMC bas selon GLIM : ${imc.toFixed(1)} kg/m² (< ${seuilImc} kg/m²)`
      });
    }
  }

  if (
    estNombre(age) &&
    age < 70 &&
    masseMusculaireReduite
  ) {
    criteres.push({
      code: "muscle",
      label: "Réduction quantifiée de la masse musculaire"
    });
  }

  if (
    estNombre(age) &&
    age >= 70 &&
    sarcopenieConfirmee
  ) {
    criteres.push({
      code: "muscle",
      label: "Réduction de la masse musculaire documentée par la sarcopénie confirmée"
    });
  }

  return criteres;
}

function evaluerEtiologieGLIM(donnees = null) {
  const criteres = [];
  const source = obtenirDonneesEvaluationDenutrition(donnees);

  const reduction = source.reductionApports;
  const duree = source.dureeReduction;
  const malabsorption = source.malabsorption;
  const agression = source.agression;

  const reduction50 =
    ["plus50", "50plus"].includes(
      reduction
    );

  const reductionPresente =
    reduction !== "" &&
    reduction !== "aucune";

  const plusUneSemaine =
    [
      "plus1semaine",
      "plus1",
      "plus2semaines",
      "plus2"
    ].includes(
      duree
    );

  const plusDeuxSemaines =
    [
      "plus2semaines",
      "plus2"
    ].includes(
      duree
    );

  if (
    reduction50 &&
    plusUneSemaine ||
    reductionPresente &&
    plusDeuxSemaines
  ) {
    criteres.push({
      code: "apports",
      label: "Réduction des apports alimentaires répondant au critère étiologique GLIM"
    });
  }

  if (
    malabsorption
  ) {
    criteres.push({
      code: "malabsorption",
      label: "Réduction de l'assimilation / malabsorption"
    });
  }

  if (
    agression
  ) {
    criteres.push({
      code: "inflammation",
      label: "Charge morbide / situation d'agression ou inflammation"
    });
  }

  return criteres;
}

function evaluerSeveriteGLIM({
  age,
  imc,
  perte1Mois,
  perte6Mois
}) {
  const severe = [];
  const moderee = [];

  const pertesDans6Mois = [
    perte1Mois,
    perte6Mois
  ].filter(estNombre);

  const perteMaxDans6Mois =
    pertesDans6Mois.length > 0
      ? Math.max(...pertesDans6Mois)
      : null;

  if (
    estNombre(perteMaxDans6Mois) &&
    perteMaxDans6Mois > 10
  ) {
    severe.push(
      `Perte de poids > 10 % au cours des 6 derniers mois (${perteMaxDans6Mois.toFixed(1)} %)`
    );
  } else if (
    estNombre(perteMaxDans6Mois) &&
    perteMaxDans6Mois >= 5
  ) {
    moderee.push(
      `Perte de poids entre 5 et 10 % au cours des 6 derniers mois (${perteMaxDans6Mois.toFixed(1)} %)`
    );
  }

  if (
    estNombre(age) &&
    estNombre(imc)
  ) {
    const seuilSevere =
      age < 70
        ? 18.5
        : 20;

    const seuilModere =
      age < 70
        ? 20
        : 22;

    if (
      imc < seuilSevere
    ) {
      severe.push(
        `IMC < ${seuilSevere} kg/m² (${imc.toFixed(1)})`
      );
    } else if (
      imc < seuilModere
    ) {
      moderee.push(
        `IMC < ${seuilModere} kg/m² (${imc.toFixed(1)})`
      );
    }
  }

  if (
    severe.length > 0
  ) {
    return {
      niveau: "severe",
      label: "GLIM — stade 2 / sévère",
      criteres: severe
    };
  }

  if (
    moderee.length > 0
  ) {
    return {
      niveau: "moderee",
      label: "GLIM — stade 1 / modérée",
      criteres: moderee
    };
  }

  return {
    niveau: "indeterminee",
    label: "Sévérité GLIM non déterminée avec les données disponibles",
    criteres: []
  };
}

function evaluerDenutritionGLIM(donneesEntree = null) {
  const source = obtenirDonneesEvaluationDenutrition(donneesEntree);
  const age = source.age;
  const poidsActuel = source.poidsActuel;
  const poids1Mois = source.poids1Mois;
  const poids6Mois = source.poids6Mois;
  const imc = source.imc;

  if (
    !estNombre(age) ||
    age < 18
  ) {
    return null;
  }

  const perte1Mois =
    calculerPertePoids(
      poids1Mois,
      poidsActuel
    );

  const perte6Mois =
    calculerPertePoids(
      poids6Mois,
      poidsActuel
    );

  const donnees = {
    age,
    imc,
    perte1Mois,
    perte6Mois,
    masseMusculaireReduite: source.masseMusculaireReduite,
    sarcopenieConfirmee: source.sarcopenieConfirmee,
    reductionApports: source.reductionApports,
    dureeReduction: source.dureeReduction,
    malabsorption: source.malabsorption,
    agression: source.agression
  };

  const phenotype =
    evaluerPhenotypeGLIM(
      donnees
    );

  const etiologie =
    evaluerEtiologieGLIM(donnees);

  const diagnostic =
    phenotype.length > 0 &&
    etiologie.length > 0;

  const severite =
    diagnostic
      ? evaluerSeveriteGLIM(
          donnees
        )
      : null;

  return {
    ...donnees,
    diagnostic,
    phenotype,
    etiologie,
    severite
  };
}

function comparerHASGLIM(
  resultatHAS,
  resultatGLIM
) {
  if (
    !resultatHAS ||
    !resultatGLIM
  ) {
    return "Comparaison non disponible.";
  }

  if (
    resultatHAS.diagnostic ===
    resultatGLIM.diagnostic
  ) {
    if (
      !resultatHAS.diagnostic
    ) {
      return "HAS et GLIM ne retiennent pas actuellement de diagnostic avec les données disponibles.";
    }

    if (
      resultatHAS.severite?.niveau ===
      resultatGLIM.severite?.niveau
    ) {
      return `Concordance HAS / GLIM : diagnostic retenu avec une sévérité ${resultatHAS.severite?.niveau === "severe" ? "sévère" : "modérée"}.`;
    }

    return "Le diagnostic est retenu par HAS et GLIM, mais la gradation de la sévérité diffère selon les seuils propres à chaque référentiel.";
  }

  if (
    resultatHAS.diagnostic
  ) {
    return "Le diagnostic est retenu selon HAS mais pas selon GLIM avec les données actuellement disponibles.";
  }

  return "Le diagnostic est retenu selon GLIM mais pas selon HAS avec les données actuellement disponibles.";
}

function initialiserEvaluationGLIM() {
  const section =
    document.getElementById(
      "hasSection"
    );

  if (
    !section ||
    document.getElementById(
      "denutGLIMComplement"
    )
  ) {
    return;
  }

  const bloc =
    document.createElement(
      "div"
    );

  bloc.id =
    "denutGLIMComplement";

  bloc.className =
    "nutrition-status-section";

  bloc.innerHTML = `
    <div class="nutrition-screening-panel">
      <div class="nutrition-screening-copy">
        <span class="nutrition-evaluation-type">Référentiel complémentaire</span>
        <strong>Évaluation GLIM</strong>
        <span>Lecture comparative internationale à partir des données déjà renseignées.</span>
      </div>

      <button
        type="button"
        class="nutrition-screening-button"
        id="denutGLIMToggle"
        aria-expanded="false"
      >
        Voir l'évaluation GLIM
      </button>
    </div>

    <div
      class="nutrition-evaluation-details"
      id="denutGLIMDetails"
      hidden
    ></div>
  `;

  section.appendChild(
    bloc
  );

  document
    .getElementById(
      "denutGLIMToggle"
    )
    ?.addEventListener(
      "click",
      basculerEvaluationGLIM
    );
}

function afficherEvaluationGLIM() {
  initialiserEvaluationGLIM();

  const bouton =
    document.getElementById(
      "denutGLIMToggle"
    );

  const details =
    document.getElementById(
      "denutGLIMDetails"
    );

  if (
    !bouton ||
    !details
  ) {
    return;
  }

  bouton.setAttribute(
    "aria-expanded",
    String(denutGLIMOuvert)
  );

  bouton.textContent =
    denutGLIMOuvert
      ? "Masquer l'évaluation GLIM"
      : "Voir l'évaluation GLIM";

  if (
    !denutGLIMOuvert
  ) {
    details.hidden = true;
    details.innerHTML = "";
    return;
  }

  const resultatGLIM =
    evaluerDenutritionGLIM();

  const resultatHAS =
    evaluerDenutritionHAS();

  if (
    !resultatGLIM
  ) {
    details.hidden = false;
    details.innerHTML = `
      <div>
        <h5>Évaluation GLIM</h5>
        <p>Les données disponibles ne permettent pas actuellement une évaluation GLIM.</p>
      </div>
    `;
    return;
  }

  const phenotypeHTML =
    resultatGLIM.phenotype.length > 0
      ? resultatGLIM.phenotype
          .map(
            critere =>
              `<li>${critere.label}</li>`
          )
          .join("")
      : "<li>Aucun critère phénotypique GLIM identifié</li>";

  const etiologieHTML =
    resultatGLIM.etiologie.length > 0
      ? resultatGLIM.etiologie
          .map(
            critere =>
              `<li>${critere.label}</li>`
          )
          .join("")
      : "<li>Aucun critère étiologique GLIM identifié</li>";

  const severiteHTML =
    resultatGLIM.diagnostic &&
    resultatGLIM.severite
      ? `
          <div>
            <h5>Sévérité GLIM</h5>
            <strong>${resultatGLIM.severite.label}</strong>
            ${
              resultatGLIM.severite.criteres.length > 0
                ? `<ul>${resultatGLIM.severite.criteres.map(critere => `<li>${critere}</li>`).join("")}</ul>`
                : `<p>La réduction musculaire est disponible comme critère diagnostique, mais sa sévérité n'est pas quantifiée dans les données actuelles.</p>`
            }
          </div>
        `
      : "";

  const comparaison =
    comparerHASGLIM(
      resultatHAS,
      resultatGLIM
    );

  details.hidden = false;

  details.innerHTML = `
    <div>
      <h5>Conclusion GLIM</h5>
      <strong>
        ${
          resultatGLIM.diagnostic
            ? "Critères diagnostiques GLIM réunis"
            : "Critères diagnostiques GLIM non réunis"
        }
      </strong>
      <p>
        Le diagnostic GLIM nécessite au moins un critère phénotypique et un critère étiologique.
      </p>
    </div>

    <div>
      <h5>Critères phénotypiques GLIM</h5>
      <ul>${phenotypeHTML}</ul>
    </div>

    <div>
      <h5>Critères étiologiques GLIM</h5>
      <ul>${etiologieHTML}</ul>
    </div>

    ${severiteHTML}

    <div>
      <h5>Comparaison avec le référentiel principal HAS</h5>
      <p>${comparaison}</p>
    </div>

    <div>
      <small>
        GLIM est affiché ici comme référentiel complémentaire. Le poids habituel n'est pas utilisé automatiquement pour la gradation GLIM lorsque la durée de la perte au-delà de 6 mois n'est pas documentée.
      </small>
    </div>
  `;
}

function basculerEvaluationGLIM() {
  denutGLIMOuvert =
    !denutGLIMOuvert;

  afficherEvaluationGLIM();
}


// RECOMMANDATIONS — DETAILS

function genererDetailsDenutrition(resultat) {
  const phenotypeHTML = resultat.phenotype.length > 0 ? resultat.phenotype.map(critere => `<li>${critere.label}</li>`).join("") : "<li>Aucun critère phénotypique identifié.</li>";
  const etiologieHTML = resultat.etiologie.length > 0 ? resultat.etiologie.map(critere => `<li>${critere.label}</li>`).join("") : "<li>Aucun critère étiologique identifié.</li>";
  const severiteHTML = resultat.diagnostic && resultat.severite ? `
            <div class="nutrition-recommendation-section">
                <h4>Sévérité</h4>
                <p><strong>${resultat.severite.label}</strong></p>
                ${resultat.severite.criteres.length > 0 ? `
                            <ul>
                                ${resultat.severite.criteres.map(critere => `<li>${critere}</li>`).join("")}
                            </ul>
                        ` : ""}
            </div>
        ` : "";
  return `
        <div class="nutrition-recommendation-section">
            <h4>Critères phénotypiques</h4>
            <ul>${phenotypeHTML}</ul>
        </div>

        <div class="nutrition-recommendation-section">
            <h4>Critères étiologiques</h4>
            <ul>${etiologieHTML}</ul>
        </div>

        ${severiteHTML}
    `;
}

// RECOMMANDATIONS — DENUTRITION

function afficherDenutritionDansRecommandations() {
  const badge = document.getElementById("recommandationDenutritionBadge");
  const contenu = document.getElementById("recommandationDenutritionContenu");
  if (!badge || !contenu) return;

  const section = contenu.closest("section");
  const resultat = evaluerDenutritionHAS();

  if (resultat?.diagnostic !== true) {
    if (section) section.hidden = true;
    return;
  }

  if (section) section.hidden = false;
  badge.className = "nutrition-recommendation-badge";
  if (!resultat) {
    badge.classList.add("neutral");
    badge.textContent = "Non évalué";
    contenu.innerHTML = "<p>Complétez l’état nutritionnel du patient pour afficher l’évaluation.</p>";
    return;
  }
  if (resultat.phenotype.length === 0 && resultat.etiologie.length === 0) {
    badge.classList.add("ok");
    badge.textContent = "Aucun critère";
    contenu.innerHTML = "<p><strong>Aucun critère de dénutrition identifié.</strong> Continuez la surveillance nutritionnelle habituelle.</p>";
    return;
  }
  if (!resultat.diagnostic) {
    badge.classList.add("warning");
    badge.textContent = "À approfondir";
    contenu.innerHTML = `
            <p><strong>Évaluation à approfondir.</strong> Certains critères sont présents, sans diagnostic complet à ce stade.</p>
            ${genererDetailsDenutrition(resultat)}
        `;
    return;
  }
  const severite = resultat.severite?.label ?? "Dénutrition identifiée";
  badge.classList.add("danger");
  badge.textContent = severite;
  contenu.innerHTML = `
        <p><strong>${severite}</strong> Les critères diagnostiques HAS sont réunis.</p>
        ${genererDetailsDenutrition(resultat)}
    `;
}


// OUVERTURE DE L'EVALUATION APPROFONDIE

let denutEvaluationOuverteManuellement = false;

function evaluerPertinenceDenutrition() {
  const age = getNombrePatient("age");
  const imc = calculerIMCPatient();
  const poidsActuel = getNombrePatient("poids");
  const poidsHabituel = getNombrePatient("denutPoidsHabituel");
  const poids1Mois = getNombrePatient("denutPoids1Mois");
  const poids6Mois = getNombrePatient("denutPoids6Mois");
  const reduction = document.getElementById("denutReductionApports")?.value ?? "";
  const malabsorption = document.getElementById("denutMalabsorption")?.checked ?? false;
  const agression = document.getElementById("denutAgression")?.checked ?? false;
  const masseMusculaire = document.getElementById("denutMasseMusculaire")?.checked ?? false;
  const sarcopenie = document.getElementById("denutSarcopenieConfirmee")?.checked ?? false;

  const perteHabituel = calculerPertePoids(poidsHabituel, poidsActuel);
  const perte1Mois = calculerPertePoids(poids1Mois, poidsActuel);
  const perte6Mois = calculerPertePoids(poids6Mois, poidsActuel);
  const signaux = [];

  // ≥70 ans : le MNA-SF est le véritable outil de dépistage du module.
  // Un résultat positif ouvre l'évaluation HAS, sans être assimilé à un diagnostic HAS.
  let mna = null;
  if (estNombre(age) && age >= 70) {
    const scoreMNA = calculerScoreMNA();
    const interpretationMNA = interpreterMNA(scoreMNA);
    mna = { score: scoreMNA, interpretation: interpretationMNA };

    if (interpretationMNA?.niveau === "risque") {
      signaux.push(`MNA-SF : risque de malnutrition (${scoreMNA}/14)`);
    } else if (interpretationMNA?.niveau === "malnutrition") {
      signaux.push(`MNA-SF positif (${scoreMNA}/14)`);
    }
  }

  // Signaux phénotypiques / cliniques utiles au repérage.
  if (estNombre(perte1Mois) && perte1Mois >= 5) signaux.push("perte de poids à 1 mois");
  if (estNombre(perte6Mois) && perte6Mois >= 10) signaux.push("perte de poids à 6 mois");
  if (estNombre(perteHabituel) && perteHabituel >= 10) signaux.push("perte par rapport au poids habituel");

  if (estNombre(age) && estNombre(imc)) {
    if (age >= 18 && age < 70 && imc < 18.5) signaux.push("IMC bas pour le critère HAS adulte");
    if (age >= 70 && imc < 22) signaux.push("IMC bas pour le critère HAS ≥ 70 ans");
  }

  if (reduction !== "" && reduction !== "aucune") signaux.push("réduction récente des apports");
  if (malabsorption) signaux.push("malabsorption / maldigestion");
  if (agression) signaux.push("agression / hypercatabolisme");
  if (estNombre(age) && age < 70 && masseMusculaire) signaux.push("réduction musculaire quantifiée");
  if (estNombre(age) && age >= 70 && sarcopenie) signaux.push("sarcopénie confirmée");

  return {
    pertinente: signaux.length > 0,
    signaux: Array.from(new Set(signaux)),
    mna
  };
}

function afficherPertinenceDenutrition() {
  const zone = document.getElementById("denutEvaluationApprofondie");
  const type = document.getElementById("denutScreeningType");
  const titre = document.getElementById("denutScreeningTitle");
  const texte = document.getElementById("denutScreeningText");
  const bouton = document.getElementById("denutEvaluationToggle");
  if (!zone || !titre || !texte || !bouton) return;

  const age = getNombrePatient("age");
  const senior = estNombre(age) && age >= 70;
  const pertinence = evaluerPertinenceDenutrition();
  const ouverte = pertinence.pertinente || denutEvaluationOuverteManuellement;

  zone.hidden = !ouverte;
  bouton.setAttribute("aria-expanded", String(ouverte));
  if (type) type.textContent = senior ? "Dépistage / repérage" : "Repérage des signaux d'alerte";

  if (pertinence.pertinente) {
    titre.textContent = senior && pertinence.mna?.interpretation && pertinence.mna.interpretation.niveau !== "normal"
      ? "Dépistage nutritionnel positif — évaluation HAS à approfondir"
      : "Évaluation nutritionnelle à approfondir";
    texte.textContent = `Signal${pertinence.signaux.length > 1 ? "aux" : ""} identifié${pertinence.signaux.length > 1 ? "s" : ""} : ${pertinence.signaux.join(", ")}.`;
    bouton.textContent = "Évaluation affichée";
    bouton.disabled = true;
    return;
  }

  if (senior && pertinence.mna?.score === null) {
    titre.textContent = "MNA-SF à compléter";
    texte.textContent = "Complétez le MNA-SF ci-dessus. L'évaluation HAS détaillée reste accessible à tout moment.";
  } else if (senior && pertinence.mna?.interpretation?.niveau === "normal") {
    titre.textContent = "MNA-SF sans risque identifié";
    texte.textContent = "Aucun autre signal d'alerte n'est actuellement identifié. L'évaluation HAS détaillée reste disponible si le contexte clinique le justifie.";
  } else {
    titre.textContent = "Aucun signal d'appel identifié";
    texte.textContent = "Ce repérage ne remplace pas le jugement clinique. L'évaluation diagnostique HAS détaillée reste disponible si nécessaire.";
  }

  bouton.disabled = false;
  bouton.textContent = ouverte ? "Masquer l'évaluation" : "Évaluer la dénutrition";
}

function basculerEvaluationDenutrition() {
  denutEvaluationOuverteManuellement = !denutEvaluationOuverteManuellement;
  afficherPertinenceDenutrition();
}

// ACTUALISATION

function actualiserEtatNutritionnel() {
  adapterEvaluationNutritionnelleAge();
  adapterAffichageMNA();
  adapterAffichageHAS();
  const poidsActuel = getNombrePatient("poids");
  const poidsHabituel = getNombrePatient("denutPoidsHabituel");
  const poids1Mois = getNombrePatient("denutPoids1Mois");
  const poids6Mois = getNombrePatient("denutPoids6Mois");
  const perteHabituel = calculerPertePoids(poidsHabituel, poidsActuel);
  const perte1Mois = calculerPertePoids(poids1Mois, poidsActuel);
  const perte6Mois = calculerPertePoids(poids6Mois, poidsActuel);
  afficherPourcentagePerte("denutPerteHabituelle", perteHabituel);
  afficherPourcentagePerte("denutPerte1Mois", perte1Mois);
  afficherPourcentagePerte("denutPerte6Mois", perte6Mois);
  afficherPertinenceDenutrition();
  afficherEvaluationNutritionnelleHAS();
  afficherEvaluationGLIM();
  afficherResultatMNA();
}

// EVENEMENTS

// MNA — AFFICHAGE

function adapterAffichageMNA() {
  const age = getNombrePatient("age");
  const section = document.getElementById("mnaSection");
  if (!section) {
    return;
  }
  section.hidden = !Number.isFinite(age) || age < 70;
}

// MNA — IMC / MOLLET

function obtenirScoreMNAImc() {
  const imc = calculerIMCPatient();
  const groupeImc = document.getElementById("mnaImcGroupe");
  const groupeMollet = document.getElementById("mnaMolletGroupe");
  const valeurImc = document.getElementById("mnaImcValeur");

  // IMC DISPONIBLE

  if (Number.isFinite(imc)) {
    if (groupeImc) {
      groupeImc.hidden = false;
    }
    if (groupeMollet) {
      groupeMollet.hidden = true;
    }
    if (valeurImc) {
      valeurImc.textContent = `${imc.toFixed(1)} kg/m²`;
    }
    if (imc < 19) {
      return 0;
    }
    if (imc < 21) {
      return 1;
    }
    if (imc < 23) {
      return 2;
    }
    return 3;
  }

  // IMC INDISPONIBLE

  if (groupeImc) {
    groupeImc.hidden = true;
  }
  if (groupeMollet) {
    groupeMollet.hidden = false;
  }
  const mollet = getNombrePatient("mnaMollet");
  if (!Number.isFinite(mollet)) {
    return null;
  }
  return mollet < 31 ? 0 : 3;
}

// MNA — SCORE

function calculerScoreMNA() {
  const age = getNombrePatient("age");

  // NON CONCERNE

  if (!Number.isFinite(age) || age < 70) {
    return null;
  }
  const ids = ["mnaApports", "mnaPertePoids", "mnaMotricite", "mnaMaladieAigue", "mnaNeuro"];
  let score = 0;

  // QUESTIONS A-E

  for (const id of ids) {
    const element = document.getElementById(id);
    if (!element || element.value === "") {
      return null;
    }
    score += Number(element.value);
  }

  // QUESTION F

  const scoreF = obtenirScoreMNAImc();
  if (scoreF === null) {
    return null;
  }
  score += scoreF;
  return score;
}

// MNA — INTERPRETATION

function interpreterMNA(score) {
  if (!Number.isFinite(score)) {
    return null;
  }
  if (score >= 12) {
    return {
      niveau: "normal",
      classe: "ok",
      label: "État nutritionnel normal"
    };
  }
  if (score >= 8) {
    return {
      niveau: "risque",
      classe: "warning",
      label: "Risque de malnutrition"
    };
  }
  return {
    niveau: "malnutrition",
    classe: "danger",
    label: "Malnutrition avérée"
  };
}

// MNA — AFFICHAGE RESULTAT

function afficherResultatMNA() {
  const resultat = document.getElementById("mnaResultat");
  const scoreAffiche = document.getElementById("mnaScore");
  if (!resultat || !scoreAffiche) {
    return;
  }
  const score = calculerScoreMNA();
  resultat.classList.remove("neutral", "ok", "warning", "danger");

  // INCOMPLET

  if (score === null) {
    scoreAffiche.textContent = "— / 14";
    resultat.classList.add("neutral");
    resultat.innerHTML = `
            <strong>
                Dépistage en attente
            </strong>

            <span>
                Complétez les informations nécessaires
                pour calculer le score MNA-SF.
            </span>
        `;
    return;
  }
  const interpretation = interpreterMNA(score);
  scoreAffiche.textContent = `${score} / 14`;
  resultat.classList.add(interpretation.classe);
  resultat.innerHTML = `
        <strong>
            ${interpretation.label}
        </strong>

        <span>
            Score MNA-SF : ${score} / 14
        </span>
    `;
}

// HAS — AFFICHAGE

function adapterAffichageHAS() {
  const age = getNombrePatient("age");
  const section = document.getElementById("hasSection");
  if (!section) {
    return;
  }
  section.hidden = !Number.isFinite(age) || age < 18;
}

/* Fonctions utilitaires */

// ETAT NUTRITIONNEL

function getNombrePatient(id) {
  const element = document.getElementById(id);
  if (!element) return null;
  const valeur = Number.parseFloat(element.value);
  return Number.isFinite(valeur) ? valeur : null;
}

// OUTILS

function estNombre(valeur) {
  return Number.isFinite(valeur);
}

function estAuMoins(valeur, seuil) {
  return estNombre(valeur) && valeur >= seuil;
}

function estInferieur(valeur, seuil) {
  return estNombre(valeur) && valeur < seuil;
}

function poidsValide(valeur) {
  // Ne pas imposer de plafond arbitraire au calcul diagnostique :
  // une valeur numérique positive doit rester calculable.
  // Une valeur atypique doit être vérifiée cliniquement, mais ne doit pas
  // faire disparaître silencieusement un critère de perte pondérale.
  return estNombre(valeur) && valeur > 0;
}

function calculerPertePoids(poidsReference, poidsActuel) {
  if (!poidsValide(poidsReference) || !poidsValide(poidsActuel)) {
    return null;
  }

  // Formule : (poids de référence - poids actuel) / poids de référence × 100.
  // Une valeur positive correspond à une perte, une valeur négative à une prise.
  // L'arrondi technique évite qu'un seuil exact (ex. 10 %) devienne
  // 9,999999... à cause des nombres flottants JavaScript.
  const perte =
    (poidsReference - poidsActuel) /
    poidsReference *
    100;

  return Math.round(perte * 10000) / 10000;
}

/* Initialisation et événements */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("denutEvaluationToggle")?.addEventListener("click", basculerEvaluationDenutrition);
  const champsEtatNutritionnel = ["age", "taille", "poids", "denutPoidsHabituel", "denutPoids1Mois", "denutPoids6Mois", "denutReductionApports", "denutDureeReduction", "denutMalabsorption", "denutAgression", "denutMasseMusculaire", "denutSarcopenieConfirmee", "denutAlbumine", "mnaApports", "mnaPertePoids", "mnaMotricite", "mnaMaladieAigue", "mnaNeuro", "mnaMollet"];
  champsEtatNutritionnel.forEach(id => {
    const element = document.getElementById(id);
    if (!element) return;
    element.addEventListener("input", actualiserEtatNutritionnel);
    element.addEventListener("change", actualiserEtatNutritionnel);
  });
  initialiserEvaluationGLIM();
  actualiserEtatNutritionnel();
});


// ANALYSE — DÉNUTRITION

function nombreDenutrition(valeur) {
  const nombre = Number.parseFloat(valeur);
  return Number.isFinite(nombre) ? nombre : null;
}

function obtenirSyntheseDenutrition() {
  if (typeof construireSynthesePatient !== "function") {
    return null;
  }

  return construireSynthesePatient();
}

function obtenirObjectifsDenutrition(synthese) {
  // Les objectifs sont déjà calculés par le moteur central puis exposés dans
  // SynthesePatient. Le module Dénutrition ne relance donc aucun calcul.
  const objectifs = synthese?.objectifsNutritionnels ?? null;

  if (!objectifs) {
    return {
      energie: null,
      proteines: null,
      source: "indisponible",
      details: null
    };
  }

  return {
    energie: Number.isFinite(objectifs?.energie?.objectif)
      ? objectifs.energie.objectif
      : null,
    proteines: Number.isFinite(objectifs?.proteines?.objectif)
      ? objectifs.proteines.objectif
      : null,
    source: "synthese-patient",
    details: objectifs
  };
}

function obtenirSourcesProteiquesDenutrition(synthese) {
  const repas = synthese?.anamnese?.repas;

  if (!repas) {
    return [];
  }

  const sources = [];

  Object.entries(repas).forEach(
    ([nomRepas, informations]) => {

      const aliments =
        informations?.aliments ?? [];

      aliments.forEach(
        aliment => {

          const proteines =
            nombreDenutrition(
              aliment.proteines ??
              aliment.proteine
            );

          if (
            !Number.isFinite(proteines) ||
            proteines <= 0
          ) {
            return;
          }

          sources.push({
            repas: nomRepas,
            nom: aliment.nom ?? "Aliment",
            groupe: aliment.groupe ?? "",
            proteines,
            energie:
              nombreDenutrition(
                aliment.energie ??
                aliment.kcal ??
                aliment.calories
              )
          });
        }
      );
    }
  );

  return sources.sort(
    (a, b) =>
      b.proteines -
      a.proteines
  );
}

function analyserRepasDenutrition(synthese) {
  const repas =
    synthese?.anamnese?.repas ?? {};

  return Object.entries(repas)
    .map(
      ([nom, informations]) => ({
        nom,
        energie:
          nombreDenutrition(
            informations?.energie ??
            informations?.kcal ??
            informations?.calories
          ),
        proteines:
          nombreDenutrition(
            informations?.proteines ??
            informations?.proteine
          )
      })
    )
    .filter(
      repasItem =>
        Number.isFinite(repasItem.energie) ||
        Number.isFinite(repasItem.proteines)
    );
}

function analyserDenutritionNutritionnelle() {
  const synthese =
    obtenirSyntheseDenutrition();

  const resultat =
    synthese?.etatNutritionnel?.has ?? null;

  if (!resultat) {
    return null;
  }

  const objectifs =
    obtenirObjectifsDenutrition(
      synthese
    );

  const apportsAnamnese = synthese?.anamnese?.apports ?? {};
  const apportEnergie = apportsAnamnese.energie ?? null;
  const apportProteines = apportsAnamnese.protein ?? null;

  const energie = nombreDenutrition(apportEnergie?.valeur);
  const proteines = nombreDenutrition(apportProteines?.valeur);
  const energiePartielle = apportEnergie?.partiel === true;
  const proteinesPartielles = apportProteines?.partiel === true;

  // Une somme CIQUAL partielle est un minimum connu. Elle peut être affichée,
  // mais ne doit pas être transformée en pourcentage de couverture comme si
  // l'ensemble de l'alimentation était documenté.
  const couvertureEnergie =
    !energiePartielle &&
    Number.isFinite(energie) &&
    Number.isFinite(objectifs.energie) &&
    objectifs.energie > 0
      ? energie / objectifs.energie * 100
      : null;

  const couvertureProteines =
    !proteinesPartielles &&
    Number.isFinite(proteines) &&
    Number.isFinite(objectifs.proteines) &&
    objectifs.proteines > 0
      ? proteines / objectifs.proteines * 100
      : null;

  const sourcesProteiques =
    obtenirSourcesProteiquesDenutrition(
      synthese
    );

  const totalProteinesSources =
    sourcesProteiques.reduce(
      (total, source) =>
        total + source.proteines,
      0
    );

  const principalesSources =
    sourcesProteiques
      .slice(
        0,
        5
      )
      .map(
        source => ({
          ...source,
          contribution:
            totalProteinesSources > 0
              ? source.proteines /
                totalProteinesSources * 100
              : 0
        })
      );

  const repas =
    analyserRepasDenutrition(
      synthese
    );

  const repasAvecProteines =
    repas.filter(
      repasItem =>
        Number.isFinite(
          repasItem.proteines
        )
    );

  const repasAvecEnergie =
    repas.filter(
      repasItem =>
        Number.isFinite(
          repasItem.energie
        )
    );

  const repasMoinsProteique =
    repasAvecProteines.length
      ? repasAvecProteines.reduce(
          (minimum, repasItem) =>
            repasItem.proteines <
            minimum.proteines
              ? repasItem
              : minimum
        )
      : null;

  const repasMoinsEnergetique =
    repasAvecEnergie.length
      ? repasAvecEnergie.reduce(
          (minimum, repasItem) =>
            repasItem.energie <
            minimum.energie
              ? repasItem
              : minimum
        )
      : null;

  return {
    resultat,
    synthese,
    objectifs,
    apports: {
      energie,
      proteines,
      energiePartielle,
      proteinesPartielles,
      couvertureEnergie,
      couvertureProteines
    },
    principalesSources,
    repas,
    repasMoinsProteique,
    repasMoinsEnergetique
  };
}

function creerSectionAnalyseDenutrition() {
  let section =
    document.getElementById(
      "analyseDenutritionSection"
    );

  if (section) {
    return section;
  }

  const reference =
    document.getElementById(
      "analyseRapportCaloricoAzoteSection"
    );

  if (!reference?.parentElement) {
    return null;
  }

  section =
    document.createElement(
      "section"
    );

  section.id =
    "analyseDenutritionSection";

  section.className =
    "analyse-pathologie-section nutrition-calc-card";

  section.hidden =
    true;

  section.innerHTML =
    `<div id="analyseDenutritionContainer"></div>`;

  reference.parentElement.insertBefore(
    section,
    reference
  );

  section.appendChild(reference);
  const micronutriments = document.createElement("div");
  micronutriments.id = "analyseDenutritionMicronutriments";
  section.appendChild(micronutriments);
  return section;
}

function afficherAnalyseDenutrition() {
  const section =
    creerSectionAnalyseDenutrition();

  const container =
    document.getElementById(
      "analyseDenutritionContainer"
    );

  if (!section || !container) {
    return;
  }

  const analyse =
    analyserDenutritionNutritionnelle();

  if (
    !analyse ||
    analyse.resultat?.diagnostic !== true
  ) {
    section.hidden = true;
    container.innerHTML = "";
    document.getElementById("analyseDenutritionMicronutriments").innerHTML = "";
    return;
  }

  section.hidden = false;

  const apports =
    analyse.apports;

  const objectifs =
    analyse.objectifs;

  const sourcesHTML =
    analyse.principalesSources
      .map(
        (source, index) => `
          <div class="diabetes-nutrient-row">
            <div class="diabetes-source-food">
              <span class="hta-source-rank">${index + 1}</span>
              <div class="hta-source-name">
                <strong>${echapperHTML(source.nom)}</strong>
                <span>${echapperHTML(source.repas)}</span>
              </div>
            </div>
            <strong>${source.proteines.toFixed(1)} g</strong>
            <span>${source.contribution.toFixed(1)} %${apports.proteinesPartielles ? " des protéines connues" : ""}</span>
          </div>
        `
      )
      .join("");

  const repasHTML =
    analyse.repas
      .map(
        repasItem => `
          <tr>
            <th scope="row">${echapperHTML(repasItem.nom)}</th>
            <td>
              ${Number.isFinite(repasItem.energie)
                ? `${repasItem.energie.toFixed(0)} kcal`
                : "Énergie non disponible"}
            </td>
            <td>
              ${Number.isFinite(repasItem.proteines)
                ? `${repasItem.proteines.toFixed(1)} g`
                : "Protéines non disponibles"}
            </td>
          </tr>
        `
      )
      .join("");


  const micronutritionAnalyseHTML =
    typeof construireHTMLAnalyseMicronutritionnelle === "function"
      ? construireHTMLAnalyseMicronutritionnelle(
          [
            "vitamineB1", "vitamineB12", "vitamineB9", "fer", "vitamineD",
            "zinc", "calcium", "magnesium", "phosphore", "potassium"
          ],
          {
            synthese: analyse.synthese,
            contextePathologique: "denutrition",
            titre: "Micronutriments — apports, repères et biologie",
            sousTitre: "Comparaison des apports alimentaires aux besoins du patient. Les principaux contributeurs restent intégrés à chaque micronutriment pour expliquer l'origine des apports."
          }
        )
      : "";

  document.getElementById("analyseDenutritionMicronutriments").innerHTML = micronutritionAnalyseHTML;

  container.innerHTML = `
    <section class="analyse-diabetes-card">
      <div class="nutrition-calc-card-header">
        <span class="nutrition-calc-kicker">Analyse — dénutrition</span>
        <h3>${echapperHTML(analyse.resultat.severite?.label || "Dénutrition")}</h3>
        <p>Analyse des apports réellement observés dans l'anamnèse</p>
      </div>

      <div class="diabetes-analysis-block">
        <div class="diabetes-analysis-block-header">
          <div>
            <h4>Couverture des objectifs nutritionnels</h4>
            <span>Comparaison descriptive entre l'anamnèse et les objectifs de travail retenus dans Calculs nutritionnels</span>
          </div>
        </div>

        <div class="diabetes-distribution-summary">
          <div class="diabetes-analysis-info">
            <span>Énergie observée</span>
            <strong>${Number.isFinite(apports.energie) ? `${apports.energiePartielle ? "≥ " : ""}${apports.energie.toFixed(0)} kcal/j` : "Non disponible"}</strong>
            <small>${Number.isFinite(objectifs.energie) ? `Objectif : ${Math.round(objectifs.energie)} kcal/j` : "Objectif non disponible"}${Number.isFinite(apports.couvertureEnergie) ? ` · couverture ${apports.couvertureEnergie.toFixed(1)} %` : apports.energiePartielle ? " · estimation à préciser" : ""}</small>
          </div>

          <div class="diabetes-analysis-info">
            <span>Protéines observées</span>
            <strong>${Number.isFinite(apports.proteines) ? `${apports.proteinesPartielles ? "≥ " : ""}${apports.proteines.toFixed(1)} g/j` : "Non disponible"}</strong>
            <small>${Number.isFinite(objectifs.proteines) ? `Objectif : ${objectifs.proteines.toFixed(1)} g/j` : "Objectif non disponible"}${Number.isFinite(apports.couvertureProteines) ? ` · couverture ${apports.couvertureProteines.toFixed(1)} %` : apports.proteinesPartielles ? " · estimation à préciser" : ""}</small>
          </div>
        </div>
      </div>

      <div class="diabetes-sources-columns">

        <div class="diabetes-analysis-block">
          <div class="diabetes-analysis-block-header">
            <div>
              <h4>Principales sources protéiques</h4>
              <span>Aliments contribuant le plus aux protéines retrouvées dans l'anamnèse</span>
            </div>
          </div>

          ${
            sourcesHTML
              ? `<div class="diabetes-nutrient-table">${sourcesHTML}</div>`
              : `<div class="diabetes-analysis-empty">Aucune source protéique exploitable dans l'anamnèse.</div>`
          }
        </div>

        <div class="diabetes-analysis-block">
          <div class="diabetes-analysis-block-header">
            <div>
              <h4>Répartition des apports par prise</h4>
              <span>Description des apports énergétiques et protéiques disponibles par repas</span>
            </div>
          </div>

          ${
            repasHTML
              ? `<div class="diabetes-carbs-table-wrap"><table class="diabetes-carbs-table" aria-label="Répartition des apports par prise"><thead><tr><th scope="col">Prise alimentaire</th><th scope="col">Énergie</th><th scope="col">Protéines</th></tr></thead><tbody>${repasHTML}</tbody></table></div>`
              : `<div class="diabetes-analysis-empty">Aucune donnée par repas exploitable.</div>`
          }
        </div>

      </div>
    </section>
  `;
}

// PRISE EN CHARGE — DÉNUTRITION

function classerApportsSpontanesDenutrition(reduction) {
  if (reduction === "aucune") {
    return {
      code: "normaux",
      label: "Apports spontanés non diminués"
    };
  }

  if (reduction === "moins50") {
    return {
      code: "diminues_plus_moitie",
      label: "Apports diminués mais restant supérieurs à la moitié de l'apport habituel"
    };
  }

  if (reduction === "plus50") {
    return {
      code: "tres_diminues",
      label: "Apports très diminués, correspondant à une réduction d'au moins 50 %"
    };
  }

  return {
    code: "inconnus",
    label: "Niveau des apports spontanés non renseigné"
  };
}

function construireStrategieSeniorDenutrition(niveauSeverite, niveauApports) {
  // Matrice HAS 2007 chez la personne âgée dénutrie.
  // La nutrition entérale est formulée comme une orientation spécialisée :
  // NutriFlow ne prescrit pas une nutrition artificielle.
  const base = {
    orale: "Conseils diététiques et alimentation enrichie.",
    cno: "non_systematique",
    ne: "non_systematique",
    reeval: "À préciser selon l'évolution clinique.",
    source: "HAS 2007 — personne âgée dénutrie"
  };

  if (niveauSeverite === "indeterminee") {
    return {
      ...base,
      orale: "Privilégier la voie orale si elle est possible, tout en complétant les données permettant de grader la sévérité.",
      cno: niveauApports === "tres_diminues" ? "a_envisager" : "non_systematique",
      ne: niveauApports === "tres_diminues" ? "evaluation_si_echec" : "non_systematique",
      reeval: "Clarifier la sévérité et réévaluer rapidement les apports avant d'appliquer une stratégie d'escalade.",
      remarque: "La matrice HAS 2007 distingue dénutrition et dénutrition sévère ; une sévérité non déterminée ne doit pas être assimilée automatiquement à une forme modérée."
    };
  }

  if (niveauSeverite === "moderee" && niveauApports === "normaux") {
    return {
      ...base,
      reeval: "Réévaluation à 1 mois.",
      remarque: "CNO non systématiques d'emblée si les apports spontanés restent normaux."
    };
  }

  if (niveauSeverite === "severe" && niveauApports === "normaux") {
    return {
      ...base,
      cno: "d_emblee",
      reeval: "Réévaluation à 15 jours.",
      remarque: "Associer alimentation enrichie et CNO selon la stratégie HAS 2007."
    };
  }

  if (niveauSeverite === "moderee" && niveauApports === "diminues_plus_moitie") {
    return {
      ...base,
      cno: "si_echec",
      reeval: "Réévaluation à 15 jours ; si échec de l'alimentation enrichie, envisager des CNO.",
      remarque: "L'enrichissement oral reste la première étape."
    };
  }

  if (niveauSeverite === "severe" && niveauApports === "diminues_plus_moitie") {
    return {
      ...base,
      cno: "d_emblee",
      ne: "si_echec",
      reeval: "Réévaluation à 1 semaine ; si échec, orientation spécialisée pour envisager une nutrition entérale.",
      remarque: "Alimentation enrichie et CNO d'emblée."
    };
  }

  if (niveauSeverite === "moderee" && niveauApports === "tres_diminues") {
    return {
      ...base,
      cno: "d_emblee",
      ne: "si_echec",
      reeval: "Réévaluation à 1 semaine ; si échec, orientation spécialisée pour envisager une nutrition entérale.",
      remarque: "Alimentation enrichie et CNO d'emblée."
    };
  }

  if (niveauSeverite === "severe" && niveauApports === "tres_diminues") {
    return {
      ...base,
      cno: "selon_contexte",
      ne: "d_emblee",
      reeval: "Réévaluation à 1 semaine.",
      remarque: "La stratégie HAS 2007 prévoit une nutrition entérale d'emblée dans cette situation ; NutriFlow formule donc une orientation médicale/spécialisée et ne prescrit pas la nutrition entérale."
    };
  }

  return {
    ...base,
    cno: "a_envisager",
    ne: "evaluation_si_echec",
    reeval: "Le niveau des apports spontanés doit être documenté pour choisir la branche de la stratégie HAS 2007.",
    remarque: "Impossible de sélectionner de façon fiable une stratégie d'escalade sans information sur les apports spontanés."
  };
}

function construireStrategieAdulteDenutrition(niveauSeverite, niveauApports) {
  const severe = niveauSeverite === "severe";
  const tresDiminues = niveauApports === "tres_diminues";
  const diminues = niveauApports === "diminues_plus_moitie";

  if (niveauSeverite === "indeterminee") {
    return {
      orale: "Privilégier la voie orale si elle est possible et compléter les données permettant de grader la sévérité.",
      cno: tresDiminues ? "a_envisager" : "non_systematique",
      ne: tresDiminues ? "evaluation_si_echec" : "non_systematique",
      reeval: "Réévaluation rapprochée après clarification de la sévérité et des apports.",
      remarque: "Chez l'adulte de moins de 70 ans, NutriFlow n'applique pas la matrice gériatrique HAS 2007.",
      source: "HAS 2021 / ESPEN Hospital Nutrition 2021"
    };
  }

  if (!severe && niveauApports === "normaux") {
    return {
      orale: "Renforcer l'alimentation orale et l'enrichissement en fonction des objectifs et des habitudes du patient.",
      cno: "non_systematique",
      ne: "non_systematique",
      reeval: "En ambulatoire, réévaluer l'état nutritionnel dans le mois suivant la dernière évaluation.",
      remarque: "Les CNO ne sont pas générés automatiquement si les apports restent suffisants ; leur intérêt dépend de la couverture réelle des besoins.",
      source: "HAS 2021 / ESPEN Hospital Nutrition 2021"
    };
  }

  if (severe || tresDiminues) {
    return {
      orale: "Renforcer la voie orale si elle est possible : enrichissement, fractionnement et adaptation aux capacités du patient.",
      cno: "a_envisager",
      ne: "evaluation_si_insuffisance",
      reeval: "Réévaluation rapprochée ; en ambulatoire, l'état nutritionnel doit être réévalué dans le mois, avec orientation plus précoce si les apports sont très faibles ou la situation sévère.",
      remarque: "Si l'alimentation orale reste impossible ou insuffisante, une évaluation médicale/spécialisée d'un support nutritionnel est nécessaire.",
      source: "HAS 2021 / ESPEN Hospital Nutrition 2021"
    };
  }

  if (diminues) {
    return {
      orale: "Renforcer l'alimentation orale, l'enrichissement et le fractionnement selon la tolérance.",
      cno: "si_echec",
      ne: "evaluation_si_echec",
      reeval: "En ambulatoire, réévaluer l'état nutritionnel dans le mois ; rapprocher le suivi si les apports continuent de diminuer.",
      remarque: "Discuter des CNO si les adaptations alimentaires ne permettent pas de couvrir les besoins.",
      source: "HAS 2021 / ESPEN Hospital Nutrition 2021"
    };
  }

  return {
    orale: "Privilégier la voie orale si elle est possible et documenter les apports spontanés.",
    cno: "a_envisager",
    ne: "evaluation_si_echec",
    reeval: "Le niveau des apports spontanés doit être documenté avant de choisir une stratégie d'escalade.",
    remarque: "Aucune intensité de support nutritionnel ne doit être déduite automatiquement lorsque les apports ne sont pas renseignés.",
    source: "HAS 2021 / ESPEN Hospital Nutrition 2021"
  };
}

function evaluerRisqueRenutritionDenutrition(resultat, reduction, duree, synthese = null) {
  const majeurs = [];
  const mineurs = [];
  const terrains = [];
  const imc = resultat?.imc;
  const perte6Mois = resultat?.perte6Mois;
  const age = resultat?.age;

  // Critères NICE repris dans l'argumentaire HAS 2019, uniquement lorsque
  // les données disponibles permettent une correspondance directe.
  if (estNombre(imc) && imc < 16) {
    majeurs.push("IMC < 16 kg/m²");
  }

  if (estNombre(perte6Mois) && perte6Mois > 15) {
    majeurs.push("Perte de poids > 15 % en 6 mois");
  }

  if (estNombre(imc) && imc < 18.5) {
    mineurs.push("IMC < 18,5 kg/m²");
  }

  if (estNombre(perte6Mois) && perte6Mois >= 10 && perte6Mois <= 15) {
    mineurs.push("Perte de poids de 10 à 15 % en 6 mois");
  }

  if (estNombre(age) && age >= 70) {
    terrains.push("âge ≥ 70 ans");
  }

  if (synthese?.etatNutritionnel?.donneesDenutrition?.malabsorption === true) {
    terrains.push("malabsorption / maldigestion");
  }

  const apportsTresReduitsProlonges =
    reduction === "plus50" &&
    ["plus2semaines", "plus2"].includes(duree);

  if (apportsTresReduitsProlonges) {
    terrains.push("apports réduits d'au moins 50 % depuis plus de 2 semaines");
  }

  // NICE : un potassium, magnésium ou phosphate bas avant renutrition
  // constitue un critère majeur. NutriFlow ne classe la valeur que si la
  // référence du laboratoire est renseignée et exploitable.
  if (typeof analyserMicronutrimentPatient === "function") {
    const electrolytes = [
      ["potassium", "Potassium plasmatique sous la référence du laboratoire"],
      ["magnesium", "Magnésium sous la référence du laboratoire"],
      ["phosphore", "Phosphate sous la référence du laboratoire"]
    ];

    electrolytes.forEach(([code, libelle]) => {
      const analyse = analyserMicronutrimentPatient(code);
      if (analyse?.biologie?.statut === "bas") majeurs.push(libelle);
    });
  }

  return {
    risqueEleveDocumente: majeurs.length >= 1 || mineurs.length >= 2,
    majeurs,
    mineurs,
    terrains,
    apportsTresReduitsProlonges
  };
}

function obtenirLienMicronutritionDenutrition(code, risqueRenutrition) {
  const liens = {
    vitamineB1: risqueRenutrition?.risqueEleveDocumente
      ? "La dénutrition et des apports très réduits peuvent épuiser les réserves de thiamine ; en situation à risque de renutrition, la vitamine B1 devient un enjeu de sécurité."
      : "La dénutrition et la réduction prolongée des apports peuvent s'accompagner d'un statut insuffisant en thiamine, particulièrement si les apports sont très faibles ou s'il existe une malabsorption.",
    vitamineB12: "Une réduction des apports ou une malabsorption peuvent contribuer à un statut insuffisant en vitamine B12 ; une anomalie biologique ne doit pas être attribuée automatiquement à l'alimentation.",
    vitamineB9: "Des apports alimentaires faibles ou une malabsorption peuvent compromettre la couverture en folates dans un contexte de dénutrition.",
    fer: "La dénutrition peut s'accompagner d'apports martiaux insuffisants, mais le statut martial doit aussi tenir compte des pertes, de l'inflammation et d'une éventuelle malabsorption.",
    vitamineD: "Une alimentation quantitativement ou qualitativement insuffisante peut participer à une faible couverture en vitamine D, mais la prise en charge d'une valeur biologique basse ne repose pas sur l'alimentation seule.",
    zinc: "La réduction des apports, la malabsorption ou des pertes peuvent contribuer à un statut insuffisant en zinc ; son interprétation biologique est sensible au contexte inflammatoire.",
    calcium: "Une réduction globale des apports peut compromettre la couverture en calcium ; l'objectif est d'assurer des apports adaptés sans multiplier les restrictions alimentaires.",
    magnesium: risqueRenutrition?.risqueEleveDocumente
      ? "Le magnésium fait partie des électrolytes à surveiller en cas de risque de syndrome de renutrition."
      : "Des apports insuffisants ou certaines pertes peuvent réduire la couverture en magnésium dans un contexte de dénutrition.",
    phosphore: risqueRenutrition?.risqueEleveDocumente
      ? "Un phosphate bas avant ou pendant la renutrition constitue un signal de sécurité important et nécessite une prise en charge médicale coordonnée."
      : "Le phosphate devient particulièrement important lorsque les apports ont été très réduits et qu'une renutrition est envisagée.",
    potassium: risqueRenutrition?.risqueEleveDocumente
      ? "Un potassium bas peut participer au risque de complications lors de la renutrition ; son interprétation dépend aussi de la fonction rénale et des traitements."
      : "Le potassium doit être interprété avec les apports, la fonction rénale, les pertes éventuelles et les traitements associés."
  };
  return liens[code] || "Ce micronutriment doit être interprété dans le contexte global de la dénutrition, des apports et des causes associées.";
}

function construireMicronutritionDenutrition(risqueRenutrition) {
  const items = [];

  if (risqueRenutrition?.risqueEleveDocumente) {
    items.push({
      niveau: "haute",
      titre: "Sécurité de renutrition",
      lien: "Un risque élevé de syndrome de renutrition rend la thiamine, le potassium, le magnésium et le phosphate particulièrement importants pour la sécurité de la reprise nutritionnelle.",
      action: "Coordonner l'évaluation médicale avant et pendant la renutrition. NutriFlow ne génère ni protocole de renutrition ni dose de supplémentation."
    });
  }

  if (typeof construirePriseEnChargeMicronutritionnelle === "function") {
    const codes = [
      "vitamineB1", "vitamineB12", "vitamineB9", "fer", "vitamineD",
      "zinc", "calcium", "magnesium", "phosphore", "potassium"
    ];

    codes.forEach(code => {
      const item = construirePriseEnChargeMicronutritionnelle(code, {
        contextePathologique: "denutrition",
        securite: ["vitamineB1", "potassium", "magnesium", "phosphore"].includes(code),
        lien: obtenirLienMicronutritionDenutrition(code, risqueRenutrition)
      });
      if (item) items.push(item);
    });
  }

  return items;
}

function libelleCNOPriseEnChargeDenutrition(code) {
  const libelles = {
    non_systematique: "CNO non systématiques d'emblée",
    si_echec: "CNO si échec des adaptations alimentaires",
    d_emblee: "CNO à intégrer d'emblée",
    a_envisager: "CNO à envisager selon la couverture des besoins",
    selon_contexte: "CNO selon le contexte et la stratégie nutritionnelle retenue"
  };
  return libelles[code] || "CNO à individualiser";
}

function libelleNEPriseEnChargeDenutrition(code) {
  const libelles = {
    non_systematique: "Nutrition entérale non générée automatiquement",
    si_echec: "Orientation spécialisée pour envisager une nutrition entérale en cas d'échec",
    d_emblee: "Orientation spécialisée pour envisager une nutrition entérale d'emblée",
    evaluation_si_echec: "Évaluation spécialisée si la voie orale reste insuffisante",
    evaluation_si_insuffisance: "Évaluation spécialisée si la nutrition orale est impossible ou insuffisante"
  };
  return libelles[code] || "Support nutritionnel à individualiser";
}

function afficherPriseEnChargeDenutrition() {
  const racine = document.getElementById("priseEnChargePathologies");
  if (!racine) return;

  let bloc = document.getElementById("priseEnChargeDenutrition");
  const synthese = obtenirSyntheseDenutrition();
  const resultat = synthese?.etatNutritionnel?.has ?? null;
  const donneesDenutrition = synthese?.etatNutritionnel?.donneesDenutrition ?? {};

  // Le MNA-SF et GLIM participent au dépistage / à l'évaluation,
  // mais cette prise en charge est affichée lorsque le diagnostic HAS est établi.
  if (resultat?.diagnostic !== true) {
    bloc?.remove();
    return;
  }

  racine.querySelectorAll(":scope > .module-placeholder").forEach(el => el.remove());

  if (!bloc) {
    bloc = document.createElement("section");
    bloc.id = "priseEnChargeDenutrition";
    bloc.className = "denut-pec nutrition-calc-card pec-diabetes-card pec-pathology-card";
    racine.prepend(bloc);
  }

  const age = nombreDenutrition(synthese?.patient?.age);
  const senior = Number.isFinite(age) && age >= 70;
  const niveauSeverite = resultat.severite?.niveau || "indeterminee";
  const severe = niveauSeverite === "severe";

  const reduction = donneesDenutrition.reductionApports ?? "";
  const duree = donneesDenutrition.dureeReduction ?? "";
  const malabsorption = donneesDenutrition.malabsorption === true;
  const agression = donneesDenutrition.agression === true;

  const niveauApports = classerApportsSpontanesDenutrition(reduction);
  const strategie = senior
    ? construireStrategieSeniorDenutrition(niveauSeverite, niveauApports.code)
    : construireStrategieAdulteDenutrition(niveauSeverite, niveauApports.code);

  const risqueRenutrition = evaluerRisqueRenutritionDenutrition(
    resultat,
    reduction,
    duree,
    synthese
  );

  const micronutrition = construireMicronutritionDenutrition(risqueRenutrition);

  const analyseNutritionnelle = analyserDenutritionNutritionnelle();
  const apportsReels = analyseNutritionnelle?.apports ?? {};
  const objectifs = analyseNutritionnelle?.objectifs ?? {};
  const objectifEnergie = Number.isFinite(objectifs.energie) ? objectifs.energie : null;
  const objectifProteines = Number.isFinite(objectifs.proteines) ? objectifs.proteines : null;

  const energieComplete = apportsReels.energiePartielle !== true;
  const proteinesCompletes = apportsReels.proteinesPartielles !== true;

  const apportEnergetiqueInsuffisant =
    energieComplete &&
    Number.isFinite(apportsReels.energie) &&
    Number.isFinite(objectifEnergie) &&
    apportsReels.energie < objectifEnergie;

  const apportProteiqueInsuffisant =
    proteinesCompletes &&
    Number.isFinite(apportsReels.proteines) &&
    Number.isFinite(objectifProteines) &&
    apportsReels.proteines < objectifProteines;

  const apportsQuantifies =
    (energieComplete && Number.isFinite(apportsReels.energie)) ||
    (proteinesCompletes && Number.isFinite(apportsReels.proteines));

  const apportsPartielsNonConclusifs =
    (apportsReels.energiePartielle === true && Number.isFinite(apportsReels.energie) && Number.isFinite(objectifEnergie) && apportsReels.energie < objectifEnergie) ||
    (apportsReels.proteinesPartielles === true && Number.isFinite(apportsReels.proteines) && Number.isFinite(objectifProteines) && apportsReels.proteines < objectifProteines);

  const apportsSousObjectif =
    apportEnergetiqueInsuffisant ||
    apportProteiqueInsuffisant;

  // PRISE EN CHARGE : on ne répète pas les critères phénotypiques ni les
  // tableaux d'apports déjà affichés dans Analyse. Ici, on transforme les
  // constats en axes d'action.
  const causes = [];

  if (resultat.etiologie?.some(c => c.code === "apports")) {
    causes.push("Réduction des apports : rechercher les freins à l'alimentation et adapter l'organisation des prises.");
  }

  if (malabsorption) {
    causes.push("Malabsorption / maldigestion : adapter l'alimentation à la tolérance et coordonner l'évaluation de la cause.");
  }

  if (agression) {
    causes.push("Situation d'agression / hypercatabolisme : coordonner les objectifs nutritionnels avec l'évolution du contexte médical.");
  }

  const causesHTML = causes.length
    ? `<ul>${causes.map(item => `<li>${echapperHTML(item)}</li>`).join("")}</ul>`
    : `<p>Aucun mécanisme étiologique supplémentaire n'est identifié au-delà du diagnostic. Poursuivre l'anamnèse pour rechercher les freins modifiables à l'alimentation.</p>`;

  // INTERPRÉTATION : l'Analyse conserve les chiffres détaillés. La prise en
  // charge n'affiche que la conclusion utile à la décision.
  const ecartsApports = [];

  if (apportEnergetiqueInsuffisant) {
    ecartsApports.push("Couverture énergétique insuffisante par rapport à l'objectif de travail.");
  }

  if (apportProteiqueInsuffisant) {
    ecartsApports.push("Couverture protéique insuffisante par rapport à l'objectif de travail.");
  }

  const interpretationApportsHTML = apportsPartielsNonConclusifs
    ? `<p>La composition disponible ne permet pas encore de confirmer un apport inférieur à l'objectif. Compléter l'anamnèse avant de cibler un enrichissement.</p>`
    : !apportsQuantifies
      ? `<p>Les apports ne sont pas suffisamment documentés dans l'anamnèse : compléter l'analyse avant de cibler précisément l'enrichissement.</p>`
      : ecartsApports.length
        ? `<ul>${ecartsApports.map(item => `<li>${echapperHTML(item)}</li>`).join("")}</ul>`
        : `<p>Les apports quantifiés atteignent actuellement les objectifs de travail disponibles. Maintenir néanmoins la surveillance de l'évolution.</p>`;

  const opportunites = [];

  if (apportProteiqueInsuffisant && analyseNutritionnelle?.repasMoinsProteique) {
    opportunites.push(
      `Explorer un enrichissement de la prise « ${analyseNutritionnelle.repasMoinsProteique.nom} », identifiée dans l'analyse comme la moins contributrice en protéines.`
    );
  }

  if (apportEnergetiqueInsuffisant && analyseNutritionnelle?.repasMoinsEnergetique) {
    opportunites.push(
      `Évaluer un enrichissement, une collation ou un fractionnement autour de la prise « ${analyseNutritionnelle.repasMoinsEnergetique.nom} », identifiée dans l'analyse comme la moins contributrice en énergie.`
    );
  }

  const opportunitesHTML = opportunites.length
    ? `<ul>${opportunites.map(item => `<li>${echapperHTML(item)}</li>`).join("")}</ul>`
    : apportsPartielsNonConclusifs
      ? `<p>Compléter l'anamnèse alimentaire avant de cibler un enrichissement : les données disponibles ne suffisent pas encore à identifier une prise prioritaire.</p>`
      : apportsQuantifies
        ? `<p>Aucun enrichissement ciblé n'est généré automatiquement avec les données interprétables. Si un enrichissement est retenu cliniquement, l'individualiser selon les habitudes, les préférences et la tolérance.</p>`
        : `<p>Compléter l'anamnèse alimentaire avant de cibler une prise ou un aliment précis.</p>`;

  let objectifsTravail = `<p>Compléter les données nécessaires dans Calculs nutritionnels pour afficher les objectifs de travail.</p>`;

  if (objectifEnergie || objectifProteines) {
    objectifsTravail = `<p>${objectifEnergie ? `<strong>Énergie :</strong> ${Math.round(objectifEnergie)} kcal/j` : ""}${objectifEnergie && objectifProteines ? " · " : ""}${objectifProteines ? `<strong>Protéines :</strong> ${objectifProteines.toFixed(1)} g/j` : ""}</p><small>Objectifs repris de Calculs nutritionnels. Ils restent à individualiser selon le contexte clinique.</small>`;
  }

  const repere = senior
    ? `<strong>Repères HAS 2007 — personne âgée dénutrie</strong><span>30–40 kcal/kg/j et 1,2–1,5 g de protéines/kg/j, à individualiser. La stratégie dépend également du niveau des apports spontanés et de la sévérité.</span>`
    : `<strong>Repère complémentaire ESPEN 2021 — contexte hospitalier</strong><span>Le régime hospitalier destiné aux patients à risque ou dénutris vise environ 30 kcal/kg/j et au moins 1,2 g de protéines/kg/j. Dans NutriFlow, ce repère n'est pas utilisé comme prescription ambulatoire automatique : les objectifs de Calculs nutritionnels restent prioritaires.</span>`;

  const micronutritionHTML = `
    <article class="pec-diabetes-item">
      <div class="pec-diabetes-item-head">
          <span class="pec-diabetes-rank">4</span>
          <div><h4>Micronutrition</h4><span>Lien clinique → action</span></div>
        </div>
      ${micronutrition.length
        ? `<div class="pec-diabetes-grid">${micronutrition.map(item => `
            <div class="pec-diabetes-panel">
              <strong>${echapperHTML(item.titre)}</strong>
              <p><strong>Lien avec la dénutrition :</strong> ${echapperHTML(item.lien)}</p>
              <p><strong>Action :</strong> ${echapperHTML(item.action)}</p>
            </div>`).join("")}</div>`
        : `<p>Aucune action micronutritionnelle spécifique n'est générée avec les données actuellement renseignées. Les comparaisons apports ↔ besoins restent visibles dans Analyse.</p>`}
    </article>
  `;

  const cnoHTML = `
    <article class="pec-diabetes-item">
      <div class="pec-diabetes-item-head">
          <span class="pec-diabetes-rank">5</span>
          <div><h4>${libelleCNOPriseEnChargeDenutrition(strategie.cno)}</h4><span>Complémentation orale</span></div>
        </div>
      <p>${
        strategie.cno === "d_emblee"
          ? "La stratégie retenue justifie d'intégrer les CNO avec l'alimentation enrichie, en tenant compte de la tolérance, des préférences et des objectifs nutritionnels."
          : strategie.cno === "si_echec"
            ? "Commencer par optimiser l'alimentation orale ; si cette stratégie ne permet pas de couvrir les besoins, discuter des CNO."
            : strategie.cno === "non_systematique"
              ? "Aucune indication automatique de CNO n'est générée à ce stade. Les envisager seulement si la couverture des besoins devient insuffisante ou si la situation clinique le justifie."
              : "Évaluer l'intérêt des CNO en fonction de la couverture réelle des besoins, de la tolérance et de l'évolution clinique."
      }</p>
    </article>
  `;

  const nePertinente = strategie.ne !== "non_systematique";

  const orientationHTML = nePertinente || malabsorption
    ? `
      <article class="pec-diabetes-item">
        <div class="pec-diabetes-item-head">
          <span class="pec-diabetes-rank">6</span>
          <div><h4>${libelleNEPriseEnChargeDenutrition(strategie.ne)}</h4><span>Escalade / orientation</span></div>
        </div>
        <p>La voie orale reste privilégiée lorsqu'elle est possible. Si elle est impossible ou insuffisante, l'indication d'une nutrition entérale relève d'une évaluation médicale/spécialisée.</p>
        ${senior ? `<p><strong>Nutrition parentérale :</strong> la synthèse HAS 2007 la réserve à des situations spécialisées. NutriFlow n'en génère jamais une indication automatique.</p>` : ""}
      </article>
    `
    : "";

  // VIGILANCES : uniquement sécurité et cohérence des données. Elles ne sont
  // ni des objectifs nutritionnels ni des éléments de suivi courant.
  const vigilances = [];

  if (niveauApports.code === "normaux" && apportsSousObjectif) {
    vigilances.push("Les apports sont déclarés comme non diminués, mais l'anamnèse calculée reste sous au moins un objectif de travail : vérifier la représentativité de l'anamnèse.");
  }

  if (niveauApports.code === "tres_diminues" && apportsQuantifies && !apportsSousObjectif) {
    vigilances.push("Une réduction d'au moins 50 % est déclarée alors que les apports calculés atteignent les objectifs de travail : vérifier la période de référence et la représentativité de l'anamnèse.");
  }

  if (malabsorption) {
    vigilances.push("La malabsorption renseignée ne permet pas, à elle seule, de déduire une indication de nutrition parentérale.");
  }

  if (risqueRenutrition.risqueEleveDocumente) {
    const details = [
      ...risqueRenutrition.majeurs,
      ...risqueRenutrition.mineurs
    ];
    vigilances.push(
      `Risque élevé de syndrome de renutrition à évaluer médicalement${details.length ? ` : ${details.join(" · ")}` : ""}. NutriFlow ne propose pas de protocole de renutrition.`
    );
  } else if (risqueRenutrition.terrains.length) {
    vigilances.push(
      `Vigilance vis-à-vis du syndrome de renutrition : ${risqueRenutrition.terrains.join(" · ")}. Les données présentes ne suffisent pas à classer automatiquement un haut risque selon les critères NICE.`
    );
  }

  const indexVigilances = orientationHTML ? 7 : 6;
  const indexSuivi = vigilances.length ? indexVigilances + 1 : indexVigilances;

  const vigilancesHTML = vigilances.length
    ? `
      <article class="pec-diabetes-item">
        <div class="pec-diabetes-item-head">
          <span class="pec-diabetes-rank">${indexVigilances}</span>
          <div><h4>Sécurité et cohérence des données</h4><span>Vigilances</span></div>
        </div>
        <ul>${vigilances.map(item => `<li>${echapperHTML(item)}</li>`).join("")}</ul>
      </article>
    `
    : "";

  const suiviHTML = `
    <article class="pec-diabetes-item">
      <div class="pec-diabetes-item-head">
          <span class="pec-diabetes-rank">${indexSuivi}</span>
          <div><h4>Réévaluer la réponse à l'intervention</h4><span>Suivi</span></div>
        </div>
      <div class="pec-diabetes-notice" style="margin-top:12px"><strong>Suivi :</strong> ${echapperHTML(strategie.reeval)}</div>
      <p>Suivre l'évolution pondérale et de l'état nutritionnel, les apports spontanés, la tolérance et l'adhésion à la stratégie. Chez la personne âgée, réévaluer également l'évolution de la pathologie sous-jacente.</p>
    </article>
  `;

  bloc.innerHTML = `
    <div class="pec-diabetes-header">
      <div>
        <span class="pec-diabetes-kicker">Dénutrition</span>
        <h3>Prise en charge — Dénutrition</h3>
      </div>
      <span class="pec-diabetes-validation">À valider par le diététicien</span>
    </div>

    <div class="pec-diabetes-notice">
      <strong>Profil utilisé pour la stratégie</strong>
      <p>${senior ? "Personne ≥ 70 ans" : "Adulte de 18 à 69 ans"} · ${echapperHTML(resultat.severite?.label || "Sévérité non déterminée")} · ${echapperHTML(niveauApports.label)}.</p>
    </div>

    <div class="pec-diabetes-section">
      <div class="pec-diabetes-section-title">
        <h4>Priorités et objectifs proposés</h4>
        <span>Selon les données actuellement disponibles</span>
      </div>
      <div class="pec-diabetes-grid">
      <article class="pec-diabetes-item">
        <div class="pec-diabetes-item-head">
          <span class="pec-diabetes-rank">1</span>
          <div><h4>Objectifs nutritionnels de travail</h4><span>Objectifs</span></div>
        </div>
        <div class="pec-diabetes-objective"><strong>Objectifs proposés</strong><div>${objectifsTravail}</div></div>
      </article>

      <article class="pec-diabetes-item">
        <div class="pec-diabetes-item-head">
          <span class="pec-diabetes-rank">2</span>
          <div><h4>Agir sur les causes identifiées</h4><span>Mécanismes à traiter</span></div>
        </div>
        <div class="pec-diabetes-section pec-diabetes-panel" style="margin-top:12px"><strong>Actions proposées</strong>${causesHTML}</div>
      </article>

      <article class="pec-diabetes-item">
        <div class="pec-diabetes-item-head">
          <span class="pec-diabetes-rank">3</span>
          <div><h4>${echapperHTML(strategie.orale)}</h4><span>Alimentation orale personnalisée</span></div>
        </div>
        <h5>Lecture utile de l'analyse</h5>
        ${interpretationApportsHTML}
        <div class="pec-diabetes-section pec-diabetes-panel" style="margin-top:12px"><strong>Actions à explorer</strong>
        ${opportunitesHTML}</div>
      </article>

      ${micronutritionHTML}
      ${cnoHTML}
      ${orientationHTML}
      ${vigilancesHTML}
      ${suiviHTML}
    </div>

    <div class="pec-diabetes-notice pec-diabetes-section denut-reference-box">${repere}</div>

    <div class="denut-pec-sources">
      <strong>Références intégrées au module</strong>
      <p>Diagnostic et gradation : HAS 2019 / fiche HAS 2021. Stratégie détaillée chez la personne âgée : HAS 2007. Repères et principes de nutrition hospitalière : ESPEN Hospital Nutrition 2021. Risque de syndrome de renutrition : critères NICE repris dans l'argumentaire HAS 2019.</p>
    </div>`;
}


// Enregistrement auprès de l'orchestrateur central.
window.enregistrerModulePathologique?.({
  id: "denutrition",
  champs: [
    "age", "taille", "poids", "denutPoidsHabituel", "denutPoids1Mois",
    "denutPoids6Mois", "denutReductionApports", "denutDureeReduction",
    "denutMalabsorption", "denutAgression", "denutMasseMusculaire",
    "denutSarcopenieConfirmee", "denutAlbumine", "mnaApports",
    "mnaPertePoids", "mnaMotricite", "mnaMaladieAigue", "mnaNeuro",
    "mnaMollet", "objectifEnergetique", "macro-proteines-slider",
    "macro-glucides-slider", "macro-lipides-slider"
  ],
  analyse() {
    afficherDenutritionDansRecommandations();
    afficherAnalyseDenutrition();
  },
  priseEnCharge: afficherPriseEnChargeDenutrition
});

