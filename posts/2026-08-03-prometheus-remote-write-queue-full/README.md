# What Happens When the Prometheus Remote Write Queue Is Full?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, Queue, WAL, Backpressure, Data Loss, Troubleshooting

Description: Understand Remote Write backpressure from shard saturation through WAL blocking, delayed retries, catch-up, and the point where unsent samples can be lost.

---

Each Prometheus Remote Write destination has a queue manager. Its WAL watcher reads samples from the write-ahead log, assigns each series to a shard, and places samples into that shard's bounded in-memory queue. A shard batches and sends them to the receiver.

When one shard's queue reaches `capacity`, Prometheus cannot enqueue the next sample assigned to it. The WAL reader retries instead of skipping that sample. This blocks that destination from feeding any of its shards until space is available.

The immediate result is backpressure, not an immediate dropped sample. Data loss comes later if the sender can no longer recover the unread data from its WAL, the sample exceeds an explicit age limit, or the receiver returns a non-recoverable error.

## The Queue Path

```text
local ingestion
     |
     v
Prometheus WAL -> WAL watcher -> shard queue -> batch -> receiver
                                  ^ bounded by capacity per shard
```

Current default queue values are:

```yaml
remote_write:
  - url: https://metrics.example.net/api/v1/write
    queue_config:
      capacity: 10000
      min_shards: 1
      max_shards: 50
      max_samples_per_send: 2000
      batch_send_deadline: 5s
      min_backoff: 30ms
      max_backoff: 5s
      retry_on_http_429: false
      sample_age_limit: 0s
```

These are reference defaults from the current configuration schema, not a recommendation to copy every field. Omitting them lets the installed Prometheus version supply its defaults.

`capacity` is per shard. With 10 active shards, up to roughly 100,000 queued sample slots are configured, plus active batch space. The official tuning guide describes shard memory as proportional to:

```text
number of shards * (capacity + max_samples_per_send)
```

The series-label cache and object overhead add more memory beyond this simple count.

## What Full Means Step by Step

1. A receiver slows, rejects retriable requests, or becomes unreachable.
2. A shard continues retrying its current batch with backoff.
3. New samples assigned to that shard fill its in-memory queue.
4. The next enqueue to the full shard fails temporarily.
5. Prometheus increments its enqueue-retry counter and the WAL reader waits and retries.
6. Other shards for that destination stop receiving later WAL records because order through the WAL reader cannot skip the blocked record.
7. Newly scraped samples can still be appended to the local TSDB and WAL while local resources remain healthy.
8. The destination falls progressively behind the WAL tail.

A separate Remote Write destination has its own queue and watcher. It can continue sending, although all queues share process CPU, memory, disk, and network resources.

## A Full Queue Is Not a Durable Buffer by Itself

The bounded queue is in memory. Its purpose is to keep sender shards busy through ordinary latency variation, not to hold a multi-hour outage. Durability comes from replaying still-retained records in the WAL.

Prometheus's official Remote Write tuning page states that server-mode failures are retried without loss unless the endpoint remains down for more than two hours; after that, WAL compaction can remove data not yet sent. Treat two hours as an approximate documented recovery boundary, not an SLA. Segment timing, process restarts, current Prometheus mode, and version-specific retention behavior matter.

If `sample_age_limit` is nonzero, Prometheus deliberately drops samples older than that limit before sending even if their WAL data remains available:

```yaml
queue_config:
  sample_age_limit: 30m
```

This bounds stale catch-up but explicitly accepts gaps after a long outage.

## Detect Queue Saturation

### Pending Samples

```promql
prometheus_remote_storage_samples_pending{remote_name="central"}
```

This gauge counts samples pending in the shard queues. A persistent rise is a warning. It is not a complete count of unread samples still behind the WAL watcher, so a plateau does not prove the total backlog stopped growing.

### Enqueue Retries

```promql
rate(
  prometheus_remote_storage_enqueue_retries_total{
    remote_name="central"
  }[5m]
)
```

The source code defines this counter as enqueue failures caused by a full shard queue. A rate above zero is direct evidence of in-memory backpressure.

### Queue Occupancy Context

```promql
prometheus_remote_storage_shards{remote_name="central"}
```

```promql
prometheus_remote_storage_shard_capacity{remote_name="central"}
```

Compare pending samples with active shards and per-shard capacity, while remembering that distribution among shards is not perfectly even.

### Send Lag

```promql
time()
-
prometheus_remote_storage_queue_highest_sent_timestamp_seconds{
  remote_name="central"
}
```

For a continuously active source, this shows how old the newest successfully sent sample timestamp is. Low-volume or idle sources need different alert logic because the value rises even when there is nothing new to send.

Also watch retries, non-recoverable failures, shard saturation, WAL disk growth, CPU, memory, and network throughput.

## Why Increasing Capacity Often Does Not Fix It

Capacity changes how much latency variation can be absorbed before the WAL reader blocks. It does not make HTTP requests complete faster.

If incoming rate is `Rin` and sustainable receiver throughput is `Rout`:

```text
backlog growth = Rin - Rout, when Rin > Rout
```

Any finite queue fills when the receiver remains slower. A larger capacity buys time and uses more memory. It can also lengthen resharding or draining work.

The Prometheus tuning guide recommends capacity around 3 to 10 times `max_samples_per_send`. Start there, then measure. Increasing it far beyond that is not a substitute for receiver capacity.

## Fix the Throughput Constraint

Work from the receiver backward.

### Receiver or Network Is Down

Restore DNS, routing, TLS, authentication, load balancer health, and receiver availability. Do not restart Prometheus repeatedly; a restart does not repair the endpoint and adds WAL replay work.

### Receiver Is Slow but Can Scale

Check whether desired shards reach `max_shards`:

```promql
prometheus_remote_storage_shards_desired{remote_name="central"}
```

```promql
prometheus_remote_storage_shards_max{remote_name="central"}
```

Prometheus automatically calculates desired parallelism. If desired shards remain at the maximum and the receiver has tested headroom, cautiously raise `max_shards`. More concurrency can overload an already saturated receiver, so coordinate both sides.

### Requests Are Too Small or Too Large

`max_samples_per_send` changes batch size. Larger batches reduce request overhead but increase individual request work and may exceed receiver or proxy limits. Load test the exact backend. `batch_send_deadline` is the maximum wait before a partially filled shard batch is sent; it is not the HTTP request timeout.

### Ingestion Exceeds the Product Budget

Use `write_relabel_configs` to exclude unused outbound series, reduce unnecessary scrape cardinality, or increase scrape intervals where the monitoring objective permits. Filtering after local ingestion reduces Remote Write volume but not local TSDB ingestion cost.

### Rate Limiting Is Intentional

HTTP 429 is not retried by default. Enabling `retry_on_http_429` retains and retries throttled batches but can make a permanently undersized receiver backlog worse. Fix quotas or reduce load first.

## Define the Catch-Up Requirement

After recovery, the sender must transmit both new traffic and backlog. If normal receiver throughput is only equal to normal ingestion, it can never catch up.

For example:

```text
normal ingestion:       80,000 samples/s
receiver capacity:     120,000 samples/s
catch-up headroom:      40,000 samples/s
```

A 10-minute outage creates about 48 million unsent samples at that ingestion rate. Ignoring compression and other constraints, 40,000 samples per second of spare capacity needs about 20 minutes to clear it.

Monitor lag until it returns to its normal range. A falling pending gauge alone may only mean the queue is being refilled more slowly from an unread WAL backlog.

## Alert Before the Recovery Window Expires

A practical alert combines sustained send lag with queue evidence:

```promql
(
  time()
  - prometheus_remote_storage_queue_highest_sent_timestamp_seconds
) > 300
and on (remote_name, url)
prometheus_remote_storage_samples_pending > 0
```

Adjust labels and thresholds to your Prometheus version and normal traffic. Add alerts for enqueue retries, `shards_desired >= shards_max`, failed samples, disk pressure, and a lag threshold well below the WAL survival boundary.

When the queue fills, the key question is not how to make it larger. It is why sustainable send throughput fell below ingestion and whether enough WAL time and catch-up capacity remain to recover.

## Official Documentation

- [Prometheus Remote Write tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus queue configuration defaults](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus Remote Write queue manager source](https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go)
- [Prometheus WAL watcher source and metrics](https://github.com/prometheus/prometheus/blob/main/tsdb/wlog/watcher.go)
- [Prometheus local WAL storage behavior](https://prometheus.io/docs/prometheus/latest/storage/#local-storage)
- [Prometheus Remote Write 2.0 retry semantics](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/#retries--backoff)
