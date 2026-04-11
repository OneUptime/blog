# How to Maintain Partitioned Tables in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Partition, Maintenance, InnoDB, Performance

Description: Learn how to maintain MySQL partitioned tables using ANALYZE, OPTIMIZE, CHECK, and REPAIR partition operations to keep performance optimal over time.

---

## Why Maintain Partitioned Tables?

Partitioned tables benefit from targeted maintenance. Rather than running `OPTIMIZE TABLE` across millions of rows, you can maintain individual partitions one at a time - reducing lock time and I/O impact. MySQL provides partition-specific variants of the standard table maintenance commands.

## ANALYZE PARTITION

Updates the index statistics for one or more partitions. Run this when query plans look suboptimal after large data changes:

```sql
ALTER TABLE orders ANALYZE PARTITION p2024;

-- Analyze multiple partitions
ALTER TABLE orders ANALYZE PARTITION p2023, p2024;

-- Analyze all partitions
ALTER TABLE orders ANALYZE PARTITION ALL;
```

## OPTIMIZE PARTITION

Reclaims fragmented space and reorganizes physical data storage within the partition. Equivalent to running `OPTIMIZE TABLE` on a subset of the data:

```sql
ALTER TABLE orders OPTIMIZE PARTITION p2024;
```

Note: For InnoDB tables, `OPTIMIZE PARTITION` does not work correctly - it rebuilds the **entire table**, not just the specified partition. MySQL internally remaps it to a full table rebuild and analyze. For InnoDB, use `REBUILD PARTITION` followed by `ANALYZE PARTITION` instead to target specific partitions. It can be slow for large partitions - run during low-traffic windows.

Check fragmentation before optimizing:

```sql
SELECT
    PARTITION_NAME,
    ROUND(DATA_LENGTH / 1048576, 2) AS data_mb,
    ROUND(DATA_FREE / 1048576, 2) AS free_mb
FROM INFORMATION_SCHEMA.PARTITIONS
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME = 'orders'
  AND DATA_FREE > 10485760;
```

## CHECK PARTITION

Checks partition data for corruption, similar to `CHECK TABLE`:

```sql
ALTER TABLE orders CHECK PARTITION p2024;

-- Check all partitions
ALTER TABLE orders CHECK PARTITION ALL;
```

MySQL reports `status: OK` if the partition is healthy, or lists errors if problems are found.

## REPAIR PARTITION

Attempts to repair corrupted partition data. Use after `CHECK PARTITION` reports errors:

```sql
ALTER TABLE orders REPAIR PARTITION p2024;
```

Note: For InnoDB tables, `REPAIR PARTITION` is rarely needed because InnoDB's crash recovery handles most corruption scenarios automatically.

## REBUILD PARTITION

Rebuilds one or more partitions without changing their definitions. Useful after manual tablespace operations:

```sql
ALTER TABLE orders REBUILD PARTITION p2024;
```

## Scheduling Partition Maintenance

Automate routine maintenance with MySQL Events:

```sql
DELIMITER //
CREATE EVENT weekly_partition_maintenance
ON SCHEDULE EVERY 1 WEEK
STARTS '2025-01-06 02:00:00'
DO BEGIN
    -- Analyze the current month's partition
    SET @cur = CONCAT('p', YEAR(CURDATE()) * 100 + MONTH(CURDATE()));
    SET @sql = CONCAT('ALTER TABLE orders ANALYZE PARTITION ', @cur);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END//
DELIMITER ;
```

## Check Partition Health Quickly

```sql
SELECT
    PARTITION_NAME,
    TABLE_ROWS,
    ROUND(DATA_FREE / (DATA_LENGTH + 1) * 100, 1) AS frag_pct,
    UPDATE_TIME
FROM INFORMATION_SCHEMA.PARTITIONS
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME = 'orders'
ORDER BY PARTITION_ORDINAL_POSITION;
```

## Maintenance Priority Guidelines

```text
1. ANALYZE frequently updated partitions weekly
2. OPTIMIZE partitions with >20% fragmentation
3. CHECK partitions that experienced unexpected crashes
4. REPAIR only when CHECK reports errors
```

## Summary

MySQL's partition-level maintenance commands - `ANALYZE`, `OPTIMIZE`, `CHECK`, and `REPAIR` - let you perform targeted upkeep on individual partitions rather than entire tables. This reduces maintenance window duration, limits locking impact, and makes large partitioned tables easier to keep healthy over time. Automate the most common operations with MySQL Events.
