# How to Configure the Elasticsearch Exporter in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Exporter, Elasticsearch, Observability, Log, Trace

Description: Learn how to configure the Elasticsearch exporter in OpenTelemetry Collector to send telemetry data to Elasticsearch clusters with authentication, TLS, and index management.

The OpenTelemetry Collector provides a powerful Elasticsearch exporter that enables you to send traces, logs, and metrics directly to your Elasticsearch cluster. This integration is particularly valuable for organizations already using the Elastic Stack for search and analytics, allowing them to leverage their existing infrastructure for observability data.

## Understanding the Elasticsearch Exporter

The Elasticsearch exporter is part of the OpenTelemetry Collector contrib distribution. It sends telemetry data to Elasticsearch using the Bulk API, which provides efficient batch processing of documents. The exporter supports various authentication methods, TLS configuration, and flexible index management strategies.

When you send telemetry data to Elasticsearch, each signal type (traces, metrics, logs) can be routed to different indices with customizable naming patterns. This allows you to organize your observability data according to your retention policies and query patterns.

## Architecture Overview

The following diagram illustrates how the Elasticsearch exporter fits into your telemetry pipeline:

```mermaid
graph LR
    A[Applications] -->|OTLP| B[OpenTelemetry Collector]
    B -->|Receivers| C[Processors]
    C -->|Pipeline| D[Elasticsearch Exporter]
    D -->|Bulk API| E[Elasticsearch Cluster]
    E --> F[Index: traces-*]
    E --> G[Index: metrics-*]
    E --> H[Index: logs-*]
```

## Prerequisites

Before configuring the Elasticsearch exporter, ensure you have:

- OpenTelemetry Collector Contrib distribution installed
- An Elasticsearch cluster. The exporter is API-compatible with Elasticsearch 7.17.x, 8.x, and 9.x, but the default OTel mapping mode requires Elasticsearch 8.12 or later and works best with 8.16 or later.
- Network connectivity between the Collector and Elasticsearch
- Appropriate credentials for authentication (if required)

## Basic Configuration

Here is a minimal configuration for the Elasticsearch exporter that sends data to a local Elasticsearch instance:

```yaml
# Basic Elasticsearch exporter configuration

exporters:
  elasticsearch:
    # Elasticsearch endpoint(s)
    endpoints:
      - http://localhost:9200

    # Index name for traces
    traces_index: traces

    # Index name for logs
    logs_index: logs

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
    send_batch_size: 1024

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [elasticsearch]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [elasticsearch]
```

This basic setup connects to Elasticsearch without authentication and writes traces to the `traces` index and logs to the `logs` index.

## Authentication Configuration

Production Elasticsearch deployments typically require authentication. The exporter supports multiple authentication mechanisms.

### Basic Authentication

For username and password authentication:

```yaml
exporters:
  elasticsearch:
    endpoints:
      - https://elasticsearch.example.com:9200

    # Basic authentication credentials
    auth:
      authenticator: basicauth/elasticsearch

    # Index configuration
    traces_index: otel-traces
    logs_index: otel-logs

    # Discovery mode helps with cluster node discovery
    discover:
      on_start: true

# Configure the basic authenticator
extensions:
  basicauth/elasticsearch:
    client_auth:
      username: elastic
      password: ${ELASTICSEARCH_PASSWORD}

service:
  extensions: [basicauth/elasticsearch]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [elasticsearch]
```

### API Key Authentication

For API key-based authentication:

```yaml
exporters:
  elasticsearch:
    endpoints:
      - https://elasticsearch.example.com:9200

    # API key authentication
    api_key: ${ELASTICSEARCH_API_KEY}

    traces_index: otel-traces
    logs_index: otel-logs
```

## Advanced Index Management

Elasticsearch excels at time-series data management. Configure Logstash-format daily index names for better data lifecycle management:

```yaml
exporters:
  elasticsearch:
    endpoints:
      - https://elasticsearch.example.com:9200

    auth:
      authenticator: basicauth/elasticsearch

    # Daily index names with Logstash-format compatibility
    # Creates indices like: traces-2026-02-06
    traces_index: traces
    logs_index: logs

    logstash_format:
      enabled: true
      prefix_separator: "-"
      date_format: "%Y-%m-%d"

extensions:
  basicauth/elasticsearch:
    client_auth:
      username: elastic
      password: ${ELASTICSEARCH_PASSWORD}

service:
  extensions: [basicauth/elasticsearch]
```

The `logstash_format` settings use strftime date formatting. This creates daily indices, which is useful for implementing Index Lifecycle Management (ILM) policies in Elasticsearch. Define shard counts, replicas, mappings, and ILM policy names in Elasticsearch index templates rather than in the exporter configuration.

## TLS Configuration

When connecting to Elasticsearch over TLS, you need to configure certificate validation:

```yaml
exporters:
  elasticsearch:
    endpoints:
      - https://elasticsearch.example.com:9200

    auth:
      authenticator: basicauth/elasticsearch

    # TLS configuration
    tls:
      # Path to CA certificate for server verification
      ca_file: /etc/otel/certs/ca.crt

      # Client certificate for mutual TLS (optional)
      cert_file: /etc/otel/certs/client.crt
      key_file: /etc/otel/certs/client.key

      # Skip certificate verification (not recommended for production)
      insecure_skip_verify: false

      # Server name for certificate validation
      server_name_override: elasticsearch.example.com

    traces_index: otel-traces
    logs_index: otel-logs

extensions:
  basicauth/elasticsearch:
    client_auth:
      username: elastic
      password: ${ELASTICSEARCH_PASSWORD}

service:
  extensions: [basicauth/elasticsearch]
```

## Performance Tuning

Optimize the exporter's performance for high-throughput environments:

```yaml
exporters:
  elasticsearch:
    endpoints:
      - https://es-node1.example.com:9200
      - https://es-node2.example.com:9200
      - https://es-node3.example.com:9200

    # Enable node discovery for load balancing
    discover:
      on_start: true
      interval: 5m

    # Queueing and batching configuration
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 100
      batch:
        # Send queued batches after this interval even if not full
        flush_timeout: 10s
        # Size batches by pdata bytes
        sizer: bytes
        min_size: 1048576
        max_size: 5242880

    # Retry configuration
    retry:
      enabled: true
      max_retries: 5
      initial_interval: 5s
      max_interval: 30s

    # Timeout for requests
    timeout: 90s

    traces_index: otel-traces
    logs_index: otel-logs

processors:
  batch:
    # Batch processor settings should align with exporter settings
    timeout: 10s
    send_batch_size: 1024
    send_batch_max_size: 2048

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [elasticsearch]
```

## Complete Production Configuration

Here is a comprehensive production-ready configuration combining all best practices:

```yaml
extensions:
  health_check:
    endpoint: 0.0.0.0:13133

  basicauth/elasticsearch:
    client_auth:
      username: ${ELASTICSEARCH_USERNAME}
      password: ${ELASTICSEARCH_PASSWORD}

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
    send_batch_size: 1024
    send_batch_max_size: 2048

  # Add resource attributes for better querying
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: insert

  # Memory limiter to prevent OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  elasticsearch:
    endpoints:
      - https://es-node1.example.com:9200
      - https://es-node2.example.com:9200
      - https://es-node3.example.com:9200

    auth:
      authenticator: basicauth/elasticsearch

    discover:
      on_start: true
      interval: 5m

    tls:
      ca_file: /etc/otel/certs/ca.crt
      cert_file: /etc/otel/certs/client.crt
      key_file: /etc/otel/certs/client.key
      insecure_skip_verify: false

    traces_index: otel-traces
    logs_index: otel-logs

    logstash_format:
      enabled: true
      prefix_separator: "-"
      date_format: "%Y-%m-%d"

    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 100
      batch:
        flush_timeout: 10s
        sizer: bytes
        min_size: 1048576
        max_size: 5242880

    retry:
      enabled: true
      max_retries: 5
      initial_interval: 5s
      max_interval: 30s

    timeout: 90s

service:
  extensions: [health_check, basicauth/elasticsearch]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [elasticsearch]

    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [elasticsearch]
```

## Monitoring and Troubleshooting

Enable the Collector's own telemetry to monitor the Elasticsearch exporter:

```yaml
service:
  telemetry:
    logs:
      level: info
      output_paths:
        - /var/log/otel-collector.log

    metrics:
      level: detailed
```

Common issues and solutions:

- **Connection timeouts**: Increase the `timeout` value or check network connectivity
- **Bulk request failures**: Reduce `sending_queue.batch.max_size` or check Elasticsearch indexing errors
- **Authentication errors**: Verify credentials and ensure the user has necessary privileges
- **Index creation failures**: Check that the Elasticsearch user has `create_index` privilege

## Elasticsearch Index Templates

Create index templates in Elasticsearch to ensure consistent mappings:

```http
PUT _index_template/otel-traces
{
  "index_patterns": ["otel-traces-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 2,
      "index.lifecycle.name": "otel-traces-policy"
    },
    "mappings": {
      "properties": {
        "traceId": { "type": "keyword" },
        "spanId": { "type": "keyword" },
        "parentSpanId": { "type": "keyword" },
        "name": { "type": "keyword" },
        "duration": { "type": "long" }
      }
    }
  }
}
```

## Integration with Kibana

Once your telemetry data is in Elasticsearch, you can visualize it in Kibana. Create data views for your indices:

1. Navigate to Stack Management > Data Views
2. Create a data view with pattern `otel-traces-*`
3. Set `@timestamp` as the time field
4. Repeat for logs with pattern `otel-logs-*`

## Conclusion

The Elasticsearch exporter provides a robust solution for sending OpenTelemetry data to Elasticsearch. By following the configuration patterns outlined in this guide, you can build a scalable observability pipeline that leverages Elasticsearch's powerful search and analytics capabilities. Remember to tune batch sizes, implement proper authentication, and use time-based indices for optimal performance and manageability.

For organizations already invested in the Elastic Stack, this exporter offers a smooth path to adopting OpenTelemetry as the standardized observability framework while maintaining your existing analysis and visualization workflows.

To learn more about other exporters, check out our guides on the [ClickHouse exporter](https://oneuptime.com/blog/post/2026-02-06-clickhouse-exporter-opentelemetry-collector/view) and [Datadog exporter](https://oneuptime.com/blog/post/2026-02-06-datadog-exporter-opentelemetry-collector/view).
