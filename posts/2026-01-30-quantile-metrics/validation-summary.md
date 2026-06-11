# Validation Summary: How to Build Quantile Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (metrics format, PromQL)
- Prometheus Go client library (`github.com/prometheus/client_golang`)
- Summary metric type (client-side quantile estimation via CKMS)
- Histogram metric type (server-side / query-time quantile interpolation)
- Native histograms (Prometheus 2.40+)
- Go programming language

## Sources Consulted
- Prometheus client_golang `SummaryOpts` docs: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus#SummaryOpts
- Prometheus client_golang `HistogramOpts` docs: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus#HistogramOpts
- Prometheus client_golang `LinearBuckets` / `ExponentialBuckets`: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus#LinearBuckets
- client_golang source: https://github.com/prometheus/client_golang/blob/main/prometheus/histogram.go
- client_golang source: https://github.com/prometheus/client_golang/blob/main/prometheus/summary.go
- `prometheus/collectors` package (replaces deprecated `prometheus.NewGoCollector` / `NewProcessCollector` as of v1.12.0, Jan 2022): https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/collectors
- PromQL operators / precedence: https://prometheus.io/docs/prometheus/latest/querying/operators/
- `histogram_quantile` function: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Apdex specification: https://en.wikipedia.org/wiki/Apdex

## Issues Found

1. **Apdex PromQL formula — operator-precedence bug.** The original query was:
   ```
   (
       sum(rate(..._bucket{le="0.1"}[5m]))
       + sum(rate(..._bucket{le="0.5"}[5m]))
         - sum(rate(..._bucket{le="0.1"}[5m]))
       * 0.5
   )
   ```
   PromQL gives `*` higher precedence than `+`/`-`, so the `* 0.5` only bound to the trailing `bucket{le="0.1"}` term. The result evaluated to `0.5·A + B` instead of the intended Apdex `0.5·A + 0.5·B` (where A = satisfied, B = total-tolerating). Fixed by wrapping the `(tolerating − satisfied)` subtraction in explicit parentheses so the `* 0.5` applies to the whole tolerating-count expression, matching the standard Apdex `(satisfied + tolerating/2) / total` formula.

2. **`NativeHistogramMinResetDuration` comment was wrong.** The original comment claimed it was "Minimum value to track (prevents tiny bucket creation)". That field is actually a `time.Duration` that throttles automatic histogram resets when the bucket-count limit is exceeded; the value-threshold field is `NativeHistogramZeroThreshold`. Fixed the comment to describe the actual behavior.

3. **Unused `context` import.** The complete monitoring example imported `"context"` but never used it. In Go this is a compile error (`imported and not used: context`). Removed the import.

4. **Deprecated collector constructors.** The example called `prometheus.NewGoCollector()` and `prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{})`. Both have been deprecated since client_golang v1.12.0 (Jan 2022) in favor of equivalents in the `prometheus/collectors` sub-package. Updated the imports to include `github.com/prometheus/client_golang/prometheus/collectors` and switched the calls to `collectors.NewGoCollector()` and `collectors.NewProcessCollector(collectors.ProcessCollectorOpts{})`.

## Review Notes

- The `SummaryOpts.Objectives` error description ("p50 with 5% error (actual p45-p55)") is colloquial: the value in the map is an absolute error on the quantile rank φ, not a percentage of the measured value. The bracketed interpretation ("actual p45-p55") is correct, so the practical guidance is fine. Future authors could tighten the wording.
- The streaming-algorithm aside mentions "t-digest or CKMS" as examples. The Prometheus Go client specifically uses CKMS (via `beorn7/perks`); t-digest is used by other systems. Listing both as examples of streaming-quantile algorithms is acceptable context.
- `LinearBuckets(0.0, 0.1, 10)` and `ExponentialBuckets(0.001, 2, 14)` outputs verified against the source — both result comments are correct.
- All other PromQL queries (`histogram_quantile`, SLO compliance ratio, bucket-overflow percentage, per-quantile `label_replace`/`or` composition) are syntactically and semantically correct.
- The `math/rand` usage in the simulated handlers is fine for the example; Go 1.22+ users may prefer `math/rand/v2`, but this is a style preference, not an error.
