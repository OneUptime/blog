# Validation Summary: How to Use Grafana Variable Queries for Dynamic Dashboard Filtering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboard variables and templating
- Grafana Prometheus data source variable queries
- PromQL
- Prometheus HTTP API
- Kubernetes `kubectl port-forward`
- JSON dashboard snippets

## Sources Consulted
- Grafana documentation: Prometheus template variables - https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana documentation: Variables - https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/
- Grafana documentation: Variable syntax and advanced formatting - https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/variable-syntax/
- Grafana documentation: Add variables - https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana documentation: Observability as Code variables schema - https://grafana.com/docs/grafana/latest/as-code/observability-as-code/schema-v2/variables-schema/
- Prometheus documentation: HTTP API - https://prometheus.io/docs/prometheus/latest/querying/api/
- Kubernetes documentation: `kubectl port-forward` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The "Top N Services by Traffic" variable used a raw PromQL `topk(...)` expression in a Grafana classic variable query. Changed it to `query_result(topk(...))`, which matches Grafana's documented Prometheus variable query helper for query-result variables.
- The dynamic pod-name extraction regex captured only the first two hyphen-separated pod-name segments and could include the ReplicaSet hash rather than the deployment name. Updated the regex to capture the prefix before the ReplicaSet and pod suffix pattern.
- The interval variable example used `namespace="$namespace"` even though the post's namespace variable is multi-select with "All" enabled. Changed it to `namespace=~"$namespace"` to match Grafana's documented requirement for multi-value and All variables in Prometheus label matchers.
- The sorting JSON example included comments and a non-existent `sortValue` field. Removed the invalid field and comments, then documented the numeric `sort` values in prose.
- The regex transformation JSON example included an inline comment, which made the `json` snippet invalid. Removed the comment and preserved the explanation in prose.
- The environment-based filtering snippet showed two comma-separated JSON objects without an enclosing array. Wrapped the objects in an array so the snippet is valid JSON.
- The testing section sent `label_values(...)` to Prometheus `/api/v1/query`, but `label_values()` is a Grafana variable-query helper, not a PromQL function. Replaced it with the Prometheus label-values API endpoint and a `match[]` series selector.
- The performance section fenced Grafana variable query strings as `promql`. Changed the fence to `text` because `label_values(...)` and `query_result(...)` are Grafana variable-query helpers rather than standalone PromQL expressions.

## Review Notes
- The article uses Grafana's legacy dashboard JSON variable model (`templating.list`) and classic Prometheus variable query syntax such as `label_values(...)`. Grafana still documents classic query syntax, but the current UI also supports structured Prometheus variable query types.
- For Prometheus panel queries that use `rate()` or `increase()`, Grafana currently recommends `$__rate_interval` over fixed ranges or `$__interval` in many dashboards. The fixed `[5m]` examples remain valid, but `$__rate_interval` is often preferable in production dashboards.
