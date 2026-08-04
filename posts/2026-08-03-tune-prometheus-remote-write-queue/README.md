# Tuning Remote Write `capacity`, Shards, Batch Size, and Backoff

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, Queue Tuning, Sharding, Batching, Backoff, Performance

Description: Tune Prometheus Remote Write from measured ingestion, request latency, receiver limits, memory, and outage catch-up requirements instead of copying arbitrary values.

---

Prometheus Remote Write defaults are designed to work for many installations. Tuning is justified when measurements show a specific constraint: sustained lag, receiver overload, excessive request overhead, high queue memory, or an unacceptable catch-up time.

Every parameter changes a different part of the path:

```text
WAL -> per-shard capacity -> batch size/deadline -> HTTP timeout -> retry backoff
            memory             efficiency          request       recovery pressure
```

Changing several values at once makes the result hard to explain. Establish a baseline, identify the bottleneck, and alter one limiting dimension at a time.

## Know the Current Defaults

The current Prometheus configuration reference documents:

```yaml
remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
    remote_timeout: 30s
    queue_config:
      capacity: 10000
      max_shards: 50
      min_shards: 1
      max_samples_per_send: 2000
      batch_send_deadline: 5s
      min_backoff: 30ms
      max_backoff: 5s
      retry_on_http_429: false
      sample_age_limit: 0s
```

Omit values you do not need to override. Explicitly copying every default freezes assumptions in your configuration and can hide improved defaults after an upgrade.

## `capacity`: Absorb Jitter, Not an Outage

`capacity` is the number of samples buffered in memory **per shard** before a full shard blocks the WAL reader for that destination.

The official tuning guide recommends capacity at roughly 3 to 10 times `max_samples_per_send`. With the defaults:

```text
10000 / 2000 = 5 batches per shard
```

This gives a shard several queued requests to smooth ordinary latency variation.

Approximate queue sample slots are:

```text
active shards * (capacity + max_samples_per_send)
```

The official guide reports less than 2 MB per shard for the default 10,000 capacity and 2,000-sample batch, but total Remote Write memory also includes a series-ID-to-label cache whose size depends strongly on series churn.

Raise capacity when brief latency spikes repeatedly cause `prometheus_remote_storage_enqueue_retries_total`, while average receiver throughput is demonstrably sufficient. Lower it, often together with `max_shards`, when backed-up queues consume too much memory.

Do not size capacity for a one-hour outage. The WAL provides temporary durable replay; an in-memory queue large enough for an outage would consume excessive RAM and still be finite.

## `min_shards`: Startup Parallelism

Prometheus starts a queue with `min_shards` and continuously calculates desired shards from incoming rate, backlog, and send time. The default is one.

Most installations should let automatic scaling work. Raise `min_shards` only when evidence shows a predictable high-volume queue falls behind during the initial calculation period and the receiver safely accepts more concurrent requests.

Too high a minimum causes unnecessary concurrent requests during quiet periods and can increase connection, CPU, and memory use.

## `max_shards`: Bound Concurrency

`max_shards` is the maximum number of parallel sender shards for one destination. It is both a throughput ceiling and receiver-protection limit.

Inspect:

```promql
prometheus_remote_storage_shards
```

```promql
prometheus_remote_storage_shards_desired
```

```promql
prometheus_remote_storage_shards_max
```

If lag grows while desired shards remain at the maximum, sender parallelism may be limiting throughput. Before raising it, prove that:

- receiver CPU, memory, ingestion, and storage are below safe limits;
- proxy and receiver concurrency limits allow more requests;
- sender CPU and network have headroom;
- request failures and 429 responses are not already rising.

If the receiver is overloaded, lower `max_shards` or reduce input volume. More shards against a saturated service increase contention and can worsen recovery.

## Estimate Required Shards

A rough ideal throughput per shard is:

```text
batch samples / request duration seconds
```

For a 2,000-sample batch taking 0.2 seconds:

```text
2000 / 0.2 = 10,000 samples/s per shard
```

At 80,000 samples per second, the idealized calculation suggests eight continuously full shards. Real throughput is lower because batches may not fill, retries occur, series distribution is uneven, and CPU/network work adds overhead. Keep measured headroom for catch-up instead of treating the formula as a capacity guarantee.

Prometheus already performs a dynamic calculation. Use this estimate to sanity-check observed desired shards, not to force a fixed shard count.

## `max_samples_per_send`: Request Efficiency

Larger batches reduce HTTP, TLS, protobuf, and compression overhead per sample. They also create larger requests, longer individual processing, more data retried after an error, and greater sensitivity to receiver body or validation limits.

Increase `max_samples_per_send` when:

- batches usually fill;
- request overhead is material;
- receiver documentation and load tests support larger batches;
- request latency and error rate remain stable.

Reduce it when requests hit size limits, receiver memory spikes, latency has a long tail, or large retry batches create bursts.

After changing it, keep capacity in the recommended multiple. A 5,000-sample batch with capacity 10,000 provides only two full batches of buffering per shard.

## `batch_send_deadline`: Latency Versus Efficiency

The deadline is the maximum time a sample waits for its shard to send a partially filled batch. The batch goes earlier when it reaches `max_samples_per_send`.

For a low-volume queue, increasing the deadline can create fuller, more efficient requests but adds delivery latency. Decreasing it sends fresher, smaller requests and increases per-request overhead.

The deadline is not the request timeout. After a send begins, `remote_timeout` controls how long the HTTP request may take, and retry backoff can add further delay.

## `remote_timeout`: Bound One HTTP Request

The current default is 30 seconds:

```yaml
remote_timeout: 30s
```

Set it above normal high-percentile receiver latency plus expected network variance, but below an operational bound that allows a stuck shard to recover. Align ingress and load-balancer timeouts so a proxy is not guaranteed to close every request before Prometheus's timeout.

Increasing the timeout helps only if slow requests eventually succeed and retaining the connection is desirable. It reduces throughput while a shard waits and can delay retries. A receiver whose normal writes need tens of seconds usually needs capacity or request-size work.

## `min_backoff` and `max_backoff`: Recovery Pressure

For recoverable failures without a positive `Retry-After` response delay, Prometheus begins at `min_backoff`, doubles the delay after each failure, and caps it at `max_backoff`. For a retried 429 or 5xx response with a positive `Retry-After` delay, Prometheus uses the header's value for the next delay.

```yaml
queue_config:
  min_backoff: 100ms
  max_backoff: 10s
```

This example is more conservative than current defaults and may reduce pressure on a fragile receiver. It also waits longer to retry and can increase lag during brief faults.

Use larger backoff when many Prometheus servers reconnect to one endpoint and create a retry storm. Use smaller bounds only when the receiver can absorb fast recovery attempts. The Remote Write 2.0 specification requires backoff for 5xx retries but does not prescribe one universal timing profile.

Do not expect backoff to solve a sustained throughput deficit. It deliberately sends less often while errors persist.

## `retry_on_http_429`: A Capacity Decision

Prometheus retries HTTP 5xx by default but currently does not retry 429 unless enabled:

```yaml
queue_config:
  retry_on_http_429: true
```

Enable it only when 429 is a transient receiver signal and enough capacity exists to catch up. If the receiver continuously rate-limits below the source's sample rate, retrying retains an ever-growing backlog until the WAL window or age limit is exceeded.

## `sample_age_limit`: Bound Stale Catch-Up

The default `0s` sends all samples still recoverable from the WAL. A nonzero limit drops older samples:

```yaml
queue_config:
  sample_age_limit: 30m
```

This can protect a receiver from a huge stale replay and prioritize current visibility, but it explicitly trades historical completeness for recovery speed. Monitor `prometheus_remote_storage_samples_dropped_total{reason="too_old"}`.

## Baseline Before Tuning

Record at least:

- local appended samples per second;
- Remote Write pending samples and enqueue retries;
- current, desired, and maximum shards;
- p50, p95, and p99 send-batch duration;
- retried and failed sample counts, and dropped samples by reason;
- compressed bytes per second;
- sender CPU, memory, network, and WAL disk use;
- receiver request latency, accepted rate, 429/5xx rate, and limits.

A configuration change is successful only if lag and error objectives improve without violating sender or receiver resource budgets.

## Example Experiments

For a backend proven to accept 5,000-sample batches but where default request overhead is high:

```yaml
queue_config:
  capacity: 25000
  max_samples_per_send: 5000
  max_shards: 30
```

Capacity remains five batches per shard. The lower-than-default shard cap controls worst-case concurrency, but whether 30 is safe depends entirely on the endpoint.

For a low-volume route where a five-second batch-send deadline matters more than request efficiency, leave the defaults. For an archival route where a ten-second batch-send deadline is acceptable, test:

```yaml
queue_config:
  capacity: 5000
  max_samples_per_send: 1000
  batch_send_deadline: 10s
  max_shards: 10
```

These are experiment starting points, not production presets.

## Validate Catch-Up, Not Just Steady State

Load tests should include:

1. normal steady ingestion;
2. a short latency spike;
3. a complete receiver outage;
4. recovery while new samples continue;
5. rate limiting and 5xx responses;
6. a configuration reload and sender restart.

Measure how quickly lag returns to normal. A receiver that handles exactly the live sample rate has no headroom to clear backlog. The correct queue settings cannot compensate for missing catch-up capacity.

## Official Documentation

- [Prometheus Remote Write tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus Remote Write queue configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus Remote Write queue implementation](https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go)
- [Prometheus Remote Write queue metric definitions](https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go#L69-L333)
- [Prometheus Remote Write 2.0 retry and backoff semantics](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/#retries--backoff)
- [Prometheus local WAL storage](https://prometheus.io/docs/prometheus/latest/storage/#local-storage)
