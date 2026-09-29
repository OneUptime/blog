# How to Test Monitoring with Heartbeats from Exporter to Notification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Prometheus, Alertmanager, Heartbeat

Description: Prove that fresh exporter data reaches rule evaluation and notification delivery with a continuously renewed heartbeat and an independent deadline.

A green Prometheus target proves that one scrape succeeded. It does not prove that the resulting samples reached the system evaluating alerts, that an Alertmanager route matched, or that the notification provider contacted anyone. A useful pipeline heartbeat must exercise the same path as operational alerts and have its own independent observer.

Start by writing the path explicitly: producer, scrape target, optional Collector or remote-write transport, rule evaluator, Alertmanager, provider, destination. Mark where a success response means accepted, stored, delivered, or acknowledged. These are different checkpoints.

## Make the heartbeat depend on new work

Expose a custom gauge such as:

```text
monitoring_canary_last_success_timestamp_seconds{pipeline="prod-eu"} 1790647200
```

The value is an illustrative Unix timestamp. Update it after a small periodic operation completes. Do not generate the timestamp from the HTTP metrics handler: that would certify the handler while the underlying producer could remain frozen. Publish the metric every scrape, retaining the last successful value when the operation fails.

Use a fixed pipeline label rather than a new run identifier on each sample. Put individual run identifiers in a bounded event log. Prometheus's [instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/) recommends event timestamps for tracking time since an event; the age can then be calculated at evaluation time.

## Keep a positive heartbeat alert firing

Evaluate this rule in the same place as production alerts. If production rules read remote storage, a rule running only on the originating scraper does not cover that transport.

```yaml
groups:
  - name: notification-heartbeat
    interval: 30s
    rules:
      - alert: MonitoringPipelineHeartbeat
        expr: |
          time() - monitoring_canary_last_success_timestamp_seconds{
            pipeline="prod-eu"
          } < 120
        labels:
          severity: heartbeat
          team: platform
        annotations:
          summary: "Fresh telemetry reached production rule evaluation"
```

This is deliberately positive: fresh data produces a firing alert. Frozen or missing data stops renewing it. A future timestamp can keep the expression true incorrectly, so also bound acceptable clock skew or alert separately when the timestamp exceeds evaluator time by more than the agreed tolerance.

Prometheus [alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) activate on returned vector elements. Avoid a `bool` comparison here: it retains false results as zero-valued elements, which still activate an alert.

## Send repeated notifications to an independent receiver

Merge a dedicated child route into the production routing tree:

```yaml
route:
  receiver: ordinary-alerts
  routes:
    - matchers:
        - alertname="MonitoringPipelineHeartbeat"
      receiver: heartbeat-observer
      group_by: [alertname, pipeline]
      group_wait: 0s
      group_interval: 1m
      repeat_interval: 1m

receivers:
  - name: ordinary-alerts
    # Add the normal production integration here.
  - name: heartbeat-observer
    webhook_configs:
      - url: https://watchdog.example.net/alertmanager
        send_resolved: false
```

This is an integration example; the placeholder endpoint must be replaced with an authenticated receiver that understands Alertmanager webhook payloads. The receiver renews its deadline only for the expected firing alert and pipeline identity. A resolved notification, malformed payload, or unrelated alert must not count as success.

Choose its expiry from measured notification intervals, retries, restart time and network jitter. For a one-minute repeat interval, a five-minute deadline is an initial policy to test, not a universal guarantee. [Alertmanager configuration](https://prometheus.io/docs/alerting/latest/configuration/) explains that repeat timing interacts with group timing and notification state.

## Define exactly what the receiver proves

A direct webhook proves delivery to that webhook. It does not automatically exercise a separate paging provider or a human's phone. To cover those steps, run a less frequent synthetic incident through the real provider integration and check its delivery record or a controlled test destination. Record provider acceptance, incident creation and destination receipt separately.

Keep the continuously firing heartbeat out of ordinary responder escalation. Its independent observer should page only when renewal expires, using a route that remains usable during a production monitoring outage. Host the observer outside the cluster and credentials it observes.

## Break the path deliberately

In a test environment, stop the producer while leaving its HTTP endpoint alive. Then test a dropped metric, stopped rule evaluator, removed route and failed receiver. For each experiment, record the last valid renewal, expiry, notification receipt and recovery time.

A duplicate alert after failover must not create a false failure. Conversely, repeated delivery of stale buffered payloads must not renew the deadline forever: check freshness using the canary value where available, or pair notification receipt with an independently queried current canary value. Do not assume repeated firing messages imply the underlying measurement is recent.

## Conclusion

An end-to-end heartbeat is a renewable proof with a defined endpoint. Tie it to fresh producer work, route it through production evaluation and notification machinery, and let an independent deadline detect silence. Add a controlled destination test for the final paging hop so “we sent a webhook” never becomes an unsupported claim that someone can still be paged.
