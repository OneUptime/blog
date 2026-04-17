# How to Store and Query Distributed Traces in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed Tracing, OpenTelemetry, Span, Trace, Observability, APM

Description: Learn how to store and query distributed traces in ClickHouse using OpenTelemetry-compatible schemas and efficient trace analysis SQL patterns.

---

Distributed tracing is essential for understanding request flows across microservices. ClickHouse is an excellent backend for trace storage, offering fast span lookups, efficient storage, and powerful aggregations for latency analysis at scale.

## Trace Storage Schema

Model traces using the OpenTelemetry data model with spans as the core unit:

```sql
CREATE TABLE otel_spans (
    trace_id         FixedString(16),
    span_id          FixedString(8),
    parent_span_id   FixedString(8) DEFAULT '',
    operation_name   LowCardinality(String),
    service_name     LowCardinality(String),
    start_time_us    Int64,   -- microseconds since epoch
    duration_us      Int64,
    status_code      UInt8,   -- 0=Unset, 1=OK, 2=Error
    status_message   String,
    span_kind        LowCardinality(String),  -- SERVER, CLIENT, INTERNAL
    attributes       Map(String, String),
    resource_attrs   Map(String, String)
) ENGINE = MergeTree
PARTITION BY toDate(fromUnixTimestamp64Micro(start_time_us))
ORDER BY (service_name, operation_name, start_time_us)
TTL fromUnixTimestamp64Micro(start_time_us) + INTERVAL 30 DAY;
```

## Finding a Trace by ID

```sql
SELECT
    hex(trace_id)       AS trace_id,
    hex(span_id)        AS span_id,
    hex(parent_span_id) AS parent_span_id,
    operation_name,
    service_name,
    start_time_us,
    duration_us,
    status_code
FROM otel_spans
WHERE trace_id = unhex('your_trace_id_hex')
ORDER BY start_time_us;
```

## Latency Percentiles by Service

```sql
SELECT
    service_name,
    operation_name,
    count()                       AS request_count,
    avg(duration_us) / 1000       AS avg_ms,
    quantile(0.50)(duration_us) / 1000 AS p50_ms,
    quantile(0.95)(duration_us) / 1000 AS p95_ms,
    quantile(0.99)(duration_us) / 1000 AS p99_ms,
    countIf(status_code = 2)      AS errors
FROM otel_spans
WHERE start_time_us >= toUnixTimestamp64Micro(now64() - INTERVAL 1 HOUR)
  AND span_kind = 'SERVER'
GROUP BY service_name, operation_name
ORDER BY p95_ms DESC
LIMIT 20;
```

## Error Rate by Service

```sql
SELECT
    service_name,
    count()                              AS total_spans,
    countIf(status_code = 2)             AS error_spans,
    round(100.0 * countIf(status_code = 2) / count(), 2) AS error_rate_pct
FROM otel_spans
WHERE start_time_us >= toUnixTimestamp64Micro(now64() - INTERVAL 1 HOUR)
  AND span_kind = 'SERVER'
GROUP BY service_name
ORDER BY error_rate_pct DESC;
```

## Slow Trace Detection

```sql
SELECT
    hex(trace_id)   AS trace_id,
    service_name,
    operation_name,
    duration_us / 1000 AS duration_ms,
    status_code,
    attributes['http.url'] AS url
FROM otel_spans
WHERE start_time_us >= toUnixTimestamp64Micro(now64() - INTERVAL 1 HOUR)
  AND duration_us > 5000000  -- > 5 seconds
  AND span_kind = 'SERVER'
ORDER BY duration_us DESC
LIMIT 50;
```

## Service Dependency Map

```sql
-- Extract caller -> callee relationships from client spans
SELECT
    service_name                               AS caller,
    attributes['peer.service']                 AS callee,
    count()                                    AS calls,
    avg(duration_us) / 1000                    AS avg_ms,
    countIf(status_code = 2)                   AS errors
FROM otel_spans
WHERE start_time_us >= toUnixTimestamp64Micro(now64() - INTERVAL 1 HOUR)
  AND span_kind = 'CLIENT'
  AND attributes['peer.service'] != ''
GROUP BY caller, callee
ORDER BY calls DESC;
```

## Summary

ClickHouse is an efficient backend for distributed trace storage. Using FixedString(16) for trace IDs, Map columns for dynamic attributes, and partitioning by date ensures fast lookups and efficient storage. Combined with TTL for automatic retention, ClickHouse can store weeks of trace data for millions of requests while delivering sub-second latency analysis queries.
