# How to Configure Exporters in OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Exporters, OTLP, Observability, Collector, Telemetry, Backend Integration

Description: Learn how to configure OpenTelemetry exporters to send traces, metrics, and logs to various backends with proper authentication, retry logic, and performance tuning.

---

Exporters are the final stage of the OpenTelemetry pipeline. They take processed telemetry data and send it to observability backends for storage and analysis. This guide covers configuring the most common exporters in the OpenTelemetry Collector with production-ready settings.

## Understanding Exporter Types

OpenTelemetry supports several exporter categories:

- **OTLP Exporters**: Send data using the OpenTelemetry Protocol (recommended)
- **Vendor-Specific Exporters**: Direct integration with backends like Jaeger, Prometheus, or cloud providers
- **Debug Exporter**: Outputs telemetry to logs for troubleshooting
- **File Exporter**: Writes telemetry to files for batch processing

## OTLP HTTP Exporter

The OTLP HTTP exporter is the most common choice for sending telemetry to backends that support the OpenTelemetry Protocol.

### Basic Configuration

```yaml
exporters:
  otlphttp:
    endpoint: "https://your-backend.example.com"
    headers:
      Authorization: "Bearer ${API_TOKEN}"
```

### Complete Production Configuration

```yaml
exporters:
  otlphttp:
    # Backend endpoint
    endpoint: "https://otlp.example.com"

    # Custom headers for authentication
    headers:
      Authorization: "Bearer ${OTEL_API_KEY}"
      X-Custom-Header: "custom-value"

    # TLS configuration
    tls:
      # Path to CA certificate
      ca_file: /etc/ssl/certs/ca.crt
      # Client certificate for mTLS
      cert_file: /etc/ssl/certs/client.crt
      key_file: /etc/ssl/certs/client.key
      # Skip certificate verification (not recommended for production)
      insecure_skip_verify: false

    # Compression reduces bandwidth (gzip or none)
    compression: gzip

    # Timeout for each export request
    timeout: 30s

    # Retry configuration
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

    # Queue for handling backpressure
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
```

### Separate Endpoints for Each Signal

Some backends use different endpoints for traces, metrics, and logs:

```yaml
exporters:
  otlphttp/traces:
    endpoint: "https://traces.example.com/v1/traces"
    headers:
      Authorization: "Bearer ${TRACES_API_KEY}"

  otlphttp/metrics:
    endpoint: "https://metrics.example.com/v1/metrics"
    headers:
      Authorization: "Bearer ${METRICS_API_KEY}"

  otlphttp/logs:
    endpoint: "https://logs.example.com/v1/logs"
    headers:
      Authorization: "Bearer ${LOGS_API_KEY}"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/traces]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/metrics]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/logs]
```

## OTLP gRPC Exporter

The gRPC exporter offers better performance for high-throughput scenarios.

```yaml
exporters:
  otlp:
    endpoint: "your-backend.example.com:4317"

    # TLS settings
    tls:
      insecure: false
      ca_file: /etc/ssl/certs/ca.crt

    # Headers for authentication
    headers:
      api-key: "${OTEL_API_KEY}"

    # Compression (gzip, snappy, zstd, or none)
    compression: gzip

    # Connection settings
    keepalive:
      time: 30s
      timeout: 10s
      permit_without_stream: true

    # gRPC-specific settings
    balancer_name: round_robin

    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
```

## Debug Exporter

The debug exporter writes telemetry to the collector's logs. Useful for development and troubleshooting.

```yaml
exporters:
  debug:
    # Verbosity level: basic, normal, or detailed
    verbosity: detailed

    # Sample initial N items
    sampling_initial: 5

    # After initial, sample 1 in N
    sampling_thereafter: 200

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
```

Use `verbosity: basic` in production to log only counts, not full payloads.

## File Exporter

Write telemetry to files for batch processing or disaster recovery.

```yaml
exporters:
  file:
    path: /var/otel/traces.json

    # Rotate files based on size or time
    rotation:
      max_megabytes: 100
      max_days: 7
      max_backups: 5
      localtime: true

    # Format: json or proto
    format: json

    # Compress rotated files
    compression: gzip
```

## Prometheus Exporter

Export metrics in Prometheus format for scraping.

```yaml
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"

    # Namespace prefix for all metrics
    namespace: myapp

    # Add constant labels
    const_labels:
      environment: production

    # Include resource attributes as labels
    resource_to_telemetry_conversion:
      enabled: true

    # Enable OpenMetrics format
    enable_open_metrics: true
```

Configure Prometheus to scrape this endpoint:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8889']
```

## Prometheus Remote Write Exporter

Push metrics to Prometheus-compatible backends.

```yaml
exporters:
  prometheusremotewrite:
    endpoint: "https://prometheus.example.com/api/v1/write"

    # Authentication
    headers:
      Authorization: "Bearer ${PROMETHEUS_TOKEN}"

    # TLS configuration
    tls:
      ca_file: /etc/ssl/certs/ca.crt

    # Resource to metric labels
    resource_to_telemetry_conversion:
      enabled: true

    # Retry settings
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
```

## Kafka Exporter

Send telemetry to Kafka for downstream processing.

```yaml
exporters:
  kafka:
    brokers:
      - kafka-1:9092
      - kafka-2:9092
      - kafka-3:9092

    # Topic per signal type
    topic: otel-traces

    # Encoding: otlp_proto, otlp_json, jaeger_proto, jaeger_json
    encoding: otlp_proto

    # Partition strategy
    producer:
      max_message_bytes: 10000000
      required_acks: 1
      compression: snappy

    # Authentication
    auth:
      sasl:
        username: ${KAFKA_USERNAME}
        password: ${KAFKA_PASSWORD}
        mechanism: SCRAM-SHA-256
      tls:
        ca_file: /etc/ssl/certs/kafka-ca.crt
```

## Load Balancing Exporter

Distribute telemetry across multiple backend instances.

```yaml
exporters:
  loadbalancing:
    protocol:
      otlp:
        timeout: 10s
        tls:
          insecure: true

    resolver:
      # DNS-based discovery
      dns:
        hostname: otel-gateway.example.com
        port: 4317

      # Or static list
      # static:
      #   hostnames:
      #     - gateway-1:4317
      #     - gateway-2:4317
      #     - gateway-3:4317

    # Route by trace ID for consistent hashing
    routing_key: traceID
```

## Multi-Backend Export

Send telemetry to multiple backends simultaneously.

```yaml
exporters:
  otlphttp/primary:
    endpoint: "https://primary-backend.example.com"
    headers:
      Authorization: "Bearer ${PRIMARY_API_KEY}"

  otlphttp/backup:
    endpoint: "https://backup-backend.example.com"
    headers:
      Authorization: "Bearer ${BACKUP_API_KEY}"

  file/archive:
    path: /var/otel/archive.json
    rotation:
      max_megabytes: 500

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/primary, otlphttp/backup, file/archive]
```

## Sending Queue Configuration

The sending queue buffers data when the backend is slow or unavailable.

```yaml
exporters:
  otlphttp:
    endpoint: "https://backend.example.com"

    sending_queue:
      # Enable queueing
      enabled: true

      # Number of consumers sending data
      num_consumers: 10

      # Maximum items in queue
      queue_size: 10000

      # Persistent storage (survives restarts)
      storage: file_storage

extensions:
  file_storage:
    directory: /var/otel/queue
    timeout: 10s
    compaction:
      on_start: true
      directory: /var/otel/queue/compaction
      max_transaction_size: 65536

service:
  extensions: [file_storage]
```

## Retry Configuration

Configure how exporters handle transient failures.

```yaml
exporters:
  otlphttp:
    endpoint: "https://backend.example.com"

    retry_on_failure:
      # Enable retries
      enabled: true

      # Initial delay between retries
      initial_interval: 5s

      # Maximum delay between retries
      max_interval: 30s

      # Give up after this total time
      max_elapsed_time: 300s

      # Multiplier for exponential backoff
      multiplier: 1.5

      # Add randomization to prevent thundering herd
      randomization_factor: 0.5
```

## Monitoring Exporters

Track exporter health with built-in metrics:

```yaml
service:
  telemetry:
    metrics:
      level: detailed
      address: 0.0.0.0:8888
```

Key metrics to monitor:
- `otelcol_exporter_sent_spans` - Successfully exported spans
- `otelcol_exporter_send_failed_spans` - Failed exports
- `otelcol_exporter_queue_size` - Current queue depth
- `otelcol_exporter_queue_capacity` - Maximum queue capacity
- `otelcol_exporter_enqueue_failed_spans` - Items dropped due to full queue

## Complete Production Example

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    check_interval: 5s
    limit_mib: 2048
    spike_limit_mib: 512

  batch:
    send_batch_size: 1024
    timeout: 5s

exporters:
  otlphttp:
    endpoint: "https://otlp.backend.example.com"
    headers:
      Authorization: "Bearer ${OTEL_API_KEY}"
    compression: gzip
    timeout: 30s
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
      storage: file_storage

  debug:
    verbosity: basic
    sampling_initial: 2
    sampling_thereafter: 500

extensions:
  file_storage:
    directory: /var/otel/queue
    timeout: 10s

service:
  extensions: [file_storage]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp, debug]

    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp]

    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp]
```

## Conclusion

Exporters connect your telemetry pipeline to the outside world. Proper configuration ensures reliable delivery even when backends experience issues. Start with the OTLP exporter for maximum compatibility, add retry logic and queuing for resilience, and monitor exporter metrics to catch problems before they cause data loss. The flexibility of the collector allows you to route different signals to different backends, maintain backups, and adapt as your observability needs evolve.
