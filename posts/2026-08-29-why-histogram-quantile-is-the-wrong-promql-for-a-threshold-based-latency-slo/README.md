# Why histogram_quantile Is the Wrong PromQL for a Threshold-Based Latency SLO

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, SLO, SLI, Latency, Service Level Objectives

Description: Count histogram observations at the latency threshold to calculate good-event ratio and error-budget burn instead of estimating a percentile value.

---

`histogram_quantile()` answers, “What latency value is at this rank?” A threshold-based latency SLO asks, “What fraction of requests were no slower than this fixed value?” Those are inverse questions.

For an SLO such as “95% of requests complete within 300 ms,” calculate good observations at 300 ms divided by all observations. This directly produces the good-event ratio and, by complement, the bad-event ratio used to calculate error-budget burn.

## Compare the Queries

This expression estimates the 95th-percentile duration for a classic histogram:

```promql
histogram_quantile(
  0.95,
  sum by (service, le) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)
```

Its output is a duration such as `0.287`. Prometheus interpolates when the quantile does not fall exactly on a bucket boundary. It does not return the proportion of good requests or the number that consumed the budget.

For a pure classic histogram with an exact `le="0.3"` bucket, use:

```promql
sum by (service) (
  rate(http_request_duration_seconds_bucket{le="0.3"}[5m])
)
/
sum by (service) (
  rate(http_request_duration_seconds_count[5m])
)
```

Classic histogram buckets are cumulative, so the `le="0.3"` series already counts every observation less than or equal to 300 ms. `_count` counts all observations. The bad-event ratio is `1 - good_ratio`.

Apply `rate()` before `sum()`. Prometheus requires that order so each counter's resets are detected before series are aggregated. Preserve every grouping label that defines a separate SLO population.

## Require the Exact Classic Bucket

The classic query needs a configured bucket whose label value exactly matches the threshold. If the histogram has `le="0.25"` and `le="0.5"` but no `le="0.3"`, the selector does not interpolate. It returns no series for that histogram; if only some instances expose the bucket, the aggregate can be silently incomplete.

Inspect the actual `le` label, standardize bucket layouts, and deploy the new layout before adopting the SLO. During a mixed-layout rollout, keep the old definition or explicitly restrict and verify the population. A summary that exports precomputed quantiles cannot reconstruct an arbitrary threshold count; add a histogram or a dedicated good/total counter.

For a long-window compliance total, the same classic relationship can use counter increases:

```promql
sum(increase(http_request_duration_seconds_bucket{le="0.3"}[28d]))
/
sum(increase(http_request_duration_seconds_count[28d]))
```

Use short-window recording rules for scalable alerting rather than repeatedly evaluating expensive long raw ranges.

## Use Native Histogram Syntax Deliberately

For a native histogram, there is no `le` series. Current Prometheus supports `histogram_fraction()`:

```promql
histogram_fraction(
  0,
  0.3,
  sum by (service) (
    rate(http_request_duration_seconds[5m])
  )
)
```

This estimates the fraction between zero and 300 ms; zero is appropriate when negative request durations cannot occur. Its accuracy depends on histogram resolution and how well the requested boundary aligns with native bucket boundaries. Native histograms with standard exponential buckets interpolate within buckets. Treat the result as an estimate and test error near the SLO boundary.

Classic histograms ingested as native histograms with custom boundaries can also be queried through native-histogram functions, but boundary layout and compatibility still matter. Do not mix classic and native syntax accidentally during a migration.

## Why Quantile Thresholding Is Operationally Weak

Comparing an estimated p95 with 300 ms can sometimes classify the same ideal distribution as a 95%-under-300-ms ratio, but it still hides the amount of error-budget spend. A p95 of 301 ms does not say whether 5.01% or 30% of requests missed 300 ms. Burn rate requires the bad-event fraction:

```text
burn rate = bad-event ratio / (1 - SLO target)
```

The threshold ratio also aggregates cleanly across instances and regions by summing counts. Never average instance percentiles or precomputed summary quantiles; Prometheus documents that this is statistically nonsensical.

## Keep Populations Consistent

Decide whether failed requests enter the latency denominator. A common design gives failures to an availability SLO and calculates latency among successful eligible outcomes. Another treats any failure as not meeting the latency promise. Either can work, but the numerator and denominator must describe the same route, tenant, and eligibility population. For latency among successful outcomes, filter both to successes. If every failure is bad, exclude failures from the good-event numerator but include them in the denominator.

Test no traffic, counter resets, mixed bucket layouts, native-histogram migration, and values exactly at 300 ms. Keep missing data distinct from success.

## References

- [Prometheus histograms and summaries: fractions and quantiles](https://prometheus.io/docs/practices/histograms/)
- [Prometheus query functions: `histogram_quantile()` and `histogram_fraction()`](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus native histogram specification](https://prometheus.io/docs/specs/native_histograms/)
- [Prometheus query functions: `rate()` ordering](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)

## Conclusion

For a fixed latency threshold, count observations in the threshold bucket and divide by all observations. Use `histogram_quantile()` to estimate percentile values for exploration, and use `histogram_fraction()` with understood interpolation when querying native histograms.
