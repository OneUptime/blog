# How to Partition by Year and Month in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Partition, Range, Date, Performance

Description: Learn how to partition MySQL tables by both year and month using RANGE COLUMNS or integer expressions for finer-grained time-series data management.

---

## Why Partition by Year and Month?

Annual partitions work well for low-volume tables, but high-throughput tables can accumulate hundreds of millions of rows per year. Monthly partitions give you smaller, more manageable units that improve query performance for month-scoped queries, allow more granular archiving, and reduce the time for per-partition maintenance operations.

## Method 1: Using YEAR * 100 + MONTH Expression

The most common approach is creating an integer key from the year and month:

```sql
CREATE TABLE events (
    event_id BIGINT NOT NULL,
    event_date DATE NOT NULL,
    event_type VARCHAR(50),
    payload JSON,
    PRIMARY KEY (event_id, event_date)
)
PARTITION BY RANGE (YEAR(event_date) * 100 + MONTH(event_date))
(
    PARTITION p202501 VALUES LESS THAN (202502),
    PARTITION p202502 VALUES LESS THAN (202503),
    PARTITION p202503 VALUES LESS THAN (202504),
    PARTITION p202504 VALUES LESS THAN (202505),
    PARTITION p202505 VALUES LESS THAN (202506),
    PARTITION p202506 VALUES LESS THAN (202507),
    PARTITION p202507 VALUES LESS THAN (202508),
    PARTITION p202508 VALUES LESS THAN (202509),
    PARTITION p202509 VALUES LESS THAN (202510),
    PARTITION p202510 VALUES LESS THAN (202511),
    PARTITION p202511 VALUES LESS THAN (202512),
    PARTITION p202512 VALUES LESS THAN (202601),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

## Method 2: Using RANGE COLUMNS with DATE

RANGE COLUMNS allows you to use the DATE type directly without converting to an integer:

```sql
CREATE TABLE orders (
    order_id BIGINT NOT NULL,
    order_date DATE NOT NULL,
    amount DECIMAL(10, 2),
    PRIMARY KEY (order_id, order_date)
)
PARTITION BY RANGE COLUMNS (order_date)
(
    PARTITION p202501 VALUES LESS THAN ('2025-02-01'),
    PARTITION p202502 VALUES LESS THAN ('2025-03-01'),
    PARTITION p202503 VALUES LESS THAN ('2025-04-01'),
    PARTITION p202504 VALUES LESS THAN ('2025-05-01'),
    PARTITION p202505 VALUES LESS THAN ('2025-06-01'),
    PARTITION p202506 VALUES LESS THAN ('2025-07-01'),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

This is often cleaner and easier to read than the integer expression approach.

## Method 3: Using TO_DAYS for DATETIME Columns

For `DATETIME` columns, `TO_DAYS()` is a good alternative:

```sql
CREATE TABLE metrics (
    metric_id BIGINT NOT NULL,
    recorded_at DATETIME NOT NULL,
    metric_name VARCHAR(100),
    metric_value DOUBLE,
    PRIMARY KEY (metric_id, recorded_at)
)
PARTITION BY RANGE (TO_DAYS(recorded_at))
(
    PARTITION p202501 VALUES LESS THAN (TO_DAYS('2025-02-01')),
    PARTITION p202502 VALUES LESS THAN (TO_DAYS('2025-03-01')),
    PARTITION p202503 VALUES LESS THAN (TO_DAYS('2025-04-01')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

## Adding a New Monthly Partition

Before each month begins, add the next partition:

```sql
ALTER TABLE events
REORGANIZE PARTITION p_future INTO (
    PARTITION p202601 VALUES LESS THAN (202602),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

## Verify Partition Pruning for Monthly Queries

```sql
EXPLAIN SELECT *
FROM events
WHERE event_date >= '2025-03-01'
  AND event_date < '2025-04-01'\G
```

The output should show only `p202503` in the `partitions` column. Use range conditions on the column itself rather than `YEAR()` and `MONTH()` functions in the WHERE clause — MySQL's optimizer cannot map function-based conditions back to the composite partition expression, so `WHERE YEAR(event_date) = 2025 AND MONTH(event_date) = 3` would scan all partitions instead of pruning.

## Archive Old Months

```sql
-- Drop all 2023 monthly partitions
ALTER TABLE events
DROP PARTITION p202301, p202302, p202303,
               p202304, p202305, p202306,
               p202307, p202308, p202309,
               p202310, p202311, p202312;
```

## Automating Monthly Partition Creation

```sql
DELIMITER //
CREATE EVENT create_next_month_partition
ON SCHEDULE EVERY 1 MONTH
STARTS '2025-12-25 00:00:00'
DO BEGIN
    SET @ym = (YEAR(CURDATE() + INTERVAL 1 MONTH) * 100
               + MONTH(CURDATE() + INTERVAL 1 MONTH));
    SET @ym_next = @ym + 1;
    IF MONTH(CURDATE() + INTERVAL 1 MONTH) = 12 THEN
        SET @ym_next = (YEAR(CURDATE() + INTERVAL 1 MONTH) + 1) * 100 + 1;
    END IF;
    SET @sql = CONCAT(
        'ALTER TABLE events REORGANIZE PARTITION p_future INTO (',
        'PARTITION p', @ym, ' VALUES LESS THAN (', @ym_next, '), ',
        'PARTITION p_future VALUES LESS THAN MAXVALUE)'
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END//
DELIMITER ;
```

## Summary

Monthly partitioning in MySQL can be achieved using `YEAR * 100 + MONTH` integer expressions, `RANGE COLUMNS` with DATE values, or `TO_DAYS()` for DATETIME columns. Choose the approach that best matches your column types and query patterns. Automate partition creation with MySQL Events to ensure new months are always ready before data arrives.
