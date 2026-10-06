// ======================================================
// HTA — ANALYSE NUTRITIONNELLE
// ======================================================

function nombreHTA(valeur) {
  const nombre = Number.parseFloat(String(valeur ?? "").replace(",", "."));
  return Number.isFinite(nombre) ? nombre : null;
}

function formaterNombreHTA(valeur, decimales = 0) {
  return Number.isFinite(valeur)
    ? valeur.toLocaleString("fr-FR", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
      })
    : "—";
}

function obtenirLibelleClasseHTA(classe) {
  const libelles = {
    iec: "IEC",
    ara2: "ARA2",
    inhibiteur_calcique: "Inhibiteur calcique",
    diuretique_thiazidique: "Diurétique thiazidique",
    diuretique_anse: "Diurétique de l’anse",
    betabloquant: "Bêtabloquant",
    spironolactone: "Spironolactone",
    autre: "Autre classe"
  };

  return libelles[classe] ?? classe ?? "";
}

function obtenirStatutMaximumHTA(valeur, maximum, partiel = false, qualite = null) {
  if (!Number.isFinite(valeur) || !Number.isFinite(maximum)) {
    return { label: "Non évalué", classe: "non-evalue" };
  }
  if (typeof analyserStatutApport === "function") {
    return analyserStatutApport(valeur, { type: "max", max: maximum }, { partiel, qualite });
  }
  if (partiel) {
    return valeur > maximum
      ? { label: "Au-dessus du repère", classe: "eleve" }
      : { label: "À préciser", classe: "non-evalue" };
  }
  return valeur <= maximum
    ? { label: "Repère atteint", classe: "adequat" }
    : { label: "Au-dessus", classe: "eleve" };
}

function obtenirStatutMinimumHTA(valeur, minimum, partiel = false, qualite = null) {
  if (!Number.isFinite(valeur) || !Number.isFinite(minimum)) {
    return { label: "Non évalué", classe: "non-evalue" };
  }
  if (typeof analyserStatutApport === "function") {
    return analyserStatutApport(valeur, { type: "min", min: minimum }, { partiel, qualite });
  }
  if (partiel) {
    return valeur >= minimum
      ? { label: "Repère atteint", classe: "adequat" }
      : { label: "À préciser", classe: "non-evalue" };
  }
  return valeur < minimum
    ? { label: "Sous le repère", classe: "insuffisant" }
    : { label: "Repère atteint", classe: "adequat" };
}

function obtenirStatutPlageHTA(valeur, minimum, maximum) {
  if (!Number.isFinite(valeur)) {
    return { label: "Non évalué", classe: "non-evalue" };
  }

  if (Number.isFinite(minimum) && valeur < minimum) {
    return { label: "Sous le repère", classe: "insuffisant" };
  }

  if (Number.isFinite(maximum) && valeur > maximum) {
    return { label: "Au-dessus du repère", classe: "eleve" };
  }

  return { label: "Repère atteint", classe: "adequat" };
}

function obtenirApportHTA(anamnese, key) {
  const apport = anamnese?.apports?.[key] ?? null;

  return {
    valeur: Number.isFinite(apport?.valeur) ? apport.valeur : null,
    partiel: apport?.partiel === true,
    qualite: apport?.qualite ?? null
  };
}

function obtenirSourcesNutrimentHTA(anamnese, key, limite = 5) {
  const aliments = Array.isArray(anamnese?.aliments)
    ? anamnese.aliments
    : [];

  return aliments
    .map(aliment => {
      const valeur = aliment?.nutriments?.[key];

      if (
        !Number.isFinite(valeur) ||
        valeur <= 0 ||
        !Number.isFinite(aliment?.poidsJournalier) ||
        aliment.poidsJournalier <= 0
      ) {
        return null;
      }

      return {
        nom: aliment.nom || "Aliment non nommé",
        repas: aliment.repas || "Repas non renseigné",
        valeur,
        poidsJournalier: aliment.poidsJournalier
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.valeur - a.valeur)
    .slice(0, limite);
}

function construireListeSourcesHTA(sources, unite) {
  if (!sources.length) {
    return `<div class="hta-analysis-empty">Aucune source exploitable dans l’anamnèse.</div>`;
  }

  return sources.map((source, index) => `
    <div class="hta-source-row">
      <span class="hta-source-rank">${index + 1}</span>
      <div class="hta-source-name">
        <strong>${echapperHTML(source.nom)}</strong>
        <span>${formaterNombreHTA(source.poidsJournalier, 1)} g/j consommés · ${echapperHTML(source.repas)}</span>
      </div>
      <strong class="hta-source-value">${formaterNombreHTA(source.valeur, 0)} ${unite}/j</strong>
    </div>
  `).join("");
}

function obtenirVigilancesTraitementHTA(hta) {
  const classes = hta?.traitement?.classes ?? [];
  const vigilances = [];

  if (classes.some(classe => ["diuretique_thiazidique", "diuretique_anse"].includes(classe))) {
    vigilances.push({
      titre: "Potassium — vigilance hypokaliémie",
      detail: "Un diurétique thiazidique ou de l’anse est renseigné. L’interprétation des apports en potassium doit rester cohérente avec le contexte clinique et biologique."
    });
  }

  if (classes.some(classe => ["iec", "ara2", "spironolactone"].includes(classe))) {
    vigilances.push({
      titre: "Potassium — vigilance hyperkaliémie",
      detail: "Un IEC, un ARA2 ou la spironolactone est renseigné. Une augmentation systématique du potassium ne doit pas être proposée sans tenir compte du contexte clinique et biologique."
    });
  }

  return vigilances;
}

function obtenirLibelleHabitudeSelHTA(valeur) {
  const libelles = {
    jamais: "Jamais",
    rarement: "Rarement",
    souvent: "Souvent",
    systematique: "Systématiquement / presque toujours",
    occasionnel: "Occasionnellement",
    regulier: "Régulièrement",
    quotidien: "Quotidiennement",
    non: "Non",
    oui_potassium: "Oui — contenant du potassium",
    oui_inconnu: "Oui — composition inconnue",
    inconnu: "Inconnu"
  };
  return libelles[valeur] ?? "Non renseigné";
}

function construireHabitudesSelHTA(habitudes) {
  const sel = habitudes?.sel ?? {};
  return [
    { label: "Sel à la cuisson", valeur: obtenirLibelleHabitudeSelHTA(sel.cuisson) },
    { label: "Sel à table", valeur: obtenirLibelleHabitudeSelHTA(sel.table) },
    { label: "Bouillons / sauces salées", valeur: obtenirLibelleHabitudeSelHTA(sel.assaisonnementsSales) },
    { label: "Substitut de sel", valeur: obtenirLibelleHabitudeSelHTA(sel.substitut) }
  ];
}

function evaluerSelDiscretionnaireHTA(habitudes) {
  const sel = habitudes?.sel ?? {};
  const ajoutFrequent = ["souvent", "systematique"].includes(sel.cuisson) ||
    ["souvent", "systematique"].includes(sel.table) ||
    ["regulier", "quotidien"].includes(sel.assaisonnementsSales);

  return {
    ajoutFrequent,
    substitutPotassium: sel.substitut === "oui_potassium"
  };
}

function analyserNatriureseHTA(hta, sodiumAlimentaire) {
  const natriurese = nombreHTA(hta?.natriurese24h);
  if (!Number.isFinite(natriurese)) return null;

  // 1 mmol de sodium = 23 mg de sodium ; 1 mmol de NaCl = 58,5 mg.
  const sodiumUrinaireMg = natriurese * 23;
  const equivalentSelG = natriurese * 58.5 / 1000;
  const ecartMg = Number.isFinite(sodiumAlimentaire)
    ? sodiumAlimentaire - sodiumUrinaireMg
    : null;

  return {
    natriurese,
    sodiumUrinaireMg,
    equivalentSelG,
    ecartMg,
    date: hta?.natriureseDate || "",
    qualite: hta?.natriureseQualite || ""
  };
}

function construireContexteCliniqueHTA(hta) {
  const elements = [];

  if (Number.isFinite(hta?.pressionArterielle?.cabinet?.pas) || Number.isFinite(hta?.pressionArterielle?.cabinet?.pad)) {
    elements.push({
      label: "PA cabinet",
      valeur: `${formaterNombreHTA(hta.pressionArterielle.cabinet.pas, 0)} / ${formaterNombreHTA(hta.pressionArterielle.cabinet.pad, 0)} mmHg`
    });
  }

  if (Number.isFinite(hta?.natriurese24h)) {
    const qualiteRecueil = {
      complet: "recueil déclaré complet",
      incomplet: "recueil possiblement incomplet",
      inconnu: "qualité inconnue"
    }[hta?.natriureseQualite];

    const precision = [
      hta?.natriureseDate ? `du ${hta.natriureseDate}` : "",
      qualiteRecueil || ""
    ].filter(Boolean).join(" · ");

    elements.push({
      label: "Natriurèse 24 h",
      valeur: `${formaterNombreHTA(hta.natriurese24h, 0)} mmol/24 h${precision ? ` · ${precision}` : ""}`
    });
  }

  if (Number.isFinite(hta?.alcoolVerresJour)) {
    elements.push({
      label: "Alcool déclaré",
      valeur: `${formaterNombreHTA(hta.alcoolVerresJour, 1)} verre(s) standard/j`
    });
  }

  if (Number.isFinite(hta?.biologie?.potassium)) {
    elements.push({
      label: "K⁺ plasmatique",
      valeur: `${formaterNombreHTA(hta.biologie.potassium, 1)} ${hta.biologie.potassiumUnite || "mmol/L"}`
    });
  }

  if (Number.isFinite(hta?.biologie?.dfg)) {
    elements.push({
      label: "DFG estimé",
      valeur: `${formaterNombreHTA(hta.biologie.dfg, 0)} ${hta.biologie.dfgUnite || "mL/min/1,73 m²"}`
    });
  }

  return elements;
}

function afficherAnalyseHTA() {
  const section = document.getElementById("analyseHTASection");
  const container = document.getElementById("analyseHTAContainer");

  if (!section || !container) return;

  const synthese = typeof construireSynthesePatient === "function"
    ? construireSynthesePatient()
    : null;
  const hta = synthese?.hta ?? null;

  if (!hta) {
    section.hidden = true;
    container.innerHTML = "";
    return;
  }

  section.hidden = false;

  const objectif = typeof obtenirObjectifSelHTA === "function"
    ? obtenirObjectifSelHTA()
    : null;

  const anamnese = synthese?.anamnese ?? null;
  const anamneseDisponible = anamnese?.disponible === true;

  if (!anamneseDisponible) {
    container.innerHTML = `
      <section class="nutrition-calc-card analyse-hta-card">
        <div class="nutrition-calc-card-header">
          <span class="nutrition-calc-kicker">HTA</span>
          <h3>Analyse nutritionnelle spécifique</h3>
          <p>Ajoutez des aliments dans l’anamnèse alimentaire pour comparer les apports en sodium, sel et potassium à l’objectif HTA retenu.</p>
        </div>
      </section>`;
    return;
  }

  const sodium = obtenirApportHTA(anamnese, "sodium");
  const selCiqual = obtenirApportHTA(anamnese, "salt");
  const potassium = obtenirApportHTA(anamnese, "potassium");

  const sodiumMax = nombreHTA(objectif?.sodiumMax);
  const selMax = nombreHTA(objectif?.selMax);
  const potassiumMin = 3510;

  const statutSodium = obtenirStatutMaximumHTA(sodium.valeur, sodiumMax, sodium.partiel, sodium.qualite);
  const statutSel = obtenirStatutMaximumHTA(selCiqual.valeur, selMax, selCiqual.partiel, selCiqual.qualite);
  const statutPotassium = obtenirStatutMinimumHTA(potassium.valeur, potassiumMin, potassium.partiel, potassium.qualite);

  const sourcesSodium = obtenirSourcesNutrimentHTA(anamnese, "sodium", 5);
  const sourcesPotassium = obtenirSourcesNutrimentHTA(anamnese, "potassium", 5);
  const vigilances = obtenirVigilancesTraitementHTA(hta);
  const contexteClinique = construireContexteCliniqueHTA(hta);
  const classesTraitement = hta.traitement?.classes ?? [];
  const habitudesSel = construireHabitudesSelHTA(synthese?.habitudes);
  const evaluationSel = evaluerSelDiscretionnaireHTA(synthese?.habitudes);
  const analyseNatriurese = analyserNatriureseHTA(hta, sodium.valeur);

  const notePartielle = (item) => (item.partiel || item.qualite?.estime)
    ? `<span class="analysis-quality-icon" tabindex="0" data-tooltip="La valeur peut inclure des données de composition complémentaires ou un encadrement d'incertitude." title="La valeur peut inclure des données de composition complémentaires ou un encadrement d'incertitude." aria-label="Information sur la qualité de la composition">ⓘ</span>`
    : "";

  const valeurHTA = (item, decimales, unite) => {
    if (!Number.isFinite(item?.valeur)) return "Non disponible";
    const utiliseEstimation = item.partiel && item.qualite?.intervalleDisponible === true && Number.isFinite(item.qualite?.valeurEstimee);
    const valeur = utiliseEstimation ? item.qualite.valeurEstimee : item.valeur;
    const prefixe = utiliseEstimation || item.qualite?.estime === true ? "≈ " : (item.partiel ? "≥ " : "");
    return `${prefixe}${formaterNombreHTA(valeur, decimales)} ${unite}`;
  };

  const micronutritionAnalyseHTML =
    typeof construireHTMLAnalyseMicronutritionnelle === "function"
      ? construireHTMLAnalyseMicronutritionnelle(
          ["calcium", "magnesium"],
          {
            synthese,
            contextePathologique: "hta",
            titre: "Calcium et magnésium — apports, repères et biologie",
            sousTitre: "Ces micronutriments complètent l'analyse HTA comme indicateurs de couverture alimentaire. Sodium et potassium restent analysés dans le bloc principal."
          }
        )
      : "";

  container.innerHTML = `
    <section class="nutrition-calc-card analyse-hta-card">
      <div class="nutrition-calc-card-header hta-analysis-header">
        <div>
          <span class="nutrition-calc-kicker">HTA</span>
          <h3>Analyse sodium, sel et potassium</h3>
          <p>Comparaison des apports estimés dans l’anamnèse avec l’objectif sélectionné dans Calculs nutritionnels.</p>
        </div>
        <span class="hta-objective-badge">${echapperHTML(objectif?.libelle || "Objectif HTA")}</span>
      </div>

      <div class="hta-objective-summary">
        <div>
          <span>Objectif sel</span>
          <strong>${Number.isFinite(selMax) ? `≤ ${formaterNombreHTA(selMax, 1)} g/j` : "À définir"}</strong>
        </div>
        <div>
          <span>Équivalent sodium</span>
          <strong>${Number.isFinite(sodiumMax) ? `≤ ${formaterNombreHTA(sodiumMax, 0)} mg/j` : "À définir"}</strong>
        </div>
        <div>
          <span>Repère potassium HTA</span>
          <strong>≥ 3 510 mg/j</strong>
        </div>
      </div>

      <div class="hta-analysis-table-wrap">
        <table class="hta-analysis-table">
          <thead>
            <tr>
              <th>Indicateur</th>
              <th>Apport observé</th>
              <th>Objectif / repère</th>
              <th>Situation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Sodium</strong>${notePartielle(sodium)}</td>
              <td>${valeurHTA(sodium, 0, "mg/j")}</td>
              <td>${Number.isFinite(sodiumMax) ? `≤ ${formaterNombreHTA(sodiumMax, 0)} mg/j` : "À définir"}</td>
              <td><span class="recommendation-status ${statutSodium.classe}">${statutSodium.label}</span></td>
            </tr>
            
            
            <tr>
              <td><strong>Potassium</strong>${notePartielle(potassium)}</td>
              <td>${valeurHTA(potassium, 0, "mg/j")}</td>
              <td>≥ 3 510 mg/j</td>
              <td><span class="recommendation-status ${statutPotassium.classe}">${statutPotassium.label}</span></td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Sel</strong>${notePartielle(selCiqual)}</td>
              <td>${valeurHTA(selCiqual, 1, "g/j")}</td>
              <td>${Number.isFinite(selMax) ? `≤ ${formaterNombreHTA(selMax, 1)} g/j` : "À définir"}</td>
              <td><span class="recommendation-status ${statutSel.classe}">${statutSel.label}</span></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="hta-analysis-note">
        <strong>Lecture du sel :</strong>
        la valeur « Sel » reprend le nutriment sel lorsqu’il est disponible dans la base CIQUAL. Le sel ajouté à la cuisson ou à table n’est pas quantifié automatiquement dans ce total.
      </div>

      <div class="diabetes-analysis-block">
        <div class="diabetes-analysis-block-header">
          <h4>Habitudes de sel ajouté</h4>
          <span>Ces informations complètent l’estimation issue de l’anamnèse CIQUAL.</span>
        </div>

        <div class="hta-clinical-grid">
          ${habitudesSel.map(item => `
            <div>
              <span>${item.label}</span>
              <strong>${echapperHTML(item.valeur)}</strong>
            </div>
          `).join("")}
        </div>

        ${evaluationSel.ajoutFrequent ? `
          <div class="hta-vigilance-item">
            <strong>Sel discrétionnaire à prendre en compte</strong>
            <span>Un ajout fréquent de sel ou d’assaisonnements salés est déclaré. L’apport réel en sel peut donc être supérieur à l’estimation calculée à partir des aliments CIQUAL.</span>
          </div>` : ""}

        ${evaluationSel.substitutPotassium ? `
          <div class="hta-vigilance-item">
            <strong>Substitut de sel contenant du potassium</strong>
            <span>À intégrer à la vigilance potassium, notamment si un IEC, un ARA2, la spironolactone ou une altération de la fonction rénale est présent.</span>
          </div>` : ""}
      </div>

      ${analyseNatriurese ? `
      <div class="diabetes-analysis-block">
        <div class="diabetes-analysis-block-header">
          <h4>Natriurèse des 24 h</h4>
          <span>Donnée urinaire complémentaire de l’estimation alimentaire.</span>
        </div>

        <div class="hta-objective-summary">
          <div>
            <span>Natriurèse mesurée</span>
            <strong>${formaterNombreHTA(analyseNatriurese.natriurese, 0)} mmol/24 h</strong>
          </div>
          <div>
            <span>Sodium urinaire correspondant</span>
            <strong>≈ ${formaterNombreHTA(analyseNatriurese.sodiumUrinaireMg, 0)} mg/24 h</strong>
          </div>
          <div>
            <span>Équivalent NaCl</span>
            <strong>≈ ${formaterNombreHTA(analyseNatriurese.equivalentSelG, 1)} g/24 h</strong>
          </div>
        </div>

        ${Number.isFinite(analyseNatriurese.ecartMg) ? `
          <div class="hta-analysis-note">
            <strong>Confrontation avec l’anamnèse :</strong>
            apport alimentaire estimé ${formaterNombreHTA(sodium.valeur, 0)} mg/j ·
            sodium urinaire correspondant ≈ ${formaterNombreHTA(analyseNatriurese.sodiumUrinaireMg, 0)} mg/24 h ·
            écart brut ${formaterNombreHTA(Math.abs(analyseNatriurese.ecartMg), 0)} mg.
          </div>` : ""}

        <div class="hta-analysis-note">
          La natriurèse des 24 h est affichée comme indicateur complémentaire et ne constitue pas ici une mesure directe et parfaitement interchangeable avec l’apport alimentaire d’un jour donné. La qualité du recueil, le contexte clinique et la variabilité quotidienne doivent être pris en compte.
        </div>
      </div>` : ""}

    <div class="diabetes-analysis-block hta-sources-card">
      <div class="diabetes-analysis-block-header">
        <h4>Principales sources</h4>
        <span>Classement calculé à partir des quantités et fréquences renseignées dans l’anamnèse.</span>
      </div>

      <div class="hta-sources-columns">
        <div class="hta-source-panel">
          <div class="hta-source-panel-title">
            <strong>Sodium</strong>
          </div>
          ${construireListeSourcesHTA(sourcesSodium, "mg")}
        </div>

        <div class="hta-source-panel">
          <div class="hta-source-panel-title">
            <strong>Potassium</strong>
          </div>
          ${construireListeSourcesHTA(sourcesPotassium, "mg")}
        </div>
      </div>
    </div>

    ${micronutritionAnalyseHTML}

    <div class="diabetes-analysis-block">
      <div class="diabetes-analysis-block-header">
        <h4>Traitement et vigilances</h4>
      </div>

      ${classesTraitement.length ? `
        <div class="hta-treatment-line">
          <span>Classe(s) renseignée(s)</span>
          <strong>${classesTraitement.map(obtenirLibelleClasseHTA).map(echapperHTML).join(" · ")}</strong>
        </div>` : `
        <div class="hta-analysis-empty">Aucune classe antihypertensive renseignée.</div>`}

      ${vigilances.length ? `
        <div class="hta-vigilance-list">
          ${vigilances.map(item => `
            <div class="hta-vigilance-item">
              <strong>${item.titre}</strong>
              <span>${item.detail}</span>
            </div>
          `).join("")}
        </div>` : ""}

      ${contexteClinique.length ? `
        <div class="hta-clinical-grid">
          ${contexteClinique.map(item => `
            <div>
              <span>${item.label}</span>
              <strong>${echapperHTML(item.valeur)}</strong>
            </div>
          `).join("")}
        </div>` : ""}

      <div class="hta-analysis-note">
        Les données biologiques et thérapeutiques sont affichées comme éléments de contexte. Ce bloc n’effectue pas d’interprétation biologique automatique.
      </div>
    </div>
    </section>`;
}

// ======================================================
// HTA — PRISE EN CHARGE PERSONNALISÉE
// ======================================================

function construirePrioritesPriseEnChargeHTA(donnees) {
  const priorites = [];

  const ajouter = (
    niveau,
    code,
    titre,
    detail,
    objectif,
    actions = [],
    suivi = [],
    origine = "Dossier patient"
  ) => {
    if (priorites.some(item => item.code === code)) return;

    priorites.push({
      niveau,
      code,
      titre,
      detail,
      objectif,
      actions: Array.isArray(actions) ? actions.filter(Boolean) : [],
      suivi: Array.isArray(suivi) ? suivi.filter(Boolean) : [],
      origine
    });
  };

  const {
    synthese,
    sodium,
    sel,
    potassium,
    sodiumMax,
    selMax,
    potassiumMin,
    evaluationSel,
    classesTraitement,
    hta,
    sourcesSodium
  } = donnees;

  const sodiumEleve =
    Number.isFinite(sodium?.valeur) &&
    Number.isFinite(sodiumMax) &&
    sodium.valeur > sodiumMax;

  const selEleve =
    Number.isFinite(sel?.valeur) &&
    Number.isFinite(selMax) &&
    sel.valeur > selMax;

  if (sodiumEleve || selEleve) {
    const valeurs = [];

    if (Number.isFinite(sodium?.valeur) && Number.isFinite(sodiumMax)) {
      valeurs.push(
        `${sodium?.partiel ? "sodium ≥ " : "sodium estimé "}${formaterNombreHTA(sodium.valeur, 0)} mg/j pour un objectif ≤ ${formaterNombreHTA(sodiumMax, 0)} mg/j`
      );
    }

    if (Number.isFinite(sel?.valeur) && Number.isFinite(selMax)) {
      valeurs.push(
        `${sel?.partiel ? "sel CIQUAL ≥ " : "sel CIQUAL "}${formaterNombreHTA(sel.valeur, 1)} g/j pour un objectif ≤ ${formaterNombreHTA(selMax, 1)} g/j`
      );
    }

    const principalesSources = (sourcesSodium || [])
      .slice(0, 3)
      .map(item => item.nom)
      .filter(Boolean);

    const detailSources = principalesSources.length
      ? ` Principales sources identifiées : ${principalesSources.join(", ")}.`
      : "";

    const actions = principalesSources.length
      ? [
          `Commencer par les principales sources réellement observées dans l'anamnèse : ${principalesSources.join(", ")}.`,
          "Rechercher avec le patient une réduction réaliste de fréquence ou de portion et, lorsque c'est possible, une alternative moins salée."
        ]
      : [
          "Identifier dans l'alimentation habituelle les aliments transformés, pains, fromages, charcuteries, plats préparés, sauces, bouillons et condiments qui contribuent le plus à l'apport sodé.",
          "Choisir avec le patient un ou deux changements prioritaires plutôt qu'une restriction globale difficile à maintenir."
        ];

    ajouter(
      "haute",
      "hta-sodium-eleve",
      "Réduire l'excès de sodium / sel",
      `${valeurs.join(" · ")}.${detailSources}`,
      "Se rapprocher progressivement de l'objectif défini dans Calculs nutritionnels en ciblant d'abord les principales sources alimentaires de sodium.",
      actions,
      [
        "Réévaluer les apports en sodium / sel.",
        "Vérifier l'évolution des principales sources alimentaires et la faisabilité des changements."
      ],
      "Analyse HTA"
    );
  }

  if (evaluationSel?.ajoutFrequent) {
    ajouter(
      sodiumEleve || selEleve ? "haute" : "moyenne",
      "hta-sel-discretionnaire",
      "Travailler le sel ajouté",
      "Le patient déclare un ajout fréquent de sel ou d'assaisonnements salés. Cet apport n'est pas quantifié automatiquement dans le total CIQUAL.",
      "Réduire progressivement le sel ajouté à la cuisson, à table et/ou via les assaisonnements salés, selon les habitudes réellement déclarées.",
      [
        "Choisir d'abord le moment où l'ajout est le plus fréquent : cuisson, table ou assaisonnements.",
        "Tester des alternatives compatibles avec les habitudes du patient : herbes, épices, aromates, ail, oignon, citron ou vinaigre."
      ],
      [
        "Réévaluer la fréquence du sel ajouté et des assaisonnements salés.",
        "Vérifier l'acceptabilité gustative des changements retenus."
      ],
      "Patient — habitudes de sel"
    );
  }

  const statutPotassiumPEC = obtenirStatutMinimumHTA(
    potassium?.valeur,
    potassiumMin,
    potassium?.partiel === true,
    potassium?.qualite ?? null
  );
  const potassiumBas = statutPotassiumPEC?.classe === "insuffisant";

  const fruitsLegumesFaibles = synthese?.habitudes?.fruitsLegumes === "faible";
  const classesVigilanceK = ["iec", "ara2", "spironolactone"];
  const vigilanceHyperK = (classesTraitement || []).some(
    classe => classesVigilanceK.includes(classe)
  );
  const contexteRenalDisponible =
    Number.isFinite(hta?.biologie?.dfg) ||
    Number.isFinite(hta?.biologie?.potassium);

  if (potassiumBas || fruitsLegumesFaibles) {
    const details = [];

    if (potassiumBas) {
      details.push(
        `apport estimé en potassium ${formaterNombreHTA(potassium.valeur, 0)} mg/j pour un repère HTA ≥ ${formaterNombreHTA(potassiumMin, 0)} mg/j`
      );
    }

    if (fruitsLegumesFaibles) {
      details.push("consommation de fruits et légumes déclarée faible");
    }

    const contexteVigilance = vigilanceHyperK || contexteRenalDisponible;

    ajouter(
      "moyenne",
      "hta-qualite-vegetale-potassium",
      "Renforcer la qualité végétale de l'alimentation",
      `${details.join(" · ")}.${contexteVigilance ? " Le contexte thérapeutique et/ou biologique doit être pris en compte avant toute augmentation systématique du potassium." : ""}`,
      contexteVigilance
        ? "Évaluer les sources alimentaires de potassium et la place des fruits, légumes, légumineuses et céréales complètes en tenant compte du contexte biologique et thérapeutique."
        : "Augmenter progressivement la place des fruits, légumes, légumineuses et céréales complètes selon les habitudes et la tolérance du patient.",
      [
        "Repérer ce qui est déjà consommé et choisir des ajouts ou remplacements réalistes.",
        contexteVigilance
          ? "Ne pas proposer d'augmentation systématique du potassium ni de substitut potassique sans tenir compte de la kaliémie, de la fonction rénale et du traitement."
          : "Favoriser des aliments naturellement riches en potassium dans le cadre d'une alimentation globalement équilibrée."
      ],
      [
        "Réévaluer la consommation de fruits et légumes.",
        potassiumBas ? "Réévaluer les apports alimentaires en potassium." : "",
        contexteVigilance ? "Confronter les conseils au contexte biologique et thérapeutique disponible." : ""
      ],
      "Analyse HTA + habitudes alimentaires"
    );
  }

  const alcool = nombreHTA(hta?.alcoolVerresJour);

  if (Number.isFinite(alcool) && alcool > 2) {
    // Une priorité n'est créée que lorsque le dépassement quotidien est certain.
    // Avec 0–2 verres/j, les données actuelles ne suffisent pas à conclure sur le
    // total hebdomadaire ni sur les jours sans alcool : ce point reste éducatif /
    // à documenter, sans devenir automatiquement une priorité.
    ajouter(
      "moyenne",
      "hta-alcool",
      "Consommation d'alcool au-dessus du repère quotidien de réduction des risques",
      `${formaterNombreHTA(alcool, 1)} verre(s) standard/jour déclaré(s). Repères de réduction des risques : maximum 2 verres standard par jour, maximum 10 par semaine et des jours sans alcool.`,
      "Préciser le profil réel de consommation et définir avec le patient une réduction adaptée et progressive.",
      [
        "Préciser le nombre de jours de consommation, le total hebdomadaire et les situations associées.",
        "Définir un objectif réaliste avec le patient plutôt qu'une consigne générique."
      ],
      [
        "Réévaluer la quantité quotidienne, le total hebdomadaire et les jours sans alcool.",
        "Vérifier la faisabilité de l'objectif retenu."
      ],
      "Patient"
    );
  }

  const activitePAL = nombreHTA(synthese?.contexte?.activitePAL);

  if (Number.isFinite(activitePAL) && activitePAL <= 1.4) {
    ajouter(
      "moyenne",
      "hta-activite-physique",
      "Activité physique à renforcer",
      `Niveau d'activité renseigné : ${synthese?.contexte?.activite || "faible"} (PAL ${formaterNombreHTA(activitePAL, 1)}).`,
      "Favoriser une activité physique régulière et adaptée aux possibilités du patient.",
      [
        "Identifier une activité compatible avec les capacités, les contraintes et les préférences du patient.",
        "Construire une progression réaliste et régulière plutôt qu'un objectif brutal."
      ],
      [
        "Réévaluer le niveau d'activité et la tolérance.",
        "Vérifier l'adhésion à l'objectif choisi."
      ],
      "Contexte de vie"
    );
  }

  if (hta?.tabac === "actif") {
    ajouter(
      "moyenne",
      "hta-tabac",
      "Tabagisme actif à intégrer au parcours cardiovasculaire",
      `Un tabagisme actif est renseigné${hta?.tabacDetails ? ` : ${hta.tabacDetails}` : "."}`,
      "Intégrer l'arrêt du tabac parmi les objectifs de réduction du risque cardiovasculaire, dans le respect du rôle du diététicien et du parcours de soins.",
      [
        "Informer le patient que le tabac constitue un facteur de risque cardiovasculaire majeur.",
        "Encourager un accompagnement adapté par le médecin, le pharmacien ou un professionnel du sevrage si le patient souhaite agir sur cet axe."
      ],
      [
        "Réévaluer le statut tabagique et le souhait d'accompagnement."
      ],
      "Patient"
    );
  }

  const imc = nombreHTA(synthese?.anthropometrie?.imc);
  const pathologies = synthese?.pathologies?.selectionnees ?? [];
  const modulePoidsActif = pathologies.some(item =>
    /ob[eé]sit|surpoids/i.test(String(item))
  );

  if (Number.isFinite(imc) && imc >= 25 && !modulePoidsActif) {
    ajouter(
      "basse",
      "hta-surcharge-ponderale",
      "Surcharge pondérale à prendre en compte",
      `IMC calculé : ${formaterNombreHTA(imc, 1)} kg/m².`,
      "Si le patient souhaite travailler cet axe, intégrer la gestion pondérale dans une stratégie globale sans créer une restriction supplémentaire isolée.",
      [
        "Clarifier avec le patient si le poids constitue un objectif pertinent dans sa prise en charge.",
        "Articuler cet axe avec les besoins énergétiques, la qualité alimentaire et l'activité physique."
      ],
      [
        "Suivre l'évolution pondérale uniquement si cet objectif est retenu.",
        "Surveiller la qualité des apports et l'état nutritionnel."
      ],
      "Anthropométrie"
    );
  }

  const ordre = { haute: 0, moyenne: 1, basse: 2 };

  return priorites.sort(
    (a, b) => (ordre[a.niveau] ?? 9) - (ordre[b.niveau] ?? 9)
  );
}

function cartePriseEnChargeHTA(element, index) {
  const libelles = {
    haute: "Priorité élevée",
    moyenne: "À travailler",
    basse: "À considérer"
  };

  const actionsHTML = element.actions?.length
    ? element.actions
        .map((action, actionIndex) => `${actionIndex + 1}. ${echapperHTML(action)}`)
        .join("<br>")
    : "À définir avec le patient.";

  const suiviHTML = element.suivi?.length
    ? element.suivi.map(echapperHTML).join(" · ")
    : "Réévaluer selon l'évolution clinique et les objectifs retenus.";

  return `
    <article class="pec-diabetes-item pec-hta-item">
      <div class="pec-diabetes-item-head">
        <span class="pec-diabetes-rank">${index + 1}</span>
        <div>
          <h4>${echapperHTML(element.titre)}</h4>
          <span>${libelles[element.niveau] || "À considérer"}</span>
        </div>
      </div>

      <p>${echapperHTML(element.detail)}</p>

      <div class="pec-diabetes-objective">
        <strong>Objectif proposé</strong>
        <span>${echapperHTML(element.objectif)}</span>
      </div>

      <div class="pec-diabetes-section pec-diabetes-panel pec-actions-panel">
        <strong>Actions proposées</strong>
        <span>${actionsHTML}</span>
      </div>

      <div class="pec-diabetes-objective">
        <strong>Suivi</strong>
        <span>${suiviHTML}</span>
      </div>

      <div class="pec-diabetes-source">
        Donnée source : ${echapperHTML(element.origine || "Dossier patient")}
      </div>
    </article>`;
}

function construireEducationNutritionnelleHTA(donnees, priorites) {
  const education = [];
  const codes = new Set(priorites.map(item => item.code));
  const ajouter = (titre, detail) => {
    if (education.some(item => item.titre === titre)) return;
    education.push({ titre, detail });
  };

  const {
    sourcesSodium,
    evaluationSel,
    synthese,
    hta
  } = donnees;

  if (
    codes.has("hta-sodium-eleve") ||
    codes.has("hta-sel-discretionnaire") ||
    (sourcesSodium || []).length
  ) {
    ajouter(
      "Comprendre sel et sodium",
      "Expliquer la différence entre sel (NaCl) et sodium, ainsi que la présence de sel visible et de sel déjà contenu dans les aliments. Pour la lecture des étiquettes : 1 g de sodium correspond approximativement à 2,5 g de sel."
    );
  }

  if ((sourcesSodium || []).length) {
    ajouter(
      "Lire les étiquettes et comparer les produits",
      "Apprendre au patient à comparer la teneur en sel ou en sodium pour 100 g entre deux produits similaires et à relier cette information aux aliments réellement consommés."
    );

    const principalesSources = sourcesSodium
      .slice(0, 3)
      .map(item => item.nom)
      .filter(Boolean);

    if (principalesSources.length) {
      ajouter(
        "Reconnaître ses propres sources de sel",
        `Utiliser l'anamnèse comme support éducatif : les principaux contributeurs actuellement identifiés sont ${principalesSources.join(", ")}.`
      );
    }
  }

  if (evaluationSel?.ajoutFrequent) {
    ajouter(
      "Assaisonner autrement",
      "Travailler le goût sans dépendre systématiquement du sel : herbes, épices, aromates, ail, oignon, citron, vinaigre et techniques culinaires qui préservent la saveur."
    );
  }

  if (
    codes.has("hta-qualite-vegetale-potassium") ||
    synthese?.habitudes?.fruitsLegumes === "faible"
  ) {
    ajouter(
      "Construire une alimentation plus végétale",
      "Utiliser comme repères pratiques les fruits, légumes, légumineuses et céréales complètes, dans une logique proche du modèle méditerranéen. Les conseils sur le potassium restent à individualiser si un contexte rénal ou thérapeutique est présent."
    );
  }


  const alcool = nombreHTA(hta?.alcoolVerresJour);
  if (Number.isFinite(alcool) && alcool > 0 && !codes.has("hta-alcool")) {
    ajouter(
      "Situer la consommation d'alcool dans les repères",
      "La donnée quotidienne renseignée ne permet pas, à elle seule, d'évaluer le maximum de 10 verres par semaine ni la présence de jours sans alcool. Préciser ces éléments avant de transformer cet axe en objectif de réduction."
    );
  }

  if (!education.length) {
    ajouter(
      "Consolider l'autonomie du patient",
      "Vérifier que le patient sait repérer les principales sources de sel, interpréter l'étiquetage et maintenir une alimentation variée riche en aliments peu transformés."
    );
  }

  return education;
}

function construireMicronutritionHTA() {
  if (typeof construirePriseEnChargeMicronutritionnelle !== "function") return [];

  const liens = {
    magnesium: "Une couverture alimentaire suffisante en magnésium s'intègre à une alimentation de qualité dans l'HTA. NutriFlow ne transforme pas ce constat en indication de supplémentation.",
    calcium: "Une couverture alimentaire suffisante en calcium participe à la qualité globale du modèle alimentaire proposé dans l'HTA ; l'objectif est d'abord de couvrir les besoins par l'alimentation."
  };

  return ["magnesium", "calcium"]
    .map(code => construirePriseEnChargeMicronutritionnelle(code, { contextePathologique: "hta", lien: liens[code] }))
    .filter(Boolean);
}

function construireTraitementsPriseEnChargeHTA(donnees) {
  const traitements = [];
  const {
    hta,
    classesTraitement
  } = donnees;

  const classes = classesTraitement || [];
  const ajouter = (titre, detail) => {
    if (traitements.some(item => item.titre === titre)) return;
    traitements.push({ titre, detail });
  };

  if (classes.some(classe => ["iec", "ara2"].includes(classe))) {
    ajouter(
      "IEC / ARA2",
      "Le suivi médical associe notamment sodium, potassium et créatinine. Les conseils nutritionnels concernant le potassium et les substituts de sel doivent rester cohérents avec ce contexte biologique et thérapeutique."
    );
  }

  if (classes.includes("spironolactone")) {
    ajouter(
      "Spironolactone",
      "Renforcer la prudence avec les apports supplémentaires en potassium et les substituts de sel potassiques ; NutriFlow ne propose aucune modification du traitement."
    );
  }

  if (
    classes.some(classe =>
      ["diuretique_thiazidique", "diuretique_anse"].includes(classe)
    )
  ) {
    ajouter(
      "Traitement diurétique",
      "Interpréter les apports en potassium en tenant compte de la kaliémie, de la fonction rénale, de la tolérance et du contexte clinique renseignés."
    );
  }

  if (hta?.traitement?.tolerance) {
    ajouter(
      "Tolérance rapportée",
      `Élément déclaré par le patient : ${hta.traitement.tolerance}. À transmettre au prescripteur si cela peut influencer l'alimentation, l'hydratation ou l'adhésion au traitement.`
    );
  }

  if (hta?.traitement?.observance) {
    ajouter(
      "Adhésion au traitement rapportée",
      `Information renseignée : ${hta.traitement.observance}. La prise en charge diététique peut soutenir l'adhésion globale, sans modifier la prescription.`
    );
  }

  return traitements;
}

function construireVigilancesPriseEnChargeHTA(donnees) {
  const vigilances = [];
  const {
    synthese,
    hta,
    selMax,
    evaluationSel,
    classesTraitement
  } = donnees;

  const ajouter = (niveau, code, titre, detail) => {
    if (vigilances.some(item => item.code === code)) return;
    vigilances.push({ niveau, code, titre, detail });
  };

  const classes = classesTraitement || [];
  const vigilanceHyperK = classes.some(classe =>
    ["iec", "ara2", "spironolactone"].includes(classe)
  );

  const pasCabinet = nombreHTA(hta?.pressionArterielle?.cabinet?.pas);
  const padCabinet = nombreHTA(hta?.pressionArterielle?.cabinet?.pad);

  if (
    (Number.isFinite(pasCabinet) && pasCabinet > 180) ||
    (Number.isFinite(padCabinet) && padCabinet > 110)
  ) {
    ajouter(
      "haute",
      "hta-pa-severe",
      "Pression artérielle très élevée renseignée",
      "La fiche HAS identifie une HTA sévère d'emblée (PAS > 180 mmHg ou PAD > 110 mmHg) comme une situation nécessitant un avis médical spécialisé. Le module diététique ne doit pas retarder cette évaluation."
    );
  }

  const age = nombreHTA(synthese?.patient?.age);

  if (Number.isFinite(age) && age >= 18 && age < 30) {
    ajouter(
      "haute",
      "hta-age-jeune",
      "HTA chez un adulte de moins de 30 ans",
      "La fiche HAS cite l'HTA avant 30 ans parmi les situations justifiant un avis spécialisé à la recherche d'une cause secondaire."
    );
  }

  if (hta?.hypotensionOrthostatique === "oui") {
    ajouter(
      "haute",
      "hta-hypotension-orthostatique",
      "Hypotension orthostatique connue",
      "Intégrer ce contexte au suivi et éviter toute interprétation isolée de la pression artérielle ou des mesures hygiéno-diététiques ; la tolérance clinique et la prise en charge médicale priment."
    );
  }

  if (hta?.proteinurie === "oui") {
    ajouter(
      "moyenne",
      "hta-proteinurie",
      "Protéinurie connue",
      "La présence d'une protéinurie signale un contexte rénal associé à prendre en compte. Les conseils sur le sodium, le potassium et les autres restrictions doivent être coordonnés avec l'évaluation médicale."
    );
  }

  if (evaluationSel?.substitutPotassium && vigilanceHyperK) {
    ajouter(
      "haute",
      "hta-substitut-potassium",
      "Substitut de sel potassique + traitement à vigilance potassium",
      "Un substitut contenant du potassium est déclaré avec un IEC, un ARA2 ou la spironolactone. Ne pas l'encourager automatiquement sans tenir compte de la kaliémie, de la fonction rénale et du traitement."
    );
  }

  const dfg = nombreHTA(hta?.biologie?.dfg);

  if (Number.isFinite(dfg) && dfg < 30) {
    ajouter(
      "haute",
      "hta-dfg-bas",
      "Fonction rénale fortement altérée renseignée",
      `DFG estimé : ${formaterNombreHTA(dfg, 0)} ${hta?.biologie?.dfgUnite || "mL/min/1,73 m²"}. Individualiser les conseils concernant sodium, potassium et hydratation et coordonner la prise en charge avec le suivi médical.`
    );
  }

  const has = synthese?.etatNutritionnel?.has;

  if (has?.diagnostic) {
    ajouter(
      "haute",
      "hta-denutrition",
      "Dénutrition associée",
      "Éviter d'empiler les restrictions alimentaires. L'état nutritionnel doit être intégré avant d'intensifier une restriction en sel ; la stratégie doit rester compatible avec les objectifs de renutrition et la prise en charge pluripathologique."
    );
  }

  if (Number.isFinite(selMax) && selMax < 5) {
    ajouter(
      "moyenne",
      "hta-objectif-sel-strict",
      "Objectif sel inférieur à 5 g/j",
      "Cet objectif doit être considéré comme une situation particulière à valider et non comme une consigne HTA standard automatique. Les recommandations AFDN/SFNCM fournies déconseillent en établissement de santé une restriction en dessous de 5 g/j hors situations spécifiques."
    );
  }

  const ordre = { haute: 0, moyenne: 1, basse: 2 };

  return vigilances.sort(
    (a, b) => (ordre[a.niveau] ?? 9) - (ordre[b.niveau] ?? 9)
  );
}

function construireSuiviGlobalHTA(donnees, priorites, vigilances) {
  const suivi = [
    "Pression artérielle et évolution clinique",
    "Adhésion et faisabilité des objectifs retenus"
  ];

  const codes = new Set(priorites.map(item => item.code));
  const vigilanceCodes = new Set(vigilances.map(item => item.code));

  if (
    codes.has("hta-sodium-eleve") ||
    codes.has("hta-sel-discretionnaire")
  ) {
    suivi.push("Apports en sodium / sel et habitudes de sel ajouté");
  }

  if (codes.has("hta-qualite-vegetale-potassium")) {
    suivi.push("Fruits, légumes et apports alimentaires en potassium");
  }

  if (codes.has("hta-alcool")) {
    suivi.push("Fréquence et quantité d'alcool");
  }

  if (codes.has("hta-activite-physique")) {
    suivi.push("Niveau d'activité physique et tolérance");
  }

  if (codes.has("hta-tabac")) {
    suivi.push("Statut tabagique et souhait d'accompagnement");
  }

  if (donnees.analyseNatriurese) {
    suivi.push("Natriurèse 24 h si elle est recontrôlée");
  }

  if (
    donnees.classesTraitement?.length ||
    vigilanceCodes.has("hta-substitut-potassium") ||
    vigilanceCodes.has("hta-dfg-bas")
  ) {
    suivi.push("Contexte biologique, tolérance et adhésion au traitement");
  }

  return Array.from(new Set(suivi));
}

function afficherPriseEnChargeHTA() {
  const conteneur = document.getElementById("priseEnChargePathologies");
  if (!conteneur) return;

  let bloc = document.getElementById("priseEnChargeHTA");
  const synthese =
    typeof construireSynthesePatient === "function"
      ? construireSynthesePatient()
      : null;
  const hta = synthese?.hta ?? null;

  if (!hta) {
    bloc?.remove();

    const autrePriseEnCharge = conteneur.querySelector(
      ':scope > section:not(#priseEnChargeHTA), :scope > [id^="priseEnCharge"]:not(#priseEnChargeHTA)'
    );

    if (!autrePriseEnCharge) {
      let placeholder = conteneur.querySelector(":scope > .module-placeholder");

      if (!placeholder) {
        placeholder = document.createElement("div");
        placeholder.className = "module-placeholder";
        conteneur.appendChild(placeholder);
      }

      placeholder.innerHTML = `
        <h3>Prise en charge personnalisée</h3>
        <p>Sélectionnez une pathologie dans l’onglet Patient pour afficher les propositions correspondantes.</p>`;
    }

    return;
  }

  conteneur
    .querySelectorAll(":scope > .module-placeholder")
    .forEach(el => el.remove());

  if (!bloc) {
    bloc = document.createElement("div");
    bloc.id = "priseEnChargeHTA";
    conteneur.appendChild(bloc);
  }

  const objectif =
    typeof obtenirObjectifSelHTA === "function"
      ? obtenirObjectifSelHTA()
      : null;

  const sodiumMax = nombreHTA(objectif?.sodiumMax);
  const selMax = nombreHTA(objectif?.selMax);

  // Repère déjà utilisé par le projet. À documenter explicitement dans la bibliographie NutriFlow.
  const potassiumMin = 3510;

  const anamnese = synthese?.anamnese ?? null;
  const anamneseDisponible = anamnese?.disponible === true;

  const sodium = anamneseDisponible
    ? obtenirApportHTA(anamnese, "sodium")
    : { valeur: null, partiel: false };

  const sel = anamneseDisponible
    ? obtenirApportHTA(anamnese, "salt")
    : { valeur: null, partiel: false };

  const potassium = anamneseDisponible
    ? obtenirApportHTA(anamnese, "potassium")
    : { valeur: null, partiel: false };

  const sourcesSodium = anamneseDisponible
    ? obtenirSourcesNutrimentHTA(anamnese, "sodium", 5)
    : [];

  const sourcesPotassium = anamneseDisponible
    ? obtenirSourcesNutrimentHTA(anamnese, "potassium", 5)
    : [];

  const evaluationSel = evaluerSelDiscretionnaireHTA(
    synthese?.habitudes
  );

  const classesTraitement = hta.traitement?.classes ?? [];

  const analyseNatriurese = analyserNatriureseHTA(
    hta,
    sodium.valeur
  );

  const donnees = {
    synthese,
    hta,
    objectif,
    sodiumMax,
    selMax,
    potassiumMin,
    sodium,
    sel,
    potassium,
    sourcesSodium,
    sourcesPotassium,
    evaluationSel,
    classesTraitement,
    analyseNatriurese
  };

  const priorites =
    construirePrioritesPriseEnChargeHTA(donnees).slice(0, 6);

  const education =
    construireEducationNutritionnelleHTA(donnees, priorites);

  const traitements =
    construireTraitementsPriseEnChargeHTA(donnees);

  const micronutrition = construireMicronutritionHTA();

  const vigilances =
    construireVigilancesPriseEnChargeHTA(donnees);

  const suivi =
    construireSuiviGlobalHTA(donnees, priorites, vigilances);

  const prioritesHTML = priorites.length
    ? priorites.map(cartePriseEnChargeHTA).join("")
    : `
      <div class="pec-diabetes-empty">
        Aucune priorité nutritionnelle spécifique n'est générée avec les données actuellement renseignées.
      </div>`;

  const educationHTML = education.length
    ? education
        .map(
          item => `
            <li>
              <strong>${echapperHTML(item.titre)}.</strong>
              ${echapperHTML(item.detail)}
            </li>`
        )
        .join("")
    : `<li>Aucun besoin éducatif spécifique supplémentaire n'est généré automatiquement.</li>`;

  const traitementsHTML = traitements.length
    ? traitements
        .map(
          item => `
            <li>
              <strong>${echapperHTML(item.titre)}.</strong>
              ${echapperHTML(item.detail)}
            </li>`
        )
        .join("")
    : `
      <li>
        Aucune implication nutritionnelle spécifique supplémentaire n'est générée à partir des traitements actuellement renseignés.
      </li>`;

  const micronutritionHTML = micronutrition.length
    ? micronutrition.map(item => `
        <li>
          <strong>${echapperHTML(item.titre)}.</strong>
          <div><strong>Lien avec l'HTA :</strong> ${echapperHTML(item.lien)}</div>
          <div><strong>Action :</strong> ${echapperHTML(item.action)}</div>
        </li>`).join("")
    : "";

  const libellesVigilance = {
    haute: "Vigilance élevée",
    moyenne: "À surveiller",
    basse: "Information"
  };

  const vigilancesHTML = vigilances.length
    ? vigilances
        .map(
          item => `
            <li>
              <strong>${echapperHTML(item.titre)} — ${libellesVigilance[item.niveau] || "À surveiller"}.</strong>
              ${echapperHTML(item.detail)}
            </li>`
        )
        .join("")
    : `
      <li>
        Aucune vigilance de sécurité supplémentaire n'est générée à partir des données actuellement renseignées.
      </li>`;

  const statutDonnees = anamneseDisponible
    ? "Données alimentaires disponibles"
    : "Anamnèse alimentaire à compléter";

  bloc.innerHTML = `
    <section class="nutrition-calc-card pec-diabetes-card pec-hta-card">

      <div class="pec-diabetes-header">
        <div>
          <span class="pec-diabetes-kicker">HTA</span>
          <h3>Prise en charge — Hypertension artérielle</h3>
          <p>${echapperHTML(objectif?.libelle || "Objectif sel à définir")} · ${statutDonnees}</p>
        </div>

        <span class="pec-diabetes-validation">
          À valider par le diététicien
        </span>
      </div>

      <div class="pec-diabetes-notice">
        Ce bloc transforme les constats de l'analyse HTA en priorités, objectifs et actions individualisés.
        Il ne modifie pas le traitement antihypertenseur et ne remplace pas le raisonnement clinique du professionnel.
      </div>

      <div class="hta-objective-summary">
        <div>
          <span>Objectif sel</span>
          <strong>${Number.isFinite(selMax) ? `≤ ${formaterNombreHTA(selMax, 1)} g/j` : "À définir"}</strong>
        </div>

        <div>
          <span>Sodium estimé</span>
          <strong>${Number.isFinite(sodium.valeur) ? `${formaterNombreHTA(sodium.valeur, 0)} mg/j` : "Non disponible"}</strong>
        </div>

        <div>
          <span>Potassium estimé</span>
          <strong>${Number.isFinite(potassium.valeur) ? `${formaterNombreHTA(potassium.valeur, 0)} mg/j` : "Non disponible"}</strong>
        </div>

        <div>
          <span>Natriurèse 24 h</span>
          <strong>${analyseNatriurese ? `${formaterNombreHTA(analyseNatriurese.natriurese, 0)} mmol/24 h` : "Non disponible"}</strong>
        </div>
      </div>

      <div class="pec-diabetes-section">
        <div class="pec-diabetes-section-title">
          <h4>Priorités et objectifs proposés</h4>
          <span>Constat → objectif → actions → suivi</span>
        </div>

        <div class="pec-diabetes-grid">
          ${prioritesHTML}
        </div>
      </div>

      <div class="pec-diabetes-two-columns">

        <div class="pec-diabetes-section pec-diabetes-panel">
          <div class="pec-diabetes-section-title">
            <h4>Éducation nutritionnelle</h4>
            <span>Compétences et autonomie à travailler avec le patient</span>
          </div>

          <ul>${educationHTML}</ul>
        </div>

        <div class="pec-diabetes-section pec-diabetes-panel">
          <div class="pec-diabetes-section-title">
            <h4>Traitements et implications nutritionnelles</h4>
            <span>${
              classesTraitement.length
                ? classesTraitement
                    .map(obtenirLibelleClasseHTA)
                    .map(echapperHTML)
                    .join(" · ")
                : "Aucune classe renseignée"
            }</span>
          </div>

          <ul>${traitementsHTML}</ul>

          <div class="pec-diabetes-notice">
            NutriFlow prend en compte le traitement renseigné mais ne propose jamais de l'initier, de l'arrêter ou d'en modifier la posologie.
          </div>
        </div>

      </div>

      ${micronutritionHTML ? `
      <div class="pec-diabetes-section pec-diabetes-panel">
        <div class="pec-diabetes-section-title">
          <h4>Micronutrition</h4>
          <span>Lien clinique → action</span>
        </div>
        <ul>${micronutritionHTML}</ul>
      </div>` : ""}

      <div class="pec-diabetes-section pec-diabetes-panel">
        <div class="pec-diabetes-section-title">
          <h4>Vigilances</h4>
          <span>Situations nécessitant une attention particulière</span>
        </div>

        <ul>${vigilancesHTML}</ul>

        ${
          analyseNatriurese
            ? `
              <div class="pec-diabetes-notice">
                <strong>Natriurèse :</strong>
                ${formaterNombreHTA(analyseNatriurese.natriurese, 0)} mmol/24 h,
                soit un équivalent d'environ
                ${formaterNombreHTA(analyseNatriurese.equivalentSelG, 1)} g de NaCl/24 h.
                Cette donnée reste un élément de contexte à confronter à la qualité du recueil et à l'anamnèse.
              </div>`
            : ""
        }
      </div>

      <div class="pec-diabetes-section pec-diabetes-followup">
        <div class="pec-diabetes-section-title">
          <h4>Suivi à la prochaine consultation</h4>
          <span>Réévaluer les objectifs retenus avec le patient</span>
        </div>

        <div class="pec-diabetes-followup-grid">
          ${suivi.map(item => `<span>${echapperHTML(item)}</span>`).join("")}
        </div>
      </div>

      <div class="pec-diabetes-source">
        Références de travail : HAS — prise en charge de l'HTA de l'adulte (2016) ;
        cours Diététique et HTA 2025-2026 ; AFDN/SFNCM — fiche sel (2022) ;
        outils éducatifs « Stop le sel » / NutriGraphics et modèle méditerranéen fournis.
      </div>

    </section>`;
}

window.enregistrerModulePathologique?.({
  id: "hta",
  champs: [
    "htaContexte", "htaDateDiagnostic", "htaPasCabinet", "htaPadCabinet",
    "htaPaCabinetDate", "htaMesureAmbulatoire", "htaPasAmbulatoire",
    "htaPadAmbulatoire", "htaPaAmbulatoireDate", "htaHypotensionOrthostatique",
    "htaProteinurie", "htaNatriurese24h", "htaNatriureseDate", "htaNatriureseQualite",
    "htaAlcoolVerresJour", "htaTabac", "htaTabacQuantite", "selCuisson",
    "selTable", "produitsAssaisonnementSales", "substitutSel", "htaSchemaTherapeutique",
    "htaClasse1", "htaClasse2", "htaClasse3", "htaMedicamentsPosologies",
    "htaToleranceTraitement", "htaObservanceTraitement", "bioPotassium", "bioDfg",
    "objectifEnergetique"
  ],
  selecteurs: ['input[name="pathologies"][value="Hypertension"]'],
  analyse: afficherAnalyseHTA,
  priseEnCharge: afficherPriseEnChargeHTA
});;
