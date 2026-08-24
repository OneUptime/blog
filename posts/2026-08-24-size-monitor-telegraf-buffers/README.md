# How to Size and Monitor Telegraf Memory or Disk Buffers So Backend Outages Do Not Drop Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, Reliability, Buffering, Capacity Planning, Observability

Description: Translate metric rate and outage objectives into a tested Telegraf buffer design, then alert on backlog, drops, memory, and uncapped disk growth.

---

Every Telegraf output has its own buffer. When a retryable write fails, metrics remain pending and the output retries on a later flush. With the default memory strategy, a full buffer overwrites the oldest metrics with new ones. With the disk strategy, pending metrics survive process restarts, but the write-ahead logs can grow until the filesystem fills.

Buffering buys recovery time; it does not fix a destination that cannot catch up.

## Calculate the Required Outage Window

Measure the peak sustained rate that reaches each output after filters and processors. For a memory buffer, start with:

```text
required metrics = peak metrics/second × outage seconds × safety factor
```

If one output receives 2,500 metrics per second and must ride through a 20-minute outage with 25% headroom:

```text
2,500 × 1,200 × 1.25 = 3,750,000 metrics
```

`metric_buffer_limit` counts metrics, not bytes. The memory cost depends on measurement names, tags, fields, values, and plugin overhead, so replay representative traffic and measure Telegraf's resident memory rather than applying a universal bytes-per-metric estimate.

The limit is per output. Two outputs with the same configured limit can consume approximately two independent buffer allocations and can have different backlog rates because their filters differ.

## Configure a Memory Buffer Deliberately

```toml
[agent]
  metric_batch_size = 5000
  metric_buffer_limit = 3750000
  flush_interval = "10s"

[[outputs.influxdb_v2]]
  alias = "primary_influx"
  urls = ["https://influx.example.com"]
  token = "@{secrets:influx_token}"
  organization = "operations"
  bucket = "metrics"
```

The token reference assumes that a secret store with `id = "secrets"` is configured and contains the `influx_token` secret.

Telegraf writes batches of at most `metric_batch_size` on each flush, or sooner when a full batch is ready. The buffer limit should accommodate the outage objective plus normal batching and recovery variation. Check the destination's payload and rate limits before increasing batch size.

Memory buffering is fast and bounded, but queued metrics disappear if Telegraf stops. A large buffer can also trigger container or system memory limits before it reaches its configured metric count.

## Use Disk Buffering for Restart Durability

```toml
[agent]
  metric_batch_size = 5000
  flush_interval = "10s"
  buffer_strategy = "disk"
  buffer_directory = "/var/lib/telegraf/buffer"
  buffer_disk_sync = true
```

As of Telegraf 1.39.3, disk mode is still marked experimental. It creates a separate subdirectory for each output and stores pending metrics in a write-ahead log. After restart, Telegraf drains existing log entries before new metrics. `buffer_disk_sync = true` is the durability default; disabling sync may improve performance but risks losing metrics buffered during the last flush interval in a power failure.

The critical limitation is explicit in current InfluxData documentation: **Telegraf does not limit how much disk space these files use.** Disk buffering is not made safe by setting a large `metric_buffer_limit`. Put `buffer_directory` on a monitored filesystem with an operational capacity policy, protect it from unrelated workloads, and alert well before free space is exhausted.

Ensure the service user can create and update the directory. Do not use an ephemeral container layer if metrics must survive container replacement; mount durable storage with appropriate ownership and I/O performance.

## Monitor the Buffer Itself

Enable the internal input:

```toml
[[inputs.internal]]
  collect_memstats = true
  per_instance = true
```

Current Telegraf self-metrics expose `internal_write` per-output fields including:

- `buffer_size`: metrics currently pending;
- `buffer_limit`: configured `metric_buffer_limit`; it is an enforced metric capacity for memory buffering but does not cap disk buffering;
- `metrics_dropped`: metrics dropped from the buffer without being sent; and
- `metrics_rejected`: metrics the output removes after the service or serializer rejects them.

For memory mode, alert when `buffer_size` climbs persistently toward `buffer_limit`. For either strategy, alert on a persistently growing backlog and page on any increase in `metrics_dropped` or `metrics_rejected`. Use `alias` on repeated output instances so the internal metrics and logs identify the affected destination.

For disk mode, filesystem byte and inode monitoring is mandatory because Telegraf itself does not cap disk use. For memory mode, monitor process RSS, cgroup or container memory headroom, restarts, and OOM events.

## Plan the Recovery Rate

Suppose traffic continues at 2,500 metrics/s after recovery and the destination accepts 4,000 metrics/s. Only 1,500 metrics/s drains backlog. A three-million-metric backlog then needs about 2,000 seconds, or 33 minutes, after the backend returns.

If destination capacity is less than or equal to incoming traffic, the buffer never recovers. Increase sustainable write capacity, reduce input rate, filter unnecessary metrics, or route to a durable upstream queue. Increasing `metric_batch_size` does not help when the destination's actual rate limit is the bottleneck.

## Run an Outage Drill

With representative traffic:

1. Record the starting received, written, rejected, dropped, buffer, memory, and disk values.
2. Block or stop one staging destination for the target outage duration.
3. Confirm only that output's backlog rises and no drops occur.
4. Restart Telegraf if restart durability is in scope.
5. Restore the destination and measure drain time.
6. Reconcile source sequence IDs or counts, including duplicates.

Test a nearly full buffer and a destination that returns permanent point errors as well as a network outage. Some outputs can identify and drop individual metrics that the destination rejects; no amount of retry capacity makes an invalid point valid.

## Official Documentation

- [Telegraf agent batching and buffer settings](https://docs.influxdata.com/telegraf/v1/configuration/agent/)
- [Telegraf data pipeline: buffering and delivery](https://docs.influxdata.com/telegraf/v1/concepts/data-pipeline/)
- [Write data with output plugins](https://docs.influxdata.com/telegraf/v1/configure_plugins/output_plugins/)
- [Monitor Telegraf and `internal_write`](https://docs.influxdata.com/telegraf/v1/administer/monitor/)

## Conclusion

Size memory buffers from measured per-output rate and a concrete outage objective, then verify real memory use. Choose disk mode when restart durability matters, but treat its uncapped filesystem growth as a first-class risk. A useful buffer design includes alerts, recovery-rate headroom, durable storage where required, and a rehearsed outage test.
