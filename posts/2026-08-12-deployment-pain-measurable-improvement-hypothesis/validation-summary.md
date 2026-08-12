# Validation Summary: How to Turn “Deployments Are Painful” into a Measurable Improvement Hypothesis

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- DORA software delivery performance metrics
- Continuous delivery
- CI/CD and deployment automation
- Deployment workflow measurement
- YAML
- Survey-based developer-experience measurement
- Software delivery experimentation and causal inference

## Sources Consulted
- DORA, Software delivery performance metrics: https://dora.dev/guides/dora-metrics/
- DORA, A history of DORA's software delivery metrics: https://dora.dev/insights/dora-metrics-history/
- DORA, Well-being and deployment pain: https://dora.dev/capabilities/well-being/
- DORA, Continuous delivery: https://dora.dev/capabilities/continuous-delivery/
- DORA, Deployment automation: https://dora.dev/capabilities/deployment-automation/
- DORA, Test automation: https://dora.dev/capabilities/test-automation/
- DORA, Working in small batches: https://dora.dev/capabilities/working-in-small-batches/
- DORA, Team experimentation: https://dora.dev/capabilities/team-experimentation/
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/
- NIST/SEMATECH e-Handbook of Statistical Methods, Percentiles: https://itl.nist.gov/div898/handbook/prc/section2/prc262.htm
- UK Government Analysis Function, Questionnaire design guidance: https://analysisfunction.civilservice.gov.uk/policy-store/questionnaire-design-guidance/
- Cochrane Handbook, Chapter 25, non-randomized and interrupted time-series studies: https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-25
- UK Statistics Authority, ONS evidence on staff-survey anonymity and design: https://uksa.statisticsauthority.gov.uk/submission/office-for-national-statistics-written-evidence-submission-to-the-public-administration-and-constitutional-affairs-committee/
- CDC Program Evaluation Framework, 2024: https://www.cdc.gov/mmwr/volumes/73/rr/rr7306a1.htm

## Issues Found
- The routine deployment population excluded emergency incident-mitigation deployments, but the post then presented all five DORA metrics as if they could be calculated over that population. This particularly conflicts with deployment rework rate, whose numerator consists of unplanned deployments caused by production incidents. Clarified that routine work should be segmented for experiment-specific diagnostics while deployments required by each DORA definition remain in the corresponding service-level calculation.
- The post claimed that mixing emergency hotfixes into routine work could make failure rates look worse. Adding emergency deployments to a rate's denominator can move the rate in either direction, depending on the events. Replaced the directional claim with the accurate statement that mixing populations can distort distributions and ratios without explaining routine capability.
- Exact p85 values were used without requiring a percentile estimator. Because commonly used estimators can differ, especially for small samples, added a requirement to record the estimator used.
- The example survey lacked labeled response anchors, and its fourth item combined coordination and rework in one double-barrelled statement. Added complete agreement anchors and changed the fourth item to measure coordination alone.
- The examples used an undefined `2.3/5` median deployment-confidence score even though the survey contained several distinct items and no composite-scoring rule. Added item-level reporting guidance and requirements for any custom composite, then made the examples consistently use the median of the single deployment-confidence item.
- The causal-mechanism example could be read as decomposing a p85 duration into a separately calculated p85 wait time, even though component percentiles are not additive. Reworded it to refer explicitly to per-deployment timeline evidence from the slowest deployments.
- Several decision thresholds were not operationally defined: manual handoffs had no aggregation rule, emergency rework was a raw count rather than DORA's rate, and `does not worsen` had no tolerated margin. Defined the handoff threshold as a share of routine deployments, changed emergency rework to deployment rework rate, and required predeclared numerical margins and aggregation rules for guardrails.
- The `Control Confounders` section only recorded or annotated possible confounders and treated interrupted time series as a general fallback. Recording factors does not control them, and an interrupted time-series analysis requires sufficient observations before and after a defined interruption to characterize trends and temporal patterns. Renamed the section, added the requirements for a credible comparison and interrupted time series, and required before-and-after language with limited causal claims when those conditions are absent.
- The statistical guidance suggested confidence intervals generically for a small sample. Clarified that intervals should estimate the change and should be reported only when supported by the design and sample; otherwise, the post recommends showing every observation and limiting certainty.

## Review Notes
- The current DORA model has the five metrics named in the post and groups them into throughput and instability. DORA recommends applying them to one application or service at a time and warns against disparate comparisons.
- DORA's continuous-delivery capability page retains one legacy reference to “four key metrics,” but the dedicated metrics guide and metrics-history page establish the current five-metric model. The post correctly uses the current model.
- The deployment-pain definition, same-process and same-package guidance, idempotence recommendation, deployment-test guidance, and normal-working-hours framing match the official DORA capability pages.
- Both illustrative YAML snippets parse as mappings and use YAML syntax compatible with the current specification. They are conceptual schemas rather than configuration for a named deployment product.
- All seven DORA links in the post resolve to their intended official pages. The author link resolves through GitHub's canonical redirect.
- The post contains no terminal commands, executable application code, library APIs, or version-specific implementation claims requiring runtime validation.
