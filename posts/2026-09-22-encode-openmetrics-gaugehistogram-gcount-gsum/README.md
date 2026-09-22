# How to Encode GaugeHistograms with `_bucket`, `_gcount`, and `_gsum` Correctly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, Observability, DevOps

Description: Encode current distributions as OpenMetrics GaugeHistograms with cumulative buckets and consistent _gcount and _gsum samples.

---

Use a GaugeHistogram for the distribution of objects that exist now: waiting jobs, in-flight requests, or current object sizes. Its bucket counts can decrease when objects leave. A normal event histogram instead accumulates observations, so applying that model to a live queue turns ordinary departures into apparent counter resets.

The serialization looks familiar, but the sum and count suffixes differ. OpenMetrics 1.0 uses `_bucket`, `_gcount`, and `_gsum` for GaugeHistograms.

## Build one distribution snapshot

Suppose the current queue contains three jobs that have waited 0.2, 0.7, and 1.4 seconds. With boundaries of 0.5 and 1.0 seconds, a complete response is:

```text
# TYPE queue_wait_seconds gaugehistogram
# UNIT queue_wait_seconds seconds
# HELP queue_wait_seconds Waiting times of jobs currently queued.
queue_wait_seconds_bucket{queue="default",le="0.5"} 1
queue_wait_seconds_bucket{queue="default",le="1.0"} 2
queue_wait_seconds_bucket{queue="default",le="+Inf"} 3
queue_wait_seconds_gcount{queue="default"} 3
queue_wait_seconds_gsum{queue="default"} 2.3
# EOF
```

The buckets are cumulative: the `1.0` bucket includes the observation already counted in `0.5`. `_gcount` matches the `+Inf` bucket, and `_gsum` is the sum of current waiting times. The [OpenMetrics GaugeHistogram encoding rules](https://prometheus.io/docs/specs/om/open_metrics_spec/#gaugehistogram-1) require `_gcount` if and only if `_gsum` is present. Always include both when the source can provide a meaningful sum.

Do not emit `_count` or `_sum` under this family and assume a receiver will infer their gauge semantics. Do not add `_created`: GaugeHistogram is a snapshot, not a cumulative sequence with a creation/reset timestamp.

## Calculate buckets from the same objects

A minimal calculation makes the invariants explicit:

```python
import math

waits = [0.2, 0.7, 1.4]
boundaries = [0.5, 1.0, math.inf]
assert all(math.isfinite(value) and value >= 0 for value in waits)
counts = [sum(value <= boundary for value in waits)
          for boundary in boundaries]
count = len(waits)
total = math.fsum(waits)
assert counts == sorted(counts)
assert counts[-1] == count
assert math.isclose(total, 2.3)
```

Take the object list and a single reference clock reading under the appropriate snapshot mechanism. Computing each object's age against a different clock reading introduces avoidable inconsistencies near boundaries. Reading the queue repeatedly while serializing can be worse: one bucket might see an object that has already left before the count is collected.

Keep labels such as `queue` identical across all components. The `le` dimension belongs only to bucket samples and must not be an ordinary label on the underlying metric. Sort boundaries numerically, with `+Inf` last, rather than lexicographically as strings.

## Handle empty and decreasing populations

An empty queue should normally report zero for every bucket, zero `_gcount`, and zero `_gsum`. That means the exporter successfully observed no waiting jobs. Dropping the entire family instead can mean the queue disappeared or collection failed, which is a different state.

On the next snapshot, a long-waiting job may leave and all values may fall. This is expected. Bucket counts remain nonnegative integers and cumulative within each snapshot even though they decrease across scrapes.

A failed upstream read should not be encoded as an empty population. Expose collection health separately and choose an explicit policy for unavailable data. Otherwise an outage can make the queue appear healthy precisely when monitoring has lost visibility.

## Query current distributions directly

For a receiver that stores the classic bucket components, calculate the current p95 without `rate()`:

```promql
histogram_quantile(
  0.95,
  sum by (queue, le) (queue_wait_seconds_bucket)
)
```

The current mean is:

```promql
sum by (queue) (queue_wait_seconds_gsum)
/
sum by (queue) (queue_wait_seconds_gcount)
```

An empty population gives a zero denominator; leave the result undefined or gate presentation on a positive count. Replacing it with zero would imply an observed zero waiting time.

The [histogram query documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile) describes quantile estimation from classic buckets. GaugeHistogram support and metadata handling vary across collectors, so test the complete path rather than assuming every Prometheus-compatible service preserves the type.

## Validate a changing fixture

Exercise a populated queue, one departure, an empty queue, and an upstream failure. Check both parsed samples and query results. A `_gcount` mismatch with `+Inf`, a decreasing bucket sequence within one snapshot, or a negative bucket value signals a serialization or snapshot bug.

For Micrometer users, the [migration guide](https://github.com/micrometer-metrics/micrometer/wiki/1.13-Migration-Guide#longtasktimer) also documents GaugeHistogram-related LongTaskTimer output changes. Verify dashboards against actual `_gcount` and `_gsum` names after a client upgrade. Correct type semantics must survive both serialization and the queries built on top of it.
