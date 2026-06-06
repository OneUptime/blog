# How to Configure the Apache Doris Exporter in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Exporter, Apache Doris, Analytics, Data Warehouse, MPP, Real-Time

Description: Configure the Apache Doris exporter in OpenTelemetry Collector to send observability data to Apache Doris for high-performance analytics and real-time queries.

Apache Doris is a high-performance, real-time analytical database based on MPP (Massively Parallel Processing) architecture. The Apache Doris exporter for OpenTelemetry Collector enables you to send traces, metrics, and logs to Doris for large-scale analytical processing, making it an excellent choice for organizations that need to perform complex analytics on their observability data or integrate telemetry with business intelligence systems.

## Understanding the Apache Doris Exporter

Apache Doris excels at real-time analytics with sub-second query response times on massive datasets. The OpenTelemetry exporter leverages Doris's Stream Load capability to efficiently ingest telemetry data in real-time. Unlike traditional observability backends, Doris provides a unified platform where you can correlate observability data with business metrics using standard SQL.

Key advantages of using Apache Doris for observability:

- **Real-time Analytics**: Query billions of records with sub-second latency
- **MPP Architecture**: Distributed processing scales horizontally
- **Standard SQL**: Use familiar SQL for complex analytical queries
- **Cost-effective Storage**: Columnar storage with compression reduces costs
- **High Ingestion Rate**: Handle millions of events per second

## Architecture Overview

Understanding how Apache Doris fits into your observability architecture:

```mermaid
graph TB
    A[Applications] --> B[OTel Collector]
    B --> C[Doris Exporter]
    C --> D[Doris Frontend FE]
    D --> E[Doris Backend BE1]
    D --> F[Doris Backend BE2]
    D --> G[Doris Backend BE3]
    E --> H[Analytics Queries]
    F --> H
    G --> H

    style C fill:#90EE90
    style D fill:#FFD700
    style H fill:#87CEEB
```

## Prerequisites

Before configuring the Apache Doris exporter:

1. Apache Doris cluster deployed and accessible
2. Doris database and tables created for telemetry data
3. User credentials with write permissions
4. OpenTelemetry Collector with the Doris exporter installed
5. Network connectivity to Doris Frontend nodes

## Setting Up Doris Tables

First, create appropriate tables in Apache Doris for your telemetry data. Here's a schema for distributed traces:

```sql
-- Create database for observability data
CREATE DATABASE IF NOT EXISTS observability;

-- Traces table optimized for analytical queries
CREATE TABLE observability.otel_traces (
    service_name VARCHAR(200),
    timestamp DATETIME(6),
    service_instance_id VARCHAR(200),
    trace_id VARCHAR(200),
    span_id STRING,
    trace_state STRING,
    parent_span_id STRING,
    span_name STRING,
    span_kind STRING,
    end_time DATETIME(6),
    duration BIGINT,
    span_attributes VARIANT,
    events ARRAY<STRUCT<timestamp:DATETIME(6), name:STRING, attributes:MAP<STRING, STRING>>>,
    links ARRAY<STRUCT<trace_id:STRING, span_id:STRING, trace_state:STRING, attributes:MAP<STRING, STRING>>>,
    status_message STRING,
    status_code STRING,
    resource_attributes VARIANT,
    scope_name STRING,
    scope_version STRING,
    INDEX idx_service_name(service_name) USING INVERTED,
    INDEX idx_timestamp(timestamp) USING INVERTED,
    INDEX idx_trace_id(trace_id) USING INVERTED,
    INDEX idx_span_id(span_id) USING INVERTED,
    INDEX idx_duration(duration) USING INVERTED,
    INDEX idx_status_code(status_code) USING INVERTED
)
ENGINE = OLAP
DUPLICATE KEY(service_name, timestamp)
PARTITION BY RANGE(timestamp) ()
DISTRIBUTED BY RANDOM BUCKETS AUTO
PROPERTIES (
    "replication_num" = "3",
    "compression" = "zstd",
    "inverted_index_storage_format" = "V2"
);
```

The Doris exporter uses the configured metrics table name as a prefix and writes each metric type to a type-specific table such as `otel_metrics_gauge`, `otel_metrics_sum`, `otel_metrics_histogram`, `otel_metrics_exponential_histogram`, and `otel_metrics_summary`. Here is a simplified gauge table schema:

```sql
-- Metrics table for gauge time-series data
CREATE TABLE observability.otel_metrics_gauge (
    service_name VARCHAR(200),
    timestamp DATETIME(6),
    service_instance_id VARCHAR(200),
    metric_name VARCHAR(200),
    metric_description STRING,
    metric_unit STRING,
    attributes VARIANT,
    start_time DATETIME(6),
    value DOUBLE,
    exemplars ARRAY<STRUCT<filtered_attributes:MAP<STRING,STRING>, timestamp:DATETIME(6), value:DOUBLE, span_id:STRING, trace_id:STRING>>,
    resource_attributes VARIANT,
    scope_name STRING,
    scope_version STRING,
    INDEX idx_service_name(service_name) USING INVERTED,
    INDEX idx_timestamp(timestamp) USING INVERTED,
    INDEX idx_metric_name(metric_name) USING INVERTED,
    INDEX idx_attributes(attributes) USING INVERTED
)
ENGINE = OLAP
DUPLICATE KEY(service_name, timestamp)
PARTITION BY RANGE(timestamp) ()
DISTRIBUTED BY RANDOM BUCKETS AUTO
PROPERTIES (
    "replication_num" = "3",
    "compression" = "zstd",
    "inverted_index_storage_format" = "V2"
);
```

Create tables for logs:

```sql
-- Logs table for structured log data
CREATE TABLE observability.otel_logs (
    timestamp DATETIME(6),
    service_name VARCHAR(200),
    service_instance_id VARCHAR(200),
    trace_id VARCHAR(200),
    span_id STRING,
    severity_number INT,
    severity_text STRING,
    body STRING,
    resource_attributes VARIANT,
    log_attributes VARIANT,
    scope_name STRING,
    scope_version STRING,
    INDEX idx_service_name(service_name) USING INVERTED,
    INDEX idx_timestamp(timestamp) USING INVERTED,
    INDEX idx_trace_id(trace_id) USING INVERTED,
    INDEX idx_span_id(span_id) USING INVERTED,
    INDEX idx_body(body) USING INVERTED PROPERTIES("parser"="unicode", "support_phrase"="true")
)
ENGINE = OLAP
DUPLICATE KEY(timestamp, service_name)
PARTITION BY RANGE(timestamp) ()
DISTRIBUTED BY RANDOM BUCKETS AUTO
PROPERTIES (
    "replication_num" = "3",
    "compression" = "zstd",
    "inverted_index_storage_format" = "V2"
);
```

## Basic Configuration

Here's a basic configuration for the Apache Doris exporter:

```yaml
# Basic Apache Doris exporter configuration

exporters:
  doris:
    # Doris Frontend HTTP endpoint
    # Use the HTTP port (default 8030) not MySQL port
    endpoint: http://doris-fe.example.com:8030

    # Database and table information
    database: observability
    table:
      traces: otel_traces
    create_schema: false

    # Authentication credentials
    username: ${env:DORIS_USERNAME}
    password: ${env:DORIS_PASSWORD}

    # Timeout for HTTP requests
    timeout: 30s

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    # Batch data for efficient loading
    timeout: 10s
    send_batch_size: 1000

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [doris]
```

## Advanced Traces Configuration

For production deployments with high throughput:

```yaml
exporters:
  doris/traces:
    # Doris Frontend endpoint with load balancer
    endpoint: http://doris-lb.example.com:8030

    # Database and table configuration
    database: observability
    table:
      traces: otel_traces
    create_schema: false

    # Authentication
    username: ${env:DORIS_USERNAME}
    password: ${env:DORIS_PASSWORD}

    # Stream Load headers for performance tuning
    headers:
      max_filter_ratio: "0.1"

      # Enable strict mode for data validation
      strict_mode: "false"

      # Enable Doris group commit when configured on the cluster
      group_commit: async_mode

    # HTTP client configuration
    timeout: 60s

    # Retry configuration for failed loads
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

    # Queue settings for backpressure handling
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 32

processors:
  # Batch processor optimized for Doris
  batch:
    timeout: 15s
    send_batch_size: 5000
    send_batch_max_size: 10000

  # Add resource detection
  resourcedetection:
    detectors: [env, system, docker]
    timeout: 5s

  # Memory limiter
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048
    spike_limit_mib: 512

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [doris/traces]
```

## Configuring Metrics Export

Send metrics to Apache Doris for time-series analytics:

```yaml
exporters:
  doris/metrics:
    endpoint: http://doris-fe.example.com:8030
    mysql_endpoint: doris-fe.example.com:9030
    database: observability
    table:
      metrics: otel_metrics
    create_schema: true

    username: ${env:DORIS_USERNAME}
    password: ${env:DORIS_PASSWORD}

    headers:
      max_filter_ratio: "0.1"
      group_commit: async_mode

    timeout: 60s

    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s

    sending_queue:
      enabled: true
      num_consumers: 8
      queue_size: 10000
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

  # Collect system metrics
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu:
        metrics:
          system.cpu.utilization:
            enabled: true
      memory:
        metrics:
          system.memory.utilization:
            enabled: true
      disk:
      network:
      load:

  # Scrape Prometheus metrics
  prometheus:
    config:
      scrape_configs:
        - job_name: 'application'
          scrape_interval: 30s
          static_configs:
            - targets: ['localhost:8080']

processors:
  batch:
    timeout: 10s
    send_batch_size: 2000

  # Transform metrics for Doris schema
  metricstransform:
    transforms:
      - include: .*
        match_type: regexp
        action: update
        operations:
          - action: add_label
            new_label: environment
            new_value: production

  resource:
    attributes:
      - key: service.name
        value: ${env:SERVICE_NAME}
        action: upsert

service:
  pipelines:
    metrics:
      receivers: [otlp, hostmetrics, prometheus]
      processors: [resource, metricstransform, batch]
      exporters: [doris/metrics]
```

## Configuring Logs Export

Configure structured logs export to Apache Doris:

```yaml
exporters:
  doris/logs:
    endpoint: http://doris-fe.example.com:8030
    mysql_endpoint: doris-fe.example.com:9030
    database: observability
    table:
      logs: otel_logs
    create_schema: true

    username: ${env:DORIS_USERNAME}
    password: ${env:DORIS_PASSWORD}

    headers:
      max_filter_ratio: "0.05"
      group_commit: async_mode

    timeout: 60s

    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 60s
      max_elapsed_time: 600s

    sending_queue:
      enabled: true
      num_consumers: 8
      queue_size: 20000
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

  # Collect application logs from files
  filelog:
    include:
      - /var/log/app/**/*.log
    exclude:
      - /var/log/app/**/*.gz

    # JSON log parsing
    operators:
      - type: json_parser
        parse_from: body
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'

      # Severity parsing
      - type: severity_parser
        parse_from: attributes.level
        mapping:
          debug: debug
          info: info
          warning: warn
          error: error
          fatal: fatal

processors:
  batch:
    timeout: 5s
    send_batch_size: 1000

  # Filter unnecessary logs
  filter:
    error_mode: ignore
    log_conditions:
      - IsMatch(log.body, ".*healthcheck.*")

  # Add resource attributes
  resource:
    attributes:
      - key: service.name
        value: web-app
        action: upsert
      - key: deployment.environment
        value: production
        action: upsert

service:
  pipelines:
    logs:
      receivers: [otlp, filelog]
      processors: [filter, resource, batch]
      exporters: [doris/logs]
```

## Complete Multi-Signal Configuration

Comprehensive configuration handling all telemetry types:

```yaml
receivers:
  # OTLP receiver for all signals
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Host metrics
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu:
      memory:
      disk:
      network:

  # Application logs
  filelog:
    include:
      - /var/log/app/*.log

processors:
  # Separate batch processors for optimal performance
  batch/traces:
    timeout: 15s
    send_batch_size: 5000

  batch/metrics:
    timeout: 10s
    send_batch_size: 2000

  batch/logs:
    timeout: 5s
    send_batch_size: 1000

  # Resource processor for common attributes
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert
      - key: cluster.name
        value: ${env:CLUSTER_NAME}
        action: upsert

  # Memory limiter
  memory_limiter:
    check_interval: 1s
    limit_mib: 4096
    spike_limit_mib: 1024

exporters:
  # Traces to Doris
  doris/traces:
    endpoint: http://doris-fe.example.com:8030
    mysql_endpoint: doris-fe.example.com:9030
    database: observability
    table:
      traces: otel_traces
    create_schema: true
    username: ${env:DORIS_USERNAME}
    password: ${env:DORIS_PASSWORD}
    headers:
      group_commit: async_mode
    timeout: 60s
    retry_on_failure:
      enabled: true
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

  # Metrics to Doris
  doris/metrics:
    endpoint: http://doris-fe.example.com:8030
    mysql_endpoint: doris-fe.example.com:9030
    database: observability
    table:
      metrics: otel_metrics
    create_schema: true
    username: ${env:DORIS_USERNAME}
    password: ${env:DORIS_PASSWORD}
    headers:
      group_commit: async_mode
    timeout: 60s
    retry_on_failure:
      enabled: true
    sending_queue:
      enabled: true
      num_consumers: 8
      queue_size: 10000

  # Logs to Doris
  doris/logs:
    endpoint: http://doris-fe.example.com:8030
    mysql_endpoint: doris-fe.example.com:9030
    database: observability
    table:
      logs: otel_logs
    create_schema: true
    username: ${env:DORIS_USERNAME}
    password: ${env:DORIS_PASSWORD}
    headers:
      group_commit: async_mode
    timeout: 60s
    retry_on_failure:
      enabled: true
    sending_queue:
      enabled: true
      num_consumers: 8
      queue_size: 20000

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch/traces]
      exporters: [doris/traces]

    metrics:
      receivers: [otlp, hostmetrics]
      processors: [memory_limiter, resource, batch/metrics]
      exporters: [doris/metrics]

    logs:
      receivers: [otlp, filelog]
      processors: [memory_limiter, resource, batch/logs]
      exporters: [doris/logs]
```

## Analytical Queries on Doris

Once data is in Apache Doris, you can run powerful analytical queries. Here are some examples:

**Calculate request latency percentiles by service:**

```sql
SELECT
    service_name,
    percentile(duration / 1000.0, 0.50) as p50_ms,
    percentile(duration / 1000.0, 0.95) as p95_ms,
    percentile(duration / 1000.0, 0.99) as p99_ms,
    COUNT(*) as request_count
FROM observability.otel_traces
WHERE timestamp >= now() - INTERVAL 1 HOUR
    AND span_kind = 'SPAN_KIND_SERVER'
GROUP BY service_name
ORDER BY p99_ms DESC;
```

**Analyze error rates across services:**

```sql
SELECT
    service_name,
    COUNT(*) as total_spans,
    SUM(CASE WHEN status_code = 'STATUS_CODE_ERROR' THEN 1 ELSE 0 END) as error_count,
    SUM(CASE WHEN status_code = 'STATUS_CODE_ERROR' THEN 1 ELSE 0 END) / COUNT(*) * 100 as error_rate_pct
FROM observability.otel_traces
WHERE timestamp >= now() - INTERVAL 1 HOUR
GROUP BY service_name
HAVING error_count > 0
ORDER BY error_rate_pct DESC;
```

**Trace correlation with logs:**

```sql
SELECT
    t.trace_id,
    t.span_name,
    t.service_name,
    t.duration / 1000.0 as duration_ms,
    l.severity_text,
    l.body as log_message
FROM observability.otel_traces t
INNER JOIN observability.otel_logs l
    ON t.trace_id = l.trace_id
WHERE t.timestamp >= now() - INTERVAL 1 HOUR
    AND t.status_code = 'STATUS_CODE_ERROR'
ORDER BY t.timestamp DESC
LIMIT 100;
```

## Performance Optimization

Optimize Apache Doris for high-volume observability data:

**Use Partitioning:**

```sql
-- Partition traces table by date for efficient querying
CREATE TABLE observability.otel_traces_partitioned (
    -- columns definition same as before
)
DUPLICATE KEY(service_name, timestamp)
PARTITION BY RANGE(timestamp) (
    PARTITION p20260201 VALUES LESS THAN ("2026-02-02"),
    PARTITION p20260202 VALUES LESS THAN ("2026-02-03"),
    PARTITION p20260203 VALUES LESS THAN ("2026-02-04")
)
DISTRIBUTED BY HASH(trace_id) BUCKETS 32
PROPERTIES (
    "replication_num" = "3",
    "dynamic_partition.enable" = "true",
    "dynamic_partition.time_unit" = "DAY",
    "dynamic_partition.start" = "-7",
    "dynamic_partition.end" = "3",
    "dynamic_partition.prefix" = "p",
    "dynamic_partition.buckets" = "32"
);
```

**Create Materialized Views for common queries:**

```sql
-- Materialized view for service latency aggregations
CREATE MATERIALIZED VIEW mv_service_latency AS
SELECT
    service_name,
    date_trunc(timestamp, 'minute') as time_bucket,
    AVG(duration / 1000.0) as avg_duration_ms,
    COUNT(*) as request_count
FROM observability.otel_traces
WHERE span_kind = 'SPAN_KIND_SERVER'
GROUP BY service_name, time_bucket;
```

## High Availability Configuration

Configure multiple Doris Frontend nodes for high availability:

```yaml
exporters:
  doris:
    # Use DNS with multiple A records or load balancer
    endpoint: http://doris-fe-lb.example.com:8030
    mysql_endpoint: doris-fe-lb.example.com:9030

    database: observability
    table:
      traces: otel_traces
    create_schema: true
    username: ${env:DORIS_USERNAME}
    password: ${env:DORIS_PASSWORD}
```

## Security Best Practices

1. **Use Strong Authentication**: Always use strong passwords and rotate credentials regularly.

2. **Enable TLS**: Configure HTTPS for Doris Frontend endpoints in production.

3. **Implement Access Control**: Use Doris's role-based access control to limit permissions.

4. **Network Isolation**: Deploy Doris in a private network and restrict access.

5. **Audit Logging**: Enable Doris audit logs to track data access patterns.

## Troubleshooting

Common issues and solutions:

**Stream Load Failures**: Check Doris logs for detailed error messages. Verify table schema matches incoming data structure.

**Performance Degradation**: Monitor Doris BE nodes for resource constraints. Consider adding more BE nodes or adjusting bucket counts.

**Data Quality Issues**: Enable strict mode in Stream Load to reject malformed data and investigate source.

**Connection Timeouts**: Increase timeout settings and verify network connectivity to Doris FE nodes.

**Memory Issues**: Tune batch sizes and queue sizes based on available memory and data volume.

## Best Practices

1. **Design Schema Carefully**: Plan your table schemas based on query patterns before ingesting data.

2. **Use Appropriate Partitioning**: Partition tables by time for efficient query pruning and data lifecycle management.

3. **Implement Data Retention**: Use Doris's dynamic partitioning to automatically manage old data.

4. **Monitor Cluster Health**: Use Doris's built-in monitoring and alerting capabilities.

5. **Optimize Batch Sizes**: Larger batches improve throughput but increase latency. Find the right balance.

## Related Resources

Explore more about OpenTelemetry and data analytics:

- [OpenTelemetry Data Modeling Best Practices](https://oneuptime.com/blog/post/2026-02-06-what-opentelemetry-does-not-do/view)
- [Building Analytics on Observability Data](https://oneuptime.com/blog/post/2026-02-13-observability-analytics/view)

## Conclusion

The Apache Doris exporter enables powerful analytical capabilities over your OpenTelemetry data. By combining OpenTelemetry's comprehensive telemetry collection with Doris's high-performance MPP database, you can run complex analytical queries on massive datasets with sub-second response times. This integration is particularly valuable for organizations that need to correlate observability data with business metrics or build custom analytics applications. Start with the basic configuration and gradually optimize based on your data volume and query requirements.
