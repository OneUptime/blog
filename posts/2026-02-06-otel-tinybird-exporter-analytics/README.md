# How to Send OpenTelemetry Data to Tinybird via the Tinybird Exporter for Real-Time Analytics Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tinybird, Analytics, Real-Time

Description: Configure the OpenTelemetry Collector to send telemetry data to Tinybird for running real-time SQL analytics on your observability data.

Tinybird is a real-time analytics platform built on top of ClickHouse. Sending OpenTelemetry data to Tinybird lets you run fast SQL queries over your traces, metrics, and logs. This is particularly useful when you need custom analytics that go beyond what traditional observability backends offer, like computing business metrics from trace data or building custom dashboards with sub-second query latency.

## Why Tinybird for Observability Data

Traditional observability backends give you predefined views: trace waterfalls, metric charts, log search. Tinybird gives you raw SQL access to your telemetry. You can join trace data with business data, compute custom aggregations, and build API endpoints that serve analytics results to your own dashboards.

## Setting Up Tinybird

First, create a Tinybird workspace and a data source for your OpenTelemetry data. You can define the schema to match the OTLP data structure:

```sql
-- Create a data source for spans in Tinybird
-- This defines the schema for incoming span data

SCHEMA >
    `timestamp` DateTime64(9),
    `trace_id` String,
    `span_id` String,
    `parent_span_id` String,
    `service_name` String,
    `span_name` String,
    `span_kind` String,
    `status_code` String,
    `duration_ns` Int64,
    `attributes` String
```

## Collector Configuration

The Tinybird exporter sends data to Tinybird's Events API:

```yaml
# otel-collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    send_batch_size: 5000
    timeout: 10s

  resource:
    attributes:
      - key: service.name
        value: "web-api"
        action: upsert

exporters:
  # Use the OTLP/HTTP exporter pointed at Tinybird's ingest endpoint
  otlphttp/tinybird:
    endpoint: https://api.tinybird.co/v0/events
    headers:
      Authorization: "Bearer ${TINYBIRD_TOKEN}"
    compression: gzip

  # Alternative: use a custom HTTP exporter for more control
  # over the payload format
  otlphttp/tinybird_traces:
    endpoint: "https://api.tinybird.co"
    headers:
      Authorization: "Bearer ${TINYBIRD_TOKEN}"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlphttp/tinybird_traces]
```

## Using a Transform Processor for Tinybird-Friendly Data

Since Tinybird expects data in a specific format, you might need to transform your spans before export. The transform processor with OTTL statements can reshape the data:

```yaml
processors:
  transform/tinybird:
    trace_statements:
      - context: span
        statements:
          # Ensure span name is not too long for Tinybird columns
          - truncate_all(attributes, 256)

  # Flatten nested attributes for better SQL queryability
  attributes/flatten:
    actions:
      - key: http_method
        from_attribute: http.method
        action: upsert
      - key: http_status_code
        from_attribute: http.status_code
        action: upsert
      - key: http_route
        from_attribute: http.route
        action: upsert
```

## Querying Your Data in Tinybird

Once data flows into Tinybird, you can run SQL queries:

```sql
-- Find the slowest endpoints in the last hour
SELECT
    span_name,
    count() as request_count,
    avg(duration_ns) / 1000000 as avg_duration_ms,
    quantile(0.95)(duration_ns) / 1000000 as p95_duration_ms,
    quantile(0.99)(duration_ns) / 1000000 as p99_duration_ms
FROM spans
WHERE timestamp > now() - interval 1 hour
    AND span_kind = 'SERVER'
GROUP BY span_name
ORDER BY p99_duration_ms DESC
LIMIT 20
```

```sql
-- Error rate by service over the last 24 hours
SELECT
    service_name,
    toStartOfHour(timestamp) as hour,
    count() as total,
    countIf(status_code = 'ERROR') as errors,
    round(errors / total * 100, 2) as error_rate_pct
FROM spans
WHERE timestamp > now() - interval 24 hour
GROUP BY service_name, hour
ORDER BY hour DESC
```

## Building API Endpoints

Tinybird lets you publish SQL queries as HTTP API endpoints. Create a pipe that queries your span data:

```sql
-- File: endpoints/slow_endpoints.pipe
-- This becomes an API endpoint at /v0/pipes/slow_endpoints.json

%
SELECT
    span_name,
    count() as requests,
    avg(duration_ns) / 1e6 as avg_ms,
    quantile(0.99)(duration_ns) / 1e6 as p99_ms
FROM spans
WHERE timestamp > now() - interval {{Int32(hours, 1)}} hour
    AND service_name = {{String(service, 'web-api')}}
GROUP BY span_name
ORDER BY p99_ms DESC
LIMIT {{Int32(limit, 10)}}
```

Call it from your application:

```bash
curl "https://api.tinybird.co/v0/pipes/slow_endpoints.json?token=${TINYBIRD_READ_TOKEN}&hours=6&service=web-api"
```

## Handling High Volume

Tinybird handles high ingest rates well, but you should optimize the Collector-side batching:

```yaml
processors:
  batch:
    # Large batches are more efficient for Tinybird
    send_batch_size: 5000
    send_batch_max_size: 10000
    timeout: 10s
```

Larger batches reduce the number of HTTP requests and improve Tinybird's ingest performance. The 10-second timeout ensures data does not sit too long in the Collector during low-traffic periods.

## Retention and Cost Management

Unlike traditional observability backends with fixed retention policies, Tinybird lets you manage retention with SQL:

```sql
-- Create a materialized view that aggregates old data
-- and a TTL policy on the raw data
ALTER TABLE spans MODIFY TTL timestamp + interval 7 day
```

This keeps raw span data for 7 days while materialized views retain aggregated data indefinitely. You get the best of both worlds: detailed recent data and long-term trends.

Tinybird as an OpenTelemetry backend gives you flexibility that traditional observability platforms cannot match. The SQL interface means you are not locked into predefined dashboards, and the API endpoint feature lets you build custom observability tooling on top of your trace data.
