# What Is the CSV Storage Engine in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Storage Engine, CSV, Data Export, Integration

Description: The MySQL CSV storage engine stores table data as plain CSV files on disk, enabling direct file-based data exchange between MySQL and external applications.

---

## Overview

The CSV storage engine stores MySQL table data as comma-separated value (CSV) files on the filesystem. Each table is backed by a plain text `.CSV` file that any spreadsheet application, ETL tool, or script can read directly without going through MySQL. This makes the CSV engine uniquely suited for data exchange scenarios where direct file-based integration is more practical than SQL queries.

The CSV engine is always compiled into MySQL and cannot be disabled - it is one of the built-in engines guaranteed to be available.

## How CSV Tables Work

When you create a table with `ENGINE=CSV`, MySQL creates files in the database directory:

- `tablename.CSV` - actual data in comma-separated format
- `tablename.CSM` - metadata including row count and state

In MySQL 5.7 and earlier, a `tablename.frm` file also stores the table structure definition. In MySQL 8.0+, table definitions are stored in the transactional data dictionary and an `.sdi` (Serialized Dictionary Information) file is created instead.

```sql
CREATE TABLE data_export (
  id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  signup_date DATE NOT NULL
) ENGINE=CSV;
```

All columns in a CSV table must be declared `NOT NULL`. The CSV format does not have a representation for SQL NULL values.

## Working with CSV Data

```sql
-- Insert data normally through SQL
INSERT INTO data_export VALUES (1, 'Alice Smith', 'alice@example.com', '2026-01-15');
INSERT INTO data_export VALUES (2, 'Bob Jones', 'bob@example.com', '2026-02-20');

-- Query it like any other table
SELECT * FROM data_export WHERE signup_date >= '2026-01-01';
```

The underlying `.CSV` file is immediately updated after each insert and is human-readable:

```text
"1","Alice Smith","alice@example.com","2026-01-15"
"2","Bob Jones","bob@example.com","2026-02-20"
```

If a CSV table already exists, you can replace its `.CSV` file with an externally generated one. After replacing the file, use `REPAIR TABLE` to update the metadata so MySQL recognizes the new contents.

## Limitations

CSV tables have no index support - not even a primary key. Every query performs a full table scan. This makes CSV tables unsuitable for large datasets or frequent queries. There is also no transaction support; writes are immediate and cannot be rolled back.

```sql
-- This will fail - primary keys not supported in CSV tables
CREATE TABLE bad_csv (
  id INT NOT NULL PRIMARY KEY, -- ERROR: cannot define index
  value VARCHAR(100) NOT NULL
) ENGINE=CSV;
```

## Checking and Repairing CSV Tables

If the CSV file is edited externally and becomes inconsistent with the metadata file, MySQL provides a repair mechanism.

```sql
-- Check the table for consistency
CHECK TABLE data_export;

-- Repair if the .CSV file was edited externally
REPAIR TABLE data_export;
```

## Practical Use Case

A common pattern is using CSV tables as a staging area for bulk data exchange:

```sql
-- Create a CSV-backed staging table for external data drop
CREATE TABLE import_staging (
  row_num INT NOT NULL,
  product_code VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL
) ENGINE=CSV;

-- External process drops a new CSV file, then MySQL reads it
SELECT * FROM import_staging;

-- Process and load into InnoDB production table
INSERT INTO products (code, qty, price)
SELECT product_code, quantity, unit_price FROM import_staging;
```

## Summary

The MySQL CSV storage engine stores table data as plain CSV files on disk, enabling seamless file-based data exchange with external tools and applications. It requires all columns to be NOT NULL, has no index support, and offers no transaction safety. Its primary value is interoperability - CSV files written by MySQL can be opened directly in Excel, consumed by ETL pipelines, or replaced by external processes for MySQL to read. For production data storage, InnoDB is always preferred.
