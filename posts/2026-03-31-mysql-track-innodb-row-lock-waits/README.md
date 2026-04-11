# How to Track MySQL InnoDB Row Lock Waits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Locking, Monitoring, Performance

Description: Learn how to track InnoDB row lock waits using status variables and Performance Schema to detect contention before it causes timeouts.

---

## Why Row Lock Waits Are a Problem

InnoDB uses row-level locking for concurrent writes. When two transactions try to modify the same row, one must wait for the other to commit or roll back. Brief waits are normal, but sustained lock contention causes query latency spikes, cascading timeouts, and in severe cases, application-level failures.

Tracking how many lock waits are occurring and how long they last lets you detect contention early. Key scenarios that cause excessive row lock waits include:

- Long-running transactions that hold locks while doing unrelated work
- Missing indexes causing full table scans that acquire unnecessary row locks
- Hotspot rows updated by many concurrent transactions (counters, queues)
- Batch jobs running during peak application traffic

## Reading InnoDB Status Variables

MySQL exposes two key status variables for row lock waits:

```sql
SHOW GLOBAL STATUS LIKE 'Innodb_row_lock%';
```

This returns:
- `Innodb_row_lock_current_waits` - number of operations currently waiting for a row lock
- `Innodb_row_lock_time` - total time in milliseconds spent waiting for row locks since startup
- `Innodb_row_lock_time_avg` - average time in milliseconds per lock wait
- `Innodb_row_lock_time_max` - longest single wait ever recorded
- `Innodb_row_lock_waits` - total number of times a row lock wait was required

To compute the rate of lock waits per second, sample `Innodb_row_lock_waits` over an interval:

```bash
#!/bin/bash
MYSQL="mysql -u monitor -p'secret' -N -B"

V1=$($MYSQL -e "SHOW GLOBAL STATUS LIKE 'Innodb_row_lock_waits';" | awk '{print $2}')
sleep 60
V2=$($MYSQL -e "SHOW GLOBAL STATUS LIKE 'Innodb_row_lock_waits';" | awk '{print $2}')

RATE=$(( (V2 - V1) / 60 ))
echo "Row lock waits per second: $RATE"
```

## Identifying Blocked Transactions

When lock waits are elevated, use the `data_lock_waits` table in Performance Schema along with `information_schema.innodb_trx` to see exactly what is blocked:

```sql
SELECT
  r.trx_id AS waiting_trx_id,
  r.trx_mysql_thread_id AS waiting_thread,
  r.trx_query AS waiting_query,
  b.trx_id AS blocking_trx_id,
  b.trx_mysql_thread_id AS blocking_thread,
  b.trx_query AS blocking_query
FROM
  performance_schema.data_lock_waits w
  JOIN information_schema.innodb_trx b ON b.trx_id = w.BLOCKING_ENGINE_TRANSACTION_ID
  JOIN information_schema.innodb_trx r ON r.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID;
```

This query shows you which transaction is blocked and which transaction is holding the lock, along with the SQL text of both.

## Performance Schema Deep Dive

For aggregate lock wait statistics by table, query Performance Schema directly:

```sql
SELECT
  OBJECT_SCHEMA,
  OBJECT_NAME,
  COUNT_READ,
  COUNT_WRITE,
  SUM_TIMER_WAIT / 1e12 AS total_wait_seconds,
  AVG_TIMER_WAIT / 1e12 AS avg_wait_seconds
FROM performance_schema.table_lock_waits_summary_by_table
WHERE SUM_TIMER_WAIT > 0
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

This helps you identify which tables are experiencing the most lock contention.

## Prometheus Alerting

Using `mysqld_exporter` metrics, configure alerts for lock wait rate and current waits:

```yaml
groups:
  - name: mysql_innodb_locks
    rules:
      - alert: MySQLInnoDBRowLockWaitHigh
        expr: rate(mysql_global_status_innodb_row_lock_waits[5m]) > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High InnoDB row lock wait rate on {{ $labels.instance }}"

      - alert: MySQLInnoDBCurrentLockWaitsHigh
        expr: mysql_global_status_innodb_row_lock_current_waits > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Many concurrent row lock waits on {{ $labels.instance }}"
```

## Reducing Row Lock Waits

Once you have identified the contention, common fixes include:

- Keep transactions short: commit as soon as the writes are done
- Add indexes so that SELECT ... FOR UPDATE targets the minimum number of rows
- Use `SELECT ... FOR UPDATE SKIP LOCKED` for queue-style workloads to avoid blocking
- Break hotspot updates into batches with pauses between them

## Summary

Tracking InnoDB row lock waits requires monitoring `Innodb_row_lock_waits` and `Innodb_row_lock_current_waits` status variables over time, combined with Performance Schema queries to pinpoint the exact tables and transactions involved. Alerting on a rising lock wait rate or current waits above a threshold gives you time to investigate and fix contention before queries start timing out.
