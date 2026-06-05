# How to Send OpenTelemetry Data to Tinybird via the Tinybird Exporter for

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tinybird, Analytics, Real-Time

Description: Configure the OpenTelemetry Collector to send telemetry data to Tinybird for running real-time SQL analytics on your observability data.

Tinybird is a real-time analytics platform built on top of ClickHouse. Sending OpenTelemetry data to Tinybird lets you run fast SQL queries over your traces, metrics, and logs. This is particularly useful when you need custom analytics that go beyond what traditional observability backends offer, like computing business metrics from trace data or building custom dashboards with sub-second query latency.

## Why Tinybird for Observability Data

Traditional observability backends give you predefined views: trace waterfalls, metric charts, log search. Tinybird gives you raw SQL access to your telemetry. You can join trace data with business data, compute custom aggregations, and build API endpoints that serve analytics results to your own dashboards.

## Setting Up Tinybird

First, create a Tinybird workspace and a data source for your OpenTelemetry data. The Tinybird exporter writes JSON events, so define the schema to match the exporter's trace payload:

```sql
-- File: datasources/otel_traces.datasource
-- This defines the schema for incoming trace spans

SCHEMA >
    `Timestamp` DateTime64(9) `json:$.start_time`,
    `TraceId` String `json:$.trace_id`,
    `SpanId` String `json:$.span_id`,
    `ParentSpanId` String `json:$.parent_span_id`,
    `ServiceName` LowCardinality(String) `json:$.service_name`,
    `SpanName` LowCardinality(String) `json:$.span_name`,
    `SpanKind` LowCardinality(String) `json:$.span_kind`,
    `StatusCode` LowCardinality(String) `json:$.status_code`,
    `Duration` UInt64 `json:$.duration`,
    `SpanAttributes` Map(LowCardinality(String), String) `json:$.span_attributes`

ENGINE "MergeTree"
ENGINE_PARTITION_KEY "toDate(Timestamp)"
ENGINE_SORTING_KEY "ServiceName, SpanName, toDateTime(Timestamp)"
```

## Collector Configuration

The Tinybird exporter sends data to Tinybird's Events API and handles the event payload format for you:

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
    timeout: 10s
    send_batch_size: 8192

  resource:
    attributes:
      - key: service.name
        value: "web-api"
        action: upsert

exporters:
  tinybird:
    endpoint: ${OTEL_TINYBIRD_API_HOST}
    token: ${OTEL_TINYBIRD_TOKEN}
    traces:
      datasource: otel_traces
    sending_queue:
      enabled: true
      queue_size: 104857600
      sizer: bytes
      batch:
        flush_timeout: 5s
        min_size: 1024000
        max_size: 8388608
    retry_on_failure:
      enabled: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [tinybird]
```

## Using a Transform Processor for Tinybird-Friendly Data

The Tinybird exporter handles the event payload format, but you might still want to normalize your spans before export. The transform processor with OTTL statements can reshape the data:

```yaml
processors:
  transform/tinybird:
    trace_statements:
      - context: span
        statements:
          # Ensure span attribute values are not too long
          - truncate_all(attributes, 256)

  # Copy common span attributes to stable keys for easier SQL queries
  attributes/flatten:
    actions:
      - key: http_method
        from_attribute: http.request.method
        action: upsert
      - key: http_status_code
        from_attribute: http.response.status_code
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
    SpanName,
    count() as request_count,
    avg(Duration) / 1000000 as avg_duration_ms,
    quantile(0.95)(Duration) / 1000000 as p95_duration_ms,
    quantile(0.99)(Duration) / 1000000 as p99_duration_ms
FROM otel_traces
WHERE Timestamp > now() - interval 1 hour
    AND SpanKind = 'Server'
GROUP BY SpanName
ORDER BY p99_duration_ms DESC
LIMIT 20
```

```sql
-- Error rate by service over the last 24 hours
SELECT
    ServiceName,
    toStartOfHour(Timestamp) as hour,
    count() as total,
    countIf(StatusCode = 'Error') as errors,
    round(errors / total * 100, 2) as error_rate_pct
FROM otel_traces
WHERE Timestamp > now() - interval 24 hour
GROUP BY ServiceName, hour
ORDER BY hour DESC
```

## Building API Endpoints

Tinybird lets you publish SQL queries as HTTP API endpoints. Create a pipe that queries your span data:

```sql
-- File: endpoints/slow_endpoints.pipe
-- This becomes an API endpoint at /v0/pipes/slow_endpoints.json

NODE slow_endpoints
SQL >
    %
    SELECT
        SpanName,
        count() as requests,
        avg(Duration) / 1e6 as avg_ms,
        quantile(0.99)(Duration) / 1e6 as p99_ms
    FROM otel_traces
    WHERE Timestamp > now() - interval {{Int32(hours, 1)}} hour
        AND ServiceName = {{String(service, 'web-api')}}
    GROUP BY SpanName
    ORDER BY p99_ms DESC
    LIMIT {{Int32(limit, 10)}}

TYPE ENDPOINT
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
    send_batch_size: 8192
    timeout: 10s
```

Larger batches reduce the number of handoffs to exporters. For Tinybird ingest specifically, use the exporter's `sending_queue.batch` settings to control request payload size and keep it below the Events API payload limit. The 10-second timeout ensures data does not sit too long in the Collector during low-traffic periods.

## Retention and Cost Management

Unlike traditional observability backends with fixed retention policies, Tinybird lets you manage retention in your data source definition:

```sql
-- Add this to the raw trace data source
ENGINE_TTL "Timestamp + toIntervalDay(7)"
```

This keeps raw span data for 7 days while materialized views retain aggregated data indefinitely. You get the best of both worlds: detailed recent data and long-term trends.

Tinybird as an OpenTelemetry backend gives you flexibility that traditional observability platforms cannot match. The SQL interface means you are not locked into predefined dashboards, and the API endpoint feature lets you build custom observability tooling on top of your trace data.
