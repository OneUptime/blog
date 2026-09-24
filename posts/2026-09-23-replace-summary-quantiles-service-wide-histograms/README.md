# How to Replace Summary Quantiles with Service-Wide Prometheus Histograms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Monitoring, Observability

Description: Migrate per-instance summary quantiles to histogram distributions with a staged rollout, consistent bucket schemas, and verifiable service-wide percentile queries.

A summary can report each process's p99 latency, but averaging those p99 values does not produce the p99 for the service. Even weighting each p99 by request count cannot reconstruct the distribution that was discarded when the quantile was calculated.

Histograms preserve a distribution representation that can be combined before calculating the percentile. Migrate by recording the same observations into a new histogram, verifying its coverage, and moving consumers only after enough representative data exists.

## Inventory the existing consumers

Find dashboards, alerts, and recording rules that select the summary's `quantile` label. Record the old summary window, the requested percentile, units, labels, and which instances each consumer includes.

A summary's `_sum` and `_count` can still support a combined mean, subject to the observation semantics. It is the precomputed quantile values that cannot be combined into a service quantile. Prometheus's [histogram and summary comparison](https://prometheus.io/docs/practices/histograms/#quantiles) explains this distinction.

Preserve a baseline dashboard during migration. A change from per-instance quantiles to a traffic-weighted service distribution can legitimately change the displayed number even when both instruments are working correctly.

## Add a separate histogram name

Avoid registering a summary and histogram under the same metric family while they coexist. Their sum/count suffixes and type metadata can conflict. In Go, add a distinct histogram:

```go
var requestDurationHistogram = prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
        Name: "http_request_duration_histogram_seconds",
        Help: "Request duration distribution in seconds.",
        Buckets: []float64{
            0.01, 0.025, 0.05, 0.1, 0.2, 0.3,
            0.5, 0.75, 1, 2, 5,
        },
    },
    []string{"service", "route", "method"},
)
```

Register it once with the application's registry. The client supplies the `+Inf` bucket. Choose boundaries based on real latency and SLO thresholds; these values are an example, not a universal latency schema. The [Go client API](https://pkg.go.dev/github.com/prometheus/client_golang/prometheus#HistogramOpts) documents histogram options and bucket behavior.

Measure each request once, then pass the same duration in seconds to the old summary and new histogram. Do not start a second timer for the histogram or observe at a different middleware stage. Those differences create mismatched populations that cannot be diagnosed from quantile comparisons alone.

## Keep the classic bucket layout consistent

Deploy one bucket schema across all instances included in a classic-histogram aggregate. If half the instances expose a `0.3` bucket and the other half do not, summing that boundary counts only part of the service's traffic.

Use a new metric name or otherwise separate populations when changing an incompatible bucket schema during a rolling deployment. Wait until the new population is complete before presenting its percentile as the entire service. Native histograms offer another design, but require verifying the client, scrape negotiation, storage, and query path together.

For a classic histogram with eleven finite boundaries, each label combination produces twelve bucket series including `+Inf`, plus sum and count. Account for this growth before copying every label from the summary. Keep route templates bounded and leave request IDs in traces or logs. [Prometheus metric naming and labels](https://prometheus.io/docs/practices/naming/#labels)

## Aggregate buckets before calculating the quantile

Once coverage is complete, query:

```promql
histogram_quantile(
  0.99,
  sum by (cluster, service, le) (
    rate(http_request_duration_histogram_seconds_bucket[5m])
  )
)
```

Rates are calculated on each original bucket counter before aggregation. `le` remains until the quantile is calculated. Retain `route` as another grouping label if the consumer needs route-specific latency rather than the service's combined traffic mix. [Histogram quantile query contract](https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile)

The returned p99 is estimated within the finite bucket containing the percentile. If the percentile falls in the `+Inf` bucket, Prometheus returns the highest finite boundary (5 seconds in this example), so choose finite boundaries that cover the tail you need to measure. Tighten boundaries around the decision threshold when classic-bucket interpolation would otherwise be too coarse. If the actual question is the fraction of requests taking at most 300 milliseconds, divide the summed `le="0.3"` bucket rates by the summed count rates over the same window, using identical filters and grouping labels such as `(cluster, service)`, instead of converting a percentile into an SLO estimate.

## Validate counts before comparing percentiles

During a canary rollout, compare the new histogram count rate with the old summary count rate on the same migrated instances and with identical filters. Their observation counts should agree apart from expected scrape and timing effects.

Then compare sums, units, and labels. A thousandfold sum mismatch often indicates milliseconds versus seconds. A count mismatch can indicate an exception path instrumented by only one of the two observers.

Do not require exact equality between summary and histogram p99 values: their windows and approximation methods differ. Use controlled distributions where the expected percentile falls in a known bucket, and include unequal traffic across instances. That unequal-traffic fixture demonstrates why an average of old quantiles was unreliable.

## Move consumers and retire the old series

Wait for a full query window after every required instance exports the histogram. Update recording rules first, then dependent dashboards and alerts, keeping names that identify the new calculation. Review alert thresholds using representative traffic rather than silently carrying over thresholds calibrated to an average of instance quantiles.

After consumers no longer depend on the old quantile series, remove the summary instrumentation in a separate rollout. Historical summary quantiles cannot be backfilled into histograms; preserve the transition date in dashboard context so readers understand why earlier and later percentile panels may use different measurements.
