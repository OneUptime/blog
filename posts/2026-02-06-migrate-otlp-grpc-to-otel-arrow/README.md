# Migrate from OTLP/gRPC Exporter to OTel Arrow Exporter Without Pipeline Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Migration, Zero Downtime

Description: Migrate from OTLP/gRPC to OTel Arrow exporter without any pipeline downtime using a phased rollout strategy.

Switching your telemetry transport from standard OTLP/gRPC to OTel Arrow is a protocol-level change. If done carelessly, it can cause telemetry gaps during the transition. This post lays out a phased migration strategy that keeps data flowing throughout the process, with rollback options at every stage.

## Migration Strategy Overview

The migration happens in three phases:

1. **Upgrade receivers first**: Replace OTLP/gRPC receivers with OTel Arrow receivers on the gateway. Since the Arrow receiver also serves standard OTLP/gRPC, existing OTLP/gRPC exporters continue to work.
2. **Gradually upgrade exporters**: Roll out the OTel Arrow exporter to agents one at a time (or in batches). Each agent starts using Arrow independently.
3. **Clean up and optimize**: Once all agents use Arrow, tune stream settings and remove any transitional configuration.

## Phase 1: Upgrade the Gateway Receiver

Start with the receiving end. This is risk-free for OTLP/gRPC traffic because the OTel Arrow receiver accepts both OTel Arrow and standard OTLP/gRPC.

Current gateway config:

```yaml
# Before: standard OTLP receiver

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
```

Updated gateway config:

```yaml
# After: OTel Arrow receiver (backward compatible)
receivers:
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      arrow:
        memory_limit_mib: 128
```

Update the pipeline references too:

```yaml
service:
  pipelines:
    traces:
      receivers: [otelarrow]  # Changed from [otlp]
      processors: [batch]
      exporters: [otlp/backend]
    metrics:
      receivers: [otelarrow]
      processors: [batch]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otelarrow]
      processors: [batch]
      exporters: [loki]
```

Deploy this change to all gateway instances. Monitor for any errors:

```bash
# Check gateway logs for receiver errors
kubectl logs -n observability deployment/otel-gateway | grep -i error

# Verify data is still flowing
kubectl logs -n observability deployment/otel-gateway | grep "TracesExported"
```

At this point, all agents are still using standard OTLP/gRPC, and everything works exactly as before. You have just added Arrow capability to the receiver.

## Phase 2: Upgrade Agents in Batches

Now upgrade agents from the standard OTLP exporter to the OTel Arrow exporter. Do this gradually.

Current agent config:

```yaml
# Before: standard OTLP exporter
exporters:
  otlp:
    endpoint: gateway.observability.svc:4317
    tls:
      insecure: true
    compression: gzip
```

Updated agent config:

```yaml
# After: OTel Arrow exporter
exporters:
  otelarrow:
    endpoint: gateway.observability.svc:4317
    tls:
      insecure: true
    compression: zstd
    arrow:
      num_streams: 2
      max_stream_lifetime: 10m
```

Update the pipeline:

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otelarrow]  # Changed from [otlp]
```

Roll this out using your standard deployment strategy. In Kubernetes with a DaemonSet, you can use a rolling update:

```yaml
# daemonset update strategy
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1  # Update one node at a time
```

After each batch of agents is updated, verify:

```bash
# Check the gateway's Arrow stream metrics
curl -s http://gateway:8888/metrics | grep otelarrow

# Verify span counts are stable (no drops during switchover)
curl -s http://gateway:8888/metrics | grep otelcol_receiver_accepted_spans
```

## Handling the OTel Arrow Fallback

The OTel Arrow exporter has a built-in downgrade mechanism. If it connects to a receiver that does not support Arrow (for example, if the gateway was rolled back to a standard OTLP receiver), the exporter can fall back to standard OTLP/gRPC on the same endpoint, unless `arrow.disable_downgrade` is set to `true`.

This means:

- If the gateway upgrade fails and you roll back, agents using OTel Arrow will still work. They just fall back to standard OTLP/gRPC.
- If you accidentally upgrade an agent before the gateway, it still works via the fallback.

You can verify the fallback is working by checking that telemetry continues to be accepted and by inspecting the documented exporter byte metrics:

```bash
# Exporter-side bytes sent before and after wire compression
curl -s http://agent:8888/metrics | grep 'otelcol_exporter_sent'

# Receiver-side bytes received before and after wire compression
curl -s http://gateway:8888/metrics | grep 'otelcol_receiver_recv'
```

## Phase 3: Verify and Optimize

Once all agents are upgraded, verify the full pipeline:

```bash
# Check Arrow receiver metrics and confirm telemetry is still being accepted
curl -s http://gateway:8888/metrics | grep 'otelcol_receiver_recv'
curl -s http://gateway:8888/metrics | grep 'otelcol_receiver_accepted_spans'

# Measure bandwidth savings
# Compare current network bytes with historical baseline
```

Now you can optimize the Arrow settings:

```yaml
# Optimized agent config after full migration
exporters:
  otelarrow:
    endpoint: gateway.observability.svc:4317
    tls:
      insecure: true
    compression: zstd
    arrow:
      num_streams: 4       # Increase if throughput is high
      max_stream_lifetime: 15m  # Increase for better compression
```

## Rollback at Any Stage

At any point during the migration, you can roll back:

- **Phase 1 rollback**: Change `otelarrow` back to `otlp` in the gateway receiver config. Agents do not need to change.
- **Phase 2 rollback**: Change `otelarrow` back to `otlp` in the agent exporter config. The gateway's Arrow receiver still accepts standard OTLP/gRPC.
- **Phase 3**: No rollback needed; this phase is just optimization.

The entire migration can be done without any telemetry gaps. The backward compatibility of the OTel Arrow receiver and the fallback behavior of the OTel Arrow exporter ensure that data flows continuously regardless of which phase you are in or whether any individual component is running the old or new configuration.
