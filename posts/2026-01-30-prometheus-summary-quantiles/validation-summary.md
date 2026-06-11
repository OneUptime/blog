# Validation Summary: How to Build Prometheus Summary Quantiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (metric types, PromQL)
- Prometheus Go client (`github.com/prometheus/client_golang`)
- Python `prometheus_client`
- Node.js `prom-client`
- Mermaid diagrams
- YAML (Prometheus scrape config)

## Sources Consulted
- Prometheus official docs — Metric Types: https://prometheus.io/docs/concepts/metric_types/
- Prometheus best practices — Histograms and Summaries: https://prometheus.io/docs/practices/histograms/
- Prometheus Go client `client_golang` (`SummaryOpts`, `MaxAge`, `AgeBuckets`, default values): https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Python `prometheus_client` Summary documentation: https://prometheus.github.io/client_python/instrumenting/summary/
- Node.js `prom-client` (Summary configuration, default percentiles, `maxAgeSeconds`, `ageBuckets`): https://github.com/siimon/prom-client

## Issues Found
1. **Incorrect claim that the Python prometheus_client Summary exposes default quantiles (0.5, 0.9, 0.99).**
   - The official Python client docs explicitly state the Python Summary does not compute quantiles locally; it exposes only `_sum` and `_count`. The recommended path for p50/p95/p99 in Python is a Histogram.
   - Fixed the "Summary in Python" intro paragraph and the inline comment to accurately describe that no quantiles are emitted and to point users to Histogram for quantile use cases.

2. **Misleading "Python with Custom Quantiles" section.**
   - The original section claimed you could extend the Summary class to get custom quantile objectives. Wrapping `Summary` does not add quantile support — the wrapper still only emits `_sum` and `_count`.
   - Renamed the subsection to "Python Summary Wrapper", rewrote the intro to clarify the wrapper provides ergonomic helpers only (not quantiles), updated the class docstring, and removed the unused `MetricWrapperBase` import.

## Review Notes
- Go client examples are correct: `SummaryOpts.Objectives`, `MaxAge` (default 10 min), `AgeBuckets` (default 5), `NewSummary`, `NewSummaryVec` all match `client_golang` current API.
- Node.js `prom-client` configuration (`percentiles`, `maxAgeSeconds`, `ageBuckets`) is current and accurate. Minor stylistic note (not changed): `res.statusCode` is passed as a number to `.labels()`; prom-client coerces it, so this works but stringifying is conventional.
- The error margin examples (e.g. `0.99: 0.001` meaning actual quantile in `[0.989, 0.991]`) correctly describe rank-based error semantics of the Cormode–Korn algorithm used by `client_golang`.
- The exposition of the aggregation pitfall (you cannot average per-instance quantiles) is correct and is one of the standard reasons to prefer histograms in multi-instance deployments.
- The "Average: 150ms (valid)" label in the Mermaid diagram refers to the cross-instance average latency (sum/count), not the p99 — labeling is consistent with the surrounding narrative.
- Default summary observation window in Go (`client_golang`) is 10 minutes with 5 age buckets, matching what the post claims under "Pitfall 3: Not Setting MaxAge".
