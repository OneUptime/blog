# How to Perform Bulk Inserts in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Bulk, Insert, Performance, InnoDB

Description: Master bulk insert techniques in MySQL including multi-row VALUES, LOAD DATA INFILE, and InnoDB tuning to load millions of rows efficiently.

---

## What Is a Bulk Insert

A bulk insert is any strategy that loads large volumes of data into MySQL with minimal overhead. The three main approaches are multi-row `INSERT ... VALUES`, `INSERT INTO ... SELECT`, and `LOAD DATA INFILE`. Choosing the right approach depends on where the data comes from and how fast it needs to load.

## Multi-Row INSERT VALUES

The simplest bulk insert method extends a standard `INSERT` with multiple value tuples:

```sql
INSERT INTO orders (customer_id, total, created_at)
VALUES
  (1, 99.99, '2026-01-01'),
  (2, 149.50, '2026-01-02'),
  (3, 49.00, '2026-01-03');
```

Keep batch size between 500 and 5,000 rows to balance memory usage and throughput.

## Disabling Indexes During Load

For very large inserts into existing tables, temporarily disabling non-unique index updates can dramatically speed up the load:

```sql
ALTER TABLE orders DISABLE KEYS;

INSERT INTO orders (customer_id, total, created_at) VALUES
  (4, 200.00, '2026-01-04'),
  (5, 75.00,  '2026-01-05');
-- ... more batches

ALTER TABLE orders ENABLE KEYS;
```

`DISABLE KEYS` only affects `MyISAM` tables. For InnoDB, use `SET unique_checks=0` and `SET foreign_key_checks=0` instead:

```sql
SET unique_checks = 0;
SET foreign_key_checks = 0;

-- bulk insert statements here

SET foreign_key_checks = 1;
SET unique_checks = 1;
```

## Wrapping Batches in a Transaction

By default, each `INSERT` is auto-committed, which flushes the InnoDB redo log after every statement. Wrapping batches in an explicit transaction reduces redo log flushes:

```sql
START TRANSACTION;

INSERT INTO events (type, payload) VALUES ('click', '{}'), ('view', '{}');
INSERT INTO events (type, payload) VALUES ('scroll', '{}'), ('hover', '{}');

COMMIT;
```

## Tuning InnoDB for Bulk Loads

For the heaviest workloads, adjust these server variables before loading:

```sql
SET GLOBAL innodb_flush_log_at_trx_commit = 2;
SET GLOBAL innodb_buffer_pool_size = 4294967296; -- 4 GB
```

Setting `innodb_flush_log_at_trx_commit = 2` flushes the log buffer once per second rather than on every commit, trading a small durability window for much higher throughput.

## Using LOAD DATA INFILE

For CSV or delimited flat files, `LOAD DATA INFILE` is the fastest option because MySQL reads the file at the server level without parsing individual SQL statements:

```sql
LOAD DATA INFILE '/var/lib/mysql-files/orders.csv'
INTO TABLE orders
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(customer_id, total, created_at);
```

Place the file in the directory returned by `SHOW VARIABLES LIKE 'secure_file_priv'` to avoid permission errors.

## Measuring Throughput

Use session status counters or a simple timer in your application to compare approaches:

```sql
SHOW STATUS LIKE 'Handler_write';
-- note the value

-- run your bulk insert

SHOW STATUS LIKE 'Handler_write';
-- subtract to get rows inserted
```

## Summary

Bulk inserts in MySQL benefit most from batching rows into single `INSERT` statements, wrapping batches in transactions, disabling constraint checks during load, and tuning InnoDB buffer pool and flush behavior. For flat-file sources, `LOAD DATA INFILE` provides the highest throughput with the least application overhead.
