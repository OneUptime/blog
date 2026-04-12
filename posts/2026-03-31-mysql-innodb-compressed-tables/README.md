# How to Use InnoDB Compressed Tables in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Compression, Storage, Performance, Table

Description: Learn how to enable and configure InnoDB compressed tables in MySQL to reduce disk usage and improve I/O performance.

---

## What Are InnoDB Compressed Tables?

InnoDB compressed tables store data in a compressed format on disk, reducing the physical storage footprint and improving I/O throughput. Compression is especially effective for text-heavy or JSON-heavy tables where data has high redundancy. MySQL uses the zlib algorithm to compress table data and index pages.

Compressed tables are only available with the `InnoDB` storage engine. In MySQL 5.6 and earlier, you must set the `innodb_file_format` to `Barracuda` to use compression. In MySQL 5.7, Barracuda is the default file format. In MySQL 8.0, the file format concept was removed entirely and compression is always supported.

## Prerequisites

Before enabling compression, verify your InnoDB settings:

```sql
SHOW VARIABLES LIKE 'innodb_file_per_table';
```

In MySQL 8.0, `innodb_file_per_table` is enabled by default. This is required because compressed tables must be stored in per-table `.ibd` files. Note that the `innodb_file_format` variable was removed in MySQL 8.0, so you do not need to check it. If you are on MySQL 5.6 or earlier, also verify that `innodb_file_format` is set to `Barracuda`.

## Creating a Compressed Table

Use the `ROW_FORMAT=COMPRESSED` and `KEY_BLOCK_SIZE` options when creating a table:

```sql
CREATE TABLE orders (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    customer_id INT UNSIGNED NOT NULL,
    payload     JSON,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB
  ROW_FORMAT=COMPRESSED
  KEY_BLOCK_SIZE=8;
```

`KEY_BLOCK_SIZE` specifies the compressed page size in kilobytes. Valid values are 1, 2, 4, 8, and 16. Smaller values compress more aggressively but increase CPU overhead. A value of 8 is a reasonable default for most workloads.

## Converting an Existing Table to Compressed Format

```sql
ALTER TABLE orders
    ROW_FORMAT=COMPRESSED
    KEY_BLOCK_SIZE=8;
```

This operation rebuilds the table in place. For large tables, use `pt-online-schema-change` or `gh-ost` to avoid long locks.

## Checking Compression Effectiveness

Query the `INFORMATION_SCHEMA` to compare compressed versus uncompressed sizes:

```sql
SELECT
    table_name,
    data_length            AS data_bytes,
    data_free,
    (data_length / 1024 / 1024) AS data_mb
FROM information_schema.tables
WHERE table_schema = 'your_database'
  AND table_name   = 'orders';
```

For live compression statistics, inspect the InnoDB compression counters:

```sql
SELECT * FROM information_schema.INNODB_CMP;
SELECT * FROM information_schema.INNODB_CMP_PER_INDEX;
```

These views show how many pages have been compressed and decompressed, and how much time was spent in each operation.

## Choosing the Right KEY_BLOCK_SIZE

| KEY_BLOCK_SIZE | Typical Use Case |
|---|---|
| 1 | Very small rows, high compression ratio needed |
| 4 | Mixed workloads, moderate savings |
| 8 | Default recommendation for most tables |
| 16 | Large BLOBs or TEXT with moderate compression |

Run a benchmark with a representative data sample before committing to a value in production.

## Monitoring Compression with InnoDB Status

```sql
SHOW ENGINE INNODB STATUS\G
```

Look for the `BUFFER POOL AND MEMORY` section, which shows `compressed pages` and related counters. If you see high compression failure rates, increase `KEY_BLOCK_SIZE` or disable compression for that table.

## Disabling Compression on a Table

```sql
ALTER TABLE orders ROW_FORMAT=DYNAMIC KEY_BLOCK_SIZE=0;
```

`ROW_FORMAT=DYNAMIC` is the standard InnoDB format without compression.

## Operational Considerations

- Compression increases CPU usage during writes. Measure CPU headroom before enabling it on write-heavy tables.
- Buffer pool efficiency can drop because compressed and uncompressed versions of a page may both reside in memory simultaneously.
- Always test compression on a staging environment with production-like data volumes before rolling out to production.

## Summary

InnoDB compressed tables reduce disk usage by storing data in compressed form using the zlib algorithm. You enable compression with `ROW_FORMAT=COMPRESSED` and tune the page size with `KEY_BLOCK_SIZE`. Monitor the `INNODB_CMP` information schema view to verify that compression is delivering savings without excessive CPU overhead.
