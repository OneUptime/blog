# Validation Summary: How to Build Capacity Dashboards

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana dashboards and panels
- Grafana template variables and data links
- Prometheus PromQL, recording rules, and alerting rules
- kube-state-metrics metrics
- TypeScript examples
- YAML and JSON dashboard/configuration snippets
- CSS responsive layout examples

## Sources Consulted
- Grafana Dashboard JSON model: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana data links and variables: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-data-links/
- Grafana Alert list visualization: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/alert-list/
- Grafana State timeline visualization: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/state-timeline/
- Grafana Prometheus template variables: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Prometheus query basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rule naming practices: https://prometheus.io/docs/practices/rules/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The layout example used `type: 'bar'`, but Grafana's bar chart panel type is conventionally represented as `barchart` in dashboard JSON. Changed the example type union and panel instance to `barchart`.
- The Grafana alert list example used `alertInstanceLabelFilter: 'category="capacity"'`, but Grafana documents alert instance label filters using label-query syntax such as `{severity="critical"}`. Changed the filter to `{category="capacity"}`.
- The alert list sort comment said `Severity`, but Grafana documents that sort option as importance/state ordering rather than arbitrary severity-label ordering. Updated the comment to `Importance`.
- The data-link examples appended `${__url_time_range}` after an existing query string, which would produce malformed URLs because Grafana's `__url_time_range` includes the leading `?from=...&to=...`. Moved `${__url_time_range}` immediately after the dashboard path and appended dashboard variables with `&`.
- Several TypeScript examples referenced placeholder types or helper functions without definitions. Added minimal interfaces and stub helper functions so the examples are self-contained enough to understand and adapt.
- The mobile alert formatter assumed every alert had a `severity` label. Added a fallback so it does not throw when that optional label is missing.

## Review Notes
The PromQL examples use common node-exporter, cAdvisor, and kube-state-metrics metric names. Exact label availability, especially `cluster`, depends on the deployment's relabeling and metric pipeline. The forecast examples use linear prediction, which is valid PromQL but should be treated as a simple trend estimate rather than a complete capacity model for seasonal workloads.
