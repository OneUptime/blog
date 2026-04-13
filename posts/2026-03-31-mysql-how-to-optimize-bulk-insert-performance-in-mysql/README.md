# How to Optimize Bulk INSERT Performance in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Bulk Insert, Performance, InnoDB, Data Loading

Description: Learn techniques to maximize bulk INSERT performance in MySQL including multi-row inserts, LOAD DATA, transaction batching, and InnoDB tuning.

---

## Overview

Inserting large amounts of data into MySQL row-by-row is extremely slow. A naive loop inserting one row per statement might manage a few hundred rows per second, while optimized bulk insert techniques can achieve hundreds of thousands of rows per second.

This guide covers the most effective techniques for maximizing bulk INSERT throughput in MySQL.

## Technique 1: Multi-Row INSERT Statements

Instead of inserting one row per statement, batch multiple rows per `INSERT`:

```sql
-- Slow: one row per statement
INSERT INTO products (name, price, sku) VALUES ('Widget A', 9.99, 'WGT-001');
INSERT INTO products (name, price, sku) VALUES ('Widget B', 14.99, 'WGT-002');
INSERT INTO products (name, price, sku) VALUES ('Widget C', 7.49, 'WGT-003');

-- Fast: multiple rows per statement
INSERT INTO products (name, price, sku) VALUES
  ('Widget A', 9.99, 'WGT-001'),
  ('Widget B', 14.99, 'WGT-002'),
  ('Widget C', 7.49, 'WGT-003');
```

Aim for batches of 500-5,000 rows per INSERT statement for optimal throughput.

## Technique 2: Wrap in Transactions

Without explicit transactions, each `INSERT` is an implicit transaction with its own disk flush. Batching in explicit transactions dramatically reduces I/O:

```sql
START TRANSACTION;

INSERT INTO products (name, price, sku) VALUES
  ('Widget A', 9.99, 'WGT-001'),
  ('Widget B', 14.99, 'WGT-002');

INSERT INTO products (name, price, sku) VALUES
  ('Widget C', 7.49, 'WGT-003'),
  ('Widget D', 12.99, 'WGT-004');

COMMIT;
```

In Python, for example:

```python
import mysql.connector

conn = mysql.connector.connect(host='localhost', user='root', password='pass', database='myapp')
cursor = conn.cursor()

batch_size = 1000
batch = []

for i, row in enumerate(data_source):
    batch.append(row)
    if len(batch) >= batch_size:
        cursor.executemany(
            "INSERT INTO products (name, price, sku) VALUES (%s, %s, %s)",
            batch
        )
        conn.commit()
        batch = []

if batch:
    cursor.executemany(
        "INSERT INTO products (name, price, sku) VALUES (%s, %s, %s)",
        batch
    )
    conn.commit()

cursor.close()
conn.close()
```

## Technique 3: Use LOAD DATA INFILE

For very large datasets (millions of rows), `LOAD DATA INFILE` is the fastest option - often 10-20x faster than INSERT statements:

```sql
LOAD DATA INFILE '/tmp/products.csv'
INTO TABLE products
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(name, price, sku, category_id);
```

From the client side without file system access:

```sql
LOAD DATA LOCAL INFILE '/path/to/products.csv'
INTO TABLE products
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

## Technique 4: Disable Indexes During Load

For initial large data loads, temporarily disable index updates. Note that `DISABLE KEYS` only works on MyISAM tables - it is silently ignored on InnoDB:

```sql
-- Disable non-unique index updates (MyISAM only)
ALTER TABLE products DISABLE KEYS;

-- Load data
INSERT INTO products (name, price, sku) VALUES ...;

-- Rebuild indexes all at once (faster than incremental updates)
ALTER TABLE products ENABLE KEYS;
```

For InnoDB tables, use:

```sql
SET unique_checks = 0;
SET foreign_key_checks = 0;

-- Load data here

SET unique_checks = 1;
SET foreign_key_checks = 1;
```

Only use this when you are certain the data is clean and there are no duplicate keys or orphaned foreign keys.

## Technique 5: Tune InnoDB Settings

Adjust InnoDB settings for bulk load sessions:

```sql
-- Increase log buffer to reduce log flushes
SET GLOBAL innodb_log_buffer_size = 256 * 1024 * 1024;  -- 256MB

-- Reduce flush frequency (use with caution - risk of data loss on crash)
SET GLOBAL innodb_flush_log_at_trx_commit = 2;

-- Increase buffer pool if possible
SET GLOBAL innodb_buffer_pool_size = 4 * 1024 * 1024 * 1024;  -- 4GB
```

Reset `innodb_flush_log_at_trx_commit` to 1 after the bulk load to restore full ACID compliance.

## Technique 6: INSERT IGNORE and REPLACE

For upsert-style bulk loads:

```sql
-- Skip duplicate key errors silently
INSERT IGNORE INTO products (name, price, sku) VALUES
  ('Widget A', 9.99, 'WGT-001'),
  ('Widget B', 14.99, 'WGT-002');

-- Replace existing rows
REPLACE INTO products (name, price, sku) VALUES
  ('Widget A', 10.99, 'WGT-001');
```

## Benchmarking Your Load

```sql
-- Before load: record time
SELECT NOW();

-- Run load

-- After load: record time
SELECT NOW();

-- Check rows loaded
SELECT COUNT(*) FROM products;
```

## Summary

Optimizing bulk INSERT performance in MySQL requires combining multiple techniques: use multi-row INSERT statements to reduce round-trips, wrap batches in explicit transactions to reduce I/O, and use `LOAD DATA INFILE` for maximum throughput on large datasets. Temporarily disabling `unique_checks` and `foreign_key_checks` and tuning `innodb_flush_log_at_trx_commit` during loads can provide additional gains, but restore these settings to their safe defaults once the load completes.
