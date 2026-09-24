# How to Decide Which Labels to Keep Before Aggregating Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Metric, Observability

Description: Choose aggregation labels from measurement meaning, operational questions, and identity boundaries so rollups remain useful and mathematically valid.

A metric rollup is a decision about what questions can still be answered. Once a stored aggregate removes the cluster or route dimension, a later dashboard cannot recover it by adding another `by` clause.

Begin with the decision the result will support. A global traffic overview, a tenant-level SLO, and a per-instance debugging panel need different dimensions even when they start from the same request counter.

## Separate input identity from output grouping

Prometheus uses the metric name and full label set as a series identity. Some labels identify independent writers, while others describe the measured event. Both can be necessary in the raw data even when they do not belong in the final output. [Prometheus data model](https://prometheus.io/docs/concepts/data_model/)

For this counter:

```text
http_requests_total{
  cluster="prod-eu", namespace="shop", service="checkout",
  instance="10.0.0.8:8080", route="/orders/{id}",
  method="GET", status="200"
}
```

`instance` distinguishes scrape targets, but can remain unchanged across process restarts. A service traffic graph may not display it, but rate calculation should still operate on each original counter:

```promql
sum by (cluster, namespace, service) (
  rate(http_requests_total[5m])
)
```

Removing `instance` during ingestion is a different operation. It can cause independently resetting counters to collide. Query-time aggregation preserves the input histories long enough to calculate the intended result.

## Classify each dimension by purpose

Use a review table before creating the rule:

| Dimension | Reason to retain it | When to remove it from a particular rollup |
|---|---|---|
| Cluster or environment | Separate production boundaries and regional failures | A deliberately global overview |
| Namespace and service | Ownership, drill-down, and alert routing | A documented broader service grouping |
| Tenant | Tenant-specific reporting or contracts | An authorized aggregate with no tenant-level requirement |
| Route and method | Different latency or availability expectations | An all-requests service overview |
| Status or outcome | Error classification | After selecting failures or constructing the numerator |
| Instance or pod | Writer identity and instance diagnosis | After per-series counter processing |
| Histogram `le` | Classic bucket structure | Only after a quantile or bucket calculation |

The table is a starting point, not a universal schema. For example, the same service name in two namespaces can refer to different applications. Dropping namespace in that environment changes the meaning of the service group.

## Preserve the labels required by the mathematics

A classic histogram needs its bucket boundary label until quantile calculation:

```promql
histogram_quantile(
  0.95,
  sum by (cluster, service, le) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)
```

Removing `le` earlier destroys the bucket distribution. Similarly, a weighted mean needs compatible numerator and denominator groupings. Keep sum and count components until after aggregation rather than storing only per-instance averages. [Histogram aggregation](https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile)

For an error ratio, select failures in the numerator and then give both sides the same grouping:

```promql
sum by (cluster, service) (
  rate(http_requests_total{status=~"5.."}[5m])
)
/
sum by (cluster, service) (
  rate(http_requests_total[5m])
)
```

Whether a missing numerator should become zero depends on the metric's initialization contract and scrape health. Label alignment alone does not settle that question.

## Choose `by` or `without` deliberately

An explicit `by (cluster, service)` list fixes the output schema. If instrumentation later adds `build_version`, the rollup stays at the same grouping. A `without (instance, pod)` list keeps every other label, so that new version label can unexpectedly split the result.

Conversely, `without` can preserve useful dimensions when a metric's label schema is tightly controlled and the removed dimensions are well understood. Inspect the emitted label sets during deployment, regardless of which syntax you choose. The [aggregation operator documentation](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators) defines these retention rules.

Do not use one blanket label policy for every metric. A queue depth repeated by redundant observers is not additive in the same way as disjoint worker request counters. Establish whether the aggregation should sum, average, select, or deduplicate before selecting its dimensions.

## Estimate cost without destroying diagnostic value

Count actual combinations in a scoped metric before and after the proposed grouping:

```promql
count(http_requests_total{cluster="prod-eu"})

count(
  group by (cluster, namespace, service) (
    http_requests_total{cluster="prod-eu"}
  )
)
```

This estimates current series reduction, not future churn or every stored historical series. Cardinality products are useful upper bounds, but actual label combinations often constrain one another.

Keep a small number of intentional rollup levels and retain raw data for a suitable diagnostic period. A recording rule adds derived series; it does not reduce raw ingestion cost by itself. To reduce ingestion cost, change instrumentation or filtering; adjust retention separately to reduce stored data. Prometheus's [label guidance](https://prometheus.io/docs/practices/naming/#labels) recommends bounded dimensions that support meaningful aggregation.

Before publishing the rollup, verify two services, two clusters, unequal traffic, a source restart, and a newly added instrumentation label. Review the resulting labels alongside the numbers. That combination tests whether the aggregate still answers the operational question after the system changes.
