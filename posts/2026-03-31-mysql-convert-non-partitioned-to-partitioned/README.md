# How to Convert a Non-Partitioned Table to a Partitioned Table in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Partition, ALTER TABLE, Migration, InnoDB

Description: Learn how to convert an existing non-partitioned MySQL table to a partitioned table using ALTER TABLE, with strategies for large tables and minimal downtime.

---

## Converting an Existing Table to Partitioned

Adding partitioning to an existing non-partitioned table requires modifying the primary key to include the partition column and then applying the partitioning scheme. MySQL rebuilds the entire table during this operation.

## Step 1: Understand the Constraints

Before partitioning, every column used in the partition expression must be part of the primary key (or all unique indexes). This is the most common obstacle.

Check the current table structure:

```sql
SHOW CREATE TABLE orders\G
```

If the primary key is just `(order_id)` and you want to partition by `order_date`, you must add `order_date` to the primary key.

## Step 2: Modify the Primary Key

```sql
-- Original table
CREATE TABLE orders (
    order_id BIGINT NOT NULL AUTO_INCREMENT,
    order_date DATE NOT NULL,
    customer_id INT NOT NULL,
    amount DECIMAL(10, 2),
    PRIMARY KEY (order_id)
);

-- Modify the primary key to include order_date
ALTER TABLE orders
DROP PRIMARY KEY,
ADD PRIMARY KEY (order_id, order_date);
```

## Step 3: Add Partitioning

```sql
ALTER TABLE orders
PARTITION BY RANGE (YEAR(order_date))
(
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

Steps 2 and 3 can be combined into one statement to minimize rebuilds:

```sql
ALTER TABLE orders
DROP PRIMARY KEY,
ADD PRIMARY KEY (order_id, order_date),
PARTITION BY RANGE (YEAR(order_date))
(
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

## Step 4: Verify Partitioning

```sql
SELECT
    PARTITION_NAME,
    PARTITION_DESCRIPTION,
    TABLE_ROWS
FROM INFORMATION_SCHEMA.PARTITIONS
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME = 'orders'
ORDER BY PARTITION_ORDINAL_POSITION;
```

## Strategy for Large Tables: Create New + Copy

For large production tables, in-place `ALTER TABLE` can cause extended downtime. A safer approach:

```sql
-- 1. Create the partitioned version
CREATE TABLE orders_partitioned (
    order_id BIGINT NOT NULL AUTO_INCREMENT,
    order_date DATE NOT NULL,
    customer_id INT NOT NULL,
    amount DECIMAL(10, 2),
    PRIMARY KEY (order_id, order_date)
)
PARTITION BY RANGE (YEAR(order_date))
(
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- 2. Copy data in batches
INSERT INTO orders_partitioned
SELECT * FROM orders
WHERE order_date < '2025-01-01';

-- 3. Rename tables in an atomic swap
RENAME TABLE orders TO orders_old, orders_partitioned TO orders;

-- 4. Drop the old table after verification
DROP TABLE orders_old;
```

## Using pt-online-schema-change

> **Note:** `pt-online-schema-change` does not support adding or modifying partitioning via `--alter`. The tool's documentation explicitly lists this as an unsupported operation. For partitioning conversions on large tables, use the create-copy-rename strategy described above instead.

You can still use `pt-online-schema-change` to modify the primary key as a separate preparatory step:

```bash
pt-online-schema-change \
  --alter "DROP PRIMARY KEY, ADD PRIMARY KEY (order_id, order_date)" \
  D=mydb,t=orders \
  --execute
```

Then apply the partitioning with a standard `ALTER TABLE`:

```sql
ALTER TABLE orders
PARTITION BY RANGE (YEAR(order_date))
(
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

## Summary

Converting a non-partitioned MySQL table to partitioned requires adding the partition column to all unique indexes, then applying the `PARTITION BY` clause via `ALTER TABLE`. For small tables this is straightforward. For large production tables, use a create-copy-rename strategy or `pt-online-schema-change` to minimize application downtime during the conversion.
