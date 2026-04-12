# How to Delete Old Data Efficiently in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Delete, Performance, Batch Operation, Index

Description: Delete large volumes of old MySQL data efficiently using batched deletes, range-based deletion, and pt-archiver to avoid table locks and replication lag.

---

## Why Naive Deletes Are Dangerous

Running a single `DELETE FROM orders WHERE created_at < '2025-01-01'` on a table with millions of rows causes several problems:
- Long-running transaction that holds locks and blocks other queries
- Large binary log entry that causes replication lag on replicas
- Potential InnoDB undo space exhaustion on very large deletes

The solution is to delete in small batches with brief pauses between them.

## Batch Delete with a Loop

Delete in chunks using a stored procedure:

```sql
DELIMITER //

CREATE PROCEDURE delete_old_orders(
  IN cutoff_date DATETIME,
  IN batch_size  INT,
  IN sleep_ms    FLOAT
)
BEGIN
  DECLARE rows_affected INT DEFAULT 1;
  DECLARE total_deleted INT DEFAULT 0;

  WHILE rows_affected > 0 DO
    DELETE FROM orders
    WHERE created_at < cutoff_date
    LIMIT batch_size;

    SET rows_affected = ROW_COUNT();
    SET total_deleted = total_deleted + rows_affected;

    IF rows_affected > 0 THEN
      DO SLEEP(sleep_ms / 1000);
    END IF;
  END WHILE;

  SELECT total_deleted AS rows_deleted;
END //

DELIMITER ;

-- Delete orders older than 2 years in batches of 1000 with 50ms pauses
CALL delete_old_orders(DATE_SUB(NOW(), INTERVAL 2 YEAR), 1000, 50);
```

## Range-Based Batch Delete

For indexed columns, use a range-based approach that is faster than `LIMIT` on large tables:

```sql
-- Find the max ID to delete
SELECT MAX(id) INTO @max_id FROM orders WHERE created_at < '2025-01-01';

-- Delete in ID ranges
SET @start_id = 0;
SET @batch = 1000;

-- In a loop (call from application code or event)
DELETE FROM orders
WHERE id BETWEEN @start_id AND @start_id + @batch - 1
  AND created_at < '2025-01-01';

SET @start_id = @start_id + @batch;
```

## Using pt-archiver for Safe Large-Scale Deletes

`pt-archiver` from Percona Toolkit is the safest tool for large-scale MySQL deletions:

```bash
# Install pt-archiver
apt-get install percona-toolkit

# Delete rows older than 1 year in batches of 1000, with 100ms pauses
pt-archiver \
  --source h=localhost,D=myapp,t=orders \
  --purge \
  --where "created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)" \
  --limit 1000 \
  --sleep 0.1 \
  --no-check-charset \
  --statistics
```

To archive to another server instead of deleting:

```bash
pt-archiver \
  --source h=prod-db,D=myapp,t=orders \
  --dest h=archive-db,D=orders_archive,t=orders \
  --where "created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)" \
  --limit 1000 \
  --sleep 0.1 \
  --bulk-insert \
  --statistics
```

## Index Requirements

Efficient batch deletion requires the right index. For time-based deletes:

```sql
-- Index on the column used in the WHERE clause
EXPLAIN DELETE FROM orders WHERE created_at < '2025-01-01' LIMIT 1000;

-- Create the index if missing
ALTER TABLE orders ADD INDEX idx_created_at (created_at);
```

## Monitoring Delete Progress

Track deletion progress by logging to a table:

```sql
CREATE TABLE delete_log (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_name   VARCHAR(64) NOT NULL,
  rows_deleted INT NOT NULL,
  cutoff_date  DATETIME NOT NULL,
  started_at   DATETIME NOT NULL,
  finished_at  DATETIME
);
```

## Checking Replication Lag During Deletes

Monitor replica lag while deletes run:

```sql
-- On each replica
SHOW REPLICA STATUS\G
-- Check Seconds_Behind_Source - pause deletes if lag exceeds threshold
```

```bash
# Shell check - pause if replica lag exceeds 30 seconds
REPLICA_LAG=$(mysql -h replica-host -u monitor -p -sNe "SHOW REPLICA STATUS\G" | grep "Seconds_Behind_Source" | awk '{print $2}')
if [ "$REPLICA_LAG" -gt 30 ]; then
  echo "Replica lag too high, pausing..."
  sleep 30
fi
```

## Summary

Deleting old MySQL data efficiently requires batched operations with `LIMIT` and pauses between batches to avoid lock contention and replication lag. `pt-archiver` is the recommended production tool as it handles edge cases safely and provides detailed statistics. Always ensure the WHERE clause column is indexed and monitor replica lag during large-scale delete operations.
