# How to Use system.processors_profile_log in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, System, Profiling, Logging, Query

Description: Learn how to use system.processors_profile_log in ClickHouse to profile query pipeline processors, measure wait times, and identify execution bottlenecks.

---

`system.processors_profile_log` records detailed timing for each processor in ClickHouse's query execution pipeline. ClickHouse models query execution as a directed acyclic graph (DAG) of processors (readers, filters, aggregators, sorters, etc.). This table lets you see exactly how long each processor spent working, waiting for input, or waiting for output to be consumed. It is the most granular profiling tool available in ClickHouse.

## Enabling processors_profile_log

```xml
<processors_profile_log>
    <database>system</database>
    <table>processors_profile_log</table>
    <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    <ttl>event_date + INTERVAL 3 DAY DELETE</ttl>
</processors_profile_log>
```

Also enable processor logging at the query level:

```sql
SET log_processors_profiles = 1;
```

## Key Columns

| Column | Type | Description |
|--------|------|-------------|
| `query_id` | String | Links to `system.query_log` |
| `id` | UInt64 | ID of the processor |
| `name` | LowCardinality(String) | Processor class name (e.g., `MergeTreeSelectProcessor`) |
| `input_rows` | UInt64 | Rows consumed from inputs |
| `input_bytes` | UInt64 | Bytes consumed from inputs |
| `output_rows` | UInt64 | Rows produced to outputs |
| `output_bytes` | UInt64 | Bytes produced to outputs |
| `elapsed_us` | UInt64 | Microseconds actively processing |
| `input_wait_elapsed_us` | UInt64 | Microseconds waiting for input data |
| `output_wait_elapsed_us` | UInt64 | Microseconds waiting for output to be consumed |
| `parent_ids` | Array(UInt64) | IDs of upstream processors |

## Viewing Processor Profile for a Query

```sql
SET log_processors_profiles = 1;

-- Run a query
SELECT count() FROM events WHERE status = 'error';

-- Get the query_id
SELECT query_id
FROM system.query_log
WHERE type = 'QueryFinish' AND query LIKE '%count()%events%'
ORDER BY event_time DESC LIMIT 1;

-- View processor breakdown
SELECT
    name,
    input_rows,
    output_rows,
    elapsed_us / 1000                AS elapsed_ms,
    input_wait_elapsed_us / 1000     AS input_wait_ms,
    output_wait_elapsed_us / 1000    AS output_wait_ms
FROM system.processors_profile_log
WHERE query_id = '<your-query-id>'
ORDER BY elapsed_us DESC;
```

## Query Pipeline Architecture

```mermaid
flowchart LR
    A[MergeTreeSelectProcessor] --> B[FilterTransform]
    B --> C[ExpressionTransform]
    C --> D[AggregatingTransform]
    D --> E[MergingAggregatedTransform]
    E --> F[LimitsCheckingTransform]
    F --> G[Output]
```

Each processor appears as a row in `processors_profile_log` with its own timing data.

## Finding the Bottleneck Processor

```sql
SELECT
    name,
    sum(elapsed_us)                AS total_elapsed_us,
    sum(input_wait_elapsed_us)     AS total_input_wait_us,
    sum(output_wait_elapsed_us)    AS total_output_wait_us,
    sum(input_rows)                AS total_input_rows,
    sum(output_rows)               AS total_output_rows
FROM system.processors_profile_log
WHERE query_id = '<your-query-id>'
GROUP BY name
ORDER BY total_elapsed_us DESC;
```

## Understanding Wait Types

| Wait Type | Meaning |
|-----------|---------|
| High `elapsed_us` | Processor is CPU-bound (computation or I/O) |
| High `input_wait_elapsed_us` | Processor is waiting for upstream to produce data |
| High `output_wait_elapsed_us` | Processor is waiting for downstream to consume data (backpressure) |

## Aggregated Stats Across Recent Queries

```sql
SELECT
    name AS processor,
    count()                            AS appearances,
    avg(elapsed_us / 1000)             AS avg_elapsed_ms,
    avg(input_wait_elapsed_us / 1000)  AS avg_input_wait_ms,
    sum(input_rows)                    AS total_rows_processed
FROM system.processors_profile_log
WHERE event_date = today()
GROUP BY name
ORDER BY avg_elapsed_ms DESC
LIMIT 20;
```

## Comparing Processors for Two Queries

```sql
SELECT
    name,
    query_id,
    elapsed_us / 1000 AS elapsed_ms
FROM system.processors_profile_log
WHERE query_id IN ('query-id-before', 'query-id-after')
ORDER BY name, query_id;
```

## Identifying Filter Selectivity

```sql
SELECT
    name,
    input_rows,
    output_rows,
    if(input_rows > 0, round(output_rows * 100.0 / input_rows, 2), NULL) AS selectivity_pct
FROM system.processors_profile_log
WHERE query_id = '<your-query-id>'
  AND name = 'FilterTransform'
ORDER BY input_rows DESC;
```

A `selectivity_pct` close to 100% means the filter is not reducing the dataset much. A value close to 0% means the filter is very selective.

## Summary

`system.processors_profile_log` exposes per-processor timing for every query, giving you a precise breakdown of where time is spent in the query execution pipeline. Use it to identify which processor is the bottleneck (CPU-bound vs. input-waiting vs. backpressure), measure filter selectivity, and compare processor profiles before and after query optimizations. Enable it via `SET log_processors_profiles = 1` per query or globally via the user profile.
