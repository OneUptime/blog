# How to Implement Batch Processing in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Batch Processing, Performance, Insert, Transaction

Description: Learn how to implement efficient batch processing in MySQL using bulk inserts, chunked updates, and transaction batching to reduce overhead and improve throughput.

---

## Why Batch Processing Matters

Processing rows one at a time in MySQL is expensive because each statement has network round-trip overhead and, if auto-commit is on, a full transaction commit per row. Batching groups multiple operations into a single statement or transaction, dramatically reducing overhead.

## Bulk Insert with Multi-Row VALUES

Instead of looping single `INSERT` statements, construct one statement with multiple value tuples:

```sql
INSERT INTO events (user_id, event_type, created_at)
VALUES
  (1, 'login',  NOW()),
  (2, 'signup', NOW()),
  (3, 'logout', NOW()),
  (4, 'login',  NOW());
```

In application code, chunk your data and build parameterized bulk inserts:

```javascript
async function bulkInsertEvents(events, chunkSize = 500) {
  for (let i = 0; i < events.length; i += chunkSize) {
    const chunk = events.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '(?, ?, NOW())').join(', ');
    const values = chunk.flatMap(e => [e.userId, e.eventType]);
    await db.execute(
      `INSERT INTO events (user_id, event_type, created_at) VALUES ${placeholders}`,
      values
    );
  }
}
```

Keep chunk sizes between 100 and 1000 rows. Larger chunks increase memory usage and can exceed `max_allowed_packet`.

## Chunked Updates and Deletes

Large `UPDATE` or `DELETE` statements lock many rows and can cause replication lag. Process in chunks using a `LIMIT` loop:

```sql
-- Delete old events in chunks of 1000
DELETE FROM events
WHERE created_at < NOW() - INTERVAL 90 DAY
LIMIT 1000;
-- Repeat until 0 rows affected
```

In a stored procedure:

```sql
DELIMITER $$
CREATE PROCEDURE purge_old_events()
BEGIN
  DECLARE affected INT DEFAULT 1;
  WHILE affected > 0 DO
    DELETE FROM events
    WHERE created_at < NOW() - INTERVAL 90 DAY
    LIMIT 1000;
    SET affected = ROW_COUNT();
  END WHILE;
END$$
DELIMITER ;
```

## Wrapping Batches in Transactions

Auto-commit flushes the redo log to disk for every statement. Wrap a batch in a single transaction to amortize that cost:

```sql
START TRANSACTION;
INSERT INTO audit_log (user_id, action) VALUES (1, 'view');
INSERT INTO audit_log (user_id, action) VALUES (2, 'edit');
-- ... up to a few thousand rows
COMMIT;
```

Avoid very large transactions (millions of rows) as they hold locks and consume undo log space.

## Using LOAD DATA INFILE for Bulk Loads

For loading large CSV files, `LOAD DATA INFILE` is far faster than multi-row `INSERT`:

```sql
LOAD DATA INFILE '/tmp/events.csv'
INTO TABLE events
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(user_id, event_type, created_at);
```

For MyISAM tables, disable non-unique indexes before loading and rebuild them afterward. Note that `DISABLE KEYS` has no effect on InnoDB tables:

```sql
-- MyISAM only
ALTER TABLE events DISABLE KEYS;
-- LOAD DATA ...
ALTER TABLE events ENABLE KEYS;
```

For InnoDB tables, you can temporarily disable uniqueness and foreign key checks to speed up the load:

```sql
SET unique_checks = 0;
SET foreign_key_checks = 0;
-- LOAD DATA ...
SET unique_checks = 1;
SET foreign_key_checks = 1;
```

## Monitoring Batch Job Progress

Track progress by recording the last processed ID and resuming from there:

```sql
CREATE TABLE batch_checkpoints (
  job_name    VARCHAR(100) PRIMARY KEY,
  last_id     BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

```sql
SELECT last_id FROM batch_checkpoints WHERE job_name = 'archive_orders';
-- Process chunk...
UPDATE batch_checkpoints SET last_id = ? WHERE job_name = 'archive_orders';
```

## Summary

Efficient batch processing in MySQL relies on bulk multi-row inserts, chunked updates and deletes, and transactional batching to minimize per-row overhead. Use `LOAD DATA INFILE` for initial bulk loads and checkpoint tables to resume failed jobs. Keep chunk sizes practical (100-1000 rows) to balance memory, lock duration, and throughput.
