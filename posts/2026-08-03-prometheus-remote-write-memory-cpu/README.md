# Why Remote Write Increases Prometheus Memory and CPU: How to Control It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, Memory, CPU, Cardinality, Performance Tuning

Description: Attribute Remote Write resource growth to series caches, shard queues, WAL work, encoding, compression, retries, and fan-out, then reduce the right cost.

---

Remote Write is not a socket that forwards scrape bytes unchanged. Prometheus stores samples in its WAL, resolves series references to labels, applies external labels and write relabeling, builds protobuf batches, compresses them with Snappy, and manages parallel HTTP retries for every destination.

That work consumes memory and CPU in addition to the local TSDB. The official tuning guide reports that many users observe roughly 25% more memory with Remote Write, while emphasizing that the result depends on data shape. High series churn, many destinations, and oversized queues can push the increase much higher.

## Where the Memory Goes

### Series Reference to Label Caches

WAL sample records refer to series by numeric IDs. Remote Write needs the final label set to construct a protocol request, so each queue caches series-ID-to-label mappings from WAL series records.

The tuning documentation identifies this cache as a major memory source. Churn is particularly costly: short-lived Pods, per-request IDs, unbounded paths, and frequently changing labels create many series mappings even when current sample volume looks moderate.

Every destination has its own queue manager and write relabel policy. Full fan-out can therefore duplicate significant per-destination state.

### Shard Queues and Active Batches

Queue memory scales approximately with:

```text
active shards * (capacity + max_samples_per_send)
```

With current defaults:

```yaml
queue_config:
  capacity: 10000
  max_samples_per_send: 2000
  max_shards: 50
```

Prometheus dynamically uses fewer than `max_shards` when possible, so the maximum is not normally allocated at all times. During lag it can scale up, fill more queues, and approach a higher memory peak.

The official guide says the default capacity and batch values constrain shard queue memory to less than 2 MB per shard. That estimate does not include the series cache or all Go object overhead.

### Retry and Outage Backlog

When the receiver slows, shard queues fill with pending samples and retain batches across retries. The disk-backed remainder stays in the WAL only until WAL truncation; the official guide warns that data not sent during an outage longer than two hours can be lost. The in-memory queues still reach their configured bound. Memory planning must include a receiver outage, not only a healthy steady state.

### Extra Data Types

Exemplars, metadata, and native histograms add data to encode and transmit. Remote Write 1.0 controls exemplar and native-histogram sending with explicit options; the 2.0 message sends metadata and native histograms by design when that data is available, while exemplar sending remains configurable in Prometheus.

## Where the CPU Goes

For each destination, Prometheus performs:

1. WAL decoding and series lookup;
2. external-label application and relabel evaluation;
3. protobuf message construction;
4. Snappy compression;
5. HTTP and TLS processing;
6. retry and dynamic-shard bookkeeping.

More samples increase repeated encoding work. More series and longer labels increase label processing and payload size. More destinations repeat most of the outbound pipeline. Retries resend batches and can increase CPU exactly when the receiver is unhealthy.

CPU limits can create a feedback loop:

```text
CPU throttling -> slower batch construction/send -> lag -> more shards/queues
              -> more concurrent work -> more throttling
```

Increasing `max_shards` during sender CPU saturation makes this worse.

## Measure Before Changing Configuration

### Process Memory and CPU

```promql
process_resident_memory_bytes{job="prometheus"}
```

```promql
go_memstats_heap_inuse_bytes{job="prometheus"}
```

```promql
rate(process_cpu_seconds_total{job="prometheus"}[5m])
```

Compare healthy, rollout, high-churn, and receiver-outage periods. Container working set, OOM events, and CPU throttling are also important because process metrics may not show the complete cgroup limit picture.

### Local Cardinality and Churn

```promql
prometheus_tsdb_head_series{job="prometheus"}
```

```promql
rate(prometheus_tsdb_head_series_created_total{job="prometheus"}[5m])
```

```promql
rate(prometheus_tsdb_head_series_removed_total{job="prometheus"}[5m])
```

A stable head-series count can hide high churn when creation and removal rates are both high.

### Queue Shape

```promql
prometheus_remote_storage_shards
```

```promql
prometheus_remote_storage_samples_pending
```

```promql
prometheus_remote_storage_shard_capacity
```

```promql
prometheus_remote_storage_max_samples_per_send
```

Break these down by `remote_name` and `url` to find an expensive destination.

### Outbound Work

```promql
rate(prometheus_remote_storage_samples_total[5m])
```

```promql
rate(prometheus_remote_storage_samples_retried_total[5m])
```

```promql
rate(prometheus_remote_storage_bytes_total[5m])
```

`samples_total` counts send attempts, including retry attempts. It is an activity signal, not a distinct-sample durability counter.

## Reduce Cardinality at the Earliest Safe Stage

The most powerful fix is to stop ingesting unused high-cardinality series:

```yaml
scrape_configs:
  - job_name: application
    static_configs:
      - targets: [application:9100]
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'request_debug_.*'
        action: drop
```

Metric relabeling happens before local ingestion, so it reduces local TSDB, WAL, and Remote Write work. Confirm that local rules, dashboards, and alerts do not need the dropped metrics.

Prefer removing unbounded labels in instrumentation. Relabeling that deletes an identifying label can merge two series, so it is safer to fix the source or drop an entire unused metric family.

## Filter Only the Remote Destination When Local Detail Is Needed

```yaml
remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [__name__]
        regex: 'job:.*|cluster:.*|up'
        action: keep
```

This preserves detailed local data while reducing the outbound set. Prometheus still ingests and writes the raw samples to its local WAL, so write relabeling cannot eliminate local TSDB cost. It does reduce work and state for samples excluded from that Remote Write route.

Use local recording rules to pre-aggregate, then send their results when a full Prometheus is available. Agent mode cannot evaluate recording rules.

## Reduce Sample Frequency Where Semantics Permit

Longer scrape intervals reduce samples, encoding, network, and receiver ingestion:

```yaml
scrape_configs:
  - job_name: slow-changing-inventory
    scrape_interval: 60s
```

This does not necessarily reduce active series or label-cache entries. It also changes alert detection time, rate resolution, and staleness behavior. Set intervals from monitoring objectives, not only CPU cost.

## Bound Queue Memory

If memory peaks when a destination is down, reduce its maximum concurrency and keep capacity at a few batches per shard:

```yaml
remote_write:
  - name: secondary
    url: https://secondary.example.net/api/v1/write
    queue_config:
      capacity: 10000
      max_samples_per_send: 2000
      max_shards: 15
```

The official tuning guide recommends capacity around 3 to 10 times batch size. Lowering `max_shards` limits parallelism and potential queue memory, but it may reduce catch-up throughput. Load test the receiver-outage and recovery path.

Do not solve OOMs by setting a tiny capacity without checking backpressure. A full shard blocks the destination's WAL reader sooner and can shorten practical recovery margin.

## Improve Batch Efficiency

Larger supported batches can reduce per-request CPU and HTTP overhead:

```yaml
queue_config:
  capacity: 25000
  max_samples_per_send: 5000
```

This keeps five batches of buffer per shard. Larger batches can increase compression working memory, request latency, retry cost, and receiver pressure. Measure total CPU, p99 batch duration, request errors, and bytes per sample rather than assuming bigger is better.

## Remove Unnecessary Fan-Out

Two unfiltered destinations perform approximately two outbound pipelines and pay two receiver bills. If a secondary exists only for critical recovery data, filter it to recording-rule outputs. If it is intended as a full DR copy, include its memory, CPU, network, and outage queue in capacity planning.

Do not configure two URLs to the same logical replicated backend unless its official client architecture requires it. A backend load-balanced endpoint usually owns replication more efficiently.

## Consider Agent Mode at the Edge

Prometheus Agent mode removes the queryable local TSDB, rule evaluation, and alerting and uses a forwarding-focused WAL. This can substantially reduce edge resource use when all queries and rules run centrally.

It still scrapes, keeps series state, writes an Agent WAL, and runs Remote Write queues. It is not zero-memory or zero-CPU, and it trades away local visibility during a central outage.

## Test the Worst Case

A useful capacity test includes:

1. normal sample rate and cardinality;
2. a high-churn deployment rollout;
3. all configured destinations active;
4. one destination unavailable until queues fill;
5. recovery with live traffic and backlog;
6. a Prometheus restart and WAL replay.

Measure peak resident memory, CPU throttling, queue lag, receiver load, and time to recover. A steady-state benchmark misses the conditions most likely to cause an OOM.

## Official Documentation

- [Prometheus Remote Write resource characteristics](https://prometheus.io/docs/practices/remote_write/#remote-write-characteristics)
- [Prometheus Remote Write queue configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus metric relabel configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- [Prometheus relabel actions and uniqueness warning](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config)
- [Prometheus Remote Write queue implementation](https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go)
- [Prometheus Agent mode](https://prometheus.io/docs/prometheus/latest/prometheus_agent/)
- [Prometheus Remote Write 2.0 message design](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/#io-prometheus-write-v2-request)
