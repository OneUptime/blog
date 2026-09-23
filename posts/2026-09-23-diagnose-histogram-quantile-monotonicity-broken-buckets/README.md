# How to Diagnose `histogram_quantile()` Monotonicity Warnings and Find Broken Classic Buckets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Monitoring

Description: Trace histogram quantile monotonicity annotations back to inconsistent classic buckets and verify the repair before trusting percentiles.

---

A percentile can remain visible even when its input histogram is broken. Prometheus repairs decreasing classic bucket counts before estimating the percentile, so a plausible p95 is not proof that the source data is valid. Diagnose the annotation at the bucket level, before adjusting the visualization.

The warning mentioned in the title is specifically an **info-level annotation** in current Prometheus: `input to histogram_quantile needed to be fixed for monotonicity`. The [function reference](https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile) documents both that correction and the tolerance used for tiny floating-point differences.

## Capture the query response

Use the same evaluation timestamp and expression as the failing dashboard. The HTTP API carries `warnings` and `infos` separately from the result data:

```bash
curl -fsSG http://localhost:9090/api/v1/query \
  --data-urlencode 'query=histogram_quantile(0.95, sum by (service, le) (rate(http_request_duration_seconds_bucket[5m])))' \
  --data-urlencode 'time=2026-09-23T10:00:00Z' \
  | jq '{status, warnings, infos, data}'
```

Do not discard those fields in scripts. A successful HTTP request can contain partial results or annotations about repaired input. The [API response format](https://prometheus.io/docs/prometheus/latest/querying/api/#format-overview) explains these supplementary fields.

Now remove `histogram_quantile()` and inspect its input. For each service, order `le` numerically, treating `+Inf` as the final bucket. Counts or rates should never decrease as the upper bound increases.

## Separate bucket order from counter behavior

A classic histogram contains cumulative buckets across the value axis. For example, all requests below 0.1 seconds also belong to the 0.5-second bucket:

```text
le="0.1"   120
le="0.5"   110
le="1"     180
le="+Inf"  200
```

The second row is invalid because a wider bucket contains fewer observations. This is different from a counter resetting across time. `rate()` handles ordinary counter resets, but it cannot restore a missing population of observations in a wider bucket.

Check raw exposition from one exporter, then the stored raw bucket series, then their per-series rates, and finally the aggregated rates. The first layer at which the relationship breaks narrows the repair substantially.

## Compare neighboring buckets explicitly

For a known bucket layout, this query finds individual targets whose 0.1-second rate exceeds their 0.5-second rate:

```promql
rate(http_request_duration_seconds_bucket{le="0.1"}[5m])
  > ignoring(le)
rate(http_request_duration_seconds_bucket{le="0.5"}[5m])
```

All labels other than `le` must identify the same histogram on each side. If the exporter uses different remaining labels across buckets, fix that mismatch rather than weakening vector matching until the comparison happens to run.

Also compare the terminal bucket with the count metric:

```promql
rate(http_request_duration_seconds_bucket{le="+Inf"}[5m])
  != ignoring(le)
rate(http_request_duration_seconds_count[5m])
```

Small numeric discrepancies warrant tolerance-aware inspection rather than an immediate page. Prometheus ignores differences within `1e-12` of the sum of adjacent bucket values during monotonicity repair. Large, repeatable differences are a stronger signal of a data problem.

## Find mismatched contributor sets

A common failure occurs during a bucket-layout rollout. Suppose old instances expose `0.1, 0.5, +Inf`, while new ones expose `0.1, 1, +Inf`. Aggregating by `le` combines all instances at `0.1` but only old instances at `0.5`. The resulting rows no longer describe one consistent population.

Compare the contributors rather than only their values:

```promql
count by (service, le) (
  http_request_duration_seconds_bucket
)
```

Equal counts are useful evidence, but not a complete proof: two different target sets can have the same size. Inspect the `instance` identities for each boundary and check scrape health. Compare a single target and then a single instrumentation version to locate the transition.

Metric relabeling can also remove a boundary or apply inconsistent labels. Federation filters and recording rules can preserve only part of a histogram family. Every retained boundary must represent the same contributing observations.

## Repair and verify the distribution

Use one agreed bucket layout for classic histograms that will be combined. During migration, keep populations separate under a bounded version label or separate metric name until all required producers expose compatible boundaries. If reaggregating historical data, only use boundaries present for the full intended population; adding absent buckets as zero invents a distribution.

Fix custom exporters that read bucket counters inconsistently or construct noncumulative output. Standard client-library histogram APIs are usually safer than independently maintained bucket gauges. Retain `le` through every classic-histogram recording rule.

After the repair, check a window entirely after deployment. Confirm terminal buckets match counts, contributor identities agree, and the API annotation disappears. Revisit historical panels separately: correcting today's exporter does not rewrite already stored buckets, and an old time range can legitimately keep reporting the earlier fault.
