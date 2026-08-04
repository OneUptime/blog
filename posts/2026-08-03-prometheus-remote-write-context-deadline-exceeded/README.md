# Remote Write Context Deadline Exceeded: Finding the Bottleneck

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, Context Deadline Exceeded, Timeout, Network, Troubleshooting

Description: Locate Remote Write timeout latency across DNS, connection, TLS, upload, proxy, receiver processing, and storage before changing the request deadline.

---

`context deadline exceeded` means a Remote Write HTTP operation did not complete before its request context expired. The current Prometheus `remote_timeout` default is 30 seconds. That deadline can be consumed by DNS resolution, TCP connection, TLS, uploading the compressed body, proxy queuing, receiver validation, replication, storage, or waiting for the response.

The error identifies a time budget, not the slow component. Increasing the timeout may reduce errors when slow requests eventually succeed, but it also leaves a shard blocked longer and can hide a receiver that cannot sustain the source rate.

## Distinguish the Three Relevant Timers

```yaml
remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
    remote_timeout: 30s
    queue_config:
      batch_send_deadline: 5s
      min_backoff: 30ms
      max_backoff: 5s
```

They have separate purposes:

- `batch_send_deadline` bounds how long a sample waits for a partially filled shard batch to be sent;
- `remote_timeout` bounds one HTTP request;
- retry backoff controls delay before another attempt after a recoverable failure.

Changing `batch_send_deadline` does not extend an in-flight HTTP request. Changing backoff does not make the receiver respond faster.

## What Prometheus Does After the Timeout

Prometheus treats HTTP client errors, including a request deadline, as recoverable. The shard retains the batch and retries with backoff. While it waits, new samples continue to fill that shard's queue. If the queue fills, the WAL watcher for that destination blocks and total lag grows.

Watch the combination:

```promql
rate(prometheus_remote_storage_samples_retried_total{remote_name="central"}[5m])
```

```promql
prometheus_remote_storage_samples_pending{remote_name="central"}
```

```promql
time()
-
prometheus_remote_storage_queue_highest_sent_timestamp_seconds{
  remote_name="central"
}
```

A single retry without sustained lag can be network noise. Rising retries, pending samples, and timestamp age together indicate a throughput problem.

## Map the Complete Request Path

Write down every hop:

```text
Prometheus
  -> local DNS and egress
  -> service mesh or proxy
  -> external load balancer
  -> authentication gateway
  -> receiver distributor
  -> ingester or storage quorum
```

Each hop may have its own connect, idle, body, upstream, or response timeout. A proxy with a 15-second upstream timeout may return 504 before Prometheus reaches its 30-second deadline. Conversely, a proxy may keep a connection open while its upstream is stalled until Prometheus cancels at 30 seconds.

Correlate one request across layers using timestamps, receiver tenant, source address, and tracing if supported. Do not put tokens or compressed bodies in diagnostic logs.

## Test from the Actual Sender Network

### DNS and Connection Setup

```bash
getent ahosts metrics.example.net
```

```bash
curl --silent --show-error \
  --output /dev/null \
  --write-out 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} first_byte=%{time_starttransfer} total=%{time_total}\n' \
  https://metrics.example.net/-/ready
```

Run this inside the Prometheus Pod or an equivalent debug container. The health endpoint tests routing and handshake latency, not the full ingest path, but it quickly isolates DNS, connection, and TLS setup.

Large or variable `time_namelookup` points to resolver behavior. Large `time_connect - time_namelookup` points to TCP or proxy connection establishment. Large `time_appconnect - time_connect` points to TLS negotiation. A fast health endpoint with slow Remote Write usually shifts attention toward body transfer, receiver ingest, and storage.

### TLS and SNI

```bash
openssl s_client \
  -connect metrics.example.net:443 \
  -servername metrics.example.net \
  </dev/null
```

Certificate-validation failures normally report x509 errors rather than a pure deadline, but a dropped TLS handshake or broken middlebox may simply wait.

### Packet Loss and Path MTU

Small health requests can work while larger Remote Write bodies stall because of packet loss, MTU black holes, or proxy body handling. Compare error rate by batch size, inspect retransmissions with approved network tooling, and check VPN, overlay, and service-mesh MTUs. Do not disable TLS merely to capture production metrics bodies.

## Measure Sender-Side Pressure

Remote Write performs WAL reading, label processing, protobuf marshaling, Snappy compression, and HTTP sending. A CPU-starved or memory-thrashing Prometheus can delay batch preparation and queue progress. The `remote_timeout` context starts after Prometheus marshals and compresses the body, but CPU starvation can still consume wall-clock time while the HTTP operation is in flight.

Check:

```promql
rate(process_cpu_seconds_total{job="prometheus"}[5m])
```

```promql
go_memstats_heap_alloc_bytes{job="prometheus"}
```

```promql
histogram_quantile(
  0.95,
  sum by (le, remote_name) (
    rate(prometheus_remote_storage_sent_batch_duration_seconds_bucket[5m])
  )
)
```

Also inspect container CPU throttling, memory limits, garbage-collection pauses, network saturation, connection counts, and disk latency for WAL reads.

Multiple destinations multiply work. If every queue slows at once, suspect a shared sender, network, DNS, or node constraint. If only one `remote_name` slows, focus on that route and receiver.

## Measure Receiver-Side Latency

Receiver health and query latency do not prove write health. Inspect the receiver's official ingest metrics for:

- request duration and in-flight writes;
- accepted, rejected, and rate-limited samples;
- distributor or ingester CPU and memory;
- storage, replication, and quorum latency;
- per-tenant limits;
- request and body-size distributions;
- autoscaler saturation.

Check whether timeouts correlate with large batches, one tenant, one availability zone, compaction, object storage, or a rollout.

A receiver may accept the body quickly but delay its response until replication or durability work finishes. Its documented acknowledgement semantics determine what must complete before HTTP success.

## Check Proxy Timeout Alignment

For each intermediary, compare:

```text
connect timeout
request body timeout
upstream response timeout
idle timeout
Prometheus remote_timeout
```

Make the values intentional. A reverse proxy that closes at 29 seconds while Prometheus waits 30 creates guaranteed edge failures around the same latency. A 10-minute proxy timeout does not help if Prometheus cancels at 30 seconds.

Use a direct-to-receiver test from a trusted network when possible. If direct Remote Write succeeds and the proxied path times out, the intermediary is the fault domain. An empty manual POST can test routing but is not a valid performance test because it may be rejected before normal ingestion work.

## Tune the Correct Dimension

### Requests Are Too Large

Test a smaller batch:

```yaml
queue_config:
  max_samples_per_send: 1000
```

This can reduce per-request processing and tail latency but increases request count and overhead. Keep capacity at several batches per shard.

### Receiver Has Headroom but Too Little Concurrency

Prometheus normally adjusts shards up to `max_shards`, but pauses resharding after recoverable send errors. Compare actual, desired, and maximum shards. Raise the maximum only when the desired count is constrained by it and after receiver load testing. More concurrency against an overloaded receiver increases timeouts.

### Too Many Requests

If small batches dominate and the receiver supports larger bodies, test a larger `max_samples_per_send`. This reduces request overhead but can worsen individual timeout risk, so measure p99 duration.

### Normal Requests Need Slightly More Than 30 Seconds

Only after proving those requests succeed and total throughput is adequate, test:

```yaml
remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
    remote_timeout: 45s
```

Ensure every proxy permits more than that end-to-end duration. Then watch shard throughput and catch-up time. A longer timeout consumes a shard slot for longer, so it may require lower batch latency or safe additional concurrency.

### Receiver Is Fundamentally Undersized

Scale the receiver, raise a justified quota, partition according to its architecture, or reduce outbound volume. Timeouts are a symptom when sustainable receiver throughput is lower than incoming samples.

## Verify the Recovery

After a fix:

1. timeout and retry logs stop or return to a defined baseline;
2. p95 and p99 batch duration stay well below `remote_timeout`;
3. pending samples decline and the rate of enqueue retries returns to baseline;
4. highest-sent timestamp catches up while live ingestion continues;
5. receiver accepted rate matches the planned sample rate;
6. failed and age-dropped sample counters do not increase.

Keep monitoring until lag returns to normal. A temporarily quiet error log can mean every shard is still sleeping in backoff, not that the queue recovered.

## Official Documentation

- [Prometheus Remote Write configuration and timeout default](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus Remote Write tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus Remote Write HTTP client implementation](https://github.com/prometheus/prometheus/blob/main/storage/remote/client.go)
- [Prometheus queue retry and backoff implementation](https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go)
- [Prometheus Remote Write 2.0 retry semantics](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/#retries--backoff)
- [Prometheus TLS client configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#tls_config)
