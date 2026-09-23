# How to Compute a Weighted Average in PromQL from Separate Sum and Count Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Metric, Monitoring

Description: Calculate service-wide means by aggregating observation sums and counts separately, preserving matching dimensions and meaningful no-traffic behavior.

An average of instance averages gives each instance one vote. A service-wide average should give each observation one vote. When instances handle different amounts of traffic, those answers can be dramatically different.

Suppose instance A handles 100 requests with a total duration of ten seconds. Instance B handles one request lasting one second. Their means are `0.1` and `1` seconds. Averaging those means gives `0.55` seconds, while the actual combined mean is `11 / 101`, approximately `0.1089` seconds.

## Aggregate the components before dividing

A classic histogram or summary exposes cumulative observation sum and count series. For nonnegative request durations, compute their rates separately and then combine them:

```promql
sum by (cluster, service) (
  rate(http_request_duration_seconds_sum[5m])
)
/
sum by (cluster, service) (
  rate(http_request_duration_seconds_count[5m])
)
```

The numerator measures observed duration seconds per wall-clock second. The denominator measures observations per wall-clock second. Their ratio is seconds per observation, which Grafana can display as a duration. Prometheus's [histogram and summary guidance](https://prometheus.io/docs/practices/histograms/#count-and-sum-of-observations) documents the sum/count relationship.

Each process's counter transformation happens before spatial aggregation. Otherwise an instance restart can be obscured by growth elsewhere. Use the same range, filters, and grouping dimensions on both sides.

## Make matching populations explicit

These numerator and denominator selectors must describe the same observations. If the numerator excludes health checks while the denominator includes them, the result is no longer the mean of either population.

For a particular route family, filter both components identically:

```promql
sum by (cluster, service, route) (
  rate(http_request_duration_seconds_sum{route!="/health"}[5m])
)
/
sum by (cluster, service, route) (
  rate(http_request_duration_seconds_count{route!="/health"}[5m])
)
```

PromQL's default vector matching pairs results with matching labels. Different aggregation dimensions can therefore remove expected results instead of reporting an obvious error. Inspect both intermediate vectors when debugging an empty ratio. [Vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/#vector-matching)

Do not repair mismatched populations by adding a broad `group_left` without understanding the cardinality. An average generally needs one numerator and one denominator for each output group.

## Define the no-traffic result

With no observations, the sum rate and count rate may both be zero. `0 / 0` produces `NaN`; there is no observed mean for that window. Showing zero milliseconds would imply a latency measurement that never occurred.

To omit groups whose denominator is zero, filter the denominator:

```promql
sum by (cluster, service) (
  rate(http_request_duration_seconds_sum[5m])
)
/
(
  sum by (cluster, service) (
    rate(http_request_duration_seconds_count[5m])
  ) > 0
)
```

The comparison intentionally omits `bool`, so it retains positive counts with their original values. Using `> bool 0` would replace those denominators with ones and change the calculation.

Keep scrape-health and missing-instrumentation alerts separate. A missing component is not equivalent to a zero component. Likewise, a very small observation count can make the average statistically unrepresentative even when the arithmetic is valid; display traffic volume beside latency when decisions depend on it.

## Store sums and counts for future rollups

When many panels use this result, record both components:

```yaml
groups:
  - name: service_latency
    rules:
      - record: cluster_service:http_request_duration_seconds_sum:rate5m
        expr: |
          sum by (cluster, service) (
            rate(http_request_duration_seconds_sum[5m])
          )
      - record: cluster_service:http_request_duration_seconds_count:rate5m
        expr: |
          sum by (cluster, service) (
            rate(http_request_duration_seconds_count[5m])
          )
```

A global service mean can later sum those components over clusters and divide. If only the per-cluster means were stored, the observation weights would be lost. This is why Prometheus's [recording-rule practices](https://prometheus.io/docs/practices/rules/) recommend aggregating ratio components independently.

The recorded values are rates, so do not apply another `rate()` to them. Also distinguish the mean represented by each five-minute point from a mean over a whole day. For the latter, calculate matched sum and count increases over the intended full interval while the original cumulative series remain available, or use a deliberate rollup that preserves interval contributions.

## Check the measurement type and units

For ordinary request durations, observations are nonnegative, so `_sum` behaves as a counter. A sum of signed observations, such as temperatures, can decrease without a reset. Applying counter `rate()` semantics to that sum is inappropriate. Review the instrument's contract instead of assuming every `_sum` suffix is interchangeable.

Native histograms can express the analogous mean using `histogram_avg()` on aggregated histogram rates; that is a different input representation from separate float sum/count series. [Native histogram mean](https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_avg)

Verify the unequal-traffic example, a zero-traffic interval, one instance reset, and a missing denominator in a fixture. Those cases expose the common errors much faster than checking a dashboard during a period when every instance happens to receive similar traffic.
