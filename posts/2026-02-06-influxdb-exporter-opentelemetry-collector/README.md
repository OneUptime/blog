# How to Configure the InfluxDB Exporter in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Exporter, InfluxDB, Time Series, Metric, Monitoring, Observability

Description: Learn how to configure the InfluxDB exporter in the OpenTelemetry Collector for time-series metrics storage and analysis with InfluxDB 2.x and 3.x.

InfluxDB is a high-performance time-series database designed for handling large volumes of timestamped data. The OpenTelemetry Collector's InfluxDB exporter enables you to send metrics data to InfluxDB for storage, analysis, and visualization. This integration is ideal for organizations looking to leverage InfluxDB's powerful query language and time-series optimizations.

## Understanding the InfluxDB Exporter

The InfluxDB exporter converts OpenTelemetry metrics into InfluxDB's line protocol format and writes them to InfluxDB using either the v1 or v2 API. It supports both InfluxDB OSS and InfluxDB Cloud, providing flexibility in deployment options. The exporter handles batching, compression, and automatic retries to ensure reliable data delivery.

InfluxDB excels at storing and querying time-series data, making it perfect for metrics analysis, alerting, and long-term data retention.

## Architecture Overview

Here's how the InfluxDB exporter fits into your observability pipeline:

```mermaid
graph LR
    A[Applications] -->|OTLP| B[OpenTelemetry Collector]
    B -->|Receivers| C[Processors]
    C -->|Transform| D[InfluxDB Exporter]
    D -->|Line Protocol| E[InfluxDB]
    E -->|Flux/SQL/InfluxQL| F[Queries]
    E -->|Dashboards| G[Grafana]
    E -->|Alerts| H[Checks/Tasks]
    E -->|Analysis| I[Explorer/Grafana]
```

## Prerequisites

Before configuring the InfluxDB exporter, ensure you have:

- InfluxDB 2.x or 3.x installed and running
- An InfluxDB organization and bucket created (for InfluxDB 3.x, the exporter writes through the v2-compatible API and the bucket value maps to the database name)
- An API token with write permissions
- OpenTelemetry Collector Contrib installed (version 0.80.0 or later)

## Setting Up InfluxDB

Install and configure InfluxDB 2.x:

```bash
# Download and install InfluxDB (example for Linux)

wget https://download.influxdata.com/influxdb/releases/v2.8.0/influxdb2-2.8.0_linux_amd64.tar.gz
tar xvfz influxdb2-2.8.0_linux_amd64.tar.gz
cd influxdb2-2.8.0/usr/bin

# Start InfluxDB
./influxd &

# Install the separate influx CLI
wget https://dl.influxdata.com/influxdb/releases/influxdb2-client-2.8.0-linux-amd64.tar.gz
tar xvfz influxdb2-client-2.8.0-linux-amd64.tar.gz
cd influxdb2-client-2.8.0-linux-amd64

# Initial setup
./influx setup \
  --username admin \
  --password mypassword123 \
  --org myorg \
  --bucket telemetry \
  --retention 30d \
  --force
```

Create an API token:

```bash
# Get the bucket ID
BUCKET_ID=$(influx bucket list --org myorg --name telemetry --hide-headers | awk '{print $1}')

# Create a token with write access to the bucket
influx auth create \
  --org myorg \
  --read-bucket "${BUCKET_ID}" \
  --write-bucket "${BUCKET_ID}" \
  --description "OpenTelemetry Collector Token"

# Output will include the token string
```

Alternatively, for InfluxDB Cloud:

1. Sign up at https://cloud2.influxdata.com/
2. Create an organization and bucket
3. Generate an API token from the UI

## Basic Configuration

Here's a minimal configuration for the InfluxDB exporter:

```yaml
# OpenTelemetry Collector configuration for InfluxDB
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    # Batch metrics for efficient writes
    timeout: 10s
    send_batch_size: 1024

exporters:
  influxdb:
    # InfluxDB endpoint URL
    endpoint: "http://localhost:8086"

    # Organization name
    org: "myorg"

    # Bucket name for storing metrics
    bucket: "telemetry"

    # API token for authentication
    token: "${INFLUXDB_TOKEN}"

    # Timeout for write operations
    timeout: 10s

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [influxdb]
```

This configuration sets up a metrics pipeline that receives OTLP metrics and exports them to InfluxDB.

## InfluxDB v1 Compatibility Mode

For InfluxDB 1.x or compatibility mode:

```yaml
exporters:
  influxdb:
    # InfluxDB v1.x endpoint
    endpoint: "http://localhost:8086"

    # These fields are still part of the exporter configuration
    org: "myorg"
    bucket: "telemetry"

    # Use v1 write endpoint
    v1_compatibility:
      enabled: true
      db: "telegraf"
      username: "admin"
      password: "password"

    timeout: 10s
```

## Advanced Configuration Options

For production deployments, customize additional parameters:

```yaml
exporters:
  influxdb:
    endpoint: "http://influxdb.example.com:8086"
    org: "production-org"
    bucket: "metrics"
    token: "${INFLUXDB_TOKEN}"

    # Write precision (ns, us, ms, s)
    # Controls timestamp precision in line protocol
    precision: "ms"

    # Timeout for HTTP requests
    timeout: 30s

    # HTTP headers
    headers:
      User-Agent: "opentelemetry-collector/v0.93.0"

    # Queue configuration for handling bursts
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 10000

    # Retry configuration
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

    # Metrics specific configuration
    metrics_schema: "telegraf-prometheus-v2"

    # HTTP client settings
    compression: "gzip"

    # TLS configuration
    tls:
      insecure: false
      insecure_skip_verify: false
      ca_file: "/path/to/ca.pem"
      cert_file: "/path/to/cert.pem"
      key_file: "/path/to/key.pem"
```

## Metrics Schema Options

The exporter supports different schema mappings:

**telegraf-prometheus-v1:**
- Legacy schema
- Compatible with Telegraf metrics
- Simple tag structure

**telegraf-prometheus-v2:**
- Recommended for new deployments
- Better Prometheus compatibility
- Enhanced metadata handling

```yaml
exporters:
  influxdb:
    endpoint: "http://localhost:8086"
    org: "myorg"
    bucket: "telemetry"
    token: "${INFLUXDB_TOKEN}"

    # Choose schema based on your needs
    metrics_schema: "telegraf-prometheus-v2"
```

## Resource Attributes and Tags

Add OpenTelemetry resource and metric attributes before export:

```yaml
processors:
  # Add resource attributes
  resource:
    attributes:
      - key: service.name
        value: "${SERVICE_NAME}"
        action: upsert
      - key: service.version
        value: "${SERVICE_VERSION}"
        action: upsert
      - key: deployment.environment
        value: "${ENVIRONMENT}"
        action: upsert
      - key: host.name
        value: "${HOSTNAME}"
        action: upsert

  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  influxdb:
    endpoint: "http://localhost:8086"
    org: "myorg"
    bucket: "telemetry"
    token: "${INFLUXDB_TOKEN}"

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [influxdb]
```

## Metric Filtering and Transformation

Filter and transform metrics before export:

```yaml
processors:
  # Filter out unwanted metrics
  filter/metrics:
    error_mode: ignore
    metric_conditions:
      # Exclude specific metrics
      - 'metric.name == "up"'
      - 'metric.name == "scrape_duration_seconds"'
      # Filter by attribute values
      - 'datapoint.attributes["status"] == "healthy"'

  # Transform metric names
  metricstransform:
    transforms:
      # Rename metrics
      - include: "http.server.duration"
        action: update
        new_name: "http_request_duration"

      # Convert units
      - include: "http_request_duration"
        action: update
        operations:
          - action: experimental_scale_value
            experimental_scale: 0.001  # Convert ms to seconds

      # Add prefix
      - include: "^(.*)$"
        match_type: regexp
        action: update
        new_name: "otel_$$1"

      # Aggregate metrics
      - include: "request_count"
        action: update
        operations:
          - action: aggregate_labels
            label_set: []
            aggregation_type: sum

  # Convert cumulative to delta
  cumulativetodelta:
    include:
      metrics:
        - http_requests_total
        - bytes_sent_total
      match_type: strict

  batch:
    timeout: 10s
    send_batch_size: 512

exporters:
  influxdb:
    endpoint: "http://localhost:8086"
    org: "myorg"
    bucket: "telemetry"
    token: "${INFLUXDB_TOKEN}"

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [filter/metrics, metricstransform, cumulativetodelta, batch]
      exporters: [influxdb]
```

## High Availability Configuration

For production environments, configure multiple InfluxDB instances:

```yaml
exporters:
  # Primary InfluxDB instance
  influxdb/primary:
    endpoint: "http://influxdb-primary.example.com:8086"
    org: "myorg"
    bucket: "telemetry"
    token: "${INFLUXDB_PRIMARY_TOKEN}"
    timeout: 30s

    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 10000
      storage: file_storage/primary

    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

  # Secondary InfluxDB instance (backup)
  influxdb/secondary:
    endpoint: "http://influxdb-secondary.example.com:8086"
    org: "myorg"
    bucket: "telemetry"
    token: "${INFLUXDB_SECONDARY_TOKEN}"
    timeout: 30s

    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 10000
      storage: file_storage/secondary

    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

extensions:
  file_storage/primary:
    directory: /var/lib/otelcol/primary-queue
    timeout: 10s

  file_storage/secondary:
    directory: /var/lib/otelcol/secondary-queue
    timeout: 10s

service:
  extensions: [file_storage/primary, file_storage/secondary]
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      # Write to both instances
      exporters: [influxdb/primary, influxdb/secondary]
```

## Querying Data with Flux

Once metrics are in InfluxDB 2.x, query them using Flux. These examples assume `metrics_schema: "telegraf-prometheus-v1"`; with `telegraf-prometheus-v2`, metric points are stored in the `prometheus` measurement and metric names are field keys.

```flux
// Query request rate over last hour
from(bucket: "telemetry")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "http_requests_total")
  |> filter(fn: (r) => r["service.name"] == "payment-service")
  |> derivative(unit: 1s, nonNegative: true)
  |> aggregateWindow(every: 1m, fn: mean)

// Calculate percentiles
from(bucket: "telemetry")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "http_request_duration")
  |> filter(fn: (r) => r["service.name"] == "payment-service")
  |> quantile(q: 0.95, method: "exact_mean")

// Aggregate by tags
from(bucket: "telemetry")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "cpu_usage")
  |> group(columns: ["service.name", "deployment.environment"])
  |> mean()

// Join multiple measurements
requests = from(bucket: "telemetry")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "http_requests_total")
  |> derivative(unit: 1s, nonNegative: true)

errors = from(bucket: "telemetry")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "http_errors_total")
  |> derivative(unit: 1s, nonNegative: true)

join(
  tables: {requests: requests, errors: errors},
  on: ["_time", "service.name"]
)
|> map(fn: (r) => ({
    _time: r._time,
    service_name: r["service.name"],
    error_rate: r._value_errors / r._value_requests
  }))
```

## Creating Tasks and Alerts

Set up automated tasks in InfluxDB 2.x:

```flux
// Downsampling task - aggregate 5-minute data to hourly
option task = {
  name: "downsample_hourly",
  every: 1h,
  offset: 5m
}

from(bucket: "telemetry")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "http_request_duration")
  |> aggregateWindow(every: 1h, fn: mean)
  |> to(bucket: "telemetry_downsampled", org: "myorg")

```

Delete old data explicitly with the InfluxDB CLI when retention policies are not enough:

```bash
influx delete \
  --bucket telemetry \
  --org myorg \
  --start 2026-01-01T00:00:00Z \
  --stop 2026-02-01T00:00:00Z
```

Create alerts using InfluxDB checks in the InfluxDB UI or the `/api/v2/checks` API. Checks include a query and check configuration, and support threshold and deadman check types.

## Integration with Grafana

Configure Grafana to visualize InfluxDB metrics:

```yaml
# Grafana datasource configuration
apiVersion: 1
datasources:
  - name: InfluxDB
    type: influxdb
    access: proxy
    url: http://influxdb:8086
    jsonData:
      version: Flux
      organization: myorg
      defaultBucket: telemetry
      tlsSkipVerify: false
    secureJsonData:
      token: ${INFLUXDB_TOKEN}
```

Create a Grafana dashboard with Flux queries:

```json
{
  "dashboard": {
    "title": "Service Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "query": "from(bucket: \"telemetry\") |> range(start: v.timeRangeStart, stop: v.timeRangeStop) |> filter(fn: (r) => r[\"_measurement\"] == \"http_requests_total\") |> derivative(unit: 1s, nonNegative: true)"
          }
        ]
      }
    ]
  }
}
```

## Performance Optimization

Optimize the exporter for high-throughput scenarios:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Memory limiter to prevent OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

  # Larger batches reduce write overhead
  batch:
    timeout: 30s
    send_batch_size: 4096

exporters:
  influxdb:
    endpoint: "http://influxdb:8086"
    org: "myorg"
    bucket: "telemetry"
    token: "${INFLUXDB_TOKEN}"

    # Increase timeout for large batches
    timeout: 60s

    # Enable compression
    compression: "gzip"

    # Optimize queue settings
    sending_queue:
      enabled: true
      num_consumers: 20
      queue_size: 20000
      storage: file_storage/queue

    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

service:
  extensions: [file_storage/queue]

  pipelines:
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [influxdb]

  # Tune collector telemetry
  telemetry:
    logs:
      level: info
    metrics:
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888
                without_type_suffix: true
                without_units: true

extensions:
  file_storage/queue:
    directory: /var/lib/otelcol/queue
    timeout: 10s
```

## Data Retention and Management

Configure retention policies in InfluxDB:

```bash
# Create bucket with retention policy
influx bucket create \
  --name telemetry \
  --org myorg \
  --retention 30d

# Update retention policy
influx bucket update \
  --id <bucket-id> \
  --retention 90d

# Create bucket for long-term downsampled data
influx bucket create \
  --name telemetry_downsampled \
  --org myorg \
  --retention 365d
```

Implement downsampling for long-term storage:

```flux
// Downsample to 1-hour aggregates
option task = {
  name: "downsample_1h",
  every: 1h
}

from(bucket: "telemetry")
  |> range(start: -1h)
  |> aggregateWindow(every: 1h, fn: mean)
  |> to(bucket: "telemetry_1h", org: "myorg")

// Downsample to daily aggregates
option task = {
  name: "downsample_1d",
  every: 24h
}

from(bucket: "telemetry_1h")
  |> range(start: -24h)
  |> aggregateWindow(every: 1d, fn: mean)
  |> to(bucket: "telemetry_1d", org: "myorg")
```

## Security Best Practices

Secure your InfluxDB deployment:

**1. Use TLS/SSL:**

```yaml
exporters:
  influxdb:
    endpoint: "https://influxdb.example.com:8086"
    org: "myorg"
    bucket: "telemetry"
    token: "${INFLUXDB_TOKEN}"

    tls:
      insecure: false
      insecure_skip_verify: false
      ca_file: "/etc/ssl/certs/ca.pem"
      cert_file: "/etc/ssl/certs/client-cert.pem"
      key_file: "/etc/ssl/private/client-key.pem"
```

**2. Rotate API Tokens:**

```bash
# Create new token
BUCKET_ID=$(influx bucket list --org myorg --name telemetry --hide-headers | awk '{print $1}')

influx auth create \
  --org myorg \
  --write-bucket "${BUCKET_ID}" \
  --description "Rotated token $(date +%Y-%m-%d)"

# Delete old token
influx auth delete --id <old-token-id>
```

**3. Use Limited Permissions:**

Create tokens with minimal required permissions:

```bash
# Create read-only token
BUCKET_ID=$(influx bucket list --org myorg --name telemetry --hide-headers | awk '{print $1}')

influx auth create \
  --org myorg \
  --read-bucket "${BUCKET_ID}" \
  --description "Read-only token"

# Create write-only token
influx auth create \
  --org myorg \
  --write-bucket "${BUCKET_ID}" \
  --description "Write-only token for collector"
```

**4. Use InfluxDB 2.x or 3.x token-based authentication:**

InfluxDB 2.x and 3.x API requests are authenticated with tokens. Avoid using legacy InfluxDB 1.x username/password authentication unless you are explicitly using the v1 compatibility API.

## Complete Production Example

Here's a comprehensive configuration for production:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Memory protection
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

  # Add resource attributes
  resource:
    attributes:
      - key: service.name
        value: "${SERVICE_NAME}"
        action: upsert
      - key: service.version
        value: "${SERVICE_VERSION}"
        action: upsert
      - key: deployment.environment
        value: "${ENVIRONMENT}"
        action: upsert
      - key: host.name
        value: "${HOSTNAME}"
        action: upsert

  # Filter unnecessary metrics
  filter/metrics:
    error_mode: ignore
    metric_conditions:
      - 'metric.name == "up"'
      - 'metric.name == "scrape_duration_seconds"'

  # Transform metrics
  metricstransform:
    transforms:
      - include: "http.server.duration"
        action: update
        new_name: "http_request_duration_seconds"
        operations:
          - action: experimental_scale_value
            experimental_scale: 0.001

  # Convert cumulative to delta
  cumulativetodelta:
    include:
      metrics:
        - http_requests_total
        - bytes_sent_total
      match_type: strict

  # Batch for efficiency
  batch:
    timeout: 30s
    send_batch_size: 4096

exporters:
  influxdb:
    endpoint: "${INFLUXDB_ENDPOINT}"
    org: "${INFLUXDB_ORG}"
    bucket: "${INFLUXDB_BUCKET}"
    token: "${INFLUXDB_TOKEN}"

    metrics_schema: "telegraf-prometheus-v2"
    precision: "ms"
    timeout: 60s
    compression: "gzip"

    sending_queue:
      enabled: true
      num_consumers: 20
      queue_size: 20000
      storage: file_storage/queue

    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

    tls:
      insecure: false
      insecure_skip_verify: false
      ca_file: "${TLS_CA_FILE}"

service:
  extensions: [file_storage/queue]

  pipelines:
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resource, filter/metrics, metricstransform, cumulativetodelta, batch]
      exporters: [influxdb]

  telemetry:
    logs:
      level: info
    metrics:
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888
                without_type_suffix: true
                without_units: true

extensions:
  file_storage/queue:
    directory: /var/lib/otelcol/queue
    timeout: 10s
```

## Troubleshooting Common Issues

**Issue: Authentication failures**

Solutions:
- Verify API token is correct and has write permissions
- Check token hasn't expired
- Ensure organization and bucket names are correct
- Verify token has access to the specified bucket

**Issue: High write latency**

Optimize:
- Increase batch size to reduce write frequency
- Enable compression to reduce payload size
- Check network latency to InfluxDB
- Verify InfluxDB has sufficient resources

**Issue: Data not appearing in InfluxDB**

Check:
- Collector logs for errors
- InfluxDB logs for write errors
- Bucket exists and is accessible
- Retention policy hasn't expired data
- Measurement names are valid

**Issue: High cardinality warnings**

Solutions:
- Reduce tag cardinality by filtering attributes
- Avoid using high-cardinality values as tags
- Use fields instead of tags for variable data
- Implement metric aggregation

## Conclusion

The InfluxDB exporter provides a powerful solution for storing OpenTelemetry metrics in a purpose-built time-series database. With InfluxDB's efficient storage, powerful query language, and extensive ecosystem, you can build comprehensive monitoring and analytics solutions.

For more information on OpenTelemetry exporters, check out these related articles:
- https://oneuptime.com/blog/post/2026-02-06-google-managed-prometheus-exporter-opentelemetry-collector/view
- https://oneuptime.com/blog/post/2026-02-06-aws-s3-exporter-opentelemetry-collector/view

For detailed information about the InfluxDB exporter configuration options, refer to the official OpenTelemetry Collector documentation.
