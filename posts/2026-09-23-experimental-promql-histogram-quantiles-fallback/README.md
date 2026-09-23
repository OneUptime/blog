# How to Enable Experimental PromQL `histogram_quantiles()` and Fall Back to Multiple `histogram_quantile()` Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Monitoring

Description: Compute multiple histogram percentiles with the experimental function and preserve equivalent labels in portable fallback queries.

---

Current Prometheus includes an experimental `histogram_quantiles()` function that calculates several percentiles from one histogram expression. It can make a p50, p95, and p99 panel easier to maintain, but deployed engines may not support it or may have the feature disabled.

Use the documented argument order, preserve the histogram distribution until the final calculation, and prepare a fallback that produces the same labels and units.

## Verify feature support

The [function documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantiles) defines this signature:

```text
histogram_quantiles(vector, quantile_label, phi_1, phi_2, ...)
```

The histogram expression comes first. This differs from `histogram_quantile(phi, vector)`. The plural function supports between one and ten quantile arguments and requires `--enable-feature=promql-experimental-functions` in the engine executing the query.

For a local server, include the flag when launching Prometheus:

```bash
prometheus \
  --config.file=prometheus.yml \
  --enable-feature=promql-experimental-functions
```

Merge this with existing feature flags rather than overwriting them. Follow the [feature-flag reference](https://prometheus.io/docs/prometheus/latest/feature_flags/#experimental-promql-functions) and confirm support in remote query frontends and rule evaluators too. Enabling a feature in one server does not change a different backend used by Grafana.

## Aggregate the distribution once

For classic histograms, retain `le` while aggregating buckets:

```promql
histogram_quantiles(
  sum by (service, le) (
    rate(http_request_duration_seconds_bucket[5m])
  ),
  "quantile",
  0.5, 0.95, 0.99
)
```

The output has a `service` label and a `quantile` label identifying each percentile. Use a quantile label name that does not conflict with an existing meaningful label in your input.

For native histograms, use the base metric and omit `le`:

```promql
histogram_quantiles(
  sum by (service) (
    rate(http_request_duration_seconds[5m])
  ),
  "quantile",
  0.5, 0.95, 0.99
)
```

Both expressions estimate the service-wide distribution over the same five-minute interval. They do not average per-instance percentile values. Keep counter reset handling inside the aggregation by calculating `rate()` for each original series first.

## Build a portable fallback

The most straightforward fallback is three dashboard queries using `histogram_quantile()`, with legends that explicitly identify p50, p95, and p99. If one expression is required, attach distinct quantile labels and union the results:

```promql
label_replace(
  histogram_quantile(0.5,
    sum by (service, le) (
      rate(http_request_duration_seconds_bucket[5m])
    )
  ),
  "quantile", "0.5", "service", ".*"
)
or
label_replace(
  histogram_quantile(0.95,
    sum by (service, le) (
      rate(http_request_duration_seconds_bucket[5m])
    )
  ),
  "quantile", "0.95", "service", ".*"
)
or
label_replace(
  histogram_quantile(0.99,
    sum by (service, le) (
      rate(http_request_duration_seconds_bucket[5m])
    )
  ),
  "quantile", "0.99", "service", ".*"
)
```

The replacement is a constant string, and `.*` matches the source label even if it is empty. Adding different `quantile` labels matters: without them, `or` would select the left-hand value for otherwise identical label sets and suppress the other percentiles.

For a native-histogram fallback, replace each classic bucket aggregation with the native aggregation shown earlier. Keep the output quantile strings consistent with the plural function so dashboards do not change series identity during fallback.

## Compare semantics before changing dashboards

Evaluate both implementations at the same fixed timestamp over the same metric population. Compare labels, values, and `warnings` or `infos` from the [query API](https://prometheus.io/docs/prometheus/latest/querying/api/#format-overview).

Test a distribution with observations near a bucket boundary, a quiet service, and an absent service. Empty histograms can produce `NaN`; missing series can disappear entirely. Those cases should remain visible in the panel's missing-data behavior rather than being rewritten as zero-second latency.

The plural function uses the same quantile calculation as the singular function. It does not improve bucket resolution or eliminate interpolation error. A coarse classic histogram still yields coarse estimates, and a high requested percentile may fall into its terminal bucket.

## Record reusable inputs when needed

If fallback queries repeatedly calculate the same expensive aggregation, consider a recording rule for the aggregated bucket rates or native histogram rates. Use a distinct metric name that clearly identifies the rate window, and retain `le` for classic buckets.

Then apply each percentile calculation to the recorded distribution. Do not call `rate()` again on a recording rule that already contains rates. Also account for the recording interval and any delayed data when comparing recorded results with an ad hoc raw query.

Benchmark actual query latency before claiming a speedup from the plural function. It simplifies the expression and can share work, but backend execution, caching, and data volume still determine performance. Keep the fallback checked alongside the primary query so an engine upgrade or feature-policy change does not leave the percentile panel without a tested path.
