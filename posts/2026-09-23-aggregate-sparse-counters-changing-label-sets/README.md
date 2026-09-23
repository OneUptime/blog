# How to Aggregate Sparse Counters Whose Label Sets Appear and Disappear Between Scrapes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Metric, Monitoring

Description: Aggregate changing counter populations without hiding resets, and distinguish absent observations from zero activity when series are short-lived.

A worker creates a labeled counter after its first event, exports it once, and removes it before the next scrape. Prometheus has one value but no observed change. An aggregate of `rate()` or `increase()` may therefore omit that worker even though work happened.

This is an information problem before it is a PromQL problem. A query can combine observed counter histories; it cannot reliably reconstruct events that occurred before a baseline was observed or while a short-lived series was entirely invisible.

## Establish what a sample actually proves

Consider a counter that first appears as:

```text
jobs_processed_total{queue="emails",worker="a"} 7
```

That sample proves the exported counter currently reads seven. It does not say when those events occurred. They could have happened seconds ago or over the process's entire lifetime.

If the next scrape reads nine, the query has evidence of an increase between observations. If the series disappears instead, an ordinary range function does not have a second sample from which to calculate its rate. Creation timestamps with explicitly supported zero ingestion or start-timestamp-aware queries can supply additional information in some configurations. Verify the enabled features and end-to-end metadata support before relying on that behavior. [Prometheus feature flags](https://prometheus.io/docs/prometheus/latest/feature_flags/)

Increasing a query window can include more existing observations. It cannot manufacture a missing baseline for a series that was only ever sampled once.

## Calculate each counter's change before aggregation

For a rolling operational count by queue:

```promql
sum by (queue) (
  increase(jobs_processed_total[1h])
)
```

For a requests-per-second style view:

```promql
sum by (queue) (
  rate(jobs_processed_total[5m])
)
```

Keep worker identity through the range calculation. When workers restart or their label sets change, each original stream must retain its own counter history. Taking a rate of a pre-summed population can confuse worker departure with a reset, or hide a reset behind another worker's growth.

These expressions use the samples in the requested range, including historical samples from series no longer present in an instant selector. Consequently, a departing worker may still contribute to a rolling window until its observations age out. That is usually appropriate for a count of recent activity. It is different from "traffic only from workers running right now." [Range selectors and staleness](https://prometheus.io/docs/prometheus/latest/querying/basics/)

## Inspect coverage beside the result

Find streams with fewer than two observations in the rate window:

```promql
count_over_time(jobs_processed_total[5m]) < 2
```

This catches a series with one visible sample. A completely unseen series cannot appear in the output, so compare with a worker inventory or scheduler signal if full worker coverage matters.

You can also count workers that had at least one observation in the window:

```promql
count by (queue) (
  group by (queue, worker) (
    present_over_time(jobs_processed_total[5m])
  )
)
```

That result measures observed presence, not active traffic or current liveness. Retain separate scrape-health and worker-lifecycle signals. `increase()` also extrapolates to window boundaries, so the resulting total can be fractional even for integer event counters. [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)

## Fix the lifecycle at the instrumentation boundary

For a bounded set of queues or outcomes, initialize counters before events occur and keep those series exported for the process lifetime. In Python:

```python
from prometheus_client import Counter

processed = Counter("jobs_processed_total", "Processed jobs", ["queue"])
for queue in ("emails", "invoices"):
    processed.labels(queue=queue)
```

Prometheus can then observe a zero baseline before later increments, provided a scrape occurs during that period. Initialization reduces the problem but does not guarantee that a very short-lived process is scraped in time. [Python labeled metric initialization](https://prometheus.github.io/client_python/instrumenting/labels/)

Avoid using a new job ID or task ID as a metric label for every unit of work. A stable worker or service counter with bounded event dimensions usually gives better rates and lower churn. Store individual event identifiers in an event or transactional system when exact reconciliation is required. Prometheus's [instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/) recommends minimizing labels and exporting zeros for known series.

If an exporter removes and recreates a child with the same labels, the next observed value may be lower and look like a reset. If the recreated value exceeds the old value, a reset between scrapes may be invisible. Preserving the counter's lifecycle avoids relying on that inference.

## Test the missing-data cases explicitly

Use synthetic fixtures for a continuously increasing worker, a worker observed once, a worker that disappears after several samples, and two workers where only one resets. Include a period with a failed scrape and compare it with a healthy scrape where the counter is intentionally absent.

Do not append `or vector(0)` merely to make an empty aggregate look complete. Zero can mean known inactivity only when the instrumentation and coverage policy support that interpretation. Document when the dashboard is an estimate over observed counter histories and when a separate source is required for exact job accounting.
