# How to Use ALTER TABLE ... ADD PARTITION in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Partition, DDL, Table, Performance

Description: Learn how to use ALTER TABLE ... ADD PARTITION in MySQL to add new partitions to an existing range or list partitioned table.

---

## Overview

The `ALTER TABLE ... ADD PARTITION` statement adds one or more new partitions to an existing partitioned table in MySQL. It is commonly used with `RANGE` and `LIST` partitioning schemes to accommodate new data ranges or new list values as your data grows over time.

## Prerequisites

`ADD PARTITION` only works on tables that already have a partition scheme defined. The type of partition you can add depends on the partitioning method:

- `RANGE` partitioning: add a partition for a higher range
- `LIST` partitioning: add a partition with new list values
- `HASH` and `KEY` partitioning: use `ADD PARTITION PARTITIONS n` to increase or `COALESCE PARTITION n` to decrease the partition count

## Adding a Partition to a RANGE Partitioned Table

Consider a sales table partitioned by year:

```sql
CREATE TABLE sales (
  id          INT  NOT NULL AUTO_INCREMENT,
  amount      DECIMAL(10,2) NOT NULL,
  sale_year   INT  NOT NULL,
  PRIMARY KEY (id, sale_year)
)
PARTITION BY RANGE (sale_year) (
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025)
);
```

Add a partition for 2025 data:

```sql
ALTER TABLE sales
  ADD PARTITION (
    PARTITION p2025 VALUES LESS THAN (2026)
  );
```

## Adding Multiple Partitions at Once

You can add several partitions in a single statement:

```sql
ALTER TABLE sales
  ADD PARTITION (
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION p2027 VALUES LESS THAN (2028),
    PARTITION p_future VALUES LESS THAN MAXVALUE
  );
```

## Adding a Partition to a LIST Partitioned Table

For a table partitioned by region:

```sql
CREATE TABLE orders (
  id      INT NOT NULL AUTO_INCREMENT,
  region  VARCHAR(20) NOT NULL,
  amount  DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id, region)
)
PARTITION BY LIST COLUMNS (region) (
  PARTITION p_us   VALUES IN ('US-East', 'US-West'),
  PARTITION p_eu   VALUES IN ('EU-West', 'EU-Central')
);
```

Add a new partition for Asia:

```sql
ALTER TABLE orders
  ADD PARTITION (
    PARTITION p_apac VALUES IN ('APAC-East', 'APAC-South')
  );
```

## Increasing HASH/KEY Partition Count

For HASH or KEY partitioned tables, `ADD PARTITION` increases the partition count:

```sql
ALTER TABLE user_sessions
  ADD PARTITION PARTITIONS 4;
```

This redistributes data across more partitions, which can improve parallel query performance.

## Verifying Partitions

Check the current partition layout:

```sql
SELECT PARTITION_NAME, PARTITION_EXPRESSION, TABLE_ROWS
FROM INFORMATION_SCHEMA.PARTITIONS
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME = 'sales';
```

## Important Considerations

When using `RANGE` partitioning, the new partition must have a higher boundary than the last existing partition. You cannot add a partition that overlaps an existing range. If a `MAXVALUE` partition already exists, you must reorganize partitions instead of simply adding:

```sql
-- Cannot add if MAXVALUE partition exists; use REORGANIZE instead
ALTER TABLE sales
  REORGANIZE PARTITION p_future INTO (
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
  );
```

## Summary

`ALTER TABLE ... ADD PARTITION` extends an existing partitioned table by adding new partitions for `RANGE`, `LIST`, or `HASH/KEY` schemes. Use it regularly with date-range partitioned tables to accommodate new data periods, and always verify that new range boundaries do not conflict with existing partitions. For tables with a `MAXVALUE` catch-all partition, use `REORGANIZE PARTITION` instead.
