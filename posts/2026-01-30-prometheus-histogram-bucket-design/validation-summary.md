# Validation Summary: How to Create Prometheus Histogram Bucket Design

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Prometheus (histograms, summaries, native histograms, PromQL)
- prometheus/client_golang (Go instrumentation library)
- PromQL functions: `histogram_quantile`, `histogram_avg`, `histogram_count`, `rate`, `sum`
- Prometheus alerting rules (YAML)
- Grafana heatmaps (referenced)
- Apdex scoring methodology

## Sources Consulted
- prometheus/client_golang Go reference: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- prometheus/client_golang histogram source: https://github.com/prometheus/client_golang/blob/main/prometheus/histogram.go
- Prometheus best practices for histograms and summaries: https://prometheus.io/docs/practices/histograms/
- Prometheus PromQL functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus configuration reference (scrape_protocols): https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus v2.40.0 release notes (native histograms introduction): https://github.com/prometheus/prometheus/releases/tag/v2.40.0
- Prometheus issue/PR history for `histogram_avg` (added in 2.53): https://github.com/prometheus/prometheus/issues/13281
- Robust Perception blog on Prometheus histograms: https://www.robustperception.io/how-does-a-prometheus-histogram-work/

## Issues Found

1. **Apdex query was mathematically incorrect.** The original PromQL subtracted `sum(rate(...{le="0.5"}))` inside the numerator, which collapsed the formula to `le_2 / (2 * total)` instead of the correct Apdex score. Because Prometheus buckets are cumulative, the correct simplification of `(satisfied + tolerating/2) / total` is `(le_T + le_4T) / (2 * count)`. Fixed by removing the erroneous subtraction and adding a comment that explains the cumulative-bucket simplification.

2. **Cardinality formula omitted the implicit `+Inf` bucket.** The post stated `Total time series = (buckets + 2) * label_combinations` and gave an example of "10 buckets + _sum + _count = 12 series". The client_golang library always emits an additional `le="+Inf"` series (visible in the post's own exposition-format example just above). The correct formula is `(buckets + 3) * label_combinations`, giving 13 series per combination for 10 explicit buckets and a recalculated example total of 5,200 (was 4,800).

3. **`NativeHistogramMinResetDuration` was described as a count of observations.** The original comment read "Reset buckets after this many observations". In client_golang this field is a `time.Duration` representing the minimum wall-clock time between full bucket resets (resets are triggered when the max bucket cap is exceeded). Fixed the comment to describe time-based semantics correctly.

4. **`scrape_protocols` list was missing `PrometheusText1.0.0`.** The four protocols listed were all valid, but the configuration is incomplete relative to the protocols Prometheus currently supports. Added `PrometheusText1.0.0` and a short comment noting that `PrometheusProto` must come first because it is the only wire format that carries native histograms during scrapes.

## Review Notes

- `histogram_avg` (used in the Native Histograms section) requires Prometheus 2.53 or later and only operates on native histograms. The post says "the same `histogram_quantile` function works" before showing `histogram_avg`, which is fine, but readers on older Prometheus releases will see "unknown function" errors. Not corrected since the post explicitly scopes this section to Prometheus 2.40+ native histograms; a future revision could add a version note.
- The default buckets, `LinearBuckets`/`ExponentialBuckets` signatures and computed values, the bucket arithmetic in the worked examples (LinearBuckets(0.1, 0.1, 20), LinearBuckets(1, 5, 20), ExponentialBuckets(100, 2, 12), ExponentialBuckets(1, 2, 14)), and all PromQL query syntax (rate/sum/histogram_quantile/by clauses) are all correct.
- All alert rule expressions are syntactically valid and semantically correct (HighP99Latency, HighSlowRequestRate, SLOBreach). `humanizeDuration` and `humanizePercentage` are valid Prometheus alert-template functions.
- Native histograms remain experimental in Prometheus as of the post's timeframe; the post correctly flags this.
- The post characterizes summaries as having a sliding time window via `MaxAge` / `AgeBuckets`, which is accurate for client_golang. Histograms do not have client-side time windows and rely on `rate()` over scraped data, also accurately described.
