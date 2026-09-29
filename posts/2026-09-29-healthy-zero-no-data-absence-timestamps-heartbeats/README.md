# How to Distinguish Healthy Zero from Missing or Frozen Prometheus Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Prometheus, PromQL, Heartbeat

Description: Distinguish valid zero activity from missing or frozen telemetry using expected series, range absence, sample timestamps and source freshness.

A zero means an observed quantity is zero. No data means there is no usable observation. A monitoring interface that renders both as a green zero removes information responders need to distinguish an idle service from a broken pipeline.

Define the state of the observation before displaying the business value. For a request counter, healthy zero activity requires evidence that instrumentation is present and current, plus enough history to calculate a rate. A numeric zero inserted by a query fallback does not supply that evidence.

## Initialize the metric where zero is meaningful

For a bounded set of outcomes, initialize counter children before their first event. That lets an exporter explicitly report zero errors during healthy operation. Avoid initializing a series for every conceivable user or request identifier; bounded labels are essential to keeping the metric usable.

If the source contract says the metric always exists, absence is a failure of that contract. If it is deliberately sparse, define the conditions under which absence means no event. Do not make that decision implicitly in a dashboard transformation.

Prometheus's [instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/) discusses avoiding missing metrics and exposing timestamps for event freshness.

## Detect absence over a known interval

For one fixed expected target:

```promql
absent_over_time(
  checkout_requests_total{
    job="checkout", instance="checkout-1:9100"
  }[10m]
)
```

This returns an absence indicator only when the selected range contains no samples. It does not test whether the counter changed. A counter repeatedly reporting zero is present and therefore does not satisfy the absence condition.

For a dynamic fleet, a broad regex does not generate one alert for every missing instance. Compare a separate expected-target inventory with observed presence:

```promql
checkout_target_expected == 1
unless on (cluster, instance)
max by (cluster, instance) (
  present_over_time(checkout_requests_total[10m])
)
```

`checkout_target_expected` is a custom inventory metric. It must remain available when the target disappears. Both sides must use the same canonical identity. The [absence functions](https://prometheus.io/docs/prometheus/latest/querying/functions/#absent_over_time) describe the range behavior; they do not discover what ought to exist.

## Separate scrape time from source time

This query measures sample age:

```promql
time() - timestamp(checkout_requests_total)
```

When the scraper assigns timestamps, a frozen exporter can serve the same old payload every 30 seconds and still produce fresh sample timestamps. The metric value is newly observed, but the underlying source was not newly collected.

Add a source timestamp that advances after successful collection or meaningful work:

```promql
time() - checkout_last_successful_collection_timestamp_seconds
```

The distinction is especially important for caching exporters and pushed metrics. A healthy Pushgateway scrape timestamps the retained exposition; it does not make the job's last success recent. Verify exporter-provided timestamp and staleness settings in the [scrape configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/).

## Use heartbeat freshness without requiring business activity

A heartbeat should advance while the service is operating even if no customer requests arrive. Tie it to the work you need to prove: successful event-loop progress, source polling or a controlled synthetic operation. A timer thread proves only that timer if the main worker can deadlock independently.

Display at least four states: current observations with zero activity, current observations with activity, stale source data and missing observations. A failed scrape is another useful diagnostic state even when historical samples remain in a rate window.

Also detect invalid future timestamps. A clock ahead by an hour makes `time() - heartbeat` negative and can falsely pass an upper-age check. Bound clock skew and use a trusted observer for deadline enforcement.

## Keep startup and intentional inactivity explicit

A new counter may expose zero immediately but lack enough samples for a meaningful rate. Treat this as warming up according to a finite policy. Do not claim measured zero throughput merely because a fallback filled the empty rate result.

For a workload intentionally scaled to zero, consult desired state outside the workload. Its expected metric set can be empty by policy. For a workload expected to run, disappearing metrics remain actionable. The same dashboard appearance should not conceal those different reasons.

## Test the complete state table

Exercise a valid zero counter, a counter increasing normally, a successful scrape with the family removed, a failed scrape, removed service discovery, a frozen cache and a newly started process. Include an independent inventory failure so the interface can show that expectation itself is unknown.

Choose range windows and pending durations together. Ten minutes of absence followed by `for: 10m` adds substantial detection delay. Use the [alerting rule semantics](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) to calculate the expected transition, then measure it in a controlled test.

## Conclusion

Healthy zero is an observation backed by presence and freshness. Use `absent_over_time` for missing ranges, independent inventory for missing identities, and source timestamps for frozen data. Preserving these states makes a quiet system distinguishable from a monitoring system that has stopped seeing it.
