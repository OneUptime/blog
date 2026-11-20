# Validation Summary: Dashboard Rework Rate, Change Failure Rate, and Recovery Time Without Gaming

## Status
validated

## Post Type
Technical guide to dashboard data modeling, deployment cohort selection, metric calculation, and data-quality reporting. The schema, formulas, and aggregation rules are technical implementation details, so the post qualifies for technical validation despite containing no executable application code.

## Technologies Covered
- DORA software delivery performance metrics
- DevOps deployment and incident event modeling
- Dashboard cohort selection and aggregation
- Classification uncertainty and right-censored recovery observations
- Site Reliability Engineering (SRE), SLOs, error budgets, and blameless postmortems

## Sources Consulted
- DORA software delivery performance metrics: https://dora.dev/guides/dora-metrics/ — checked metric definitions, service-level context, and measurement pitfalls.
- DORA metric history: https://dora.dev/insights/dora-metrics-history/ — checked the narrowing of recovery measurement to production-change failures.
- NIST/SEMATECH e-Handbook, Censoring: https://www.itl.nist.gov/div898/handbook/apr/section1/apr131.htm — checked the interpretation of right-censored elapsed durations.
- Google SRE Workbook, Example Error Budget Policy: https://sre.google/workbook/error-budget-policy/ — checked reliability investment and non-punitive policy guidance.
- Google SRE Book, Postmortem Culture: https://sre.google/sre-book/postmortem-culture/ — checked reporting incentives and preventive follow-up.
- Linked companion guide: https://oneuptime.com/blog/post/2026-11-19-calculate-dora-deployment-rework-rate/view — attempted web retrieval and checked HTTP availability; read the existing local source at posts/2026-11-19-calculate-dora-deployment-rework-rate/README.md for consistency with this post's counting contract.
- Author profile: https://www.github.com/nawazdhandala — verified redirect to the intended GitHub profile.

## Issues Found
No technical issues found in the metric definitions, schema, formulas, or worked examples. No README.md changes were necessary.

Link availability issue: the companion OneUptime guide returned HTTP 404 during review. Its matching local README exists and contains the intended calculation guide. The URL was retained because the intended target is identifiable and no verified replacement public URL was available. Public availability should be checked when publishing the companion guide.

## Review Notes
- Confirmed that deployment rework and change failure have distinct, potentially overlapping numerators. Adding their percentages would double-count deployments belonging to both categories.
- The deployment registry, deduplication rules, separate pending states, shared denominator, recovery endpoints, and snapshot policy are explicitly local implementation choices, not prescribed DORA schemas or aggregation standards.
- Reviewed half-open UTC cohort selection and cross-boundary attribution. D42 belongs to the November 1–7 cohort; D43 belongs to the following cohort. Programmatically checked that 23:55 to 00:35 is 40 minutes under the stated impairment-to-restoration convention.
- Programmatically checked the 20–30% rework bounds, 10–15% failure bounds, and five-percentage-point effect of changing one classification among twenty deployments. The formulas assume a positive denominator and mutually exclusive confirmed/pending states for each metric. The post separately handles empty cohorts and incomplete ingestion.
- Classification bounds are correctly distinguished from confidence intervals. They do not cover missing deployments or errors in classifications already considered confirmed.
- Reviewed recovery accounting: completed, ongoing with a known start, and unusable-timestamp records reconcile to confirmed failures. Missing or open durations must not become zero. Completed-only percentiles are correctly labeled and accompanied by coverage.
- Applying right censoring to recovery is valid when recovery has not occurred by the observation cutoff and its start is known. The NIST source describes the general statistical concept using lifetime data; the post applies that concept to time until restoration without claiming to fit a survival model.
- Dashboard trend explanations are presented as investigation prompts rather than causal findings. Audit trails, contextual service comparisons, SLO impact, and blameless reviews are consistent with the cited guidance.
- All cited official technical resources were accessible and relevant. Only the companion OneUptime page had the availability limitation described above.
- The text fences contain a conceptual schema, timeline, and mathematical formulas. There are no executable commands, configuration files, API calls, or version-specific dependencies to test for syntax or deprecation.
