# How to Configure the Fluent Forward Receiver in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Fluent Forward, Fluentd, Logging, Observability

Description: Learn how to configure the Fluent Forward receiver in OpenTelemetry Collector to ingest logs from Fluentd and Fluent Bit with practical YAML examples and best practices.

The Fluent Forward receiver enables the OpenTelemetry Collector to receive logs via the Fluentd Forward protocol. This receiver is particularly useful when migrating from Fluentd or Fluent Bit to OpenTelemetry, or when you need to integrate existing Fluentd-based logging infrastructure with your OpenTelemetry pipeline.

## Understanding the Fluent Forward Protocol

The Fluentd Forward protocol is a binary protocol used by Fluentd and Fluent Bit to transfer log data between agents and aggregators. By implementing this protocol, the OpenTelemetry Collector can act as a drop-in replacement for Fluentd aggregators, making migration paths smoother and enabling hybrid deployments.

The protocol supports both TCP and Unix socket connections, making it flexible for various deployment scenarios. When logs are received through this protocol, they are automatically converted into OpenTelemetry's log data model, allowing you to leverage the full power of OpenTelemetry processors and exporters.

```mermaid
graph LR
    A[Fluent Bit Agent] -->|Forward Protocol| B[OTel Collector]
    C[Fluentd Agent] -->|Forward Protocol| B
    D[Application Logs] --> A
    E[System Logs] --> C
    B --> F[Log Processor]
    F --> G[Backend]
```

## Basic Configuration

The minimal configuration for the Fluent Forward receiver requires only the receiver declaration. By default, it listens on `0.0.0.0:8006`.

Here's a basic configuration:

```yaml
receivers:
  # Fluent Forward receiver with default settings
  fluentforward:
    # Listen on all interfaces on port 8006 (default)
    endpoint: 0.0.0.0:8006

processors:
  # Add batch processing to improve performance
  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  # Export logs to stdout for testing
  logging:
    loglevel: info

service:
  pipelines:
    logs:
      receivers: [fluentforward]
      processors: [batch]
      exporters: [logging]
```

This configuration creates a log pipeline that receives Fluent Forward messages, batches them for efficiency, and exports them to the console for verification.

## Advanced Configuration Options

The Fluent Forward receiver supports several advanced configuration options for production deployments.

### Network Configuration

You can customize the network settings to control how the receiver accepts connections:

```yaml
receivers:
  fluentforward:
    # Listen on a specific interface and port
    endpoint: 0.0.0.0:24224

    # Unix socket listener (alternative to TCP)
    # Useful for same-host communication with better performance
    # endpoint: unix:///var/run/fluent-forward.sock

    # TCP server settings
    tcp:
      # Maximum size of a single message (default: 64 MiB)
      max_recv_msg_size_mib: 128

      # Keep-alive settings
      keep_alive:
        enabled: true
        idle_time: 30s
        interval: 15s
        max_probe_count: 3
```

The `max_recv_msg_size_mib` parameter is crucial when dealing with large log messages. If your logs frequently exceed the default size, increase this value to prevent dropped messages.

### Authentication and Security

For production environments, you should enable authentication to prevent unauthorized log submissions:

```yaml
receivers:
  fluentforward:
    endpoint: 0.0.0.0:24224

    # Enable shared key authentication
    # This matches Fluentd's secure_forward configuration
    auth:
      shared_key: "your-secure-shared-key-here"
      username: "log-collector"
      password: "secure-password"

    # TLS configuration for encrypted transport
    tls:
      # Path to server certificate and key
      cert_file: /etc/otel/certs/server.crt
      key_file: /etc/otel/certs/server.key

      # Require client certificates for mutual TLS
      client_ca_file: /etc/otel/certs/ca.crt

      # Minimum TLS version
      min_version: "1.2"
```

When using authentication, ensure your Fluentd or Fluent Bit clients are configured with matching credentials. The shared key provides basic authentication, while TLS adds encryption and can provide mutual authentication when client certificates are required.

## Configuring Fluentd to Send Logs

To send logs from Fluentd to the OpenTelemetry Collector, configure a forward output:

```conf
# Fluentd configuration to forward logs to OpenTelemetry Collector
<source>
  @type tail
  path /var/log/app/*.log
  pos_file /var/log/td-agent/app.log.pos
  tag app.logs
  <parse>
    @type json
    time_key timestamp
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</source>

<match app.logs>
  @type forward

  # OpenTelemetry Collector endpoint
  <server>
    host otel-collector.example.com
    port 24224
  </server>

  # Enable authentication if configured on receiver
  <security>
    self_hostname ${hostname}
    shared_key your-secure-shared-key-here
  </security>

  # Buffer configuration for reliability
  <buffer>
    @type file
    path /var/log/td-agent/buffer/forward
    flush_interval 5s
    retry_type exponential_backoff
    retry_max_interval 30s
  </buffer>
</match>
```

## Configuring Fluent Bit to Send Logs

Fluent Bit can also forward logs using the Forward protocol:

```conf
[SERVICE]
    Flush        5
    Daemon       Off
    Log_Level    info

[INPUT]
    Name              tail
    Path              /var/log/containers/*.log
    Parser            docker
    Tag               kube.*
    Refresh_Interval  5
    Mem_Buf_Limit     5MB

[OUTPUT]
    Name          forward
    Match         *
    Host          otel-collector.example.com
    Port          24224

    # Retry settings
    Retry_Limit   5

    # Use shared key authentication
    Shared_Key    your-secure-shared-key-here

    # Enable TLS if configured on receiver
    tls           on
    tls.verify    on
    tls.ca_file   /etc/fluent-bit/certs/ca.crt
```

## Production-Ready Configuration

Here's a complete production configuration that includes error handling, resource detection, and multiple export destinations:

```yaml
receivers:
  fluentforward:
    endpoint: 0.0.0.0:24224

    # Production network settings
    tcp:
      max_recv_msg_size_mib: 256
      keep_alive:
        enabled: true
        idle_time: 60s
        interval: 30s

    # Security configuration
    auth:
      shared_key: "${env:FLUENT_SHARED_KEY}"

    tls:
      cert_file: /etc/otel/certs/server.crt
      key_file: /etc/otel/certs/server.key
      min_version: "1.2"

processors:
  # Add resource attributes for better context
  resource:
    attributes:
      - key: collector.name
        value: otel-fluent-forward
        action: insert
      - key: deployment.environment
        value: production
        action: insert

  # Parse and extract structured data from logs
  attributes:
    actions:
      - key: log.file.path
        action: extract
        pattern: ^/var/log/(?P<service>[^/]+)/.*$
      - key: service.name
        from_attribute: service
        action: insert

  # Batch logs for efficiency
  batch:
    timeout: 10s
    send_batch_size: 2048

  # Add memory limiter to prevent OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  # Export to observability backend
  otlp:
    endpoint: https://observability.example.com:4317
    headers:
      api-key: "${env:OBSERVABILITY_API_KEY}"
    compression: gzip

  # Keep console export for debugging
  logging:
    loglevel: info
    sampling_initial: 5
    sampling_thereafter: 200

service:
  pipelines:
    logs:
      receivers: [fluentforward]
      processors: [memory_limiter, resource, attributes, batch]
      exporters: [otlp, logging]

  # Enable telemetry for collector monitoring
  telemetry:
    logs:
      level: info
    metrics:
      address: :8888
```

## Monitoring and Troubleshooting

The Fluent Forward receiver exposes several metrics to help you monitor its health and performance. Enable the Prometheus exporter to collect these metrics:

```yaml
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: otelcol

service:
  telemetry:
    metrics:
      address: :8888

  pipelines:
    logs:
      receivers: [fluentforward]
      processors: [batch]
      exporters: [otlp]

    # Separate pipeline for collector metrics
    metrics:
      receivers: [prometheus]
      exporters: [prometheus]
```

Key metrics to monitor include:

- `otelcol_receiver_accepted_log_records`: Number of log records successfully received
- `otelcol_receiver_refused_log_records`: Number of log records rejected
- `otelcol_processor_batch_timeout_trigger_send`: How often batches are sent due to timeout
- `otelcol_exporter_send_failed_log_records`: Number of logs that failed to export

## Common Issues and Solutions

### Connection Refused

If Fluentd or Fluent Bit cannot connect to the collector, verify:

1. The endpoint configuration matches on both sides
2. Firewall rules allow traffic on the configured port
3. The collector is running and listening on the correct interface

### Authentication Failures

When using shared key authentication, ensure:

1. The shared key matches exactly between sender and receiver
2. Special characters in the key are properly escaped
3. Environment variables are correctly interpolated

### High Memory Usage

If the collector consumes excessive memory:

1. Reduce `send_batch_size` in the batch processor
2. Lower `max_recv_msg_size_mib` if you're receiving very large messages
3. Enable and tune the memory limiter processor
4. Increase export frequency to reduce buffering

## Integration with OneUptime

When using OneUptime as your observability backend, configure the OTLP exporter to send logs:

```yaml
exporters:
  otlp:
    endpoint: https://opentelemetry-collector.oneuptime.com:4317
    headers:
      x-oneuptime-token: "${env:ONEUPTIME_API_KEY}"
    compression: gzip

service:
  pipelines:
    logs:
      receivers: [fluentforward]
      processors: [batch]
      exporters: [otlp]
```

For more information on OpenTelemetry Collector exporters, see our guide on [configuring OTLP exporters](https://oneuptime.com/blog/post/2026-02-06-otlp-grpc-exporter-opentelemetry-collector/view).

## Conclusion

The Fluent Forward receiver provides a seamless migration path from Fluentd-based logging infrastructure to OpenTelemetry. By supporting the Fluent Forward protocol, it allows you to incrementally adopt OpenTelemetry while maintaining compatibility with existing Fluentd and Fluent Bit deployments.

Start with a basic configuration and gradually add authentication, TLS, and advanced processing as your requirements grow. Monitor the receiver metrics to ensure healthy operation and tune configuration parameters based on your specific workload characteristics.

For more OpenTelemetry Collector receivers, explore our guides on the [Docker Stats receiver](https://oneuptime.com/blog/post/2026-02-06-docker-stats-receiver-opentelemetry-collector/view) and [PostgreSQL receiver](https://oneuptime.com/blog/post/2026-02-06-postgresql-receiver-opentelemetry-collector/view).
