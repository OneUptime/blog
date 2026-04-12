# How to Monitor InnoDB Contention Points in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Performance, Monitoring, Locking

Description: Learn how to identify and monitor InnoDB contention points in MySQL using Performance Schema and SHOW ENGINE INNODB STATUS to resolve bottlenecks.

---

## Understanding InnoDB Contention

InnoDB uses internal mutexes and read-write locks to protect shared data structures. Under high concurrency, threads compete for these locks, causing contention that appears as high CPU wait times, slow queries, and degraded throughput. Common contention points include the buffer pool, adaptive hash index, redo log, and row-level locks.

## Using SHOW ENGINE INNODB STATUS

The first place to look for contention is the InnoDB status output:

```sql
SHOW ENGINE INNODB STATUS\G
```

In the `SEMAPHORES` section, look for lines like:

```text
--Thread 140234567 has waited at buf0buf.cc line 4321 for 10.00 seconds the semaphore:
Mutex at 0x... created file buf0buf.cc, lock var 1
```

Frequent waits in `buf0buf.cc` indicate buffer pool mutex contention. Waits in `btr0sea.cc` point to adaptive hash index contention.

## Querying Performance Schema for Mutex Waits

Performance Schema provides detailed mutex and latch statistics:

```sql
SELECT EVENT_NAME, COUNT_STAR, SUM_TIMER_WAIT / 1e12 AS wait_sec
FROM performance_schema.events_waits_summary_global_by_event_name
WHERE EVENT_NAME LIKE 'wait/synch/mutex/innodb/%'
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

The top entries reveal which internal locks are most contested.

## Identifying Row-Level Lock Contention

For row lock waits in MySQL 5.6/5.7, use the `INNODB_LOCK_WAITS` table to identify blocking relationships:

```sql
SELECT
  r.trx_id AS waiting_trx,
  r.trx_query AS waiting_query,
  b.trx_id AS blocking_trx,
  b.trx_query AS blocking_query,
  b.trx_mysql_thread_id AS blocking_thread
FROM information_schema.INNODB_LOCK_WAITS w
JOIN information_schema.INNODB_TRX r
  ON r.trx_id = w.requesting_trx_id
JOIN information_schema.INNODB_TRX b
  ON b.trx_id = w.blocking_trx_id
LIMIT 10;
```

In MySQL 8.0+, use the Performance Schema data lock tables:

```sql
SELECT
  REQUESTING_ENGINE_TRANSACTION_ID,
  BLOCKING_ENGINE_TRANSACTION_ID,
  req.trx_query AS waiting_query,
  blk.trx_query AS blocking_query
FROM performance_schema.data_lock_waits
JOIN information_schema.INNODB_TRX req
  ON req.trx_id = REQUESTING_ENGINE_TRANSACTION_ID
JOIN information_schema.INNODB_TRX blk
  ON blk.trx_id = BLOCKING_ENGINE_TRANSACTION_ID;
```

## Monitoring Adaptive Hash Index Contention

The adaptive hash index (AHI) can itself become a contention point under high concurrency. Check its effectiveness:

```sql
SHOW ENGINE INNODB STATUS\G
```

Look for the `INSERT BUFFER AND ADAPTIVE HASH INDEX` section. If `RW-latches` show frequent contention, consider disabling AHI:

```sql
SET GLOBAL innodb_adaptive_hash_index = OFF;
```

## Buffer Pool Contention Metrics

Check buffer pool efficiency to detect contention-induced read overhead:

```sql
SELECT
  POOL_ID,
  HIT_RATE,
  NUMBER_PAGES_GET AS read_requests,
  NUMBER_PAGES_READ AS disk_reads,
  (NUMBER_PAGES_GET - NUMBER_PAGES_READ) / NUMBER_PAGES_GET * 100 AS hit_pct
FROM information_schema.INNODB_BUFFER_POOL_STATS;
```

A hit rate below 99% under normal load suggests the buffer pool is undersized or contended.

## Reducing Buffer Pool Mutex Contention

If the buffer pool mutex is the bottleneck, increase the number of buffer pool instances. Each instance has its own mutex:

```ini
[mysqld]
innodb_buffer_pool_size = 16G
innodb_buffer_pool_instances = 16
```

Each instance manages a separate region of the buffer pool, reducing lock contention proportionally.

## Redo Log Contention

High write throughput can cause threads to wait for redo log space. Monitor redo log waits:

```sql
SELECT EVENT_NAME, COUNT_STAR, SUM_TIMER_WAIT / 1e12 AS wait_sec
FROM performance_schema.events_waits_summary_global_by_event_name
WHERE EVENT_NAME LIKE '%log%buffer%'
ORDER BY SUM_TIMER_WAIT DESC;
```

If log buffer waits are high, increase `innodb_log_buffer_size` (for uncommitted transaction buffering) and `innodb_redo_log_capacity` in MySQL 8.0.30+.

## Summary

InnoDB contention points manifest as mutex waits in the buffer pool, adaptive hash index, row locks, and redo log. Use `SHOW ENGINE INNODB STATUS` for a quick overview, and Performance Schema `events_waits_summary_global_by_event_name` for detailed metrics. Remediate buffer pool contention by increasing `innodb_buffer_pool_instances`, and row lock contention by optimizing transaction design and index coverage.
