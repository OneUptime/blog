# How to Return Zero for Missing Prometheus Series Without Masking a Failed Scrape

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Monitoring, Observability

Description: Fill intentionally absent counter results using a healthy-target label set while keeping failed scrapes and missing instrumentation visible.

An error counter may not exist until the first error occurs. A dashboard then shows no data where a reader expects zero. But the same empty panel can also mean that scraping failed, a target disappeared, or instrumentation stopped exporting the metric.

A useful zero-fill policy must distinguish these situations. Do not start by making every empty query produce a scalar zero. Start by defining when absence actually means that no event occurred.

## Prefer initializing bounded series

When possible, expose a zero-valued counter before its first event. For a small known label set, initialize each child in the application:

```python
from prometheus_client import Counter

errors = Counter("worker_errors_total", "Worker errors", ["kind"])
for kind in ("timeout", "dependency", "internal"):
    errors.labels(kind=kind)
```

The Python client documents this initialization pattern for labeled metrics. Avoid enumerating unbounded identifiers merely to obtain zeros. [Python client labels](https://prometheus.github.io/client_python/instrumenting/labels/)

An initialized series makes zero activity observable, but a rate still needs enough samples. A newly started process is not immediately capable of supplying a five-minute history.

## Use target health as the fallback's label source

Assume `http_errors_total` is intentionally absent until the first error and the query backend exposes `cluster`, `job`, and `instance` consistently on both application metrics and `up`. Calculate a target-level rate:

```promql
sum by (cluster, job, instance) (
  rate(http_errors_total{job="api"}[5m])
)
```

For healthy targets only, construct zeros with the same identity labels:

```promql
0 * max by (cluster, job, instance) (up{job="api"} == 1)
```

The comparison deliberately omits `bool`: unhealthy targets are filtered out. The grouping removes additional labels from `up` so fallback results have the intended output schema. The identity tuple must uniquely identify a target after any HA deduplication. `up` reports whether the most recent scrape succeeded for that target. It does not establish application correctness or prove that every expected metric was exported. [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/#automatically-generated-labels-and-time-series)

## Gate the complete result, including existing rates

Combine the pieces:

```promql
(
  sum by (cluster, job, instance) (
    rate(http_errors_total{job="api"}[5m])
  )
  or on (cluster, job, instance)
  (0 * max by (cluster, job, instance) (up{job="api"} == 1))
)
and on (cluster, job, instance)
max by (cluster, job, instance) (up{job="api"} == 1)
```

The `or` operation keeps available left-hand results and adds fallback zeros only for unmatched targets. The final `and` removes targets whose latest scrape failed, including targets that still have enough older counter samples to produce a rate inside the five-minute window. [PromQL set operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)

That final gate matters. Restricting only the fallback to healthy targets does not remove a stale-looking rate that remains calculable from earlier samples.

This example answers a specific question: the recent error rate for targets that are currently scrapeable, with absence interpreted as zero under the instrumentation contract. It does not claim the target was scrapeable throughout the entire window.

## Keep failures visible in a separate signal

Use a scrape-health alert independently:

```promql
up{job="api"} == 0
```

If the entire expected job disappears from discovery, this can detect the absence:

```promql
absent(up{job="api"})
```

Detecting one missing target among many requires an expected-target inventory or another authoritative presence signal; `up == 0` cannot match a series that no longer exists. The [absence functions](https://prometheus.io/docs/prometheus/latest/querying/functions/#absent) distinguish no series from a numeric zero.

Similarly, a successful scrape containing the wrong metrics still gives `up=1`. For an application where the error metric is mandatory, alert on its absence instead of filling it. For intentionally sparse instrumentation, consider a separate always-present application metrics readiness signal and require it before permitting zeros.

Startup is another policy decision. Under default Prometheus behavior, an existing counter with only one sample in the range yields no rate, so the generic fallback would show zero. With experimental start-timestamp usage enabled and a suitable start timestamp inside the window, a rate can be calculated from one sample. If that would mislead an alert or SLO, require a warm-up condition or initialize and verify sufficient samples before treating the rate as known. A counter's first nonzero sample is not evidence that no errors happened beforehand.

## Match the output dimensions intentionally

`up` cannot invent missing `route`, `status`, or `kind` combinations. The example aggregates those dimensions away before matching on target identity. For a per-route result, use an authoritative bounded route inventory or initialize the corresponding application series.

By contrast, `or vector(0)` adds a label-less result when no matching label-less result exists; it does not synthesize one zero per service or target. It may be suitable for a deliberately global, label-less instant vector with a separately verified coverage policy, but it is not a general per-label fill operation.

Test healthy absence, healthy traffic, a failed scrape with historical samples, missing target discovery, and a just-started counter. The desired output should be explicit for each case. A zero becomes useful when it communicates known inactivity while collection failures remain distinguishable.
