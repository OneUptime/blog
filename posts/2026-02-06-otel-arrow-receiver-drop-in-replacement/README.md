# How to Configure the OTel Arrow Receiver in the Collector as a Drop-In Replacement for the OTLP Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Collector, Receiver

Description: Configure the OTel Arrow receiver as a drop-in replacement for the OTLP receiver with full backward compatibility.

The OTel Arrow receiver is designed to be a seamless replacement for the standard OTLP gRPC receiver. It listens on the same port, accepts the same OTLP connections, and additionally supports the Arrow-optimized protocol. This means you can swap the receiver without breaking any existing exporters. Agents using standard OTLP continue to work. Agents upgraded to the OTel Arrow exporter get the bandwidth benefits automatically.

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

The swap is minimal. Replace `otlp` with `otelarrow` and keep the same settings:

```yaml
receivers:
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 4
      http:
        endpoint: 0.0.0.0:4318
```

That is it. The `otelarrow` receiver binds to the same port and accepts both standard OTLP and Arrow-encoded connections. The HTTP endpoint continues to handle OTLP/HTTP as before, since OTel Arrow only applies to the gRPC protocol.

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
        # Arrow-specific settings
        arrow:
          # Memory limit for Arrow record batches
          memory_limit_mib: 128
      http:
        endpoint: 0.0.0.0:4318
        # HTTP endpoint remains unchanged

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
      receivers: [otelarrow]
      processors: [batch]
      exporters: [otlp]
    metrics:
      receivers: [otelarrow]
      processors: [batch]
      exporters: [otlp]
    logs:
      receivers: [otelarrow]
      processors: [batch]
      exporters: [otlp]
```

## Arrow-Specific Receiver Settings

The `arrow` block under the gRPC protocol contains settings specific to Arrow stream handling:

```yaml
arrow:
  # Maximum memory for buffering Arrow record batches
  # Prevents OOM from large incoming batches
  memory_limit_mib: 128
```

The `memory_limit_mib` controls how much memory the receiver allocates for decoding Arrow record batches. Arrow data is typically larger in its decoded form than its compressed wire format, so this limit protects against memory spikes when receiving large batches.

## Verifying Backward Compatibility

After swapping the receiver, verify that existing OTLP clients still work:

```bash
# Send a test trace using grpcurl (standard OTLP format)
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
          "trace_id": "0af7651916cd43dd8448eb211c80319c",
          "span_id": "b7ad6b7169203331",
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

## Monitoring Connection Types

The OTel Arrow receiver exposes metrics that tell you how many connections use each protocol:

```promql
# Count of active Arrow streams
otelcol_receiver_otelarrow_active_streams

# Count of standard OTLP connections
otelcol_receiver_accepted_spans{receiver="otelarrow", transport="grpc"}

# Count of Arrow-transported spans
otelcol_receiver_accepted_spans{receiver="otelarrow", transport="arrow"}
```

These metrics help you track the migration progress. As you upgrade agents from standard OTLP to OTel Arrow, you should see the `transport="arrow"` counter increase and the `transport="grpc"` counter decrease.

## Rollback Plan

If you need to roll back, simply replace `otelarrow` with `otlp` in the receiver config and restart the Collector. All agents using standard OTLP will reconnect without issues. Agents using the OTel Arrow exporter will fall back to standard OTLP automatically, since the `otelarrow` exporter includes a fallback mechanism that detects when the receiver does not support Arrow and switches to standard OTLP on the same connection.

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

The drop-in nature of the OTel Arrow receiver makes it a low-risk upgrade. You get the option to use Arrow without forcing anything to change until you are ready.
