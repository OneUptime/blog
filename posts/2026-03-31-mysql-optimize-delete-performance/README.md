# How to Optimize DELETE Performance in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Performance, InnoDB, Optimization

Description: Learn how to optimize MySQL DELETE statements with proper indexing, batch deletion, partition management, and techniques to reduce lock contention during large deletes.

---

## Why DELETE Can Be Slow

DELETE in MySQL is expensive because it must find the rows (requires an index), acquire row locks, remove the rows, update all secondary indexes, and write undo log entries (for rollback capability). Large deletes on busy tables can block reads and other writes for extended periods.

## Always Check EXPLAIN Before Large Deletes

```sql
EXPLAIN DELETE FROM events WHERE event_type = 'debug';
```

```text
type: ALL, key: NULL, rows: 5000000
```

A full table scan during DELETE means MySQL locks every row it examines. On an InnoDB table with 5 million rows, this will hold lock for several minutes.

```sql
CREATE INDEX idx_event_type ON events(event_type);

EXPLAIN DELETE FROM events WHERE event_type = 'debug';
-- type: ref, key: idx_event_type, rows: 12000
```

## Batch Large Deletes

Never delete millions of rows in a single statement. Break it into small batches:

```sql
-- Loop until all matching rows are deleted
DELETE FROM logs WHERE created_at < '2024-01-01' LIMIT 1000;
-- Repeat until 0 rows affected
```

Shell script approach:

```bash
while true; do
  ROWS=$(mysql -u root -p mydb -e "DELETE FROM logs WHERE created_at < '2024-01-01' LIMIT 1000; SELECT ROW_COUNT();" | tail -1)
  if [ "$ROWS" -eq "0" ]; then
    break
  fi
  sleep 0.05
done
```

Python approach:

```python
while True:
    cursor.execute(
        "DELETE FROM logs WHERE created_at < '2024-01-01' LIMIT 1000"
    )
    conn.commit()
    if cursor.rowcount == 0:
        break
```

## Use TRUNCATE for Full Table Deletion

If you need to delete all rows from a table, `TRUNCATE` is dramatically faster than `DELETE`:

```sql
-- Slow: logs every row deletion
DELETE FROM temp_import_staging;

-- Fast: drops and recreates the table structure
TRUNCATE TABLE temp_import_staging;
```

`TRUNCATE` cannot be used with WHERE and cannot be rolled back within a transaction in most configurations.

## Use Partitioning for Time-Based Data Deletion

If you regularly delete old data (like logs, events, or audit records), partition the table by date and drop entire partitions:

```sql
-- Create partitioned table
CREATE TABLE logs (
  id BIGINT AUTO_INCREMENT,
  message TEXT,
  created_at DATE,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE COLUMNS(created_at) (
  PARTITION p2024_q1 VALUES LESS THAN ('2024-04-01'),
  PARTITION p2024_q2 VALUES LESS THAN ('2024-07-01'),
  PARTITION p2024_q3 VALUES LESS THAN ('2024-10-01'),
  PARTITION p2024_q4 VALUES LESS THAN ('2025-01-01'),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Instant deletion of an entire partition (no row-by-row scan)
ALTER TABLE logs DROP PARTITION p2024_q1;
```

Dropping a partition is nearly instantaneous compared to deleting millions of rows.

## Archive Instead of Delete

For data with regulatory or audit requirements, archive to a separate table before deleting:

```sql
-- Move old rows to archive table
INSERT INTO logs_archive SELECT * FROM logs WHERE created_at < '2024-01-01';
DELETE FROM logs WHERE created_at < '2024-01-01' LIMIT 1000;
-- Loop until complete
```

## Monitor Lock Contention During Deletes

```sql
-- Check for transactions waiting on locks (MySQL 8.0+)
SELECT r.trx_id AS waiting_id,
       r.trx_query AS waiting_query,
       b.trx_id AS blocking_id,
       b.trx_query AS blocking_query
FROM performance_schema.data_lock_waits w
JOIN information_schema.innodb_trx b
  ON b.trx_id = w.BLOCKING_ENGINE_TRANSACTION_ID
JOIN information_schema.innodb_trx r
  ON r.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID;
```

## Summary

DELETE performance optimization requires indexing the WHERE clause, batching large deletes into small chunks to minimize lock hold time, and using TRUNCATE or partition drops for whole-table or whole-partition deletions. For time-series data that grows continuously, table partitioning is the most scalable long-term solution. Avoid deleting millions of rows in a single transaction on busy OLTP tables.
