# Prometheus Remote Write Gets HTTP 429: When to Retry and When to Reduce Load

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, HTTP 429, Rate Limiting, Backoff, Capacity Planning

Description: Decide whether Remote Write throttling is transient or structural, configure optional 429 retries, and keep catch-up traffic within receiver capacity.

---

HTTP 429 means the receiving HTTP layer is deliberately refusing the current request rate or volume. It may be enforcing samples per second, active series, request concurrency, tenant quota, or a gateway policy.

Prometheus does **not** retry Remote Write 429 responses by default. This is intentional. Retrying protects data during a brief overload, but it can trap the sender in an ever-growing backlog when the receiver's allowed rate is permanently lower than the source rate.

The right response depends on one equation:

```text
sustainable receiver allowance > ongoing source rate + required catch-up rate
```

If that inequality cannot become true, retrying only delays loss.

## Understand the Default Behavior

The current configuration default is:

```yaml
remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
    queue_config:
      retry_on_http_429: false
```

With the default, Prometheus treats 429 as non-recoverable. The affected batch is removed from the pending queue, and any samples the receiver did not report as written are counted as failed. Watch:

```promql
increase(
  prometheus_remote_storage_samples_failed_total{
    remote_name="central"
  }[10m]
)
```

This favors forward progress over repeatedly sending data a rate-limited endpoint is not expected to accept.

The Remote Write 2.0 specification explicitly allows a sender to retry or not retry 429. In contrast, senders must retry 5xx failures with backoff. The distinction recognizes that receiver overload may be caused by a sender whose steady rate is simply too high.

## Enable Retry for Transient Throttling

When the receiver documents 429 as a temporary signal and has catch-up headroom, enable:

```yaml
remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
    queue_config:
      retry_on_http_429: true
      min_backoff: 100ms
      max_backoff: 10s
```

Current Prometheus treats 429 as a recoverable error only with this option. It then retries the batch rather than advancing past it.

Prometheus's client implementation recognizes both valid `Retry-After` forms:

```http
Retry-After: 15
```

and:

```http
Retry-After: Mon, 03 Aug 2026 12:00:15 GMT
```

When the header is valid and in the future, the sender uses that duration for the next retry. Without a usable header, it uses the configured exponential backoff. This behavior is documented in the official Prometheus source; confirm it against the version you run.

Retry is appropriate for:

- a short tenant burst above an otherwise sufficient average quota;
- a receiver rollout that temporarily reduces capacity;
- an autoscaling delay with proven later headroom;
- a documented concurrency limiter that clears quickly;
- a shared gateway that supplies a meaningful `Retry-After` value.

## Reduce Load for Structural Throttling

Suppose a source produces 120,000 samples per second and the tenant is limited to 80,000. Backlog grows by at least:

```text
120,000 - 80,000 = 40,000 samples/s
```

No backoff value can make this converge. With 429 retries enabled, the sender eventually reaches a full queue, falls behind its WAL, and loses samples when they become unrecoverable or exceed `sample_age_limit`.

Choose one or more structural fixes:

- raise the receiver quota after verifying infrastructure capacity;
- reduce series through scrape or metric relabeling;
- filter unused outbound series with `write_relabel_configs`;
- lengthen scrape intervals where the monitoring objective permits;
- split intentionally isolated tenants or backends according to receiver design;
- reduce duplicate HA ingestion through supported receiver-side deduplication;
- remove accidental fan-out or Remote Write loops;
- scale the receiver's ingest path and storage.

Do not merely add sender shards. More concurrent requests often trigger the limiter more aggressively. Current Prometheus queue code disables resharding while it waits on recoverable errors specifically because scaling up during rate limiting can make the problem worse.

## Identify Which Layer Returns 429

Capture the response status, headers, and bounded body from sender logs or a controlled request. The response often names the limit:

```text
tenant ingestion rate exceeded
too many requests in flight
active series limit exceeded
request body rate exceeded
gateway rate limit
```

Check each layer:

```text
Prometheus -> egress proxy -> load balancer -> auth gateway -> receiver distributor -> storage
```

A CDN or WAF limit on HTTP requests per second has a different fix from a metrics backend limit on samples per second. Increasing `max_samples_per_send` may reduce request count for the former, but could worsen body-size or per-request limits.

Use the receiver's official metrics and logs to identify:

- rejected samples or requests by tenant and reason;
- configured ingestion and burst limits;
- concurrent request saturation;
- receiver CPU, memory, network, and storage latency;
- autoscaler maximums and scale-up delay.

## Calculate Whether Catch-Up Is Possible

An outage or throttling period creates a backlog while new samples continue arriving. Let:

```text
R = live source sample rate
C = sustainable receiver allowance
B = backlog samples
```

Catch-up time, when `C > R`, is approximately:

```text
B / (C - R)
```

At 80,000 live samples per second, a 48-million-sample backlog, and 120,000 samples per second of receiver capacity:

```text
48,000,000 / (120,000 - 80,000) = 1,200 seconds = 20 minutes
```

If the receiver's limiter allows only the live rate, catch-up time is infinite. Reserve explicit burst or recovery capacity.

## Tune Batching Before Concurrency

If the limit is requests per second rather than samples per second, larger supported batches can improve efficiency:

```yaml
queue_config:
  capacity: 25000
  max_samples_per_send: 5000
  max_shards: 20
```

This example keeps five batches of capacity per shard and caps concurrency below the current default. It is only safe if the receiver and proxies accept that batch size.

If the receiver limits samples per second, batch size changes request count but not the underlying sample rate. If it limits bytes, compression ratio and label cardinality matter. Match tuning to the actual limiter.

## Bound Stale Replay Only by Policy

A sample age limit can stop a recovered sender from spending capacity on very old data:

```yaml
queue_config:
  retry_on_http_429: true
  sample_age_limit: 30m
```

Once a sample is older than 30 minutes, Prometheus drops it and increments the dropped counter with `reason="too_old"`. This can restore current visibility sooner, but it deliberately creates a historical gap. Set it from a documented freshness objective, not as a hidden workaround for inadequate capacity.

## Monitor the Two Modes Differently

With retry disabled, alert on permanent failures:

```promql
increase(
  prometheus_remote_storage_samples_failed_total{
    remote_name="central"
  }[5m]
) > 0
```

With retry enabled, alert on retry pressure and lag:

```promql
rate(
  prometheus_remote_storage_samples_retried_total{
    remote_name="central"
  }[5m]
) > 0
```

```promql
(
  time()
  - prometheus_remote_storage_queue_highest_sent_timestamp_seconds{
      remote_name="central"
    }
) > 300
```

Also watch:

```promql
prometheus_remote_storage_samples_pending{remote_name="central"}
```

```promql
rate(
  prometheus_remote_storage_enqueue_retries_total{
    remote_name="central"
  }[5m]
)
```

```promql
increase(
  prometheus_remote_storage_samples_dropped_total{
    remote_name="central",
    reason="too_old"
  }[10m]
)
```

The retry counter counts retry attempts, so one sample can contribute more than once. Do not interpret it as a unique lost-sample count.

## A Safe Decision Process

1. Identify the component and exact limit returning 429.
2. Measure source rate against sustained and burst allowance.
3. Calculate required catch-up capacity and WAL time.
4. If the event is transient and capacity is sufficient, enable retry and honor receiver backoff.
5. If the deficit is sustained, reduce data or increase receiver allowance first.
6. Load test recovery while live ingestion continues.
7. Alert far before the backlog reaches the WAL or sample-age boundary.

Retry preserves a batch only while the surrounding system can eventually accept it. Capacity planning, not a boolean setting, determines whether 429 recovery succeeds.

## Official Documentation

- [Prometheus Remote Write queue configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus Remote Write 2.0 retry and 429 semantics](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/#retries--backoff)
- [Prometheus Remote Write 1.0 retry semantics](https://prometheus.io/docs/specs/prw/remote_write_spec/#retries--backoff)
- [Prometheus Remote Write client 429 and Retry-After handling](https://github.com/prometheus/prometheus/blob/main/storage/remote/client.go)
- [Prometheus queue retry and reshard behavior](https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go)
- [Prometheus Remote Write tuning](https://prometheus.io/docs/practices/remote_write/)
