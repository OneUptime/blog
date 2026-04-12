# How to Configure InnoDB Purge Settings in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Purge, MVCC, Performance

Description: Learn how to configure InnoDB purge settings in MySQL to control undo log cleanup, manage history list length, and prevent purge lag.

---

InnoDB uses multi-version concurrency control (MVCC) to provide consistent reads without locking. Old row versions are stored in the undo log until no active transaction needs them. The purge process cleans up these obsolete undo records. When purge falls behind, the history list length (HLL) grows, causing performance degradation.

## Understanding the Purge Process

When a transaction commits and there are no longer any active transactions that started before the modification, InnoDB purges the old row versions from the undo log. Multiple purge threads process this cleanup in parallel.

```sql
-- Check history list length (how much undo cleanup is pending)
SHOW ENGINE INNODB STATUS\G
-- Look for: "History list length XXXX"

-- Or query directly
SELECT NAME, COUNT
FROM information_schema.INNODB_METRICS
WHERE NAME = 'trx_rseg_history_len';
```

A history list length above 10,000 usually indicates purge is falling behind. Values above 100,000 can cause significant query slowdowns.

## Key Purge Configuration Variables

```sql
-- View all purge-related settings
SHOW GLOBAL VARIABLES LIKE 'innodb_purge%';
```

| Variable | Default | Description |
| --- | --- | --- |
| `innodb_purge_threads` | 4 | Number of parallel purge threads |
| `innodb_purge_batch_size` | 300 | Undo log records per purge batch |
| `innodb_max_purge_lag` | 0 | Max HLL before throttling DML |
| `innodb_max_purge_lag_delay` | 0 | Max throttle delay in microseconds |

## Tuning Purge Threads

Increase purge threads if HLL grows consistently under write load:

This variable is not dynamic and requires a server restart to take effect. Set it in `my.cnf`:

```text
[mysqld]
innodb_purge_threads=8
innodb_purge_batch_size=500
```

More threads help when the undo log has records spread across many rollback segments. The maximum allowed value is 32.

## Using Purge Lag Throttling

When HLL grows too large, MySQL can automatically throttle incoming DML to give purge time to catch up:

```sql
-- Throttle DML when HLL exceeds 10000
SET GLOBAL innodb_max_purge_lag = 10000;

-- Cap the throttle delay at 100ms
SET GLOBAL innodb_max_purge_lag_delay = 100000;
```

The throttle delay is calculated as: `delay = (purge_lag / innodb_max_purge_lag - 0.9995) * 10000` microseconds (MySQL 8.0.14+), capped at `innodb_max_purge_lag_delay`.

## Finding Long-Running Transactions That Block Purge

The most common cause of purge lag is long-running transactions that hold a consistent read view, preventing InnoDB from purging old versions those transactions might need:

```sql
-- Find transactions preventing purge
SELECT
    trx_id,
    trx_state,
    trx_started,
    TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS duration_seconds,
    trx_mysql_thread_id,
    trx_query
FROM information_schema.INNODB_TRX
WHERE trx_state = 'RUNNING'
ORDER BY trx_started ASC
LIMIT 10;
```

Transactions with no active query (idle transactions) that have been running for hours are the most common culprit.

## Monitoring Purge Activity

```sql
-- Enable purge metrics
SET GLOBAL innodb_monitor_enable = 'trx_rseg_history_len';
SET GLOBAL innodb_monitor_enable = 'purge_%';

-- View purge throughput
SELECT NAME, COUNT
FROM information_schema.INNODB_METRICS
WHERE SUBSYSTEM IN ('purge', 'transaction')
  AND STATUS = 'enabled';
```

## Undo Tablespace Truncation (MySQL 8.0)

In MySQL 8.0, InnoDB can automatically truncate undo tablespaces after purge:

```sql
-- Enable automatic undo tablespace truncation
SET GLOBAL innodb_undo_log_truncate = ON;
SET GLOBAL innodb_max_undo_log_size = 1073741824; -- 1GB threshold
```

```text
[mysqld]
innodb_undo_log_truncate=ON
innodb_max_undo_log_size=1G
```

## Summary

InnoDB purge cleans up old MVCC row versions from the undo log. Monitor the history list length via `SHOW ENGINE INNODB STATUS` or `INNODB_METRICS`. Increase `innodb_purge_threads` to speed up purge under heavy write loads. Identify and close long-running idle transactions that block purge progress. Enable `innodb_undo_log_truncate` in MySQL 8.0 to reclaim undo tablespace disk space automatically.
