# How to Monitor InnoDB Metrics in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Monitoring, Metric, Performance Schema

Description: Learn how to enable and query InnoDB metrics in MySQL using the information_schema.INNODB_METRICS table for granular engine telemetry.

---

MySQL provides an `information_schema.INNODB_METRICS` table that exposes hundreds of internal InnoDB counters. These metrics are more granular than the `SHOW STATUS` variables and can be selectively enabled to avoid overhead. This table is invaluable for deep performance investigations.

## Exploring Available Metrics

```sql
-- Count available metrics
SELECT COUNT(*) FROM information_schema.INNODB_METRICS;

-- View all metrics and their current state
SELECT NAME, SUBSYSTEM, STATUS, TYPE, COMMENT
FROM information_schema.INNODB_METRICS
ORDER BY SUBSYSTEM, NAME
LIMIT 30;
```

Metrics are organized into subsystems such as `buffer`, `lock`, `log`, `os`, `trx`, `adaptive_hash`, and more.

## Enabling and Disabling Metrics

Most metrics are disabled by default to minimize overhead. Enable them selectively:

```sql
-- Enable a specific metric
SET GLOBAL innodb_monitor_enable = 'buffer_pool_reads';

-- Enable all metrics in a subsystem
SET GLOBAL innodb_monitor_enable = 'buffer_%';

-- Enable all metrics (higher overhead)
SET GLOBAL innodb_monitor_enable = 'all';

-- Disable a metric
SET GLOBAL innodb_monitor_disable = 'buffer_pool_reads';

-- Reset counters
SET GLOBAL innodb_monitor_reset = 'buffer_pool_reads';
SET GLOBAL innodb_monitor_reset_all = 'all';
```

Persist enabled metrics in `my.cnf`:

```text
[mysqld]
innodb_monitor_enable=buffer_%
innodb_monitor_enable=lock_%
innodb_monitor_enable=log_%
```

## Querying Buffer Pool Metrics

```sql
-- Buffer pool metrics
SELECT NAME, COUNT, MIN_COUNT, MAX_COUNT, AVG_COUNT,
       STATUS, TIME_ENABLED
FROM information_schema.INNODB_METRICS
WHERE SUBSYSTEM = 'buffer'
  AND STATUS = 'enabled'
ORDER BY NAME;
```

Key buffer metrics:

| Metric Name | Description |
| --- | --- |
| `buffer_pool_reads` | Physical disk reads |
| `buffer_pool_read_requests` | Logical read requests |
| `buffer_pool_pages_dirty` | Pages modified in the buffer pool but not yet flushed to disk |
| `buffer_pool_pages_flushed` | Pages written to disk |
| `buffer_LRU_get_free_waits` | Waits to find a free buffer page |

## Lock Metrics

```sql
-- Enable and view lock metrics
SET GLOBAL innodb_monitor_enable = 'lock_%';

SELECT NAME, COUNT, MAX_COUNT
FROM information_schema.INNODB_METRICS
WHERE SUBSYSTEM = 'lock'
  AND STATUS = 'enabled'
ORDER BY COUNT DESC;
```

Watch `lock_row_lock_waits` and `lock_deadlocks` for concurrency problems.

## Log and Transaction Metrics

```sql
SET GLOBAL innodb_monitor_enable = 'log_%';
SET GLOBAL innodb_monitor_enable = 'trx_%';

-- Redo log write activity
SELECT NAME, COUNT
FROM information_schema.INNODB_METRICS
WHERE SUBSYSTEM = 'log'
  AND STATUS = 'enabled';
```

`log_write_requests` vs. `log_writes` shows the effectiveness of the log buffer - if they are nearly equal, consider increasing `innodb_log_buffer_size`.

## Creating a Monitoring Dashboard Query

```sql
-- Consolidated health snapshot
SELECT
    CONCAT(SUBSYSTEM, '/', NAME) AS metric,
    COUNT AS current_value,
    TYPE
FROM information_schema.INNODB_METRICS
WHERE STATUS = 'enabled'
  AND NAME IN (
      'buffer_pool_reads',
      'buffer_pool_read_requests',
      'buffer_pool_pages_dirty',
      'lock_row_lock_waits',
      'lock_deadlocks',
      'log_write_requests',
      'trx_rseg_history_len'
  )
ORDER BY SUBSYSTEM, NAME;
```

`trx_rseg_history_len` (undo history list length) should stay low. A rapidly growing value indicates long-running transactions preventing InnoDB from purging old row versions.

## Using metrics with Prometheus

When using `mysqld_exporter`, enable InnoDB metrics collection:

```bash
mysqld_exporter \
    --collect.info_schema.innodb_metrics \
    --collect.global_status \
    --collect.engine_innodb_status
```

## Summary

`information_schema.INNODB_METRICS` exposes hundreds of InnoDB counters organized by subsystem. Enable metrics selectively with `SET GLOBAL innodb_monitor_enable`. Focus on buffer pool reads, lock wait counts, deadlocks, and undo history length as core health indicators. For production monitoring, expose these via `mysqld_exporter` and visualize in Grafana.
