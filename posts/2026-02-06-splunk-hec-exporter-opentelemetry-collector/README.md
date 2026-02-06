# How to Configure the Splunk HEC Exporter in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Exporters, Splunk, HEC, Observability, Logs, Metrics

Description: Complete guide to configuring the Splunk HEC exporter in OpenTelemetry Collector for sending logs, metrics, and traces to Splunk Enterprise and Splunk Cloud.

Splunk is a powerful platform for searching, monitoring, and analyzing machine-generated data. The Splunk HTTP Event Collector (HEC) provides a token-based HTTP API for sending data directly to Splunk. The OpenTelemetry Collector's Splunk HEC exporter enables you to send logs, metrics, and traces to Splunk Enterprise or Splunk Cloud, making it an essential integration for organizations standardizing on OpenTelemetry while maintaining their Splunk investments.

## Understanding Splunk HEC

The HTTP Event Collector is Splunk's modern data ingestion method, replacing traditional file-based inputs and proprietary protocols. HEC accepts data over HTTP or HTTPS using authentication tokens, making it firewall-friendly and easy to integrate with cloud-native applications. The collector formats OpenTelemetry data into Splunk's JSON event structure, handling field mapping, indexing, and source type configuration automatically.

HEC supports two endpoints: the raw endpoint for unstructured data and the event endpoint for structured JSON. The OpenTelemetry exporter uses the event endpoint, which provides better control over metadata like source, source type, index, and timestamp. This structured approach ensures your telemetry data is properly indexed and searchable in Splunk.

## Architecture and Data Flow

Here's how telemetry data flows from applications through the OpenTelemetry Collector to Splunk:

```mermaid
graph LR
    A[Applications] -->|OTLP| B[OTel Collector]
    B -->|Receivers| C[Processors]
    C -->|Transform/Batch| D[Splunk HEC Exporter]
    D -->|HTTPS + Token| E[Splunk HEC Endpoint]
    E --> F[Splunk Indexers]
    F --> G[Splunk Search]
```

## Basic Configuration

Here's a minimal configuration to get started with the Splunk HEC exporter. This example sends logs and metrics to a Splunk instance.

```yaml
# Receivers for collecting telemetry data
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

# Splunk HEC exporter configuration
exporters:
  splunk_hec:
    # Splunk HEC endpoint URL
    endpoint: https://splunk.example.com:8088/services/collector

    # HEC authentication token (required)
    token: "00000000-0000-0000-0000-000000000000"

    # Source for events (appears in Splunk as 'source' field)
    source: "otel-collector"

    # Source type for proper field extraction
    sourcetype: "_json"

    # Splunk index to send data to
    index: "main"

# Batch processor for efficiency
processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

# Pipeline configuration
service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [splunk_hec]

    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [splunk_hec]
```

This basic setup establishes connectivity with Splunk using an HEC token. The token should be created in Splunk Web under Settings > Data Inputs > HTTP Event Collector. Make sure to enable the token and configure allowed indexes.

## Production Configuration with Security

For production environments, you'll need comprehensive security, error handling, and performance tuning. Here's an advanced configuration.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 32
      http:
        endpoint: 0.0.0.0:4318

exporters:
  splunk_hec:
    # Splunk HEC endpoint with HTTPS
    endpoint: https://splunk.example.com:8088/services/collector

    # Use environment variable for token security
    token: "${SPLUNK_HEC_TOKEN}"

    # Source configuration
    source: "otel-collector"
    sourcetype: "_json"
    index: "observability"

    # TLS configuration for secure connection
    tls:
      insecure: false
      insecure_skip_verify: false
      ca_file: /etc/ssl/certs/splunk-ca.crt
      cert_file: /etc/ssl/certs/client-cert.crt
      key_file: /etc/ssl/certs/client-key.key

    # Timeout for HTTP requests
    timeout: 30s

    # Retry configuration for failed requests
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

    # Queue settings for handling backpressure
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

    # Disable gzip compression if Splunk doesn't support it
    disable_compression: false

    # Maximum number of idle connections
    max_idle_conns: 100
    max_idle_conns_per_host: 10
    idle_conn_timeout: 90s

    # HEC health check configuration
    health_check:
      enabled: true
      endpoint: https://splunk.example.com:8088/services/collector/health
      timeout: 10s
      interval: 60s

processors:
  # Memory limiter to prevent OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

  # Batch for performance
  batch:
    timeout: 10s
    send_batch_size: 2048
    send_batch_max_size: 4096

  # Add resource attributes
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert
      - key: service.namespace
        value: backend
        action: upsert

service:
  telemetry:
    logs:
      level: info
      encoding: json
    metrics:
      level: detailed
      address: 0.0.0.0:8888

  pipelines:
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [splunk_hec]

    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [splunk_hec]
```

This production configuration includes several critical features:

**Token Security**: Stores the HEC token in an environment variable rather than in the configuration file, following security best practices.

**TLS Verification**: Validates Splunk's certificate to prevent man-in-the-middle attacks and encrypts data in transit.

**Health Checks**: Periodically verifies the HEC endpoint is available before sending data, preventing unnecessary retry attempts.

**Backpressure Handling**: Queues events when Splunk is temporarily unavailable or slow to respond, preventing data loss.

**Resource Enrichment**: Adds contextual metadata to all events for better filtering and correlation in Splunk searches.

## Multi-Index Configuration

Large organizations often use multiple Splunk indexes to separate data by environment, application, or data type. You can route data to different indexes based on attributes.

```yaml
exporters:
  # Production index for production logs
  splunk_hec/production:
    endpoint: https://splunk.example.com:8088/services/collector
    token: "${SPLUNK_HEC_TOKEN_PROD}"
    source: "otel-prod"
    sourcetype: "_json"
    index: "production"

  # Staging index for staging logs
  splunk_hec/staging:
    endpoint: https://splunk.example.com:8088/services/collector
    token: "${SPLUNK_HEC_TOKEN_STAGING}"
    source: "otel-staging"
    sourcetype: "_json"
    index: "staging"

  # Metrics index for all metrics
  splunk_hec/metrics:
    endpoint: https://splunk.example.com:8088/services/collector
    token: "${SPLUNK_HEC_TOKEN_METRICS}"
    source: "otel-metrics"
    sourcetype: "_json"
    index: "metrics"

processors:
  # Route logs based on environment attribute
  routing:
    from_attribute: deployment.environment
    default_exporters: [splunk_hec/production]
    table:
      - value: production
        exporters: [splunk_hec/production]
      - value: staging
        exporters: [splunk_hec/staging]
      - value: development
        exporters: [splunk_hec/staging]

  batch:
    timeout: 10s
    send_batch_size: 1024

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [routing, batch]
      exporters: [splunk_hec/production, splunk_hec/staging]

    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [splunk_hec/metrics]
```

The routing processor dynamically selects the appropriate exporter based on the environment attribute, ensuring data lands in the correct Splunk index for proper access control and retention policies.

## Logs Configuration with Field Mapping

Splunk has specific field naming conventions for common data types. You can transform OpenTelemetry logs to match Splunk's Common Information Model (CIM).

```yaml
processors:
  # Transform log attributes to Splunk CIM fields
  attributes/splunk:
    actions:
      # Map HTTP fields
      - key: http.method
        action: upsert
        from_attribute: http.request.method

      - key: http.status_code
        action: upsert
        from_attribute: http.response.status_code

      - key: url
        action: upsert
        from_attribute: url.full

      # Map error fields
      - key: error.message
        action: upsert
        from_attribute: exception.message

      - key: error.type
        action: upsert
        from_attribute: exception.type

      # Map user fields
      - key: user.id
        action: upsert
        from_attribute: enduser.id

      - key: user.name
        action: upsert
        from_attribute: enduser.name

      # Remove sensitive data
      - key: http.request.header.authorization
        action: delete

      - key: password
        action: delete

  # Add custom fields for Splunk
  resource/splunk:
    attributes:
      - key: host
        from_attribute: host.name
        action: upsert
      - key: environment
        value: production
        action: insert

  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  splunk_hec:
    endpoint: https://splunk.example.com:8088/services/collector
    token: "${SPLUNK_HEC_TOKEN}"
    source: "otel-logs"
    sourcetype: "_json"
    index: "logs"

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [resource/splunk, attributes/splunk, batch]
      exporters: [splunk_hec]
```

These transformations ensure logs are properly formatted for Splunk's built-in apps and dashboards that rely on CIM field names.

## Metrics Configuration

Splunk handles metrics differently from logs, using the metrics index and specific field structures. Here's how to configure metrics export.

```yaml
exporters:
  splunk_hec/metrics:
    endpoint: https://splunk.example.com:8088/services/collector
    token: "${SPLUNK_HEC_TOKEN}"
    source: "otel-metrics"

    # Use metrics source type for proper handling
    sourcetype: "otel_metrics"

    # Metrics should go to metrics index
    index: "metrics"

    # Metrics-specific settings
    max_content_length_logs: 2097152    # 2MB for logs
    max_content_length_metrics: 2097152  # 2MB for metrics
    max_content_length_traces: 2097152   # 2MB for traces

processors:
  # Add metric labels
  attributes/metrics:
    actions:
      - key: metric.type
        value: application
        action: insert
      - key: metric.source
        value: opentelemetry
        action: insert

  # Aggregate metrics before sending
  batch:
    timeout: 60s
    send_batch_size: 8192

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [attributes/metrics, batch]
      exporters: [splunk_hec/metrics]
```

Splunk's metrics index uses a different storage format optimized for time-series data, providing better query performance and storage efficiency for metric data.

## Traces Configuration

While Splunk traditionally focuses on logs and metrics, it can also store and analyze trace data. Here's how to send traces to Splunk.

```yaml
exporters:
  splunk_hec/traces:
    endpoint: https://splunk.example.com:8088/services/collector
    token: "${SPLUNK_HEC_TOKEN}"
    source: "otel-traces"
    sourcetype: "otel_traces"
    index: "traces"

processors:
  # Add trace context to spans
  attributes/traces:
    actions:
      - key: trace.id
        from_attribute: trace_id
        action: upsert
      - key: span.id
        from_attribute: span_id
        action: upsert
      - key: parent.span.id
        from_attribute: parent_span_id
        action: upsert

  # Tail sampling to reduce volume
  tail_sampling:
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: slow-traces
        type: latency
        latency:
          threshold_ms: 1000
      - name: probabilistic
        type: probabilistic
        probabilistic:
          sampling_percentage: 10.0

  batch:
    timeout: 10s
    send_batch_size: 1024

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/traces, tail_sampling, batch]
      exporters: [splunk_hec/traces]
```

This configuration enriches spans with trace context and implements sampling to control trace volume sent to Splunk.

## High Availability Setup

For mission-critical deployments, configure the collector with load balancing and persistent queues.

```yaml
exporters:
  splunk_hec:
    # Use load balancer endpoint
    endpoint: https://splunk-lb.example.com:8088/services/collector
    token: "${SPLUNK_HEC_TOKEN}"
    source: "otel-collector"
    sourcetype: "_json"
    index: "main"

    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

    # Enable persistent queue
    sending_queue:
      enabled: true
      num_consumers: 20
      queue_size: 10000
      persistent_storage: file_storage

# File storage extension for persistent queue
extensions:
  file_storage:
    directory: /var/lib/otel/storage
    timeout: 10s
    compaction:
      directory: /var/lib/otel/storage
      on_start: true
      on_rebound: true
      rebound_needed_threshold_mib: 5
      rebound_trigger_threshold_mib: 3

  # Health check extension
  health_check:
    endpoint: 0.0.0.0:13133
    tls:
      ca_file: /etc/ssl/certs/ca.crt
      cert_file: /etc/ssl/certs/cert.crt
      key_file: /etc/ssl/certs/key.key

processors:
  batch:
    timeout: 10s
    send_batch_size: 2048

service:
  extensions: [file_storage, health_check]
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [splunk_hec]
```

The persistent queue ensures no data loss during collector restarts or Splunk outages. Data is written to disk and replayed after recovery.

## Performance Optimization

Optimize the Splunk HEC exporter for high-throughput scenarios.

```yaml
exporters:
  splunk_hec:
    endpoint: https://splunk.example.com:8088/services/collector
    token: "${SPLUNK_HEC_TOKEN}"
    source: "otel-collector"
    sourcetype: "_json"
    index: "main"

    # Aggressive timeout
    timeout: 15s

    # Large connection pool
    max_idle_conns: 200
    max_idle_conns_per_host: 50
    idle_conn_timeout: 90s

    # Enable compression
    disable_compression: false

    # Large content length limits
    max_content_length_logs: 5242880      # 5MB
    max_content_length_metrics: 5242880   # 5MB
    max_content_length_traces: 5242880    # 5MB

    # Large queue for burst traffic
    sending_queue:
      enabled: true
      num_consumers: 50
      queue_size: 50000

processors:
  # Large batches
  batch:
    timeout: 5s
    send_batch_size: 4096
    send_batch_max_size: 8192

  # Aggressive memory limits
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048
    spike_limit_mib: 512

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [splunk_hec]
```

These settings maximize throughput by using large batches, many consumers, and generous buffer sizes.

## Splunk Cloud Configuration

Splunk Cloud has specific requirements for HEC configuration. Here's how to configure for Splunk Cloud.

```yaml
exporters:
  splunk_hec:
    # Splunk Cloud HEC endpoint format
    endpoint: https://http-inputs-<tenant>.splunkcloud.com:443/services/collector

    # Splunk Cloud HEC token
    token: "${SPLUNK_CLOUD_HEC_TOKEN}"

    source: "otel-collector"
    sourcetype: "_json"

    # Use index created in Splunk Cloud
    index: "main"

    # Splunk Cloud requires TLS
    tls:
      insecure: false
      insecure_skip_verify: false

    # Health check for Splunk Cloud
    health_check:
      enabled: true
      endpoint: https://http-inputs-<tenant>.splunkcloud.com:443/services/collector/health
      timeout: 10s
      interval: 60s

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [splunk_hec]
```

Replace `<tenant>` with your actual Splunk Cloud tenant name. Ensure your HEC token is enabled and has permission to write to the specified index.

## Kubernetes Integration

Deploy the collector in Kubernetes to collect logs from all pods.

```yaml
exporters:
  splunk_hec:
    endpoint: https://splunk.example.com:8088/services/collector
    token: "${SPLUNK_HEC_TOKEN}"
    source: "kubernetes"
    sourcetype: "kube:container:logs"
    index: "kubernetes"

processors:
  # Add Kubernetes metadata
  k8sattributes:
    auth_type: serviceAccount
    passthrough: false
    extract:
      metadata:
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.deployment.name
        - k8s.namespace.name
        - k8s.node.name
        - k8s.cluster.name
      labels:
        - tag_name: app
          key: app
          from: pod
        - tag_name: component
          key: component
          from: pod

  # Map K8s fields to Splunk CIM
  attributes/k8s:
    actions:
      - key: host
        from_attribute: k8s.node.name
        action: upsert
      - key: pod
        from_attribute: k8s.pod.name
        action: upsert
      - key: namespace
        from_attribute: k8s.namespace.name
        action: upsert

  batch:
    timeout: 10s
    send_batch_size: 1024

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [k8sattributes, attributes/k8s, batch]
      exporters: [splunk_hec]
```

This configuration enriches logs with Kubernetes metadata and maps fields to Splunk's format for container monitoring.

## Monitoring and Troubleshooting

Enable detailed telemetry to monitor the exporter's performance.

```yaml
service:
  telemetry:
    logs:
      level: info
      encoding: json
      output_paths: [stdout, /var/log/otel-collector.log]

    metrics:
      level: detailed
      address: 0.0.0.0:8888
```

Key metrics to monitor:

- `otelcol_exporter_sent_log_records`: Logs successfully sent
- `otelcol_exporter_send_failed_log_records`: Failed log exports
- `otelcol_exporter_queue_size`: Current queue size
- `otelcol_exporter_queue_capacity`: Maximum queue capacity

Common troubleshooting steps:

**401 Unauthorized**: Verify HEC token is correct and enabled in Splunk.

**403 Forbidden**: Check token has permission to write to the specified index.

**503 Service Unavailable**: Splunk indexers may be overloaded. Check Splunk system health.

**Slow Ingestion**: Increase batch size and number of consumers. Check network latency.

## Related Resources

For more information on OpenTelemetry exporters, check out these related posts:

- [How to Configure the OpenSearch Exporter in the OpenTelemetry Collector](https://oneuptime.com/blog/post/opensearch-exporter-opentelemetry-collector/view)
- [How to Configure the Coralogix Exporter in the OpenTelemetry Collector](https://oneuptime.com/blog/post/coralogix-exporter-opentelemetry-collector/view)

The Splunk HEC exporter provides a robust, performant integration between OpenTelemetry and Splunk. With proper configuration, it can handle production-scale workloads while maintaining data integrity and providing comprehensive observability.
