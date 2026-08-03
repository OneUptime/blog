# Prometheus Remote Write 1.0 vs. 2.0: Compatibility, Metadata, and Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, Protocol, Protobuf, Metadata, Migration

Description: Compare Prometheus Remote Write 1.0 and 2.0 on the wire, configure both safely, and migrate senders and receivers without silent data loss.

---

Prometheus Remote Write 2.0 is not merely a faster encoding switch. It uses a different protobuf message, a distinct `Content-Type`, richer per-series metadata, and response headers that report how many objects the receiver wrote.

That means compatibility must be verified at both ends. A sender cannot infer that a receiver supports 2.0 from the `/api/v1/write` path, and a successful TCP or TLS connection says nothing about protobuf compatibility.

As of the current Prometheus documentation, the Remote Write 1.0 specification is stable and the 2.0 specification is published as experimental release candidate `2.0-rc.4`. Adopt 2.0 only after checking the exact sender and receiver versions in use.

## The Short Comparison

| Capability | Remote Write 1.0 | Remote Write 2.0 |
| --- | --- | --- |
| Prometheus protobuf message | `prometheus.WriteRequest` | `io.prometheus.write.v2.Request` |
| Version header | `0.1.0` | `2.0.0` |
| Schema declared in `Content-Type` | Usually implicit | Required `proto` parameter |
| Label and string encoding | Repeated strings in protobuf objects | Request-wide symbol table with references |
| Metric metadata | Separate, limited association | Metadata attached to each time series |
| Start timestamp | Not represented by the 1.0 request | Supported per sample and histogram |
| Native histograms | Requires the sender option | Supported by the schema; enable explicitly in Prometheus v3.13.1 |
| Exemplars | Supported when sender enables them | Supported when sender enables them |
| Written-object response counts | Not defined | Mandatory response headers |
| Specification status | Stable | Experimental release candidate |

The name Remote Write 1.0 can be confusing because its required HTTP version header is `0.1.0`. That is expected and should not be changed to `1.0.0`.

## The Wire Format Must Match

Both versions use HTTP POST, protobuf, and raw Snappy block compression. Neither uses the Snappy framed stream format.

A typical 1.0 request uses:

```http
POST /api/v1/write HTTP/1.1
Content-Encoding: snappy
Content-Type: application/x-protobuf
X-Prometheus-Remote-Write-Version: 0.1.0
```

Its body encodes:

```text
prometheus.WriteRequest
```

A 2.0 request identifies its schema explicitly:

```http
POST /api/v1/write HTTP/1.1
Content-Encoding: snappy
Content-Type: application/x-protobuf;proto=io.prometheus.write.v2.Request
X-Prometheus-Remote-Write-Version: 2.0.0
```

Its body encodes:

```text
io.prometheus.write.v2.Request
```

The endpoint path can remain identical. The `Content-Type` and version header describe the protocol. Routing `/api/v1/write` to a legacy decoder regardless of headers is unsafe.

The 2.0 protobuf reserves the low field numbers used by the 1.0 message. Consequently, a legacy decoder that ignores `Content-Type` can interpret a valid 2.0 body as an empty request instead of producing an obvious protobuf error. Receivers must validate the declared message type rather than guessing from decoded contents.

## What the 2.0 Symbol Table Changes

Metric names, label names, label values, metadata strings, and other repeated strings are placed in a request-wide symbol table. Time series refer to those strings by index.

This removes repeated protobuf string fields within a request and can improve payload efficiency when many series share the same labels. Remote Write 1.0 is already Snappy-compressed, however, so the actual network and CPU effect depends on batch composition, cardinality, label repetition, and implementation. Benchmark representative traffic rather than assuming a fixed percentage improvement.

The symbol table also makes strict validation important. A reference outside the table is an invalid request and should receive a non-retriable client error rather than be partially accepted without a clear response.

## Metadata Is Associated with Its Series

Remote Write 1.0 can carry metric metadata, but it is represented separately from the time-series samples. Association and delivery behavior have varied between implementations.

Remote Write 2.0 places metadata on each time series. It can carry the metric type, help text, and unit in direct association with the label set. Samples and histograms can also carry a start timestamp, which helps systems that understand counter and histogram start semantics.

Protocol support does not create information that the sender never collected. A receiver may still see missing help text, unit, type, or start timestamp when the scrape path or sender does not have it. Validate the actual receiver metadata after migration instead of checking only sample counts.

Native histograms are also not exclusive to 2.0. In Prometheus v3.13.1, set `send_native_histograms: true` explicitly for either message. The v3.13.1 configuration reference describes this option as a no-op that is always true with the 2.0 message, but the tagged queue implementation still gates histogram forwarding on the boolean. Treat that as a version-specific documentation and source inconsistency, and verify histogram delivery during the canary.

Exemplars remain separately controlled by `send_exemplars`; selecting 2.0 does not override that setting.

## The 2.0 Response Is Measurable

On a successful 2.0 write, the receiver reports object counts in response headers:

```http
X-Prometheus-Remote-Write-Samples-Written: 1800
X-Prometheus-Remote-Write-Histograms-Written: 20
X-Prometheus-Remote-Write-Exemplars-Written: 4
```

These headers distinguish a meaningful success from a receiver that returned `2xx` after decoding nothing. The 2.0 specification requires the headers even when a count is zero.

Current Prometheus uses these counts to guard against the legacy empty-decode failure mode. A proxy must preserve the headers. A custom receiver should implement and test them before production traffic is moved.

Do not treat HTTP `2xx` alone as proof of compatibility. During a canary, verify all of the following:

- the sender reports no failed or dropped samples;
- the receiver reports nonzero written counts for nonempty traffic;
- a known heartbeat series advances at the receiver;
- labels, metadata, native histograms, and exemplars expected from the source are present;
- request and response headers survive every proxy and gateway.

## Configure a Prometheus Sender Explicitly

Prometheus uses the 1.0 message by default:

```yaml
remote_write:
  - name: central_v1
    url: https://metrics.example.net/api/v1/write
    protobuf_message: prometheus.WriteRequest
```

Select 2.0 for one destination with:

```yaml
remote_write:
  - name: central_v2
    url: https://metrics.example.net/api/v1/write
    protobuf_message: io.prometheus.write.v2.Request
    send_exemplars: true
```

Leaving the 1.0 value explicit during a staged rollout can make intent easier to audit. The current documented allowed values are exactly:

```text
prometheus.WriteRequest
io.prometheus.write.v2.Request
```

Prometheus does not negotiate a protocol dynamically and then fall back to another message for the same batch. If a 2.0 request reaches a 1.0-only receiver, the correct outcome is a clear unsupported-media or client error. Such 4xx responses are generally non-retriable, so experimenting against a production endpoint can lose the affected batch.

## Configure the Built-In Receiver for Migration

The Prometheus Remote Write receiver remains disabled until the server starts with:

```text
--web.enable-remote-write-receiver
```

Prometheus v3.13.1 source initializes the built-in receiver's accepted-message default with both `prometheus.WriteRequest` and `io.prometheus.write.v2.Request`. Its generated command reference still displays only `prometheus.WriteRequest`, so this behavior must be checked against the exact binary rather than assumed from an unversioned page. During migration, make the intended dual-protocol policy explicit by repeating the list-valued flag:

```bash
prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --web.enable-remote-write-receiver \
  --web.remote-write-receiver.accepted-protobuf-messages=prometheus.WriteRequest \
  --web.remote-write-receiver.accepted-protobuf-messages=io.prometheus.write.v2.Request
```

Confirm the syntax in `prometheus --help` for the exact version being deployed. Changing command-line flags requires a process restart; reloading `prometheus.yml` does not enable the receiver or change its accepted protobuf list.

For another storage product, use that product's official compatibility matrix and configuration. Support for Remote Write does not automatically mean support for the 2.0 message.

## Use a Receiver-First Migration

A safe rollout changes compatibility before changing traffic:

1. Inventory every sender version, receiver version, proxy, gateway, and tenant endpoint.
2. Verify that the receiver explicitly supports `io.prometheus.write.v2.Request` and the required 2.0 response headers.
3. Upgrade and configure receivers to accept both 1.0 and 2.0.
4. Test the full path with synthetic 2.0 requests in a non-production tenant.
5. Move one low-risk Prometheus destination to `protobuf_message: io.prometheus.write.v2.Request`.
6. Validate current samples, lag, failures, dropped samples, metadata, histograms, exemplars, and receiver counts.
7. Expand the canary gradually across representative workloads.
8. Keep both receiver decoders available through the rollback and mixed-version window.
9. Remove 1.0 acceptance only after every authorized sender has migrated and rollback is no longer required.

Do not configure both a 1.0 and a 2.0 destination to the same logical tenant as a compatibility test unless the backend explicitly deduplicates the duplicate stream. Prometheus fan-out sends every selected sample to both queues; it is not a fallback mechanism.

## Monitor the Canary

Track freshness and queue health by the canary's `remote_name`:

```promql
time()
-
prometheus_remote_storage_queue_highest_sent_timestamp_seconds{
  remote_name="central_v2"
}
```

```promql
prometheus_remote_storage_samples_pending{remote_name="central_v2"}
```

```promql
increase(
  prometheus_remote_storage_samples_failed_total{
    remote_name="central_v2"
  }[10m]
)
```

```promql
increase(
  prometheus_remote_storage_samples_dropped_total{
    remote_name="central_v2"
  }[10m]
)
```

`prometheus_remote_storage_samples_total` counts samples included in send attempts, including retries, so it is not by itself a receiver success counter. Use the receiver's ingestion metrics, 2.0 written headers, and queries for known series to establish end-to-end success.

Inspect status codes and bodies as well:

- `415` usually means the receiver or proxy rejects the declared media type;
- `400` indicates an invalid request, unsupported content, or data validation failure;
- `401` or `403` is an authentication or authorization problem, not a protocol fallback signal;
- `429` is throttling and is retried only when the sender queue enables `retry_on_http_429`;
- `5xx` and transport errors are recoverable failures that Prometheus retries.

## Roll Back Without Making the Incident Larger

If the dual-capable receiver is healthy but the 2.0 canary fails, restore:

```yaml
protobuf_message: prometheus.WriteRequest
```

then reload Prometheus and verify that the sender resumes. Preserve sender and receiver logs, status codes, response headers, and affected timestamps before scaling the rollback.

Do not assume every rejected 2.0 batch remains available. A non-retriable 4xx can permanently fail a batch, and a prolonged recoverable outage can exceed WAL replay retention. Query a heartbeat at the receiver to identify any gap.

If a gateway removed the `proto` parameter or written-count headers, fix and validate that path before retrying 2.0. If a receiver returned false success after an empty decode, treat the interval as possible data loss even if HTTP access logs show `200`.

Remote Write 2.0 offers a better-specified, richer exchange, especially for metadata and verifiable writes. Its value is realized only when sender, intermediaries, and receiver all honor the protocol. Receiver-first rollout and end-to-end canaries turn that compatibility requirement into a controlled migration rather than a production experiment.

## Official Documentation

- [Prometheus Remote Write 1.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus Remote Write 2.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/)
- [Prometheus Remote Write sender configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus receiver command-line flags](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
- [Prometheus v3.13.1 receiver flag defaults in source](https://github.com/prometheus/prometheus/blob/v3.13.1/cmd/prometheus/main.go#L465-L467)
- [Prometheus v3.13.1 native-histogram queue gate in source](https://github.com/prometheus/prometheus/blob/v3.13.1/storage/remote/queue_manager.go#L844-L847)
- [Prometheus Remote Write characteristics and tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus 1.0 protobuf definition](https://github.com/prometheus/prometheus/blob/main/prompb/remote.proto)
- [Prometheus 2.0 protobuf definition](https://github.com/prometheus/prometheus/blob/main/prompb/io/prometheus/write/v2/types.proto)
