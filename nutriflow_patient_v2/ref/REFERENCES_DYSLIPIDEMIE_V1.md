# NutriFlow — Dyslipidémie V1 : référentiel de travail

## Périmètre

Le module Dyslipidémie V1 est une aide à la décision diététique. Il ne pose pas de diagnostic, ne calcule pas automatiquement SCORE2/SCORE2-OP et ne prescrit ni n'ajuste un traitement médicamenteux.

La biologie sanguine reste la source de vérité unique. Le module lit le bilan lipidique central et n'en recrée pas les champs.

## Sources principales

1. **ESC/EAS 2019 — Guidelines for the management of dyslipidaemias: lipid modification to reduce cardiovascular risk.**
   - objectifs LDL-C selon la catégorie de risque ;
   - objectifs secondaires non-HDL-C et ApoB ;
   - triglycérides comme marqueur de risque ;
   - alimentation : qualité des graisses, fibres, sucres ajoutés, activité physique ;
   - critères cliniques d'évaluation d'une hypercholestérolémie familiale.

2. **Focused Update ESC/EAS 2025 des recommandations 2019.**
   - confirmation des objectifs LDL-C 2019 ;
   - utilisation de SCORE2/SCORE2-OP pour les personnes auxquelles ces outils sont applicables ;
   - Lp(a) > 50 mg/dL (> 105 nmol/L) comme modificateur du risque ;
   - actualisation des traitements hypolipémiants.

3. **OMS 2023 — Saturated fatty acid and trans-fatty acid intake for adults and children.**
   - AGS : au maximum 10 % de l'apport énergétique ;
   - acides gras trans : au maximum 1 % ;
   - privilégier le remplacement par des graisses insaturées.

4. **Cours Condorcet 2025-2026 — Diététique et pathologies cardiovasculaires.**
   - démarche : caractériser la dyslipidémie, évaluer le risque cardiovasculaire global, cibler prioritairement le LDL-C, proposer des conseils progressifs et individualisés ;
   - distinction hypercholestérolémie / hypertriglycéridémie ;
   - facteurs nutritionnels : AGS, qualité lipidique, fibres, poids, activité physique, alcool et glucides dans l'hypertriglycéridémie.

## Règles codées V1

| Règle | Comportement NutriFlow |
|---|---|
| LDL-C — risque faible | cible < 116 mg/dL |
| LDL-C — risque modéré | cible < 100 mg/dL |
| LDL-C — risque élevé | cible < 70 mg/dL + réduction ≥ 50 % si LDL non traité documenté |
| LDL-C — risque très élevé | cible < 55 mg/dL + réduction ≥ 50 % si LDL non traité documenté |
| Objectif LDL individualisé | prioritaire sur la cible automatique de catégorie |
| Risque/cible manquant | LDL-C non classé automatiquement « normal » ou « anormal » |
| Triglycérides | signal à partir de 150 mg/dL ; recherche des facteurs associés |
| non-HDL-C | objectifs secondaires : 130 / 100 / 85 mg/dL pour risque modéré / élevé / très élevé |
| ApoB | objectifs secondaires : 100 / 80 / 65 mg/dL pour risque modéré / élevé / très élevé |
| Lp(a) | > 50 mg/dL ou > 105 nmol/L = modificateur de risque |
| Suspicion HF | LDL non traité très élevé = signal d'évaluation, jamais diagnostic automatique |
| AGS | signal si ≥ 10 % de l'énergie estimée |
| Fibres | signal si < 25 g/j dans l'anamnèse exploitable |

## Limites volontaires V1

- SCORE2/SCORE2-OP n'est pas calculé automatiquement.
- Le diagnostic d'hypercholestérolémie familiale n'est pas automatisé.
- Aucune dose médicamenteuse n'est proposée.
- Les suppléments d'oméga-3 et les phytostérols ne sont pas prescrits automatiquement.
- Les données absentes ne sont jamais assimilées à des valeurs normales.
- L'alcool doit encore être mieux centralisé dans le dossier patient pour les futures versions ; le module invite à l'évaluer en cas d'hypertriglycéridémie sans inventer une consommation.

## Point réglementaire / propriété intellectuelle

Les recommandations ESC sont utilisables comme références de travail pour le prototype éducatif. Avant toute commercialisation, vérifier et obtenir les autorisations nécessaires pour la réutilisation des contenus des Guidelines dans un logiciel ou un algorithme.
