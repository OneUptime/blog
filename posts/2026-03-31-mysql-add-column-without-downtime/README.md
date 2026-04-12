# How to Add a Column Without Downtime in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ALTER TABLE, Zero Downtime, Online DDL

Description: Learn the safe strategies for adding a column to a MySQL table without downtime, from online DDL to pt-osc and backward-compatible deploys.

---

Adding a column to a large MySQL table without downtime requires choosing the right strategy based on table size, MySQL version, and whether the column is nullable.

## Strategy 1 - Online DDL (Small to Medium Tables)

MySQL InnoDB supports adding a nullable column online with no table lock:

```sql
ALTER TABLE orders
    ADD COLUMN notes TEXT NULL,
    ALGORITHM=INPLACE, LOCK=NONE;
```

This works for tables with millions of rows but can still take minutes. Check support first:

```sql
-- If this errors, the operation requires a table copy
ALTER TABLE orders
    ADD COLUMN notes TEXT NULL,
    ALGORITHM=INPLACE, LOCK=NONE;
-- ERROR 1846 means online DDL not supported for this change
```

## Strategy 2 - Instant DDL for NOT NULL With Default

Adding a NOT NULL column with a constant default supports the INSTANT algorithm in MySQL 8.0.12+:

```sql
ALTER TABLE orders
    ADD COLUMN priority TINYINT NOT NULL DEFAULT 0,
    ALGORITHM=INSTANT;
```

MySQL 8.0.12+ stores the default in the data dictionary without rewriting rows, making this instant even for billion-row tables.

## Strategy 3 - pt-online-schema-change for Large Tables

For tables where online DDL still causes unacceptable I/O or replication lag:

```bash
pt-online-schema-change \
    --host=127.0.0.1 \
    --user=appuser \
    --password=secret \
    --alter="ADD COLUMN processed_at DATETIME NULL" \
    --chunk-size=2000 \
    --sleep=0.05 \
    --max-lag=2 \
    --execute \
    D=myapp,t=events
```

## Strategy 4 - gh-ost for Triggerless Migration

```bash
gh-ost \
    --host=127.0.0.1 \
    --user=ghostuser \
    --password=secret \
    --database=myapp \
    --table=events \
    --alter="ADD COLUMN processed_at DATETIME NULL" \
    --max-lag-millis=2000 \
    --execute
```

## Backward-Compatible Application Deploy

When the new column is not immediately used by the application, this order ensures zero downtime:

```text
1. Add column to database (nullable, no default or with default)
2. Deploy application version that writes and reads the column
3. Backfill existing rows in batches if needed
```

## Backfilling in Batches

Never run a single `UPDATE` on millions of rows. Batch it:

```bash
# Update 1000 rows at a time with a delay between batches
mysql -e "UPDATE events SET processed_at = created_at WHERE processed_at IS NULL LIMIT 1000;"
# Repeat until affected rows = 0
```

Or use a loop in a stored procedure:

```sql
DELIMITER $$
CREATE PROCEDURE backfill_processed_at()
BEGIN
    DECLARE done TINYINT DEFAULT 0;
    REPEAT
        UPDATE events SET processed_at = created_at
        WHERE processed_at IS NULL LIMIT 1000;
        SET done = ROW_COUNT() = 0;
        DO SLEEP(0.05);
    UNTIL done END REPEAT;
END$$
DELIMITER ;

CALL backfill_processed_at();
```

## Summary

Adding a nullable column with `ALGORITHM=INPLACE, LOCK=NONE` is usually the first choice. For tables where this causes replication lag, switch to pt-osc or gh-ost. Deploy the schema change before the application code that uses the column to keep rollbacks simple. Always backfill large tables in batches with sleeps between iterations.
