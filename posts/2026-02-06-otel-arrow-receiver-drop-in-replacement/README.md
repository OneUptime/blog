# How to Configure the OTel Arrow Receiver in the Collector as a Drop-In

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Collector, Receiver

Description: Configure the OTel Arrow receiver as a drop-in replacement for the OTLP receiver with full backward compatibility.

The OTel Arrow receiver is designed to be a seamless replacement for the standard OTLP gRPC receiver. It listens on the same port, accepts the same OTLP/gRPC connections, and additionally supports the Arrow-optimized protocol. This means you can swap the gRPC receiver without breaking any existing gRPC exporters. Agents using standard OTLP/gRPC continue to work. Agents upgraded to the OTel Arrow exporter get the bandwidth benefits automatically.

## The Standard OTLP Receiver Configuration

Here is what a typical OTLP receiver looks like:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 4
      http:
        endpoint: 0.0.0.0:4318
```

## Replacing with the OTel Arrow Receiver

The swap is minimal for the gRPC endpoint. Replace the OTLP gRPC receiver with `otelarrow` and keep OTLP/HTTP on a regular OTLP receiver if you still need port 4318:

```yaml
receivers:
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 4
  otlp/http:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
```

That is it for the gRPC side. The `otelarrow` receiver binds to the same OTLP/gRPC port and accepts both standard OTLP/gRPC and Arrow-encoded connections. The HTTP endpoint remains on the standard OTLP receiver, since the OTel Arrow receiver only supports gRPC.

## How the Protocol Negotiation Works

When a client connects to the OTel Arrow receiver over gRPC, the receiver checks the gRPC service being called:

1. If the client calls `opentelemetry.proto.collector.trace.v1.TraceService/Export` (standard OTLP), the receiver processes it as standard OTLP.
2. If the client calls `opentelemetry.proto.experimental.arrow.v1.ArrowTracesService/ArrowTraces` (OTel Arrow), the receiver processes it as an Arrow stream.

This negotiation happens at the gRPC level, so there is no performance penalty for the detection. The receiver simply registers handlers for both service definitions.

## Full Configuration with All Options

```yaml
receivers:
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 16
        # gRPC keepalive settings
        keepalive:
          server_parameters:
            max_connection_idle: 60s
            max_connection_age: 120s
            max_connection_age_grace: 30s
            time: 30s
            timeout: 10s
          enforcement_policy:
            min_time: 10s
            permit_without_stream: true
      arrow:
        # Arrow-specific settings
        # Memory limit for Arrow record batches
        memory_limit_mib: 128
  otlp/http:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
        # HTTP endpoint remains on the OTLP receiver

processors:
  batch:
    timeout: 10s
    send_batch_size: 1000

exporters:
  otlp:
    endpoint: backend:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otelarrow, otlp/http]
      processors: [batch]
      exporters: [otlp]
    metrics:
      receivers: [otelarrow, otlp/http]
      processors: [batch]
      exporters: [otlp]
    logs:
      receivers: [otelarrow, otlp/http]
      processors: [batch]
      exporters: [otlp]
```

## Arrow-Specific Receiver Settings

The `arrow` block under `protocols` contains settings specific to Arrow stream handling:

```yaml
protocols:
  arrow:
    # Maximum memory for buffering Arrow record batches
    # Prevents OOM from large incoming batches
    memory_limit_mib: 128
```

The `memory_limit_mib` controls how much memory the receiver allocates for decoding Arrow record batches. Arrow data is typically larger in its decoded form than its compressed wire format, so this limit protects against memory spikes when receiving large batches.

## Verifying Backward Compatibility

After swapping the receiver, verify that existing OTLP clients still work:

```bash
# Send a test trace using grpcurl (standard OTLP format).
# If reflection is not enabled, add the OTLP proto files with -import-path and -proto.

grpcurl -plaintext \
  -d '{
    "resource_spans": [{
      "resource": {
        "attributes": [{
          "key": "service.name",
          "value": {"string_value": "test-service"}
        }]
      },
      "scope_spans": [{
        "spans": [{
          "trace_id": "CvdlGRbNQ92ESOshHIAxnA==",
          "span_id": "t61rcWkgMzE=",
          "name": "test-span",
          "kind": 1,
          "start_time_unix_nano": 1706000000000000000,
          "end_time_unix_nano": 1706000001000000000
        }]
      }]
    }]
  }' \
  localhost:4317 \
  opentelemetry.proto.collector.trace.v1.TraceService/Export
```

If this returns a success response, your existing OTLP clients will continue to work without any changes.

## Monitoring Receiver Metrics

The OTel Arrow receiver exposes standard receiver metrics plus Arrow-specific network and memory metrics:

```promql
# Standard receiver metric for accepted spans
otelcol_receiver_accepted_spans{receiver="otelarrow"}

# Uncompressed bytes received before compression
otelcol_receiver_recv{receiver="otelarrow"}

# Compressed bytes received on the wire
otelcol_receiver_recv_wire{receiver="otelarrow"}

# Arrow memory currently in use by streams
arrow_memory_inuse
```

These metrics help you track receiver throughput and Arrow memory pressure. The OTel Arrow receiver documentation does not define a built-in `transport="arrow"` versus `transport="grpc"` label for accepted spans, so use the network-level metrics to monitor Arrow efficiency.

## Rollback Plan

If you need to roll back, replace `otelarrow` with `otlp` for the gRPC receiver config and restart the Collector. All agents using standard OTLP/gRPC will reconnect without issues. Agents using the OTel Arrow exporter will fall back to standard OTLP automatically unless `arrow.disable_downgrade` is set to `true`.

```yaml
# Rollback: just change the receiver name back
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
```

The drop-in nature of the OTel Arrow receiver for OTLP/gRPC makes it a low-risk upgrade. You get the option to use Arrow without forcing anything to change until you are ready.
