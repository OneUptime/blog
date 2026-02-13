# How to Configure the OpenSearch Exporter in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Exporters, OpenSearch, Observability, Telemetry

Description: Learn how to configure the OpenSearch exporter in OpenTelemetry Collector to send traces, metrics, and logs to OpenSearch for powerful search and analytics capabilities.

OpenSearch is a popular open-source search and analytics engine that provides powerful capabilities for storing and querying telemetry data. The OpenTelemetry Collector's OpenSearch exporter enables you to send traces, metrics, and logs directly to OpenSearch clusters, making it an excellent choice for organizations that want full control over their observability data with an open-source solution.

## Understanding the OpenSearch Exporter

The OpenSearch exporter is designed to write OpenTelemetry data to OpenSearch indices. It supports all three telemetry signals (traces, metrics, and logs) and provides flexible configuration options for authentication, index management, and data formatting. This exporter is particularly useful when you want to leverage OpenSearch's search capabilities, visualization tools like OpenSearch Dashboards, and machine learning features for anomaly detection.

The exporter handles the conversion of OpenTelemetry Protocol (OTLP) data into JSON documents that OpenSearch can index efficiently. It automatically creates indices with appropriate mappings and supports both basic authentication and AWS Signature Version 4 for secure connections.

## Architecture Overview

Here's how telemetry data flows through the OpenTelemetry Collector to OpenSearch:

```mermaid
graph LR
    A[Applications] -->|OTLP| B[OTel Collector]
    B -->|Receivers| C[Processors]
    C -->|Batch/Transform| D[OpenSearch Exporter]
    D -->|HTTP/HTTPS| E[OpenSearch Cluster]
    E --> F[Indices]
    F --> G[OpenSearch Dashboards]
```

## Basic Configuration

Here's a minimal configuration to get started with the OpenSearch exporter. This example sends traces to a local OpenSearch instance.

```yaml
# receivers section - collecting telemetry data
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

# exporters section - configuring OpenSearch destination
exporters:
  opensearch:
    # OpenSearch cluster endpoints
    http:
      endpoint: http://localhost:9200

    # Index configuration for traces
    traces_index: otel-traces

    # Index configuration for logs
    logs_index: otel-logs

    # Index configuration for metrics
    metrics_index: otel-metrics

# processors for data transformation
processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

# service pipeline configuration
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [opensearch]

    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [opensearch]

    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [opensearch]
```

This basic configuration establishes OTLP receivers on standard ports and exports all three signal types to separate OpenSearch indices. The batch processor optimizes network usage by grouping data before sending.

## Advanced Configuration with Authentication

In production environments, you'll need to secure your OpenSearch cluster with authentication. Here's a comprehensive configuration with security features enabled.

```yaml
exporters:
  opensearch:
    # Multiple endpoints for high availability
    http:
      endpoint: https://opensearch-node1.example.com:9200
      endpoints:
        - https://opensearch-node1.example.com:9200
        - https://opensearch-node2.example.com:9200
        - https://opensearch-node3.example.com:9200

      # TLS configuration for secure connections
      tls:
        insecure: false
        insecure_skip_verify: false
        ca_file: /etc/ssl/certs/opensearch-ca.crt
        cert_file: /etc/ssl/certs/client-cert.crt
        key_file: /etc/ssl/certs/client-key.key

      # Authentication settings
      auth:
        authenticator: basicauth

    # Basic authentication credentials
    auth:
      user: admin
      password: ${OPENSEARCH_PASSWORD}

    # Index naming patterns with time-based rotation
    traces_index: otel-traces-%{2006.01.02}
    logs_index: otel-logs-%{2006.01.02}
    metrics_index: otel-metrics-%{2006.01.02}

    # Bulk indexing settings for performance
    bulk:
      max_batch_size: 1000
      max_batch_bytes: 5242880  # 5MB
      flush_interval: 30s

    # Retry configuration for transient failures
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

    # Connection pool settings
    discover_nodes_interval: 5m
    discover_nodes_on_start: true

    # Mapping configuration
    mapping:
      mode: ecs  # Use Elastic Common Schema format
```

This advanced configuration includes several important features:

**Multiple Endpoints**: Distributes load across multiple OpenSearch nodes and provides failover capability if one node becomes unavailable.

**TLS Security**: Encrypts data in transit and validates server certificates to prevent man-in-the-middle attacks.

**Time-Based Index Rotation**: Creates daily indices using Go time formatting, which helps with index lifecycle management and search performance.

**Bulk Indexing**: Batches documents together to reduce network overhead and improve indexing throughput.

**Retry Logic**: Automatically retries failed requests with exponential backoff to handle transient network issues.

## AWS OpenSearch Service Configuration

If you're using AWS OpenSearch Service (formerly Amazon Elasticsearch Service), you'll need AWS Signature Version 4 authentication.

```yaml
exporters:
  opensearch:
    http:
      endpoint: https://search-domain.us-east-1.es.amazonaws.com

      # AWS authentication configuration
      auth:
        authenticator: sigv4auth

    # AWS SigV4 authentication settings
    aws:
      region: us-east-1
      service: es

      # Use IAM role or access keys
      # Option 1: Use IAM role (recommended for EC2/ECS/EKS)
      role_arn: arn:aws:iam::123456789012:role/OTelCollectorRole

      # Option 2: Use access keys (not recommended for production)
      # access_key_id: ${AWS_ACCESS_KEY_ID}
      # secret_access_key: ${AWS_SECRET_ACCESS_KEY}

    traces_index: otel-traces
    logs_index: otel-logs
    metrics_index: otel-metrics

# Add the sigv4auth extension
extensions:
  sigv4auth:
    region: us-east-1
    service: es

service:
  extensions: [sigv4auth]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [opensearch]
```

Using IAM roles is the recommended approach for AWS environments as it eliminates the need to manage static credentials. The collector automatically retrieves temporary credentials from the instance metadata service.

## Index Template Management

OpenSearch uses index templates to define mappings and settings for new indices. You can configure the exporter to automatically create templates.

```yaml
exporters:
  opensearch:
    http:
      endpoint: http://localhost:9200

    # Enable automatic template creation
    index_template:
      enabled: true

      # Template for traces indices
      traces:
        name: otel-traces-template
        pattern: otel-traces-*
        settings:
          number_of_shards: 3
          number_of_replicas: 1
          refresh_interval: 30s
          codec: best_compression

        # Custom field mappings
        mappings:
          properties:
            trace_id:
              type: keyword
            span_id:
              type: keyword
            parent_span_id:
              type: keyword
            name:
              type: text
              fields:
                keyword:
                  type: keyword
            start_time:
              type: date
            duration:
              type: long

      # Template for logs indices
      logs:
        name: otel-logs-template
        pattern: otel-logs-*
        settings:
          number_of_shards: 3
          number_of_replicas: 1
          refresh_interval: 30s
```

Index templates ensure consistent mapping across all indices matching the pattern, which improves query performance and reduces storage overhead.

## Data Transformation and Filtering

You can use processors to transform data before it reaches OpenSearch. This example filters sensitive information and adds custom attributes.

```yaml
processors:
  # Remove sensitive attributes
  attributes:
    actions:
      - key: password
        action: delete
      - key: credit_card
        action: delete
      - key: environment
        value: production
        action: upsert

  # Resource detection for cloud metadata
  resourcedetection:
    detectors: [env, system, docker, ec2]
    timeout: 5s

  # Transform data format
  transform:
    trace_statements:
      - context: span
        statements:
          - set(attributes["custom.field"], "value")
          - truncate_all(attributes, 4096)

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resourcedetection, attributes, transform, batch]
      exporters: [opensearch]
```

These processors enrich telemetry data with cloud metadata, remove sensitive fields, and ensure attribute values don't exceed size limits.

## Monitoring and Troubleshooting

Enable detailed logging to troubleshoot issues with the OpenSearch exporter.

```yaml
service:
  telemetry:
    logs:
      level: debug
      encoding: json
      output_paths: [stdout, /var/log/otel-collector.log]

    metrics:
      level: detailed
      address: 0.0.0.0:8888

exporters:
  opensearch:
    http:
      endpoint: http://localhost:9200

    # Enable detailed logging for this exporter
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

    timeout: 30s
```

Common issues and solutions:

**Connection Refused**: Verify OpenSearch is running and accessible from the collector host. Check firewall rules and security groups.

**Authentication Failed**: Ensure credentials are correct and the user has appropriate permissions (cluster_monitor, create_index, write).

**Indexing Errors**: Check OpenSearch logs for mapping conflicts or invalid data. Verify index templates are correctly defined.

**High Memory Usage**: Reduce batch sizes or increase flush intervals to prevent memory buildup.

## Performance Optimization

For high-throughput environments, tune these settings to maximize performance:

```yaml
exporters:
  opensearch:
    http:
      endpoint: http://localhost:9200
      compression: gzip
      max_idle_conns: 100
      max_idle_conns_per_host: 10
      idle_conn_timeout: 90s

    bulk:
      max_batch_size: 5000
      max_batch_bytes: 10485760  # 10MB
      flush_interval: 10s

    sending_queue:
      enabled: true
      num_consumers: 20
      queue_size: 10000

processors:
  batch:
    timeout: 5s
    send_batch_size: 2048
    send_batch_max_size: 4096
```

These settings increase parallelism and batch sizes to handle higher data volumes while maintaining reliability through the sending queue.

## Related Resources

For more information on OpenTelemetry Collector configuration, check out these related posts:

- [How to Configure the Zipkin Exporter in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-zipkin-exporter-opentelemetry-collector/view)
- [How to Configure the Splunk HEC Exporter in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-splunk-hec-exporter-opentelemetry-collector/view)

The OpenSearch exporter provides a powerful, flexible way to store and analyze your OpenTelemetry data in an open-source platform. With proper configuration and tuning, it can handle production-scale workloads while giving you complete control over your observability data.
