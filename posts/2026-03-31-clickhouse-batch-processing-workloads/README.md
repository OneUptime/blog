# How to Configure ClickHouse for Batch Processing Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Batch Processing, ETL, Configuration, Performance, Throughput

Description: Tune ClickHouse settings for maximum batch processing throughput, including insert block sizes, merge settings, and parallel query execution configuration.

---

## Batch Processing vs Interactive Workloads

Batch processing in ClickHouse typically means:
- Bulk inserts of millions to billions of rows
- Long-running aggregation queries that scan entire tables
- ETL transformations via INSERT INTO ... SELECT

Unlike interactive workloads, batch jobs tolerate latency but need maximum throughput.

## Tuning Insert Block Size

Larger insert blocks mean fewer parts on disk and faster merges:

```sql
SET min_insert_block_size_rows = 1048576;       -- 1M rows
SET min_insert_block_size_bytes = 268435456;    -- 256 MB
SET max_insert_block_size = 1048576;
```

For batch ETL jobs, always insert in large blocks rather than many small ones.

## Using INSERT INTO ... SELECT for Batch Transforms

Instead of reading data, transforming in application code, and re-inserting, do it server-side:

```sql
INSERT INTO aggregated_events
SELECT
    toStartOfHour(ts) AS hour,
    event_type,
    user_country,
    count()          AS event_count,
    sum(amount)      AS total_amount
FROM raw_events
WHERE ts >= '2026-01-01' AND ts < '2026-02-01'
GROUP BY hour, event_type, user_country;
```

This avoids network round-trips and runs entirely in ClickHouse's query engine.

## Parallel Query Execution

Use all available threads for batch scans:

```sql
SET max_threads = 32;
SET max_download_threads = 16;
SET max_read_buffer_size = 10485760;
```

## Memory Settings for Large Batch Queries

Increase allowed memory for batch operations:

```sql
SET max_memory_usage = 50000000000;       -- 50 GB
SET max_bytes_before_external_group_by = 20000000000;
SET max_bytes_before_external_sort = 20000000000;
```

External GROUP BY and SORT spill to disk when memory is exceeded, allowing queries larger than RAM.

## Background Merge Settings for Batch Inserts

When loading large datasets, increase merge pool size to handle the part influx:

```xml
<background_pool_size>32</background_pool_size>
<background_merges_mutations_concurrency_ratio>2</background_merges_mutations_concurrency_ratio>
```

## Scheduling Batch Jobs

Avoid running batch jobs during peak interactive query hours. Use ClickHouse's built-in scheduling with `REFRESH EVERY` on refreshable materialized views, or trigger jobs from an external scheduler like Airflow:

```bash
clickhouse-client --query="
  INSERT INTO monthly_summary
  SELECT * FROM raw_events
  WHERE toYYYYMM(ts) = toYYYYMM(now() - INTERVAL 1 MONTH)
"
```

## Monitoring Batch Progress

Track insert and merge progress:

```sql
SELECT
    merge_type,
    table,
    progress,
    rows_read,
    rows_written
FROM system.merges
ORDER BY progress DESC;
```

## Summary

Configure ClickHouse for batch workloads by maximizing insert block sizes, using server-side INSERT INTO ... SELECT transforms, increasing thread and memory limits, and tuning the background merge pool. Schedule batch jobs during off-peak hours and monitor merge progress to ensure parts consolidate before the next batch run.
