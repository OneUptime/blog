# Multiple Remote Write Destinations: Fan-Out, Failover, and the Cost of Each

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, Fan-Out, Disaster Recovery, High Availability, Capacity Planning

Description: Design multiple Remote Write destinations with accurate fan-out semantics, explicit filtering, independent monitoring, and realistic resilience and cost expectations.

---

Prometheus accepts a list of `remote_write` configurations. Each entry creates its own queue, reads samples from the write-ahead log, applies its own write relabeling, and sends to its own URL.

This is native fan-out. It is not a primary-and-standby failover controller.

```text
                         -> queue A -> backend A
Prometheus ingestion/WAL -> queue B -> backend B
                         -> queue C -> backend C
```

If all three filters match a series, all three backends receive it during normal operation. Prometheus does not wait for A to fail before sending to B, and it does not require a quorum of acknowledgements.

## Configure Intentional Fan-Out

Send all samples to a primary backend and a disaster-recovery backend:

```yaml
remote_write:
  - name: primary
    url: https://primary-metrics.example.net/api/v1/write
    authorization:
      credentials_file: /etc/prometheus/secrets/primary-token

  - name: disaster-recovery
    url: https://dr-metrics.example.net/api/v1/write
    authorization:
      credentials_file: /etc/prometheus/secrets/dr-token
```

Both are active. The DR backend has a current copy only because it continuously pays the full ingestion, network, and storage cost.

Give every entry a unique `name`. Prometheus exposes it as `remote_name` on queue metrics and uses it in logs, which is essential when one endpoint fails and another remains healthy.

## Multiple Destinations Are Independent, Not Transactional

Backend A may acknowledge a batch while backend B times out. Prometheus records success for A and retries B's queue. There is no transaction spanning destinations and no rollback of A.

Within a queue, Prometheus shards by series while preserving per-series sample order. Across two queues, request timing and recovery can differ. At any instant, one receiver can be minutes behind the other even if both will eventually contain the same samples.

This has several consequences:

- one backend cannot be treated as proof that another committed the same batch;
- dashboards can disagree during an outage or recovery;
- receiver-side validation differences can make one backend reject data another accepts;
- changing labels independently per destination makes their datasets intentionally non-identical.

Use destination-specific success objectives rather than one combined healthy-or-not signal.

## Why This Is Not Failover

An active-passive mental model expects:

```text
send to primary
if primary fails, send to backup
```

Prometheus implements:

```text
send matching samples to primary
send matching samples to backup
```

There is no configuration that says `use this remote_write entry only when another is down`. `write_relabel_configs` sees series labels, not the health of another queue.

If a backup entry is present but filtered to drop everything, Prometheus will not automatically change that filter during an outage. If an operator later edits the config, the newly activated destination is not guaranteed to receive every historical sample that the primary previously accepted. Configuration reload is not a replication or backfill protocol.

For a single logical service with several receiver instances, prefer the service's supported HA endpoint, load balancer, or receiver-side replication. Prometheus then sends to one stable URL while the service owns membership, health checks, tenancy, and durable replication.

The experimental `round_robin_dns` sender option is also not active-passive failover. It randomly chooses among resolved addresses instead of trying them in Go's normal order; it does not replicate requests or understand backend health and durability.

## Partitioning Is Different from Fan-Out

Use mutually exclusive filters when different samples should go to different backends:

```yaml
remote_write:
  - name: production
    url: https://prod-metrics.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [environment]
        regex: production
        action: keep

  - name: non-production
    url: https://nonprod-metrics.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [environment]
        regex: 'development|staging|test'
        action: keep
```

Here the total outbound sample rate can be close to one copy of local ingestion because a well-labeled series matches one destination. By contrast, full fan-out to two destinations approaches two copies.

Filters can also intentionally overlap. For example, send all production data to the primary but only SLO recording rules to a smaller DR backend:

```yaml
remote_write:
  - name: primary
    url: https://primary.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [environment]
        regex: production
        action: keep

  - name: slo-dr
    url: https://dr.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [environment]
        regex: production
        action: keep
      - source_labels: [__name__]
        regex: 'slo:.*|service:.*'
        action: keep
```

Document that the DR dataset supports global SLOs but not raw-metric drill-down.

## Calculate the Resource Cost

The official tuning documentation describes a separate queue per destination. Each queue has an in-memory series cache and a number of shards. Approximate queue buffering per destination is proportional to:

```text
shards * (capacity + max_samples_per_send)
```

That is not the whole memory cost because the series-label cache depends on active series and churn. Still, it shows why copying a high `max_shards` and `capacity` into several entries can multiply memory use.

Full fan-out also adds:

- one WAL-reading path per destination;
- protobuf construction and Snappy compression work per destination;
- roughly another copy of compressed outbound traffic;
- another receiver's ingestion, indexing, retention, and query cost;
- another authentication and TLS connection pool;
- another independent backlog during an outage.

If local ingestion is 100,000 samples per second and two unfiltered destinations both match, plan receiver capacity for 100,000 samples per second at each, not 50,000 each. Network bytes will not be exactly double because compression and request timing vary, but fan-out is not free.

## A Slow Destination Can Still Hurt the Sender

A backed-up shard stops the WAL reader for that destination when its in-memory queue fills. The healthy destination's queue is independent and can continue. However, the stalled queue still consumes memory, CPU, disk I/O, connections, and retained WAL recovery time on the same Prometheus process.

Resource exhaustion is shared at the process and node level. A severely backed-up secondary can therefore contribute to an out-of-memory kill, CPU saturation, or disk pressure that affects primary monitoring too.

Cap each queue according to receiver capacity:

```yaml
remote_write:
  - name: disaster-recovery
    url: https://dr.example.net/api/v1/write
    queue_config:
      capacity: 10000
      min_shards: 1
      max_shards: 20
      max_samples_per_send: 2000
      batch_send_deadline: 5s
```

These values happen to match several current defaults except the reduced `max_shards`; they are not universal recommendations. Start with defaults, load test, and change one constraint at a time.

## Monitor Each Destination

Queue depth:

```promql
prometheus_remote_storage_samples_pending
```

Lag in seconds based on queued and sent sample timestamps:

```promql
prometheus_remote_storage_queue_highest_timestamp_seconds
-
prometheus_remote_storage_queue_highest_sent_timestamp_seconds
```

Non-recoverable sample failures:

```promql
rate(prometheus_remote_storage_samples_failed_total[5m])
```

Retries:

```promql
rate(prometheus_remote_storage_samples_retried_total[5m])
```

Compressed data bytes:

```promql
rate(prometheus_remote_storage_bytes_total[5m])
```

Group alerts and dashboards by `remote_name` and `url`. Alert when desired shards remain above configured maximum, pending samples grow, lag increases persistently, or failures rise. Verify receiver-side ingest independently because a sender success only confirms the receiver accepted the HTTP request under that protocol's semantics.

## Choose the Resilience Model Explicitly

Use full dual-write when the second backend must already contain the data at failover time and its ongoing cost is justified. Use a receiver cluster's native replication when both destinations are instances of one logical storage system. Use selective fan-out when only critical aggregates need a second copy.

If cost prevents continuous duplication, define a different recovery plan such as backend-native backups, object-storage replication, or tested historical migration tooling. Calling an inactive URL a backup does not put any samples there.

Before production, stop each destination separately, observe queue isolation, restore it, measure catch-up rate, and confirm what happens when the outage exceeds the WAL recovery window.

## Official Documentation

- [Prometheus Remote Write configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus Remote Write tuning and per-destination queues](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus Remote Write 1.0 ordering requirements](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus Remote Write 2.0 response and retry semantics](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/)
- [Prometheus relabel configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config)
- [Prometheus queue manager metrics and implementation](https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go)
