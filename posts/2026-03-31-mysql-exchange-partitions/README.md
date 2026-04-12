# How to Exchange Partitions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Partition, ALTER TABLE, InnoDB, Data Archiving

Description: Learn how to use ALTER TABLE EXCHANGE PARTITION in MySQL to swap data between a partitioned table and a regular table for fast archiving and bulk loading.

---

## What Is EXCHANGE PARTITION?

`ALTER TABLE ... EXCHANGE PARTITION` swaps the data and tablespace of a partition with a non-partitioned table. After the exchange, the non-partitioned table holds the data that was in the partition, and the partition holds whatever was in the non-partitioned table (typically nothing, for a clean swap).

This is an instantaneous metadata operation - no data is physically copied. It is one of the fastest ways to archive partition data or load new data into a partitioned table.

## Requirements

- The non-partitioned table must have exactly the same schema (columns, data types, indexes) as the partitioned table
- The non-partitioned table must use the same storage engine as the partitioned table
- Neither table can have foreign key references defined on it, and no other table can have foreign keys that reference the non-partitioned table
- The rows in the non-partitioned table must fit within the partition's definition (e.g., date range)

## Basic Syntax

```sql
ALTER TABLE partitioned_table
EXCHANGE PARTITION partition_name
WITH TABLE regular_table;
```

## Example: Archive Old Partition Data

Create a partitioned sales table:

```sql
CREATE TABLE sales (
    sale_id BIGINT NOT NULL,
    sale_date DATE NOT NULL,
    amount DECIMAL(10, 2),
    PRIMARY KEY (sale_id, sale_date)
)
PARTITION BY RANGE (YEAR(sale_date))
(
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026)
);
```

Create an archive table with the same schema:

```sql
CREATE TABLE sales_archive_2022 LIKE sales;
ALTER TABLE sales_archive_2022 REMOVE PARTITIONING;
```

Exchange the 2022 partition with the archive table:

```sql
ALTER TABLE sales
EXCHANGE PARTITION p2022
WITH TABLE sales_archive_2022;
```

Now `sales_archive_2022` contains all 2022 data and the `p2022` partition is empty.

## Example: Bulk Load Data via Exchange

Prepare and validate data in a staging table, then load it instantly:

```sql
-- Create staging table with same structure
CREATE TABLE sales_staging LIKE sales;
ALTER TABLE sales_staging REMOVE PARTITIONING;

-- Load and validate data in the staging table
LOAD DATA INFILE '/data/sales_2025_q1.csv'
INTO TABLE sales_staging
FIELDS TERMINATED BY ','
(sale_id, sale_date, amount);

-- Exchange staging table with the target partition
ALTER TABLE sales
EXCHANGE PARTITION p2025
WITH TABLE sales_staging;
```

## EXCHANGE WITH VALIDATION (Default)

By default, MySQL validates that all rows in the non-partitioned table fall within the partition's boundaries:

```sql
ALTER TABLE sales
EXCHANGE PARTITION p2022
WITH TABLE sales_archive_2022
WITH VALIDATION;
```

## Skip Validation for Speed

If you trust the data is already correct:

```sql
ALTER TABLE sales
EXCHANGE PARTITION p2022
WITH TABLE sales_archive_2022
WITHOUT VALIDATION;
```

Use `WITHOUT VALIDATION` carefully - invalid rows will corrupt the partition's logical integrity.

## Verify After Exchange

```sql
SELECT COUNT(*) FROM sales PARTITION (p2022);
SELECT COUNT(*) FROM sales_archive_2022;
```

## Summary

`EXCHANGE PARTITION` is a zero-copy operation that makes archiving old partitions and bulk-loading new data instantaneous. By swapping an empty staging or archive table with a partition, you can move billions of rows in milliseconds. It is an essential tool for high-throughput data warehousing workflows in MySQL.
