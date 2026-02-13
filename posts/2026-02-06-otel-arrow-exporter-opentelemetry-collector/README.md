# How to Configure the OTel Arrow Exporter in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Exporters, OTel Arrow, Performance, Optimization, gRPC, Protocol

Description: Master the OTel Arrow exporter configuration to achieve high-performance telemetry data transmission with Apache Arrow's columnar format in OpenTelemetry Collector.

The OTel Arrow exporter represents a significant advancement in OpenTelemetry data transmission efficiency. By leveraging Apache Arrow's columnar format and advanced compression techniques, this exporter can reduce bandwidth usage by up to 10x compared to standard OTLP while maintaining full compatibility with OpenTelemetry semantics.

## What is OTel Arrow?

OTel Arrow is a high-performance protocol extension for OpenTelemetry that uses Apache Arrow's columnar data format to efficiently encode and transmit telemetry data. Unlike traditional row-based formats, Arrow's columnar layout enables superior compression ratios and faster serialization, making it ideal for high-volume telemetry scenarios.

The protocol maintains complete compatibility with OTLP (OpenTelemetry Protocol) while offering substantial performance improvements through:

- **Columnar encoding**: Groups similar data together for better compression
- **Streaming capabilities**: Supports long-lived gRPC streams for reduced connection overhead
- **Adaptive optimization**: Automatically adjusts encoding strategies based on data patterns
- **Zero-copy operations**: Minimizes memory allocations and copies

## Architecture Overview

Understanding how OTel Arrow fits into your telemetry pipeline:

```mermaid
graph LR
    A[Application<br/>with OTLP SDK] --> B[OTel Collector<br/>Receiver]
    B --> C[Processors]
    C --> D[OTel Arrow<br/>Exporter]
    D -->|gRPC Stream| E[Remote Collector<br/>with Arrow Receiver]
    E --> F[Backend Systems]

    style D fill:#90EE90
    style E fill:#87CEEB
```

## Prerequisites

Before implementing the OTel Arrow exporter, ensure you have:

1. OpenTelemetry Collector with contrib components (version 0.80.0 or later)
2. Network connectivity between collectors using gRPC
3. A receiving collector configured with the OTel Arrow receiver
4. Understanding of your telemetry volume and performance requirements

## Basic Configuration

Here's a minimal configuration to get started with the OTel Arrow exporter:

```yaml
# Basic OTel Arrow exporter configuration
exporters:
  otelarrow:
    # The endpoint of the receiving collector with Arrow receiver
    # Uses gRPC protocol for communication
    endpoint: collector.example.com:4317

    # Disable TLS for testing (enable in production)
    tls:
      insecure: true

# Configure a receiver to accept data
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

# Basic batch processor
processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

# Define the pipeline
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otelarrow]

    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otelarrow]

    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otelarrow]
```

## Advanced Configuration with TLS

For production deployments, secure your Arrow streams with TLS encryption:

```yaml
exporters:
  otelarrow:
    endpoint: collector.prod.example.com:4317

    # TLS configuration for secure communication
    tls:
      # Enable TLS
      insecure: false

      # Path to CA certificate for server verification
      ca_file: /etc/otelcol/certs/ca.crt

      # Client certificate authentication (mutual TLS)
      cert_file: /etc/otelcol/certs/client.crt
      key_file: /etc/otelcol/certs/client.key

      # Verify server certificate
      insecure_skip_verify: false

      # Server name for SNI
      server_name_override: collector.prod.example.com

    # Connection timeout
    timeout: 30s

    # Authentication headers
    headers:
      api-key: ${env:COLLECTOR_API_KEY}
      tenant-id: production

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 2048

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otelarrow]

    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otelarrow]

    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otelarrow]
```

## Performance Optimization Configuration

For high-throughput scenarios, optimize the Arrow exporter for maximum performance:

```yaml
exporters:
  otelarrow:
    endpoint: collector.example.com:4317

    tls:
      insecure: false
      ca_file: /etc/otelcol/certs/ca.crt

    # Arrow-specific settings for performance
    arrow:
      # Number of Arrow streams to use in parallel
      # Increase for higher throughput
      num_streams: 4

      # Disable dictionary encoding for faster processing
      # Set to true if you have highly repetitive string data
      disable_downgrade: false

      # Maximum size of Arrow record batches (in bytes)
      # Larger batches improve compression but use more memory
      max_stream_lifetime: 3600s

    # gRPC settings for connection management
    keepalive:
      time: 30s
      timeout: 10s
      permit_without_stream: true

    # Compression settings
    compression: gzip

    # Write buffer size for gRPC
    write_buffer_size: 524288

    # Read buffer size for gRPC
    read_buffer_size: 524288

    # Retry configuration for failed sends
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s
      max_elapsed_time: 300s

    # Queue settings to handle backpressure
    sending_queue:
      enabled: true
      num_consumers: 20
      queue_size: 10000

    # Timeout for individual requests
    timeout: 60s

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 32
        max_concurrent_streams: 100

processors:
  # Batch processor optimized for Arrow
  batch:
    timeout: 5s
    send_batch_size: 4096
    send_batch_max_size: 8192

  # Memory limiter to prevent OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048
    spike_limit_mib: 512

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

## Multi-Destination Configuration

Send Arrow-encoded data to multiple destinations with load balancing:

```yaml
exporters:
  # Primary Arrow destination
  otelarrow/primary:
    endpoint: collector-primary.example.com:4317
    tls:
      insecure: false
      ca_file: /etc/otelcol/certs/ca.crt

    arrow:
      num_streams: 4

    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s

    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

  # Secondary Arrow destination for redundancy
  otelarrow/secondary:
    endpoint: collector-secondary.example.com:4317
    tls:
      insecure: false
      ca_file: /etc/otelcol/certs/ca.crt

    arrow:
      num_streams: 2

    retry_on_failure:
      enabled: true
      initial_interval: 2s
      max_interval: 60s

    sending_queue:
      enabled: true
      num_consumers: 5
      queue_size: 5000

  # Load balancing exporter
  loadbalancing:
    protocol:
      otlp:
        timeout: 30s
        tls:
          insecure: false

    resolver:
      static:
        hostnames:
          - collector-1.example.com:4317
          - collector-2.example.com:4317
          - collector-3.example.com:4317

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 2048

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otelarrow/primary, otelarrow/secondary]

    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otelarrow/primary]
```

## Configuring the Receiving Side

The Arrow exporter requires a corresponding Arrow receiver on the destination collector:

```yaml
# Configuration for the receiving collector
receivers:
  # OTel Arrow receiver to accept Arrow-encoded data
  otelarrow:
    # Listen on all interfaces
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

    # Arrow-specific receiver settings
    arrow:
      # Memory limit for Arrow record batches
      memory_limit_mib: 1024

    # TLS configuration
    tls:
      cert_file: /etc/otelcol/certs/server.crt
      key_file: /etc/otelcol/certs/server.key
      client_ca_file: /etc/otelcol/certs/ca.crt

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  # Export to your observability backend
  otlp:
    endpoint: backend.example.com:4317
    tls:
      insecure: false

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

## Hybrid Configuration: Arrow and Standard OTLP

Support both Arrow-capable and standard OTLP clients:

```yaml
receivers:
  # Standard OTLP receiver for backward compatibility
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Arrow receiver for high-performance clients
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4319

processors:
  batch:
    timeout: 10s
    send_batch_size: 2048

  resource:
    attributes:
      - key: collector.type
        value: hybrid
        action: upsert

exporters:
  # Use Arrow for inter-collector communication
  otelarrow:
    endpoint: aggregator.example.com:4317
    tls:
      insecure: false
      ca_file: /etc/otelcol/certs/ca.crt

    arrow:
      num_streams: 4

    retry_on_failure:
      enabled: true

    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

service:
  pipelines:
    traces:
      receivers: [otlp, otelarrow]
      processors: [resource, batch]
      exporters: [otelarrow]

    metrics:
      receivers: [otlp, otelarrow]
      processors: [resource, batch]
      exporters: [otelarrow]

    logs:
      receivers: [otlp, otelarrow]
      processors: [resource, batch]
      exporters: [otelarrow]
```

## Performance Monitoring

Monitor the Arrow exporter's performance using these metrics:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

  # Prometheus receiver to scrape collector metrics
  prometheus:
    config:
      scrape_configs:
        - job_name: 'otel-collector'
          scrape_interval: 30s
          static_configs:
            - targets: ['localhost:8888']

processors:
  batch:
    timeout: 10s
    send_batch_size: 2048

exporters:
  otelarrow:
    endpoint: collector.example.com:4317
    tls:
      insecure: false

  # Export collector metrics for monitoring
  prometheusremotewrite:
    endpoint: http://prometheus.example.com:9090/api/v1/write

service:
  # Enable telemetry for the collector itself
  telemetry:
    logs:
      level: info
    metrics:
      level: detailed
      address: 0.0.0.0:8888

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otelarrow]

    # Monitor the collector's own metrics
    metrics/internal:
      receivers: [prometheus]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

## Troubleshooting

Common issues and solutions when using the OTel Arrow exporter:

**Connection Issues**: Verify the endpoint is correct and the receiving collector has the Arrow receiver enabled on the specified port.

**TLS Errors**: Ensure certificate paths are correct and certificates are valid. Check that the server name matches the certificate's CN or SAN.

**Performance Problems**: Increase the number of streams, adjust batch sizes, and tune queue settings based on your throughput requirements.

**Memory Usage**: If memory consumption is high, reduce batch sizes, queue sizes, and the number of parallel streams.

**Compatibility Issues**: Verify both sending and receiving collectors support Arrow. Fall back to standard OTLP if Arrow is not available.

## Best Practices

1. **Use Arrow for Inter-Collector Communication**: Deploy Arrow between collector tiers to reduce bandwidth costs in high-volume environments.

2. **Monitor Compression Ratios**: Track the compression efficiency to ensure Arrow provides benefits for your specific data patterns.

3. **Tune Batch Sizes**: Larger batches improve Arrow's compression but increase memory usage and latency.

4. **Enable TLS in Production**: Always use TLS encryption for production deployments to protect telemetry data.

5. **Configure Keepalive**: Set appropriate keepalive settings to maintain long-lived gRPC streams efficiently.

6. **Plan for Fallback**: Maintain standard OTLP capability as a fallback if Arrow connections fail.

## Performance Comparison

Expected performance improvements with Arrow versus standard OTLP:

- **Bandwidth Reduction**: 5-10x less data transferred for typical workloads
- **CPU Usage**: Slightly higher due to columnar encoding, but offset by reduced network I/O
- **Memory**: Similar to OTLP when properly configured
- **Latency**: Comparable to OTLP for individual requests, better for sustained throughput

## Related Resources

Learn more about optimizing OpenTelemetry Collector performance:

- [OpenTelemetry Collector Performance Tuning](https://oneuptime.com/blog/post/2026-02-06-what-opentelemetry-does-not-do/view)
- [Understanding OTLP Protocol](https://oneuptime.com/blog/post/2026-02-06-what-opentelemetry-does-not-do/view)

## Conclusion

The OTel Arrow exporter offers significant performance benefits for high-volume telemetry scenarios, especially when connecting multiple collector tiers. By leveraging Apache Arrow's columnar format, you can reduce bandwidth usage dramatically while maintaining full OpenTelemetry compatibility. Start with the basic configuration and gradually optimize based on your specific throughput requirements and network characteristics. The investment in configuring Arrow pays dividends in reduced infrastructure costs and improved telemetry reliability.
