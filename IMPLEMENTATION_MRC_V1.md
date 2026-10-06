# Implémentation MRC V1 — NutriFlow

## Périmètre
Le module MRC V1 interprète les données rénales centralisées dans `SynthesePatient` et produit une analyse, des vigilances, des priorités, des objectifs, des actions et des éléments de suivi. Il ne relit pas l'anamnèse directement dans le DOM et ne redéfinit pas les calculs déjà centralisés.

## Sources cliniques de référence
- KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of CKD — référence principale.
- HAS, Guide du parcours de soins – Maladie rénale chronique de l’adulte, mise à jour 2023 — adaptation au contexte francophone et règles de sécurité.
- KDOQI 2020 Nutrition in CKD — nutrition spécialisée.
- KDIGO 2017 CKD-MBD — phosphore, calcium, PTH, vitamine D.
- KDIGO 2026 Anemia in CKD — anémie et statut martial.
- KDIGO 2026 AKI/AKD draft — utilisé uniquement comme garde-fou de contexte aigu, sans diagnostic automatique d’AKI.

## Principes verrouillés
- Une anomalie isolée de DFG ou de RAC ne suffit pas à diagnostiquer une MRC.
- Les catégories G et A peuvent être décrites sans déclarer une MRC confirmée.
- G1/G2 sans marqueur de lésion rénale ne suffisent pas à objectiver une MRC.
- Le risque G×A formel est produit seulement lorsque la MRC est confirmée/documentée.
- Protéines : 0,8 g/kg/j par défaut chez G3–G5 non dialysé, stable et sans risque nutritionnel majeur ; 1,0–1,2 g/kg/j en HD/DP ; objectif spécialisé documenté prioritaire.
- Dénutrition, sarcopénie, fragilité et instabilité métabolique empêchent l’application automatique d’une restriction protéique.
- Sodium : cible MRC standard <2 g/j, individualisée en cas de pertes sodées ou de risque nutritionnel.
- Potassium : aucune restriction automatique si la kaliémie est normale ; hyperkaliémie >5,5 mmol/L ; ≥6,0 mmol/L = vigilance médicale prioritaire dans NutriFlow.
- Phosphore : aucune restriction automatique ; interprétation selon phosphatémie et contexte CKD-MBD, avec priorité aux sources très biodisponibles/additifs en cas d’hyperphosphatémie.
- Hydratation : aucune restriction hydrique automatique ; adaptation selon diurèse, état volémique, pertes, dialyse et objectif documenté.
- Acidose : bicarbonates <23 mmol/L = anomalie compatible avec acidose à considérer ; <18 mmol/L = anomalie importante ; l’urgence sévère nécessite le contexte acido-basique complet.
- Anémie : Hb basse dans la MRC n’est ni une preuve d’anémie rénale ni une preuve de carence martiale ; ferritine et TSAT sont interprétées ensemble.
- Les décisions médicamenteuses, prescriptions de suppléments et adaptations de traitements restent hors du périmètre du moteur diététique.

## Limites volontaires de V1
- Pas de diagnostic automatique d’AKI/AKD.
- Pas de calcul numérique du KFRE tant qu’une équation validée n’est pas intégrée et vérifiée ; le module vérifie seulement l’éligibilité/calculabilité.
- Pas de formule hydrique universelle en dialyse.
- Pas de cible alimentaire universelle de potassium ou de phosphore.
- Pas de prescription automatique de fer, ESA, bicarbonate, chélateur du phosphore, vitamine D active ou cétoanalogues.
- Le moteur pluripathologique transversal reste une couche future ; le module MRC produit néanmoins des règles structurées pour être fusionnées avec HTA, diabète, dénutrition, insuffisance cardiaque, etc.

## Architecture
`Données → SynthesePatient → contexteRenal/MRC → mrc.js → Analyse → Vigilances → Priorités → Objectifs → Actions → Suivi`

## Validation
Le module dispose d’une suite dédiée `tests/test_mrc_v1.js` couvrant notamment les seuils G/A, la chronicité, le contexte aigu, le risque G×A, la progression, protéines, dialyse, sodium, potassium, hydratation, acidose, anémie, CKD-MBD et la garde KFRE.
