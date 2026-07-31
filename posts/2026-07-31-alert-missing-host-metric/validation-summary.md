# Validation Summary: How to Alert When an Expected Host Metric Disappears Without Treating No Data as Zero

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus
- PromQL
- Prometheus alerting rules
- Node Exporter
- Service discovery and metric relabeling
- Remote write

## Sources Consulted

- [Prometheus query functions: `absent()`, `absent_over_time()`, and `present_over_time()`](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus logical/set operators and vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus querying basics: label matchers, lookback, and staleness](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus automatically generated target series, including `up`](https://prometheus.io/docs/concepts/jobs_instances/#automatically-generated-labels-and-time-series)
- [Prometheus alerting-rule semantics and annotation templates](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus recording-rule syntax and rule-group `query_offset`](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus scrape configuration and metric relabeling](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- [Node Exporter collector configuration and request-time collector filtering](https://github.com/prometheus/node_exporter)
- [Node Exporter filesystem collector metric definitions](https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_common.go)
- [Node Exporter collector success metric implementation](https://github.com/prometheus/node_exporter/blob/v1.11.1/collector/collector.go)
- [Prometheus 3.13.0 release](https://github.com/prometheus/prometheus/releases/tag/v3.13.0)

## Issues Found

- The post implied that `device_error=""` needed to be removed for Node Exporter releases whose filesystem capacity metrics lack the `device_error` label. PromQL equality matchers for an empty string also match series where the label is absent, so the original expression is compatible with those releases. The explanation was corrected while retaining the simpler matcher-free alternative.

## Review Notes

- All ten PromQL and alert-rule examples were checked with `promtool check rules` from Prometheus 3.13.0; the rule file passed with no syntax errors.
- The `device_error` label on filesystem capacity metrics remains Node Exporter release-specific. The post now accurately explains why the empty-string matcher remains compatible when the label is absent.
- An `up`-based expected set intentionally covers active scrape targets only; the post correctly requires an independent inventory to detect targets removed from service discovery.
