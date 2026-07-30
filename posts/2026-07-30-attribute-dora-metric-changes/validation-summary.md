# Validation Summary: Did the Platform Improve Delivery? How to Attribute Changes in DORA Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- DORA software delivery performance metrics
- Platform engineering and internal developer platforms
- Randomized staged and stepped-wedge rollouts
- Intent-to-treat analysis
- Difference-in-differences and staggered-adoption estimators
- Interrupted time-series analysis
- Google CausalImpact and Bayesian structural time-series models
- Causal inference, confounding, mediation, selection bias, and pre-registration

## Sources Consulted
- [DORA: DORA’s software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [DORA: Platform engineering](https://dora.dev/capabilities/platform-engineering/)
- [DORA: Choosing measurement frameworks to fit your organizational goals](https://dora.dev/research/2025/measurement-frameworks/)
- [Google Cloud: Use Four Keys metrics like change failure rate to measure your DevOps performance](https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance)
- [Google CausalImpact documentation](https://google.github.io/CausalImpact/CausalImpact.html)
- [Callaway and Sant’Anna: Introduction to Difference-in-Differences with Multiple Time Periods](https://bcallaway11.github.io/did/articles/multi-period-did.html)
- [American Economic Association: Difference-in-Differences Designs—A Practitioner’s Guide](https://www.aeaweb.org/articles?id=10.1257/jel.20251650)
- [NIH Research Methods Resources: Stepped Wedge Group-Randomized Trials](https://researchmethodsresources.nih.gov/methods/SWGRT)
- [Cochrane Handbook: Assessing risk of bias in a non-randomized study, including interrupted time series](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-25)
- [CONSORT 2010 Explanation and Elaboration: intention-to-treat analysis](https://www.bmj.com/content/340/bmj.c869)

## Issues Found
- The change-lead-time pseudocode subtracted the earliest included commit from the deployment time. That measures the age of the oldest change in a deployment rather than the lead time of each change. It now computes deployment time minus the corresponding commit time for every included change, consistent with DORA’s per-change definition and Google Cloud’s Four Keys calculation guidance.
- The post associated an invitation date with an intent-to-treat question without stating that intent-to-treat preserves randomized assignment. The wording now limits that interpretation to a randomized offer or rollout assignment and makes assigned rollout the primary comparison; actual-usage analysis is explicitly described as requiring additional selection assumptions.
- Not-yet-treated services were presented as contemporaneous comparisons without noting anticipation or spillover contamination. They are now described as potential comparisons only when teams do not receive the intervention early through anticipation or spillovers.
- The formal Difference-in-Differences guidance recommended service and time effects without warning about conventional two-way fixed-effects estimates in staggered rollouts. It now warns that such estimates can be biased when treatment effects differ by cohort or time since adoption and calls for a staggered-adoption estimator robust to that heterogeneity. Uncertainty is now clustered at the treatment-assignment level.

## Review Notes
The text snippets are conceptual metric and exposure definitions rather than executable code, so no language syntax, CLI, API, or configuration-version checks were required. All referenced URLs resolved to the intended resources. DORA’s current guidance confirms the five named metrics, their application at the application or service level, and the balanced platform scorecard described in the post. The Difference-in-Differences arithmetic and the stated CausalImpact and interrupted-time-series assumptions are correct after the edits above.
