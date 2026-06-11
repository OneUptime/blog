# Validation Summary: How to Build Grafana State Timeline Panels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana State Timeline panels
- Grafana value mappings, thresholds, transformations, data links, and panel JSON
- Prometheus and PromQL
- Prometheus recording rules
- Blackbox exporter-style `probe_success` metrics
- Kubernetes deployment condition metrics from kube-state-metrics
- Loki and Tempo drill-down links
- OneUptime and OpenTelemetry pipeline integration

## Sources Consulted
- Grafana State timeline documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/state-timeline/
- Grafana value mappings documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-value-mappings/
- Grafana transformations documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/
- Grafana data links documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-data-links/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- kube-state-metrics deployment metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md

## Issues Found
- The initial PromQL example used `label_replace()` as if it could convert sample values into string states. Prometheus samples are numeric, and `label_replace()` only changes labels, so the example would not produce usable string state values for Grafana. Replaced it with the direct numeric `up{job="api-gateway"}` signal and clarified that Grafana value mappings should map `1` and `0`.
- The recording rule repeated the same `label_replace()` problem and used `vector(1) and on()` in a way that would lose useful series labels. Simplified the rule to record the numeric `up` state directly.
- The value mapping JSON mapped `3` through `100` to `Unknown`, contradicting the table where `3` is `Maintenance`, and did not use Grafana's special mapping type for `null`. Updated the JSON to map `3` to `Maintenance` and `null` with a `special` mapping.
- The multi-service PromQL query used `rate(probe_success[5m])`, but `probe_success` is a gauge-style 0/1 metric and Prometheus documents `rate()` for counters. Replaced it with `avg_over_time()` and boolean comparisons that produce stable numeric state codes.
- The transformation diagram referred to "Convert to Labels", which is not the transformation used by the accompanying example. Changed it to "Convert Field Type" to match the documented Grafana transformation and the JSON snippet.
- The importable Kubernetes panel JSON grouped only by `deployment`, while the preceding query grouped by both `deployment` and `namespace`. Updated the JSON query and legend format to include `namespace`, avoiding collisions between deployments with the same name in different namespaces.

## Review Notes
The post is technically relevant and valid after the corrections. I could not run `promtool` locally because it is not installed in this environment, so PromQL validation was performed against the official Prometheus syntax and operator/function documentation.
