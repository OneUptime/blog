# Validation Summary: 14, 28, or 30 Days? How to Choose an SLO Evaluation Window

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Service level indicators (SLIs) and service level objectives (SLOs)
- Error budgets and event-based SLO calculations
- Time-slice/window-based SLOs
- Rolling and calendar-aligned compliance periods
- Burn-rate and multiwindow alerting
- Google Cloud Observability service monitoring

## Sources Consulted

- [Google SRE Workbook: Implementing SLOs — Choosing an Appropriate Time Window](https://sre.google/workbook/implementing-slos/#choosing-an-appropriate-time-window)
- [Google Cloud Observability: SLI metrics overview](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/overview)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google Cloud Observability: Concepts in service monitoring — Compliance periods and error budgets](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring)
- [Google Cloud Observability: Alerting on your burn rate](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/alerting-on-budget-burn-rate)

## Issues Found

No technical issues found.

## Review Notes

- The post contains implementation-level SLO calculations and operational alerting guidance, so it was reviewed as a technical guide rather than classified as a non-code blog.
- The event-budget examples are correct: a 99.9% target yields a nominal budget of 1,000 bad events out of 1,000,000, while one bad event out of 200 produces 99.5% compliance and therefore misses the target. Fractional nominal budgets are not spendable as partial events.
- The five-minute-slice calculation is correct: a 28-day window contains 8,064 five-minute slices before exclusions.
- The elapsed-time burn-budget formula is the standard normalized approximation cited by the Google SRE Workbook. For request-based SLOs with materially variable traffic, exact realized consumption depends on the eligible-event counts in the lookback and full SLO windows; the post appropriately labels the duration formula as approximate and recommends replaying historical traffic.
- The four reference URLs resolve to the intended official Google SRE or Google Cloud documentation. No executable code, terminal commands, configuration snippets, deprecated APIs, or version-specific claims required validation.
