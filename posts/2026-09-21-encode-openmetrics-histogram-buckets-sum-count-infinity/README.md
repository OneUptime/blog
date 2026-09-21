# How to Encode OpenMetrics Histograms with Buckets, sum, count, and the +Inf Boundary

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, Observability, Python

Description: Build correct classic OpenMetrics histograms with cumulative buckets, matching count and +Inf values, coherent snapshots, and useful validation checks.

---

A classic OpenMetrics histogram turns a distribution into a family of related samples. The most common encoding error is to emit per-bucket counts as though they were cumulative counts. A parser may accept the numbers while the resulting quantiles become meaningless.

The [OpenMetrics 1.0 histogram rules](https://prometheus.io/docs/specs/om/open_metrics_spec/#histogram) require cumulative buckets, unique boundaries, and a `+Inf` bucket containing every observation. This article uses nonnegative duration measurements, with a sum and count for each label set.

## Work from a small known distribution

Suppose four jobs took 0.05, 0.2, 0.8, and 1.2 seconds. With boundaries 0.1, 0.5, and 1.0, the cumulative counts are 1, 2, and 3. The infinity bucket and total count are both 4, and the sum is 2.25 seconds.

```text
# TYPE worker_job_duration_seconds histogram
# UNIT worker_job_duration_seconds seconds
# HELP worker_job_duration_seconds Duration of completed jobs.
worker_job_duration_seconds_bucket{queue="default",le="0.1"} 1
worker_job_duration_seconds_bucket{queue="default",le="0.5"} 2
worker_job_duration_seconds_bucket{queue="default",le="1.0"} 3
worker_job_duration_seconds_bucket{queue="default",le="+Inf"} 4
worker_job_duration_seconds_sum{queue="default"} 2.25
worker_job_duration_seconds_count{queue="default"} 4
# EOF
```

A bucket includes observations **less than or equal to** its boundary. A duration exactly equal to 0.5 therefore increments the 0.5 bucket and every larger bucket.

The family name is `worker_job_duration_seconds`; `_bucket`, `_sum`, and `_count` are sample suffixes. The unit belongs to the family name and metadata. The `le` label is reserved for bucket boundaries and must not also be one of the histogram's ordinary application labels.

## Convert noncumulative source buckets carefully

Some upstream APIs return counts for disjoint intervals. Convert those counts into a running total before exporting them. For this example, disjoint bucket counts are `[1, 1, 1, 1]`, including the final overflow interval.

```python
from itertools import accumulate

bounds = ["0.1", "0.5", "1.0", "+Inf"]
interval_counts = [1, 1, 1, 1]

if len(bounds) != len(interval_counts):
    raise ValueError("one count is needed for every interval")
if any(type(n) is not int or n < 0 for n in interval_counts):
    raise ValueError("bucket counts must be nonnegative integers")

cumulative = list(accumulate(interval_counts))
assert cumulative == [1, 2, 3, 4]
count = cumulative[-1]
```

Do not infer an exact observation sum from bucket midpoints. Once raw measurements have been reduced to bucket counts, their exact values are generally lost. Use the source's actual sum when available; otherwise design the exporter around the information the source really provides.

Verify whether upstream buckets are already cumulative before applying this conversion. Accumulating an already cumulative sequence silently inflates the count.

## Capture one coherent histogram point

Buckets, sum, and count must describe the same population at the same instant. Reading mutable bucket counters separately while observations arrive can produce an impossible snapshot, such as a finite bucket larger than the infinity bucket.

A client library normally owns this consistency problem. In a custom exporter, collect or lock a snapshot once, copy the relevant state, then serialize outside the lock. Use the same ordinary labels on the bucket, sum, and count samples. Only bucket samples get `le`.

Repeat the whole group for another label set, keeping each labeled histogram together. Avoid sorting every sample globally by suffix if that interleaves multiple labeled metrics in the OpenMetrics family.

## Keep counter semantics intact

For nonnegative durations, buckets, count, and sum are cumulative counters. A process restart can reset them. Queries should use their rates over a window before aggregation.

OpenMetrics 1.0 has specific restrictions for negative observations: a histogram containing negative-threshold buckets must not include the ordinary sum value, because that sum could violate counter semantics. Do not reuse a duration-oriented encoding unchanged for a signed measurement such as temperature deltas.

The [Prometheus histogram documentation](https://prometheus.io/docs/practices/histograms/) explains how cumulative buckets support aggregation and quantile estimation. For a service-wide 95th percentile, preserve the boundary label when aggregating:

```promql
histogram_quantile(
  0.95,
  sum by (le) (rate(worker_job_duration_seconds_bucket[5m]))
)
```

## Validate numerical relationships

In addition to parsing the exposition, assert that boundaries are unique and increasing, bucket counts never decrease across boundaries, the `+Inf` count matches `_count`, and every compound point uses a consistent label set. Include an observation exactly on a boundary and one above the highest finite boundary.

Test zero observations too: every bucket, sum, and count should be zero for an initialized empty duration histogram. Check reset behavior and two different queue labels. Finally, compare a known fixture's calculated mean and percentile behavior with the expected distribution. A valid wire format is necessary; internally consistent statistics are what make the metric useful.
