# How to Track MySQL Table Lock Contention

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Lock, Monitoring

Description: Monitor MySQL table lock contention using global status variables, Performance Schema wait events, and identify tables causing lock waits.

---

Table-level lock contention occurs when one query holds a table lock and others must wait. It is more common with MyISAM tables, DDL operations, and `LOCK TABLES` usage. Monitoring it early prevents cascading query queues.

## Global Status Counters

```sql
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN (
  'Table_locks_waited',
  'Table_locks_immediate'
);
```

- `Table_locks_immediate`: lock requests granted without waiting
- `Table_locks_waited`: lock requests that had to wait

**Contention ratio:**

```sql
SELECT
  ROUND(
    waited / (waited + immediate) * 100, 2
  ) AS lock_wait_ratio_pct
FROM (
  SELECT
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Table_locks_waited')    AS waited,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Table_locks_immediate') AS immediate
) t;
```

A ratio above 1% indicates noticeable contention. Above 5% is a problem.

## Finding Lock Waits with Performance Schema

```sql
-- Current threads waiting for table locks
SELECT
  waiting_pid AS waiting_thread,
  waiting_query,
  blocking_pid AS blocking_thread,
  blocking_query
FROM sys.schema_table_lock_waits;
```

## Historical Lock Wait Events

```sql
-- Top tables by total lock wait time (picoseconds)
SELECT
  object_schema,
  object_name,
  COUNT_READ + COUNT_WRITE            AS total_accesses,
  SUM_TIMER_WAIT / 1e12              AS total_wait_sec
FROM performance_schema.table_lock_waits_summary_by_table
WHERE SUM_TIMER_WAIT > 0
ORDER BY total_wait_sec DESC
LIMIT 10;
```

## Monitoring Lock Wait Rate with mysqladmin

```bash
watch -n 5 "mysqladmin -u root -p extended-status 2>/dev/null | grep -i Table_locks"
```

## Shell Script for Delta Tracking

```bash
#!/bin/bash
PREV_WAITED=$(mysql -u root -p"$MYSQL_PASSWORD" -se \
  "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Table_locks_waited'")

sleep 60

CURR_WAITED=$(mysql -u root -p"$MYSQL_PASSWORD" -se \
  "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Table_locks_waited'")

DELTA=$((CURR_WAITED - PREV_WAITED))
echo "Table lock waits in last 60s: $DELTA"
```

## Reducing Table Lock Contention

The most effective fixes:

```sql
-- Convert MyISAM tables to InnoDB (row-level locking)
ALTER TABLE legacy_table ENGINE = InnoDB;

-- Avoid explicit LOCK TABLES in application code
-- Use SELECT ... FOR UPDATE or transactions instead

-- For DDL, use online DDL (MySQL 8)
ALTER TABLE orders ADD COLUMN notes TEXT, ALGORITHM=INPLACE, LOCK=NONE;
```

## Summary

Track table lock contention through `Table_locks_waited` and `Table_locks_immediate` global status variables. Use Performance Schema `table_lock_waits_summary_by_table` to identify which tables are the source of contention. The primary fix is migrating MyISAM tables to InnoDB to get row-level locking instead of table-level locking.
