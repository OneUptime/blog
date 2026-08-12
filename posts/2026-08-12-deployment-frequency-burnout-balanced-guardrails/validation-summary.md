# Validation Summary: Deployment Frequency Improved but Burnout Got Worse: Choosing Balanced Guardrail Metrics

## Status

validated

## Post Type

Technical measurement and organizational-practice guide

## Technologies Covered

- DORA software delivery performance metrics: deployment frequency, change lead time, failed deployment recovery time, change fail rate, and deployment rework rate
- Continuous delivery and continuous deployment
- Service-level indicators, SLOs, error budgets, deployment safety, and operational rework
- Google Site Reliability Engineering practices for on-call load and toil
- SPACE developer-productivity framework
- NIOSH Worker Well-Being Questionnaire and occupational burnout measurement
- YAML 1.2 decision-rule example

## Sources Consulted

- [DORA software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [DORA metric history](https://dora.dev/insights/dora-metrics-history/)
- [DORA 2024 Accelerate State of DevOps Report](https://dora.dev/research/2024/dora-report/2024-dora-accelerate-state-of-devops-report.pdf)
- [DORA: Well-being](https://dora.dev/capabilities/well-being/)
- [DORA: Continuous delivery](https://dora.dev/capabilities/continuous-delivery/)
- [Microsoft Research: The SPACE of Developer Productivity](https://www.microsoft.com/en-us/research/publication/the-space-of-developer-productivity-theres-more-to-it-than-you-think/)
- [ACM Queue: The SPACE of Developer Productivity](https://doi.org/10.1145/3454122.3454124)
- [Google SRE: Being On-Call](https://sre.google/sre-book/being-on-call/)
- [Google SRE: Eliminating Toil](https://sre.google/sre-book/eliminating-toil/)
- [NIOSH Worker Well-Being Questionnaire publication page](https://www.cdc.gov/niosh/publications/numbered/2021-110.html)
- [NIOSH Worker Well-Being Questionnaire, Version 2, revised June 2026](https://www.cdc.gov/niosh/media/pdfs/2026/06/2021-110_revised062026.pdf)
- [World Health Organization: Burn-out as an occupational phenomenon](https://www.who.int/standards/classifications/frequently-asked-questions/burn-out-an-occupational-phenomenon)
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/)

## Issues Found

- The post correctly classified failed deployment recovery time as a DORA throughput metric, but its explanation that recovery constrains delivery capacity was not DORA's stated rationale. It now explains that the metric measures the speed of changes made in response to a failure, matching DORA's current model.
- The YAML guardrail named `pages_per_shift_p85` set a threshold in “actionable incidents,” conflating pages with incidents. Google SRE defines an incident as a group of related events or alerts. The value now uses the matching unit, “actionable pages.”
- The burnout-measurement guidance could be read as permitting team pulse surveys or delivery telemetry to inform individual clinical or employment decisions. It now explicitly prohibits that use and directs clinical concerns to qualified health professionals using appropriate instruments, consistent with NIOSH's statement that the WellBQ does not permit clinical judgments and its privacy guidance for linked responses.
- The NIOSH documentation link used a superseded CDC path. It now points to the current publication page for the June 2026 revision.

## Review Notes

- The YAML example is syntactically valid and parses as three nested mappings. It is correctly presented as an illustrative decision-rule structure rather than a configuration schema for a named product.
- DORA's January 2026 guide confirms the five-metric model used by the post. The older continuous-delivery capability page still contains a “four key metrics” reference, but the current metrics guide and metric-history page supersede that wording.
- The sample thresholds are not universal standards. The post correctly labels them illustrative and tells readers to derive thresholds from local risk, baselines, staffing, SLOs, and worker input.
- NIOSH WellBQ Version 2 does not provide an overall summary-score algorithm, absolute or clinical judgments, or firm action thresholds. The post correctly warns against extracting a few items and inventing a burnout score.
