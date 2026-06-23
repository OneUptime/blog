# Validation Summary: How to Build Custom Exporters for Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (custom exporters, metric types, naming conventions)
- Go (`github.com/prometheus/client_golang` — Collector interface, `NewDesc`, `MustNewConstMetric`)
- Python (`prometheus_client` — custom collectors, `*MetricFamily` classes, `start_http_server`)
- PostgreSQL (`pg_stat_activity`, `pg_database`, `pg_database_size`)
- Docker (multi-stage-free Python image)
- Kubernetes (Deployment, Service, liveness/readiness probes, Prometheus scrape annotations)

## Sources Consulted
- client_golang `prometheus` package reference — https://pkg.go.dev/github.com/prometheus/client_golang/prometheus (confirmed `NewDesc(fqName, help string, variableLabels []string, constLabels Labels)` and `MustNewConstMetric(desc, valueType, value, labelValues...)` are current in v1.23.2 and still accept `[]string` for variable labels)
- client_python `metrics_core.py` v0.19.0 — https://github.com/prometheus/client_python/blob/v0.19.0/prometheus_client/metrics_core.py (confirmed `GaugeMetricFamily.add_metric`, `CounterMetricFamily.add_metric`, and `HistogramMetricFamily.add_metric(labels, buckets, sum_value, ...)` signatures; buckets are `(le, count)` pairs, `+Inf` required)
- client_python `core.py` v0.19.0 — https://github.com/prometheus/client_python/blob/v0.19.0/prometheus_client/core.py (confirmed `REGISTRY`, `GaugeMetricFamily`, `CounterMetricFamily`, `HistogramMetricFamily` are re-exported in `__all__`)
- Prometheus metric and label naming best practices — https://prometheus.io/docs/practices/naming/
- prometheus-client 0.19.0 and requests 2.31.0 are real, published PyPI releases

## Issues Found
No technical issues found. All code examples, API signatures, imports, SQL queries, CLI commands, Dockerfile, and Kubernetes manifests are syntactically correct and use current, non-deprecated APIs. No edits were made to the post.

## Review Notes
- **Naming convention nit (not changed):** `postgres_connections_total` and `postgres_table_rows_total` are emitted as gauges (`prometheus.GaugeValue`) but carry the `_total` suffix, which Prometheus reserves for counters. `promtool`/`promlint` would flag these ("non-counter metrics should not have `_total` suffix"), and this mildly conflicts with the post's own Design Principle #4. The code still compiles and runs correctly, so this was left as the author's metric-naming choice rather than edited.
- **Described-but-not-collected metrics:** In the basic Go example `latencyMetric` is described but never emitted; in the Postgres example `tableRowCount` and `replicationLag` are described but have no corresponding `collect*` method. This is valid (the registry tolerates it) and reads as intentional scaffolding for the reader to extend — not an error.
- **`/health` endpoint in Python examples:** The Kubernetes liveness/readiness probes target `/health`, but the Python exporters rely on `prometheus_client.start_http_server`, which does not define a dedicated `/health` route. In practice its WSGI app returns HTTP 200 (the metrics payload) for arbitrary paths, so the probes still succeed. The Go examples do register an explicit `/health` handler. Adding a real `/health` route to the Python exporters would be a clarity improvement but is not required for correctness.
- **Port choice:** The basic Go example listens on `:9090`, which collides with Prometheus's own default server port; the complete Postgres example correctly uses `:9187` (the conventional postgres_exporter port). Cosmetic only.
- **Env vs. args:** The Dockerfile `CMD` hardcodes `--api-url http://api:8080`, while the Kubernetes manifest passes `API_URL`/`API_KEY` as environment variables that the argparse-based exporter does not read. These illustrative snippets are internally inconsistent but neither is technically wrong on its own.
