# How to Decide Whether a Multi-Instance Gauge Should Be Summed, Averaged, or Deduplicated

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Gauge, Monitoring, Thanos

Description: Choose gauge aggregations from the measured population, distinguish independent resources from repeated observations, and preserve weights when calculating utilization.

---

Two instances reporting a gauge value of 20 might represent 40 active connections, two observations of the same 20-item queue, or two machines at 20 percent utilization. The numeric values and metric type alone cannot tell you which aggregation is correct.

Write down what one sample represents, what identifies the underlying resource, and whether multiple reporters observe that same resource. Those answers determine the operation.

## Add independent quantities

Suppose every application process reports its own active connections. Connections belong to exactly one process, so adding them yields the service total:

```promql
sum by (cluster, namespace, service) (
  app_active_connections{job="application-pods"}
)
```

Confirm that the selector includes one observation per process. If two scrape jobs ingest the same endpoint, the sum can double even though application behavior has not changed.

The result is the sum of the samples available at the evaluation time. Gauges are snapshots, and targets are not scraped simultaneously. It should not be presented as an exact transactionally consistent inventory across all processes.

Prometheus defines [gauges](https://prometheus.io/docs/concepts/metric_types/#gauge) as values that can increase or decrease. Do not apply counter-style `rate()` to current connections or queue length to obtain a total.

## Average when reporters should have equal weight

An arithmetic average gives each present series equal influence:

```promql
avg by (cluster) (worker_temperature_celsius)
```

This answers the mean temperature among the reported worker sensors, assuming each selected series is one intended sensor. It does not automatically compensate for an unavailable sensor or for several sensors installed on one machine.

For capacity utilization, averaging percentages often answers the wrong question. Consider one worker using 1 of 2 GiB and another using 8 of 8 GiB. Their unweighted mean utilization is 75 percent, while combined utilization is 9/10, or 90 percent.

Keep used and capacity quantities separate:

```promql
sum by (cluster) (worker_memory_used_bytes)
/
sum by (cluster) (worker_memory_capacity_bytes)
```

This expression requires matching populations on both sides and consistent definitions of used memory. Inspect missing metrics before dividing; a capacity series from a missing worker can lower the apparent utilization if its usage series is absent. The [recording-rule practices](https://prometheus.io/docs/practices/rules/) explain why component totals should be combined before calculating a ratio.

## Identify repeated observations

Now suppose two exporters both ask the same broker for the length of queue `payments`. Each returns 20. Summing yields 40, but no additional messages exist.

Prefer a single authoritative collection path or the monitoring backend's supported deduplication mechanism. For duplicate HA Prometheus scrapers, [Thanos Query](https://thanos.io/tip/components/query.md/) uses configured replica labels to distinguish redundant observations from separate resources. This mechanism is not a general way to merge unrelated exporters or application replicas.

A query such as the following can express a deliberate maximum across redundant queue observers:

```promql
max by (cluster, broker, queue) (
  broker_queue_messages{job="broker-observers"}
)
```

It is appropriate only if those labels identify one queue and every omitted observer is measuring that queue with compatible semantics. `max` selects the largest available observation, not the newest or most authoritative one. During a draining queue, an older high observation can overstate the current value.

Do not replace `sum` with `max` just because a graph looks too large. First determine whether the reporters represent shards, partitions, duplicate collectors, or independent application processes.

## Check disagreement before hiding it

For the queue example, inspect the spread:

```promql
max by (cluster, broker, queue) (broker_queue_messages{job="broker-observers"})
-
min by (cluster, broker, queue) (broker_queue_messages{job="broker-observers"})
```

Also count reporters and inspect collection freshness. A spread of zero with only one reporter does not demonstrate agreement between two observers. A missing gauge must not silently become a zero-valued resource.

The [PromQL aggregation reference](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators) specifies what `sum`, `avg`, `min`, `max`, and `count` compute. Their meanings do not incorporate your resource ownership or freshness requirements; the query design must supply those assumptions.

## Test the intended population

Use three small fixtures before publishing an aggregate. Independent connection pools of 3 and 7 should total 10. Repeated observations of the same 20-message queue should not become 40. Workers using 1/2 and 8/8 capacity should produce 90 percent combined utilization when that is the question being asked.

Then remove one input and introduce a disagreeing observer. Decide what the dashboard should show in each case, and monitor missing telemetry separately. Document whether the result means total resources, equal-weight average, capacity-weighted utilization, or a selected observation. That definition is what makes the gauge useful to the next person investigating an incident.
