# How to Use SHOW STATUS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SHOW STATUS, Performance Monitoring, Server Diagnostics

Description: Learn how to use SHOW STATUS in MySQL to retrieve server status variables for monitoring connections, queries, cache, and InnoDB performance.

---

## What Is SHOW STATUS in MySQL

`SHOW STATUS` displays server status variables - counters and measurements that MySQL maintains internally about its operation since the last restart. These variables track connection counts, query execution rates, cache hit rates, replication lag, InnoDB buffer pool usage, and much more.

Status variables are essential for performance monitoring, capacity planning, and diagnosing bottlenecks.

## Basic Syntax

```sql
SHOW [GLOBAL | SESSION] STATUS [LIKE 'pattern' | WHERE condition];
```

- `GLOBAL` - cumulative values since server start (most useful for monitoring)
- `SESSION` - values for the current connection only

## Show All Status Variables

```sql
SHOW GLOBAL STATUS;
```

This returns hundreds of rows. Use LIKE to filter.

## Filtering Status Variables

```sql
-- Variables related to connections
SHOW GLOBAL STATUS LIKE 'Threads_%';

-- Variables related to queries
SHOW GLOBAL STATUS LIKE 'Questions';
SHOW GLOBAL STATUS LIKE '%query%';

-- InnoDB buffer pool
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool%';
```

## Key Connection Metrics

```sql
SHOW GLOBAL STATUS WHERE Variable_name IN (
    'Connections',
    'Threads_connected',
    'Threads_running',
    'Max_used_connections',
    'Connection_errors_max_connections',
    'Aborted_connects',
    'Aborted_clients'
);
```

- `Threads_connected` - current open connections
- `Threads_running` - connections actively executing a query
- `Max_used_connections` - peak concurrent connections since start
- `Aborted_connects` - failed connection attempts

## Query Performance Metrics

```sql
SHOW GLOBAL STATUS WHERE Variable_name IN (
    'Questions',
    'Com_select',
    'Com_insert',
    'Com_update',
    'Com_delete',
    'Slow_queries',
    'Sort_merge_passes',
    'Created_tmp_disk_tables'
);
```

- `Slow_queries` - queries exceeding `long_query_time`
- `Created_tmp_disk_tables` - queries spilling temporary tables to disk (bad sign)
- `Sort_merge_passes` - disk-based sort operations (increase `sort_buffer_size` if high)

## InnoDB Buffer Pool Health

```sql
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool%';
```

Calculate the buffer pool hit rate:

```sql
SELECT
    (1 - (
        (SELECT Variable_value FROM performance_schema.global_status
         WHERE Variable_name = 'Innodb_buffer_pool_reads') /
        (SELECT Variable_value FROM performance_schema.global_status
         WHERE Variable_name = 'Innodb_buffer_pool_read_requests')
    )) * 100 AS buffer_pool_hit_rate_pct;
```

A hit rate above 99% is healthy. Below 95% indicates the buffer pool is undersized.

## Replication Metrics

```sql
SHOW GLOBAL STATUS LIKE 'Rpl_%';
SHOW GLOBAL STATUS LIKE 'Slave_%';
```

## Table Cache and Open Files

```sql
SHOW GLOBAL STATUS WHERE Variable_name IN (
    'Open_tables',
    'Opened_tables',
    'Table_open_cache_hits',
    'Table_open_cache_misses',
    'Open_files',
    'Opened_files'
);
```

If `Opened_tables` grows rapidly compared to `Open_tables`, increase `table_open_cache`.

## Calculating Queries Per Second

```sql
SELECT
    Variable_value / Uptime AS qps
FROM (
    SELECT Variable_value FROM performance_schema.global_status
    WHERE Variable_name = 'Questions'
) q,
(
    SELECT Variable_value AS Uptime FROM performance_schema.global_status
    WHERE Variable_name = 'Uptime'
) u;
```

## Resetting Status Counters

You can reset most non-cumulative status variables (useful after configuration changes):

```sql
FLUSH STATUS;
```

Note: This resets session-level counters but most global counters require a server restart.

## Monitoring with Prometheus mysqld_exporter

The `mysqld_exporter` exposes MySQL status variables as Prometheus metrics. A sample scrape config:

```yaml
- job_name: mysql
  static_configs:
    - targets: ['localhost:9104']
```

The exporter automatically calls `SHOW GLOBAL STATUS` and exposes metrics like:
- `mysql_global_status_threads_connected`
- `mysql_global_status_slow_queries`
- `mysql_global_status_innodb_buffer_pool_reads`

## Summary

`SHOW STATUS` exposes MySQL's internal health counters for monitoring connections, query rates, cache hit rates, and InnoDB performance. Focus on `Threads_connected`, `Slow_queries`, `Created_tmp_disk_tables`, and `Innodb_buffer_pool_reads` as top-level health indicators. Use monitoring tools like Prometheus with `mysqld_exporter` to track these metrics over time and alert on anomalies.
