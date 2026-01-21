# How to Debug Slow Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, Query Optimization, Debugging, Profiling, EXPLAIN, Database, Troubleshooting

Description: A practical guide to debugging slow queries in ClickHouse using EXPLAIN, query profiling, flamegraphs, and system tables to identify and fix performance bottlenecks.

---

Slow queries in ClickHouse can impact dashboard performance and increase costs. This guide covers how to identify slow queries, analyze their execution plans, and apply optimizations to improve performance.

## Finding Slow Queries

### Query Log Analysis

```sql
-- Find slowest queries in the last 24 hours
SELECT
    query_start_time,
    query_duration_ms,
    read_rows,
    read_bytes,
    memory_usage,
    user,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date >= today() - 1
  AND query_duration_ms > 1000  -- Queries over 1 second
ORDER BY query_duration_ms DESC
LIMIT 20;

-- Queries with high memory usage
SELECT
    query_start_time,
    memory_usage,
    peak_memory_usage,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date = today()
ORDER BY peak_memory_usage DESC
LIMIT 10;
```

### Current Running Queries

```sql
-- See currently executing queries
SELECT
    query_id,
    user,
    elapsed,
    read_rows,
    memory_usage,
    query
FROM system.processes
ORDER BY elapsed DESC;

-- Queries consuming most resources right now
SELECT
    query_id,
    formatReadableSize(memory_usage) AS memory,
    read_rows,
    total_rows_approx,
    round(read_rows / total_rows_approx * 100, 2) AS progress_pct,
    elapsed,
    query
FROM system.processes
WHERE total_rows_approx > 0
ORDER BY memory_usage DESC;
```

## Using EXPLAIN

### Basic EXPLAIN

```sql
-- View query execution plan
EXPLAIN
SELECT user_id, count()
FROM events
WHERE event_time >= today() - 7
GROUP BY user_id;

-- EXPLAIN with AST (Abstract Syntax Tree)
EXPLAIN AST
SELECT user_id, count()
FROM events
WHERE event_time >= today() - 7
GROUP BY user_id;
```

### EXPLAIN PLAN

```sql
-- Detailed execution plan
EXPLAIN PLAN
SELECT
    toStartOfHour(event_time) AS hour,
    count() AS events
FROM events
WHERE event_time >= now() - INTERVAL 24 HOUR
GROUP BY hour
ORDER BY hour;

-- With actions
EXPLAIN actions = 1
SELECT
    user_id,
    count() AS events
FROM events
WHERE event_time >= today() - 7
GROUP BY user_id
HAVING events > 100;
```

### EXPLAIN PIPELINE

```sql
-- View query pipeline
EXPLAIN PIPELINE
SELECT
    user_id,
    count() AS events,
    sum(revenue) AS total_revenue
FROM events
WHERE event_time >= today() - 30
GROUP BY user_id
ORDER BY total_revenue DESC
LIMIT 100;

-- With header info
EXPLAIN PIPELINE header = 1, graph = 1
SELECT user_id, count()
FROM events
GROUP BY user_id;
```

### EXPLAIN INDEXES

```sql
-- Check which indexes are used
EXPLAIN indexes = 1
SELECT count()
FROM events
WHERE user_id = 12345
  AND event_time >= today() - 7;

-- Check if skip indexes are applied
EXPLAIN indexes = 1
SELECT *
FROM logs
WHERE message LIKE '%error%'
  AND timestamp >= now() - INTERVAL 1 HOUR;
```

### EXPLAIN ESTIMATE

```sql
-- Estimate rows to be read
EXPLAIN ESTIMATE
SELECT count()
FROM events
WHERE event_time >= '2024-01-01'
  AND event_time < '2024-02-01';
```

## Query Profiling

### Enable Profiling

```sql
-- Profile a single query
SELECT count()
FROM events
WHERE event_time >= today() - 7
SETTINGS
    log_queries = 1,
    log_query_threads = 1,
    log_profile_events = 1,
    send_logs_level = 'trace';
```

### Analyze Profile Data

```sql
-- Get detailed metrics for a specific query
SELECT
    ProfileEvents.Names AS metric,
    ProfileEvents.Values AS value
FROM system.query_log
ARRAY JOIN ProfileEvents
WHERE query_id = 'your-query-id'
  AND type = 'QueryFinish';

-- Key metrics to watch
SELECT
    ProfileEvents['SelectedRows'] AS rows_read,
    ProfileEvents['SelectedBytes'] AS bytes_read,
    ProfileEvents['FileOpen'] AS files_opened,
    ProfileEvents['ReadBufferFromFileDescriptorReadBytes'] AS disk_read,
    ProfileEvents['NetworkSendBytes'] AS network_sent
FROM system.query_log
WHERE query_id = 'your-query-id';
```

### Thread-Level Analysis

```sql
-- See how work is distributed across threads
SELECT
    thread_id,
    read_rows,
    read_bytes,
    written_rows,
    memory_usage
FROM system.query_thread_log
WHERE query_id = 'your-query-id'
ORDER BY read_rows DESC;
```

## Common Performance Issues

### Missing Partition Pruning

```sql
-- Bad: No partition pruning
SELECT count()
FROM events
WHERE toYYYYMM(event_time) = 202401;  -- Function prevents pruning

-- Good: Partition pruning works
SELECT count()
FROM events
WHERE event_time >= '2024-01-01'
  AND event_time < '2024-02-01';

-- Check if partitions are pruned
EXPLAIN indexes = 1
SELECT count()
FROM events
WHERE event_time >= '2024-01-01'
  AND event_time < '2024-02-01';
```

### Wrong ORDER BY Key Usage

```sql
-- Check table's ORDER BY key
SELECT
    name,
    sorting_key
FROM system.tables
WHERE name = 'events';

-- Bad: Filter not matching ORDER BY
-- If ORDER BY is (user_id, event_time)
SELECT * FROM events WHERE event_type = 'click';  -- Full scan

-- Good: Filter matches ORDER BY prefix
SELECT * FROM events WHERE user_id = 12345;  -- Uses primary key
```

### Excessive Memory in GROUP BY

```sql
-- Problem: High-cardinality GROUP BY
SELECT
    session_id,  -- Millions of unique values
    count()
FROM events
GROUP BY session_id;

-- Solution 1: Use external aggregation
SELECT session_id, count()
FROM events
GROUP BY session_id
SETTINGS max_bytes_before_external_group_by = 5000000000;

-- Solution 2: Limit cardinality
SELECT
    user_id,
    count() AS events
FROM events
GROUP BY user_id
HAVING events > 10;  -- Filter low-value groups
```

### Large JOINs

```sql
-- Problem: Large right table in JOIN
SELECT e.*, u.name
FROM events e
JOIN users u ON e.user_id = u.id;  -- users table loaded into memory

-- Solution 1: Use dictionary
SELECT e.*, dictGet('users_dict', 'name', e.user_id) AS name
FROM events e;

-- Solution 2: Use JOIN algorithm
SELECT e.*, u.name
FROM events e
JOIN users u ON e.user_id = u.id
SETTINGS join_algorithm = 'partial_merge';  -- For large tables
```

## Optimization Techniques

### Use PREWHERE

```sql
-- PREWHERE filters data before reading all columns
SELECT *
FROM events
PREWHERE event_time >= today() - 7  -- Filter first
WHERE event_type = 'click';         -- Then filter remaining

-- Check if PREWHERE is applied
EXPLAIN
SELECT *
FROM events
WHERE event_time >= today() - 7
  AND event_type = 'click';
```

### Limit Columns

```sql
-- Bad: SELECT *
SELECT * FROM events WHERE user_id = 12345;

-- Good: Select only needed columns
SELECT event_id, event_time, event_type
FROM events
WHERE user_id = 12345;

-- Check bytes read difference
SELECT
    query,
    read_bytes
FROM system.query_log
WHERE query LIKE '%events%'
ORDER BY event_time DESC
LIMIT 10;
```

### Use Sampling

```sql
-- For approximate results on large tables
SELECT
    event_type,
    count() * 100 AS estimated_count
FROM events SAMPLE 0.01  -- 1% sample
WHERE event_time >= today() - 30
GROUP BY event_type;
```

### Add Skip Indexes

```sql
-- Check existing indexes
SELECT
    name,
    expr,
    type
FROM system.data_skipping_indices
WHERE table = 'events';

-- Add bloom filter for text search
ALTER TABLE logs ADD INDEX idx_message message TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 4;

-- Add set index for low-cardinality columns
ALTER TABLE events ADD INDEX idx_status status TYPE set(100) GRANULARITY 4;

-- Materialize the index
ALTER TABLE events MATERIALIZE INDEX idx_status;
```

## Flamegraphs

### Generate Flamegraph

```sql
-- Enable trace collection
SELECT count()
FROM events
WHERE event_time >= today() - 7
SETTINGS
    query_profiler_real_time_period_ns = 10000000,  -- 10ms
    query_profiler_cpu_time_period_ns = 10000000,
    memory_profiler_step = 1048576;

-- Get trace data
SELECT
    arrayStringConcat(arrayReverse(trace), ';') AS stack,
    count() AS samples
FROM system.trace_log
WHERE query_id = 'your-query-id'
  AND trace_type = 'CPU'
GROUP BY trace
ORDER BY samples DESC
LIMIT 100;
```

### Visualize with Speedscope

```bash
# Export trace data
clickhouse-client --query "
SELECT
    arrayStringConcat(arrayReverse(arrayMap(x -> demangle(addressToSymbol(x)), trace)), ';') AS stack,
    count() AS samples
FROM system.trace_log
WHERE query_id = 'your-query-id'
GROUP BY trace
FORMAT TabSeparated
" > trace.txt

# Convert to flamegraph format and view
# Use https://www.speedscope.app/ to visualize
```

## Query Optimization Checklist

```markdown
1. **Check Partition Pruning**
   - Use date range filters that match partition key
   - Avoid functions on partition columns in WHERE

2. **Verify Primary Key Usage**
   - Filter on columns in ORDER BY (left to right)
   - Check with EXPLAIN indexes = 1

3. **Reduce Data Read**
   - Select only needed columns
   - Use PREWHERE for selective filters
   - Add skip indexes for common filter patterns

4. **Optimize Aggregations**
   - Reduce GROUP BY cardinality
   - Use external aggregation for large results
   - Consider pre-aggregation with materialized views

5. **Improve JOINs**
   - Use dictionaries for dimension lookups
   - Choose appropriate join_algorithm
   - Filter before joining

6. **Limit Result Sets**
   - Add LIMIT for exploratory queries
   - Use sampling for approximations
```

## Monitoring Query Performance

```sql
-- Create a view for query performance monitoring
CREATE VIEW query_performance AS
SELECT
    toStartOfHour(query_start_time) AS hour,
    count() AS queries,
    avg(query_duration_ms) AS avg_duration_ms,
    quantile(0.95)(query_duration_ms) AS p95_duration_ms,
    avg(read_rows) AS avg_rows_read,
    avg(memory_usage) AS avg_memory
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date >= today() - 7
GROUP BY hour
ORDER BY hour;

-- Alert on degraded performance
SELECT *
FROM query_performance
WHERE p95_duration_ms > 5000  -- p95 > 5 seconds
  AND hour >= now() - INTERVAL 1 HOUR;
```

---

Debugging slow queries in ClickHouse involves checking partition pruning, verifying primary key usage, and analyzing execution plans with EXPLAIN. Use the query log to find expensive queries, profile them to understand resource usage, and apply optimizations like PREWHERE, skip indexes, and pre-aggregation. Regular monitoring helps catch performance regressions early.
