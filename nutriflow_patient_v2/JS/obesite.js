// =========================================================
// NUTRIFLOW — MODULE OBÉSITÉ
// Références : HAS 2023 (mise à jour février 2024) + BASO 2020
// =========================================================
(function () {
  "use strict";

  const $ = id => document.getElementById(id);

  // La présence du module reste une information d'interface pour afficher / masquer
  // le panneau. L'analyse clinique, elle, consomme exclusivement SynthesePatient.
  function obesiteActive() {
    return document.querySelector('input[name="pathologies"][value="Obésité"]')?.checked === true;
  }

  function classeIMC(x) {
    if (!Number.isFinite(x)) return null;
    if (x < 18.5) return "Insuffisance pondérale";
    if (x < 25) return "Corpulence normale";
    if (x < 30) return "Surpoids";
    if (x < 35) return "Obésité de classe I";
    if (x < 40) return "Obésité de classe II";
    return "Obésité de classe III";
  }

  function evaluerTourTailleObesite(valeur, sexe) {
    const tt = Number.parseFloat(String(valeur ?? "").replace(",", "."));
    if (!(tt > 0) || !["homme", "femme"].includes(sexe)) return null;
    const seuil = sexe === "homme" ? 94 : 80;
    return { valeur: tt, seuil, risque: tt >= seuil };
  }

  function donnees(synthese) {
    const obesite = synthese?.obesite ?? null;
    if (!obesite?.present) {
      return { actif: false };
    }

    return {
      actif: true,
      imc: obesite.imc,
      classe: obesite.classeIMC,
      tourTaille: obesite.tourTaille,
      poids: synthese?.anthropometrie?.poids ?? null,
      dynamique: obesite.dynamiquePoids,
      ageDebut: obesite.ageDebut,
      poidsForme: obesite.poidsForme,
      histoire: obesite.histoireDetails,
      retentissement: obesite.retentissementFonctionnel,
      stigmatisation: obesite.stigmatisation,
      sommeilAlerte: obesite.sommeilAlerte,
      medicamentPoids: obesite.medicamentPoids,
      chirurgieBariatrique: obesite.chirurgieBariatrique,
      hyperphagie: obesite.hyperphagiePrandiale,
      tachyphagie: obesite.tachyphagie,
      alimentationEmotionnelle: obesite.alimentationEmotionnelle,
      grignotage: obesite.grignotageCompulsions,
      restriction: obesite.restrictionCognitive,
      tcaAlerte: obesite.tcaAlerte,
      eoss: obesite.eoss,
      prioritePatient: obesite.prioritePatient,
      attentes: obesite.attentes,
      objectif: synthese?.contexte?.objectif ?? "",
      sportPratique: synthese?.contexte?.sportPratique ?? ""
    };
  }

  function completude(d) {
    const manque = [];
    if (!Number.isFinite(d.imc)) manque.push("poids et taille");
    if (!d.dynamique) manque.push("dynamique pondérale");
    if (!d.retentissement) manque.push("retentissement fonctionnel");
    if (!d.prioritePatient && !d.objectif) manque.push("objectif / priorité du patient");
    return { complet: manque.length === 0, manque };
  }

  function nombreObesite(valeur) {
    const n = Number.parseFloat(String(valeur ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function normaliserTexteObesite(texte) {
    return String(texte ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function obtenirAnalyseAnamneseObesite(synthese = null) {
    const dossier = synthese || (
      typeof construireSynthesePatient === "function"
        ? construireSynthesePatient()
        : null
    );

    const anamnese = dossier?.anamnese ?? null;
    const alimentsSource = Array.isArray(anamnese?.aliments)
      ? anamnese.aliments
      : [];

    if (!anamnese || anamnese.disponible !== true || !alimentsSource.length) {
      return {
        disponible: false,
        aliments: [],
        repas: [],
        boissons: [],
        energieTotale: null,
        energiePartielle: false,
        lipides: null,
        ags: null,
        fibres: null
      };
    }

    const aliments = alimentsSource.map(aliment => {
      const energie = nombreObesite(aliment?.energie);
      const poidsJour = nombreObesite(aliment?.poidsJournalier);
      const nutriments = aliment?.nutriments ?? {};

      const densiteEnergetique =
        Number.isFinite(energie) &&
        Number.isFinite(poidsJour) &&
        poidsJour > 0
          ? energie / poidsJour * 100
          : null;

      return {
        nom: aliment?.nom || "Aliment",
        groupe: aliment?.groupe || "",
        repas: Number(aliment?.repasIndex),
        repasLibelle: aliment?.repas || "Repas non renseigné",
        poidsJour,
        energie,
        densiteEnergetique,
        proteines: nombreObesite(nutriments.protein),
        glucides: nombreObesite(nutriments.carbs),
        lipides: nombreObesite(nutriments.lipids),
        fibres: nombreObesite(nutriments.fiber),
        ags: nombreObesite(nutriments.ags)
      };
    });

    const alimentsAvecEnergie =
      aliments.filter(aliment => Number.isFinite(aliment.energie));

    const apportEnergie = anamnese?.apports?.energie ?? null;
    const energieTotale = Number.isFinite(apportEnergie?.valeur)
      ? apportEnergie.valeur
      : (alimentsAvecEnergie.length > 0
          ? alimentsAvecEnergie.reduce((somme, aliment) => somme + aliment.energie, 0)
          : null);

    const energiePartielle = apportEnergie?.partiel === true;

    const principauxContributeurs =
      [...alimentsAvecEnergie]
        .sort((a, b) => b.energie - a.energie)
        .slice(0, 5)
        .map(aliment => ({
          ...aliment,
          contribution:
            Number.isFinite(energieTotale) && energieTotale > 0
              ? aliment.energie / energieTotale * 100
              : null
        }));

    const alimentsDenses =
      aliments
        .filter(aliment => Number.isFinite(aliment.densiteEnergetique))
        .sort((a, b) => b.densiteEnergetique - a.densiteEnergetique)
        .slice(0, 5);

    const boissons =
      alimentsAvecEnergie
        .filter(aliment => {
          const nom = normaliserTexteObesite(aliment.nom);
          const groupe = normaliserTexteObesite(aliment.groupe);

          const groupeBoisson =
            /\bboissons?\b/.test(groupe) ||
            /\bjus\b/.test(groupe) ||
            /\bnectars?\b/.test(groupe) ||
            /\bsodas?\b/.test(groupe) ||
            /\bboissons alcoolisees?\b/.test(groupe);

          const nomBoisson =
            /\bboissons?\b/.test(nom) ||
            /\bsodas?\b/.test(nom) ||
            /\bcolas?\b/.test(nom) ||
            /\bjus\b/.test(nom) ||
            /\bnectars?\b/.test(nom) ||
            /\bsmoothies?\b/.test(nom) ||
            /\bbieres?\b/.test(nom) ||
            /\bvins?\b/.test(nom) ||
            /\bcidres?\b/.test(nom) ||
            /\balcool\b/.test(nom);

          return groupeBoisson || nomBoisson;
        })
        .sort((a, b) => b.energie - a.energie);

    const groupesRepas = new Map();
    aliments.forEach(aliment => {
      const index = Number.isFinite(aliment.repas) ? aliment.repas : -1;
      if (!groupesRepas.has(index)) {
        groupesRepas.set(index, {
          nom: aliment.repasLibelle || "Repas non renseigné",
          aliments: []
        });
      }
      groupesRepas.get(index).aliments.push(aliment);
    });

    const repas = Array.from(groupesRepas.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, groupe]) => {
        const alimentsRepas = groupe.aliments;
        const energieConnue = alimentsRepas.filter(aliment => Number.isFinite(aliment.energie));
        const energie = energieConnue.length
          ? energieConnue.reduce((somme, aliment) => somme + aliment.energie, 0)
          : null;

        return {
          nom: groupe.nom,
          energie,
          partiel: energieConnue.length > 0 && energieConnue.length < alimentsRepas.length,
          contribution:
            Number.isFinite(energie) &&
            Number.isFinite(energieTotale) &&
            energieTotale > 0
              ? energie / energieTotale * 100
              : null
        };
      })
      .filter(repas => Number.isFinite(repas.energie));

    const sommerNutriment = cle => {
      const valeurs = aliments
        .map(aliment => aliment[cle])
        .filter(Number.isFinite);

      return valeurs.length
        ? valeurs.reduce((somme, valeur) => somme + valeur, 0)
        : null;
    };

    return {
      disponible: true,
      aliments,
      energieTotale,
      energiePartielle,
      principauxContributeurs,
      alimentsDenses,
      boissons,
      repas,
      lipides: sommerNutriment("lipides"),
      ags: sommerNutriment("ags"),
      fibres: sommerNutriment("fibres")
    };
  }

  function construireAnalyseAlimentaireObesite(synthese = null) {
    const anamnese =
      obtenirAnalyseAnamneseObesite(synthese);

    const calculs =
      typeof window.obtenirEtatCalculsObesite ===
      "function"
        ? window.obtenirEtatCalculsObesite()
        : null;

    if (
      !anamnese ||
      !anamnese.disponible
    ) {
      return {
        disponible: false
      };
    }

    const objectifEnergetique =
      nombreObesite(
        calculs?.objectifEnergetique
      );

    const ecartEnergetique =
      anamnese.energiePartielle !== true &&
      Number.isFinite(
        anamnese.energieTotale
      ) &&
      Number.isFinite(
        objectifEnergetique
      )
        ? anamnese.energieTotale -
          objectifEnergetique
        : null;

    const energieBoissons =
      anamnese.boissons.length
        ? anamnese.boissons.reduce(
            (somme, boisson) =>
              somme +
              (boisson.energie || 0),
            0
          )
        : 0;

    const contributionBoissons =
      energieBoissons > 0 &&
      Number.isFinite(
        anamnese.energieTotale
      ) &&
      anamnese.energieTotale > 0
        ? energieBoissons /
          anamnese.energieTotale *
          100
        : null;

    return {
      ...anamnese,
      objectifEnergetique,
      ecartEnergetique,
      energieBoissons,
      contributionBoissons
    };
  }

  function analyserObesite() {
    const synthese =
      typeof construireSynthesePatient === "function"
        ? construireSynthesePatient()
        : null;

    const d = donnees(synthese);
    if (!d.actif) return null;

    const constats = [];
    const alertes = [];

    if (Number.isFinite(d.imc)) {
      constats.push({ titre: "Corpulence", texte: `${d.classe} — IMC ${d.imc.toFixed(1)} kg/m².` });
    }
    if (d.tourTaille) {
      constats.push({
        titre: "Tour de taille",
        texte: `${d.tourTaille.valeur.toFixed(1)} cm — ${d.tourTaille.risque ? "seuil de risque métabolique atteint" : "sous le seuil de risque utilisé"}.`
      });
    }
    if (d.eoss) {
      constats.push({ titre: "EOSS", texte: `Stade ${d.eoss}, renseigné par le professionnel. NutriFlow ne l'attribue pas automatiquement.` });
    }
    if (["projet", "sleeve", "bypass", "autre_postop"].includes(d.chirurgieBariatrique)) {
      const libelles = {
        projet: "Projet / préparation à une chirurgie bariatrique",
        sleeve: "Antécédent de sleeve gastrectomie",
        bypass: "Antécédent de bypass gastrique",
        autre_postop: "Antécédent d'autre chirurgie bariatrique"
      };
      constats.push({ titre: "Contexte bariatrique", texte: libelles[d.chirurgieBariatrique] });
    }

    if (d.dynamique === "rapide") {
      alertes.push({ niveau: "haute", titre: "Prise de poids rapide récente", texte: "Rechercher les facteurs déclenchants et les changements récents du contexte de vie, des traitements, du sommeil, de l'activité et de l'alimentation." });
    }
    if (d.dynamique === "yoyo") {
      alertes.push({ niveau: "moyenne", titre: "Fluctuations pondérales", texte: "Documenter les cycles perte–reprise et éviter de reproduire une logique de restrictions répétées non adaptées." });
    }
    if (d.tcaAlerte === "oui") {
      alertes.push({ niveau: "haute", titre: "TCA à explorer", texte: "NutriFlow ne pose pas de diagnostic. Des signes d'appel justifient une évaluation adaptée et, selon la situation, une approche pluriprofessionnelle." });
    }
    if (d.sommeilAlerte === "oui") {
      alertes.push({ niveau: "moyenne", titre: "Sommeil / SAHOS à explorer", texte: "Des signes évocateurs de troubles respiratoires du sommeil sont rapportés ; une évaluation médicale peut être indiquée." });
    }
    if (d.medicamentPoids === "oui") {
      alertes.push({ niveau: "moyenne", titre: "Traitement pouvant influencer le poids", texte: "Identifier précisément la molécule et son contexte. NutriFlow ne modifie jamais un traitement." });
    }
    if (["modere", "important"].includes(d.retentissement)) {
      alertes.push({ niveau: d.retentissement === "important" ? "haute" : "moyenne", titre: "Retentissement fonctionnel", texte: "Intégrer les limitations fonctionnelles, la douleur et la mobilité dans la hiérarchisation des objectifs." });
    }
    if (d.stigmatisation === "oui") {
      alertes.push({ niveau: "moyenne", titre: "Stigmatisation / autostigmatisation", texte: "Adapter la communication, coconstruire les objectifs et éviter toute approche culpabilisante." });
    }

    const comportements = [];
    if (d.hyperphagie === "oui") comportements.push("hyperphagie prandiale");
    if (d.tachyphagie === "oui") comportements.push("tachyphagie");
    if (d.alimentationEmotionnelle === "oui") comportements.push("alimentation émotionnelle");
    if (d.grignotage === "oui") comportements.push("grignotage / compulsions");
    if (d.restriction === "oui") comportements.push("restriction cognitive / régimes répétés");
    if (comportements.length) {
      constats.push({ titre: "Comportement alimentaire", texte: comportements.join(", ") + "." });
    }

    const analyseAlimentaire =
      construireAnalyseAlimentaireObesite(synthese);

    return {
      ...d,
      synthese,
      completude: completude(d),
      constats,
      alertes,
      analyseAlimentaire
    };
  }

  function niveauLabel(n) {
    if (n === "haute") return "Priorité élevée";
    if (n === "moyenne") return "Priorité intermédiaire";
    return "À considérer";
  }

  function priorites(analyse) {
    const list = [];
    const add = (niveau, categorie, titre, objectif, actions, suivi = "") =>
      list.push({ niveau, categorie, titre, objectif, actions, suivi });

    const calculs = typeof window.obtenirEtatCalculsObesite === "function"
      ? window.obtenirEtatCalculsObesite()
      : null;

    const denutrition = analyse?.synthese?.etatNutritionnel?.has ?? null;

    if (denutrition?.diagnostic === true) {
      add("haute", "Sécurité nutritionnelle", "Dénutrition associée à l’obésité",
        "Prioriser la correction de la dénutrition et la préservation de la masse maigre avant toute restriction énergétique.",
        [
          "Utiliser les objectifs protéino-énergétiques du module Dénutrition.",
          "Éviter une réduction énergétique automatique.",
          "Surveiller les apports et l’évolution de l’état nutritionnel."
        ],
        "Réévaluer conjointement l’état nutritionnel et la stratégie pondérale.");
    }

    if (analyse.tcaAlerte === "oui") {
      add("haute", "Sécurité comportementale", "Trouble des conduites alimentaires à explorer",
        "Éviter d’aggraver une restriction cognitive ou un comportement alimentaire pathologique.",
        [
          "Approfondir les signes d’appel et leur fréquence.",
          "Ne pas centrer la prise en charge sur une restriction calorique rigide.",
          "Envisager une coordination spécialisée selon la situation."
        ],
        "Réévaluer le comportement alimentaire avant de renforcer un objectif pondéral.");
    }

    if (analyse.dynamique === "rapide") {
      add("haute", "Dynamique pondérale", "Prise de poids rapide récente",
        "Comprendre les facteurs déclenchants avant de fixer une cible de poids.",
        [
          "Rechercher les changements récents du contexte de vie, du sommeil, de l’activité et de l’alimentation.",
          "Vérifier les traitements susceptibles d’influencer le poids.",
          "Documenter la chronologie de la prise de poids."
        ],
        "Réévaluer la dynamique pondérale après prise en charge des facteurs identifiés.");
    }

    const actionsComportement = [];
    if (analyse.hyperphagie === "oui") actionsComportement.push("Explorer les quantités prises aux repas et les facteurs favorisant l’hyperphagie prandiale.");
    if (analyse.tachyphagie === "oui") actionsComportement.push("Travailler la vitesse de prise alimentaire, le temps de repas et les signaux de rassasiement.");
    if (analyse.alimentationEmotionnelle === "oui") actionsComportement.push("Identifier les émotions et situations associées aux prises alimentaires.");
    if (analyse.grignotage === "oui") actionsComportement.push("Décrire la fréquence, le contexte, les aliments concernés et les déclencheurs du grignotage/compulsions.");
    if (analyse.restriction === "oui") actionsComportement.push("Éviter de renforcer une logique de régimes restrictifs répétés ; travailler la régularité et la flexibilité alimentaire.");

    if (actionsComportement.length && analyse.tcaAlerte !== "oui") {
      add("moyenne", "Comportement alimentaire", "Adapter l’intervention aux comportements présents",
        "Améliorer la régulation alimentaire sans imposer de stratégie uniforme.",
        actionsComportement,
        "Réévaluer faim, rassasiement, rythme des repas et fréquence des comportements ciblés.");
    }

    if (calculs?.obesiteActive) {
      // Garde-fou pluripathologique local : même si l'état de Calculs est ancien
      // ou incomplet, une dénutrition diagnostiquée ou une alerte TCA empêche
      // le module Obésité de générer un axe de restriction énergétique.
      const restrictionPrioritaire =
        denutrition?.diagnostic === true ||
        analyse.tcaAlerte === "oui" ||
        calculs.restrictionNonProposee === true;

      if (calculs.objectifTherapeutique === "perte" && !restrictionPrioritaire) {
        add("moyenne", "Stratégie énergétique", "Perte pondérale progressive choisie",
          "Appliquer l'objectif énergétique de travail individualisé déjà défini dans Calculs nutritionnels, selon la tolérance et l'adhésion du patient.",
          [
            "Utiliser l'objectif énergétique validé dans Calculs nutritionnels sans le recalculer dans la prise en charge.",
            "Identifier dans l'anamnèse les changements alimentaires réellement pertinents : densité énergétique, portions, boissons, fréquence des prises et qualité globale.",
            "Privilégier des modifications progressives plutôt qu'une restriction rigide de groupes d'aliments.",
            "Préserver des apports protéiques et une qualité nutritionnelle compatibles avec le maintien de la masse maigre."
          ],
          "Contrôler tolérance, faim/satiété, adhésion, qualité des apports et évolution pondérale.");
      } else if (calculs.objectifTherapeutique === "stabilisation") {
        add("basse", "Objectif thérapeutique", "Stabilisation pondérale",
          "Stabiliser la trajectoire pondérale tout en améliorant durablement la santé, le fonctionnement et les habitudes de vie.",
          [
            "Ne pas appliquer de déficit énergétique systématique.",
            "Choisir les modifications d'habitudes réellement pertinentes pour le patient.",
            "Valoriser les améliorations cliniques, fonctionnelles et comportementales indépendamment d'une perte de poids.",
            "Préserver une bonne condition physique et un niveau de masse musculaire satisfaisant."
          ],
          "Suivre l'évolution du poids et du tour de taille, les habitudes de vie, la condition physique et les paramètres de santé pertinents.");
      } else if (calculs.objectifTherapeutique === "prevention_reprise") {
        add("basse", "Maintien à long terme", "Prévention de la reprise pondérale",
          "Consolider les changements déjà obtenus et développer des stratégies permettant de les maintenir dans le temps.",
          [
            "Identifier les habitudes et stratégies qui ont permis la stabilisation.",
            "Repérer les périodes de fragilité : stress, changement de rythme, baisse de motivation, arrêt d'activité ou restriction excessive.",
            "Préparer avec le patient un plan d'action personnalisé de type « si… alors… » pour les situations à risque.",
            "Travailler la reprise des engagements après un écart sans culpabilisation."
          ],
          "Maintenir un suivi régulier de la trajectoire pondérale, des habitudes, de la motivation et des difficultés rencontrées.");
      } else if (calculs.objectifTherapeutique === "habitudes") {
        add("basse", "Habitudes de vie", "Pas d’objectif pondéral immédiat",
          "Améliorer progressivement la santé et le bien-être sans conditionner la réussite à une modification du poids.",
          [
            "Choisir un ou deux changements réalistes à partir de l'alimentation réellement observée.",
            "Intégrer selon les besoins l'activité physique, la réduction de la sédentarité, le sommeil et les rythmes de vie.",
            "Mesurer les progrès sur les comportements, le fonctionnement, la qualité de vie et les paramètres cliniques pertinents.",
            "Réévaluer ultérieurement la pertinence d'un objectif pondéral avec le patient."
          ],
          "Évaluer la faisabilité, le maintien des changements, la santé, le fonctionnement et le bien-être.");
      }
    }

    if (["modere", "important"].includes(analyse.retentissement)) {
      add("moyenne", "Activité / fonctionnement", "Adapter l’activité aux capacités fonctionnelles",
        "Augmenter progressivement le mouvement sans aggraver douleur ou limitations.",
        [
          "Tenir compte de la mobilité, des douleurs, de la dyspnée et des préférences.",
          "Commencer par des activités réalisables dans la vie quotidienne.",
          "Envisager APA ou kinésithérapie si nécessaire."
        ],
        "Suivre tolérance, régularité et évolution fonctionnelle.");
    } else if (analyse.sportPratique === "non") {
      add("basse", "Activité / sédentarité", "Réduire la sédentarité et remettre du mouvement",
        "Faire progresser l’activité quotidienne de manière réaliste et durable.",
        [
          "Identifier les périodes prolongées de sédentarité.",
          "Choisir des formes de mouvement compatibles avec les goûts et le contexte.",
          "Augmenter progressivement fréquence et durée."
        ],
        "Réévaluer le niveau d’activité et les obstacles.");
    }

    if (analyse.sommeilAlerte === "oui") {
      add("moyenne", "Sommeil", "Explorer un possible trouble respiratoire du sommeil",
        "Intégrer le sommeil à l’évaluation globale.",
        [
          "Documenter ronflement, somnolence et sommeil non réparateur.",
          "Proposer une évaluation médicale lorsque les signes le justifient.",
          "Travailler la régularité du rythme veille-sommeil."
        ],
        "Réévaluer sommeil et fatigue.");
    }

    if (analyse.medicamentPoids === "oui") {
      add("moyenne", "Traitements", "Vérifier l’impact potentiel d’un traitement sur le poids",
        "Intégrer les effets médicamenteux possibles à l’analyse sans modifier le traitement.",
        [
          "Identifier la molécule, sa date d’introduction et l’évolution pondérale.",
          "Transmettre au prescripteur si une discussion est pertinente."
        ],
        "Suivre l’évolution après toute décision médicale.");
    }

    if (analyse.stigmatisation === "oui") {
      add("moyenne", "Approche relationnelle", "Prévenir la stigmatisation et l’autostigmatisation",
        "Maintenir une prise en charge non culpabilisante et centrée sur les objectifs du patient.",
        [
          "Employer un langage respectueux choisi avec la personne.",
          "Éviter de réduire la réussite au chiffre de la balance.",
          "Valoriser les progrès de santé, de fonctionnement et de qualité de vie."
        ],
        "Réévaluer le vécu de la prise en charge.");
    }

    // Aucun problème identifié = aucune priorité artificielle. Les habitudes
    // favorables peuvent être valorisées dans l'éducation et le suivi global,
    // mais ne sont pas transformées en priorité de prise en charge.
    return list;
  }

  function afficherAnalyseObesite() {
    const section = document.getElementById("analyseObesiteSection");
    const conteneur = document.getElementById("analyseObesiteContainer");
    if (!section || !conteneur) return;

    const a = analyserObesite();

    if (!a) {
      section.hidden = true;
      conteneur.innerHTML = "";
      return;
    }

    section.hidden = false;

    const etat = a.completude.complet
      ? '<span class="obesity-completeness-badge">Données de base complètes</span>'
      : '<span class="obesity-completeness-badge">À compléter</span>';
    const champsManquants = a.completude.complet ? '' : `<p class="obesity-missing-fields">Champs manquants : ${echapperHTML(a.completude.manque.join(', '))}.</p>`;

    const alimentation =
      a.analyseAlimentaire;

    let analyseAlimentaireHTML = `
      <div class="analyse-detail-list">
        <div class="analyse-detail-row">
          <strong>Analyse alimentaire</strong>
          <span>Anamnèse non disponible ou aucun aliment exploitable actuellement.</span>
        </div>
      </div>
    `;

    if (
      alimentation?.disponible
    ) {
      const energieObservee =
        Number.isFinite(
          alimentation.energieTotale
        )
          ? `${Math.round(
              alimentation.energieTotale
            )} kcal/j${
              alimentation.energiePartielle
                ? " · estimation partielle"
                : ""
            }`
          : "Non disponible";

      const objectif =
        Number.isFinite(
          alimentation.objectifEnergetique
        )
          ? `${Math.round(
              alimentation.objectifEnergetique
            )} kcal/j`
          : "Non défini";

      const ecart =
        alimentation.energiePartielle
          ? "Non interprétable — données partielles"
          : Number.isFinite(
              alimentation.ecartEnergetique
            )
              ? `${
                  alimentation.ecartEnergetique > 0 ? "+" : ""
                }${Math.round(alimentation.ecartEnergetique)} kcal/j`
              : "Non calculable";

      const contributeursHTML = alimentation.principauxContributeurs.length
        ? alimentation.principauxContributeurs.map(aliment => `<tr><th scope="row">${echapperHTML(aliment.nom)}</th><td>${Math.round(aliment.energie)} kcal/j</td><td>${Number.isFinite(aliment.contribution) ? aliment.contribution.toFixed(1).replace('.', ',') + (alimentation.energiePartielle ? ' % des kcal connues' : ' %') : '—'}</td></tr>`).join('')
        : '<tr><td colspan="3">Non évaluables avec les données disponibles.</td></tr>';

      const densiteHTML =
        alimentation
          .alimentsDenses
          .length
          ? alimentation
              .alimentsDenses
              .map(
                aliment => `
                  <tr>
                    <th scope="row">${aliment.nom}</th>
                    <td>
                      ${Math.round(aliment.densiteEnergetique)} kcal/100 g
                    </td>
                  </tr>
                `
              )
              .join("")
          : `
              <tr>
                <th scope="row">Densité énergétique</th>
                <td>Non évaluable avec les données disponibles.</td>
              </tr>
            `;

      const boissonsHTML = alimentation.boissons.length
        ? alimentation.boissons.slice(0, 5).map(boisson => `<tr><th scope="row">${echapperHTML(boisson.nom)}</th><td>${Math.round(boisson.energie)} kcal/j</td><td>${Number.isFinite(alimentation.energieTotale) && alimentation.energieTotale > 0 ? (boisson.energie / alimentation.energieTotale * 100).toFixed(1).replace('.', ',') + (alimentation.energiePartielle ? ' % des kcal connues' : ' %') : '—'}</td></tr>`).join('')
        : '<tr><td colspan="3">Aucune boisson énergétique identifiable dans les aliments renseignés.</td></tr>';

      const repasHTML = alimentation.repas.length
        ? alimentation.repas.map(repas => `<tr><th scope="row">${echapperHTML(repas.nom)}${repas.partiel ? '<small class="obesity-partial-note">Estimation partielle</small>' : ''}</th><td>${Math.round(repas.energie)} kcal</td><td>${Number.isFinite(repas.contribution) ? repas.contribution.toFixed(1).replace('.', ',') + ' %' : '—'}</td></tr>`).join('')
        : '<tr><td colspan="3">Non disponible.</td></tr>';

      analyseAlimentaireHTML = `
        <div class="nutrition-calc-card-header analyse-pathologie-header" style="margin-top:20px">
          <span class="nutrition-calc-kicker">Anamnèse alimentaire</span>
          <h4>Analyse énergétique descriptive</h4>
          <p>Les données ci-dessous décrivent les apports réellement renseignés sans définir automatiquement une priorité de prise en charge.</p>
        </div>

        <div class="hta-analysis-table-wrap obesity-energy-summary-wrap">
          <table class="hta-analysis-table obesity-energy-summary" aria-label="Synthèse énergétique quotidienne">
            <thead><tr><th scope="col">Énergie observée</th><th scope="col">Objectif énergétique</th><th scope="col">Écart</th></tr></thead>
            <tbody><tr><td>${energieObservee}</td><td>${objectif}</td><td>${ecart}</td></tr></tbody>
          </table>
        </div>

        <section class="obesity-analysis-table-block">
          <div class="diabetes-analysis-block-header"><div><h4>Répartition énergétique par repas</h4><span>Répartition descriptive des apports connus sur la journée.</span></div></div>
          <div class="hta-analysis-table-wrap"><table class="hta-analysis-table obesity-analysis-table">
            <thead><tr><th scope="col">Repas</th><th scope="col">Énergie</th><th scope="col">Contribution</th></tr></thead>
            <tbody>${repasHTML}</tbody>
            <tfoot><tr><th scope="row">Total${alimentation.energiePartielle ? '<span class="analysis-quality-icon" tabindex="0" data-tooltip="Certaines valeurs de composition restent à compléter." title="Certaines valeurs de composition restent à compléter." aria-label="Certaines valeurs de composition restent à compléter">ⓘ</span>' : ''}</th><td>${Number.isFinite(alimentation.energieTotale) ? (alimentation.energiePartielle ? '≥ ' : '') + Math.round(alimentation.energieTotale) + ' kcal' : '—'}</td><td>${Number.isFinite(alimentation.energieTotale) && alimentation.energieTotale > 0 ? (alimentation.energiePartielle ? '100 % des kcal connues' : '100 %') : '—'}</td></tr></tfoot>
          </table></div>
        </section>

        <div class="obesity-energy-tables">
<section class="obesity-analysis-table-block">
          <div class="diabetes-analysis-block-header"><div><h4>Principaux contributeurs énergétiques</h4><span>${alimentation.energiePartielle ? "Aliments classés selon leur contribution aux kilocalories actuellement connues ; la couverture CIQUAL est partielle." : "Aliments classés selon leur contribution quotidienne à l'énergie estimée."}</span></div></div>
          <div class="hta-analysis-table-wrap"><table class="hta-analysis-table obesity-analysis-table">
            <thead><tr><th scope="col">Aliment</th><th scope="col">Énergie</th><th scope="col">Contribution</th></tr></thead>
            <tbody>${contributeursHTML}</tbody>
          </table></div>
        </section>
<section class="obesity-analysis-table-block">
          <div class="diabetes-analysis-block-header"><div><h4>Aliments les plus denses en énergie</h4><span>Classement descriptif en kcal/100 g. Une densité élevée n'implique pas à elle seule qu'un aliment doive être réduit.</span></div></div>
          <div class="hta-analysis-table-wrap"><table class="hta-analysis-table obesity-analysis-table">
            <thead><tr><th scope="col">Aliment</th><th scope="col">Densité énergétique</th></tr></thead>
            <tbody>${densiteHTML}</tbody>
          </table></div>
        </section>
        </div>

        <section class="obesity-analysis-table-block">
          <div class="diabetes-analysis-block-header"><div><h4>Énergie provenant des boissons</h4><span>${alimentation.energiePartielle ? "Les cinq principales boissons et leur part des kilocalories actuellement connues." : "Les cinq principales boissons et leur contribution à l’énergie quotidienne estimée."}</span></div></div>
          <div class="hta-analysis-table-wrap"><table class="hta-analysis-table obesity-analysis-table">
            <thead><tr><th scope="col">Boisson</th><th scope="col">Énergie</th><th scope="col">Contribution</th></tr></thead>
            <tbody>${boissonsHTML}</tbody>
            ${alimentation.boissons.length ? `<tfoot><tr><th scope="row">Total des boissons</th><td>${Math.round(alimentation.energieBoissons)} kcal/j</td><td>${Number.isFinite(alimentation.contributionBoissons) ? alimentation.contributionBoissons.toFixed(1).replace('.', ',') + (alimentation.energiePartielle ? ' % des kcal connues' : ' %') : '—'}</td></tr></tfoot>` : ''}
          </table></div>
        </section>
      `;
    }

    const postBariatrique = ["sleeve", "bypass", "autre_postop"].includes(a.chirurgieBariatrique);
    const codesMicronutrition = postBariatrique
      ? ["vitamineB1", "vitamineD", "vitamineB12", "vitamineB9", "fer", "calcium", "zinc", "magnesium", "phosphore"]
      : ["vitamineD", "vitamineB12", "vitamineB9", "fer", "calcium", "zinc"];

    const micronutritionAnalyseHTML =
      typeof construireHTMLAnalyseMicronutritionnelle === "function"
        ? construireHTMLAnalyseMicronutritionnelle(
            codesMicronutrition,
            {
              contextePathologique: "obesite",
              titre: postBariatrique
                ? "Micronutriments — suivi post-bariatrique"
                : "Micronutriments — apports, repères et biologie",
              sousTitre: postBariatrique
                ? "Après chirurgie bariatrique, les apports et la biologie sont confrontés aux repères ; les principaux contributeurs restent intégrés à chaque ligne."
                : "Analyse descriptive des apports micronutritionnels. Hors contexte particulier, l'obésité seule ne transforme pas ces données en indication de dosage ou de supplémentation."
            }
          )
        : "";

    conteneur.innerHTML = `
      <div class="nutrition-calc-card-header analyse-pathologie-header">
        <span class="nutrition-calc-kicker">Analyse spécifique</span>
        <div class="obesity-analysis-title"><h3>Obésité</h3>${etat}</div>
        ${champsManquants}
        <p>Évaluation descriptive : corpulence, dynamique pondérale, retentissement, comportement alimentaire, contexte et anamnèse alimentaire.</p>
      </div>


      <div class="analyse-detail-list">
        ${a.constats.map(x => `
          <div class="analyse-detail-row">
            <strong>${x.titre}</strong>
            <span>${x.texte}</span>
          </div>
        `).join("")}
      </div>

      ${analyseAlimentaireHTML}
      ${micronutritionAnalyseHTML}
    `;
  }


  function construireEducationNutritionnelleObesite(analyse) {
    const items = [];
    const add = (titre, texte) => items.push({ titre, texte });

    add("Repères alimentaires personnalisés",
      "Construire avec le patient des changements réalistes à partir de son alimentation habituelle, sans liste uniforme d’aliments interdits.");

    if (analyse.tachyphagie === "oui") {
      add("Rythme du repas et rassasiement",
        "Expérimenter un ralentissement de la prise alimentaire et apprendre à repérer l’évolution de la faim, du plaisir alimentaire et du rassasiement au cours du repas.");
    }
    if (analyse.hyperphagie === "oui") {
      add("Quantités et signaux internes",
        "Explorer ce qui conduit à des quantités importantes aux repas et travailler des repères compatibles avec la faim, le rassasiement et le contexte réel du patient.");
    }
    if (analyse.alimentationEmotionnelle === "oui") {
      add("Alimentation émotionnelle",
        "Aider à distinguer faim physiologique, envie de manger et prises alimentaires liées aux émotions, puis identifier avec le patient des réponses alternatives adaptées.");
    }
    if (analyse.grignotage === "oui") {
      add("Grignotages et compulsions",
        "Repérer les situations déclenchantes, la fréquence et la fonction des prises hors repas avant de proposer une modification ciblée.");
    }
    if (analyse.restriction === "oui") {
      add("Sortir des restrictions répétées",
        "Éviter de renforcer les cycles restriction–perte–reprise ; privilégier une alimentation suffisamment structurée, flexible et durable.");
    }

    const alim = analyse.analyseAlimentaire;
    if (alim?.disponible && alim.boissons?.length) {
      add("Boissons énergétiques",
        "Montrer au patient la contribution réellement observée des boissons à ses apports et décider avec lui si une modification est pertinente.");
    }
    if (alim?.disponible && alim.alimentsDenses?.length) {
      add("Densité énergétique",
        "Expliquer la notion de densité énergétique sans classer automatiquement les aliments en aliments « autorisés » ou « interdits » ; raisonner sur fréquence, quantité et contexte.");
    }

    add("Autonomie du patient",
      "Définir un ou deux objectifs éducatifs prioritaires, vérifiables et choisis avec le patient, puis réévaluer leur faisabilité au suivi.");
    return items;
  }

  function construireMicronutritionObesite(analyse) {
    if (!analyse || typeof construirePriseEnChargeMicronutritionnelle !== "function") return [];

    const postBariatrique = ["sleeve", "bypass", "autre_postop"].includes(analyse.chirurgieBariatrique);
    const projetBariatrique = analyse.chirurgieBariatrique === "projet";
    const codesBase = ["vitamineD", "vitamineB12", "vitamineB9", "fer", "calcium", "zinc"];
    const codes = postBariatrique
      ? ["vitamineB1", ...codesBase, "magnesium", "phosphore"]
      : codesBase;

    const lienPour = code => {
      if (postBariatrique) {
        if (code === "vitamineB1") {
          return "Après chirurgie bariatrique, des vomissements, une réduction importante des apports ou une mauvaise tolérance peuvent exposer rapidement à un déficit en thiamine ; les signes cliniques priment en situation à risque.";
        }
        return "Après chirurgie bariatrique, la réduction des apports et, selon la technique, la modification de l'absorption augmentent le risque d'insuffisance micronutritionnelle ; le suivi doit rester coordonné au parcours bariatrique.";
      }

      if (projetBariatrique) {
        return "Avant une chirurgie bariatrique, un déficit préexistant ou une couverture alimentaire insuffisante doit être identifié afin de sécuriser le parcours nutritionnel préopératoire.";
      }

      return "L'obésité seule ne justifie pas une supplémentation ou un dosage systématique. Cet axe n'est proposé que lorsqu'un écart alimentaire ou biologique réellement renseigné est identifié.";
    };

    const items = codes
      .map(code => construirePriseEnChargeMicronutritionnelle(code, { contextePathologique: "obesite", lien: lienPour(code) }))
      .filter(Boolean);

    if (postBariatrique) {
      items.unshift({
        niveau: "haute",
        titre: "Surveillance micronutritionnelle post-bariatrique",
        lien: "La chirurgie bariatrique expose à des carences par réduction des apports et, selon la technique, par modification de l'absorption.",
        action: "Poursuivre la surveillance biologique et les supplémentations prescrites selon le type de chirurgie, les résultats biologiques et la qualité des apports. NutriFlow ne modifie aucune supplémentation prescrite."
      });
    } else if (projetBariatrique) {
      items.unshift({
        niveau: "moyenne",
        titre: "Préparation bariatrique — statut micronutritionnel",
        lien: "Le statut micronutritionnel préopératoire fait partie de la sécurisation du parcours bariatrique.",
        action: "Faire corriger les déficits identifiés dans le parcours spécialisé et améliorer les apports alimentaires insuffisants lorsqu'ils sont modifiables."
      });
    } else if (items.length) {
      items.unshift({
        niveau: "information",
        titre: "Micronutrition hors chirurgie bariatrique",
        lien: "L'obésité seule n'est pas une indication de dosage systématique des vitamines et minéraux en l'absence de perte massive ou de signes évocateurs.",
        action: "Travailler uniquement les écarts réellement identifiés dans l'anamnèse ou la biologie et éviter toute supplémentation automatique."
      });
    }

    return items;
  }


  function construireTraitementsObesite(analyse) {
    const items = [];
    const add = (titre, texte) => items.push({ titre, texte });

    if (analyse.medicamentPoids === "oui") {
      add("Traitement pouvant influencer le poids",
        "Identifier la molécule, sa date d’introduction et la chronologie de l’évolution pondérale. Ne jamais modifier le traitement dans NutriFlow ; transmettre au prescripteur lorsqu’une réévaluation paraît pertinente.");
    }

    add("Traitement pharmacologique de l’obésité",
      "S’il existe ou est envisagé par le médecin, intégrer ses effets sur les prises alimentaires, la tolérance et l’état nutritionnel au suivi diététique. L’indication et la prescription restent médicales.");
    if (["projet", "sleeve", "bypass", "autre_postop"].includes(analyse.chirurgieBariatrique)) {
      add("Chirurgie bariatrique",
        "Le contexte bariatrique est renseigné. Intégrer le parcours pré/postopératoire, la surveillance nutritionnelle, la prise régulière des suppléments prescrits et le suivi pluriprofessionnel au long cours.");
    }
    add("Comorbidités",
      "Prendre en compte les traitements des pathologies associées et leurs implications nutritionnelles lors du croisement pluripathologique.");
    return items;
  }

  function construireVigilancesObesite(analyse) {
    const items = [];
    const add = (niveau, titre, texte) => items.push({ niveau, titre, texte });

    const denutrition = analyse?.synthese?.etatNutritionnel?.has ?? null;

    if (denutrition?.diagnostic === true) {
      add("haute", "Dénutrition associée",
        "Une obésité n’exclut pas une dénutrition. Prioriser la sécurité protéino-énergétique et la préservation de la masse maigre avant toute réduction énergétique.");
    }
    if (analyse.tcaAlerte === "oui") {
      add("haute", "TCA à explorer",
        "Éviter une stratégie restrictive rigide et organiser une évaluation adaptée ; NutriFlow ne pose pas le diagnostic de TCA.");
    }
    if (analyse.dynamique === "rapide") {
      add("haute", "Variation pondérale rapide",
        "Rechercher une cause ou un facteur déclenchant récent avant d’intensifier un objectif de perte pondérale.");
    }
    if (analyse.sommeilAlerte === "oui") {
      add("moyenne", "Suspicion de trouble respiratoire du sommeil",
        "Les signes rapportés justifient d’envisager une évaluation médicale.");
    }
    if (["modere", "important"].includes(analyse.retentissement)) {
      add("moyenne", "Limitations fonctionnelles",
        "Adapter l’activité physique et l’objectif thérapeutique à la mobilité, à la douleur, à la dyspnée et aux capacités actuelles.");
    }
    if (analyse.stigmatisation === "oui") {
      add("moyenne", "Stigmatisation",
        "Maintenir une communication non culpabilisante et surveiller l’impact de la prise en charge sur le vécu et l’estime de soi.");
    }
    if (!items.length) {
      add("basse", "Vigilance générale",
        "Surveiller l’évolution de l’état nutritionnel, des comorbidités, du fonctionnement, du comportement alimentaire et de la qualité de vie au cours du suivi.");
    }
    return items;
  }

  function afficherPriseEnChargeObesite() {
    const conteneur = document.getElementById("priseEnChargePathologies");
    if (!conteneur) return;

    let bloc = document.getElementById("priseEnChargeObesite");
    const a = analyserObesite();

    if (!a) {
      bloc?.remove();
      return;
    }

    conteneur.querySelectorAll(":scope > .module-placeholder").forEach(el => el.remove());

    if (!bloc) {
      bloc = document.createElement("section");
      bloc.id = "priseEnChargeObesite";
      bloc.className = "nutrition-calc-card pec-diabetes-card pec-pathology-card";
      conteneur.appendChild(bloc);
    }

    const ps = priorites(a);
    const calculs = typeof window.obtenirEtatCalculsObesite === "function"
      ? window.obtenirEtatCalculsObesite()
      : null;

    const education = construireEducationNutritionnelleObesite(a);
    const traitements = construireTraitementsObesite(a);
    const micronutrition = construireMicronutritionObesite(a);
    const vigilances = construireVigilancesObesite(a);

    const resumeCalculs = calculs?.obesiteActive
      ? `
        <div class="nutrition-hta-summary">
          <div>
            <span>Stratégie thérapeutique retenue</span>
            <strong>${calculs.objectifTherapeutiqueLibelle}</strong>
            <small>Les valeurs chiffrées restent dans Calculs nutritionnels ; la prise en charge les utilise sans les dupliquer.</small>
          </div>
        </div>`
      : "";

    bloc.innerHTML = `
      <div class="pec-diabetes-header">
        <div><span class="pec-diabetes-kicker">OBÉSITÉ</span><h3>Prise en charge — Obésité</h3></div>
        <span class="pec-diabetes-validation">À valider par le diététicien</span>
      </div>
      <div class="pec-diabetes-notice">La stratégie reprend les données Patient et le choix effectué dans Calculs. Les priorités sont organisées en objectifs, actions et suivi.</div>

      ${resumeCalculs}

      <div class="pec-diabetes-section"><div class="pec-diabetes-section-title"><h4>Priorités et objectifs proposés</h4><span>Selon les données actuellement disponibles</span></div><div class="pec-diabetes-grid">
        ${ps.length ? ps.map((x, index) => `
          <article class="pec-diabetes-item">
            <div class="pec-diabetes-item-head"><span class="pec-diabetes-rank">${index + 1}</span><div><h4>${x.titre}</h4><span>${niveauLabel(x.niveau)}</span></div></div>
            <p><strong>${x.categorie}</strong></p>
            <div class="pec-diabetes-objective"><strong>Objectif proposé</strong><span>${x.objectif}</span></div>
            <div class="pec-diabetes-section pec-diabetes-panel" style="margin-top:12px">
              <strong>Actions proposées</strong>
              <ul>${x.actions.map(action => `<li>${action}</li>`).join("")}</ul>
            </div>
            ${x.suivi ? `<div class="pec-diabetes-notice" style="margin-top:12px"><strong>Suivi :</strong> ${x.suivi}</div>` : ""}
          </article>
        `).join("") : `<div class="pec-diabetes-empty">Aucune priorité spécifique n'est générée avec les données actuellement renseignées.</div>`}
      </div>

      </div>

      <div class="pec-diabetes-section">
        <div class="pec-diabetes-section-title"><h4>Éducation nutritionnelle</h4><span>Compétences et autonomie à travailler avec le patient</span></div>
        <div class="pec-diabetes-grid">
          ${education.map(x => `<article class="pec-diabetes-item"><h4>${x.titre}</h4><p>${x.texte}</p></article>`).join("")}
        </div>
      </div>

      <div class="pec-diabetes-section">
        <div class="pec-diabetes-section-title"><h4>Traitements et parcours de soins</h4><span>Implications pour la prise en charge diététique</span></div>
        <div class="pec-diabetes-grid">
          ${traitements.map(x => `<article class="pec-diabetes-item"><h4>${x.titre}</h4><p>${x.texte}</p></article>`).join("")}
        </div>
      </div>

      ${micronutrition.length ? `
      <div class="pec-diabetes-section">
        <div class="pec-diabetes-section-title"><h4>Micronutrition</h4><span>Lien clinique → action</span></div>
        <div class="pec-diabetes-grid">
          ${micronutrition.map(x => `<article class="pec-diabetes-item"><div class="pec-diabetes-item-head"><div><h4>${x.titre}</h4><span>${niveauLabel(x.niveau)}</span></div></div><p><strong>Lien avec l'obésité / le contexte :</strong> ${x.lien}</p><p><strong>Action :</strong> ${x.action}</p></article>`).join("")}
        </div>
      </div>` : ""}

      <div class="pec-diabetes-section">
        <div class="pec-diabetes-section-title"><h4>Vigilances</h4><span>Points nécessitant une attention particulière</span></div>
        <div class="pec-diabetes-grid">
          ${vigilances.map(x => `<article class="pec-diabetes-item"><div class="pec-diabetes-item-head"><div><h4>${x.titre}</h4><span>${niveauLabel(x.niveau)}</span></div></div><p>${x.texte}</p></article>`).join("")}
        </div>
      </div>

      <p class="nutrition-calc-note">Références : HAS, Guide du parcours de soins surpoids et obésité de l’adulte, mise à jour 2024 ; HAS, Obésité de l’adulte : prise en charge de 2e et 3e niveaux, février 2024 ; Consensus BASO 2020. Les propositions restent à valider par le diététicien.</p>
    `;
  }

  function afficherDetailObesite() {
    const bloc = $("obesiteDetails");
    if (!bloc) return;
    bloc.style.display = "";
    bloc.classList.toggle("est-visible", obesiteActive());
  }

  function actualiserObesite() {
    afficherDetailObesite();
    window.rafraichirSortiesPathologiques?.();
  }

  window.obesiteActive = obesiteActive;
  window.obtenirAnalyseAnamneseObesite = obtenirAnalyseAnamneseObesite;
  window.analyserObesite = analyserObesite;
  window.afficherAnalyseObesite = afficherAnalyseObesite;
  window.afficherPriseEnChargeObesite = afficherPriseEnChargeObesite;
  window.actualiserObesite = actualiserObesite;

  window.enregistrerModulePathologique?.({
    id: "obesite",
    champs: [
      "poids", "taille", "sexe", "tourTaille", "obesiteAgeDebut", "obesitePoidsForme",
      "obesiteDynamiquePoids", "obesiteHistoireDetails", "obesiteRetentissementFonctionnel",
      "obesiteStigmatisation", "obesiteSommeilAlerte", "obesiteMedicamentPoids",
      "obesiteChirurgieBariatrique",
      "obesiteRetentissementDetails", "obesiteHyperphagiePrandiale", "obesiteTachyphagie",
      "obesiteAlimentationEmotionnelle", "obesiteGrignotageCompulsions",
      "obesiteRestrictionCognitive", "obesiteTcaAlerte", "obesiteEoss",
      "obesitePrioritePatient", "obesiteAttentes", "objectif", "sportPratique",
      "objectifEnergetique", "objectifTherapeutiqueObesite", "poidsCibleCalculs",
      "macro-proteines-slider", "macro-glucides-slider", "macro-lipides-slider"
    ],
    selecteurs: ['input[name="pathologies"][value="Obésité"]'],
    analyse: afficherAnalyseObesite,
    priseEnCharge: afficherPriseEnChargeObesite
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelector('input[name="pathologies"][value="Obésité"]')
      ?.addEventListener("change", afficherDetailObesite);
    afficherDetailObesite();
  });
})();
