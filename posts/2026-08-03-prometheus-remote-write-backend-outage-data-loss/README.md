# How Long Can Remote Write Survive a Backend Outage Before Losing Samples?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, WAL, Backend Outage, Data Loss, Recovery Planning

Description: Calculate the practical Remote Write recovery window from Prometheus mode, WAL retention, persistent disk, error semantics, sample age, and catch-up capacity.

---

Prometheus does not keep an unlimited Remote Write backlog. It reads samples from a write-ahead log, retries recoverable failures, and catches up if the receiver returns before the required WAL records are removed.

For a normal full Prometheus server, the official Remote Write tuning guide gives the critical rule: failures are retried without loss unless the remote endpoint stays down for more than two hours; after two hours, WAL compaction can remove unsent data. Treat that as the documented approximate boundary, not a guaranteed two-hour service-level objective.

Agent mode has separately configurable retention flags in current releases, so its practical window must be read from the running binary rather than assumed from older two-hour guidance.

## What Is Actually Buffered

```text
scrape -> local append -> WAL -> Remote Write queue -> receiver
```

There are two layers:

- bounded in-memory shard queues absorb ordinary latency and batching;
- the on-disk WAL allows the queue to replay data after a longer recoverable outage.

Increasing `queue_config.capacity` enlarges only the first layer. It does not extend server-mode WAL compaction time.

When a shard queue fills, its WAL watcher blocks at the unread record. New local samples can continue entering the WAL while local storage remains healthy. Recovery succeeds only if the watcher reaches those records before the retention mechanism removes them.

## Full Prometheus Server: Approximately Two Hours

Prometheus local storage retains at least three WAL segments and, on high-traffic servers, enough segments for at least roughly two hours of raw data. The Remote Write tuning page translates that into the operational warning that an endpoint outage beyond two hours can lose unsent samples.

This loss is **for the Remote Write destination**. A full Prometheus can still retain those samples in its queryable TSDB blocks according to local retention. Remote Write does not automatically reread old TSDB blocks after its WAL window has passed, so local presence does not mean the remote queue will heal the gap later.

Increasing normal TSDB retention from 15 days to 30 days does not turn Remote Write into a 30-day replay queue.

## Agent Mode: Check Current Retention Flags

Prometheus Agent mode uses a forwarding-focused WAL instead of a queryable local TSDB. The current Prometheus 3.13 command reference documents:

```text
--storage.agent.retention.min-time   default 5m
--storage.agent.retention.max-time   default 4h
```

The minimum is the age at which samples may be considered for deletion during WAL truncation. The maximum is the age at which samples may be forcibly deleted when the WAL is truncated.

The narrative Agent-mode page still describes a two-hour buffer, while the current generated command reference lists a four-hour default maximum. For an operational decision, inspect the exact deployed binary:

```bash
prometheus --help | grep 'storage.agent.retention'
```

and the running process arguments. Versioned flags are the source of truth for that process.

You can make Agent retention an explicit deployment decision:

```bash
prometheus \
  --agent \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.agent.path=/prometheus-agent \
  --storage.agent.retention.min-time=5m \
  --storage.agent.retention.max-time=8h
```

A longer maximum consumes more disk during an outage and increases replay work. Load test it with the exact version, storage class, sample rate, and receiver. It is not a substitute for durable central availability.

## The Error Must Be Retriable

WAL availability helps only when Prometheus keeps retrying the batch.

Prometheus retries:

- network and HTTP client errors;
- request timeouts;
- HTTP 5xx responses;
- HTTP 429 only when `retry_on_http_429: true`.

Most other HTTP 4xx responses are non-recoverable. A 400 invalid-sample response, 401 bad credential, or unsupported protocol response causes the affected batch to fail rather than remain buffered until the configuration is fixed.

The Remote Write 2.0 specification uses this distinction deliberately: invalid data should not be retried, while 5xx must be retried and 429 may be retried.

Monitor permanent failures separately:

```promql
increase(prometheus_remote_storage_samples_failed_total[10m])
```

An authentication outage can therefore lose samples faster than a network outage even though both make the backend unavailable from the user's perspective.

## `sample_age_limit` Can Shorten the Window

The default is unlimited relative to still-readable WAL data:

```yaml
queue_config:
  sample_age_limit: 0s
```

A nonzero value deliberately drops older samples before sending:

```yaml
queue_config:
  sample_age_limit: 30m
```

This caps stale catch-up and can prioritize fresh visibility, but an outage longer than 30 minutes now creates intentional remote gaps even if the WAL retains more. Track:

```promql
increase(
  prometheus_remote_storage_samples_dropped_total{
    reason="too_old"
  }[10m]
)
```

`sample_age_limit: 0s` does not mean infinite retention. It only avoids adding a shorter application-level age cutoff.

## Persistent Disk Is Part of the Guarantee

The WAL survives a process restart only when its storage survives. A Kubernetes `emptyDir`, ephemeral container filesystem, failed node disk, or manually deleted data directory removes the backlog regardless of retention flags.

For a recoverable restart or reschedule, mount a suitable persistent volume at:

```text
--storage.tsdb.path       for full server mode
--storage.agent.path      for Agent mode
```

Prometheus local storage requires a POSIX-compliant filesystem and officially does not support NFS, including many NFS-like cloud filesystems. Follow the storage documentation and test crash recovery.

Disk exhaustion is also a hard limit. Measure real WAL growth during a receiver outage:

```bash
du -sh /prometheus/wal
```

or for Agent mode:

```bash
du -sh /prometheus-agent/wal
```

Use measured bytes per minute at peak cardinality and sample rate, plus headroom for checkpoints, bursts, and other data. Agent WAL compression is enabled by default in the current command reference, but compression ratio depends on labels and values.

## Calculate Backlog and Catch-Up

For a source rate `R` and outage duration `O`:

```text
backlog samples = R * O
```

At 60,000 samples per second for 45 minutes:

```text
60,000 * 2,700 = 162,000,000 samples
```

If the receiver can sustainably accept `C` samples per second after recovery, rough drain time is:

```text
backlog / (C - R), where C > R
```

At 90,000 samples per second of receiver capacity:

```text
162,000,000 / (90,000 - 60,000)
= 5,400 seconds
= 90 minutes
```

This is a throughput planning approximation. Prometheus sends different series through independent shards, WAL reading and queues add constraints, and receivers enforce request and tenant limits. Monitor the actual highest-sent timestamp until it returns to normal.

If `C <= R`, the queue cannot catch up while live traffic continues. A recoverable WAL window only postpones the gap.

## Alert Before the Boundary

For an active source, watch sample timestamp age:

```promql
time()
-
prometheus_remote_storage_queue_highest_sent_timestamp_seconds{
  remote_name="central"
}
```

Add:

```promql
prometheus_remote_storage_samples_pending{remote_name="central"}
```

```promql
rate(prometheus_remote_storage_enqueue_retries_total{remote_name="central"}[5m])
```

```promql
prometheus_wal_watcher_current_segment{consumer="central"}
```

Set a warning threshold far below the mode's tested retention boundary. A server-mode warning at 15 or 30 minutes leaves time to repair the receiver and catch up before two hours. Agent thresholds should use the configured maximum, measured disk, and recovery rate.

Low-volume sources need a heartbeat gate because `time() - highest sent` rises when no samples exist.

## What to Do After the Window Is Exceeded

1. Restore current ingestion first and confirm lag stops growing.
2. Record failed, dropped, and affected time ranges from both sender and receiver.
3. Query a heartbeat series at the receiver to locate the gap.
4. For full server mode, confirm whether the missing samples still exist locally.
5. Use a receiver-supported migration or backfill workflow if historical repair is required.
6. Prevent duplicate writes and out-of-order conflicts when importing history.

Remote Write itself does not backfill compacted local blocks. Historical repair is a separate, receiver-specific operation.

## Improve the Architecture for Longer Partitions

If edge links commonly fail longer than the tested WAL window, consider:

- longer, explicitly sized Agent retention on durable local disk;
- a regional receiver close to the source, with a supported durable replication path;
- full local Prometheus for local queries and alerting, plus a separate backfill plan;
- two continuously active independent Remote Write backends when the cost is justified;
- reducing outbound sample volume to make disk and catch-up capacity practical.

The answer to how long Remote Write survives is not only a duration. It is the shortest of WAL availability, sample-age policy, persistent-disk survival, and the time at which catch-up becomes impossible.

## Official Documentation

- [Prometheus Remote Write two-hour WAL behavior](https://prometheus.io/docs/practices/remote_write/#remote-write-characteristics)
- [Prometheus local WAL storage](https://prometheus.io/docs/prometheus/latest/storage/#local-storage)
- [Prometheus current command-line flags](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
- [Prometheus Agent mode](https://prometheus.io/docs/prometheus/latest/prometheus_agent/)
- [Prometheus Remote Write queue and sample-age configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus Remote Write 2.0 retry semantics](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/#retries--backoff)
- [Prometheus WAL watcher implementation](https://github.com/prometheus/prometheus/blob/main/tsdb/wlog/watcher.go)
