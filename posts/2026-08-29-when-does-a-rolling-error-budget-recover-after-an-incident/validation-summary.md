# Validation Summary: When Does a Rolling Error Budget Recover After an Incident?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Service-level indicators (SLIs) and service-level objectives (SLOs)
- Request-based and windows-based error budgets
- Rolling and calendar-aligned compliance periods
- Multiwindow, multi-burn-rate alerting
- Incident recovery forecasting and error-budget policy

## Sources Consulted

- [Google Cloud Observability: Concepts in service monitoring](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring)
- [Google Cloud Monitoring API: ServiceLevelObjective resource](https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services.serviceLevelObjectives)
- [Google Cloud Observability: Creating an SLO](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/ui/create-slo)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Workbook: Choosing an Appropriate Time Window](https://sre.google/workbook/implementing-slos/#choosing-an-appropriate-time-window)

## Issues Found

- The post originally said that a burn alert resolves when both its short and long lookback windows no longer exceed their thresholds. In the Google SRE Workbook's canonical multiwindow, multi-burn-rate rule, each short/long pair is joined with `AND`, so that pair clears when either condition becomes false. The wording was changed to define resolution in terms of the configured alert expression and to state the paired-condition behavior accurately.

## Review Notes

- The request-based error-budget formulas, 28-day/two-hour age-out arithmetic, traffic-dependent denominator behavior, and equal weighting of windows-based measurement intervals agree with the consulted documentation.
- Exact observed transition times can be shifted by a monitoring system's metric alignment and alert-evaluation cadence; the post's times correctly describe the underlying rolling-window boundaries.
- If a request-based window eventually contains no eligible events, the ratio is mathematically undefined; individual monitoring systems can expose that state as missing data or a non-number value.
- All external links in the post were reachable and resolved to the intended GitHub profile or official Google documentation.
