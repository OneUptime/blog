# How to Choose OpenMetrics Sample Timestamps or Prometheus Scrape Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, Observability, DevOps

Description: Decide when to omit OpenMetrics sample timestamps, preserve source observation time, or expose freshness separately, without confusing seconds and milliseconds.

---

For ordinary application metrics, omit explicit sample timestamps and let Prometheus assign scrape time. This keeps the measurement aligned with collection and avoids making exporter clock errors part of time-series ingestion.

There are legitimate exceptions, such as a gateway relaying measurements with meaningful source timestamps. The important decision is whether the exported value describes current state or an observation at a specific earlier time. The [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/) recommends avoiding explicit timestamps for ordinary metric points.

## Distinguish three kinds of time

Consider these samples:

```text
# TYPE worker_queue_depth gauge
# HELP worker_queue_depth Jobs currently waiting.
worker_queue_depth 8
# TYPE worker_last_success_timestamp_seconds gauge
# UNIT worker_last_success_timestamp_seconds seconds
# HELP worker_last_success_timestamp_seconds Unix time of the last successful job.
worker_last_success_timestamp_seconds 1789948800
# EOF
```

The queue-depth sample has no explicit timestamp. The number in `worker_last_success_timestamp_seconds` is the **value of a gauge**, not the sample timestamp. Prometheus can stamp both samples at scrape time while preserving the time of the last successful job as data.

This supports a freshness query:

```promql
time() - worker_last_success_timestamp_seconds
```

Do not use `timestamp(worker_last_success_timestamp_seconds)` for the same question. That function concerns the stored sample's timestamp, which can be fresh on every scrape even when the last successful job happened hours ago.

A counter's optional `_created` value is different again: it describes when that counter's cumulative sequence began. It is not the observation time for each counter sample.

## Use seconds in OpenMetrics

A timestamp follows the value as a separate field:

```text
# TYPE warehouse_temperature_celsius gauge
# HELP warehouse_temperature_celsius Latest sensor observation.
warehouse_temperature_celsius{sensor="north"} 19.5 1789948800.125
# EOF
```

OpenMetrics timestamps use Unix **seconds**, with fractional seconds allowed. Traditional Prometheus text 0.0.4 uses integer **milliseconds** for its optional timestamp. The [traditional text-format documentation](https://prometheus.io/docs/instrumenting/exposition_formats/) describes that separate rule.

Switching only the response media type while retaining a 13-digit millisecond timestamp therefore changes the meaning drastically. Convert timestamps deliberately when migrating formats. Do not divide every large metric value by 1,000: values such as byte counters and timestamp-valued gauges have their own semantics.

For nanosecond precision in an intermediary, avoid unnecessary conversion through binary floating point. Verify the resolution ultimately stored by the destination rather than assuming that every decimal digit survives ingestion.

## Choose whether stale source data should look current

Suppose a sensor publishes once per minute while Prometheus scrapes its gateway every 15 seconds. Re-emitting the same value with scrape-time timestamps means “this is the gateway's current cached value.” Preserving the source timestamp means “this measurement was observed at that earlier instant.”

Both can be useful, but they answer different questions. A practical gateway often exposes the current value plus a separate `last_observation_timestamp_seconds` gauge. Alerts can then explicitly test source freshness instead of relying on query lookback behavior.

Do not re-date historical values to the present merely to keep them visible. Conversely, do not attach an old source timestamp to a current aggregate unless that timestamp truly describes the aggregate's observation semantics.

## Understand Prometheus controls

The [scrape configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) documents two relevant settings:

```yaml
scrape_configs:
  - job_name: sensor-gateway
    honor_timestamps: true
    track_timestamps_staleness: true
    static_configs:
      - targets: ["gateway.internal:8000"]
```

`honor_timestamps` defaults to true. Setting it to false ignores timestamps supplied in the exposition and uses scrape-time behavior. This can be a deliberate compatibility measure, but it changes the meaning of source-timestamped data.

`track_timestamps_staleness` defaults to false. Enabling it allows Prometheus to track staleness for explicitly timestamped metrics when they disappear or the target goes down. It does not compensate for a bad clock or make indefinitely repeated old observations fresh.

## Test time-related failure modes

Exercise a source clock ahead of Prometheus, repeated timestamps, a value changing at the same timestamp, and an observation arriving after a newer one. Depending on ingestion settings, these can cause duplicate or out-of-order sample errors. An out-of-order window is a specific ingestion policy, not a substitute for defining time semantics.

Test disappearance as well as normal scrapes. Check `up`, source freshness, and application values independently: an HTTP endpoint can be healthy while its upstream measurement is stale. Once those behaviors match the operational question, choose the timestamp policy explicitly and document it next to the exporter configuration.
