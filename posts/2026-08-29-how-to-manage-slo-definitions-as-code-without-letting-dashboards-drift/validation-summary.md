# Validation Summary: How to Manage SLO Definitions as Code Without Letting Dashboards Drift

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Service level objectives (SLOs), service level indicators (SLIs), and error budgets
- GitOps and observability as code
- OpenSLO v1
- Prometheus and PromQL
- Prometheus recording and alerting rules
- `promtool` rule validation, unit testing, and recording-rule backfill
- YAML manifests, CI validation, and dashboard reconciliation

## Sources Consulted

- [OpenSLO v1 specification](https://github.com/OpenSLO/OpenSLO)
- [Prometheus: Query functions (`rate`, `increase`, and absence handling)](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus: PromQL operators and IEEE 754 arithmetic](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus: Instrumentation guidance for avoiding missing metrics](https://prometheus.io/docs/practices/instrumentation/#avoid-missing-metrics)
- [Prometheus: Data model and time-series label identity](https://prometheus.io/docs/concepts/data_model/)
- [Prometheus: Defining recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus: Recording-rule naming and aggregation practices](https://prometheus.io/docs/practices/rules/)
- [Prometheus: Unit testing rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/)
- [Prometheus: `promtool` command reference](https://prometheus.io/docs/prometheus/latest/command-line/promtool/)
- [Prometheus: Backfilling recording rules](https://prometheus.io/docs/prometheus/latest/storage/#backfilling-for-recording-rules)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/#documenting-the-slo-and-error-budget-policy)
- [Google SRE Workbook: Multiwindow, multi-burn-rate alerts](https://sre.google/workbook/alerting-on-slos/#6-multiwindow-multi-burn-rate-alerts)

## Issues Found

- The canonical manifest required a measurement source later in the post but did not declare one. Added `sli.source: prometheus-primary` and made source references part of referential validation.
- The post's request-ratio math assumed occurrence-based budgeting, but the manifest did not declare a budgeting method. Added `budgetingMethod: occurrences` and included budgeting-method changes in schema, historical-diff, and semantic-version checks.
- If no `result="good"` labeled counter has been exported yet, the original numerator returned an empty vector during all-bad traffic rather than zero. Updated `goodPromQL` to fall back to zero only when the total query has a result, and added guidance to initialize bounded label values.
- A zero denominator and missing telemetry are different states: zero traffic can produce `0 / 0` (`NaN`), while absent telemetry produces no series. Added an explicit `zeroTrafficPolicy` and required generated validation to distinguish and enforce both policies.
- The OpenSLO wording grouped distinct budgeting methods together and referred vaguely to validated extensions. Updated it to name `Occurrences`, `Timeslices`, and `RatioTimeslices`, place provider-specific query fields in `metricSource.spec`, and use `indicatorRef` for standalone SLI references.
- The text could imply that the sample's multi-window burn policy maps directly to an OpenSLO v1 `AlertPolicy`. Clarified that v1 permits at most one condition per policy, so composed multi-window semantics remain implementation-specific.
- Changing `slo_version` or `definition_hash` creates a new Prometheus time series. Clarified that the hash covers canonical semantic fields and that generated consumers must select one definition rather than aggregate old and new versions.
- Global `sum(...)` removes cohort labels, and missed recording-rule evaluations create gaps. Tightened the semantic checks so cohort completeness is checked before intentional aggregation and rule gaps cannot be confused with zero traffic.
- Current Prometheus documentation marks the recording-rule backfill command family experimental. Updated the backfill caveat accordingly.

## Review Notes

- The YAML example remains intentionally vendor-specific and is correctly identified as an internal schema rather than an OpenSLO document.
- The corrected PromQL applies `rate()` before `sum()`, which preserves per-series counter-reset detection. Its ungrouped aggregation intentionally produces a global SLI; implementations needing regional or cohort SLIs must generate grouped rules.
- The `promtool check rules` and `promtool test rules` commands are current. The revised rules parsed successfully, and an all-bad-traffic fixture verified the numerator fallback with the official Prometheus 3.14.0 `promtool`; rule tests also support the proposed missing and stale samples.
- Recording-rule backfill has documented limitations, including ignored alerting rules and unsupported dependencies between rules in the same group. The post appropriately recommends isolated testing and explicit review.
- All external links in the post resolved to the intended official or authoritative resources on the validation date.
