# How to Split a Partition in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Partition, ALTER TABLE, InnoDB, Performance

Description: Learn how to split a large MySQL partition into multiple smaller partitions using ALTER TABLE REORGANIZE PARTITION for better performance and manageability.

---

## Why Split a Partition?

As data grows, a single partition may accumulate millions of rows, making queries that target that partition slower than necessary. Splitting a large partition into multiple smaller ones improves query performance, makes partition management operations faster, and allows more granular data archiving.

Splitting is done with `ALTER TABLE ... REORGANIZE PARTITION`.

## Split a RANGE Partition

Consider a table with annual partitions, where the current year's partition has grown very large:

```sql
CREATE TABLE events (
    event_id BIGINT NOT NULL,
    event_ts DATETIME NOT NULL,
    event_type VARCHAR(50),
    payload JSON,
    PRIMARY KEY (event_id, event_ts)
)
PARTITION BY RANGE (TO_DAYS(event_ts))
(
    PARTITION p2024 VALUES LESS THAN (TO_DAYS('2025-01-01')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

Split `p_future` into quarterly partitions for 2025:

```sql
ALTER TABLE events
REORGANIZE PARTITION p_future INTO (
    PARTITION p2025_q1 VALUES LESS THAN (TO_DAYS('2025-04-01')),
    PARTITION p2025_q2 VALUES LESS THAN (TO_DAYS('2025-07-01')),
    PARTITION p2025_q3 VALUES LESS THAN (TO_DAYS('2025-10-01')),
    PARTITION p2025_q4 VALUES LESS THAN (TO_DAYS('2026-01-01')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

## Split Using YEAR-Based Partitioning

```sql
CREATE TABLE logs (
    log_id BIGINT NOT NULL,
    log_date DATE NOT NULL,
    message TEXT,
    PRIMARY KEY (log_id, log_date)
)
PARTITION BY RANGE (YEAR(log_date))
(
    PARTITION p_old VALUES LESS THAN (2025),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Split p_old into individual year partitions
ALTER TABLE logs
REORGANIZE PARTITION p_old INTO (
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025)
);
```

## Split a LIST Partition

```sql
CREATE TABLE customers (
    customer_id INT NOT NULL,
    country_code INT NOT NULL,
    name VARCHAR(255),
    PRIMARY KEY (customer_id, country_code)
)
PARTITION BY LIST (country_code)
(
    PARTITION p_emea VALUES IN (1, 2, 3, 4, 5, 6, 7, 8)
);

-- Split EMEA into separate sub-regions
ALTER TABLE customers
REORGANIZE PARTITION p_emea INTO (
    PARTITION p_western_eu VALUES IN (1, 2, 3, 4),
    PARTITION p_eastern_eu VALUES IN (5, 6),
    PARTITION p_middle_east VALUES IN (7, 8)
);
```

## Verify the Split

```sql
SELECT
    PARTITION_NAME,
    PARTITION_DESCRIPTION,
    TABLE_ROWS,
    DATA_LENGTH / 1024 / 1024 AS data_mb
FROM INFORMATION_SCHEMA.PARTITIONS
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME = 'events'
ORDER BY PARTITION_ORDINAL_POSITION;
```

## Key Rules for Splitting

- The new partitions must collectively cover exactly the same data as the original partition
- For RANGE, boundaries must be contiguous
- For LIST, all values from the original partition must appear in exactly one of the new partitions
- No rows can be excluded or double-counted

## Performance Impact

Splitting a large partition requires reading all its rows and writing them into the new partitions. On a partition with hundreds of millions of rows, this can take minutes to hours. Plan maintenance windows accordingly, or use online schema change tools to minimize application impact.

```bash
# Using Percona's pt-online-schema-change to repartition large tables
# Note: pt-osc does not support REORGANIZE PARTITION directly.
# Instead, use PARTITION BY to define the full new partition layout:
pt-online-schema-change \
  --alter "PARTITION BY RANGE (YEAR(log_date)) (
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p_future VALUES LESS THAN MAXVALUE
  )" \
  D=mydb,t=logs --execute
```

## Summary

Splitting partitions in MySQL via `REORGANIZE PARTITION` lets you break a large, monolithic partition into smaller, more manageable units. This improves query performance through better partition pruning, enables finer-grained archiving, and reduces the time required for per-partition maintenance operations like `OPTIMIZE PARTITION`.
