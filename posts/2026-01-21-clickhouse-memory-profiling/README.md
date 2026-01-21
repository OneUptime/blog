# How to Profile ClickHouse Query Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Memory Profiling, Performance, Optimization, Query Tuning

Description: A comprehensive guide to profiling ClickHouse query memory usage, including memory limits configuration, query analysis, and optimization techniques to prevent out-of-memory errors.

---

Understanding and optimizing memory usage is critical for ClickHouse performance. This guide covers memory profiling techniques, configuration settings, and optimization strategies.

## Memory Architecture

### Memory Components

```sql
-- View current memory usage
SELECT
    metric,
    value,
    description
FROM system.metrics
WHERE metric LIKE '%Memory%';

-- Detailed memory breakdown
SELECT
    metric,
    formatReadableSize(value) AS size
FROM system.asynchronous_metrics
WHERE metric LIKE '%Memory%'
ORDER BY value DESC;
```

## Query Memory Profiling

### Enable Memory Profiling

```sql
-- Set profiling for your session
SET max_memory_usage = 10000000000;  -- 10GB limit
SET memory_profiler_step = 1048576;   -- Profile every 1MB
SET memory_profiler_sample_probability = 0.1;  -- 10% sampling

-- Run your query
SELECT ...;

-- Check memory usage in query_log
SELECT
    query_id,
    query,
    memory_usage,
    peak_memory_usage,
    formatReadableSize(memory_usage) AS memory_readable,
    formatReadableSize(peak_memory_usage) AS peak_readable
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 10;
```

### Memory-Heavy Query Analysis

```sql
-- Find memory-intensive queries
SELECT
    query,
    formatReadableSize(memory_usage) AS memory,
    formatReadableSize(peak_memory_usage) AS peak_memory,
    query_duration_ms,
    read_rows,
    result_rows
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
ORDER BY peak_memory_usage DESC
LIMIT 20;

-- Memory usage by query type
SELECT
    query_kind,
    count() AS queries,
    formatReadableSize(avg(memory_usage)) AS avg_memory,
    formatReadableSize(max(peak_memory_usage)) AS max_peak
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 DAY
GROUP BY query_kind
ORDER BY avg(memory_usage) DESC;
```

## EXPLAIN for Memory Estimation

```sql
-- Estimate memory before running
EXPLAIN ESTIMATE
SELECT user_id, count()
FROM events
GROUP BY user_id;

-- Detailed query plan with memory
EXPLAIN PLAN
SELECT user_id, count()
FROM events
GROUP BY user_id;

-- Pipeline execution plan
EXPLAIN PIPELINE
SELECT user_id, count()
FROM events
GROUP BY user_id;
```

## Memory Optimization Techniques

### 1. Reduce GROUP BY Cardinality

```sql
-- High memory: grouping by high-cardinality column
SELECT user_id, count() FROM events GROUP BY user_id;

-- Lower memory: limit cardinality
SELECT user_id, count()
FROM events
GROUP BY user_id
LIMIT 100000;

-- Or use approximate functions
SELECT uniq(user_id) FROM events;
```

### 2. Use Appropriate Data Types

```sql
-- Check column memory impact
SELECT
    column,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed
FROM system.columns
WHERE table = 'events'
GROUP BY column
ORDER BY sum(data_uncompressed_bytes) DESC;
```

### 3. Streaming Aggregation

```sql
-- Enable partial aggregation for large GROUP BYs
SET max_bytes_before_external_group_by = 5000000000;  -- 5GB before spilling
SET max_bytes_before_external_sort = 5000000000;

-- Query will spill to disk if needed
SELECT user_id, count()
FROM events
GROUP BY user_id;
```

### 4. Subquery Optimization

```sql
-- Memory-heavy: IN with large subquery
SELECT * FROM events
WHERE user_id IN (SELECT user_id FROM users WHERE country = 'US');

-- Better: Use JOIN
SELECT e.*
FROM events e
INNER JOIN users u ON e.user_id = u.user_id
WHERE u.country = 'US';
```

## Memory Settings Configuration

```xml
<!-- config.xml settings -->
<clickhouse>
    <!-- Server-level limits -->
    <max_server_memory_usage_to_ram_ratio>0.9</max_server_memory_usage_to_ram_ratio>

    <!-- Per-query defaults -->
    <profiles>
        <default>
            <max_memory_usage>10000000000</max_memory_usage>
            <max_memory_usage_for_user>20000000000</max_memory_usage_for_user>
            <max_bytes_before_external_group_by>5000000000</max_bytes_before_external_group_by>
            <max_bytes_before_external_sort>5000000000</max_bytes_before_external_sort>
        </default>
    </profiles>
</clickhouse>
```

## Monitoring Memory in Real-Time

```sql
-- Current query memory usage
SELECT
    query_id,
    user,
    formatReadableSize(memory_usage) AS memory,
    formatReadableSize(peak_memory_usage) AS peak,
    elapsed,
    query
FROM system.processes
ORDER BY memory_usage DESC;

-- Memory by user
SELECT
    user,
    count() AS queries,
    formatReadableSize(sum(memory_usage)) AS total_memory
FROM system.processes
GROUP BY user;
```

## Conclusion

Effective memory profiling involves:

1. **Enable profiling** with appropriate settings
2. **Analyze query_log** for memory patterns
3. **Use EXPLAIN** to estimate before running
4. **Optimize queries** to reduce memory
5. **Configure limits** to prevent OOM
6. **Monitor real-time** usage

With proper memory management, you can run complex analytical queries without exhausting system resources.
