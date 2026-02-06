# How to Replace OTLP/gRPC with OTel Arrow Exporter for 30-70% Network Bandwidth Reduction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Bandwidth, gRPC

Description: Replace your OTLP/gRPC exporter with OTel Arrow to achieve 30-70% network bandwidth reduction for telemetry data.

The standard OTLP/gRPC exporter sends each batch of telemetry as a protobuf message. It works well, but protobuf is a row-oriented format. Each span, metric point, or log record is serialized independently, which means repeated values like service names, attribute keys, and resource metadata are encoded over and over again in every batch. OTel Arrow fixes this by using Apache Arrow's columnar format, which compresses repeated values dramatically. The result is 30-70% less bandwidth for the same telemetry data.

## How OTel Arrow Achieves the Savings

Apache Arrow is a columnar in-memory format. Instead of encoding each telemetry record as a complete row, it groups all values of the same field into a column. When you have 1,000 spans and 990 of them have `service.name = "checkout-service"`, the columnar format stores that string once and references it 990 times via dictionary encoding.

On top of the columnar layout, OTel Arrow applies Zstd compression to the Arrow record batches. Columnar data compresses much better than row-oriented data because similar values are adjacent in memory.

The combined effect:

- Dictionary encoding eliminates repeated strings: 20-40% reduction
- Columnar layout improves compression ratio: additional 15-30% reduction
- Total: 30-70% bandwidth savings compared to standard OTLP/gRPC with gzip

## Replacing the Exporter in the Collector

The swap is straightforward. You replace the `otlp` exporter with the `otelarrow` exporter in your Collector configuration.

Before (standard OTLP/gRPC):

```yaml
exporters:
  otlp:
    endpoint: collector-gateway:4317
    tls:
      insecure: true
    compression: gzip
```

After (OTel Arrow):

```yaml
exporters:
  otelarrow:
    endpoint: collector-gateway:4317
    tls:
      insecure: true
    arrow:
      num_streams: 4
      max_stream_lifetime: 10m
```

The receiver on the other end also needs to support OTel Arrow. Replace the `otlp` receiver with the `otelarrow` receiver:

```yaml
receivers:
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
```

## Full Collector Config Example

Here is a complete agent-side Collector configuration using OTel Arrow:

```yaml
# agent-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 2000

  memory_limiter:
    check_interval: 5s
    limit_mib: 512

exporters:
  # Use OTel Arrow instead of standard OTLP
  otelarrow:
    endpoint: gateway-collector:4317
    tls:
      insecure: true
    arrow:
      num_streams: 4
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otelarrow]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otelarrow]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otelarrow]
```

And the gateway-side configuration:

```yaml
# gateway-collector-config.yaml
receivers:
  # OTel Arrow receiver (also accepts standard OTLP)
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  otlp:
    endpoint: backend:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otelarrow]
      exporters: [otlp]
    metrics:
      receivers: [otelarrow]
      exporters: [otlp]
    logs:
      receivers: [otelarrow]
      exporters: [otlp]
```

## Backward Compatibility

The OTel Arrow receiver is backward compatible with standard OTLP. If some agents are still using the regular `otlp` exporter, the `otelarrow` receiver handles both protocols. It detects whether the incoming connection uses Arrow framing or standard OTLP and processes accordingly.

This means you can roll out the change gradually: upgrade the receiver first, then migrate agents one at a time.

## Measuring the Bandwidth Savings

To quantify the savings in your environment, compare network traffic before and after the switch:

```bash
# On the agent host, measure outbound bytes to the collector port
# Before: standard OTLP
iptables -A OUTPUT -p tcp --dport 4317 -j ACCEPT
iptables -L OUTPUT -v -n | grep 4317
# Note the bytes counter

# After switching to OTel Arrow, compare the bytes counter
# over the same time period with the same traffic volume
```

Or use Prometheus metrics from the Collector itself:

```promql
# Bytes sent by the exporter (OTLP)
rate(otelcol_exporter_sent_bytes_total{exporter="otlp"}[5m])

# Bytes sent by the exporter (OTel Arrow)
rate(otelcol_exporter_sent_bytes_total{exporter="otelarrow"}[5m])
```

## When the Savings Are Greatest

OTel Arrow's compression advantages are most pronounced when:

- **Attributes are repetitive**: Microservices that tag every span with the same set of attributes (service name, environment, region, cluster) see the biggest gains.
- **Batch sizes are large**: Larger batches give Arrow more data to build efficient dictionaries from. Batches of 2,000+ records compress much better than batches of 50.
- **String values dominate**: Attributes with string values benefit most from dictionary encoding. Numeric metrics with high cardinality see smaller but still meaningful savings.

For a typical microservices deployment with 50+ attributes per span and batches of 1,000-5,000, expect 50-65% bandwidth reduction. That is a significant cost saving on cross-region or cloud egress traffic.
