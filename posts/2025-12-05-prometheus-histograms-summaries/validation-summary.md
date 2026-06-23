# Validation Summary: How to Use Histograms and Summaries in Prometheus

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Prometheus (histograms, summaries, native histograms)
- PromQL (`histogram_quantile`, `rate`, recording rules, alerting rules)
- Go client library (`github.com/prometheus/client_golang/prometheus`)
- Python client library (`prometheus_client`)
- Node.js client library (`prom-client`)

## Sources Consulted
- Prometheus Go client API reference (HistogramOpts, SummaryOpts, ExponentialBuckets, LinearBuckets, NativeHistogramBucketFactor): https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Prometheus documentation — Histograms and summaries: https://prometheus.io/docs/practices/histograms/
- Prometheus documentation — Metric types: https://prometheus.io/docs/concepts/metric_types/
- Prometheus native histograms (introduced experimentally in Prometheus 2.40): https://prometheus.io/docs/specs/native_histograms/
- prometheus_client Python docs: https://prometheus.github.io/client_python/
- prom-client (Node.js) docs: https://github.com/siimon/prom-client

## Issues Found
No technical issues found.

Verified specifically:
- `prometheus.ExponentialBuckets(0.001, 2, 15)` produces exactly the 15 listed values (0.001 … 16.384). Signature `(start, factor float64, count int)` is correct.
- `NativeHistogramBucketFactor` is a valid `HistogramOpts` field (client_golang v1.14+), and native histograms were introduced in Prometheus 2.40 — the "Prometheus 2.40+" note is accurate.
- `SummaryOpts` fields `Objectives`, `MaxAge`, `AgeBuckets` are correct; the example values (10m / 5 buckets) match the library defaults.
- Go `NewHistogramVec` / `NewSummaryVec` instrumentation, including the `responseWriter` status-code wrapper, is syntactically and semantically correct.
- Python `Histogram`/`Summary` constructor argument order (name, documentation, labelnames, buckets) and `.labels(...).time()` decorator/context-manager usage are correct.
- Node.js `prom-client` `Histogram` config, `startTimer()`/`end()` timer pattern, and `/metrics` exposition are correct.
- PromQL: `histogram_quantile` percentile queries, sum-of-rate averages, request-rate queries, the Apdex formula, recording rules, and alerting rules are all valid.
- The histogram-vs-summary comparison (server-side vs client-side percentile calculation, summaries cannot be aggregated across instances, accuracy/error trade-offs) is accurate.

## Review Notes
- The "Performance | Lower memory | Higher memory" table row is a defensible simplification: summaries maintain a sliding time window (MaxAge/AgeBuckets) for streaming quantile estimation, making them more client-resource-intensive than histograms, which simply increment bucket counters. It would be slightly clearer to specify that this refers to client-side cost (histograms can produce more server-side time series due to per-bucket series).
- The Node.js snippet references `app` without defining it, and the native-histogram Go snippet uses `:=` (valid only inside a function). Both are conventional illustrative fragments rather than complete programs, consistent with the rest of the post; no change needed.
- Using `http.StatusText(...)` as the `status` label value is valid but unusual; numeric status codes are more common. Not an error.
