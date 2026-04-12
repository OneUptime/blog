# How to Drop a Partition in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Partition, ALTER TABLE, Data Archiving, InnoDB

Description: Learn how to drop partitions from MySQL tables using ALTER TABLE DROP PARTITION, and understand when to use DROP PARTITION versus TRUNCATE PARTITION.

---

## What Does DROP PARTITION Do?

`ALTER TABLE ... DROP PARTITION` removes one or more partitions from a partitioned table along with all the data they contain. This is an extremely fast operation for deleting large volumes of historical data because MySQL drops the partition's underlying data file rather than running row-by-row deletes.

`DROP PARTITION` only works with RANGE and LIST partitions. For HASH and KEY partitions, use `COALESCE PARTITION` instead.

## Basic Syntax

```sql
ALTER TABLE orders
DROP PARTITION p2020;
```

## Drop Multiple Partitions at Once

```sql
ALTER TABLE orders
DROP PARTITION p2018, p2019, p2020;
```

Dropping multiple partitions in a single statement is faster than multiple separate statements because MySQL only rebuilds table metadata once.

## Example: Archiving Old Time-Series Data

Consider a RANGE-partitioned table by year:

```sql
CREATE TABLE page_views (
    view_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    page_url VARCHAR(500),
    view_date DATE NOT NULL,
    PRIMARY KEY (view_id, view_date)
)
PARTITION BY RANGE (YEAR(view_date))
(
    PARTITION p2021 VALUES LESS THAN (2022),
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

To remove all data from 2021:

```sql
ALTER TABLE page_views
DROP PARTITION p2021;
```

This deletes millions of rows in milliseconds - no transaction log overhead, no row scanning.

## Check Which Partitions Exist Before Dropping

```sql
SELECT
    PARTITION_NAME,
    PARTITION_DESCRIPTION,
    TABLE_ROWS,
    DATA_LENGTH
FROM INFORMATION_SCHEMA.PARTITIONS
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME = 'page_views'
ORDER BY PARTITION_ORDINAL_POSITION;
```

## DROP PARTITION vs DELETE

```sql
-- Fast: drops the entire partition file (RANGE/LIST only)
ALTER TABLE page_views DROP PARTITION p2021;

-- Slow: scans and deletes row by row, generates undo log
DELETE FROM page_views WHERE YEAR(view_date) = 2021;
```

For large historical datasets, `DROP PARTITION` can be 100x faster than a `DELETE` statement.

## DROP PARTITION vs TRUNCATE PARTITION

- `DROP PARTITION` - removes the partition definition AND all its data. The partition no longer exists.
- `TRUNCATE PARTITION` - removes all data from the partition but keeps the partition structure intact.

Use `TRUNCATE PARTITION` if you plan to continue inserting data into that partition range. Use `DROP PARTITION` if you are permanently retiring that range.

## Automating Historical Data Purge

```sql
DELIMITER //
CREATE EVENT purge_old_partitions
ON SCHEDULE EVERY 1 YEAR
STARTS '2025-01-01 00:00:00'
DO BEGIN
    -- Dynamically drop the partition older than 3 years
    SET @part_name = CONCAT('p', YEAR(CURDATE()) - 3);
    SET @sql = CONCAT('ALTER TABLE page_views DROP PARTITION ', @part_name);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END//
DELIMITER ;
```

## Caution: Data Is Permanently Deleted

There is no undo for `DROP PARTITION`. Before running it in production:
1. Confirm the partition name and row count
2. Back up the partition data if needed using `SELECT INTO OUTFILE` or `mysqldump`
3. Test in a non-production environment first

## Summary

`DROP PARTITION` is one of MySQL's most powerful maintenance tools for time-series tables. It removes years of historical data in milliseconds by operating at the file level rather than the row level. Combined with a retention policy and scheduled events, it makes continuous data archiving efficient and low-impact.
