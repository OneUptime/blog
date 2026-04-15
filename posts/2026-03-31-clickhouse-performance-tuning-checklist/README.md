# ClickHouse Performance Tuning Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, Tuning, Checklist, Optimization

Description: A performance tuning checklist for ClickHouse covering schema design, system settings, hardware, query patterns, and monitoring for maximum query throughput.

---

ClickHouse is fast by default, but systematic tuning across schema design, system configuration, and query patterns can deliver 5-20x additional performance improvements. This checklist covers the most impactful optimizations.

## Schema Design

```text
[ ] Choosing ORDER BY columns that match the most common query filters
[ ] Using LowCardinality(String) for columns with < 10,000 distinct values
[ ] Using DateTime instead of DateTime64 when millisecond precision is not needed
[ ] Using UInt32 instead of UInt64 for IDs that fit in 32 bits
[ ] Partitioning by month (toYYYYMM) or day (toYYYYMMDD) for time-series data
[ ] Adding skip indexes for filters on non-primary-key columns where matching values are rare and clustered in few granules
```

```sql
-- Check column cardinalities to decide on LowCardinality
SELECT
    'status' AS col,
    uniqExact(status) AS cardinality
FROM events
UNION ALL
SELECT 'country', uniqExact(country) FROM events;
```

## Memory Configuration

```xml
<!-- /etc/clickhouse-server/config.d/memory.xml -->
<clickhouse>
  <!-- Set to 80% of total RAM -->
  <max_server_memory_usage_to_ram_ratio>0.8</max_server_memory_usage_to_ram_ratio>
</clickhouse>
```

Per-query memory limits are session-level settings configured in `users.xml` or `users.d/`:

```xml
<!-- /etc/clickhouse-server/users.d/memory.xml -->
<clickhouse>
  <profiles>
    <default>
      <!-- Per-query memory limit -->
      <max_memory_usage>20000000000</max_memory_usage>
    </default>
  </profiles>
</clickhouse>
```

## CPU and Parallelism

```text
[ ] max_threads set to number of CPU cores
[ ] max_insert_threads set for parallel insert performance
[ ] background_pool_size configured based on merge workload
[ ] background_merges_mutations_concurrency_ratio tuned for write-heavy workloads
```

```sql
-- Check current thread settings (session-level)
SELECT name, value
FROM system.settings
WHERE name IN ('max_threads', 'max_insert_threads');

-- Check background pool size (server-level)
SELECT name, value
FROM system.server_settings
WHERE name = 'background_pool_size';
```

## Disk and I/O

```text
[ ] ClickHouse data directory on NVMe SSD (not HDD)
[ ] Separate disk mount for data and logs
[ ] Filesystem mounted with noatime option
[ ] LZ4 compression enabled (default, do not disable)
[ ] ZSTD compression for cold/infrequent data
```

## Query Optimization

```text
[ ] Primary key range queries (avoid full table scans where possible)
[ ] Pre-aggregation via materialized views for dashboard queries
[ ] Dictionaries used instead of JOINs for dimension lookups
[ ] Query result cache enabled for frequently repeated queries
[ ] Sampling used for approximate queries on very large tables
```

```sql
-- Check which queries are slowest
SELECT
    normalized_query_hash,
    any(query) AS sample_query,
    count() AS calls,
    avg(query_duration_ms) AS avg_ms,
    max(query_duration_ms) AS max_ms
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY normalized_query_hash
ORDER BY avg_ms DESC
LIMIT 20;
```

## Compression

```sql
-- Check compression ratio per table
SELECT
    table,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_compressed_bytes) / sum(data_uncompressed_bytes), 2) AS ratio
FROM system.columns
GROUP BY table
ORDER BY sum(data_compressed_bytes) DESC;
```

## Summary

ClickHouse performance tuning starts with schema design - the right ORDER BY, LowCardinality columns, and partitioning strategy are worth more than any system setting. After schema, focus on memory configuration, materialized views for hot queries, and monitoring the slowest queries in `system.query_log` for ongoing optimization.
