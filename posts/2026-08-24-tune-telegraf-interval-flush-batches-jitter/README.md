# How to Tune Telegraf `interval`, `flush_interval`, Batch Size, and Jitter for Steady Writes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, Performance Tuning, Observability, Capacity Planning, InfluxDB

Description: Tune Telegraf collection and output timing from measured metric volume so fleets avoid synchronized polls, tiny writes, oversized requests, and unstable backlogs.

---

Telegraf has two separate clocks. Polling inputs gather on `interval`; outputs write on `flush_interval` or sooner when a full `metric_batch_size` accumulates. `collection_jitter` spreads polls, while `flush_jitter` spreads writes. Tuning works when these controls are tied to metric rate and destination limits rather than copied independently.

## Start with the Default Mental Model

```toml
[agent]
  interval = "10s"
  round_interval = true
  collection_jitter = "0s"
  metric_batch_size = 1000
  metric_buffer_limit = 10000
  flush_interval = "10s"
  flush_jitter = "0s"
```

Current Telegraf defaults use a 10-second collection interval, 1,000-metric batch, 10,000-metric memory buffer per output, and 10-second flush interval. `round_interval = true` aligns collection to interval boundaries.

MQTT consumers and HTTP listeners are service inputs that emit when data arrives, so their plugin interval does not schedule incoming events. StatsD also listens continuously, but publishes its cached aggregates on the collection interval. Apply collection tuning to polling inputs and plugin-specific service aggregators, and output tuning to the combined pipeline.

## Measure Metrics per Collection and per Second

If an agent produces 6,000 metrics every 10 seconds, its average is 600 metrics/s. With a 10-second flush, roughly 6,000 metrics are eligible between timed flushes. A 1,000-metric batch can therefore fill and write early several times during that window.

Use `inputs.internal` to observe gathered and written metrics, gather times, write times, errors, buffer size, and drops. Capture peaks such as container starts, interface discovery, or a large SNMP table; average rate alone hides batch bursts.

## Choose Collection Timing for the Signal

Set `interval` from the shortest meaningful change or alerting requirement, not dashboard refresh speed. Polling a slow-changing inventory every second wastes device and agent capacity. Polling a fast saturation signal every minute can miss an incident.

Individual polling inputs can override the agent interval:

```toml
[[inputs.cpu]]
  interval = "10s"
  percpu = false
  totalcpu = true

[[inputs.snmp]]
  interval = "60s"
  agents = ["udp://switch-01.example.com:161"]
  version = 2
  community = "${SNMP_COMMUNITY}"
  agent_host_tag = "source"

  [[inputs.snmp.field]]
    oid = ".1.3.6.1.2.1.1.3.0"
    name = "uptime"
```

Keep the collection duration comfortably below the scheduled interval and monitor `gather_time_ns` and `gather_timeouts`.

## Choose Flush and Batch Settings Together

Telegraf sends at most `metric_batch_size` metrics per write. It writes on every `flush_interval`, or sooner when a full batch is ready. A good starting point keeps batches large enough to amortize request overhead but below the destination's payload, point-count, timeout, and rate limits.

```toml
[agent]
  interval = "10s"
  metric_batch_size = 5000
  metric_buffer_limit = 100000
  flush_interval = "10s"
```

InfluxData's glossary advises not setting `flush_interval` lower than the collection interval. Faster flushes can be appropriate for service inputs or a per-output latency requirement, but verify the resulting small-write rate and override only the affected output:

```toml
[[outputs.file]]
  files = ["stdout"]
  flush_interval = "1s"
  metric_batch_size = 500
```

Output-level overrides are supported for `flush_interval`, `flush_jitter`, `metric_batch_size`, and `metric_buffer_limit`. Each output buffers and writes independently.

## Add Jitter Across a Fleet

With `round_interval = true`, thousands of agents can poll at the same wall-clock boundaries. Add bounded random delay:

```toml
[agent]
  interval = "30s"
  collection_jitter = "5s"
  flush_interval = "30s"
  flush_jitter = "10s"
```

Each input sleeps for a random time within `collection_jitter` before gathering. Each output adds a random delay within `flush_jitter`. The nominal delay between scheduled flushes is at most `flush_interval + flush_jitter`; a slow or blocked output write can extend the actual gap. Include the jitter in alert and freshness budgets.

Jitter smooths synchronization; it does not increase backend throughput. If buffers rise continuously, fix the sustained rate mismatch.

## Tune with a Controlled Loop

Change one dimension at a time and record:

- metrics per batch and request payload size;
- write latency, timeout, and rejection rate;
- CPU and memory on Telegraf and the destination;
- `internal_write.buffer_size`, `buffer_limit`, and `metrics_dropped`;
- end-to-end metric freshness; and
- fleet-wide requests per second.

A larger batch reduces request count but increases individual request cost and retry impact. A shorter flush reduces latency but raises request rate. A shorter collection interval increases both source load and downstream volume. Keep enough buffer for transient failures after every change.

## Official Documentation

- [Telegraf agent settings](https://docs.influxdata.com/telegraf/v1/configuration/agent/)
- [Common input and output plugin options](https://docs.influxdata.com/telegraf/v1/configuration/plugin-options/)
- [Write data with output plugins](https://docs.influxdata.com/telegraf/v1/configure_plugins/output_plugins/)
- [Telegraf glossary for interval, batching, and jitter](https://docs.influxdata.com/telegraf/v1/glossary/)
- [Monitor Telegraf](https://docs.influxdata.com/telegraf/v1/administer/monitor/)

## Conclusion

Tune collection for signal value and source cost, then tune flush and batch settings for the destination's efficient request envelope. Add jitter to de-synchronize fleets, account for its latency, and use internal metrics to prove that buffers remain flat and drops stay at zero under peak-not merely average-load.
