# Validation Summary: How to Follow Label Best Practices in Prometheus

## Status
validated

## Post Type
Guide / Best-practices reference

## Technologies Covered
- Prometheus (data model, labels, cardinality)
- PromQL
- Prometheus configuration (`external_labels`, `scrape_configs`, `metric_relabel_configs`, alerting rules)
- Go (`prometheus/client_golang` instrumentation)
- Python (`prometheus_client` instrumentation)
- Kubernetes / kube-state-metrics and node_exporter metric examples

## Sources Consulted
- Prometheus naming and labels best practices — https://prometheus.io/docs/practices/naming/
- Prometheus instrumentation/cardinality guidance — https://prometheus.io/docs/practices/instrumentation/
- Prometheus configuration (relabel_config / metric_relabel_configs actions) — https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus querying basics (PromQL aggregation, `__name__`) — https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus TSDB / runtime metrics (`prometheus_tsdb_head_series`, `prometheus_tsdb_head_series_created_total`) — https://prometheus.io/docs/prometheus/latest/storage/
- Go client library — https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Python client library — https://prometheus.github.io/client_python/

## Issues Found
No technical issues found.

## Review Notes
- Cardinality definition and the mermaid example (2 methods × 3 statuses = 6 series) are correct.
- snake_case naming guidance matches the official Prometheus naming conventions.
- PromQL queries are valid: `prometheus_tsdb_head_series`, `count by (job) ({__name__=~".+"})`, `topk(10, count by (__name__) ({__name__=~".+"}))`, and the nested `count(count by (...) (...))` pattern for counting label values are all correct idioms.
- Alerting rules are valid; `prometheus_tsdb_head_series` and `prometheus_tsdb_head_series_created_total` are real metrics exposed by the Prometheus TSDB head, and `rate(...[1h])` correctly measures series churn. Grouping `count by (__name__)` preserves `__name__` so the `{{ $labels.__name__ }}` annotation works.
- `metric_relabel_configs` actions (`labeldrop`, `labelkeep`, `drop`, `replace` via `source_labels`/`regex`/`replacement`/`target_label`) are all valid and used correctly; the `__name__;.+` separator pattern for the drop rule is the correct default `;` separator behavior.
- Go `client_golang` API (`WithLabelValues(...).Inc()` / `.Observe(...)`) and Python `prometheus_client` API (`.labels(...).inc()`) are used correctly.
- The `normalizeRoute` regex `/[0-9a-f-]+` correctly normalizes hex/numeric path segments (e.g. `/users/12345` → `/users/{id}`) while leaving non-hex words like `items` intact — consistent with the comment examples.
- Minor (non-blocking) caveat: the regex matches only hexadecimal-style IDs; alphanumeric slugs containing non-hex letters would not be normalized. This is acceptable for an illustrative example and not a technical error.
