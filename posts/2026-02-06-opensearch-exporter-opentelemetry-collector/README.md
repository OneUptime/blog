# How to Configure the OpenSearch Exporter in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Exporter, OpenSearch, Observability, Telemetry

Description: Learn how to configure the OpenSearch exporter in OpenTelemetry Collector to send traces, metrics, and logs to OpenSearch for powerful search and analytics capabilities.

OpenSearch is a popular open-source search and analytics engine that provides powerful capabilities for storing and querying telemetry data. The OpenTelemetry Collector's OpenSearch exporter enables you to send traces and logs directly to OpenSearch clusters, making it an excellent choice for organizations that want full control over their observability data with an open-source solution.

## Understanding the OpenSearch Exporter

The OpenSearch exporter is designed to write OpenTelemetry data to OpenSearch indices. It supports traces and logs, and provides flexible configuration options for authentication, index naming, and data formatting. This exporter is particularly useful when you want to leverage OpenSearch's search capabilities, visualization tools like OpenSearch Dashboards, and machine learning features for anomaly detection.

The exporter handles the conversion of OpenTelemetry Protocol (OTLP) data into JSON documents that OpenSearch can index efficiently. It uses OpenSearch's Bulk API and supports both basic authentication and AWS Signature Version 4 through Collector authenticator extensions.

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

Here's a minimal configuration to get started with the OpenSearch exporter. This example sends traces and logs to a local OpenSearch instance.

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
```

This basic configuration establishes OTLP receivers on standard ports and exports traces and logs to separate OpenSearch indices. The batch processor optimizes network usage by grouping data before sending.

## Advanced Configuration with Authentication

In production environments, you'll need to secure your OpenSearch cluster with authentication. Here's a comprehensive configuration with security features enabled.

```yaml
exporters:
  opensearch:
    http:
      endpoint: https://opensearch-node1.example.com:9200

      # TLS configuration for secure connections
      tls:
        insecure: false
        insecure_skip_verify: false
        ca_file: /etc/ssl/certs/opensearch-ca.crt
        cert_file: /etc/ssl/certs/client-cert.crt
        key_file: /etc/ssl/certs/client-key.key

      # Authentication settings
      auth:
        authenticator: basicauth/client

    # Index naming patterns with time-based suffixes
    traces_index: otel-traces
    traces_index_time_format: yyyy.MM.dd
    logs_index: otel-logs
    logs_index_time_format: yyyy.MM.dd

    # Bulk API action. Valid values are create and index.
    bulk_action: create

    # Retry configuration for transient failures
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

    # Mapping configuration
    mapping:
      mode: ss4o

extensions:
  basicauth/client:
    client_auth:
      username: admin
      password: ${env:OPENSEARCH_PASSWORD}

service:
  extensions: [basicauth/client]
```

This advanced configuration includes several important features:

**TLS Security**: Encrypts data in transit and validates server certificates to prevent man-in-the-middle attacks.

**Time-Based Index Suffixes**: Creates daily indices using the exporter's UTC time format tokens, which helps with index lifecycle management and search performance.

**Bulk Indexing**: Uses the OpenSearch Bulk API with the configured `bulk_action` to ingest documents.

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

    traces_index: otel-traces
    logs_index: otel-logs

# Add the sigv4auth extension
extensions:
  sigv4auth:
    region: us-east-1
    service: es
    assume_role:
      arn: arn:aws:iam::123456789012:role/OTelCollectorRole

service:
  extensions: [sigv4auth]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [opensearch]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [opensearch]
```

Using IAM roles is the recommended approach for AWS environments as it eliminates the need to manage static credentials. The SigV4 authenticator uses the AWS SDK credential chain, including environment credentials, web identity credentials, and instance or task role credentials when available.

## Index Template Management

OpenSearch uses index templates to define mappings and settings for new indices. The OpenSearch exporter does not manage index templates directly, so create templates in OpenSearch before sending data if you need custom mappings or settings.

```yaml
exporters:
  opensearch:
    http:
      endpoint: http://localhost:9200

    traces_index: otel-traces
    logs_index: otel-logs
    mapping:
      mode: ss4o
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
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888

exporters:
  opensearch:
    http:
      endpoint: http://localhost:9200

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

**High Memory Usage**: Reduce batch sizes or decrease flush intervals to prevent memory buildup.

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

    sending_queue:
      enabled: true
      num_consumers: 20
      queue_size: 10000
      batch:
        flush_timeout: 10s
        min_size: 2048
        max_size: 4096

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
