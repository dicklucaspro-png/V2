
//! OUTILS // 


function ajouterElementDiabete(
    liste,
    niveau,
    code,
    titre,
    detail,
    origine = ""
) {

    const existe =
        liste.some(
            element =>
                element.code === code
        );

    if (existe) {
        return;
    }


    liste.push({
        niveau,
        code,
        titre,
        detail,
        origine
    });
}


//! VALEURS NUMERIQUES // 


function nombreDiabete(valeur) {

    const nombre =
        Number.parseFloat(valeur);

    return Number.isFinite(nombre)
        ? nombre
        : null;
}


// Les données thérapeutiques du diabète sont désormais centralisées dans
// construireSynthesePatient() / obtenirDonneesDiabete(). Le module clinique
// ne relit plus ces champs directement dans le DOM.


function obtenirEtatHypoglycemiesDiabete(analyseOuDiabete) {
    const d = analyseOuDiabete?.synthese?.diabete || analyseOuDiabete || {};
    const sources = [];
    const ajouter = (source, valeur) => {
        if (["oui", "non", "inconnu"].includes(valeur)) {
            sources.push({ source, valeur });
        }
    };

    ajouter("Épisodes récents", d.episodes?.hypoglycemies);

    if (d.type === "DT1") {
        if (d.traitement === "pompe") {
            ajouter("Pompe à insuline", d.dt1?.pompe?.hypoglycemies);
        } else if (d.traitement === "insulinotherapie") {
            ajouter("Insulinothérapie", d.dt1?.hypoglycemies);
        }
    }

    if (d.type === "DT2") {
        if (d.traitement === "insuline") ajouter("Insulinothérapie DT2", d.dt2?.insuline?.hypoglycemies);
        if (d.traitement === "sulfamides") ajouter("Sulfamides", d.dt2?.sulfamides?.hypoglycemies);
        if (d.traitement === "glinides") ajouter("Glinides", d.dt2?.glinides?.hypoglycemies);
        if (d.traitement === "association") ajouter("Association thérapeutique", d.dt2?.association?.hypoglycemies);
    }

    const oui = sources.filter(item => item.valeur === "oui");
    const non = sources.filter(item => item.valeur === "non");

    return {
        rapportees: oui.length > 0,
        explicitementAbsentes: sources.length > 0 && oui.length === 0 && non.length === sources.length,
        discordantes: oui.length > 0 && non.length > 0,
        sources
    };
}

function traitementExposeHypoglycemieDiabete(analyse) {
    if (!analyse) return false;

    // Ne jamais déduire une insulinothérapie du seul diagnostic de DT1.
    // Le risque thérapeutique n'est généré que si un traitement actif est renseigné.
    if (analyse.type === "DT1") {
        return ["insulinotherapie", "pompe"].includes(analyse.traitement);
    }

    return ["sulfamides", "glinides", "insuline"].includes(analyse.traitement);
}


//! LIBELLE TYPE // 


function obtenirLibelleTypeDiabete(
    type
) {

    const types = {

        DT1:
            "Diabète de type 1",

        DT2:
            "Diabète de type 2"
    };


    return (
        types[type] ??
        "Type non renseigné"
    );
}


//! LIBELLE TRAITEMENT // 


function obtenirLibelleTraitementDiabete(
    traitement
) {

    const traitements = {

        aucun:
            "Aucun traitement",

        metformine:
            "Metformine",

        sulfamides:
            "Sulfamides hypoglycémiants",

        glinides:
            "Glinides",

        dpp4:
            "Inhibiteurs DPP-4",

        glp1:
            "Agonistes GLP-1",

        sglt2:
            "Inhibiteurs SGLT2",

        insuline:
            "Insuline",

        association:
            "Association de traitements",

        autre:
            "Autre traitement",

        insulinotherapie:
            "Insulinothérapie",

        pompe:
            "Pompe à insuline"
    };


    return (
        traitements[traitement] ??
        "Non renseigné"
    );
}


function traitementInclutMetformineDiabete(analyseOuDiabete) {
    const diabete =
        analyseOuDiabete?.synthese?.diabete ||
        analyseOuDiabete ||
        {};

    if (diabete.type !== "DT2") {
        return false;
    }

    if (diabete.traitement === "metformine") {
        return true;
    }

    if (diabete.traitement !== "association") {
        return false;
    }

    const traitementsAssocies =
        String(
            diabete.dt2?.association?.traitements ??
            ""
        )
            .toLocaleLowerCase("fr")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, " ")
            .trim();

    if (!traitementsAssocies) {
        return false;
    }

    // Le champ association est libre : reconnaître le nom générique
    // et quelques libellés commerciaux usuels sans déduire la présence
    // de metformine lorsque les molécules ne sont pas explicitement renseignées.
    return (
        traitementsAssocies.includes("metformin") ||
        traitementsAssocies.includes("glucophage") ||
        traitementsAssocies.includes("metformax")
    );
}


//! PATIENT — CONTEXTE CLINIQUE ET AFFICHAGE // 


function obtenirLibelleContexteGlycemieDiabete(valeur) {
    const libelles = {
        jeun: "À jeun",
        preprandiale: "Préprandiale",
        postprandiale: "Postprandiale",
        aleatoire: "Aléatoire / autre"
    };
    return libelles[valeur] || "Contexte non renseigné";
}

function calculerAncienneteDiabete(dateDiagnostic) {
    if (!dateDiagnostic) return null;
    const diagnostic = new Date(`${dateDiagnostic}T00:00:00`);
    if (Number.isNaN(diagnostic.getTime())) return null;
    const maintenant = new Date();
    if (diagnostic > maintenant) return null;

    let annees = maintenant.getFullYear() - diagnostic.getFullYear();
    let mois = maintenant.getMonth() - diagnostic.getMonth();
    if (maintenant.getDate() < diagnostic.getDate()) mois -= 1;
    if (mois < 0) {
        annees -= 1;
        mois += 12;
    }

    return { annees: Math.max(0, annees), mois: Math.max(0, mois) };
}

function formaterAncienneteDiabete(dateDiagnostic) {
    const duree = calculerAncienneteDiabete(dateDiagnostic);
    if (!duree) return "Ancienneté non calculable";
    if (duree.annees === 0) return `${duree.mois} mois`;
    if (duree.mois === 0) return `${duree.annees} an${duree.annees > 1 ? "s" : ""}`;
    return `${duree.annees} an${duree.annees > 1 ? "s" : ""} et ${duree.mois} mois`;
}

function actualiserDetailsPatientDiabete() {
    const type = document.getElementById("diabeteType")?.value || "";
    const dateDiagnostic = document.getElementById("diabeteDateDiagnostic")?.value || "";
    const anciennete = document.getElementById("diabeteDureeDiagnostic");
    const groupeAcidocetose = document.getElementById("diabeteAcidocetoseGroupe");

    if (anciennete) {
        anciennete.textContent = dateDiagnostic
            ? formaterAncienneteDiabete(dateDiagnostic)
            : "Calculée automatiquement à partir de la date du diagnostic.";
    }

    if (groupeAcidocetose) {
        groupeAcidocetose.hidden = type !== "DT1";
    }
}

function analyserContexteCliniqueDiabete(synthese, donnees, priorites, vigilances) {
    const diabete = synthese.diabete || {};

    const hba1c = nombreDiabete(diabete.hba1c);
    const objectifHba1c = nombreDiabete(diabete.hba1cObjectif);

    if (Number.isFinite(hba1c)) {
        let detail = `${hba1c.toFixed(1).replace(".", ",")} %`;
        if (diabete.hba1cDate) detail += ` · ${diabete.hba1cDate}`;
        if (Number.isFinite(objectifHba1c)) detail += ` · objectif renseigné : ${objectifHba1c.toFixed(1).replace(".", ",")} %`;

        ajouterElementDiabete(
            donnees,
            "information",
            "hba1c-renseignee",
            "HbA1c",
            detail,
            "Patient / biologie"
        );

        if (Number.isFinite(objectifHba1c) && hba1c > objectifHba1c) {
            ajouterElementDiabete(
                priorites,
                "moyenne",
                "hba1c-au-dessus-objectif",
                "HbA1c au-dessus de l'objectif renseigné",
                `HbA1c ${hba1c.toFixed(1).replace(".", ",")} % pour un objectif individualisé renseigné à ${objectifHba1c.toFixed(1).replace(".", ",")} %. Les facteurs alimentaires, l'organisation des repas, l'activité et le traitement doivent être confrontés ensemble.`,
                "Patient / biologie"
            );
        }
    }

    const glycemie = nombreDiabete(diabete.glycemie);
    if (Number.isFinite(glycemie)) {
        const unite = diabete.glycemieUnite || "";
        const contexte = obtenirLibelleContexteGlycemieDiabete(diabete.glycemieContexte);
        const date = diabete.glycemieDate ? ` · ${diabete.glycemieDate}` : "";
        ajouterElementDiabete(
            donnees,
            "information",
            "glycemie-renseignee",
            "Glycémie récente",
            `${glycemie.toLocaleString("fr-FR")} ${unite} · ${contexte}${date}`,
            "Patient / biologie"
        );
    }

    const surveillance = diabete.surveillance || {};
    if (surveillance.autosurveillance || surveillance.capteur || surveillance.details) {
        const elements = [];
        if (surveillance.autosurveillance) elements.push(`autosurveillance : ${surveillance.autosurveillance === "oui" ? "oui" : "non"}`);
        if (surveillance.capteur) elements.push(`capteur / CGM : ${surveillance.capteur === "oui" ? "oui" : "non"}`);
        if (surveillance.details) elements.push(surveillance.details);
        ajouterElementDiabete(donnees, "information", "surveillance-glycemique", "Surveillance glycémique", elements.join(" · "), "Patient");
    }

    const episodes = diabete.episodes || {};
    if (episodes.hypoglycemies === "oui") {
        ajouterElementDiabete(
            priorites,
            "haute",
            "hypoglycemies-recentes",
            "Hypoglycémies récentes",
            episodes.details
                ? `Des hypoglycémies récentes sont rapportées. ${episodes.details}`
                : "Des hypoglycémies récentes sont rapportées. Leur fréquence, leur contexte, les repas, l'activité physique et le traitement doivent être analysés conjointement.",
            "Patient"
        );
    }

    if (episodes.hyperglycemies === "oui") {
        ajouterElementDiabete(
            vigilances,
            "haute",
            "hyperglycemies-symptomatiques",
            "Hyperglycémies symptomatiques rapportées",
            "Des épisodes d'hyperglycémie symptomatique sont renseignés. Ils doivent être contextualisés et, si nécessaire, faire l'objet d'une coordination médicale ; NutriFlow ne modifie pas le traitement.",
            "Patient"
        );
    }

    if (diabete.type === "DT1" && episodes.acidocetose === "oui") {
        ajouterElementDiabete(
            vigilances,
            "moyenne",
            "antecedent-acidocetose",
            "Antécédent d'acidocétose",
            "Un antécédent d'acidocétose diabétique est renseigné. Conserver ce contexte dans l'éducation et les consignes de sécurité définies avec l'équipe soignante.",
            "Patient"
        );
    }

    const dietetique = diabete.dietetique || {};
    if (dietetique.repasIrreguliers === "oui") {
        ajouterElementDiabete(
            priorites,
            "moyenne",
            "repas-irreguliers-diabete",
            "Repas irréguliers ou sautés",
            "Des repas irréguliers ou sautés sont signalés. L'organisation des prises doit être confrontée au traitement, aux apports glucidiques et au risque d'hypoglycémie.",
            "Patient"
        );
    }

    if (dietetique.comptageGlucides === "partiel") {
        ajouterElementDiabete(
            vigilances,
            "moyenne",
            "comptage-glucides-apprentissage",
            "Comptage des glucides en apprentissage",
            "Le comptage des glucides est renseigné comme partiellement maîtrisé. Les quantités calculées dans l'anamnèse peuvent servir de support éducatif, sans calcul automatique de dose d'insuline.",
            "Patient"
        );
    }

    if (dietetique.lienRepasActiviteGlycemie) {
        ajouterElementDiabete(
            donnees,
            "information",
            "lien-repas-activite-glycemie",
            "Lien repas / activité / glycémie",
            dietetique.lienRepasActiviteGlycemie,
            "Patient"
        );
    }

    const complications = diabete.complications || {};
    const libellesComplications = {
        retinopathie: "Rétinopathie",
        neuropathie: "Neuropathie",
        nephropathie: "Néphropathie / albuminurie",
        pied: "Pied diabétique / plaie",
        cardiovasculaire: "Complication cardiovasculaire"
    };
    const presentes = Object.entries(libellesComplications)
        .filter(([cle]) => complications[cle] === "oui")
        .map(([, libelle]) => libelle);

    if (presentes.length) {
        ajouterElementDiabete(
            vigilances,
            "moyenne",
            "complications-diabetiques-connues",
            "Complications du diabète connues",
            `Complication${presentes.length > 1 ? "s" : ""} renseignée${presentes.length > 1 ? "s" : ""} : ${presentes.join(", ")}. La prise en charge nutritionnelle doit rester cohérente avec ces situations et les autres modules pathologiques du dossier.`,
            "Patient"
        );
    }
}


//! COMPLETUDE // 


function evaluerCompletudeDiabete(
    synthese
) {

    const manquants = [];

    const diabete =
        synthese.diabete;


    //* DIABETE

    if (!diabete) {

        return {
            complete: false,
            manquants: [
                "Diabète non sélectionné"
            ]
        };
    }

    //* TYPE

    if (!diabete.type) {

        manquants.push(
            "type de diabète"
        );
    }

    //* DIAGNOSTIC

    if (!diabete.dateDiagnostic) {

        manquants.push(
            "date du diagnostic"
        );
    }

    //* REPERES GLYCEMIQUES

    const hba1c = nombreDiabete(diabete.hba1c);
    const glycemie = nombreDiabete(diabete.glycemie);

    if (!Number.isFinite(hba1c) && !Number.isFinite(glycemie)) {
        manquants.push(
            "HbA1c ou glycémie récente"
        );
    }

    if (Number.isFinite(hba1c) && !diabete.hba1cDate) {
        manquants.push(
            "date de l'HbA1c"
        );
    }

    if (Number.isFinite(glycemie) && !diabete.glycemieContexte) {
        manquants.push(
            "contexte de la glycémie"
        );
    }

    //* TRAITEMENT

    if (!diabete.traitement) {

        manquants.push(
            "traitement actuel"
        );
    }

    //* ACTIVITE

    if (
        !synthese.contexte?.activite
    ) {

        manquants.push(
            "niveau d'activité physique"
        );
    }

    //* ANAMNESE

    if (
        !synthese.anamnese ||
        !synthese.anamnese.disponible
    ) {

        manquants.push(
            "anamnèse alimentaire"
        );
    }

    return {

        complete:
            manquants.length === 0,

        manquants
    };
}


//! ETAT NUTRITIONNEL // 


function analyserEtatNutritionnelDiabete(
    synthese,
    priorites,
    vigilances
) {

    const has =
        synthese
            .etatNutritionnel
            ?.has;


    if (!has) {
        return;
    }

    //* DENUTRITION SEVERE

    if (
        has.diagnostic &&
        has.severite?.niveau ===
        "severe"
    ) {

        ajouterElementDiabete(
            priorites,
            "haute",
            "denutrition-severe",
            "Dénutrition sévère",
            "Une dénutrition sévère est identifiée. L'état nutritionnel doit être intégré en priorité à l'analyse du diabète.",
            "HAS"
        );

        return;
    }

    //* DENUTRITION MODEREE

    if (
        has.diagnostic &&
        has.severite?.niveau ===
        "moderee"
    ) {

        ajouterElementDiabete(
            priorites,
            "haute",
            "denutrition-moderee",
            "Dénutrition modérée",
            "Une dénutrition modérée est identifiée. Elle doit être prise en compte avant de proposer des objectifs nutritionnels pouvant majorer une restriction alimentaire.",
            "HAS"
        );

        return;
    }

    //* CRITERES PARTIELS

    if (
        !has.diagnostic &&
        (
            has.phenotype?.length > 0 ||
            has.etiologie?.length > 0
        )
    ) {

        ajouterElementDiabete(
            vigilances,
            "moyenne",
            "etat-nutritionnel-surveillance",
            "État nutritionnel à surveiller",
            "Certains critères de dénutrition sont présents sans diagnostic HAS complet.",
            "HAS"
        );
    }
}


//! ANAMNESE — TOTAUX // 


function obtenirTotauxAnamneseDiabete(
    synthese
) {

    const totaux =
        synthese.anamnese?.totaux;

    if (!totaux) {
        return null;
    }


    return {

        energie:
            nombreDiabete(
                totaux.energie ??
                totaux.kcal ??
                totaux.calories
            ),

        glucides:
            nombreDiabete(
                totaux.glucides ??
                totaux.glucide
            ),

        fibres:
            nombreDiabete(
                totaux.fibres ??
                totaux.fibre
            ),

        lipides:
            nombreDiabete(
                totaux.lipides ??
                totaux.lipide
            ),

        proteines:
            nombreDiabete(
                totaux.proteines ??
                totaux.proteine
            ),

        sucres:
            nombreDiabete(
                totaux.sucres ??
                totaux.sucresSimples ??
                totaux.sucres_totaux
            )
    };
}


//! ANAMNESE — INFORMATION // 


function analyserApportsAnamneseDiabete(
    synthese,
    donnees
) {

    const totaux =
        obtenirTotauxAnamneseDiabete(
            synthese
        );


    if (!totaux) {
        return;
    }


    if (
        Number.isFinite(
            totaux.energie
        )
    ) {

        ajouterElementDiabete(
            donnees,
            "information",
            "energie-anamnese",
            "Apport énergétique estimé",
            `${totaux.energie.toFixed(0)} kcal/j`,
            "Anamnèse"
        );
    }

    if (
        Number.isFinite(
            totaux.proteines
        )
    ) {

        ajouterElementDiabete(
            donnees,
            "information",
            "proteines-anamnese",
            "Apport protéique estimé",
            `${totaux.proteines.toFixed(1)} g/j`,
            "Anamnèse"
        );
    }

    if (
        Number.isFinite(
            totaux.lipides
        )
    ) {

        ajouterElementDiabete(
            donnees,
            "information",
            "lipides-anamnese",
            "Apport lipidique estimé",
            `${totaux.lipides.toFixed(1)} g/j`,
            "Anamnèse"
        );
    }
}


//! ANAMNESE — REPAS // 


function analyserRepartitionRepasDiabete(
    synthese,
    vigilances
) {

    const anamnese =
        synthese.anamnese;


    if (
        !anamnese ||
        !anamnese.disponible
    ) {
        return;
    }

    const repas =
        anamnese.repas ?? {};


    const nomsRepas =
        Object.keys(repas);


    if (
        nomsRepas.length === 0
    ) {
        return;
    }

    //* INFORMATION

    if (
        nomsRepas.length <= 2
    ) {

        ajouterElementDiabete(
            vigilances,
            "moyenne",
            "repartition-repas",
            "Répartition alimentaire à approfondir",
            "L'anamnèse comporte peu de prises alimentaires identifiées. La répartition des glucides entre les repas mérite d'être examinée.",
            "Anamnèse"
        );
    }
}


//! HABITUDES — REPAS // 


function analyserHabitudesRepasDiabete(
    synthese,
    vigilances
) {

    const repas =
        synthese
            .habitudes
            ?.repas;

    if (repas === "1-2") {

        ajouterElementDiabete(
            vigilances,
            "moyenne",
            "faible-nombre-repas",
            "Organisation des repas à approfondir",
            "Le patient rapporte seulement 1 à 2 repas par jour. La répartition alimentaire et glucidique doit être analysée en lien avec le traitement.",
            "Habitudes"
        );
    }
}


//! BOISSONS SUCREES // 


function analyserBoissonsSucreesDiabete(
    synthese,
    priorites,
    vigilances
) {

    const boissons =
        synthese
            .habitudes
            ?.boissonsSucrees;


      //* QUOTIDIENNES

    if (
        boissons ===
        "quotidienne"
    ) {

        ajouterElementDiabete(
            priorites,
            "moyenne",
            "boissons-sucrees-quotidiennes",
            "Boissons sucrées quotidiennes",
            "Une consommation quotidienne de boissons sucrées est rapportée. Ce point doit être confronté à l'anamnèse et aux objectifs définis avec le patient.",
            "Habitudes"
        );

        return;
    }

    //* REGULIERES

    if (
        boissons ===
        "reguliere"
    ) {

        ajouterElementDiabete(
            vigilances,
            "moyenne",
            "boissons-sucrees-regulieres",
            "Boissons sucrées régulières",
            "Une consommation régulière de boissons sucrées est rapportée.",
            "Habitudes"
        );
    }
}


//! FRUITS ET LEGUMES //


function analyserQualiteAlimentaireDiabete(
    synthese,
    vigilances
) {

    const fruitsLegumes =
        synthese
            .habitudes
            ?.fruitsLegumes;


    if (
        fruitsLegumes ===
        "faible"
    ) {

        ajouterElementDiabete(
            vigilances,
            "moyenne",
            "fruits-legumes-faibles",
            "Qualité alimentaire à approfondir",
            "La consommation déclarée de fruits et légumes est faible. La qualité globale de l'alimentation et les sources de fibres doivent être examinées.",
            "Habitudes"
        );
    }
}


//! ACTIVITE PHYSIQUE //


function analyserActiviteDiabete(
    synthese,
    vigilances
) {

    const activite =
        synthese
            .contexte
            ?.activite;


    if (!activite) {
        return;
    }

    const valeur =
        activite
            .toLowerCase();


    if (
        valeur.includes(
            "sédentaire"
        ) ||
        valeur.includes(
            "sedentaire"
        ) ||
        valeur.includes(
            "inactif"
        )
    ) {

        ajouterElementDiabete(
            vigilances,
            "moyenne",
            "activite-faible",
            "Activité physique faible",
            "Le niveau d'activité physique déclaré constitue un élément à intégrer dans la prise en charge globale.",
            "Patient"
        );
    }
}


//! HYPOGLYCEMIES — DT1 // 


function analyserHypoglycemiesDT1(
    diabete,
    priorites
) {
    if (diabete.type !== "DT1") return;

    // Le champ général « épisodes récents » est prioritaire et a déjà été
    // traité dans analyserContexteCliniqueDiabete(). On n'utilise ensuite que
    // le bloc correspondant au traitement ACTUEL afin d'éviter qu'une ancienne
    // valeur masquée ne crée une fausse hypoglycémie récente.
    if (diabete.episodes?.hypoglycemies === "oui") return;

    const hypoTraitement = diabete.traitement === "pompe"
        ? diabete.dt1?.pompe?.hypoglycemies
        : diabete.traitement === "insulinotherapie"
            ? diabete.dt1?.hypoglycemies
            : "";

    if (hypoTraitement !== "oui") return;

    ajouterElementDiabete(
        priorites,
        "haute",
        "hypoglycemies-dt1",
        "Hypoglycémies récentes",
        diabete.traitement === "pompe"
            ? "Des hypoglycémies récentes sont signalées dans le contexte d'une pompe à insuline. Les circonstances, les apports glucidiques, l'activité physique et le fonctionnement du schéma thérapeutique doivent être analysés conjointement."
            : "Des hypoglycémies récentes sont signalées. Leur fréquence, leur moment de survenue, l'alimentation, l'activité physique et le schéma insulinique doivent être analysés conjointement.",
        "Traitement"
    );
}

//! HYPOGLYCEMIES — DT2 // 


function analyserHypoglycemiesDT2(
    diabete,
    priorites
) {
    if (diabete.type !== "DT2") return;

    // Le champ général est la source principale lorsqu'il est positif.
    if (diabete.episodes?.hypoglycemies === "oui") return;

    const traitements = {
        insuline: {
            valeur: diabete.dt2?.insuline?.hypoglycemies,
            code: "hypoglycemies-dt2-insuline",
            titre: "Hypoglycémies sous insulinothérapie",
            detail: "Des hypoglycémies récentes sont signalées chez un patient traité par insuline."
        },
        sulfamides: {
            valeur: diabete.dt2?.sulfamides?.hypoglycemies,
            code: "hypoglycemies-dt2-sulfamides",
            titre: "Hypoglycémies sous sulfamide hypoglycémiant",
            detail: "Des hypoglycémies récentes sont signalées dans le contexte d'un traitement par sulfamide hypoglycémiant."
        },
        glinides: {
            valeur: diabete.dt2?.glinides?.hypoglycemies,
            code: "hypoglycemies-dt2-glinides",
            titre: "Hypoglycémies sous glinide",
            detail: "Des hypoglycémies récentes sont signalées dans le contexte d'un traitement par glinide."
        },
        association: {
            valeur: diabete.dt2?.association?.hypoglycemies,
            code: "hypoglycemies-dt2-association",
            titre: "Hypoglycémies sous association thérapeutique",
            detail: "Des hypoglycémies récentes sont signalées dans le contexte d'une association thérapeutique."
        }
    };

    const actif = traitements[diabete.traitement];
    if (!actif || actif.valeur !== "oui") return;

    ajouterElementDiabete(
        priorites,
        "haute",
        actif.code,
        actif.titre,
        actif.detail,
        "Traitement"
    );
}

function analyserCoherenceHypoglycemiesDiabete(
    diabete,
    vigilances
) {
    const etat = obtenirEtatHypoglycemiesDiabete(diabete);
    if (!etat.discordantes) return;

    const detail = etat.sources
        .map(item => `${item.source} : ${item.valeur}`)
        .join(" · ");

    ajouterElementDiabete(
        vigilances,
        "moyenne",
        "hypoglycemies-donnees-discordantes",
        "Données discordantes sur les hypoglycémies",
        `Des réponses différentes sont enregistrées concernant les hypoglycémies récentes (${detail}). Vérifier la donnée avec le patient avant de hiérarchiser ce point.`,
        "Dossier patient"
    );
}


//! TRAITEMENT — RISQUE HYPOGLYCEMIQUE // 


function analyserTraitementHypoglycemiant(
    diabete,
    vigilances
) {

    if (
        diabete.type !== "DT2"
    ) {
        return;
    }

    const traitement =
        diabete.traitement;


    if (
        traitement ===
        "sulfamides" ||
        traitement ===
        "glinides"
    ) {
       ajouterElementDiabete(
            vigilances,
            "haute",
            "traitement-risque-hypoglycemie",
            "Traitement à risque d'hypoglycémie",
            "Le traitement renseigné nécessite une vigilance particulière vis-à-vis des hypoglycémies et de l'organisation alimentaire.",
            "Traitement"
        );
    }

    if (
        traitement ===
        "insuline"
    ) {
        ajouterElementDiabete(
            vigilances,
            "haute",
            "insuline-repartition",
            "Insulinothérapie",
            "La répartition des apports glucidiques, les injections, les repas et l'activité physique doivent être analysés conjointement.",
            "Traitement"
        );
    }
}


//! GLP-1 // 


function analyserGLP1(
    synthese,
    vigilances
) {

    const diabete =
        synthese.diabete;


    if (
        !diabete ||
        diabete.type !== "DT2" ||
        diabete.traitement !== "glp1"
    ) {
        return;
    }

    const appetit =
        diabete
            .dt2
            ?.glp1
            ?.appetit;

    const poids =
        diabete
            .dt2
            ?.glp1
            ?.poids;

    const tolerance =
        diabete
            .dt2
            ?.glp1
            ?.tolerance;

    if (
        appetit ||
        poids ||
        tolerance
    ) {
        ajouterElementDiabete(
            vigilances,
            "moyenne",
            "glp1-surveillance",
            "Appétit, poids et tolérance",
            "Des informations concernant l'appétit, l'évolution pondérale ou la tolérance digestive sont renseignées dans le contexte d'un traitement GLP-1.",
            "Traitement"
        );
    }
}


//! SGLT2 // 


function analyserSGLT2(
    synthese,
    vigilances,
    informationsManquantes
) {

    const diabete =
        synthese.diabete;


    if (
        !diabete ||
        diabete.type !== "DT2" ||
        diabete.traitement !== "sglt2"
    ) {
        return;
    }

    const hydratation =
        diabete
            .dt2
            ?.sglt2
            ?.hydratation;

    if (!hydratation) {
        ajouterElementDiabete(
            informationsManquantes,
            "information",
            "hydratation-sglt2",
            "Hydratation non renseignée",
            "Les habitudes d'hydratation n'ont pas encore été documentées dans le contexte du traitement SGLT2.",
            "Traitement"
        );
    }

    ajouterElementDiabete(
        vigilances,
        "moyenne",
        "sglt2-vigilance",
        "Traitement SGLT2",
        "Le contexte d'hydratation et la tolérance doivent être intégrés à l'analyse du dossier.",
        "Traitement"
    );
}


//! METFORMINE // 


function analyserMetformine(
    synthese,
    vigilances
) {
    const diabete =
        synthese.diabete;

    if (
        !diabete ||
        diabete.type !== "DT2" ||
        diabete.traitement !==
        "metformine"
    ) {
        return;
    }

    const tolerance =
        diabete
            .dt2
            ?.metformine
            ?.tolerance;

    if (tolerance) {

        ajouterElementDiabete(
            vigilances,
            "information",
            "metformine-tolerance",
            "Tolérance à la metformine",
            "Une information concernant la tolérance digestive à la metformine est renseignée.",
            "Traitement"
        );
    }
}


//! REPARTITION DES GLUCIDES // 


function analyserRepartitionGlucidique(
    synthese,
    donnees,
    vigilances
) {

    const repas =
        synthese
            .anamnese
            ?.repas;


    if (!repas) {
        return;
    }

    const entrees =
        Object.entries(repas)
            .filter(
                ([, infos]) =>
                    Number.isFinite(
                        infos.glucides
                    )
            );


    if (
        entrees.length === 0
    ) {
        return;
    }

    //* VALEURS PAR REPAS

    entrees.forEach(
        ([nomRepas, infos]) => {

            const fibres =
                Number.isFinite(infos.fibres)
                    ? infos.fibres
                    : null;

            const detail =
                fibres !== null
                    ? `${infos.glucides.toFixed(1)} g glucides • ${fibres.toFixed(1)} g fibres`
                    : `${infos.glucides.toFixed(1)} g glucides`;

            ajouterElementDiabete(
                donnees,
                "information",
                `glucides-${nomRepas}`,
                `Glucides et fibres — ${nomRepas}`,
                detail,
                "Anamnèse"
            );
        }
    );

    //* TOTAL JOURNALIER

    const totalGlucides =
        nombreDiabete(
            synthese.anamnese?.totaux?.glucides
        );

    const totalFibres =
        nombreDiabete(
            synthese.anamnese?.totaux?.fibres
        );

    if (Number.isFinite(totalGlucides)) {

        const detailFibres =
            Number.isFinite(totalFibres)
                ? ` • ${totalFibres.toFixed(1)} g fibres`
                : "";

        ajouterElementDiabete(
            donnees,
            "information",
            "bilan-glucidique-journalier",
            "Bilan glucidique journalier",
            `${totalGlucides.toFixed(1)} g glucides/j${detailFibres}`,
            "Anamnèse"
        );
    }

    //* REPAS MIN / MAX

    if (
        entrees.length < 2
    ) {
        return;
    }

    const repasTrie =
        [...entrees].sort(
            (a, b) =>
                a[1].glucides -
                b[1].glucides
        );

    const plusFaible =
        repasTrie[0];

    const plusEleve =
        repasTrie[
            repasTrie.length - 1
        ];

    const ecart =
        plusEleve[1].glucides -
        plusFaible[1].glucides;

    //* INFORMATION OBJECTIVE

    ajouterElementDiabete(
        donnees,
        "information",
        "ecart-glucidique",
        "Écart glucidique maximal",
        `${ecart.toFixed(1)} g entre ${plusFaible[0]} et ${plusEleve[0]}.`,
        "Anamnèse"
    );

    //* REPAS LE PLUS GLUCIDIQUE

    ajouterElementDiabete(
        donnees,
        "information",
        "repas-plus-glucidique",
        "Repas le plus glucidique",
        `${plusEleve[0]} : ${plusEleve[1].glucides.toFixed(1)} g`,
        "Anamnèse"
    );

    //* VIGILANCE

    ajouterElementDiabete(
        vigilances,
        "information",
        "repartition-glucidique",
        "Répartition glucidique à interpréter",
        "Les apports glucidiques par repas sont calculés à partir de l'anamnèse. Leur répartition doit être interprétée selon le type de diabète, le traitement, l'insulinothérapie éventuelle, les hypoglycémies et le rythme alimentaire.",
        "Anamnèse"
    );
}


//! NIVEAU GLOBAL // 


function calculerPrioriteDiabete(
    priorites,
    vigilances
) {
    if (
        priorites.some(
            element =>
                element.niveau ===
                "haute"
        )
    ) {
        return "haute";
    }

    if (
        priorites.length > 0
    ) {
        return "moyenne";
    }

    if (
        vigilances.some(
            element =>
                element.niveau ===
                "haute"
        )
    ) {
        return "moyenne";
    }

    if (
        vigilances.length > 0
    ) {
        return "faible";
    }

    return "aucune";
}


//! TRI // 


function trierElementsDiabete(
    elements
) {
    const ordre = {
        haute: 1,
        moyenne: 2,
        faible: 3,
        information: 4
    };

    return elements.sort(
        (a, b) =>
            (
                ordre[a.niveau] ?? 99
            ) -
            (
                ordre[b.niveau] ?? 99
            )
    );
}


//* ANALYSE PRINCIPALE


function analyserDiabete() {

    if (
        typeof construireSynthesePatient !==
        "function"
    ) {
        console.warn(
            "Synthèse patient indisponible."
        );
        return null;
    }

    const synthese =
        construireSynthesePatient();


    if (!synthese.diabete) {
        return null;
    }

    const donnees = [];

    const priorites = [];

    const vigilances = [];

    const informationsManquantes = [];

    //* COMPLETUDE

    const completude =
        evaluerCompletudeDiabete(
            synthese
        );

     completude.manquants.forEach(
        element => {
            ajouterElementDiabete(
                informationsManquantes,
                "information",
                `manquant-${element}`,
                "Information à compléter",
                element,
                "Dossier patient"
            );
        }
    );

    //* CONTEXTE CLINIQUE / GLYCEMIQUE

    analyserContexteCliniqueDiabete(
        synthese,
        donnees,
        priorites,
        vigilances
    );

    //* DONNEES

    analyserApportsAnamneseDiabete(
        synthese,
        donnees
    );

    //* ETAT NUTRITIONNEL

    analyserEtatNutritionnelDiabete(
        synthese,
        priorites,
        vigilances
    );

    //* ALIMENTATION

    analyserHabitudesRepasDiabete(
        synthese,
        vigilances
    );

    analyserRepartitionRepasDiabete(
        synthese,
        vigilances
    );

    analyserRepartitionGlucidique(
        synthese,
        donnees,
        vigilances
    );

    analyserBoissonsSucreesDiabete(
        synthese,
        priorites,
        vigilances
    );

    analyserQualiteAlimentaireDiabete(
        synthese,
        vigilances
    );

    const sourcesGlucidiques =
        analyserSourcesGlucidiques(
            synthese,
            donnees
    );

    const categoriesGlucidiques =
        analyserQualiteSourcesGlucidiques(
            synthese,
            donnees,
            vigilances
    );

    //* ACTIVITE

    analyserActiviteDiabete(
        synthese,
        vigilances
    );

    //* TRAITEMENT

    analyserHypoglycemiesDT1(
        synthese.diabete,
        priorites
    );

    analyserHypoglycemiesDT2(
        synthese.diabete,
        priorites
    );

    analyserCoherenceHypoglycemiesDiabete(
        synthese.diabete,
        vigilances
    );

    analyserTraitementHypoglycemiant(
        synthese.diabete,
        vigilances
    );

    analyserMetformine(
        synthese,
        vigilances
    );

    analyserGLP1(
        synthese,
        vigilances
    );

    analyserSGLT2(
        synthese,
        vigilances,
        informationsManquantes
    );

    // TRI

    trierElementsDiabete(
        priorites
    );

    trierElementsDiabete(
        vigilances
    );

    //* RESULTAT

    return {

        pathologie:
            "Diabète",

        type:
            synthese.diabete.type,

        typeLabel:
            obtenirLibelleTypeDiabete(
                synthese.diabete.type
            ),

        traitement:
            synthese
                .diabete
                .traitement,

        traitementLabel:
            obtenirLibelleTraitementDiabete(
                synthese
                    .diabete
                    .traitement
            ),

        completude,

        niveauPriorite:
            calculerPrioriteDiabete(
                priorites,
                vigilances
            ),

        donnees,

        priorites,

        vigilances,

        informationsManquantes,

        analyseGlucidique: {
            categories: categoriesGlucidiques ?? [],
            sourcesPrincipales: sourcesGlucidiques ?? []
        },

        synthese
    };
}


//! GLUCIDES — QUALITE


function analyserQualiteGlucidique(
    synthese,
    donnees
) {
    const repas =
        synthese
            .anamnese
            ?.repas;

    if (!repas) {
        return;
    }

    const entrees =
        Object.entries(repas)
            .filter(
                ([, infos]) =>
                    Number.isFinite(
                        infos.glucides
                    )
            );

    if (
        entrees.length === 0
    ) {
        return;
    }

    //* REPAS

    entrees.forEach(
        ([nomRepas, infos]) => {

            const glucides =
                infos.glucides;

            const fibres =
                Number.isFinite(
                    infos.fibres
                )
                    ? infos.fibres
                    : null;

            ajouterElementDiabete(
                donnees,
                "information",
                `qualite-glucidique-${nomRepas}`,
                `Glucides et fibres — ${nomRepas}`,

                fibres !== null
                    ? `${glucides.toFixed(1)} g de glucides • ${fibres.toFixed(1)} g de fibres`
                    : `${glucides.toFixed(1)} g de glucides`,

                "Anamnèse"
            );
        }
    );
}


//! GLUCIDES — BILAN JOURNALIER


function analyserBilanGlucidiqueJournalier(
    synthese,
    donnees
) {
    const totaux =
        synthese
            .anamnese
            ?.totaux;


    if (!totaux) {
        return;
    }

    const glucides =
        nombreDiabete(
            totaux.glucides
        );

    const fibres =
        nombreDiabete(
            totaux.fibres
        );

    //* GLUCIDES

    if (
        Number.isFinite(
            glucides
        )
    ) {

        ajouterElementDiabete(
            donnees,
            "information",
            "glucides-journalier",
            "Glucides totaux",
            `${glucides.toFixed(1)} g/j`,
            "Anamnèse"
        );
    }

    //* FIBRES

    if (
        Number.isFinite(
            fibres
        )
    ) {

        ajouterElementDiabete(
            donnees,
            "information",
            "fibres-journalier",
            "Fibres totales",
            `${fibres.toFixed(1)} g/j`,
            "Anamnèse"
        );
    }
}


//! GLUCIDES — SOURCES


function obtenirSourcesGlucidiques(
    synthese
) {
    const repas =
        synthese
            .anamnese
            ?.repas;


    if (!repas) {
        return [];
    }

    const sources = [];

    Object.entries(repas).forEach(
        ([nomRepas, infos]) => {

            const aliments =
                infos.aliments ?? [];

            aliments.forEach(
                aliment => {

                    const glucides =
                        nombreDiabete(
                            aliment.glucides
                        );

                    if (
                        !Number.isFinite(
                            glucides
                        ) ||
                        glucides <= 0
                    ) {
                        return;
                    }

                    sources.push({

                        repas:
                            nomRepas,

                        nom:
                            aliment.nom,

                        groupe:
                            aliment.groupe ?? "",

                        quantite:
                            aliment.quantite,

                        poidsJournalier:
                            aliment.poidsJournalier,

                        glucides,

                        fibres:
                            nombreDiabete(
                                aliment.fibres
                            ),

                        energie:
                            nombreDiabete(
                                aliment.energie
                            )
                    });
                }
            );
        }
    );

    //* TRI GLUCIDES

    sources.sort(
        (a, b) =>
            b.glucides -
            a.glucides
    );

    return sources;
}


//! GLUCIDES — CLASSIFICATION QUALITATIVE


function normaliserTexteDiabete(texte) {
    return String(texte ?? "")
        .toLocaleLowerCase("fr")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function classerSourceGlucidique(source) {

    const nom =
        normaliserTexteDiabete(source.nom);

    //* Pour l'analyse, seule la première classification est la catégorie principale.
    
    const groupePrincipalBrut =
        String(source.groupe ?? "")
            .split(",")[0]
            .trim();

    const groupe =
        normaliserTexteDiabete(groupePrincipalBrut);

    const texte = `${groupe} ${nom}`;

    //* BOISSONS SUCREES

    if (
        texte.includes("soda") ||
        texte.includes("boisson sucre") ||
        texte.includes("boisson energisante") ||
        texte.includes("energy drink") ||
        texte.includes("sirop") ||
        texte.includes("nectar")
    ) {
        return {
            code: "boisson-sucree",
            label: "Boissons sucrées",
            niveau: "vigilance"
        };
    }

    //* JUS DE FRUITS

    if (
        texte.includes("jus de fruit") ||
        texte.includes("jus d'orange") ||
        texte.includes("jus de pomme")
    ) {
        return {
            code: "jus-fruits",
            label: "Jus de fruits",
            niveau: "information"
        };
    }

    //* LEGUMINEUSES

    if (
        texte.includes("legumineuse") ||
        texte.includes("legume sec") ||
        texte.includes("lentille") ||
        texte.includes("pois chiche") ||
        texte.includes("haricot sec") ||
        texte.includes("haricot blanc") ||
        texte.includes("haricot rouge") ||
        texte.includes("pois casse")
    ) {
        return {
            code: "legumineuses",
            label: "Légumineuses",
            niveau: "favorable"
        };
    }

    //* CEREALES / PAINS COMPLETS OU PEU RAFFINES

    const cerealeOuPain =
        texte.includes("pain") ||
        texte.includes("cereale") ||
        texte.includes("riz") ||
        texte.includes("pate") ||
        texte.includes("semoule") ||
        texte.includes("avoine") ||
        texte.includes("muesli");

    const marqueurComplet =
        texte.includes("complet") ||
        texte.includes("integral") ||
        texte.includes("seigle") ||
        texte.includes("multicereale") ||
        texte.includes("grain entier") ||
        texte.includes("flocon d'avoine") ||
        texte.includes("flocons d'avoine");

    if (cerealeOuPain && marqueurComplet) {
        return {
            code: "cereales-completes",
            label: "Céréales / féculents complets",
            niveau: "favorable"
        };
    }

    //* FRUITS ENTIERS

    if (
        groupe.includes("fruit") &&
        !texte.includes("jus")
    ) {
        return {
            code: "fruits",
            label: "Fruits",
            niveau: "favorable"
        };
    }

    //* PRODUITS SUCRES

    if (
        groupe.includes("produits sucres") ||
        groupe.includes("confiserie") ||
        texte.includes("bonbon") ||
        texte.includes("biscuit") ||
        texte.includes("gateau") ||
        texte.includes("patisserie") ||
        texte.includes("chocolat") ||
        texte.includes("confiture") ||
        texte.includes("sucre, ") ||
        nom === "sucre"
    ) {
        return {
            code: "produits-sucres",
            label: "Produits sucrés",
            niveau: "information"
        };
    }

    //* CEREALES / FECULENTS NON PRECISES

    if (cerealeOuPain) {
        return {
            code: "cereales-feculents",
            label: "Céréales / féculents",
            niveau: "information"
        };
    }

    //* AUTRES SOURCES

    return {
        code: "autres",
        label: "Autres sources glucidiques",
        niveau: "information"
    };
}

function analyserQualiteSourcesGlucidiques(
    synthese,
    donnees,
    vigilances
) {
    const sources =
        obtenirSourcesGlucidiques(synthese);

    if (sources.length === 0) {
        return [];
    }

    const totalGlucides =
        sources.reduce(
            (total, source) =>
                total + source.glucides,
            0
        );

    const categories = new Map();


    sources.forEach(source => {

        const categorie =
            classerSourceGlucidique(source);

        source.categorie = categorie;

        if (!categories.has(categorie.code)) {
            categories.set(categorie.code, {
                ...categorie,
                glucides: 0,
                aliments: []
            });
        }

        const groupeCategorie =
            categories.get(categorie.code);

        groupeCategorie.glucides +=
            source.glucides;

        groupeCategorie.aliments.push({
            nom: source.nom,
            repas: source.repas,
            glucides: source.glucides,
            fibres: source.fibres
        });
    });


    Array.from(categories.values())
        .sort((a, b) => b.glucides - a.glucides)
        .forEach(categorie => {

            const contribution =
                totalGlucides > 0
                    ? (categorie.glucides / totalGlucides) * 100
                    : 0;

            ajouterElementDiabete(
                donnees,
                "information",
                `categorie-glucidique-${categorie.code}`,
                categorie.label,
                `${categorie.glucides.toFixed(1)} g de glucides • ${contribution.toFixed(1)} % des glucides analysés`,
                "Anamnèse"
            );
        });


    //* VIGILANCE OBJECTIVE — BOISSONS SUCREES IDENTIFIEES

    const boissonsSucrees =
        categories.get("boisson-sucree");

    if (boissonsSucrees) {

        const aliments =
            boissonsSucrees.aliments
                .map(item =>
                    `${item.nom} (${item.glucides.toFixed(1)} g)`
                )
                .join(", ");

        ajouterElementDiabete(
            vigilances,
            "moyenne",
            "anamnese-boissons-sucrees",
            "Boissons sucrées identifiées dans l'anamnèse",
            `${boissonsSucrees.glucides.toFixed(1)} g de glucides proviennent des boissons sucrées identifiées : ${aliments}.`,
            "Anamnèse"
        );
    }

    return Array.from(categories.values())
        .map(categorie => ({
            ...categorie,
            contribution: totalGlucides > 0
                ? (categorie.glucides / totalGlucides) * 100
                : 0
        }))
        .sort((a, b) => b.glucides - a.glucides);
}


//! GLUCIDES — SOURCES PRINCIPALES


function analyserSourcesGlucidiques(
    synthese,
    donnees
) {

    const sources =
        obtenirSourcesGlucidiques(
            synthese
        );

    if (
        sources.length === 0
    ) {
        return [];
    }

    const totalGlucides =
        sources.reduce(
            (total, source) =>
                total + source.glucides,
            0
        );

    sources.forEach(
        (source, index) => {

            const fibres =
                Number.isFinite(
                    source.fibres
                )
                    ? source.fibres
                    : null;

            const detailFibres =
                fibres !== null
                    ? ` • ${fibres.toFixed(1)} g fibres`
                    : "";

            // CONTRIBUTION

            const contribution =
               totalGlucides > 0
              ? (
                source.glucides /
                totalGlucides
              ) * 100
            : 0;

            ajouterElementDiabete(
                donnees,
                "information",
                `source-glucidique-${index}`,
                source.nom,
                `${source.glucides.toFixed(1)} g glucides • ${contribution.toFixed(1)} % des glucides${detailFibres} • ${source.repas}`,
                "Anamnèse"
            );
        }
    );

    return sources.map(source => ({
        ...source,
        contribution: totalGlucides > 0
            ? (source.glucides / totalGlucides) * 100
            : 0
    }));
}


//! DIABETE — AXES ALIMENTAIRES PERSONNALISES


function obtenirCategorieGlucidiqueDiabete(
    analyse,
    code
) {

    return (
        analyse
            ?.analyseGlucidique
            ?.categories
            ?.find(
                categorie =>
                    categorie.code === code
            ) ??
        null
    );
}


function formaterAlimentsCategorieDiabete(
    categorie,
    limite = 3
) {

    if (
        !categorie ||
        !Array.isArray(categorie.aliments) ||
        categorie.aliments.length === 0
    ) {
        return "";
    }

    return categorie.aliments
        .slice()
        .sort(
            (a, b) =>
                b.glucides -
                a.glucides
        )
        .slice(
            0,
            limite
        )
        .map(
            aliment =>
                `${aliment.nom} (${aliment.glucides.toFixed(1)} g)`
        )
        .join(", ");
}


function construireAxesAlimentairesDiabete(
    analyse
) {

    const axes = [];

    if (!analyse) {
        return axes;
    }

    const ajouter = (
        niveau,
        code,
        titre,
        detail,
        objectif,
        origine = "Anamnèse"
    ) => {

        axes.push({
            niveau,
            code,
            titre,
            detail,
            objectif,
            origine
        });
    };


    //* BOISSONS SUCREES

    const boissonsSucrees =
        obtenirCategorieGlucidiqueDiabete(
            analyse,
            "boisson-sucree"
        );

    if (boissonsSucrees) {

        const aliments =
            formaterAlimentsCategorieDiabete(
                boissonsSucrees
            );

        const habitudeBoissons = analyse.synthese?.habitudes?.boissonsSucrees;
        const consommationReguliere = ["quotidienne", "reguliere"].includes(habitudeBoissons);

        ajouter(
            consommationReguliere ? "moyenne" : "information",
            "axe-boissons-sucrees",
            "Boissons sucrées présentes dans l'anamnèse",
            `${boissonsSucrees.glucides.toFixed(1)} g de glucides analysés${aliments ? ` · ${aliments}` : ""}.`,
            consommationReguliere
                ? "Travailler la fréquence, la quantité et le contexte de consommation des boissons réellement identifiées, sans imposer une suppression systématique."
                : "Explorer la fréquence et le contexte de consommation avant de décider si cet axe doit devenir une priorité de prise en charge."
        );
    }


    //* JUS DE FRUITS

    const jusFruits =
        obtenirCategorieGlucidiqueDiabete(
            analyse,
            "jus-fruits"
        );

    if (jusFruits) {

        const aliments =
            formaterAlimentsCategorieDiabete(
                jusFruits
            );

        ajouter(
            "information",
            "axe-jus-fruits",
            "Jus de fruits identifiés",
            `${jusFruits.glucides.toFixed(1)} g de glucides analysés${aliments ? ` · ${aliments}` : ""}.`,
            "Replacer ces boissons dans le contexte du repas, des autres sources glucidiques et des habitudes du patient."
        );
    }


    //* PRODUITS SUCRES

    const produitsSucres =
        obtenirCategorieGlucidiqueDiabete(
            analyse,
            "produits-sucres"
        );

    if (produitsSucres) {

        const aliments =
            formaterAlimentsCategorieDiabete(
                produitsSucres
            );

        ajouter(
            "information",
            "axe-produits-sucres",
            "Produits sucrés repérés dans l'anamnèse",
            `${produitsSucres.glucides.toFixed(1)} g de glucides analysés${aliments ? ` · ${aliments}` : ""}.`,
            "Explorer la fréquence, les portions et le contexte de consommation avant de décider si cet axe doit devenir une priorité."
        );
    }


    //* SOURCES FAVORABLES

    const sourcesFavorables = [
        "legumineuses",
        "cereales-completes",
        "fruits"
    ]
        .map(
            code =>
                obtenirCategorieGlucidiqueDiabete(
                    analyse,
                    code
                )
        )
        .filter(Boolean);

    if (
        sourcesFavorables.length > 0
    ) {

        const details =
            sourcesFavorables
                .map(
                    categorie => {

                        const aliments =
                            formaterAlimentsCategorieDiabete(
                                categorie,
                                2
                            );

                        return aliments
                            ? `${categorie.label} : ${aliments}`
                            : categorie.label;
                    }
                )
                .join(" · ");

        ajouter(
            "favorable",
            "axe-sources-favorables",
            "Sources glucidiques intéressantes déjà présentes",
            details,
            "Conserver et valoriser les sources déjà favorables plutôt que de construire la prise en charge uniquement autour des aliments à réduire."
        );
    }


    //* PRINCIPALES SOURCES GLUCIDIQUES

    const principales =
        (
            analyse
                ?.analyseGlucidique
                ?.sourcesPrincipales ??
            []
        )
            .slice(
                0,
                3
            );

    if (
        principales.length > 0
    ) {

        const details =
            principales
                .map(
                    source =>
                        `${source.nom} (${source.glucides.toFixed(1)} g · ${source.repas})`
                )
                .join(" · ");

        ajouter(
            "information",
            "axe-sources-principales",
            "Principales sources glucidiques du patient",
            details,
            "Utiliser ces aliments comme support concret pour travailler les quantités, la répartition et, lorsque c'est pertinent, le comptage glucidique."
        );
    }

    return axes;
}


//! DIABETE — AFFICHAGE DANS ANALYSE


function afficherAnalyseDiabete() {

    const section =
        document.getElementById("analyseDiabeteSection");

    const container =
        document.getElementById("analyseDiabeteContainer");

    if (!section || !container) {
        return;
    }

    const analyse = analyserDiabete();

    // Aucun diabète sélectionné
    if (!analyse) {
        section.hidden = true;
        container.innerHTML = "";
        return;
    }

    section.hidden = false;

    //* ANALYSE GLUCIDIQUE — DONNEES DE L'ANAMNESE
   

    const repas =
        analyse.synthese?.anamnese?.repas ?? {};

    const totaux =
        analyse.synthese?.anamnese?.totaux ?? {};

    const apportsAnamnese =
        analyse.synthese?.anamnese?.apports ?? {};

    const apportGlucides = apportsAnamnese.carbs ?? null;
    const apportFibres = apportsAnamnese.fiber ?? null;
    const glucidesPartiels = apportGlucides?.partiel === true;
    const fibresPartielles = apportFibres?.partiel === true;

    const lignesRepas = Object.entries(repas)
        .filter(([, infos]) =>
            Number.isFinite(infos?.glucides) ||
            Number.isFinite(infos?.fibres)
        )
        .map(([nomRepas, infos]) => {

            const glucides =
                Number.isFinite(infos?.glucides)
                    ? `${infos.glucides.toFixed(1)} g`
                    : "—";

            const fibres =
                Number.isFinite(infos?.fibres)
                    ? `${infos.fibres.toFixed(1)} g`
                    : "—";

            const partGlucides =
                Number.isFinite(infos?.glucides) &&
                Number.isFinite(totaux?.glucides) &&
                !glucidesPartiels &&
                totaux.glucides > 0
                    ? `${((infos.glucides / totaux.glucides) * 100).toFixed(1)} %`
                    : "—";

            return `
                <tr>
                    <th scope="row">${echapperHTML(nomRepas)}</th>
                    <td>${glucides}</td>
                    <td>${partGlucides}</td>
                    <td>${fibres}</td>
                </tr>
            `;
        })
        .join("");

    const totalGlucidesValeur = Number.isFinite(apportGlucides?.valeur)
        ? apportGlucides.valeur
        : null;
    const totalFibresValeur = Number.isFinite(apportFibres?.valeur)
        ? apportFibres.valeur
        : null;

    const totalGlucides = Number.isFinite(totalGlucidesValeur)
        ? `${glucidesPartiels ? "≥ " : ""}${totalGlucidesValeur.toFixed(1)} g${glucidesPartiels ? " · à préciser" : ""}`
        : "—";

    const totalFibres = Number.isFinite(totalFibresValeur)
        ? `${fibresPartielles ? "≥ " : ""}${totalFibresValeur.toFixed(1)} g${fibresPartielles ? " · à préciser" : ""}`
        : "—";

    //* REPARTITION GLUCIDIQUE
   
    const repasGlucidiques = Object.entries(repas)
        .filter(([, infos]) =>
            Number.isFinite(infos?.glucides)
        )
        .map(([nom, infos]) => ({
            nom,
            glucides: infos.glucides
        }));

    const glucidesJournaliers =
        !glucidesPartiels && Number.isFinite(totaux?.glucides)
            ? totaux.glucides
            : null;

    let repasPlusGlucidique = null;
    let repasMoinsGlucidique = null;
    let ecartGlucidique = null;

    const prisesAvecGlucides =
        repasGlucidiques.filter(repasItem => repasItem.glucides > 0);

    if (prisesAvecGlucides.length > 0) {
        repasPlusGlucidique = prisesAvecGlucides.reduce(
            (max, repasItem) =>
                repasItem.glucides > max.glucides ? repasItem : max
        );

        repasMoinsGlucidique = prisesAvecGlucides.reduce(
            (min, repasItem) =>
                repasItem.glucides < min.glucides ? repasItem : min
        );

        ecartGlucidique =
            repasPlusGlucidique.glucides - repasMoinsGlucidique.glucides;
    }

    //* NATURE ET PRINCIPALES SOURCES GLUCIDIQUES
  

   const categoriesGlucidiques =
    analyse.analyseGlucidique?.categories ?? [];

    const boissonsSucreesAnalyse =
    categoriesGlucidiques.find(
        categorie =>
            categorie.code ===
            "boisson-sucree"
    ) ?? null;

    const categoriesAlimentaires =
    categoriesGlucidiques.filter(
        categorie =>
            categorie.code !==
            "boisson-sucree"
    );

    const categoriesGlucidiquesHTML = categoriesAlimentaires
    .map(categorie => `
        <div class="diabetes-distribution-row">
            <div class="diabetes-distribution-name">
                <strong>${categorie.label}</strong>
                <span>${categorie.glucides.toFixed(1)} g</span>
            </div>
            <div class="diabetes-distribution-value">
                ${categorie.contribution.toFixed(1)} %
            </div>
        </div>
    `)
    .join("");

    const boissonsSucreesHTML =
    boissonsSucreesAnalyse?.aliments?.length
        ? boissonsSucreesAnalyse.aliments
            .slice()
            .sort(
                (a, b) =>
                    b.glucides -
                    a.glucides
            )
            .slice(
                0,
                3
            )
            .map(
                aliment => `
                    <div class="diabetes-analysis-info">
                        <span>${echapperHTML(aliment.nom)}</span>
                        <strong>${aliment.glucides.toFixed(1)} g de glucides</strong>
                        <small>
                            ${glucidesJournaliers > 0
                                ? `${((aliment.glucides / glucidesJournaliers) * 100).toFixed(1)} % des glucides analysés · `
                                : ""
                            }${echapperHTML(aliment.repas || "Prise non précisée")}
                        </small>
                    </div>
                `
            )
            .join("")
        : "";

    const sourcesPrincipales =
        (analyse.analyseGlucidique?.sourcesPrincipales ?? []).slice(0, 5);

    const sourcesPrincipalesHTML = sourcesPrincipales
        .map((source, index) => `
            <div class="diabetes-nutrient-row">
                <div class="diabetes-source-food">
                    <span class="hta-source-rank">${index + 1}</span>
                    <div class="hta-source-name">
                        <strong>${echapperHTML(source.nom)}</strong>
                        <span>${Number(source.poidsJournalier).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} g/j consommés · ${echapperHTML(source.repas)}</span>
                    </div>
                </div>
                <strong>${source.glucides.toFixed(1)} g</strong>
                <span>${source.contribution.toFixed(1)} %</span>
            </div>
        `)
        .join("");

    //* DONNEES A COMPLETER
    

    const informationsManquantes =
        analyse.informationsManquantes ?? [];

    const informationsManquantesHTML = informationsManquantes
        .map(info => `
            <div class="diabetes-analysis-info">
                <span>${info.titre ?? "Information à compléter"}</span>
                <strong>${info.detail ?? "Donnée non renseignée"}</strong>
                ${info.origine ? `<small>${info.origine}</small>` : ""}
            </div>
        `)
        .join("");

    const type =
        analyse.typeLabel || "Non renseigné";

    const traitement =
        analyse.traitementLabel || "Non renseigné";

    const micronutritionAnalyseHTML =
        traitementInclutMetformineDiabete(analyse) &&
        typeof construireHTMLAnalyseMicronutritionnelle === "function"
            ? construireHTMLAnalyseMicronutritionnelle(
                ["vitamineB12"],
                {
                    synthese: analyse.synthese,
                    contextePathologique: "diabete",
                    titre: "Vitamine B12 — apport, repère et biologie",
                    sousTitre: "La B12 est analysée ici car la metformine est présente dans le traitement, seule ou au sein d'une association. Les contributeurs alimentaires sont affichés comme données descriptives, pas comme recommandations."
                }
              )
            : "";

    container.innerHTML = `
        <section class="nutrition-calc-card analyse-diabetes-card">

            <div class="nutrition-calc-card-header">
                <span class="nutrition-calc-kicker">Analyse — diabète</span>
                <h3>${type}</h3>
                <p>${traitement}</p>
            </div>

            <!-- ANALYSE ET REPARTITION GLUCIDIQUE -->

            <div class="diabetes-analysis-block">
                <div class="diabetes-analysis-block-header">
                    <div>
                        <h4>Analyse et répartition glucidique</h4>
                        <span>Glucides et fibres par prise alimentaire. Les pourcentages de répartition ne sont calculés que lorsque le total journalier est complet dans CIQUAL.</span>
                    </div>
                </div>

                ${
                    lignesRepas
                        ? `
                            <div class="diabetes-carbs-table-wrap" role="region" aria-label="Répartition des glucides et des fibres par repas" tabindex="0">
                                <table class="diabetes-carbs-table">
                                    <thead><tr>
                                        <th scope="col">Prise alimentaire</th>
                                        <th scope="col">Glucides</th>
                                        <th scope="col">Part du total</th>
                                        <th scope="col">Fibres</th>
                                    </tr></thead>
                                    <tbody>${lignesRepas}</tbody>
                                    <tfoot><tr>
                                        <th scope="row">Total journalier</th>
                                        <td>${totalGlucides}</td>
                                        <td>${Number.isFinite(glucidesJournaliers) && glucidesJournaliers > 0 ? "100 %" : "—"}</td>
                                        <td>${totalFibres}</td>
                                    </tr></tfoot>
                                </table>
                            </div>

                            ${
                                prisesAvecGlucides.length > 0 && Number.isFinite(glucidesJournaliers) && glucidesJournaliers > 0
                                    ? `
                                        <div class="diabetes-distribution-summary">
                                            <div class="diabetes-analysis-info">
                                                <span>Prise la plus glucidique</span>
                                                <strong>${repasPlusGlucidique.nom}</strong>
                                                <small>${repasPlusGlucidique.glucides.toFixed(1)} g · ${((repasPlusGlucidique.glucides / glucidesJournaliers) * 100).toFixed(1)} %</small>
                                            </div>

                                            <div class="diabetes-analysis-info">
                                                <span>Prise glucidique la moins élevée</span>
                                                <strong>${repasMoinsGlucidique.nom}</strong>
                                                <small>${repasMoinsGlucidique.glucides.toFixed(1)} g · ${((repasMoinsGlucidique.glucides / glucidesJournaliers) * 100).toFixed(1)} %</small>
                                            </div>

                                            <div class="diabetes-analysis-info">
                                                <span>Écart maximal</span>
                                                <strong>${ecartGlucidique.toFixed(1)} g</strong>
                                                <small>entre les prises contenant des glucides</small>
                                            </div>
                                        </div>
                                    `
                                    : ""
                            }
                        `
                        : `
                            <div class="diabetes-analysis-empty">
                                Aucune donnée d'anamnèse exploitable pour l'analyse glucidique.
                            </div>
                        `
                }
            </div>

            <div class="diabetes-sources-columns">

            <!-- PRINCIPALES SOURCES GLUCIDIQUES -->

            <div class="diabetes-analysis-block">
                <div class="diabetes-analysis-block-header">
                    <div>
                        <h4>Principales sources glucidiques</h4>
                        <span>Les cinq aliments contribuant le plus aux glucides analysés</span>
                    </div>
                </div>

                ${
                    sourcesPrincipalesHTML
                        ? `
                            <div class="diabetes-nutrient-table">
                                <div class="diabetes-nutrient-row diabetes-nutrient-head">
                                    <span>Aliment</span>
                                    <span>Glucides</span>
                                    <span>Contribution</span>
                                </div>
                                ${sourcesPrincipalesHTML}
                            </div>
                        `
                        : `<div class="diabetes-analysis-empty">Aucune source glucidique exploitable.</div>`
                }
            </div>

            <!-- NATURE DES SOURCES GLUCIDIQUES -->

            <div class="diabetes-analysis-block">
                <div class="diabetes-analysis-block-header">
                    <div> 
                        <h4> Autres groupes alimentaires glucidiques</h4>
                        <span> Répartition descriptive des autres sources glucidiques identifiées dans l'anamnèse</span>
                    </div>  
                </div>  

                ${
                    categoriesGlucidiquesHTML
                      ? `<div class="diabetes-distribution">${categoriesGlucidiquesHTML}</div>`
                      : `<div class="diabetes-analysis-empty">Aucun autre groupe glucidique identifiable dans l'anamnèse.</div>`                 
                    }
            </div>

            <!-- NATURE DES SOURCES GLUCIDIQUES --> 

            <div class="diabetes-analysis-block">
                <div class="diabetes-analysis-block-header">
                    <div>
                        <h4>Boissons sucrées</h4>
                        <span>Analyse séparée des boissons retrouvées dans l'anamnèse</span>
                    </div>
                </div>

                ${
                    boissonsSucreesHTML
                        ? `<div class="diabetes-distribution-summary">${boissonsSucreesHTML}</div>`
                        : `<div class="diabetes-analysis-empty">Aucune boisson sucrée identifiée dans l'anamnèse.</div>`
                }
            </div>

            </div>

            ${micronutritionAnalyseHTML}

            <!-- DONNEES A COMPLETER -->

            ${
                informationsManquantesHTML
                    ? `
                        <div class="diabetes-analysis-block">
                            <div class="diabetes-analysis-block-header">
                                <div>
                                    <h4>Données à compléter</h4>
                                    <span>Informations manquantes utiles à l'interprétation du dossier</span>
                                </div>
                            </div>

                            <div class="diabetes-distribution-summary">
                                ${informationsManquantesHTML}
                            </div>
                        </div>
                    `
                    : ""
            }

        </section>
    `;
}


//! PRISE EN CHARGE — DIABETE


function construireObjectifPriseEnChargeDiabete(element) {
    const objectifs = {
        "hypoglycemies-dt1": "Identifier les circonstances des hypoglycémies et sécuriser l'organisation alimentaire en lien avec l'insulinothérapie.",
        "hypoglycemies-dt2-insuline": "Identifier les circonstances des hypoglycémies et sécuriser l'organisation alimentaire en lien avec le traitement.",
        "hypoglycemies-dt2-sulfamides": "Identifier les circonstances des hypoglycémies et sécuriser les prises alimentaires en lien avec le traitement.",
        "hypoglycemies-dt2-glinides": "Identifier les circonstances des hypoglycémies et sécuriser l'organisation des repas en lien avec le traitement.",
        "hypoglycemies-dt2-association": "Identifier les circonstances des hypoglycémies et sécuriser l'organisation alimentaire en lien avec les traitements associés.",
        "denutrition-severe": "Préserver ou restaurer l'état nutritionnel avant toute stratégie susceptible d'accentuer une restriction alimentaire.",
        "denutrition-moderee": "Intégrer la dénutrition aux objectifs nutritionnels et éviter les restrictions inadaptées.",
        "boissons-sucrees-quotidiennes": "Travailler la place et la fréquence des boissons sucrées selon le contexte du patient.",
        "boissons-sucrees-regulieres": "Évaluer la place des boissons sucrées régulières et définir avec le patient un ajustement réaliste si ce point est retenu comme prioritaire.",
        "anamnese-boissons-sucrees": "Cibler les boissons sucrées réellement identifiées dans l'anamnèse et définir avec le patient une modification réaliste de fréquence, de quantité ou de substitution.",
        "activite-faible": "Réduire la sédentarité et favoriser une activité physique adaptée au profil et au traitement.",
        "repartition-repas": "Approfondir l'organisation alimentaire et la répartition des glucides au cours de la journée.",
        "faible-nombre-repas": "Évaluer si l'organisation des prises alimentaires est adaptée aux habitudes, aux besoins et au traitement.",
        "fruits-legumes-faibles": "Améliorer progressivement la qualité alimentaire et les sources de fibres.",
        "hba1c-au-dessus-objectif": "Identifier avec le patient les facteurs modifiables pouvant contribuer à l'écart entre l'HbA1c mesurée et l'objectif individualisé renseigné.",
        "hypoglycemies-recentes": "Identifier les circonstances des hypoglycémies et sécuriser l'organisation alimentaire en lien avec le traitement et l'activité physique.",
        "repas-irreguliers-diabete": "Structurer les prises alimentaires de façon compatible avec les habitudes, les besoins et le schéma thérapeutique du patient.",
        "comptage-glucides-apprentissage": "Renforcer progressivement la capacité du patient à estimer les glucides lorsque cette compétence est pertinente pour sa prise en charge."
    };
    return objectifs[element.code] || `Travailler ce point avec le patient : ${element.titre.toLowerCase()}.`;
}


function construireActionsPriseEnChargeDiabete(element, analyse) {
    const actions = {
        "hypoglycemies-recentes": [
            "Reprendre avec le patient le moment de survenue, le repas ou la prise alimentaire associée, l'activité physique et le traitement.",
            "Vérifier si l'organisation des repas et des apports glucidiques est cohérente avec le schéma thérapeutique renseigné.",
            "Utiliser les données de l'anamnèse comme support éducatif sans modifier automatiquement le traitement ni les doses."
        ],
        "hypoglycemies-dt1": [
            "Mettre en relation les épisodes rapportés avec les horaires des repas, les quantités de glucides, l'activité physique et le schéma insulinique.",
            "Utiliser les glucides calculés dans l'anamnèse comme support éducatif lorsque le comptage glucidique fait partie de la prise en charge.",
            "Conserver les adaptations d'insuline dans le cadre défini avec l'équipe soignante ; NutriFlow ne calcule pas de dose."
        ],
        "hypoglycemies-dt2-insuline": [
            "Rechercher les circonstances des épisodes : horaires, repas, apports glucidiques, activité physique et injections.",
            "Vérifier la cohérence entre les prises alimentaires et l'insulinothérapie renseignée.",
            "Utiliser l'anamnèse comme support de discussion sans modifier automatiquement les doses d'insuline."
        ],
        "hypoglycemies-dt2-sulfamides": [
            "Reprendre les horaires de prise, les repas sautés ou décalés, l'activité physique et les circonstances des épisodes.",
            "Vérifier que l'organisation alimentaire est compatible avec le traitement prescrit.",
            "Orienter vers l'équipe médicale si les épisodes persistent ; NutriFlow ne modifie pas le traitement."
        ],
        "hypoglycemies-dt2-glinides": [
            "Mettre en relation les épisodes avec les repas et le moment de prise du traitement.",
            "Repérer les repas sautés ou fortement décalés pouvant nécessiter une discussion avec l'équipe soignante.",
            "Ne pas modifier la prescription à partir de NutriFlow."
        ],
        "hypoglycemies-dt2-association": [
            "Identifier précisément les traitements associés et le contexte des épisodes d'hypoglycémie.",
            "Confronter les épisodes aux horaires des repas, aux apports glucidiques et à l'activité physique.",
            "Coordonner avec l'équipe soignante si les épisodes persistent ou si le traitement nécessite une réévaluation."
        ],
        "hba1c-au-dessus-objectif": [
            "Confronter l'HbA1c aux données alimentaires observées plutôt que d'attribuer l'écart à un seul aliment ou nutriment.",
            "Examiner l'organisation des repas, les principales sources glucidiques, l'activité physique et les éventuels épisodes hypo/hyperglycémiques.",
            "Retenir avec le patient un nombre limité de changements réalisables à travailler en priorité."
        ],
        "repas-irreguliers-diabete": [
            "Identifier les repas sautés ou très décalés et les raisons de cette organisation.",
            "Comparer cette organisation au traitement et à la répartition glucidique observée dans l'anamnèse.",
            "Construire une organisation des prises compatible avec le quotidien du patient plutôt qu'un schéma alimentaire rigide."
        ],
        "repartition-repas": [
            "Repérer les prises alimentaires réellement présentes et les moments où les glucides sont concentrés.",
            "Mettre la répartition observée en relation avec le type de diabète, le traitement et les symptômes rapportés.",
            "Définir avec le patient les ajustements de répartition réellement utiles."
        ],
        "faible-nombre-repas": [
            "Vérifier si le faible nombre de repas est habituel, choisi ou subi.",
            "Évaluer sa compatibilité avec les besoins, le traitement et le risque d'hypoglycémie.",
            "Adapter l'organisation alimentaire uniquement si l'analyse montre un intérêt pour le patient."
        ],
        "activite-faible": [
            "Identifier avec le patient les possibilités réalistes de réduire la sédentarité dans son quotidien.",
            "Intégrer une activité physique adaptée aux capacités, au traitement et aux éventuelles complications renseignées.",
            "Lorsque le traitement expose à l'hypoglycémie, relier l'activité aux repas et aux épisodes rapportés."
        ],
        "fruits-legumes-faibles": [
            "Repérer les repas où l'ajout ou l'augmentation de fruits et légumes est le plus réaliste.",
            "Travailler simultanément la qualité globale des sources glucidiques et les apports en fibres.",
            "Privilégier des changements progressifs compatibles avec les habitudes du patient."
        ],
        "comptage-glucides-apprentissage": [
            "Utiliser les quantités de glucides calculées dans l'anamnèse pour exercer l'estimation des portions et des aliments réellement consommés.",
            "Identifier les repas ou aliments pour lesquels l'estimation reste difficile.",
            "Ne pas convertir automatiquement ces données en dose d'insuline."
        ],
        "denutrition-severe": [
            "Éviter d'ajouter une restriction alimentaire susceptible d'aggraver l'état nutritionnel.",
            "Faire primer les objectifs du module dénutrition sur une stratégie alimentaire restrictive liée au diabète.",
            "Adapter l'organisation des glucides sans compromettre les apports énergétiques et protéiques nécessaires."
        ],
        "denutrition-moderee": [
            "Éviter les restrictions inutiles et conserver une densité nutritionnelle suffisante.",
            "Coordonner les objectifs diabète avec ceux définis dans le module dénutrition.",
            "Adapter la qualité et la répartition des glucides sans réduire arbitrairement les apports globaux."
        ],
        "boissons-sucrees-regulieres": [
            "Préciser les boissons concernées, leur fréquence, leur quantité et les situations de consommation.",
            "Confronter cette habitude aux autres apports glucidiques avant de décider d'une modification.",
            "Définir avec le patient une réduction, une substitution ou un maintien raisonné selon la priorité retenue."
        ],
        "axe-boissons-sucrees": [
            "Reprendre les boissons réellement identifiées dans l'anamnèse et leur contexte de consommation.",
            "Travailler en priorité la fréquence, la quantité ou une substitution réaliste selon les habitudes du patient.",
            "Éviter de transformer automatiquement cet axe en interdiction globale."
        ],
        "axe-jus-fruits": [
            "Replacer les jus identifiés dans le contexte du repas et des autres apports glucidiques.",
            "Comparer leur place aux habitudes et aux objectifs retenus avec le patient.",
            "Décider avec le patient si une modification de fréquence ou de quantité est réellement prioritaire."
        ],
        "axe-produits-sucres": [
            "Préciser la fréquence, les portions et le contexte de consommation des produits identifiés.",
            "Évaluer leur contribution par rapport aux autres sources glucidiques avant de fixer un objectif.",
            "Retenir une modification seulement si elle est pertinente et acceptable pour le patient."
        ],
        "axe-sources-favorables": [
            "Identifier avec le patient les sources déjà favorables qu'il souhaite conserver.",
            "Valoriser ces aliments comme points d'appui de la prise en charge.",
            "Éviter une approche centrée uniquement sur les aliments à réduire."
        ]
    };

    const resultat = actions[element.code]
        ? [...actions[element.code]]
        : [];

    // Adaptation au contexte insulinique lorsqu'une priorité alimentaire est affichée.
    const insulinotherapie =
        (
            analyse?.type === "DT1" &&
            ["insulinotherapie", "pompe"].includes(analyse?.traitement)
        ) ||
        (
            analyse?.type === "DT2" &&
            analyse?.traitement === "insuline"
        );

    if (
        insulinotherapie &&
        element.axeAlimentaire &&
        !resultat.some(action => action.includes("insuline"))
    ) {
        resultat.push(
            "Mettre cet ajustement alimentaire en relation avec le schéma insulinique et le comptage glucidique lorsqu'ils sont concernés."
        );
    }

    if (resultat.length === 0) {
        resultat.push(
            "Définir avec le patient une action concrète, mesurable et compatible avec son quotidien à partir de ce constat."
        );
    }

    return resultat;
}


function construireSuiviPriseEnChargeDiabete(element, analyse) {
    const suivis = {
        "hypoglycemies-recentes": "Fréquence, moment de survenue, contexte alimentaire, activité physique et traitement associés aux nouveaux épisodes.",
        "hypoglycemies-dt1": "Épisodes d'hypoglycémie, répartition glucidique, activité physique et cohérence avec le schéma insulinique.",
        "hypoglycemies-dt2-insuline": "Épisodes d'hypoglycémie, horaires des repas, apports glucidiques et insulinothérapie.",
        "hypoglycemies-dt2-sulfamides": "Épisodes d'hypoglycémie, horaires des repas, activité physique et contexte de prise du traitement.",
        "hypoglycemies-dt2-glinides": "Épisodes d'hypoglycémie, organisation des repas et contexte de prise du traitement.",
        "hypoglycemies-dt2-association": "Épisodes d'hypoglycémie, traitements concernés, organisation des repas et activité physique.",
        "hba1c-au-dessus-objectif": "Évolution des repères glycémiques disponibles et faisabilité des changements retenus avec le patient.",
        "repas-irreguliers-diabete": "Régularité des prises, repas sautés, répartition glucidique et tolérance de l'organisation choisie.",
        "repartition-repas": "Répartition des glucides entre les prises et adéquation avec le traitement et les habitudes.",
        "faible-nombre-repas": "Nombre et organisation des prises, symptômes éventuels et compatibilité avec le traitement.",
        "activite-faible": "Évolution de la sédentarité, activité réellement réalisée, tolérance et éventuel lien avec les glycémies ou hypoglycémies.",
        "fruits-legumes-faibles": "Évolution des choix alimentaires, sources de fibres et faisabilité des changements retenus.",
        "comptage-glucides-apprentissage": "Capacité à estimer les glucides des repas habituels et difficultés encore rencontrées.",
        "denutrition-severe": "Poids, apports, tolérance, évolution de l'état nutritionnel et atteinte des objectifs définis dans le module dénutrition.",
        "denutrition-moderee": "Poids, apports, évolution de l'état nutritionnel et absence de restriction alimentaire excessive.",
        "boissons-sucrees-regulieres": "Fréquence, quantité et contexte de consommation des boissons concernées.",
        "axe-boissons-sucrees": "Fréquence, quantité et contexte de consommation des boissons ciblées.",
        "axe-jus-fruits": "Place des jus dans les repas, fréquence et quantité consommées.",
        "axe-produits-sucres": "Fréquence, portions et contexte de consommation des produits ciblés.",
        "axe-sources-favorables": "Maintien des sources favorables déjà présentes dans l'alimentation."
    };

    if (suivis[element.code]) {
        return suivis[element.code];
    }

    if (element.maintien) {
        return "Vérifier que ce point favorable est maintenu sans rigidifier inutilement l'alimentation.";
    }

    return "Réévaluer ce point à la prochaine consultation et ajuster l'objectif selon l'évolution et la faisabilité pour le patient.";
}


function cartePriseEnChargeDiabete(element, index, analyse) {
    const niveau =
        element.boissonsSucrees
            ? "Boissons sucrées"
            : element.maintien
                ? "À maintenir"
                : element.niveau === "haute"
                    ? "Priorité élevée"
                    : element.niveau === "moyenne"
                        ? "À travailler"
                        : "À considérer";

    const objectif =
        element.objectifPersonnalise ||
        construireObjectifPriseEnChargeDiabete(
            element
        );

    const actions =
        construireActionsPriseEnChargeDiabete(
            element,
            analyse
        );

    const suivi =
        construireSuiviPriseEnChargeDiabete(
            element,
            analyse
        );

    return `
        <article class="pec-diabetes-item">
            <div class="pec-diabetes-item-head">
                <span class="pec-diabetes-rank">${index + 1}</span>
                <div><h4>${element.titre}</h4><span>${niveau}</span></div>
            </div>
            <p>${element.detail}</p>
            <div class="pec-diabetes-objective"><strong>Objectif proposé</strong><span>${objectif}</span></div>
            <div class="pec-diabetes-section pec-diabetes-panel pec-actions-panel">
                <strong>Actions proposées</strong>
                <span>${actions.map(action => `• ${action}`).join("<br>")}</span>
            </div>
            <div class="pec-diabetes-objective"><strong>Suivi</strong><span>${suivi}</span></div>
            <div class="pec-diabetes-source">Donnée source : ${element.origine || "Dossier patient"}</div>
        </article>`;
}


function construireTraitementsImplicationsDiabete(analyse) {
    const d = analyse.synthese?.diabete || {};
    const t = analyse.traitement;
    const items = [];
    const ajouter = (titre, detail) => items.push({ titre, detail });

    // Ce bloc décrit uniquement les conséquences nutritionnelles du traitement
    // ACTUEL. Les épisodes cliniques (hypoglycémies, hyperglycémies, etc.) sont
    // gérés dans Priorités ou Vigilances afin d'éviter les répétitions.

    if (
        analyse.type === "DT1" &&
        ["insulinotherapie", "pompe"].includes(t)
    ) {
        const libelle = t === "pompe" ? "Pompe à insuline" : "Insulinothérapie";
        ajouter(
            libelle,
            "Tenir compte du schéma insulinique dans l'organisation des prises alimentaires et de l'activité physique. NutriFlow ne calcule pas et ne modifie pas les doses d'insuline."
        );

        if (t === "insulinotherapie" && d.dt1?.ratioInsulineGlucides) {
            ajouter(
                "Ratio insuline/glucides renseigné",
                `Ratio indiqué dans le dossier : ${d.dt1.ratioInsulineGlucides}. Cette donnée est utilisée comme information de contexte et reste à valider dans le cadre du suivi thérapeutique.`
            );
        }
    }

    if (analyse.type === "DT2" && ["sulfamides", "glinides"].includes(t)) {
        ajouter(
            t === "sulfamides" ? "Sulfamide hypoglycémiant" : "Glinide",
            "Le traitement expose à un risque d'hypoglycémie : l'organisation des repas et de l'activité physique doit être cohérente avec le schéma thérapeutique renseigné. NutriFlow ne modifie pas la prescription."
        );
    }

    if (t === "insuline" && analyse.type === "DT2") {
        ajouter(
            "Insulinothérapie",
            "Tenir compte des injections, des horaires des repas, des apports glucidiques et de l'activité physique dans la prise en charge nutritionnelle. NutriFlow ne calcule pas et ne modifie pas les doses d'insuline."
        );
    }

    if (t === "metformine") {
        ajouter(
            "Metformine",
            "Prendre en compte la tolérance digestive et les modalités de prise par rapport aux repas lorsqu'elles sont renseignées. La vitamine B12 est analysée séparément dans le bloc Micronutrition, car une carence peut être associée au traitement."
        );
        if (d.dt2?.metformine?.tolerance) ajouter("Tolérance renseignée", d.dt2.metformine.tolerance);
        if (d.dt2?.metformine?.repas) ajouter("Lien avec les repas", d.dt2.metformine.repas);
    }

    if (t === "glp1") {
        ajouter(
            "Agoniste GLP-1",
            "Prendre en compte les modifications d'appétit et de satiété, l'évolution pondérale et la tolérance digestive dans l'évaluation nutritionnelle."
        );
        if (d.dt2?.glp1?.appetit) ajouter("Appétit / satiété renseignés", d.dt2.glp1.appetit);
        if (d.dt2?.glp1?.poids) ajouter("Évolution pondérale renseignée", d.dt2.glp1.poids);
        if (d.dt2?.glp1?.tolerance) ajouter("Tolérance renseignée", d.dt2.glp1.tolerance);
    }

    if (t === "sglt2") {
        ajouter(
            "Inhibiteur SGLT2",
            "Tenir compte de l'hydratation et de la tolérance. Une stratégie cétogène ne doit pas être proposée automatiquement dans ce contexte ; toute situation évocatrice d'acidocétose relève d'une évaluation médicale. NutriFlow ne modifie pas le traitement."
        );
        if (d.dt2?.sglt2?.hydratation) ajouter("Hydratation renseignée", d.dt2.sglt2.hydratation);
        if (d.dt2?.sglt2?.tolerance) ajouter("Tolérance renseignée", d.dt2.sglt2.tolerance);
    }

    if (t === "dpp4") {
        ajouter(
            "Inhibiteur DPP-4",
            "Aucune implication nutritionnelle spécifique supplémentaire n'est générée automatiquement avec les données actuellement recueillies."
        );
        if (d.dt2?.dpp4?.tolerance) ajouter("Tolérance renseignée", d.dt2.dpp4.tolerance);
    }

    if (t === "association") {
        const metformineDansAssociation =
            traitementInclutMetformineDiabete(analyse);

        ajouter(
            "Association de traitements",
            metformineDansAssociation
                ? "Les molécules de l'association doivent être interprétées individuellement. La metformine est reconnue dans les traitements renseignés : son implication sur la vitamine B12 est intégrée dans le bloc Micronutrition."
                : "Identifier les molécules réellement associées afin d'interpréter leurs implications nutritionnelles au cas par cas ; NutriFlow n'attribue pas automatiquement un risque à toute association."
        );
        if (d.dt2?.association?.traitements) ajouter("Traitements renseignés", d.dt2.association.traitements);
    }

    if (t === "aucun" && analyse.type === "DT2") {
        ajouter(
            "Aucun traitement médicamenteux renseigné",
            "Aucune implication nutritionnelle médicamenteuse spécifique n'est générée. Les axes alimentaires et éducatifs sont présentés dans les sections dédiées."
        );
    }

    if (t === "autre" && d.dt2?.autre?.traitement) {
        ajouter(
            "Autre traitement renseigné",
            `${d.dt2.autre.traitement}. Vérifier ses implications nutritionnelles au cas par cas avant de générer une recommandation spécifique.`
        );
    }

    return items;
}


function construireMicronutritionDiabete(analyse) {
    if (!analyse || !traitementInclutMetformineDiabete(analyse)) return [];
    if (typeof construirePriseEnChargeMicronutritionnelle !== "function") return [];

    const item = construirePriseEnChargeMicronutritionnelle(
        "vitamineB12",
        {
            synthese: analyse.synthese,
            contextePathologique: "diabete",
            lien: "La metformine peut être associée à une diminution du statut en vitamine B12. L'interprétation doit croiser le traitement, les apports alimentaires et la biologie plutôt que d'attribuer automatiquement une B12 basse à l'alimentation."
        }
    );

    return item ? [item] : [];
}


//! EDUCATION NUTRITIONNELLE — DIABETE

function construireEducationNutritionnelleDiabete(analyse) {
    if (!analyse) return [];

    const d = analyse.synthese?.diabete || {};
    const anamnese = analyse.synthese?.anamnese || {};
    const items = [];

    const ajouter = (code, titre, detail) => {
        if (!detail || items.some(item => item.code === code)) return;
        items.push({ code, titre, detail });
    };

    const codesAnalyse = new Set(
        [
            ...(analyse.priorites || []),
            ...(analyse.vigilances || [])
        ]
            .map(element => element?.code)
            .filter(Boolean)
    );

    const categorie = code =>
        obtenirCategorieGlucidiqueDiabete(
            analyse,
            code
        );

    const sourcesPrincipales =
        analyse.analyseGlucidique?.sourcesPrincipales || [];

    const nomsSourcesPrincipales =
        sourcesPrincipales
            .slice(0, 3)
            .map(source => source.nom)
            .filter(Boolean);

    //* 1 — REPERER LES SOURCES GLUCIDIQUES / PORTIONS

    if (nomsSourcesPrincipales.length > 0) {
        ajouter(
            "sources-glucidiques",
            "Repérer les sources glucidiques et les portions",
            `Utiliser les aliments réellement retrouvés dans l'anamnèse (${nomsSourcesPrincipales.join(", ")}) pour apprendre à repérer les principales sources de glucides et à estimer les portions habituellement consommées.`
        );
    }

    //* 2 — REPARTITION DES GLUCIDES

    const repartitionAApprofondir =
        codesAnalyse.has("repas-irreguliers-diabete") ||
        codesAnalyse.has("repartition-repas") ||
        codesAnalyse.has("faible-nombre-repas");

    if (repartitionAApprofondir) {
        const repasDisponibles = Object.keys(anamnese.repas || {});
        const precisionRepas = repasDisponibles.length
            ? ` Les prises actuellement retrouvées sont : ${repasDisponibles.join(", ")}.`
            : "";

        ajouter(
            "repartition-glucidique",
            "Comprendre la répartition des glucides",
            `Apprendre à comparer les quantités de glucides entre les prises alimentaires et à les mettre en relation avec les horaires, les habitudes et le traitement.${precisionRepas}`
        );
    }

    //* 3 — QUALITE DES GLUCIDES / FIBRES

    const cerealesClassiques = categorie("cereales-feculents");
    const cerealesCompletes = categorie("cereales-completes");
    const legumineuses = categorie("legumineuses");
    const fruits = categorie("fruits");
    const produitsSucres = categorie("produits-sucres");

    const qualiteAApprofondir =
        codesAnalyse.has("fruits-legumes-faibles") ||
        Boolean(produitsSucres) ||
        Boolean(cerealesClassiques && !cerealesCompletes);

    if (qualiteAApprofondir) {
        const appuis = [
            cerealesCompletes ? "céréales complètes" : null,
            legumineuses ? "légumineuses" : null,
            fruits ? "fruits entiers" : null
        ].filter(Boolean);

        ajouter(
            "qualite-glucides-fibres",
            "Distinguer qualité des glucides et fibres",
            `Apprendre à différencier quantité de glucides et qualité de la source, notamment selon la présence de fibres.${appuis.length ? ` Les sources déjà présentes pouvant servir de point d'appui sont : ${appuis.join(", ")}.` : ""}`
        );
    }

    //* 4 — BOISSONS SUCREES / JUS

    const boissonsSucrees = categorie("boisson-sucree");
    const jusFruits = categorie("jus-fruits");
    const habitudeBoissons = analyse.synthese?.habitudes?.boissonsSucrees;

    if (
        boissonsSucrees ||
        jusFruits ||
        ["quotidienne", "reguliere"].includes(habitudeBoissons)
    ) {
        const boissonsReperees = [
            boissonsSucrees ? formaterAlimentsCategorieDiabete(boissonsSucrees, 2) : "",
            jusFruits ? formaterAlimentsCategorieDiabete(jusFruits, 2) : ""
        ].filter(Boolean).join(" · ");

        ajouter(
            "boissons-glucidiques",
            "Comprendre la place des boissons glucidiques",
            `Apprendre à repérer la contribution glucidique des boissons, leur portion et leur contexte de consommation${boissonsReperees ? ` à partir des boissons réellement identifiées : ${boissonsReperees}` : ""}. Les boissons utilisées dans un protocole de correction d'hypoglycémie restent à distinguer des consommations habituelles.`
        );
    }

    //* 5 — PRODUITS SUCRES / ETIQUETAGE

    if (produitsSucres || boissonsSucrees || jusFruits) {
        const exemples = [
            produitsSucres ? formaterAlimentsCategorieDiabete(produitsSucres, 2) : "",
            boissonsSucrees ? formaterAlimentsCategorieDiabete(boissonsSucrees, 1) : "",
            jusFruits ? formaterAlimentsCategorieDiabete(jusFruits, 1) : ""
        ].filter(Boolean).join(" · ");

        ajouter(
            "etiquetage-portions",
            "Lire les étiquettes et raisonner par portion",
            `S'entraîner à repérer les glucides et les sucres indiqués sur l'étiquetage, puis à les rapporter à la portion réellement consommée${exemples ? ` en utilisant comme exemples : ${exemples}` : ""}.`
        );
    }

    //* 6 — COMPTAGE GLUCIDIQUE

    const comptageGlucidesPertinent =
        ["oui", "partiel"].includes(d.dietetique?.comptageGlucides) ||
        (
            analyse.type === "DT1" &&
            (
                analyse.traitement === "pompe"
                    ? d.dt1?.pompe?.comptageGlucides === "oui"
                    : analyse.traitement === "insulinotherapie"
                        ? d.dt1?.comptageGlucides === "oui"
                        : false
            )
        ) ||
        (
            analyse.type === "DT2" &&
            analyse.traitement === "insuline" &&
            d.dt2?.insuline?.comptageGlucides === "oui"
        );

    if (
        comptageGlucidesPertinent &&
        !codesAnalyse.has("comptage-glucides-apprentissage")
    ) {
        ajouter(
            "comptage-glucides",
            "Renforcer le comptage glucidique",
            "Utiliser les repas et les quantités calculées dans l'anamnèse comme support d'entraînement à l'estimation des glucides. NutriFlow ne transforme jamais cette estimation en dose d'insuline et ne modifie pas le schéma thérapeutique."
        );
    }

    //* 7 — INSULINOTHERAPIE : COORDINATION REPAS / ACTIVITE / INSULINE

    const insulinotherapie =
        (
            analyse.type === "DT1" &&
            ["insulinotherapie", "pompe"].includes(analyse.traitement)
        ) ||
        (
            analyse.type === "DT2" &&
            analyse.traitement === "insuline"
        );

    if (insulinotherapie) {
        ajouter(
            "coordination-insuline-glucides",
            "Relier glucides, insulinothérapie et activité",
            "Développer la capacité à mettre en relation quantité et horaire des glucides, activité physique et schéma insulinique afin de mieux comprendre les variations glycémiques observées, sans ajustement automatique des doses par NutriFlow."
        );
    }

    //* 8 — HYPOGLYCEMIES : EPISODES RAPPORTES OU PREVENTION DU RISQUE

    const etatHypoglycemies =
        obtenirEtatHypoglycemiesDiabete(
            analyse
        );

    const traitementARisqueHypo =
        traitementExposeHypoglycemieDiabete(
            analyse
        );

    if (etatHypoglycemies.rapportees) {
        ajouter(
            "education-hypoglycemies-rapportees",
            "Maîtriser les repères de sécurité liés à l'hypoglycémie",
            "Renforcer la reconnaissance des signes d'alerte et la compréhension de la conduite à tenir déjà définie avec l'équipe soignante, notamment le protocole de resucrage. L'analyse des circonstances des épisodes reste traitée dans les priorités."
        );
    } else if (traitementARisqueHypo) {
        ajouter(
            "education-risque-hypoglycemie",
            "Prévenir le risque d'hypoglycémie",
            "Renforcer la reconnaissance des signes d'alerte et les mesures préventives prévues avec l'équipe soignante. Cet axe reste éducatif et ne signifie pas qu'un épisode récent a été rapporté."
        );
    }

    //* 9 — AUTOSURVEILLANCE / CAPTEUR : DONNER DU SENS AUX DONNEES

    if (
        d.surveillance?.autosurveillance === "oui" ||
        d.surveillance?.capteur === "oui"
    ) {
        ajouter(
            "lecture-glycemies",
            "Relier les données glycémiques au quotidien",
            "Utiliser les glycémies ou les données du capteur comme support pour observer des tendances autour des repas, de l'activité physique et des événements du quotidien, sans modifier de façon autonome le traitement à partir de NutriFlow."
        );
    }

    //* 10 — ACTIVITE PHYSIQUE SI AXE IDENTIFIE

    if (codesAnalyse.has("activite-faible")) {
        ajouter(
            "education-activite-glycemie",
            "Comprendre le lien activité physique–glycémie",
            traitementARisqueHypo
                ? "Travailler la réduction de la sédentarité et l'activité physique adaptée en observant leur effet sur la glycémie, tout en intégrant les mesures de prévention du risque d'hypoglycémie prévues avec l'équipe soignante."
                : "Travailler la réduction de la sédentarité et l'activité physique adaptée en observant leur effet sur la glycémie et le bien-être général."
        );
    }

    return items;
}

function afficherPriseEnChargeDiabete() {
    const conteneur = document.getElementById("priseEnChargePathologies");
    if (!conteneur) return;

    let bloc = document.getElementById("priseEnChargeDiabete");
    const analyse = typeof analyserDiabete === "function" ? analyserDiabete() : null;

    // Chaque pathologie gère uniquement son propre bloc. Ainsi, l'absence de
    // diabète ne doit jamais effacer une prise en charge dénutrition déjà rendue.
    if (!analyse) {
        bloc?.remove();

        const autrePriseEnCharge = conteneur.querySelector(
            ':scope > section:not(#priseEnChargeDiabete), :scope > [id^="priseEnCharge"]:not(#priseEnChargeDiabete)'
        );

        if (!autrePriseEnCharge) {
            let placeholder = conteneur.querySelector(":scope > .module-placeholder");
            if (!placeholder) {
                placeholder = document.createElement("div");
                placeholder.className = "module-placeholder";
                conteneur.appendChild(placeholder);
            }
            placeholder.innerHTML = `<h3>Prise en charge personnalisée</h3><p>Sélectionnez une pathologie dans l’onglet Patient pour afficher les propositions correspondantes.</p>`;
        }
        return;
    }

    conteneur.querySelectorAll(":scope > .module-placeholder").forEach(el => el.remove());

    if (!bloc) {
        bloc = document.createElement("div");
        bloc.id = "priseEnChargeDiabete";
        conteneur.appendChild(bloc);
    }

    const axesAlimentaires =
        construireAxesAlimentairesDiabete(
            analyse
        );

    const axeBoissonsSucrees =
        axesAlimentaires.find(
            axe =>
                axe.code ===
                "axe-boissons-sucrees"
        ) ?? null;

    const prioriteBoissonsSucrees =
        axeBoissonsSucrees && ["haute", "moyenne"].includes(axeBoissonsSucrees.niveau)
            ? {
                niveau: axeBoissonsSucrees.niveau,
                code: "axe-boissons-sucrees",
                titre: axeBoissonsSucrees.titre,
                detail: axeBoissonsSucrees.detail,
                origine: axeBoissonsSucrees.origine,
                objectifPersonnalise: axeBoissonsSucrees.objectif,
                axeAlimentaire: true,
                boissonsSucrees: true
            }
            : null;

    // Une information descriptive ou un point favorable n'est pas transformé
    // automatiquement en priorité de prise en charge. Ces éléments restent utiles
    // dans Analyse et/ou dans l'éducation nutritionnelle. Seuls les axes réellement
    // actionnables (niveau haute/moyenne) entrent dans la liste des priorités.
    const prioritesAlimentaires =
        axesAlimentaires
            .filter(
                axe =>
                    axe.code !== "axe-sources-principales" &&
                    axe.code !== "axe-boissons-sucrees" &&
                    ["haute", "moyenne"].includes(axe.niveau)
            )
            .map(
                axe => ({
                    niveau: axe.niveau,
                    code: axe.code,
                    titre: axe.titre,
                    detail: axe.detail,
                    origine: axe.origine,
                    objectifPersonnalise: axe.objectif,
                    axeAlimentaire: true
                })
            );

    // Certaines anciennes « vigilances » sont en réalité des axes de travail
    // diététiques. Elles peuvent devenir des priorités, mais les vigilances de
    // sécurité restent dans leur bloc dédié et ne sont plus toutes fusionnées.
    const codesVigilanceAReclasser = new Set([
        "activite-faible",
        "repartition-repas",
        "faible-nombre-repas",
        "fruits-legumes-faibles",
        "boissons-sucrees-regulieres",
        "comptage-glucides-apprentissage"
    ]);

    const vigilancesReclassees =
        (analyse.vigilances || [])
            .filter(element => codesVigilanceAReclasser.has(element.code));

    const prioritesGenerales =
        [
            ...(analyse.priorites || []),
            ...vigilancesReclassees
        ]
            .filter(
                element =>
                    !(
                        prioriteBoissonsSucrees &&
                        [
                            "boissons-sucrees-quotidiennes",
                            "boissons-sucrees-regulieres",
                            "anamnese-boissons-sucrees"
                        ].includes(element.code)
                    )
            );

    const ordrePriorites = { haute: 1, moyenne: 2, faible: 3, information: 4 };

    const priorites = [
        ...prioritesGenerales,
        ...(prioriteBoissonsSucrees ? [prioriteBoissonsSucrees] : []),
        ...prioritesAlimentaires
    ]
        .filter(
            (item, i, arr) =>
                arr.findIndex(x => x.code === item.code) === i
        )
        .sort((a, b) => {
            const rangA = a.maintien ? 99 : (ordrePriorites[a.niveau] ?? 50);
            const rangB = b.maintien ? 99 : (ordrePriorites[b.niveau] ?? 50);
            return rangA - rangB;
        })
        .slice(0, 10);

    const codesVigilanceTraiteeAilleurs = new Set([
        // Implications du traitement : affichées uniquement dans le bloc Traitements.
        "traitement-risque-hypoglycemie",
        "insuline-repartition",
        "glp1-surveillance",
        "sglt2-vigilance",
        "metformine-tolerance",

        // Information d'interprétation : couverte par Priorités / Éducation,
        // ce n'est pas une vigilance de sécurité.
        "repartition-glucidique"
    ]);

    const vigilancesAnalyse =
        (analyse.vigilances || [])
            .filter(element => !codesVigilanceAReclasser.has(element.code))
            .filter(element => !codesVigilanceTraiteeAilleurs.has(element.code))
            .filter(
                element =>
                    !(
                        prioriteBoissonsSucrees &&
                        [
                            "boissons-sucrees-regulieres",
                            "anamnese-boissons-sucrees"
                        ].includes(element.code)
                    )
            );

    const implicationsTraitement =
        construireTraitementsImplicationsDiabete(
            analyse
        );

    const micronutrition = construireMicronutritionDiabete(analyse);

    const prioritesHTML = priorites.length
        ? priorites.map((element, index) => cartePriseEnChargeDiabete(element, index, analyse)).join("")
        : `<div class="pec-diabetes-empty">Aucune priorité spécifique n'est générée avec les données actuellement renseignées.</div>`;

    const traitementHTML = implicationsTraitement.length
        ? implicationsTraitement.map(item => `<li><strong>${item.titre}.</strong> ${item.detail}</li>`).join("")
        : !analyse.traitement
            ? `<li><strong>Traitement non renseigné.</strong> Aucune implication nutritionnelle liée à un traitement n'est générée tant qu'un traitement actuel n'est pas sélectionné.</li>`
            : `<li>Aucune implication nutritionnelle spécifique supplémentaire n'est générée automatiquement à partir du traitement renseigné.</li>`;

    const micronutritionHTML = micronutrition.length
        ? micronutrition.map(item => `
            <li>
                <strong>${echapperHTML(item.titre)}.</strong>
                <div><strong>Lien avec le diabète / traitement :</strong> ${echapperHTML(item.lien)}</div>
                <div><strong>Action :</strong> ${echapperHTML(item.action)}</div>
            </li>`).join("")
        : "";

    const vigilancesHTML = vigilancesAnalyse.length
        ? vigilancesAnalyse.map(item => `<li><strong>${item.titre}.</strong> ${item.detail}</li>`).join("")
        : `<li>Aucune vigilance spécifique supplémentaire n'est générée avec les données actuellement renseignées.</li>`;

    const codesPrioritesAffichees = new Set(priorites.map(item => item.code));

    const suiviGlobal = [
        "Tolérance et faisabilité de l'ensemble des objectifs retenus",
        (
            (Number.isFinite(nombreDiabete(analyse.synthese?.diabete?.hba1c)) ||
             Number.isFinite(nombreDiabete(analyse.synthese?.diabete?.glycemie))) &&
            !codesPrioritesAffichees.has("hba1c-au-dessus-objectif")
        )
            ? "Évolution globale des repères glycémiques disponibles"
            : null,
        (
            analyse.synthese?.etatNutritionnel?.has?.diagnostic &&
            !codesPrioritesAffichees.has("denutrition-severe") &&
            !codesPrioritesAffichees.has("denutrition-moderee")
        )
            ? "Évolution globale de l'état nutritionnel et du poids"
            : null
    ].filter(Boolean);

    const education =
        construireEducationNutritionnelleDiabete(
            analyse
        );

    const educationHTML = education.length
        ? education
            .map(item => `<li><strong>${item.titre}.</strong> ${item.detail}</li>`)
            .join("")
        : `<li>Aucun axe éducatif personnalisé supplémentaire n'est généré avec les données actuellement renseignées.</li>`;

    bloc.innerHTML = `
        <section class="nutrition-calc-card pec-diabetes-card">
            <div class="pec-diabetes-header">
                <div><span class="pec-diabetes-kicker">DIABÈTE</span><h3>Prise en charge — ${analyse.typeLabel}</h3><p>${analyse.traitementLabel}</p></div>
                <span class="pec-diabetes-validation">À valider par le diététicien</span>
            </div>
            <div class="pec-diabetes-notice">Les éléments ci-dessous transforment les constats de l'analyse en pistes de travail. Ils ne remplacent pas le raisonnement clinique du professionnel.</div>

            <div class="pec-diabetes-section">
                <div class="pec-diabetes-section-title">
                    <h4>Priorités et objectifs proposés</h4>
                    <span>Constat → objectif → actions → suivi</span>
                </div>
                <div class="pec-diabetes-grid">${prioritesHTML}</div>
            </div>

            <div class="pec-diabetes-two-columns">
                <div class="pec-diabetes-section pec-diabetes-panel">
                    <div class="pec-diabetes-section-title"><h4>Éducation nutritionnelle</h4><span>Compétences et autonomie à développer selon le profil</span></div>
                    <ul>${educationHTML}</ul>
                </div>

                <div class="pec-diabetes-section pec-diabetes-panel">
                    <div class="pec-diabetes-section-title"><h4>Traitements et implications nutritionnelles</h4><span>${analyse.traitementLabel}</span></div>
                    <ul>${traitementHTML}</ul>
                </div>
            </div>

            ${micronutritionHTML ? `
            <div class="pec-diabetes-section pec-diabetes-panel">
                <div class="pec-diabetes-section-title"><h4>Micronutrition</h4><span>Lien clinique → action</span></div>
                <ul>${micronutritionHTML}</ul>
            </div>` : ""}

            <div class="pec-diabetes-section pec-diabetes-panel">
                <div class="pec-diabetes-section-title"><h4>Vigilances</h4><span>Situations à surveiller sans les transformer automatiquement en priorités</span></div>
                <ul>${vigilancesHTML}</ul>
            </div>

            <div class="pec-diabetes-section pec-diabetes-followup">
                <div class="pec-diabetes-section-title"><h4>Suivi global</h4><span>Complète le suivi propre à chaque priorité</span></div>
                <div class="pec-diabetes-followup-grid">
                    ${suiviGlobal.map(item => `<span>${item}</span>`).join("")}
                </div>
            </div>
        </section>`;
}

// Synchronisation des nouveaux champs du détail diabète
document.addEventListener("DOMContentLoaded", actualiserDetailsPatientDiabete);
document.addEventListener("change", function (event) {
    if (["diabeteType", "diabeteDateDiagnostic"].includes(event.target?.id)) {
        actualiserDetailsPatientDiabete();
    }
});


//! SYNCHRONISATION — PRISE EN CHARGE DIABÈTE


window.enregistrerModulePathologique?.({
    id: "diabete",
    champs: [
        "diabeteType", "diabeteDateDiagnostic", "diabeteHba1c", "diabeteHba1cDate",
        "diabeteHba1cObjectif", "diabeteGlycemie", "diabeteGlycemieUnite",
        "diabeteGlycemieContexte", "diabeteGlycemieDate", "diabeteAutosurveillance",
        "diabeteCapteurGlucose", "diabeteSurveillanceDetails", "diabeteHypoglycemiesRecentes",
        "diabeteHyperglycemiesRecentes", "diabeteEpisodesDetails", "diabeteAcidocetose",
        "diabeteRetinopathie", "diabeteNeuropathie", "diabeteNephropathie", "diabetePied",
        "diabeteComplicationCardiovasculaire", "diabeteComptageGlucidesPatient",
        "diabeteRepasIrreguliers", "diabeteLienRepasActiviteGlycemie", "diabeteTraitement",
        "dt1TypeInsulinotherapie", "dt1InsulineUtilisee", "dt1NombreInjections",
        "dt1ComptageGlucides", "dt1RatioInsulineGlucides", "dt1Hypoglycemies",
        "dt1HypoglycemiesDetails", "dt1RepasActivite", "dt1TypePompe",
        "dt1TypeInsulinePompe", "dt1BolusRepas", "dt1ComptageGlucidesPompe",
        "dt1RatioPompe", "dt1FacteurCorrectionPompe", "dt1HypoglycemiesPompe",
        "dt1GestionActivitePompe", "dt1ProblemesPompe", "dt2AucunInformations",
        "dt2MetforminePosologie", "dt2MetformineTolerance", "dt2MetformineRepas",
        "dt2MetformineObservance", "dt2SulfamidesTraitement", "dt2SulfamidesHypoglycemies",
        "dt2SulfamidesDetails", "dt2SulfamidesObservance", "dt2GlinidesTraitement",
        "dt2GlinidesRepas", "dt2GlinidesHypoglycemies", "dt2GlinidesObservance",
        "dt2DPP4Traitement", "dt2DPP4Tolerance", "dt2DPP4Observance", "dt2GLP1Traitement",
        "dt2GLP1Appetit", "dt2GLP1Poids", "dt2GLP1Tolerance", "dt2GLP1Observance",
        "dt2SGLT2Traitement", "dt2SGLT2Hydratation", "dt2SGLT2Tolerance",
        "dt2SGLT2Observance", "dt2TypeInsulinotherapie", "dt2InsulineUtilisee",
        "dt2NombreInjections", "dt2MomentsInjections", "dt2ComptageGlucides",
        "dt2Hypoglycemies", "dt2HypoglycemiesDetails", "dt2AssociationTraitements",
        "dt2AssociationHypoglycemies", "dt2AssociationRemarques", "dt2AutreTraitement",
        "dt2RepasActivite", "objectifEnergetique", "macro-proteines-slider",
        "macro-glucides-slider", "macro-lipides-slider"
    ],
    selecteurs: ['input[name="pathologies"][value="Diabète"]'],
    analyse: afficherAnalyseDiabete,
    priseEnCharge: afficherPriseEnChargeDiabete
});;
