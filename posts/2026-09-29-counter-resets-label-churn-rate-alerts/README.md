# How to Handle Counter Resets and Label Churn Without False Rate Spikes or Missing Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Prometheus, PromQL, Counter

Description: Preserve per-series counter reset handling and stable alert identities while distinguishing restarts from label churn and missing observations.

A counter reset is normal when a process restarts. A label change is different: it creates a new time series. Treating both as one continuous number can manufacture rate spikes, while treating every new series as zero can hide real work or errors during a rollout.

Use the counter's original identity long enough to calculate its rate, then aggregate to the stable service identity needed for alerting. Keep observation coverage separate from event rate.

## Take the rate before aggregation

For a request counter exported by each instance:

```promql
sum by (service, region) (
  rate(requests_total[5m])
)
```

Prometheus's [`rate()` function](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate) handles breaks in monotonicity within each counter series and extrapolates over its range. Aggregating raw counters first hides which process reset and combines independent lifecycles.

For example, instance A moves from 100 to 5 after restarting while B moves from 100 to 300. The combined value rises from 200 to 305, concealing A's reset. A rate computed from that aggregate cannot recover the correct per-instance history.

Avoid constructing a summed raw-counter recording rule and later taking its rate. Record a summed rate when that is the intended service-level contract.

## Inspect reset evidence without calling every decrease an outage

```promql
sum by (service, region) (
  resets(requests_total[1h])
)
```

Compare the result with process starts, deployment events and exporter restarts. Resets can be expected after a rolling deployment. They can also indicate a buggy exporter that alternates between backend instances while retaining one label identity.

A scrape load balancer exposing several processes under the same `instance` label can make the counter jump backward repeatedly. Fix target identity or scrape individual instances. Raising a rate window does not repair multiple writers masquerading as one counter.

Do not apply counter rate logic to gauges such as current queue size. A decrease in a gauge is normal data, not a reset to compensate for.

## Recognize label churn as a new stream

If a deployment changes `pod`, `version`, a route label or a resource attribute, Prometheus sees a different series even if the metric name stays the same. The new stream does not inherit the old stream's counter history.

Under normal rate calculation, a new series needs enough samples to establish change. An initial nonzero sample does not prove when those events happened. Avoid backfilling an assumed zero before startup merely to make a graph connect.

OpenTelemetry's [metrics data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/) similarly treats stream identity, start time and temporality as important to interpreting resets. During Collector changes, inspect those fields as well as the Prometheus labels seen at the destination.

## Keep alert identity stable

An alert's pending state belongs to its output label set. This expression preserves instance-level identity:

```promql
rate(requests_total{outcome="error"}[5m]) > 1
```

If pods churn repeatedly, each new label set can start a new pending period. For a service-level problem, aggregate first after taking rates:

```promql
sum by (service, region) (
  rate(requests_total{outcome="error"}[5m])
) > 1
```

Do not add a changing deployment hash or current metric value as an alert label. Put diagnostic details in annotations or links. The [alerting rule reference](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) defines the relationship between returned series and alert instances.

Stable aggregation does not guarantee continuous evidence. If every source disappears, the expression can become empty. Keep a separate required-telemetry or independent canary alert rather than interpreting absence as recovery.

## Account for window length and scrape cadence

A five-minute window with 30-second scrapes provides several observations during normal operation. A very short window can lack enough samples after a single missed scrape. A very long window smooths detection and recovery, potentially retaining an incident's errors after the immediate problem ends.

Choose windows from the response objective and collection cadence. Use `rate` for alerting trends rather than `irate`, whose last-two-sample behavior is more sensitive to brief changes. Inspect raw samples when a surprising spike appears; do not immediately change thresholds.

## Test the difficult transitions

Construct cases for one reset while another instance grows, two simultaneous resets, a missing scrape, an entirely new label set and overlapping old and new instances. Verify both numerical results and output labels.

Also test an exporter that incorrectly reuses an identity and a metric type change. Native histogram reset semantics differ from a simple float counter, so use fixtures matching the actual metric type rather than assuming every series is a scalar counter.

## Conclusion

Counter correctness depends on identity. Calculate rates while per-process reset evidence is still available, aggregate to stable alert labels afterward, and monitor missing observations independently. That allows normal restarts and rollouts without inventing rate continuity or repeatedly losing an active service alert.
