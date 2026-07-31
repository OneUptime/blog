# Validation Summary: Static Thresholds vs Dynamic Baselines: How to Reduce Noisy Infrastructure Alerts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus recording rules
- Prometheus alerting rules
- Node Exporter CPU metrics
- Dynamic baselines and infrastructure alerting
- Site reliability engineering (SRE)

## Sources Consulted
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus querying basics, range selectors, durations, and the `offset` modifier](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus operators and vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus recording and alerting rule syntax](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus recording rule practices](https://prometheus.io/docs/practices/rules/)
- [Prometheus alerting practices](https://prometheus.io/docs/practices/alerting/)
- [The Zen of Prometheus](https://prometheus.io/docs/practices/the_zen/)
- [Prometheus getting-started CPU recording-rule example](https://prometheus.io/docs/prometheus/latest/getting_started/)
- [Official Prometheus Node Exporter repository](https://github.com/prometheus/node_exporter)

## Issues Found
No technical issues found.

## Review Notes
All PromQL expressions and both YAML rule groups were syntax-checked successfully with `promtool` 3.13.2. The sample-count calculations are correct for the stated one-minute and five-minute recording intervals. The post also accurately distinguishes equal sample weighting from true time weighting, explains that `1w` is seven 24-hour days, and includes appropriate caveats for missing data, cold starts, slow rule evaluation, baseline contamination, label churn, and non-stationary infrastructure data.
