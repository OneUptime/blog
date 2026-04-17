# How to Design a Time-Series Schema in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Time Series, Schema Design, MergeTree, Partitioning, Analytics

Description: Learn how to design optimal time-series schemas in ClickHouse with proper ordering keys, partitioning, TTL, and compression for high-ingestion workloads.

---

ClickHouse is one of the best databases for time-series data due to its columnar storage, fast ingestion, and powerful aggregation functions. Designing the schema correctly is crucial for query performance and storage efficiency.

## Core Principles for Time-Series Schema

```text
1. Always put the timestamp in the ORDER BY key
2. Put low-cardinality filter dimensions before timestamp in ORDER BY (order ascending by cardinality)
3. Partition by time to enable efficient data expiration
4. Use LowCardinality for repeated string fields
5. Set TTL to automatically expire old data
```

## Basic Metrics Schema

```sql
CREATE TABLE metrics (
    timestamp DateTime64(3),    -- millisecond precision
    service LowCardinality(String),
    host LowCardinality(String),
    metric_name LowCardinality(String),
    value Float64,
    tags Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (service, host, metric_name, timestamp)
TTL toDateTime(timestamp) + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;
```

## High-Volume Event Schema

For ingesting billions of events (logs, traces, spans):

```sql
CREATE TABLE events (
    timestamp DateTime64(9),    -- nanosecond precision for traces
    trace_id UUID,
    span_id String,
    service LowCardinality(String),
    operation LowCardinality(String),
    duration_us UInt64,         -- microseconds
    status_code UInt16,
    error Bool,
    attributes Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (service, timestamp, trace_id)
TTL toDateTime(timestamp) + INTERVAL 30 DAY DELETE
SETTINGS
    index_granularity = 8192,
    min_bytes_for_wide_part = 10485760;
```

## Adding Compression

Apply codecs tuned for time-series data:

```sql
CREATE TABLE metrics_compressed (
    timestamp DateTime64(3) CODEC(Delta, ZSTD(3)),
    service LowCardinality(String),
    host LowCardinality(String),
    metric_name LowCardinality(String),
    value Float64 CODEC(Gorilla, ZSTD(1)),
    counter UInt64 CODEC(Delta, ZSTD)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (service, host, metric_name, timestamp);
```

`Delta` codec compresses monotonically increasing timestamps efficiently. `Gorilla` codec is optimal for float time-series values.

## Multi-Granularity with Materialized Views

Pre-aggregate at multiple time granularities:

```sql
-- Raw 1-second data
CREATE TABLE metrics_raw (
    timestamp DateTime,
    service LowCardinality(String),
    value Float64
) ENGINE = MergeTree()
ORDER BY (service, timestamp)
TTL timestamp + INTERVAL 7 DAY;

-- 1-minute aggregates
CREATE MATERIALIZED VIEW metrics_1m
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(minute)
ORDER BY (service, minute)
AS SELECT
    service,
    toStartOfMinute(timestamp) AS minute,
    avgState(value) AS avg_value,
    minState(value) AS min_value,
    maxState(value) AS max_value,
    countState() AS count
FROM metrics_raw
GROUP BY service, minute;
```

## Querying Time-Series Data

Always filter on the partitioning key first:

```sql
SELECT
    toStartOfMinute(timestamp) AS minute,
    service,
    avg(value) AS avg_value,
    max(value) AS peak_value
FROM metrics
WHERE timestamp >= now() - INTERVAL 6 HOUR
  AND service = 'api-gateway'
  AND metric_name = 'request_latency'
GROUP BY minute, service
ORDER BY minute;
```

## Summary

Optimal time-series schemas in ClickHouse use timestamp-first ORDER BY with high-cardinality filter columns as prefixes, monthly or daily partitioning for TTL efficiency, Delta/Gorilla compression codecs for float series, and materialized views for pre-aggregated rollups. These patterns support billions of data points with sub-second query response times.
