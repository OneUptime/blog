# Validation Summary: How to Implement Grafana Status History

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Grafana Status history visualization
- Grafana State timeline visualization
- Grafana value mappings and annotations
- Prometheus and PromQL
- Prometheus recording and alerting rules
- kube-state-metrics
- OneUptime observability integration

## Sources Consulted
- Grafana Status history documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/status-history/
- Grafana State timeline documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/state-timeline/
- Grafana value mappings documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-value-mappings/
- Grafana annotations documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/annotate-visualizations/
- Prometheus recording and alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The kube-state-metrics pod phase example implied the numeric value alone represented all pod phases. Updated the query to filter known phases and clarified that the active phase is carried in the `phase` label with value 1.
- The multi-state PromQL divided 5xx request rates by unaggregated total request rates, which can produce incorrect vector matching by status label. Updated it to aggregate both numerator and denominator with `sum by (job)`.
- The value mapping text said four states while the JSON defined three. Corrected the text and adjusted range boundaries to avoid overlapping integer ranges from the `ceil()` query.
- The alerting section described the YAML as Grafana alerting, but the snippet is Prometheus-compatible rule-file syntax. Updated the wording.
- The downtime recording rule was not a valid complete Prometheus rule file and did not reliably calculate downtime while a target was currently down. Replaced it with a complete rule group using `max_over_time((timestamp(up == 1))[24h:])` and `up == bool 0`.
- The pre-aggregation recording rule had the same unaggregated request-rate division issue and was shown as PromQL despite being rule YAML. Replaced it with a complete Prometheus rule group and corrected the metric name to a health score.
- The troubleshooting guidance referenced a "Connect null values" Status history option, which is not a Status history setting in current Grafana documentation. Replaced it with guidance to verify scrape/query continuity and fill missing values through the query or transformations when appropriate.
- The OneUptime Prometheus scrape example used an unverified `/api/metrics` endpoint and deprecated-style `bearer_token` syntax. Reworded the section to use a Prometheus-compatible exporter endpoint and the current `authorization` block.

## Review Notes
JSON snippets were checked locally with `jq`. `promtool` was not installed in the environment, so Prometheus rule examples were reviewed against official Prometheus rule syntax and PromQL documentation rather than executed with `promtool check rules`.
