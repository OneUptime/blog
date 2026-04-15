# How to Tune ClickHouse for Maximum Query Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, Infrastructure, Database, Analytics

Description: Learn how to tune ClickHouse server settings, hardware configuration, and query execution parameters to achieve maximum concurrent query throughput.

## Introduction

Query throughput - the number of queries processed per second - is the critical metric for analytics platforms serving many concurrent users. ClickHouse can achieve very high throughput, but reaching that ceiling requires tuning at multiple layers: hardware, OS, server configuration, and query settings. This guide walks through each layer with concrete configuration values and benchmarking approaches.

## Hardware and OS Tuning

Before touching ClickHouse configuration, ensure the OS is not the bottleneck.

```bash
# Increase file descriptor limits
echo "clickhouse soft nofile 1048576" >> /etc/security/limits.conf
echo "clickhouse hard nofile 1048576" >> /etc/security/limits.conf

# Disable transparent huge pages (reduces latency jitter)
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag

# Set the I/O scheduler to noop/none for NVMe (no benefit from elevator scheduling)
echo none > /sys/block/nvme0n1/queue/scheduler

# Increase network backlog
sysctl -w net.core.somaxconn=65535
sysctl -w net.ipv4.tcp_max_syn_backlog=65535

# Increase virtual memory map count (required for large memory mappings)
sysctl -w vm.max_map_count=262144
```

Make these persistent:

```bash
# /etc/sysctl.d/99-clickhouse.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
vm.max_map_count = 262144
vm.swappiness = 1
```

## Server Configuration for High Throughput

Edit `/etc/clickhouse-server/config.xml` or drop files in `/etc/clickhouse-server/config.d/`.

```xml
<!-- /etc/clickhouse-server/config.d/performance.xml -->
<clickhouse>
    <!-- Use all available CPU cores for query execution -->
    <max_threads>0</max_threads>  <!-- 0 = auto-detect (number of CPUs) -->

    <!-- Concurrent query limit - set to 2x CPU cores for analytics workloads -->
    <max_concurrent_queries>200</max_concurrent_queries>

    <!-- Memory per server (leave 10% for OS) -->
    <max_server_memory_usage_to_ram_ratio>0.9</max_server_memory_usage_to_ram_ratio>

    <!-- Enable mark cache (stores sparse index marks in RAM) -->
    <mark_cache_size>5368709120</mark_cache_size>  <!-- 5 GB -->

    <!-- Uncompressed block cache for hot data -->
    <uncompressed_cache_size>8589934592</uncompressed_cache_size>  <!-- 8 GB -->

    <!-- Background merge threads (for write throughput too) -->
    <background_pool_size>16</background_pool_size>
    <background_merges_mutations_concurrency_ratio>2</background_merges_mutations_concurrency_ratio>

    <!-- HTTP keep-alive for repeated queries from the same client -->
    <keep_alive_timeout>30</keep_alive_timeout>
</clickhouse>
```

## Query-Level Throughput Settings

Apply these as session defaults for all users, or set them per-query for fine-grained control.

```sql
-- Set globally in users.xml or via SET for a session

-- Use all CPU threads for large queries
SET max_threads = 16;

-- Enable parallel replicas for distributed tables (ClickHouse 23.3+)
SET max_parallel_replicas = 4;
SET parallel_replicas_for_non_replicated_merge_tree = 1;

-- Increase pipeline parallelism
SET max_streams_to_max_threads_ratio = 1;

-- Enable query result caching (production-ready since ClickHouse 23.5)
SET use_query_cache = 1;
SET query_cache_ttl = 30;  -- cache results for 30 seconds
SET query_cache_max_size_in_bytes = 1073741824;  -- 1 GB per-user cache quota

-- Reduce coordinator overhead for simple aggregate queries
SET aggregation_in_order_max_block_bytes = 50000000;
```

## Query Result Caching

For dashboards that run the same query repeatedly, enabling the query cache dramatically increases apparent throughput by returning cached results instantly.

```sql
-- Enable result cache for a specific query
SELECT
    toDate(event_time) AS date,
    service,
    count()            AS events
FROM metrics
WHERE event_time >= today() - 7
GROUP BY date, service
SETTINGS use_query_cache = 1, query_cache_ttl = 60;

-- Check cache usage per query
SELECT
    event_time,
    query_cache_usage,
    ProfileEvents['QueryCacheHits'] AS cache_hits,
    ProfileEvents['QueryCacheMisses'] AS cache_misses
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
ORDER BY event_time DESC
LIMIT 20;

-- View cache contents
SELECT query, result_size, stale
FROM system.query_cache
ORDER BY result_size DESC;

-- Clear the cache
SYSTEM DROP QUERY CACHE;
```

## Connection Pooling

ClickHouse handles each connection in a separate thread. For high-concurrency scenarios, use a connection pool in your application to reuse connections.

```python
# Python example using clickhouse-driver with connection pooling
from clickhouse_driver import Client
from clickhouse_pool import ChPool

pool = ChPool(
    host='clickhouse.internal',
    port=9000,
    database='analytics',
    user='service_account',
    password='password',
    connections_min=5,
    connections_max=20,
)

with pool.get_client() as client:
    result = client.execute('SELECT count() FROM metrics')
```

## Prioritizing Queries with Query Priority

Assign lower priorities to long-running reports so interactive dashboard queries are not starved.

```sql
-- High priority for interactive dashboard queries
SELECT service, count()
FROM metrics
WHERE event_time >= now() - INTERVAL 1 HOUR
GROUP BY service
SETTINGS priority = 1;

-- Low priority for nightly reports (background processing)
SELECT *
FROM metrics
WHERE event_time >= '2024-01-01'
SETTINGS priority = 10;  -- higher number = lower priority
```

## Measuring Throughput

Use `system.query_log` to measure queries per second and identify bottlenecks.

```sql
-- Queries per second over the last hour, broken down by minute
SELECT
    toStartOfMinute(event_time)    AS minute,
    count()                        AS queries_finished,
    avg(query_duration_ms)         AS avg_duration_ms,
    quantile(0.99)(query_duration_ms) AS p99_duration_ms,
    sum(read_bytes) / 1e9          AS total_gb_read
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;

-- Identify slow queries consuming the most server time
SELECT
    left(query, 80)            AS query_snippet,
    count()                    AS executions,
    avg(query_duration_ms)     AS avg_ms,
    sum(query_duration_ms)     AS total_ms,
    sum(read_bytes)            AS total_bytes_read
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY query_snippet
ORDER BY total_ms DESC
LIMIT 10;
```

## Limiting Expensive Queries

Prevent individual queries from monopolizing the server:

```sql
-- Global defaults via settings profile
CREATE SETTINGS PROFILE default_limits
    SETTINGS
        max_memory_usage         = 10000000000,  -- 10 GB per query
        max_execution_time       = 120,           -- 2 minute timeout
        max_rows_to_read         = 5000000000,    -- 5 billion rows max
        max_bytes_to_read        = 100000000000;  -- 100 GB max read
```

## Summary

Maximum query throughput in ClickHouse requires tuning at every layer: configure OS file descriptor limits and disable transparent huge pages, set `max_concurrent_queries` and mark/uncompressed cache sizes in the server config, enable the query result cache for repeated dashboard queries, use connection pooling in your application, and assign query priorities to protect interactive queries from long-running reports. Measure baseline throughput with `system.query_log` to identify which queries consume the most total server time, and optimize those first for the largest impact.
