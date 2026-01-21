# How to Fix Memory Limit Exceeded Errors in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Memory, Troubleshooting, Performance, Error Handling, Query Optimization, Database, Operations

Description: A troubleshooting guide for resolving Memory Limit Exceeded errors in ClickHouse, covering memory settings, query optimization, external aggregation, and strategies for memory-efficient queries.

---

Memory limit errors are one of the most common issues in ClickHouse. They occur when a query tries to use more memory than allowed, causing the query to fail. This guide explains why these errors happen and how to fix them.

## Understanding Memory Errors

### Common Error Messages

```
DB::Exception: Memory limit (for query) exceeded: would use 10.50 GiB
(attempt to allocate chunk of 4194304 bytes), maximum: 10.00 GiB.

DB::Exception: Memory limit (total) exceeded: would use 105.00 GiB
(attempt to allocate chunk of 1048576 bytes), maximum: 100.00 GiB.

DB::Exception: Memory limit (for user) exceeded: would use 25.00 GiB
(attempt to allocate chunk of 8388608 bytes), maximum: 20.00 GiB.
```

### Memory Limit Hierarchy

```
Server Memory (max_server_memory_usage)
    └── All Queries (max_memory_usage_for_all_queries)
        └── User Memory (max_memory_usage_for_user)
            └── Query Memory (max_memory_usage)
```

## Diagnosing Memory Issues

### Check Current Memory Usage

```sql
-- Current memory metrics
SELECT
    metric,
    value,
    description
FROM system.metrics
WHERE metric LIKE '%Memory%';

-- Memory by component
SELECT
    metric,
    formatReadableSize(value) AS memory
FROM system.asynchronous_metrics
WHERE metric LIKE '%Memory%'
ORDER BY value DESC;
```

### Find Memory-Hungry Queries

```sql
-- Queries that hit memory limits
SELECT
    query_start_time,
    user,
    query_duration_ms,
    formatReadableSize(memory_usage) AS memory_used,
    formatReadableSize(peak_memory_usage) AS peak_memory,
    exception,
    query
FROM system.query_log
WHERE exception LIKE '%Memory limit%'
  AND event_date >= today() - 1
ORDER BY query_start_time DESC
LIMIT 20;

-- Top memory consumers
SELECT
    query_start_time,
    formatReadableSize(peak_memory_usage) AS peak_memory,
    read_rows,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date = today()
ORDER BY peak_memory_usage DESC
LIMIT 10;
```

### Identify Problematic Patterns

```sql
-- GROUP BY with high cardinality
SELECT
    query,
    peak_memory_usage
FROM system.query_log
WHERE query LIKE '%GROUP BY%'
  AND peak_memory_usage > 5000000000  -- > 5GB
  AND event_date >= today() - 7
ORDER BY peak_memory_usage DESC
LIMIT 10;

-- Large JOINs
SELECT
    query,
    peak_memory_usage
FROM system.query_log
WHERE query LIKE '%JOIN%'
  AND peak_memory_usage > 5000000000
  AND event_date >= today() - 7
ORDER BY peak_memory_usage DESC
LIMIT 10;
```

## Quick Fixes

### Increase Memory Limit

```sql
-- Increase for single query
SELECT user_id, count()
FROM events
GROUP BY user_id
SETTINGS max_memory_usage = 20000000000;  -- 20 GB

-- Increase for session
SET max_memory_usage = 20000000000;

-- Increase for user permanently
ALTER USER analyst SETTINGS max_memory_usage = 20000000000;
```

### Enable External Aggregation

```sql
-- Spill to disk when memory limit is reached
SELECT user_id, count() AS events
FROM events
GROUP BY user_id
SETTINGS
    max_bytes_before_external_group_by = 5000000000,  -- 5 GB
    max_memory_usage = 10000000000;  -- 10 GB total

-- For sorting
SELECT *
FROM events
ORDER BY event_time
SETTINGS max_bytes_before_external_sort = 5000000000;
```

### Use External JOIN

```sql
-- For large JOINs
SELECT e.*, u.name
FROM events e
JOIN users u ON e.user_id = u.id
SETTINGS
    max_bytes_in_join = 5000000000,
    join_algorithm = 'partial_merge';  -- Or 'grace_hash'
```

## Query Optimization Strategies

### Reduce GROUP BY Cardinality

```sql
-- Problem: Too many unique values
SELECT session_id, count()
FROM events
GROUP BY session_id;  -- Millions of sessions

-- Solution 1: Filter first
SELECT session_id, count()
FROM events
WHERE event_time >= today() - 7  -- Reduce time range
GROUP BY session_id;

-- Solution 2: Aggregate by higher level
SELECT user_id, count() AS sessions
FROM (
    SELECT user_id, session_id
    FROM events
    GROUP BY user_id, session_id
)
GROUP BY user_id;

-- Solution 3: Use approximate functions
SELECT uniqHLL12(session_id) AS approx_sessions
FROM events
WHERE event_time >= today() - 30;
```

### Optimize JOINs

```sql
-- Problem: Large right side in JOIN
SELECT e.*, u.*
FROM events e
JOIN users u ON e.user_id = u.id;

-- Solution 1: Use dictionary instead
CREATE DICTIONARY users_dict (
    user_id UInt64,
    name String,
    email String
)
PRIMARY KEY user_id
SOURCE(CLICKHOUSE(TABLE users))
LAYOUT(HASHED())
LIFETIME(MIN 3600 MAX 7200);

SELECT
    e.*,
    dictGet('users_dict', 'name', e.user_id) AS user_name
FROM events e;

-- Solution 2: Filter before JOIN
SELECT e.*, u.name
FROM (
    SELECT *
    FROM events
    WHERE event_time >= today() - 1
) e
JOIN users u ON e.user_id = u.id;
```

### Process in Batches

```sql
-- Instead of one large query
-- Break into smaller chunks by time or partition

-- Process one month at a time
SELECT
    toYYYYMM(event_time) AS month,
    user_id,
    count() AS events
FROM events
WHERE event_time >= '2024-01-01'
  AND event_time < '2024-02-01'  -- One month
GROUP BY month, user_id;
```

### Use Sampling

```sql
-- Approximate results with less memory
SELECT
    user_id,
    count() * 100 AS estimated_events
FROM events SAMPLE 0.01  -- 1% sample
GROUP BY user_id
ORDER BY estimated_events DESC
LIMIT 1000;
```

## Memory-Efficient Query Patterns

### Limit Result Sets

```sql
-- Always limit exploratory queries
SELECT *
FROM events
WHERE user_id = 12345
LIMIT 1000;

-- Use approximate for counts
SELECT uniqHLL12(user_id) AS approx_users
FROM events
WHERE event_time >= today() - 30;
```

### Reduce Columns

```sql
-- Bad: SELECT *
SELECT * FROM events WHERE event_time >= today();

-- Good: Only needed columns
SELECT event_id, event_type, user_id
FROM events
WHERE event_time >= today();
```

### Use PREWHERE

```sql
-- Filter data before loading all columns
SELECT *
FROM events
PREWHERE event_time >= today() - 7
WHERE event_type = 'purchase';
```

### Materialize Intermediate Results

```sql
-- Create intermediate table for complex queries
CREATE TABLE temp_user_stats
ENGINE = MergeTree()
ORDER BY user_id
AS SELECT
    user_id,
    count() AS total_events,
    uniqExact(session_id) AS sessions
FROM events
WHERE event_time >= today() - 30
GROUP BY user_id;

-- Then join with the smaller result
SELECT
    u.*,
    s.total_events,
    s.sessions
FROM users u
JOIN temp_user_stats s ON u.id = s.user_id;

-- Clean up
DROP TABLE temp_user_stats;
```

## Server Configuration

### Memory Settings

```xml
<!-- /etc/clickhouse-server/config.d/memory.xml -->
<clickhouse>
    <!-- Total server memory limit -->
    <max_server_memory_usage_to_ram_ratio>0.9</max_server_memory_usage_to_ram_ratio>

    <!-- Or absolute limit -->
    <max_server_memory_usage>50000000000</max_server_memory_usage>

    <!-- Memory for all queries -->
    <max_memory_usage_for_all_queries>40000000000</max_memory_usage_for_all_queries>
</clickhouse>
```

### User Profile Limits

```xml
<!-- /etc/clickhouse-server/users.d/memory_profiles.xml -->
<clickhouse>
    <profiles>
        <default>
            <max_memory_usage>10000000000</max_memory_usage>
            <max_memory_usage_for_user>20000000000</max_memory_usage_for_user>
            <max_bytes_before_external_group_by>5000000000</max_bytes_before_external_group_by>
            <max_bytes_before_external_sort>5000000000</max_bytes_before_external_sort>
        </default>

        <high_memory>
            <max_memory_usage>50000000000</max_memory_usage>
            <max_memory_usage_for_user>100000000000</max_memory_usage_for_user>
        </high_memory>
    </profiles>
</clickhouse>
```

### Temporary Storage for External Operations

```xml
<!-- Configure disk for external operations -->
<clickhouse>
    <tmp_path>/var/lib/clickhouse/tmp/</tmp_path>

    <!-- Multiple tmp disks for parallel operations -->
    <storage_configuration>
        <disks>
            <tmp_disk>
                <path>/mnt/fast_ssd/clickhouse_tmp/</path>
            </tmp_disk>
        </disks>
    </storage_configuration>
</clickhouse>
```

## Monitoring and Prevention

### Memory Alerts

```sql
-- Create alert query for high memory usage
SELECT
    metric,
    value,
    formatReadableSize(value) AS memory
FROM system.metrics
WHERE metric = 'MemoryTracking'
  AND value > 40000000000;  -- Alert if > 40GB

-- Monitor memory over time
SELECT
    toStartOfMinute(event_time) AS minute,
    max(value) AS peak_memory
FROM system.asynchronous_metric_log
WHERE metric = 'MemoryTracking'
  AND event_date = today()
GROUP BY minute
ORDER BY minute;
```

### Query Governance

```sql
-- Create quota to prevent runaway queries
CREATE QUOTA memory_quota
FOR INTERVAL 1 hour
    MAX execution_time = 36000  -- 10 hours total
    MAX result_rows = 1000000000
TO default_user;
```

### Kill Problem Queries

```sql
-- Find and kill high-memory queries
SELECT
    query_id,
    user,
    formatReadableSize(memory_usage) AS memory,
    elapsed,
    query
FROM system.processes
WHERE memory_usage > 10000000000  -- > 10GB
ORDER BY memory_usage DESC;

-- Kill specific query
KILL QUERY WHERE query_id = 'problem-query-id';

-- Kill all queries from problematic user
KILL QUERY WHERE user = 'problem_user';
```

## Summary Checklist

```markdown
When you hit "Memory limit exceeded":

1. **Quick fixes**
   - Increase max_memory_usage for the query
   - Enable external aggregation/sorting
   - Add LIMIT to reduce result set

2. **Query optimization**
   - Reduce GROUP BY cardinality
   - Use dictionaries instead of JOINs
   - Filter data earlier in the query
   - Select only needed columns

3. **Server configuration**
   - Increase memory limits appropriately
   - Configure external operation disk space
   - Set up user profiles with appropriate limits

4. **Long-term solutions**
   - Pre-aggregate with materialized views
   - Partition tables for better filtering
   - Use approximate functions where exact counts aren't needed
```

---

Memory limit errors in ClickHouse usually indicate queries that need optimization. Start by enabling external aggregation to let the query complete, then optimize the query to use less memory. For recurring patterns, consider pre-aggregating data with materialized views or using approximate functions. Monitor memory usage to catch problems before they impact users.
