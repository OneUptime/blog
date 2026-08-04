# How to Measure Remote Write Lag, Pending Samples, Retries, and Data Loss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, Monitoring, Lag, Retries, Data Loss, PromQL

Description: Build a Remote Write dashboard and alerts with accurate queue, timestamp, retry, failure, drop, shard, WAL, and receiver-side signals.

---

Remote Write health cannot be represented by one metric. A queue can have few in-memory pending samples while its WAL watcher is far behind. Retries can be high without loss if the endpoint recovers. A zero retry rate can be bad when the receiver returns non-recoverable HTTP 4xx responses and samples fail immediately.

A useful dashboard answers four separate questions:

1. How far behind is each destination?
2. Is its in-memory queue applying backpressure?
3. Are requests being retried or permanently failed?
4. Is there evidence of intentional or unintentional sample loss?

## Label Every Queue

Set a unique `name` on every destination:

```yaml
remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
```

Prometheus adds `remote_name` and `url` labels to queue metrics. Without a name, it generates one from the configuration, which is harder to use in durable dashboards and alerts.

## Measure Lag with Timestamps

### Time Since the Highest Sent Timestamp

For a continuously active source:

```promql
time()
-
prometheus_remote_storage_queue_highest_sent_timestamp_seconds{
  remote_name="central"
}
```

Prometheus describes this gauge as the highest sample timestamp successfully sent by the queue. In the current queue manager, however, it also advances after a terminal non-recoverable send error. Treat the expression as a lag signal during normal successful operation, not as proof of delivery, and always pair it with the failure counters. If scrapes occur every 15 seconds and batches wait up to 5 seconds, a small nonzero value is normal.

It produces false alarms for an idle or very low-volume source because no newer sample exists to advance the timestamp. Gate it on ingestion known to survive this queue's write relabeling. The global head-ingestion metric below is only a coarse gate; a route-specific heartbeat is more precise:

```promql
(
  time()
  - prometheus_remote_storage_queue_highest_sent_timestamp_seconds{
      remote_name="central"
    }
) > 120
and on ()
rate(prometheus_tsdb_head_samples_appended_total[5m]) > 0
```

### Queue-Observed Timestamp Gap

```promql
prometheus_remote_storage_queue_highest_timestamp_seconds{
  remote_name="central"
}
-
prometheus_remote_storage_queue_highest_sent_timestamp_seconds{
  remote_name="central"
}
```

The first gauge is the highest timestamp enqueued and the second is the highest timestamp sent, subject to the terminal-failure caveat above. During successful operation, their difference measures the timestamp span currently visible to that queue.

When a shard is full, the WAL watcher can stop before reading newer records. The enqueued timestamp then does not represent the WAL tail, so this gap can understate total end-to-end lag. Combine it with `time() - highest sent`, queue-full evidence, and WAL watcher position.

The older `prometheus_remote_storage_highest_timestamp_in_seconds` metric represents timestamps entering Remote Write through its appender interface, but current source marks it deprecated in favor of the per-queue timestamp. Do not build a new dashboard solely around the deprecated gauge.

## Measure Pending Samples and Backpressure

```promql
prometheus_remote_storage_samples_pending{remote_name="central"}
```

Pending samples are queued or in an in-flight or retrying batch. The gauge is decremented when the batch reaches a terminal outcome. Trend it rather than alerting on any nonzero value; ordinary batching creates a small queue.

Direct queue-full evidence is:

```promql
rate(
  prometheus_remote_storage_enqueue_retries_total{
    remote_name="central"
  }[5m]
)
```

The queue manager defines this as failed enqueue attempts caused by a full shard queue.

Add shard context:

```promql
prometheus_remote_storage_shards{remote_name="central"}
```

```promql
prometheus_remote_storage_shards_desired{remote_name="central"}
```

```promql
prometheus_remote_storage_shards_max{remote_name="central"}
```

If desired shards persist at or above the maximum while lag grows, the sender wants more concurrency. That does not prove that raising the maximum is safe; the receiver may already be saturated.

## Interpret Send and Retry Counters

### Send Attempts

```promql
rate(
  prometheus_remote_storage_samples_total{
    remote_name="central"
  }[5m]
)
```

Current Prometheus increments this counter for each batch send attempt, including repeated attempts. It is useful for queue activity but should not be treated as a count of distinct samples durably stored at the receiver.

### Retried Samples

```promql
rate(
  prometheus_remote_storage_samples_retried_total{
    remote_name="central"
  }[5m]
)
```

This counts samples in batches scheduled for another attempt after a recoverable error. The same sample can be counted on several retries. A spike means instability or throttling, not the same number of lost samples.

Prometheus retries transport errors and HTTP 5xx responses with backoff. HTTP 429 is retried only when `retry_on_http_429: true`; its current default is false.

### Batch Duration

```promql
histogram_quantile(
  0.95,
  sum by (le, remote_name) (
    rate(prometheus_remote_storage_sent_batch_duration_seconds_bucket[5m])
  )
)
```

This histogram records send-call duration. Rising latency can precede pending samples and shard growth.

### Compressed Bytes

```promql
rate(prometheus_remote_storage_bytes_total{remote_name="central"}[5m])
```

This counter records the compressed data-request size once when a batch finishes send processing; it does not count every retry attempt. Separately sent Remote Write 1.0 metadata uses `prometheus_remote_storage_metadata_bytes_total`. Use these counters alongside samples to detect changed payload efficiency or exemplar and metadata behavior, and use network-level counters to confirm saturation. They do not represent receiver storage size.

## Measure Permanent Failures and Drops

### Non-Recoverable Send Failures

```promql
increase(
  prometheus_remote_storage_samples_failed_total{
    remote_name="central"
  }[15m]
)
```

This counter tracks samples that were not written after a terminal non-recoverable outcome, including known partial writes. It also includes samples still pending when a hard shutdown drops the shard queues. HTTP 400, 401, 403, and unsupported-content errors normally belong here. Any increase deserves investigation because retrying the unchanged request is not expected to succeed.

When using a Remote Write 1.0 message, Prometheus treats a 2xx response without written-count headers as full-batch success. Remote Write 2.0 adds written-count response headers for samples, histograms, and exemplars, allowing a compatible sender to identify partial or empty writes more accurately.

### Samples Dropped Before Send

```promql
sum by (remote_name, reason) (
  increase(prometheus_remote_storage_samples_dropped_total[15m])
)
```

Current Prometheus source defines these sample-drop reasons:

- `dropped_series` for write relabel filtering;
- `too_old` for `sample_age_limit`;
- `unintentionally_dropped_series` for an unknown WAL series reference.

Native histograms with custom buckets that cannot be represented in a Remote Write 1.0 message use a separate counter:

```promql
increase(
  prometheus_remote_storage_histograms_dropped_total{
    reason="nhcb_in_rw1_not_supported"
  }[15m]
)
```

`dropped_series` may be an intentional cost-control policy. Alert on changes from its expected rate, not necessarily on zero. `too_old`, unknown references, and unsupported data types require explicit review. Monitor the corresponding exemplar and histogram drop counters when those data types are in use.

## Watch WAL Reader Progress

Prometheus exposes:

```promql
prometheus_wal_watcher_current_segment{consumer="central"}
```

The `consumer` label identifies the Remote Write queue. Compare queue consumers with one another and inspect the latest on-disk WAL segment when diagnosing a suspected unread backlog. A stalled consumer segment together with active ingestion and rising send age shows that the in-memory pending gauge is not the whole queue.

Also alert on:

```promql
increase(prometheus_wal_watcher_record_decode_failures_total[15m])
```

The watcher source warns that read/decode problems may drop data. Preserve relevant logs because counters rarely describe which series or time range was affected.

## There Is No Perfect Data-Loss Gauge

No single sender metric proves complete end-to-end durability. Reasons include:

- a receiver can acknowledge data it accepted and still fail before durable storage; even the 2.0 written-count headers confirm acceptance as defined by the receiver, not persistence;
- samples can age out when the WAL is compacted after a long endpoint outage;
- a receiver can enforce retention or reject data under its own limits;
- write relabeling may intentionally remove data;
- a sender crash can happen at a protocol boundary;
- queries may hide data through tenant, label, or time selection mistakes.

Use a layered loss check:

1. Sender: failed and dropped counters stay at their expected values.
2. Sender: lag and WAL watcher position recover within the retention window.
3. Receiver: accepted, rejected, rate-limited, and out-of-order counters are healthy.
4. Data plane: a low-cardinality heartbeat series from every source appears at the receiver within a defined delay.
5. Business plane: representative recording rules or SLO inputs are present and continuous.

The heartbeat should traverse the same scrape, relabel, authentication, Remote Write, tenant, and storage path as production metrics.

## Suggested Alerts

Sustained active-source lag:

```promql
(
  time()
  - prometheus_remote_storage_queue_highest_sent_timestamp_seconds
) > 300
and on ()
rate(prometheus_tsdb_head_samples_appended_total[5m]) > 0
```

Non-recoverable failures:

```promql
increase(prometheus_remote_storage_samples_failed_total[10m]) > 0
```

Unintentional, age-based, or unsupported-histogram drops:

```promql
increase(
  prometheus_remote_storage_samples_dropped_total{
    reason=~"too_old|unintentionally_dropped_series"
  }[10m]
) > 0
or
increase(
  prometheus_remote_storage_histograms_dropped_total{
    reason="nhcb_in_rw1_not_supported"
  }[10m]
) > 0
```

Full-queue pressure:

```promql
rate(prometheus_remote_storage_enqueue_retries_total[5m]) > 0
```

Tune thresholds to scrape interval, batch deadline, traffic shape, and recovery objectives. Keep `remote_name` and `url` in alert labels so responders know which destination is affected.

## Official Documentation

- [Prometheus Remote Write tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus Remote Write configuration and queue defaults](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus queue manager metric definitions](https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go)
- [Prometheus WAL watcher metric definitions](https://github.com/prometheus/prometheus/blob/main/tsdb/wlog/watcher.go)
- [Prometheus Remote Write 1.0 response and retry semantics](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus Remote Write 2.0 written-count headers](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/#required-written-response-headers)
- [Prometheus local WAL storage](https://prometheus.io/docs/prometheus/latest/storage/#local-storage)
