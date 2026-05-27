# Validation Summary: How to Use Grafana Variables and Templating for Dynamic Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboards
- Grafana variables and templating
- Grafana Prometheus data source
- Prometheus / PromQL
- Kubernetes metric labels from kube-state-metrics and cAdvisor-style metrics

## Sources Consulted
- Grafana documentation: Add variables - https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana documentation: Prometheus template variables - https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/prometheus/template-variables/
- Grafana documentation: Variable syntax - https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/variable-syntax/
- Grafana documentation: Configure panel options and repeating panels - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-panel-options/
- Prometheus documentation: Querying basics - https://prometheus.io/docs/prometheus/latest/querying/basics/
- OneUptime website - https://oneuptime.com/

## Issues Found
- The post used Prometheus `label_values(...)` classic variable-query syntax throughout. Grafana's current Prometheus variable documentation marks the classic query editor as deprecated, so the examples were changed to the current `Query type: Label values`, `Label`, and `Metric` form.
- The namespace variable enabled `Include All option` with `Custom all value: .*`, but several PromQL examples used `namespace="$namespace"`. That would not match all namespaces when "All" is selected. Those matchers were changed to `namespace=~"$namespace"` where the namespace variable is used.
- The variable type table used the older "Ad hoc filters" name. Grafana's current documentation uses "Filters" and notes that it was formerly ad hoc filters, so the table was updated to "Filters".
- The multi-value explanation stated that Grafana simply joins values with a pipe. Grafana formats multi-values as data-source-specific, regex-compatible strings for Prometheus, so the wording was adjusted to avoid implying there is no escaping or formatting.
- The navigation for creating variables used older dashboard settings wording. It was updated to match the current Grafana flow: edit the dashboard, open dashboard settings, select Variables, and add a variable.

## Review Notes
- The PromQL examples are syntactically valid and use `=~` for regex variable matching where multi-value or all-value expansion can occur.
- Grafana recommends `$__rate_interval` for Prometheus `rate()` queries in many dashboards. The post intentionally demonstrates a user-controlled interval variable; that is still valid, but `$__rate_interval` may be preferable for dashboards where users do not need to manually choose the rate window.
