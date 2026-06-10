# Validation Summary: How to Build Summary Metrics Design

## Status
validated

## Post Type
Guide / Tutorial — design guide for choosing and configuring Prometheus summary metrics with implementation snippets.

## Technologies Covered
- Prometheus (metric types: Summary, Histogram)
- PromQL (`rate`, `increase`, `histogram_quantile`)
- Prometheus client libraries (originally Python `prometheus_client`, corrected to Go `client_golang`)
- Prometheus alerting rules (YAML format)
- Prometheus text exposition format

## Sources Consulted
- Prometheus docs on metric types: https://prometheus.io/docs/concepts/metric_types/
- Prometheus best practices on histograms vs summaries: https://prometheus.io/docs/practices/histograms/
- Python prometheus_client source (Summary class — only exposes `_sum` and `_count`, no quantile config): https://github.com/prometheus/client_python/blob/master/prometheus_client/metrics.py
- Go client_golang SummaryOpts (Objectives, MaxAge, AgeBuckets): https://github.com/prometheus/client_golang/blob/main/prometheus/summary.go
- Prometheus exposition format: https://prometheus.io/docs/instrumenting/exposition_formats/
- Prometheus alerting rules docs: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found

1. **Python `prometheus_client.Summary` API does not support the features described.**
   - The post originally presented three Python code blocks using `quantiles=[(q, err), ...]`, `max_age_seconds=`, and `age_buckets=` parameters on `prometheus_client.Summary`. None of these parameters exist in the Python client. The Python `Summary` class only accepts the standard `name`, `documentation`, `labelnames`, etc., and only exposes `_sum` and `_count` — it does not compute quantiles client-side at all. The code as written would raise `TypeError` on construction.
   - The features described (configurable quantile objectives with error tolerances, time-decaying sliding window with age buckets) are specific to the **Go** `client_golang` library (`SummaryOpts.Objectives`, `SummaryOpts.MaxAge`, `SummaryOpts.AgeBuckets`).
   - One of the original code blocks already labeled itself as a "Go implementation" in a comment despite being Python syntax — a clear contradiction.
   - **Fix:** Converted all three code blocks from Python to Go using the actual `client_golang` `prometheus.SummaryOpts` / `prometheus.HistogramOpts` API, with `promauto.NewSummaryVec` / `promauto.NewHistogramVec`. Updated the intro sentence to say "Go implementation" and added one short clarifying sentence that the Python client does not compute quantiles, which is why the example switches to Go.

2. **Internal inconsistency in the window-configuration example.**
   - The original second code block had a comment "5-minute window with 10 age buckets" while the code set `age_buckets=5`. Resolved during the Go rewrite by harmonizing the comments to "5 age buckets".

## Review Notes
- The hybrid example (Summary + Histogram) is now consistently Go; the original Python form would have technically constructed but the Summary side wouldn't have produced quantiles, undermining the entire premise of the section.
- The Prometheus text-exposition snippet, the PromQL `rate`/`increase`/division queries, and the alerting-rules YAML are all syntactically correct and use current Prometheus features.
- The mermaid sliding-window diagram uses illustrative linear weights (1.0, 0.8, 0.6, 0.4, 0.2). The actual `client_golang` implementation rotates age buckets rather than applying continuous linear decay, but the diagram is acceptable as a conceptual sketch and the surrounding prose stays at that level.
- The memory-per-quantile table (~1 KB / ~5 KB / ~50 KB at 5% / 1% / 0.1% error) is an order-of-magnitude estimate of the CKMS streaming-quantile algorithm used in `client_golang`; reasonable for a design guide.
- The aggregation-problem section correctly states that p99 of p99s is not the true p99 and that histograms should be used for cross-instance aggregation via `histogram_quantile()`.
