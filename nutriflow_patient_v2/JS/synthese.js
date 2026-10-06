

//! PATHOLOGIES // 


function obtenirPathologiesSelectionnees() {
  return Array.from(document.querySelectorAll('input[name="pathologies"]:checked')).map(element => element.value);
}


//! ALLERGIES // 


function obtenirAllergiesSelectionnees() {
  return Array.from(document.querySelectorAll('input[name="allergies"]:checked')).map(element => element.value);
}


//! HAS // 


function obtenirDonneesDenutritionSynthese() {
  const age = nombreSynthese("age");
  const poidsActuel = nombreSynthese("poids");
  const tailleCm = nombreSynthese("taille");
  const imc =
    Number.isFinite(poidsActuel) && poidsActuel > 0 &&
    Number.isFinite(tailleCm) && tailleCm > 0
      ? poidsActuel / ((tailleCm / 100) ** 2)
      : null;

  return {
    age,
    poidsActuel,
    tailleCm,
    imc,
    poidsHabituel: nombreSynthese("denutPoidsHabituel"),
    poids1Mois: nombreSynthese("denutPoids1Mois"),
    poids6Mois: nombreSynthese("denutPoids6Mois"),
    albumine: nombreSynthese("denutAlbumine"),
    masseMusculaireReduite: caseCocheeSynthese("denutMasseMusculaire"),
    sarcopenieConfirmee: caseCocheeSynthese("denutSarcopenieConfirmee"),
    reductionApports: valeurSynthese("denutReductionApports"),
    dureeReduction: valeurSynthese("denutDureeReduction"),
    malabsorption: caseCocheeSynthese("denutMalabsorption"),
    agression: caseCocheeSynthese("denutAgression")
  };
}

function obtenirSyntheseHAS(donneesDenutrition = null) {
  if (typeof evaluerDenutritionHAS !== "function") {
    return null;
  }
  const donnees = donneesDenutrition ?? obtenirDonneesDenutritionSynthese();
  const resultat = evaluerDenutritionHAS(donnees);
  if (!resultat) {
    return null;
  }
  return {
    diagnostic: resultat.diagnostic,
    phenotype: resultat.phenotype ?? [],
    etiologie: resultat.etiologie ?? [],
    severite: resultat.severite ?? null,
    completude: resultat.completude ?? null
  };
}

function obtenirSyntheseGLIM(donneesDenutrition = null) {
  if (typeof evaluerDenutritionGLIM !== "function") {
    return null;
  }
  const donnees = donneesDenutrition ?? obtenirDonneesDenutritionSynthese();
  const resultat = evaluerDenutritionGLIM(donnees);
  if (!resultat) {
    return null;
  }
  return {
    diagnostic: resultat.diagnostic,
    phenotype: resultat.phenotype ?? [],
    etiologie: resultat.etiologie ?? [],
    severite: resultat.severite ?? null
  };
}


//! MNA


function obtenirSyntheseMNA() {
  const age = nombreSynthese("age");

  //* NON APPLICABLE

  if (!Number.isFinite(age) || age < 70) {
    return {
      applicable: false,
      score: null,
      interpretation: null
    };
  }

  if (typeof calculerScoreMNA !== "function") {
    return {
      applicable: true,
      score: null,
      interpretation: null
    };
  }

  const score = calculerScoreMNA();
  if (!Number.isFinite(score)) {
    return {
      applicable: true,
      score: null,
      interpretation: null
    };
  }

  const interpretation = typeof interpreterMNA === "function" ? interpreterMNA(score) : null;
  return {
    applicable: true,
    score,
    interpretation
  };
}


//! DIABETE — PRESENCE //


function patientADiabete() {
  return obtenirPathologiesSelectionnees().includes("Diabète");
}


//! DIABETE — DONNEES


function obtenirDonneesDiabete() {

  if (!patientADiabete()) {
    return null;
  }

  return {
    present: true,
    type: valeurSynthese("diabeteType"),
    dateDiagnostic: valeurSynthese("diabeteDateDiagnostic"),
    hba1c: nombreSynthese("diabeteHba1c"),
    hba1cDate: valeurSynthese("diabeteHba1cDate"),
    hba1cObjectif: nombreSynthese("diabeteHba1cObjectif"),
    glycemie: nombreSynthese("diabeteGlycemie"),
    glycemieUnite: valeurSynthese("diabeteGlycemieUnite"),
    glycemieContexte: valeurSynthese("diabeteGlycemieContexte"),
    glycemieDate: valeurSynthese("diabeteGlycemieDate"),

    surveillance: {
      autosurveillance: valeurSynthese("diabeteAutosurveillance"),
      capteur: valeurSynthese("diabeteCapteurGlucose"),
      details: texteSynthese("diabeteSurveillanceDetails")
    },

    episodes: {
      hypoglycemies: valeurSynthese("diabeteHypoglycemiesRecentes"),
      hyperglycemies: valeurSynthese("diabeteHyperglycemiesRecentes"),
      details: texteSynthese("diabeteEpisodesDetails"),
      acidocetose: valeurSynthese("diabeteAcidocetose")
    },

    complications: {
      retinopathie: valeurSynthese("diabeteRetinopathie"),
      neuropathie: valeurSynthese("diabeteNeuropathie"),
      nephropathie: valeurSynthese("diabeteNephropathie"),
      pied: valeurSynthese("diabetePied"),
      cardiovasculaire: valeurSynthese("diabeteComplicationCardiovasculaire")
    },

    dietetique: {
      comptageGlucides: valeurSynthese("diabeteComptageGlucidesPatient"),
      repasIrreguliers: valeurSynthese("diabeteRepasIrreguliers"),
      lienRepasActiviteGlycemie: texteSynthese("diabeteLienRepasActiviteGlycemie")
    },

    traitement: valeurSynthese("diabeteTraitement"),

    // DT1 — toutes les données thérapeutiques sont exposées ici.
    dt1: {
      typeInsulinotherapie: valeurSynthese("dt1TypeInsulinotherapie"),
      insuline: texteSynthese("dt1InsulineUtilisee"),
      injectionsJour: nombreSynthese("dt1NombreInjections"),
      comptageGlucides: valeurSynthese("dt1ComptageGlucides"),
      ratioInsulineGlucides: texteSynthese("dt1RatioInsulineGlucides"),
      hypoglycemies: valeurSynthese("dt1Hypoglycemies"),
      hypoglycemiesDetails: texteSynthese("dt1HypoglycemiesDetails"),
      repasActivite: texteSynthese("dt1RepasActivite"),
      pompe: {
        typePompe: texteSynthese("dt1TypePompe"),
        insuline: texteSynthese("dt1TypeInsulinePompe"),
        bolusRepas: valeurSynthese("dt1BolusRepas"),
        comptageGlucides: valeurSynthese("dt1ComptageGlucidesPompe"),
        ratioInsulineGlucides: nombreSynthese("dt1RatioPompe"),
        facteurCorrection: nombreSynthese("dt1FacteurCorrectionPompe"),
        hypoglycemies: valeurSynthese("dt1HypoglycemiesPompe"),
        gestionActivite: texteSynthese("dt1GestionActivitePompe"),
        problemes: texteSynthese("dt1ProblemesPompe")
      }
    },

    // DT2 — toutes les branches du formulaire sont centralisées.
    dt2: {
      aucun: {
        informations: texteSynthese("dt2AucunInformations")
      },
      metformine: {
        posologie: texteSynthese("dt2MetforminePosologie"),
        tolerance: texteSynthese("dt2MetformineTolerance"),
        repas: texteSynthese("dt2MetformineRepas"),
        observance: texteSynthese("dt2MetformineObservance")
      },
      sulfamides: {
        traitement: texteSynthese("dt2SulfamidesTraitement"),
        hypoglycemies: valeurSynthese("dt2SulfamidesHypoglycemies"),
        details: texteSynthese("dt2SulfamidesDetails"),
        observance: texteSynthese("dt2SulfamidesObservance")
      },
      glinides: {
        traitement: texteSynthese("dt2GlinidesTraitement"),
        repas: texteSynthese("dt2GlinidesRepas"),
        hypoglycemies: valeurSynthese("dt2GlinidesHypoglycemies"),
        observance: texteSynthese("dt2GlinidesObservance")
      },
      dpp4: {
        traitement: texteSynthese("dt2DPP4Traitement"),
        tolerance: texteSynthese("dt2DPP4Tolerance"),
        observance: texteSynthese("dt2DPP4Observance")
      },
      glp1: {
        traitement: texteSynthese("dt2GLP1Traitement"),
        appetit: texteSynthese("dt2GLP1Appetit"),
        poids: texteSynthese("dt2GLP1Poids"),
        tolerance: texteSynthese("dt2GLP1Tolerance"),
        observance: texteSynthese("dt2GLP1Observance")
      },
      sglt2: {
        traitement: texteSynthese("dt2SGLT2Traitement"),
        hydratation: texteSynthese("dt2SGLT2Hydratation"),
        tolerance: texteSynthese("dt2SGLT2Tolerance"),
        observance: texteSynthese("dt2SGLT2Observance")
      },
      insuline: {
        type: valeurSynthese("dt2TypeInsulinotherapie"),
        insuline: texteSynthese("dt2InsulineUtilisee"),
        nombreInjections: nombreSynthese("dt2NombreInjections"),
        momentsInjections: texteSynthese("dt2MomentsInjections"),
        comptageGlucides: valeurSynthese("dt2ComptageGlucides"),
        hypoglycemies: valeurSynthese("dt2Hypoglycemies"),
        hypoglycemiesDetails: texteSynthese("dt2HypoglycemiesDetails"),
        repasActivite: texteSynthese("dt2RepasActivite")
      },
      association: {
        traitements: texteSynthese("dt2AssociationTraitements"),
        hypoglycemies: valeurSynthese("dt2AssociationHypoglycemies"),
        remarques: texteSynthese("dt2AssociationRemarques")
      },
      autre: {
        traitement: texteSynthese("dt2AutreTraitement")
      }
    }
  };
}



//! BIOLOGIE SANGUINE — SOURCE CENTRALE V1 //


function obtenirDateBiologiqueEffective(idBase) {
  const dateSpecifique = valeurSynthese(`${idBase}Date`);
  const dateGenerale = valeurSynthese("biologieDateBilan");

  return {
    dateSpecifique,
    dateGenerale,
    date: dateSpecifique || dateGenerale || "",
    sourceDate: dateSpecifique
      ? "specifique"
      : dateGenerale
        ? "bilan"
        : null
  };
}

function obtenirParametreBiologiqueSynthese(idBase) {
  const dates = obtenirDateBiologiqueEffective(idBase);

  return {
    valeur: nombreSynthese(idBase),
    unite: texteSynthese(`${idBase}Unite`),
    referenceLaboratoire: texteSynthese(`${idBase}Reference`),
    dateSpecifique: dates.dateSpecifique,
    date: dates.date,
    sourceDate: dates.sourceDate
  };
}

function normaliserUniteCholesterolSynthese(unite) {
  return String(unite ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace("ℓ", "l");
}

function convertirCholesterolVersMgDlSynthese(valeur, unite) {
  if (!Number.isFinite(valeur)) return null;

  const u = normaliserUniteCholesterolSynthese(unite);

  if (["mg/dl", "mgdl"].includes(u)) return valeur;
  if (["g/l", "gl"].includes(u)) return valeur * 100;
  if (["mmol/l", "mmoll"].includes(u)) return valeur * 38.67;

  return null;
}

function convertirCholesterolDepuisMgDlSynthese(valeurMgDl, unite) {
  if (!Number.isFinite(valeurMgDl)) return null;

  const u = normaliserUniteCholesterolSynthese(unite);

  if (["mg/dl", "mgdl"].includes(u)) return valeurMgDl;
  if (["g/l", "gl"].includes(u)) return valeurMgDl / 100;
  if (["mmol/l", "mmoll"].includes(u)) return valeurMgDl / 38.67;

  return null;
}

function calculerNonHdlBiologique(cholesterolTotal, hdl) {
  const valeurCT = cholesterolTotal?.valeur;
  const valeurHDL = hdl?.valeur;

  if (!Number.isFinite(valeurCT) || !Number.isFinite(valeurHDL)) {
    return {
      valeur: null,
      unite: cholesterolTotal?.unite || hdl?.unite || "",
      calculable: false,
      raison: "donnees_manquantes"
    };
  }

  const uniteCT = cholesterolTotal?.unite || "";
  const uniteHDL = hdl?.unite || "";

  const ctMgDl = convertirCholesterolVersMgDlSynthese(valeurCT, uniteCT);
  const hdlMgDl = convertirCholesterolVersMgDlSynthese(valeurHDL, uniteHDL);

  let valeur = null;
  const unite = uniteCT || uniteHDL || "";

  if (Number.isFinite(ctMgDl) && Number.isFinite(hdlMgDl)) {
    const differenceMgDl = ctMgDl - hdlMgDl;
    valeur = convertirCholesterolDepuisMgDlSynthese(differenceMgDl, unite);
  } else {
    const uniteCTNormalisee = normaliserUniteCholesterolSynthese(uniteCT);
    const uniteHDLNormalisee = normaliserUniteCholesterolSynthese(uniteHDL);

    if (
      uniteCTNormalisee &&
      uniteCTNormalisee === uniteHDLNormalisee
    ) {
      valeur = valeurCT - valeurHDL;
    }
  }

  if (!Number.isFinite(valeur)) {
    return {
      valeur: null,
      unite,
      calculable: false,
      raison: "unites_incompatibles"
    };
  }

  if (valeur < 0) {
    return {
      valeur: null,
      unite,
      calculable: false,
      raison: "resultats_incoherents"
    };
  }

  const dateCT = cholesterolTotal?.date || "";
  const dateHDL = hdl?.date || "";

  return {
    valeur,
    unite,
    calculable: true,
    calcule: true,
    formule: "CT - HDL-C",
    date: dateCT && dateHDL && dateCT === dateHDL ? dateCT : "",
    datesSources: [dateCT, dateHDL].filter(Boolean),
    datesDifferentes: Boolean(dateCT && dateHDL && dateCT !== dateHDL),
    raison: null
  };
}

function obtenirSyntheseBiologie() {
  const dateBilan = valeurSynthese("biologieDateBilan");

  const glycemie = obtenirParametreBiologiqueSynthese("bioGlycemie");
  const hba1c = obtenirParametreBiologiqueSynthese("bioHba1c");
  const insulineJeun = obtenirParametreBiologiqueSynthese("bioInsulineJeun");
  const homa = obtenirParametreBiologiqueSynthese("bioHoma");

  const ferritine = obtenirParametreBiologiqueSynthese("bioFerritine");
  const ferSerique = obtenirParametreBiologiqueSynthese("bioFerSerique");
  const transferrine = obtenirParametreBiologiqueSynthese("bioTransferrine");
  const cst = obtenirParametreBiologiqueSynthese("bioCst");

  const hemoglobine = obtenirParametreBiologiqueSynthese("bioHemoglobine");
  const reticulocytes = obtenirParametreBiologiqueSynthese("bioReticulocytes");
  const vgm = obtenirParametreBiologiqueSynthese("bioVgm");

  const crp = obtenirParametreBiologiqueSynthese("bioCrp");
  const vs = obtenirParametreBiologiqueSynthese("bioVs");
  const albumine = obtenirParametreBiologiqueSynthese("bioAlbumine");

  const asat = obtenirParametreBiologiqueSynthese("bioAsat");
  const alat = obtenirParametreBiologiqueSynthese("bioAlat");
  const ggt = obtenirParametreBiologiqueSynthese("bioGgt");
  const pal = obtenirParametreBiologiqueSynthese("bioPal");
  const bilirubine = obtenirParametreBiologiqueSynthese("bioBilirubine");

  const sodium = obtenirParametreBiologiqueSynthese("bioSodium");
  const potassium = obtenirParametreBiologiqueSynthese("bioPotassium");
  const creatinine = obtenirParametreBiologiqueSynthese("bioCreatinine");
  const dfg = obtenirParametreBiologiqueSynthese("bioDfg");
  const rac = obtenirParametreBiologiqueSynthese("bioRac");
  const bicarbonates = obtenirParametreBiologiqueSynthese("bioBicarbonates");
  const acideUrique = obtenirParametreBiologiqueSynthese("bioAcideUrique");

  const cholesterolTotal = obtenirParametreBiologiqueSynthese("bioCholesterolTotal");
  const ldl = obtenirParametreBiologiqueSynthese("bioLdl");
  const hdl = obtenirParametreBiologiqueSynthese("bioHdl");
  const triglycerides = obtenirParametreBiologiqueSynthese("bioTriglycerides");
  const apoB = obtenirParametreBiologiqueSynthese("bioApoB");
  const lpA = obtenirParametreBiologiqueSynthese("bioLpA");
  const nonHdl = calculerNonHdlBiologique(cholesterolTotal, hdl);

  const calcium = obtenirParametreBiologiqueSynthese("bioCalcium");
  const magnesium = obtenirParametreBiologiqueSynthese("bioMagnesium");
  const phosphore = obtenirParametreBiologiqueSynthese("bioPhosphore");
  const pth = obtenirParametreBiologiqueSynthese("bioPth");
  const zinc = obtenirParametreBiologiqueSynthese("bioZinc");

  const vitamineB1 = obtenirParametreBiologiqueSynthese("bioVitamineB1");
  const vitamineB9 = obtenirParametreBiologiqueSynthese("bioVitamineB9");
  const vitamineB12 = obtenirParametreBiologiqueSynthese("bioVitamineB12");
  const vitamineD = obtenirParametreBiologiqueSynthese("bioVitamineD");

  const tsh = obtenirParametreBiologiqueSynthese("bioTsh");
  const t4l = obtenirParametreBiologiqueSynthese("bioT4l");
  const t3l = obtenirParametreBiologiqueSynthese("bioT3l");

  return {
    dateBilan,

    glycemique: {
      glycemie,
      hba1c,
      insulineJeun,
      homa
    },

    martial: {
      ferritine,
      ferSerique,
      transferrine,
      cst
    },

    hematologie: {
      hemoglobine,
      reticulocytes,
      vgm
    },

    inflammation: {
      crp,
      vs,
      albumine
    },

    hepatique: {
      asat,
      alat,
      ggt,
      pal,
      bilirubine
    },

    renal: {
      sodium,
      potassium,
      creatinine,
      dfg,
      rac,
      bicarbonates,
      acideUrique
    },

    lipidique: {
      cholesterolTotal,
      ldl,
      hdl,
      triglycerides,
      nonHdl,
      apoB,
      lpA
    },

    mineraux: {
      calcium,
      magnesium,
      phosphore,
      pth,
      zinc
    },

    vitamines: {
      vitamineB1,
      vitamineB9,
      vitamineB12,
      vitamineD
    },

    thyroidien: {
      tsh,
      t4l,
      t3l
    }
  };
}


//! HTA — PRESENCE ET DONNEES //


function patientAHTA() {
  return obtenirPathologiesSelectionnees().includes("Hypertension");
}

function obtenirDonneesHTA(biologieCentrale = null) {
  if (!patientAHTA()) {
    return null;
  }

  const biologie = biologieCentrale || obtenirSyntheseBiologie();

  return {
    present: true,
    contexte: valeurSynthese("htaContexte"),
    dateDiagnostic: valeurSynthese("htaDateDiagnostic"),
    pressionArterielle: {
      cabinet: {
        pas: nombreSynthese("htaPasCabinet"),
        pad: nombreSynthese("htaPadCabinet"),
        date: valeurSynthese("htaPaCabinetDate")
      },
      ambulatoire: {
        type: valeurSynthese("htaMesureAmbulatoire"),
        pas: nombreSynthese("htaPasAmbulatoire"),
        pad: nombreSynthese("htaPadAmbulatoire"),
        date: valeurSynthese("htaPaAmbulatoireDate")
      }
    },
    hypotensionOrthostatique: valeurSynthese("htaHypotensionOrthostatique"),
    proteinurie: valeurSynthese("htaProteinurie"),
    natriurese24h: nombreSynthese("htaNatriurese24h"),
    natriureseDate: valeurSynthese("htaNatriureseDate"),
    natriureseQualite: valeurSynthese("htaNatriureseQualite"),
    alcoolVerresJour: nombreSynthese("htaAlcoolVerresJour"),
    tabac: valeurSynthese("htaTabac"),
    tabacDetails: texteSynthese("htaTabacQuantite"),
    traitement: {
      schema: valeurSynthese("htaSchemaTherapeutique"),
      classes: [
        valeurSynthese("htaClasse1"),
        valeurSynthese("htaClasse2"),
        valeurSynthese("htaClasse3")
      ].filter(Boolean),
      medicamentsPosologies: texteSynthese("htaMedicamentsPosologies"),
      dateDebut: valeurSynthese("htaDateDebutTraitement"),
      dateModification: valeurSynthese("htaDateModificationTraitement"),
      tolerance: texteSynthese("htaToleranceTraitement"),
      observance: texteSynthese("htaObservanceTraitement"),
      remarques: texteSynthese("htaTraitementRemarques"),
      aucunTraitementInformations: texteSynthese("htaAucunTraitementInformations"),
      traitementComplexe: texteSynthese("htaTraitementComplexe")
    },
    // Alias conservé pour compatibilité avec le module HTA.
    // La source de vérité est désormais synthese.biologie.
    biologie: {
      potassium: biologie?.renal?.potassium?.valeur ?? null,
      potassiumUnite: biologie?.renal?.potassium?.unite ?? "",
      potassiumDate: biologie?.renal?.potassium?.date ?? "",
      dfg: biologie?.renal?.dfg?.valeur ?? null,
      dfgUnite: biologie?.renal?.dfg?.unite ?? "",
      dfgDate: biologie?.renal?.dfg?.date ?? ""
    }
  };
}




//! DYSLIPIDÉMIE — PRESENCE ET DONNÉES //


function patientADyslipidemie() {
  return obtenirPathologiesSelectionnees().includes("Dyslipidémie");
}

function obtenirDonneesDyslipidemie() {
  if (!patientADyslipidemie()) {
    return null;
  }

  return {
    present: true,
    type: valeurSynthese("dyslipidemieType"),
    dateDiagnostic: valeurSynthese("dyslipidemieDateDiagnostic"),
    contexteDetails: texteSynthese("dyslipidemieContexteDetails"),
    risqueCv: valeurSynthese("dyslipidemieRisqueCv"),

    objectifLdl: {
      valeur: nombreSynthese("dyslipidemieObjectifLdl"),
      unite: valeurSynthese("dyslipidemieObjectifLdlUnite") || "mg/dL"
    },

    ldlAvantTraitement: {
      valeur: nombreSynthese("dyslipidemieLdlAvantTraitement"),
      unite: valeurSynthese("dyslipidemieLdlAvantTraitementUnite") || "mg/dL"
    },

    hfDiagnostiquee: valeurSynthese("dyslipidemieHfDiagnostiquee"),
    evenementCvFamilialPrecoce: valeurSynthese("dyslipidemieEvenementCvFamilialPrecoce"),
    contexteFamilialDetails: texteSynthese("dyslipidemieContexteFamilialDetails"),

    traitement: {
      type: valeurSynthese("dyslipidemieTraitement"),
      details: texteSynthese("dyslipidemieTraitementDetails"),
      tolerance: texteSynthese("dyslipidemieToleranceTraitement"),
      observance: texteSynthese("dyslipidemieObservanceTraitement")
    }
  };
}


//! ANTHROPOMETRIE //


function obtenirAnthropometrieSynthese() {
  const poids = nombreSynthese("poids");
  const taille = nombreSynthese("taille");
  const imc =
    Number.isFinite(poids) && poids > 0 &&
    Number.isFinite(taille) && taille > 0
      ? poids / ((taille / 100) ** 2)
      : null;

  return {
    poids,
    taille,
    imc,
    tourTaille: nombreSynthese("tourTaille"),
    poidsHabituel: nombreSynthese("poidsHabituel"),
    poidsMaximum: nombreSynthese("poidsMax"),
    poidsMinimum: nombreSynthese("poidsMin")
  };
}


//! HABITUDES //


function obtenirHabitudesSynthese() {
  return {
    repas: valeurSynthese("repas"),
    petitDejeuner: valeurSynthese("petitDejeuner"),
    boissonsSucrees: valeurSynthese("boissons"),
    fruitsLegumes: valeurSynthese("fruitsLegumes"),
    sel: {
      cuisson: valeurSynthese("selCuisson"),
      table: valeurSynthese("selTable"),
      assaisonnementsSales: valeurSynthese("produitsAssaisonnementSales"),
      substitut: valeurSynthese("substitutSel")
    },
    remarques: texteSynthese("habitudes")
  };
}


//! CONTEXTE //


function obtenirContexteSynthese() {
  return {
    activite: typeof obtenirLibelleActiviteSelectionnee === "function"
      ? obtenirLibelleActiviteSelectionnee()
      : valeurSynthese("activite"),
    activitePAL: typeof niveauActivitePALSelectionne !== "undefined" && typeof normaliserPAL === "function"
      ? Number(normaliserPAL(niveauActivitePALSelectionne)) || null
      : null,
    objectif: valeurSynthese("objectif"),
    objectifDetails: texteSynthese("objectifDetails"),
    motif: valeurSynthese("motifConsultation"),
    motifDetails: texteSynthese("motifConsultationDetails"),
    sportPratique: valeurSynthese("sportPratique")
  };
}


//! MRC — DONNÉES DOCUMENTÉES //


function obtenirDonneesMRCSynthese(pathologiesSelectionnees = []) {
  const selectionnee = Array.isArray(pathologiesSelectionnees)
    ? pathologiesSelectionnees.includes("Maladie rénale")
    : false;

  if (!selectionnee) return null;

  return {
    present: true,
    dateDiagnostic: valeurSynthese("mrcDateDiagnostic"),
    chroniciteDocumentee: valeurSynthese("mrcChroniciteDocumentee"),
    contexteAigu: valeurSynthese("mrcContexteAigu"),
    cause: texteSynthese("mrcCause"),

    historique: {
      dfgPrecedent: nombreSynthese("mrcDfgPrecedent"),
      dfgPrecedentDate: valeurSynthese("mrcDfgPrecedentDate"),
      racPrecedent: nombreSynthese("mrcRacPrecedent"),
      racPrecedentUnite: valeurSynthese("mrcRacPrecedentUnite") || "mg/g",
      racPrecedentDate: valeurSynthese("mrcRacPrecedentDate")
    },

    suppleance: {
      dialyse: valeurSynthese("mrcDialyse") || "aucune",
      traitementConservateur: valeurSynthese("mrcTraitementConservateur")
    },

    hydratation: {
      diurese24h: nombreSynthese("mrcDiurese24h"),
      oedemes: valeurSynthese("mrcOedemes"),
      deshydratation: valeurSynthese("mrcDeshydratation"),
      objectifHydriqueMl: nombreSynthese("mrcObjectifHydrique")
    },

    modulateurs: {
      fragilite: valeurSynthese("mrcFragilite"),
      instabiliteMetabolique: valeurSynthese("mrcInstabiliteMetabolique"),
      pertesSodees: valeurSynthese("mrcPertesSodees")
    },

    prescriptionNutritionnelle: {
      poidsReference: nombreSynthese("mrcPoidsReference"),
      objectifProteinesGKg: nombreSynthese("mrcObjectifProteines")
    }
  };
}


//! CONTEXTE RÉNAL TRANSVERSAL //


function obtenirContexteRenalSynthese({
  biologie = null,
  diabete = null,
  hta = null,
  anamnese = null,
  mrc = null,
  pathologiesSelectionnees = []
} = {}) {
  const renal = biologie?.renal ?? {};
  const mineraux = biologie?.mineraux ?? {};
  const inflammation = biologie?.inflammation ?? {};
  const hematologie = biologie?.hematologie ?? {};
  const martial = biologie?.martial ?? {};
  const vitamines = biologie?.vitamines ?? {};
  const apports = anamnese?.apports ?? {};

  const contexte = {
    // Ce bloc ne diagnostique pas une MRC et ne classe aucun stade.
    // Il rassemble uniquement les données déjà connues afin que le futur
    // moteur MRC n'ait pas à relire le DOM ni à reconstruire les apports.
    pathologieSelectionnee: Array.isArray(pathologiesSelectionnees)
      ? pathologiesSelectionnees.includes("Maladie rénale")
      : false,

    biologie: {
      dfg: renal.dfg ?? null,
      creatinine: renal.creatinine ?? null,
      rac: renal.rac ?? null,
      bicarbonates: renal.bicarbonates ?? null,
      potassium: renal.potassium ?? null,
      sodium: renal.sodium ?? null,
      phosphore: mineraux.phosphore ?? null,
      calcium: mineraux.calcium ?? null,
      magnesium: mineraux.magnesium ?? null,
      pth: mineraux.pth ?? null,
      albumine: inflammation.albumine ?? null,
      crp: inflammation.crp ?? null,
      hemoglobine: hematologie.hemoglobine ?? null,
      reticulocytes: hematologie.reticulocytes ?? null,
      vgm: hematologie.vgm ?? null,
      ferritine: martial.ferritine ?? null,
      cst: martial.cst ?? null,
      vitamineB9: vitamines.vitamineB9 ?? null,
      vitamineB12: vitamines.vitamineB12 ?? null,
      vitamineD: vitamines.vitamineD ?? null
    },

    dossierMRC: mrc,

    marqueurs: {
      proteinurieHTA: hta?.proteinurie ?? "",
      nephropathieDiabetique: diabete?.complications?.nephropathie ?? ""
    },

    traitementsConnus: {
      antihypertenseurs: Array.isArray(hta?.traitement?.classes)
        ? [...hta.traitement.classes]
        : [],
      sglt2: diabete?.dt2?.sglt2?.traitement ?? ""
    },

    apports: {
      energie: apports.energie ?? null,
      proteines: apports.protein ?? null,
      sodium: apports.sodium ?? null,
      potassium: apports.potassium ?? null,
      phosphore: apports.phosphorus ?? null,
      calcium: apports.calcium ?? null,
      eau: apports.water ?? null
    }
  };

  const parametresBiologiques = Object.values(contexte.biologie);
  const biologieDisponible = parametresBiologiques.some(parametre =>
    Number.isFinite(parametre?.valeur)
  );
  const marqueurDisponible = Boolean(
    contexte.marqueurs.proteinurieHTA ||
    contexte.marqueurs.nephropathieDiabetique
  );
  const apportDisponible = Object.values(contexte.apports).some(apport =>
    Number.isFinite(apport?.valeur)
  );

  return {
    ...contexte,
    disponible: contexte.pathologieSelectionnee || biologieDisponible || marqueurDisponible || apportDisponible
  };
}


//! PATIENT — SYNTHESE COMPLETE //


function construireSynthesePatient() {
  const age = nombreSynthese("age");
  const pathologiesSelectionnees = obtenirPathologiesSelectionnees();
  const biologie = obtenirSyntheseBiologie();
  const diabete = obtenirDonneesDiabete();
  const hta = obtenirDonneesHTA(biologie);
  const dyslipidemie = obtenirDonneesDyslipidemie();
  const obesite = obtenirDonneesObesiteSynthese();
  const donneesDenutrition = obtenirDonneesDenutritionSynthese();
  const anamnese = obtenirSyntheseAnamnese();
  const mrc = obtenirDonneesMRCSynthese(pathologiesSelectionnees);
  const contexteRenal = obtenirContexteRenalSynthese({
    biologie,
    diabete,
    hta,
    anamnese,
    mrc,
    pathologiesSelectionnees
  });

  return {
    schemaVersion: 1,
    patient: {
      nom: texteSynthese("nom"),
      prenom: texteSynthese("prenom"),
      age,
      sexe: valeurSynthese("sexe")
    },
    anthropometrie: obtenirAnthropometrieSynthese(),
    biologie,
    habitudes: obtenirHabitudesSynthese(),
    anamnese,
    contexte: obtenirContexteSynthese(),
    contexteRenal,
    allergies: {
      selectionnees: obtenirAllergiesSelectionnees(),
      autres: texteSynthese("autresAllergies")
    },
    traitements: {
      generaux: texteSynthese("traitements")
    },
    pathologies: {
      selectionnees: pathologiesSelectionnees
    },
    etatNutritionnel: {
      donneesDenutrition,
      has: obtenirSyntheseHAS(donneesDenutrition),
      glim: obtenirSyntheseGLIM(donneesDenutrition),
      mna: obtenirSyntheseMNA()
    },
    objectifsNutritionnels:
      typeof obtenirObjectifsNutritionnelsPatient === "function"
        ? obtenirObjectifsNutritionnelsPatient()
        : null,

    // Modules cliniques — contrats de données V1.
    // Les alias restent au niveau racine pour préserver la compatibilité
    // avec les modules déjà développés.
    diabete,
    hta,
    dyslipidemie,
    mrc,
    obesite
  };
}


if (typeof window !== "undefined") {
  window.obtenirSyntheseBiologie = obtenirSyntheseBiologie;
  window.obtenirDonneesMRCSynthese = obtenirDonneesMRCSynthese;
  window.obtenirContexteRenalSynthese = obtenirContexteRenalSynthese;
  window.calculerNonHdlBiologique = calculerNonHdlBiologique;
  window.obtenirDonneesDyslipidemie = obtenirDonneesDyslipidemie;
  window.obtenirDonneesDenutritionSynthese = obtenirDonneesDenutritionSynthese;
  window.obtenirSyntheseHAS = obtenirSyntheseHAS;
  window.obtenirSyntheseGLIM = obtenirSyntheseGLIM;
}


//! ANAMNESE //


function obtenirSyntheseAnamnese() {

  const lignes =
    typeof anmRows !== "undefined" && Array.isArray(anmRows)
      ? anmRows
      : [];

  const resultatVide = (options = {}) => ({
    disponible: false,
    saisieDisponible: options.saisieDisponible === true,
    pretPourAnalyse: false,
    lignes: lignes.map(ligne => ({ ...ligne })),
    aliments: [],
    repas: {},
    totaux: null,
    apports: {}
  });

  //* AUCUNE DONNEE

  if (lignes.length === 0) {
    return resultatVide();
  }

  //* DEPENDANCES

  if (
    typeof anmGetNutrients !== "function" ||
    typeof anmGetDailyTotals !== "function" ||
    typeof ANM_MEALS === "undefined" ||
    !Array.isArray(ANM_MEALS)
  ) {
    console.warn("Anamnèse : fonctions de calcul indisponibles.");
    return resultatVide();
  }

  // Une ligne vide ne rend pas l'anamnèse exploitable. Les modules cliniques
  // consomment désormais uniquement les lignes correspondant à une quantité
  // réellement enregistrée.
  const lignesConsommees = lignes.filter(row => {
    const resultat = anmGetNutrients(row);
    return Number.isFinite(resultat?.weight) && resultat.weight > 0;
  });

  if (lignesConsommees.length === 0) {
    return resultatVide();
  }

  // Les apports peuvent être calculés pendant la saisie dans l'onglet Anamnèse,
  // mais ils ne sont exposés aux moteurs cliniques qu'après validation explicite
  // par le diététicien. Cela évite de conclure à une insuffisance sur une journée
  // encore en cours d'encodage.
  const saisieValidee =
    typeof anamneseValideePourAnalyse !== "undefined" &&
    anamneseValideePourAnalyse === true;

  if (!saisieValidee) {
    return resultatVide({ saisieDisponible: true });
  }

  const indexes =
    typeof ANM_NUTRIENT_INDEXES !== "undefined" && ANM_NUTRIENT_INDEXES
      ? ANM_NUTRIENT_INDEXES
      : {};

  const construireNutrimentsAliment = resultat => {
    const nutriments = {};
    const valeurs = Array.isArray(resultat?.values) ? resultat.values : [];

    Object.entries(indexes).forEach(([cle, index]) => {
      const valeur = valeurs[index];
      nutriments[cle] = Number.isFinite(valeur) ? valeur : null;
    });

    if (Number.isFinite(valeurs[22]) || Number.isFinite(valeurs[23])) {
      nutriments.epaDha =
        ((Number.isFinite(valeurs[22]) ? valeurs[22] : 0) +
          (Number.isFinite(valeurs[23]) ? valeurs[23] : 0)) * 1000;
    } else {
      nutriments.epaDha = null;
    }

    return nutriments;
  };

  //* ALIMENTS CENTRALISES

  const aliments = lignesConsommees.map(row => {
    const resultat = anmGetNutrients(row);
    const repasIndex = Number(row.meal);
    const valeurs = Array.isArray(resultat?.values) ? resultat.values : [];
    const nutriments = construireNutrimentsAliment(resultat);

    return {
      id: row.id,
      foodId: row.foodId ?? null,
      nom: row.foodName ?? "",
      groupe: row.group ?? "",
      repasIndex: Number.isInteger(repasIndex) ? repasIndex : null,
      repas:
        Number.isInteger(repasIndex) && ANM_MEALS[repasIndex]
          ? ANM_MEALS[repasIndex]
          : "Repas non renseigné",
      quantite: Number(row.quantity) || 0,
      frequence: Number(row.frequency) || 0,
      poidsJournalier: Number.isFinite(resultat?.weight) ? resultat.weight : null,
      energie: Number.isFinite(resultat?.kcal) ? resultat.kcal : null,
      qualiteComposition: resultat?.quality ?? null,

      // Alias historiques conservés pour les modules déjà validés.
      proteines: valeurs[1],
      glucides: valeurs[2],
      lipides: valeurs[3],
      fibres: valeurs[4],
      ags: valeurs[5],
      agmi: valeurs[6],
      agpi: valeurs[7],
      omega6: valeurs[19],
      omega3: valeurs[20],
      epaDha:
        Number.isFinite(valeurs[22]) || Number.isFinite(valeurs[23])
          ? ((Number.isFinite(valeurs[22]) ? valeurs[22] : 0) +
              (Number.isFinite(valeurs[23]) ? valeurs[23] : 0)) * 1000
          : null,
      cholesterol: valeurs[37],

      // Contrat générique pour les nouveaux modules pathologiques.
      nutriments
    };
  });

  //* REPAS

  const repas = {};

  ANM_MEALS.forEach((nomRepas, mealIndex) => {
    const lignesRepas = lignesConsommees.filter(row => Number(row.meal) === mealIndex);
    if (lignesRepas.length === 0) return;

    const alimentsRepas = aliments.filter(aliment => aliment.repasIndex === mealIndex);
    const bilanRepas = anmGetDailyTotals(lignesRepas);
    const total = index => bilanRepas.complete?.[index] ? bilanRepas.totals[index] : null;

    repas[nomRepas] = {
      index: mealIndex,
      aliments: alimentsRepas,
      poids: Number.isFinite(bilanRepas.weight) ? bilanRepas.weight : null,
      energie: Number.isFinite(bilanRepas.kcal) ? bilanRepas.kcal : null,
      energiePartielle:
        !Number.isFinite(bilanRepas.kcal) &&
        Number.isFinite(bilanRepas.kcalPartial) &&
        (bilanRepas.kcalKnown || 0) > 0,
      proteines: total(1),
      glucides: total(2),
      lipides: total(3),
      fibres: total(4),
      ags: total(5),
      agmi: total(6),
      agpi: total(7)
    };
  });

  //* TOTAL JOURNALIER + COMPLETUDE

  const journalier = anmGetDailyTotals(lignesConsommees);

  const totalAlimentsAnamnese = lignesConsommees.length;

  const apportIndex = (index, cle) => {
    const connus = journalier.known?.[index] || 0;
    const complet = journalier.complete?.[index] === true;
    const connu = connus > 0;
    const valeur = complet || connu ? journalier.totals?.[index] : null;

    const couverturePoids = Number.isFinite(journalier.coverageWeight?.[index])
      ? journalier.coverageWeight[index]
      : null;
    const poidsEstime = Number(journalier.estimatedWeight?.[index]) || 0;
    const qualite = typeof anmConstruireQualiteApport === "function"
      ? anmConstruireQualiteApport(journalier, cle)
      : null;

    return {
      valeur: Number.isFinite(valeur) ? valeur : null,
      complet,
      partiel: !complet && connu,
      connus,
      totalAliments: totalAlimentsAnamnese,
      couverture: totalAlimentsAnamnese > 0 ? connus / totalAlimentsAnamnese : null,
      couverturePoids,
      estime: poidsEstime > 0,
      partEstimeePoids: Number.isFinite(journalier.weight) && journalier.weight > 0
        ? poidsEstime / journalier.weight
        : null,
      qualite,
      valeurEstimee: Number.isFinite(qualite?.valeurEstimee) ? qualite.valeurEstimee : null,
      borneBasse: Number.isFinite(qualite?.borneBasse) ? qualite.borneBasse : null,
      borneHaute: Number.isFinite(qualite?.borneHaute) ? qualite.borneHaute : null,
      intervalleDisponible: qualite?.intervalleDisponible === true
    };
  };

  const apports = {
    energie: {
      valeur: Number.isFinite(journalier.kcal)
        ? journalier.kcal
        : ((journalier.kcalKnown || 0) > 0 && Number.isFinite(journalier.kcalPartial)
            ? journalier.kcalPartial
            : null),
      complet: Number.isFinite(journalier.kcal),
      partiel:
        !Number.isFinite(journalier.kcal) &&
        (journalier.kcalKnown || 0) > 0 &&
        Number.isFinite(journalier.kcalPartial),
      connus: journalier.kcalKnown || 0,
      totalAliments: totalAlimentsAnamnese,
      couverture: totalAlimentsAnamnese > 0 ? (journalier.kcalKnown || 0) / totalAlimentsAnamnese : null,
      couverturePoids: Number.isFinite(journalier.kcalCoverageWeight) ? journalier.kcalCoverageWeight : null,
      estime: (journalier.kcalEstimatedWeight || 0) > 0,
      partEstimeePoids: Number.isFinite(journalier.weight) && journalier.weight > 0
        ? (journalier.kcalEstimatedWeight || 0) / journalier.weight
        : null,
      qualite: typeof anmConstruireQualiteApport === "function"
        ? anmConstruireQualiteApport(journalier, "energie")
        : null
    }
  };

  Object.entries(indexes).forEach(([cle, index]) => {
    apports[cle] = apportIndex(index, cle);
  });

  const epaComplet = journalier.complete?.[22] === true;
  const dhaComplet = journalier.complete?.[23] === true;
  const epaConnu = (journalier.known?.[22] || 0) > 0;
  const dhaConnu = (journalier.known?.[23] || 0) > 0;
  apports.epaDha = {
    valeur: epaConnu || dhaConnu
      ? ((journalier.totals?.[22] || 0) + (journalier.totals?.[23] || 0)) * 1000
      : null,
    complet: epaComplet && dhaComplet,
    partiel: !(epaComplet && dhaComplet) && (epaConnu || dhaConnu)
,
    qualite: typeof anmConstruireQualiteApport === "function"
      ? anmConstruireQualiteApport(journalier, "epaDha")
      : null
  };

  const total = index => journalier.complete?.[index] ? journalier.totals[index] : null;

  return {
    disponible: true,
    saisieDisponible: true,
    pretPourAnalyse: true,
    lignes: lignes.map(ligne => ({ ...ligne })),
    aliments,
    repas,
    totaux: {
      energie: journalier.kcal,
      proteines: total(1), glucides: total(2), lipides: total(3), fibres: total(4),
      ags: total(5), agmi: total(6), agpi: total(7), eau: total(0),
      fer: total(8), zinc: total(9), calcium: total(10), selenium: total(11),
      vitC: total(12), vitA: total(13), vitD: total(14), vitB1: total(15), vitB2: total(16), vitB9: total(17), vitB12: total(18),
      omega6: total(19), omega3: total(20),
      epaDha: journalier.complete?.[22] && journalier.complete?.[23] ? (journalier.totals[22] + journalier.totals[23]) * 1000 : null,
      phosphore: total(24), magnesium: total(25), sodium: total(26), potassium: total(27),
      cuivre: total(28), iode: total(29), vitE: total(30), vitK: total(31),
      vitB3: total(33), vitB5: total(34), vitB6: total(35), sel: total(36), cholesterol: total(37),
      poids: journalier.weight
    },
    apports
  };
}

 
//! SYNTHESE PATIENT //


//* VALEUR

function valeurSynthese(id) {
  const element = document.getElementById(id);
  if (!element) {
    return "";
  }
  return element.value ?? "";
}

//* NOMBRE

function nombreSynthese(id) {
  const valeur = Number.parseFloat(valeurSynthese(id));
  return Number.isFinite(valeur) ? valeur : null;
}

//* TEXTE

function texteSynthese(id) {
  return valeurSynthese(id).trim();
}

//* CASE

function caseCocheeSynthese(id) {
  const element = document.getElementById(id);
  return Boolean(element?.checked);
}


//! OBÉSITÉ — DONNÉES POUR LA SYNTHÈSE


function obtenirDonneesObesiteSynthese() {
  if (!obtenirPathologiesSelectionnees().includes("Obésité")) {
    return null;
  }

  const poids = nombreSynthese("poids");
  const taille = nombreSynthese("taille");
  const imc =
    Number.isFinite(poids) && poids > 0 && Number.isFinite(taille) && taille > 0
      ? poids / ((taille / 100) ** 2)
      : null;

  const sexe = valeurSynthese("sexe");
  const tourTailleValeur = nombreSynthese("tourTaille");
  const seuilTourTaille =
    sexe === "homme" ? 94 : sexe === "femme" ? 80 : null;

  let classeIMC = null;
  if (Number.isFinite(imc)) {
    classeIMC = imc < 18.5
      ? "Insuffisance pondérale"
      : imc < 25
        ? "Corpulence normale"
        : imc < 30
          ? "Surpoids"
          : imc < 35
            ? "Obésité de classe I"
            : imc < 40
              ? "Obésité de classe II"
              : "Obésité de classe III";
  }

  return {
    present: true,
    imc,
    classeIMC,
    tourTaille: Number.isFinite(tourTailleValeur)
      ? {
          valeur: tourTailleValeur,
          seuil: seuilTourTaille,
          risque: Number.isFinite(seuilTourTaille)
            ? tourTailleValeur >= seuilTourTaille
            : null
        }
      : null,
    ageDebut: texteSynthese("obesiteAgeDebut"),
    poidsForme: nombreSynthese("obesitePoidsForme"),
    dynamiquePoids: valeurSynthese("obesiteDynamiquePoids"),
    histoireDetails: texteSynthese("obesiteHistoireDetails"),
    retentissementFonctionnel: valeurSynthese("obesiteRetentissementFonctionnel"),
    retentissementDetails: texteSynthese("obesiteRetentissementDetails"),
    stigmatisation: valeurSynthese("obesiteStigmatisation"),
    sommeilAlerte: valeurSynthese("obesiteSommeilAlerte"),
    medicamentPoids: valeurSynthese("obesiteMedicamentPoids"),
    chirurgieBariatrique: valeurSynthese("obesiteChirurgieBariatrique"),
    hyperphagiePrandiale: valeurSynthese("obesiteHyperphagiePrandiale"),
    tachyphagie: valeurSynthese("obesiteTachyphagie"),
    alimentationEmotionnelle: valeurSynthese("obesiteAlimentationEmotionnelle"),
    grignotageCompulsions: valeurSynthese("obesiteGrignotageCompulsions"),
    restrictionCognitive: valeurSynthese("obesiteRestrictionCognitive"),
    tcaAlerte: valeurSynthese("obesiteTcaAlerte"),
    eoss: valeurSynthese("obesiteEoss"),
    prioritePatient: texteSynthese("obesitePrioritePatient"),
    attentes: texteSynthese("obesiteAttentes")
  };
}

window.obtenirDonneesObesiteSynthese = obtenirDonneesObesiteSynthese;
