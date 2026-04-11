# How to Optimize INSERT Performance in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Performance, InnoDB, Optimization

Description: Learn how to speed up MySQL INSERT operations by batching rows, disabling autocommit, adjusting InnoDB settings, and using LOAD DATA for bulk loads.

---

## Why INSERT Performance Matters

Every INSERT in MySQL involves writing to the InnoDB buffer pool, updating all indexes on the table, and flushing the redo log (depending on `innodb_flush_log_at_trx_commit`). For applications that insert at high rates, these operations can become a bottleneck.

## Batch Multiple Rows in a Single INSERT

The most impactful single change for INSERT performance is using multi-row inserts:

```sql
-- Slow: one INSERT per row (N round trips, N transaction commits)
INSERT INTO logs (event, created_at) VALUES ('login', NOW());
INSERT INTO logs (event, created_at) VALUES ('view', NOW());
INSERT INTO logs (event, created_at) VALUES ('click', NOW());

-- Fast: single INSERT with multiple rows (1 round trip, 1 commit)
INSERT INTO logs (event, created_at) VALUES
  ('login', NOW()),
  ('view', NOW()),
  ('click', NOW());
```

Aim for batches of 500-5,000 rows per INSERT statement. Very large batches increase lock hold time and can cause issues.

## Wrap Batches in Transactions

Without explicit transactions, each INSERT is its own autocommit transaction, incurring a disk flush per row:

```sql
-- Wrap many inserts in a single transaction
START TRANSACTION;
INSERT INTO events (type, data) VALUES ('click', 'btn1');
INSERT INTO events (type, data) VALUES ('scroll', 'top');
-- ... many more inserts
COMMIT;
```

Or disable autocommit for the session:

```sql
SET SESSION autocommit = 0;
-- Run inserts
COMMIT;
SET SESSION autocommit = 1;
```

## Use LOAD DATA INFILE for Large Bulk Loads

`LOAD DATA INFILE` is the fastest way to load large datasets into MySQL - often 10-20x faster than INSERT:

```sql
-- Load from a CSV file on the server
LOAD DATA INFILE '/var/lib/mysql-files/data.csv'
INTO TABLE orders
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(id, customer_id, total, status, created_at);
```

For client-side files use `LOAD DATA LOCAL INFILE`.

## Disable Indexes During Large Inserts

For fresh table loads, temporarily disable non-unique index updates:

```sql
-- Disable non-unique index updates (MyISAM only, has no effect on InnoDB)
ALTER TABLE large_table DISABLE KEYS;

-- Load data
LOAD DATA INFILE '/path/to/data.csv' INTO TABLE large_table ...;

-- Re-enable and rebuild indexes
ALTER TABLE large_table ENABLE KEYS;
```

For InnoDB, a better approach is to drop and recreate secondary indexes after the load.

## Tune InnoDB Settings for Write-Heavy Loads

```sql
-- Reduce flush frequency during bulk load (higher risk)
-- 2 = write to OS cache at each commit, flush to disk once per second
SET GLOBAL innodb_flush_log_at_trx_commit = 2;

-- Increase buffer pool to absorb more writes in memory
-- Set in my.cnf: innodb_buffer_pool_size = 4G

-- Monitor write performance
SHOW GLOBAL STATUS LIKE 'Innodb_rows_inserted';
SHOW GLOBAL STATUS LIKE 'Innodb_log_writes';
```

## Use INSERT IGNORE or INSERT ... ON DUPLICATE KEY UPDATE

For idempotent inserts:

```sql
-- Skip duplicates silently
INSERT IGNORE INTO user_preferences (user_id, `key`, value)
VALUES (42, 'theme', 'dark');

-- Upsert: insert or update on conflict
INSERT INTO user_preferences (user_id, `key`, value)
VALUES (42, 'theme', 'dark') AS new_row
ON DUPLICATE KEY UPDATE value = new_row.value;
```

## Avoid Triggers on High-Volume Tables

Triggers add overhead to every INSERT:

```sql
-- Check for triggers on your table
SHOW TRIGGERS LIKE 'logs';
-- Remove or optimize triggers if they run on high-frequency tables
```

## Summary

INSERT performance in MySQL improves dramatically with a few key changes: batch multiple rows per statement, wrap batches in explicit transactions, and use LOAD DATA INFILE for large initial loads. For sustained high-throughput inserts, tune `innodb_flush_log_at_trx_commit` based on your durability requirements and ensure the buffer pool is large enough to absorb write bursts. Avoid triggers and excessive secondary indexes on write-heavy tables.
