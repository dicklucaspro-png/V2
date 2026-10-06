// =========================================================
// NUTRIFLOW — MOTEUR MICRONUTRITIONNEL V1
// Croise : biologie centrale + apports CIQUAL + contexte clinique.
// Une anomalie biologique n'est jamais assimilée automatiquement à
// un simple défaut alimentaire et aucune supplémentation n'est prescrite.
// =========================================================
(function (global) {
  "use strict";

  const DEFINITIONS_MICRONUTRIMENTS = Object.freeze({
    vitamineB1: {
      label: "Vitamine B1 (thiamine)",
      anamneseKey: "vitB1",
      biologiePath: ["vitamines", "vitamineB1"],
      sources: "céréales complètes, légumineuses, fruits à coque, graines et viandes selon les habitudes"
    },
    vitamineB9: {
      label: "Vitamine B9 (folates)",
      anamneseKey: "vitB9",
      biologiePath: ["vitamines", "vitamineB9"],
      sources: "légumes verts, légumineuses, fruits et autres aliments riches en folates"
    },
    vitamineB12: {
      label: "Vitamine B12",
      anamneseKey: "vitB12",
      biologiePath: ["vitamines", "vitamineB12"],
      sources: "poissons et fruits de mer, œufs, produits laitiers, viandes ou aliments enrichis adaptés au mode alimentaire"
    },
    vitamineD: {
      label: "Vitamine D",
      anamneseKey: "vitD",
      biologiePath: ["vitamines", "vitamineD"],
      sources: "poissons gras, œufs et aliments enrichis ; l'alimentation seule ne suffit pas toujours à corriger une valeur biologique basse"
    },
    fer: {
      label: "Fer / statut martial",
      anamneseKey: "iron",
      biologiePath: ["martial", "ferritine"],
      sources: "viandes et poissons selon les habitudes, légumineuses et autres sources végétales de fer ; associer les sources végétales à des aliments riches en vitamine C peut être utile",
      noteBiologie: "La ferritine doit être interprétée avec le contexte inflammatoire et, si disponibles, le CST et les autres marqueurs du bilan martial."
    },
    zinc: {
      label: "Zinc",
      anamneseKey: "zinc",
      biologiePath: ["mineraux", "zinc"],
      sources: "fruits de mer, viandes, produits laitiers, légumineuses, graines et fruits à coque selon les habitudes",
      noteBiologie: "Le zinc plasmatique doit être interprété avec le contexte inflammatoire, notamment CRP et albumine."
    },
    calcium: {
      label: "Calcium",
      anamneseKey: "calcium",
      biologiePath: ["mineraux", "calcium"],
      sources: "produits laitiers, alternatives enrichies en calcium, certaines eaux riches en calcium et autres sources adaptées aux habitudes"
    },
    magnesium: {
      label: "Magnésium",
      anamneseKey: "magnesium",
      biologiePath: ["mineraux", "magnesium"],
      sources: "légumineuses, céréales complètes, fruits à coque, graines, légumes verts et eaux riches en magnésium"
    },
    phosphore: {
      label: "Phosphate / phosphore",
      anamneseKey: "phosphorus",
      biologiePath: ["mineraux", "phosphore"],
      sources: "produits laitiers, viandes, poissons, œufs, légumineuses et céréales complètes selon le contexte"
    },
    potassium: {
      label: "Potassium",
      anamneseKey: "potassium",
      biologiePath: ["renal", "potassium"],
      sources: "fruits, légumes, légumineuses, pommes de terre et autres aliments végétaux, uniquement si le contexte rénal et thérapeutique le permet"
    },
    sodium: {
      label: "Sodium",
      anamneseKey: "sodium",
      biologiePath: ["renal", "sodium"],
      sources: "sel ajouté et aliments transformés ou naturellement riches en sodium"
    }
  });

  function lireCheminMicronutrition(objet, chemin = []) {
    return chemin.reduce((courant, cle) => courant?.[cle], objet);
  }

  function nombreMicronutrition(valeur) {
    const n = Number.parseFloat(String(valeur ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function parserReferenceLaboratoire(reference) {
    const brut = String(reference ?? "").trim();
    if (!brut) return { type: "absente", min: null, max: null, brut };

    const texte = brut
      .toLowerCase()
      .replace(/,/g, ".")
      .replace(/−/g, "-")
      .replace(/–/g, "-")
      .replace(/—/g, "-")
      .replace(/\s+/g, " ")
      .trim();

    const extraire = valeur => {
      const n = Number.parseFloat(valeur);
      return Number.isFinite(n) ? n : null;
    };

    let m = texte.match(/(-?\d+(?:\.\d+)?)\s*(?:-|à|a)\s*(-?\d+(?:\.\d+)?)/i);
    if (m) {
      const min = extraire(m[1]);
      const max = extraire(m[2]);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        return { type: "plage", min: Math.min(min, max), max: Math.max(min, max), brut };
      }
    }

    m = texte.match(/(?:>=|≥|>|sup(?:érieur|erieure)?\s*(?:à|a)?)\s*(-?\d+(?:\.\d+)?)/i);
    if (m) {
      const min = extraire(m[1]);
      if (Number.isFinite(min)) return { type: "minimum", min, max: null, brut };
    }

    m = texte.match(/(?:<=|≤|<|inf(?:érieur|erieure)?\s*(?:à|a)?)\s*(-?\d+(?:\.\d+)?)/i);
    if (m) {
      const max = extraire(m[1]);
      if (Number.isFinite(max)) return { type: "maximum", min: null, max, brut };
    }

    return { type: "non_interpretable", min: null, max: null, brut };
  }

  function interpreterBiologieMicronutriment(parametre) {
    const valeur = nombreMicronutrition(parametre?.valeur);
    const reference = parserReferenceLaboratoire(parametre?.referenceLaboratoire);

    if (!Number.isFinite(valeur)) {
      return { statut: "non_renseigne", valeur: null, reference };
    }

    if (reference.type === "absente" || reference.type === "non_interpretable") {
      return { statut: "renseigne_non_interpretable", valeur, reference };
    }

    if (Number.isFinite(reference.min) && valeur < reference.min) {
      return { statut: "bas", valeur, reference };
    }

    if (Number.isFinite(reference.max) && valeur > reference.max) {
      return { statut: "haut", valeur, reference };
    }

    return { statut: "dans_reference", valeur, reference };
  }

  function obtenirSyntheseMicronutritionnelle() {
    if (typeof global.construireSynthesePatient === "function") {
      return global.construireSynthesePatient();
    }
    if (typeof construireSynthesePatient === "function") {
      return construireSynthesePatient();
    }
    if (typeof global.obtenirSyntheseBiologie === "function") {
      return { biologie: global.obtenirSyntheseBiologie() };
    }
    return null;
  }

  function obtenirApportMicronutriment(definition, dossier, options = {}) {
    if (typeof getRecommandationsBesoinsPatient !== "function") {
      return { valeur: null, statut: "non_evalue", partiel: false, reference: null };
    }

    const apport = dossier?.anamnese?.apports?.[definition.anamneseKey] ?? null;
    const valeur = Number.isFinite(apport?.valeur) ? apport.valeur : null;
    const besoins = getRecommandationsBesoinsPatient({
      contextePathologique: options.contextePathologique ?? null
    });
    const reference = besoins?.[definition.anamneseKey] ?? null;

    let statut = { classe: "non-evalue", label: "Non évalué" };
    if (Number.isFinite(valeur) && reference && typeof analyserStatutApport === "function") {
      statut = analyserStatutApport(valeur, reference, {
        partiel: apport?.partiel === true,
        qualite: apport?.qualite ?? null
      });
    }

    return {
      valeur,
      statut: statut.classe || "non-evalue",
      libelleStatut: statut.label || "Non évalué",
      partiel: apport?.partiel === true,
      qualite: apport?.qualite ?? null,
      reference
    };
  }

  function obtenirPrincipalesSourcesMicronutriment(code, dossier, limite = 3) {
    const definition = DEFINITIONS_MICRONUTRIMENTS[code];
    if (!definition) return [];

    const aliments = Array.isArray(dossier?.anamnese?.aliments)
      ? dossier.anamnese.aliments
      : [];

    return aliments
      .map(aliment => {
        const valeur = aliment?.nutriments?.[definition.anamneseKey];
        if (
          !Number.isFinite(valeur) ||
          valeur <= 0 ||
          !Number.isFinite(aliment?.poidsJournalier) ||
          aliment.poidsJournalier <= 0
        ) return null;

        return {
          nom: aliment.nom || "Aliment non nommé",
          valeur,
          poids: aliment.poidsJournalier
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.valeur - a.valeur)
      .slice(0, limite);
  }

  function analyserMicronutrimentPatient(code, synthese = null, options = {}) {
    const definition = DEFINITIONS_MICRONUTRIMENTS[code];
    if (!definition) return null;

    const dossier = synthese || obtenirSyntheseMicronutritionnelle();
    const parametre = lireCheminMicronutrition(dossier?.biologie, definition.biologiePath) || null;
    const biologie = interpreterBiologieMicronutriment(parametre);
    const alimentation = obtenirApportMicronutriment(definition, dossier, options);
    const sourcesActuelles = obtenirPrincipalesSourcesMicronutriment(code, dossier, 3);

    let situation = "non_evaluee";
    if (biologie.statut === "bas") {
      situation = alimentation.statut === "insuffisant"
        ? "biologie_basse_apport_insuffisant"
        : alimentation.statut === "adequat"
          ? "biologie_basse_apport_adequat"
          : "biologie_basse_apport_non_evalue";
    } else if (biologie.statut === "haut") {
      situation = "biologie_haute";
    } else if (alimentation.statut === "insuffisant") {
      situation = "apport_insuffisant";
    } else if (biologie.statut === "dans_reference" && alimentation.statut === "adequat") {
      situation = "rassurant";
    } else if (biologie.statut === "renseigne_non_interpretable") {
      situation = alimentation.statut === "insuffisant"
        ? "biologie_non_interpretable_apport_insuffisant"
        : "biologie_non_interpretable";
    }

    return {
      code,
      label: definition.label,
      definition,
      biologie: { ...biologie, parametre },
      alimentation,
      sourcesActuelles,
      situation
    };
  }

  function formatterReferenceApport(reference) {
    if (!reference) return "repère non disponible";
    if (reference.affichage) return reference.affichage;
    if (reference.type === "min" && Number.isFinite(reference.min)) return `≥ ${reference.min} ${reference.unite || ""}`.trim();
    if (reference.type === "max" && Number.isFinite(reference.max)) return `≤ ${reference.max} ${reference.unite || ""}`.trim();
    if (reference.type === "recommended" && Number.isFinite(reference.min)) {
      const plage = Number.isFinite(reference.recommendedMax) && reference.recommendedMax !== reference.min
        ? `${reference.min}–${reference.recommendedMax} ${reference.unite || ""}`.trim()
        : `${reference.min} ${reference.unite || ""}`.trim();
      return Number.isFinite(reference.upperLimit)
        ? `${plage} · AMT ${reference.upperLimit} ${reference.unite || ""}`.trim()
        : plage;
    }
    if (reference.type === "range" && Number.isFinite(reference.min) && Number.isFinite(reference.max)) {
      return `${reference.min}–${reference.max} ${reference.unite || ""}`.trim();
    }
    return "repère disponible dans Calculs";
  }


  function echapperHTMLMicronutrition(valeur) {
    return String(valeur ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formaterNombreMicronutrition(valeur) {
    if (!Number.isFinite(valeur)) return "—";
    const abs = Math.abs(valeur);
    const maximumFractionDigits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
    return valeur.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits
    });
  }

  function classeBiologiqueMicronutrition(statut) {
    if (statut === "bas") return "insuffisant";
    if (statut === "haut") return "eleve";
    if (statut === "dans_reference") return "adequat";
    return "non-evalue";
  }

  function libelleBiologiqueMicronutrition(statut) {
    const libelles = {
      bas: "Sous la référence",
      haut: "Au-dessus de la référence",
      dans_reference: "Dans la référence",
      renseigne_non_interpretable: "Référence labo à renseigner",
      non_renseigne: "Non renseigné"
    };
    return libelles[statut] || "Non évalué";
  }

  function formaterBiologieMicronutrition(analyse) {
    const biologie = analyse?.biologie;
    const parametre = biologie?.parametre;

    if (!Number.isFinite(biologie?.valeur)) {
      return {
        valeur: "Non renseignée",
        statut: "Non évalué",
        classe: "non-evalue"
      };
    }

    const unite = String(parametre?.unite || "").trim();
    return {
      valeur: `${formaterNombreMicronutrition(biologie.valeur)}${unite ? ` ${echapperHTMLMicronutrition(unite)}` : ""}`,
      statut: libelleBiologiqueMicronutrition(biologie.statut),
      classe: classeBiologiqueMicronutrition(biologie.statut)
    };
  }

  function construireHTMLAnalyseMicronutritionnelle(codes = [], options = {}) {
    const analyses = codes
      .map(code => analyserMicronutrimentPatient(code, options.synthese, options))
      .filter(Boolean);

    if (!analyses.length) return "";

    const titre = options.titre || "Micronutriments";
    const sousTitre = options.sousTitre || "Comparaison des apports alimentaires aux repères, avec biologie lorsqu'elle est renseignée.";

    const lignes = analyses.map(analyse => {
      const alimentation = analyse.alimentation || {};
      const uniteApport = alimentation.reference?.unite || "";
      const utiliseEstimation =
        alimentation.partiel === true &&
        alimentation.qualite?.intervalleDisponible === true &&
        Number.isFinite(alimentation.qualite?.valeurEstimee);
      const valeurAffichee = utiliseEstimation
        ? alimentation.qualite.valeurEstimee
        : alimentation.valeur;
      const approximatif = utiliseEstimation || alimentation.qualite?.estime === true;
      const valeurApport = Number.isFinite(valeurAffichee)
        ? `${approximatif ? "≈ " : (alimentation.partiel ? "≥ " : "")}${formaterNombreMicronutrition(valeurAffichee)}${uniteApport ? ` ${echapperHTMLMicronutrition(uniteApport)}` : ""}`
        : "Non disponible";
      const reference = echapperHTMLMicronutrition(formatterReferenceApport(alimentation.reference));
      const statutAlimentaire = echapperHTMLMicronutrition(alimentation.libelleStatut || "Non évalué");
      const classeAlimentaire = echapperHTMLMicronutrition(alimentation.statut || "non-evalue");
      const biologie = formaterBiologieMicronutrition(analyse);
      const contributeurs = analyse.sourcesActuelles?.length
        ? analyse.sourcesActuelles.map(item => item.nom).filter(Boolean).join(", ")
        : "Non identifiables avec les données disponibles";

      return `
        <tr>
          <th scope="row">
            <strong>${echapperHTMLMicronutrition(analyse.label)}</strong>
            <small style="display:block;margin-top:4px;font-weight:400">Principaux contributeurs : ${echapperHTMLMicronutrition(contributeurs)}</small>
          </th>
          <td>
            ${valeurApport}
            ${(alimentation.partiel || alimentation.qualite?.estime) ? `<span class="analysis-quality-icon" tabindex="0" data-tooltip="La valeur peut inclure des données de composition complémentaires ou une estimation d'incertitude. Une ration très bien documentée avec un apport estimé très éloigné du repère peut être classée « Sous le repère » malgré une faible incertitude résiduelle." title="La valeur peut inclure des données de composition complémentaires ou une estimation d'incertitude. Une ration très bien documentée avec un apport estimé très éloigné du repère peut être classée « Sous le repère » malgré une faible incertitude résiduelle." aria-label="Information sur la qualité de la composition">ⓘ</span>` : ""}
          </td>
          <td>
            ${reference}
            ${alimentation.reference?.source ? `<small style="display:block">${echapperHTMLMicronutrition(alimentation.reference.source)}</small>` : ""}
          </td>
          <td><span class="recommendation-status ${classeAlimentaire}">${statutAlimentaire}</span></td>
          <td>
            ${biologie.valeur}
            <small style="display:block"><span class="recommendation-status ${biologie.classe}">${echapperHTMLMicronutrition(biologie.statut)}</span></small>
          </td>
        </tr>`;
    }).join("");

    return `
      <div class="diabetes-analysis-block micronutrition-analysis-block">
        <div class="diabetes-analysis-block-header">
          <div>
            <h4>${echapperHTMLMicronutrition(titre)}</h4>
            <span>${echapperHTMLMicronutrition(sousTitre)}</span>
          </div>
        </div>
        <div class="hta-analysis-table-wrap">
          <table class="hta-analysis-table" aria-label="Analyse micronutritionnelle">
            <thead>
              <tr>
                <th scope="col">Micronutriment</th>
                <th scope="col">Apport estimé</th>
                <th scope="col">Besoin / repère</th>
                <th scope="col">Apports</th>
                <th scope="col">Biologie</th>
              </tr>
            </thead>
            <tbody>${lignes}</tbody>
          </table>
        </div>
        <div class="hta-analysis-note">
          Les principaux contributeurs décrivent les aliments réellement retrouvés dans l'anamnèse ; ils ne constituent pas, à eux seuls, une liste d'aliments à recommander. Lorsque certaines valeurs de composition manquent, NutriFlow évite de conclure automatiquement à une insuffisance. Si la valeur disponible dépasse déjà un repère maximal, l'apport reste signalé au-dessus du repère.
        </div>
      </div>`;
  }

  function construireActionMicronutritionnelle(analyse) {
    if (!analyse) return null;
    const { definition, situation } = analyse;

    if (situation === "biologie_basse_apport_insuffisant") {
      return `Corriger l'insuffisance alimentaire avec des sources adaptées (${definition.sources}) et intégrer la valeur biologique basse à l'évaluation de la cause et de la correction médicale éventuelle.`;
    }

    if (situation === "biologie_basse_apport_adequat") {
      return "Ne pas augmenter automatiquement les apports au-delà des besoins. Rechercher une cause non alimentaire (malabsorption, pertes, chirurgie, traitement ou autre contexte clinique) et coordonner la correction avec le suivi médical.";
    }

    if (situation === "biologie_basse_apport_non_evalue") {
      return `Compléter l'anamnèse alimentaire et documenter les sources habituelles (${definition.sources}) tout en faisant interpréter la valeur biologique basse dans son contexte clinique.`;
    }

    if (situation === "biologie_haute") {
      return "Ne pas renforcer les apports ni proposer de supplémentation automatiquement. Interpréter la valeur biologique avec le contexte clinique, rénal et thérapeutique avant toute adaptation nutritionnelle.";
    }

    if (["apport_insuffisant", "biologie_non_interpretable_apport_insuffisant"].includes(situation)) {
      return `Renforcer, si cela reste compatible avec l'ensemble du dossier, les sources alimentaires adaptées : ${definition.sources}. Une supplémentation n'est pas déduite du seul apport alimentaire estimé.`;
    }

    return null;
  }

  function construirePriseEnChargeMicronutritionnelle(code, options = {}) {
    const analyse = analyserMicronutrimentPatient(code, options.synthese, options);
    if (!analyse) return null;

    const action = construireActionMicronutritionnelle(analyse);
    if (!action && !options.force) return null;

    const niveau = analyse.biologie?.statut === "bas" || analyse.biologie?.statut === "haut"
      ? (options.securite ? "haute" : "moyenne")
      : analyse.alimentation?.statut === "insuffisant"
        ? "basse"
        : "information";

    return {
      code,
      niveau,
      titre: analyse.label,
      lien: options.lien || "Ce micronutriment est à interpréter en fonction de la pathologie, des apports alimentaires, de la biologie et des traitements associés.",
      action: action || options.actionSiRassurant || "Aucune adaptation nutritionnelle spécifique n'est générée avec les données actuellement disponibles.",
      analyse
    };
  }

  function construireMessageMicronutritionnel(code, options = {}) {
    const analyse = analyserMicronutrimentPatient(code, options.synthese, options);
    if (!analyse) return null;

    const { label, definition, biologie, alimentation, situation, sourcesActuelles } = analyse;
    const sourcesCourantes = sourcesActuelles.length
      ? ` Principaux contributeurs observés dans l'anamnèse : ${sourcesActuelles.map(x => x.nom).join(", ")}.`
      : "";
    const notePartielle = alimentation.partiel
      ? " Estimation alimentaire partielle : certaines données CIQUAL sont manquantes."
      : "";
    const noteBio = definition.noteBiologie ? ` ${definition.noteBiologie}` : "";

    if (situation === "biologie_basse_apport_insuffisant") {
      return {
        code,
        niveau: options.securite ? "haute" : "moyenne",
        titre: `${label} — valeur biologique basse et apport alimentaire insuffisant`,
        detail: `La valeur biologique est sous la référence renseignée et l'apport alimentaire estimé est sous le repère (${formatterReferenceApport(alimentation.reference)}). Travailler les apports alimentaires peut faire partie de la prise en charge, mais une valeur biologique basse ne doit pas être attribuée automatiquement à l'alimentation : rechercher les causes associées et coordonner la correction médicale si nécessaire.${notePartielle}${noteBio}`,
        action: `Explorer une augmentation réaliste des sources alimentaires adaptées : ${definition.sources}.${sourcesCourantes}`,
        analyse
      };
    }

    if (situation === "biologie_basse_apport_adequat") {
      return {
        code,
        niveau: options.securite ? "haute" : "moyenne",
        titre: `${label} — valeur biologique basse malgré un apport alimentaire adéquat`,
        detail: `L'apport alimentaire estimé atteint le repère, ce qui ne soutient pas l'hypothèse d'un simple manque d'apports. Rechercher notamment malabsorption, pertes, chirurgie, médicament ou autre cause clinique selon le contexte ; une correction médicale peut être nécessaire.${noteBio}`,
        action: "Ne pas augmenter automatiquement les apports au-delà des besoins uniquement sur la base de la valeur biologique.",
        analyse
      };
    }

    if (situation === "biologie_basse_apport_non_evalue") {
      return {
        code,
        niveau: options.securite ? "haute" : "moyenne",
        titre: `${label} — valeur biologique basse`,
        detail: `Une valeur sous la référence du laboratoire est renseignée, mais les apports alimentaires ne sont pas suffisamment évaluables. Compléter l'anamnèse et rechercher la cause ; l'alimentation seule ne doit pas être considérée comme correction suffisante d'un déficit biologique.${noteBio}`,
        action: `Documenter les apports et les sources habituelles de ${label.toLowerCase()} avant de cibler une modification alimentaire.`,
        analyse
      };
    }

    if (situation === "biologie_haute") {
      return {
        code,
        niveau: options.securite ? "haute" : "moyenne",
        titre: `${label} — valeur biologique au-dessus de la référence`,
        detail: `La valeur biologique dépasse la référence renseignée. Ne pas proposer automatiquement d'augmentation des apports ou de supplémentation ; interpréter avec le contexte clinique, rénal et thérapeutique lorsque pertinent.${noteBio}`,
        action: "Coordonner l'interprétation avec le suivi médical avant toute adaptation nutritionnelle spécifique.",
        analyse
      };
    }

    if (["apport_insuffisant", "biologie_non_interpretable_apport_insuffisant"].includes(situation)) {
      return {
        code,
        niveau: "basse",
        titre: `${label} — apport alimentaire sous le repère`,
        detail: `Apport alimentaire estimé sous le repère (${formatterReferenceApport(alimentation.reference)}). Cela ne démontre pas un déficit biologique.${notePartielle}${noteBio}`,
        action: `Si cela reste compatible avec le reste du dossier, renforcer les sources adaptées : ${definition.sources}.${sourcesCourantes}`,
        analyse
      };
    }

    if (situation === "biologie_non_interpretable") {
      return {
        code,
        niveau: "information",
        titre: `${label} — résultat biologique non interprétable automatiquement`,
        detail: "Une valeur biologique est renseignée mais la référence du laboratoire est absente ou non exploitable. NutriFlow conserve la donnée sans la classer comme normale, basse ou élevée.",
        action: "Renseigner la référence du laboratoire si une interprétation automatisée est souhaitée.",
        analyse
      };
    }

    return null;
  }

  function analyserListeMicronutriments(codes = [], options = {}) {
    return codes
      .map(code => construireMessageMicronutritionnel(code, options))
      .filter(Boolean);
  }

  global.DEFINITIONS_MICRONUTRIMENTS = DEFINITIONS_MICRONUTRIMENTS;
  global.parserReferenceLaboratoire = parserReferenceLaboratoire;
  global.interpreterBiologieMicronutriment = interpreterBiologieMicronutriment;
  global.analyserMicronutrimentPatient = analyserMicronutrimentPatient;
  global.construireHTMLAnalyseMicronutritionnelle = construireHTMLAnalyseMicronutritionnelle;
  global.construirePriseEnChargeMicronutritionnelle = construirePriseEnChargeMicronutritionnelle;
  global.construireMessageMicronutritionnel = construireMessageMicronutritionnel;
  global.analyserListeMicronutriments = analyserListeMicronutriments;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      DEFINITIONS_MICRONUTRIMENTS,
      parserReferenceLaboratoire,
      interpreterBiologieMicronutriment,
      analyserMicronutrimentPatient,
      construireHTMLAnalyseMicronutritionnelle,
      construirePriseEnChargeMicronutritionnelle
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
