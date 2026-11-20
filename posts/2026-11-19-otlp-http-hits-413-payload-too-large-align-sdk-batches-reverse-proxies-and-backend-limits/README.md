# Fix OTLP/HTTP 413 Errors: Align SDK Batches, Proxy Limits, and Backend Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTLP, Troubleshooting, Performance

Description: Diagnose OTLP HTTP 413 responses by locating the rejecting hop and coordinating batch item counts, request byte limits, compression, and oversized telemetry records.

An OTLP HTTP export succeeds during light traffic and fails with 413 during a burst. The exporter may be healthy: one request has simply exceeded a limit somewhere between the SDK and the backend.

The important distinction is between item count and serialized bytes. A batch of 100 short spans can be smaller than one span containing a large SQL statement. Increasing a queue holds more work; it does not make an oversized request acceptable.

## Locate the component enforcing the limit

Draw the actual request path and record each component's body limit:

```mermaid
flowchart LR
    A[SDK batch] --> B[Collector receiver]
    B --> C[Collector export batch]
    C --> D[Reverse proxy]
    D --> E[Telemetry backend]
```

A Collector can acknowledge an SDK request and later fail when exporting a larger combined batch. Check which exporter reports 413 and whether the proxy logs show an upstream request. If the proxy rejects before forwarding, backend logs may contain nothing.

Use a synthetic payload with no sensitive attributes to compare direct and proxied routes. Preserve the same signal path, content type, compression, and credentials. Record compressed and uncompressed sizes separately; different layers can enforce limits on different representations.

The [OTLP specification](https://opentelemetry.io/docs/specs/otlp/) defines 413 for an oversized HTTP body and requires receiver-side protection after decompression. Do not assume gzip makes a request fit every limit.

## Reduce SDK batch size when the first hop fails

For SDKs supporting the standard batch span processor environment variables, start with a smaller export batch:

```bash
export OTEL_BSP_MAX_EXPORT_BATCH_SIZE=128
export OTEL_BSP_MAX_QUEUE_SIZE=2048
export OTEL_BSP_SCHEDULE_DELAY=1000
```

The delay is in milliseconds. These are tracing settings, and support depends on how the SDK is configured. Programmatic configuration can take precedence; some browser setups do not read process environment variables at all. Check the [SDK environment variable specification](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/) and your language implementation.

A larger maximum queue size helps absorb bursts, while a smaller export batch reduces the number of spans sent together. Neither setting bounds the bytes in an individual span. Log processors and metric readers have different configuration surfaces, so do not expect these tracing variables to change their exports.

## Bound Collector batch item counts

If the failing request leaves a Collector, adjust that pipeline rather than only changing applications:

```yaml
processors:
  batch/small:
    timeout: 1s
    send_batch_size: 128
    send_batch_max_size: 128

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch/small]
      exporters: [otlp_http/backend]
```

This fragment replaces the batch processor in an existing pipeline. Keep its receiver and exporter definitions. The [batch processor reference](https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md) distinguishes the send trigger from the maximum: `send_batch_size` alone is not a hard cap. Both values still count signal items, not HTTP bytes.

Check for a second batching stage in the exporter queue. Newer Collector versions support queue batching with byte-based sizing. Use the [exporter helper reference](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md) for your release before enabling it, and avoid accidentally recombining small processor batches into a larger request. A serialized-data size estimate also needs headroom for request encoding.

## Change proxy limits only with a complete budget

For an NGINX OTLP route, a bounded body limit can look like this:

```nginx
location /v1/ {
    client_max_body_size 8m;
    proxy_pass http://collector_backend:4318;
}
```

This is a location fragment in an existing server, with `collector_backend` resolving to the intended Collector. The [NGINX directive](https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size) controls the accepted client body size. Raising it does not change the Collector receiver or final backend limit.

Keep the smallest downstream limit in view. If a managed backend cannot accept your request, changing the proxy merely moves the rejection to a different hop. Also budget memory for concurrent requests: allowing many large bodies at once can create a new outage.

## Find records that cannot fit any batch

If a one-item request still fails, inspect the largest span attributes, events, log bodies, or metric structures. Replace embedded documents and full payload dumps with bounded summaries or references at instrumentation time. Apply explicit field limits according to your data requirements; truncating every field indiscriminately can remove the information needed for incident investigation.

Finally replay representative small, typical, and worst-case synthetic exports. Confirm successful ingestion, stable memory, and acceptable request rate after reducing batch size. Track permanent export failures and queue drops during the change. A disappearing 413 is useful only if the backend now contains the expected telemetry.
