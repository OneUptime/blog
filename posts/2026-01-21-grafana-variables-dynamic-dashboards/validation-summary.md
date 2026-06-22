# Validation Summary: How to Use Variables for Dynamic Dashboards in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboard variables
- Prometheus data source template variables
- PromQL
- Loki / LogQL filtering
- Kubernetes metrics from kube-state-metrics and cAdvisor

## Sources Consulted
- Grafana documentation: Prometheus template variables - https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana documentation: Add variables and filters - https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Prometheus documentation: Querying basics - https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus documentation: Operators and vector matching - https://prometheus.io/docs/prometheus/latest/querying/operators/
- Grafana Loki documentation: Log queries and line filters - https://grafana.com/docs/loki/latest/query/log_queries/

## Issues Found
- The post used Grafana's classic `label_values(...)` Prometheus variable syntax throughout. Grafana's current Prometheus variable documentation marks the classic query editor syntax as deprecated, so the snippets were updated to use current query fields such as `Query type: Label values`, `Metric`, and `Label`.
- Several PromQL examples used exact-match selectors such as `namespace="$namespace"` with variables configured for multi-value and Include All. Grafana requires regex-compatible interpolation with `=~` for multi-value or All variables, so those selectors were changed to `namespace=~"$namespace"`.
- Rate-query examples used fixed ranges or the custom `$interval` variable as the primary Prometheus pattern. Grafana currently recommends `$__rate_interval` for Prometheus `rate()` and `increase()` queries, so the PromQL examples were updated to use `$__rate_interval` where appropriate while keeping the interval variable as a user-controlled option.
- The "Combining Multiple Metrics" example used `kube_pod_info * on(namespace) group_left kube_service_info`, which can produce invalid many-to-many matching when both metrics have multiple series per namespace. It was replaced with a valid PromQL set intersection using `count by (namespace) (...) and count by (namespace) (...)` and a regex to extract the namespace label.
- The refresh options section described a "Never" option as current UI behavior. The current Grafana Prometheus variable documentation lists refresh options as "On dashboard load" and "On time range change", so the text was adjusted to recommend avoiding time-range refreshes for stable values.
- Grafana v13 documentation refers to the dashboard-wide ad hoc variable control as "Filters" in the UI, while noting the schema still uses `AdhocVariable`. The post's filter type and heading were updated from "Ad hoc filters" to "Filters".
- The Loki text-search example used an exact namespace matcher with the dashboard's namespace variable. It was changed to `namespace=~"$namespace"` so it also works with multi-value selections.

## Review Notes
The examples assume common Kubernetes metrics such as `kube_pod_info`, `kube_namespace_labels`, `kube_deployment_labels`, and `container_cpu_usage_seconds_total` are present. Those metric names are environment-dependent and require kube-state-metrics and/or cAdvisor-style collection to be configured.
