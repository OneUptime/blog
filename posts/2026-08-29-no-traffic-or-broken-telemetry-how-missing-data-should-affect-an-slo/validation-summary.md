# Validation Summary: No Traffic or Broken Telemetry? How Missing Data Should Affect an SLO

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Service level objectives (SLOs) and service level indicators (SLIs)
- Prometheus metrics and scrape health
- PromQL
- Prometheus recording rules and remote write
- OpenSLO
- Grafana Alerting

## Sources Consulted

- [Prometheus: Querying operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus: Query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus: Querying basics and staleness](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus: Jobs, instances, and the `up` metric](https://prometheus.io/docs/concepts/jobs_instances/)
- [Prometheus: Instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/)
- [Prometheus: The Zen of Prometheus](https://prometheus.io/docs/practices/the_zen/)
- [Prometheus: Recording rules and missed evaluations](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus: Remote write tuning](https://prometheus.io/docs/practices/remote_write/)
- [OpenSLO: `AlertPolicy` specification](https://github.com/OpenSLO/OpenSLO#alertpolicy)
- [Grafana Alerting: No Data and Error states](https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/nodata-and-error-states/)

## Issues Found

1. The fallback example implied that `or vector(1)` generally converts missing observations to success. PromQL `or` performs a label-set union: it does not replace an existing `NaN`, fill missing labeled series, or behave as general null-coalescing. The example now uses an unlabeled aggregate and the text explains that complete absence triggers the fallback while an initialized zero-over-zero ratio remains `NaN`.
2. The post said that deriving good and total events from one metric family makes missing labels affect both consistently. Selective loss or failure to initialize a result-label series can still empty or bias the ratio. The text now says this design reduces instrumentation drift and explicitly requires initializing and monitoring every expected result label set.
3. The absence examples could be read as detecting any missing series. `absent_over_time()` returns a result only when the entire selector has no samples, so one surviving matching series suppresses it. The text now states that limitation and requires explicit expected-series selectors or an inventory comparison for partial disappearance.
4. The `up` examples originally used only a job selector and described a target as present or disappeared. The job can contain multiple targets, and `max_over_time(up[10m]) == 0` establishes only that all recorded samples for a returned series were zero; it does not prove current discovery or that every scheduled scrape ran. Both examples now identify one expected `instance`, and the explanation describes only the evidence the range contains.
5. An unchanged counter was presented as definitive idleness. It establishes only that no increment was observed and can be misleading if an expected label set is absent, instrumentation is stuck, or `increase()` lacks enough samples. The table, query explanation, opening, and conclusion now condition the idle classification on verified counter presence and coverage.
6. The Grafana No Data statement was broader than the product documentation. The special No Data and Error states apply only to Grafana-managed alert rules. The text now adds that qualifier and gives the exact OpenSLO field as boolean `AlertPolicy.spec.alertWhenNoData`.

## Review Notes

All PromQL snippets are syntactically valid and use current, non-deprecated functions. The post correctly applies `rate()` and `increase()` before aggregation, uses request counters for those functions, describes slow recording-rule evaluation and remote-write monitoring accurately, and keeps telemetry alerts separate from the SLI ratio. All reference URLs resolve to relevant official or authoritative documentation. No version-specific claims require qualification.
