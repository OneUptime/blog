# How to Configure ClickHouse Memory and Resource Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Memory, Performance, Resource Management, Database, Configuration, Tuning, Operations

Description: A practical guide to configuring memory limits, query complexity settings, and resource isolation in ClickHouse to prevent runaway queries from crashing your server and ensure fair resource allocation.

---

ClickHouse can consume all available memory if not properly configured. A single bad query can crash your server or starve other queries of resources. This guide covers memory limits, query complexity settings, and resource isolation to keep your ClickHouse cluster stable.

## Memory Architecture Overview

ClickHouse memory usage comes from several sources:

```
Total Memory Usage
├── Query Memory
│   ├── Read buffers
│   ├── Hash tables (GROUP BY, JOIN)
│   ├── Sorting buffers
│   └── Aggregation states
├── Background Operations
│   ├── Merges
│   ├── Mutations
│   └── Replication
├── Caches
│   ├── Mark cache
│   ├── Uncompressed cache
│   └── Dictionary cache
└── Connection overhead
    └── Per-connection buffers
```

## Query-Level Memory Limits

### max_memory_usage

The most important setting - limits memory per query:

```sql
-- Set globally (users.xml or SQL)
SET max_memory_usage = 10000000000;  -- 10 GB

-- Set per user
ALTER USER analyst SETTINGS max_memory_usage = 5000000000;

-- Set per query
SELECT *
FROM large_table
GROUP BY high_cardinality_column
SETTINGS max_memory_usage = 20000000000;
```

### max_memory_usage_for_user

Limits total memory across all queries for a user:

```sql
-- User can run multiple queries totaling 20 GB
ALTER USER etl_user SETTINGS max_memory_usage_for_user = 20000000000;
```

### max_memory_usage_for_all_queries

Server-wide limit for all queries combined:

```xml
<!-- /etc/clickhouse-server/config.d/memory.xml -->
<clickhouse>
    <max_memory_usage_for_all_queries>100000000000</max_memory_usage_for_all_queries>
</clickhouse>
```

## Memory for Specific Operations

### GROUP BY Memory

```sql
-- Limit GROUP BY memory
SET max_bytes_before_external_group_by = 5000000000;  -- 5 GB

-- When exceeded, spills to disk (slower but doesn't fail)
SELECT
    user_id,
    count() AS events
FROM events
GROUP BY user_id
SETTINGS max_bytes_before_external_group_by = 5000000000;
```

### ORDER BY Memory

```sql
-- Limit sorting memory
SET max_bytes_before_external_sort = 5000000000;  -- 5 GB

-- External sorting uses disk when memory exceeded
SELECT *
FROM events
ORDER BY event_time
SETTINGS max_bytes_before_external_sort = 5000000000;
```

### JOIN Memory

```sql
-- Limit JOIN hash table size
SET max_bytes_in_join = 5000000000;  -- 5 GB

-- Behavior when exceeded (throw or break)
SET join_overflow_mode = 'throw';  -- or 'break'

-- For large JOINs, use partial_merge algorithm
SET join_algorithm = 'partial_merge';
```

### Distinct Memory

```sql
-- Limit DISTINCT memory
SET max_bytes_before_external_distinct = 5000000000;
```

## Query Complexity Limits

### Row and Byte Limits

```sql
-- Maximum rows to read
SET max_rows_to_read = 1000000000;  -- 1 billion rows

-- Maximum bytes to read
SET max_bytes_to_read = 100000000000;  -- 100 GB

-- Behavior when exceeded
SET read_overflow_mode = 'throw';  -- or 'break'
```

### Result Set Limits

```sql
-- Maximum result rows
SET max_result_rows = 10000000;

-- Maximum result bytes
SET max_result_bytes = 1000000000;

-- Behavior
SET result_overflow_mode = 'throw';
```

### Execution Time Limits

```sql
-- Maximum query execution time (seconds)
SET max_execution_time = 300;  -- 5 minutes

-- Maximum execution time for distributed queries
SET max_execution_time_for_distributed_queries = 600;
```

### Thread Limits

```sql
-- Maximum threads per query
SET max_threads = 8;

-- Threads for INSERT queries
SET max_insert_threads = 4;

-- Threads for reading from remote servers
SET max_distributed_connections = 100;
```

## Server-Level Memory Configuration

### Total Memory Limit

```xml
<!-- /etc/clickhouse-server/config.d/memory.xml -->
<clickhouse>
    <!-- Maximum server memory usage (leave some for OS) -->
    <max_server_memory_usage_to_ram_ratio>0.9</max_server_memory_usage_to_ram_ratio>

    <!-- Or set absolute limit -->
    <max_server_memory_usage>100000000000</max_server_memory_usage>
</clickhouse>
```

### Cache Sizes

```xml
<clickhouse>
    <!-- Mark cache (index granule positions) -->
    <mark_cache_size>5368709120</mark_cache_size>  <!-- 5 GB -->

    <!-- Uncompressed data cache -->
    <uncompressed_cache_size>8589934592</uncompressed_cache_size>  <!-- 8 GB -->

    <!-- Compiled expression cache -->
    <compiled_expression_cache_size>1073741824</compiled_expression_cache_size>
</clickhouse>
```

### Background Operation Memory

```xml
<clickhouse>
    <!-- Memory for background merges -->
    <background_pool_size>16</background_pool_size>
    <background_merges_mutations_concurrency_ratio>2</background_merges_mutations_concurrency_ratio>

    <!-- Memory for background moves -->
    <background_move_pool_size>8</background_move_pool_size>
</clickhouse>
```

## Settings Profiles

### Creating Memory Profiles

```sql
-- Profile for analysts (limited resources)
CREATE SETTINGS PROFILE analyst_profile
SETTINGS
    max_memory_usage = 10000000000,
    max_memory_usage_for_user = 20000000000,
    max_execution_time = 300,
    max_threads = 8,
    max_bytes_before_external_group_by = 5000000000,
    max_bytes_before_external_sort = 5000000000;

-- Profile for ETL (more resources)
CREATE SETTINGS PROFILE etl_profile
SETTINGS
    max_memory_usage = 50000000000,
    max_memory_usage_for_user = 100000000000,
    max_execution_time = 3600,
    max_threads = 32,
    max_insert_threads = 16;

-- Profile for admins (minimal limits)
CREATE SETTINGS PROFILE admin_profile
SETTINGS
    max_memory_usage = 0,  -- No limit
    max_execution_time = 0;
```

### Applying Profiles

```sql
-- Apply to users
ALTER USER analyst SETTINGS PROFILE analyst_profile;
ALTER USER etl_user SETTINGS PROFILE etl_profile;

-- Apply to roles
ALTER ROLE data_reader SETTINGS PROFILE analyst_profile;
```

## Quotas for Resource Control

### Time-Based Quotas

```sql
-- Limit resources over time periods
CREATE QUOTA analyst_quota
FOR INTERVAL 1 hour
    MAX queries = 1000,
    MAX query_selects = 900,
    MAX result_rows = 100000000,
    MAX read_rows = 10000000000,
    MAX execution_time = 36000  -- Total seconds
FOR INTERVAL 1 day
    MAX queries = 10000,
    MAX read_rows = 100000000000
TO analyst;
```

### Monitoring Quota Usage

```sql
-- Check current quota consumption
SELECT
    quota_name,
    quota_key,
    queries,
    max_queries,
    read_rows,
    max_read_rows,
    execution_time
FROM system.quota_usage;
```

## Memory Monitoring

### Current Memory Usage

```sql
-- Total server memory
SELECT
    metric,
    value,
    description
FROM system.metrics
WHERE metric LIKE '%Memory%';

-- Memory by query
SELECT
    query_id,
    user,
    memory_usage,
    peak_memory_usage,
    query
FROM system.processes
ORDER BY memory_usage DESC;
```

### Historical Memory Usage

```sql
-- Memory usage from query log
SELECT
    toStartOfHour(query_start_time) AS hour,
    avg(memory_usage) AS avg_memory,
    max(memory_usage) AS max_memory,
    quantile(0.95)(memory_usage) AS p95_memory
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date >= today() - 7
GROUP BY hour
ORDER BY hour;
```

### Memory Warnings

```sql
-- Queries that hit memory limits
SELECT
    query_start_time,
    user,
    memory_usage,
    exception,
    query
FROM system.query_log
WHERE exception LIKE '%Memory limit%'
  AND event_date >= today() - 1
ORDER BY query_start_time DESC
LIMIT 50;
```

## Handling Memory Errors

### Common Memory Errors

```sql
-- "Memory limit exceeded"
-- Solution: Increase limit or optimize query
SET max_memory_usage = 20000000000;

-- "Memory limit for all queries exceeded"
-- Solution: Wait or increase server limit, kill other queries

-- "Too much data to aggregate"
-- Solution: Use external aggregation
SET max_bytes_before_external_group_by = 10000000000;
```

### Query Optimization for Memory

```sql
-- Bad: Full table scan with GROUP BY
SELECT
    user_id,
    count()
FROM events
GROUP BY user_id;

-- Better: Use approximate
SELECT
    user_id,
    count()
FROM events
GROUP BY user_id
SETTINGS
    max_bytes_before_external_group_by = 5000000000,
    group_by_two_level_threshold = 100000;

-- Best: Pre-aggregate if possible
SELECT
    user_id,
    sum(event_count)
FROM events_daily
GROUP BY user_id;
```

### Killing Runaway Queries

```sql
-- Find expensive queries
SELECT
    query_id,
    user,
    elapsed,
    memory_usage,
    formatReadableSize(memory_usage) AS memory,
    query
FROM system.processes
WHERE memory_usage > 5000000000
ORDER BY memory_usage DESC;

-- Kill a specific query
KILL QUERY WHERE query_id = 'abc-123';

-- Kill all queries from a user
KILL QUERY WHERE user = 'bad_user';
```

## Resource Isolation

### Workload Management

```sql
-- Create workload for different query types
-- (Available in ClickHouse 23.9+)

-- Define workloads in config
```

```xml
<clickhouse>
    <workload_schedulers>
        <default>
            <max_requests>100</max_requests>
            <max_cost>1000000000</max_cost>
        </default>
        <interactive>
            <max_requests>50</max_requests>
            <max_cost>500000000</max_cost>
            <priority>high</priority>
        </interactive>
        <batch>
            <max_requests>20</max_requests>
            <max_cost>2000000000</max_cost>
            <priority>low</priority>
        </batch>
    </workload_schedulers>
</clickhouse>
```

### CPU Priority

```sql
-- Lower priority for batch queries
SET os_thread_priority = 19;  -- Nice value (higher = lower priority)

-- Normal priority for interactive
SET os_thread_priority = 0;
```

## Best Practices

### Memory Configuration Template

```xml
<!-- /etc/clickhouse-server/config.d/memory.xml -->
<clickhouse>
    <!-- Server limits (64 GB RAM server) -->
    <max_server_memory_usage>55000000000</max_server_memory_usage>
    <max_memory_usage_for_all_queries>45000000000</max_memory_usage_for_all_queries>

    <!-- Caches -->
    <mark_cache_size>5368709120</mark_cache_size>
    <uncompressed_cache_size>8589934592</uncompressed_cache_size>

    <!-- Background operations -->
    <background_pool_size>16</background_pool_size>
</clickhouse>
```

### User Settings Template

```xml
<!-- /etc/clickhouse-server/users.d/limits.xml -->
<clickhouse>
    <profiles>
        <default>
            <max_memory_usage>10000000000</max_memory_usage>
            <max_memory_usage_for_user>20000000000</max_memory_usage_for_user>
            <max_execution_time>300</max_execution_time>
            <max_threads>8</max_threads>
            <max_bytes_before_external_group_by>5000000000</max_bytes_before_external_group_by>
            <max_bytes_before_external_sort>5000000000</max_bytes_before_external_sort>
        </default>
    </profiles>
</clickhouse>
```

### Sizing Guidelines

```
Server RAM     | max_server_memory | Query limit | Cache
-------------- | ----------------- | ----------- | -----
16 GB          | 12 GB             | 4 GB        | 2 GB
32 GB          | 26 GB             | 8 GB        | 4 GB
64 GB          | 55 GB             | 15 GB       | 8 GB
128 GB         | 110 GB            | 30 GB       | 15 GB
256 GB         | 220 GB            | 60 GB       | 30 GB
```

---

Proper memory configuration prevents crashes and ensures fair resource allocation. Set conservative defaults, use external aggregation for large operations, and monitor memory usage continuously. When queries fail with memory errors, first try to optimize the query before increasing limits.
