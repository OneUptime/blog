# Validation Summary: Calculate Server Downtime Without Misreading Short Scrape Gaps

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus
- PromQL
- Prometheus recording and alerting rules
- Prometheus Blackbox Exporter
- Node Exporter
- Availability, downtime, and SLO reporting

## Sources Consulted

- [Prometheus automatically generated labels and time series](https://prometheus.io/docs/concepts/jobs_instances/#automatically-generated-labels-and-time-series)
- [Prometheus aggregation-over-time functions](https://prometheus.io/docs/prometheus/latest/querying/functions/#aggregation_over_time)
- [Prometheus range vector selectors, subqueries, lookback, and staleness](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus scrape configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- [Prometheus recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus alerting rules and the `ALERTS` series](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus alerting best practices](https://prometheus.io/docs/practices/alerting/)
- [Prometheus Blackbox Exporter](https://github.com/prometheus/blackbox_exporter)
- Prometheus `promtool` 3.13.2, used to syntax-check all PromQL and rule snippets

## Issues Found

- The multi-probe `max by (host)` recording rule aggregated only the probe series present at an evaluation. If one expected probe disappeared while the remaining probes reported 0, the rule could incorrectly materialize an unreachable state instead of unknown telemetry. Added an inventory-backed `expected_host_probe_count` guard so the rule emits state only when the observed probe count matches the expected count. Clarified that the guard must remain when using `min` because both aggregators ignore absent inputs.
- The failed-interval query used a subquery over an instant selector. During missing rule evaluations, Prometheus lookback can repeat the latest non-stale value at multiple subquery steps, potentially counting unknown time as downtime. Replaced it with `count_over_time(host:reachable[24h]) - sum_over_time(host:reachable[24h])`, multiplied by 30, so the estimate counts only stored samples of the 0/1 recording-rule gauge. The documentation link was updated from subquery syntax to range vector selectors.
- The text said the firing `ALERTS` series included the alert's qualification delay. The firing series begins only after the `for` period is satisfied; the preceding pending samples have `alertstate="pending"`. Clarified that the firing-time estimate starts after the qualification delay and excludes the pending period.

## Review Notes

All PromQL expressions and YAML rule snippets passed syntax validation with Prometheus `promtool` 3.13.2. No deprecated functions or configuration fields were found. The remaining downtime calculations are intentionally approximate and the post correctly requires coverage, missing-data policy, inventory history, and probe semantics to be reported alongside them.
