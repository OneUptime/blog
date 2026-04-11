# What Is the MEMORY Storage Engine in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Storage Engine, Memory, Performance, Cache

Description: The MySQL MEMORY storage engine stores all table data in RAM, providing very fast access for temporary data, caches, and lookup tables that fit in memory.

---

## Overview

The MEMORY storage engine (previously known as HEAP) stores all table data entirely in RAM rather than on disk. Because RAM access is orders of magnitude faster than disk I/O, MEMORY tables provide extremely fast read and write operations. The tradeoff is that all data is lost when the MySQL server restarts or when the table is explicitly dropped.

MEMORY tables are ideal for temporary working data, session-scoped caches, and small reference datasets that need to be accessed frequently with minimal latency.

## Creating a MEMORY Table

```sql
CREATE TABLE session_cache (
  session_id VARCHAR(64) NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  data VARCHAR(255),
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (session_id),
  INDEX idx_expires (expires_at)
) ENGINE=MEMORY;
```

Data written to this table lives only in RAM. On server restart, the table definition persists, but all rows are gone.

## Key Characteristics

MEMORY tables use table-level locking, similar to MyISAM. A write operation locks the entire table, which limits write concurrency. For most use cases where MEMORY is appropriate - small lookup tables and caches - this is not a significant limitation.

By default, MEMORY tables use hash indexes, which provide O(1) lookups for equality comparisons but cannot support range queries. You can explicitly create B-tree indexes for range-based access.

```sql
-- Default hash index (equality only)
CREATE TABLE ip_geo (
  ip_int INT UNSIGNED NOT NULL,
  country_code CHAR(2) NOT NULL,
  PRIMARY KEY (ip_int)
) ENGINE=MEMORY;

-- B-tree index for range queries
CREATE TABLE rate_limits (
  key_name VARCHAR(128) NOT NULL,
  request_count INT NOT NULL DEFAULT 0,
  window_start DATETIME NOT NULL,
  PRIMARY KEY (key_name),
  INDEX USING BTREE (window_start)
) ENGINE=MEMORY;
```

## Size Limits

The maximum size of a MEMORY table is controlled by the `max_heap_table_size` system variable. The default is typically 16MB.

```sql
-- Check the current limit
SHOW VARIABLES LIKE 'max_heap_table_size';

-- Set it for the session (affects new MEMORY tables created in this session)
SET SESSION max_heap_table_size = 67108864; -- 64MB

-- Set it globally (affects new MEMORY tables after the change)
SET GLOBAL max_heap_table_size = 134217728; -- 128MB
```

## Limitations

MEMORY tables do not support `BLOB` or `TEXT` columns. All rows are fixed-length, which means `VARCHAR` columns are stored as `CHAR` - consuming the full declared width for every row. This makes MEMORY tables less space-efficient for variable-length string data.

```sql
-- This will fail - BLOB/TEXT not supported in MEMORY tables
CREATE TABLE bad_example (
  id INT PRIMARY KEY,
  content BLOB
) ENGINE=MEMORY; -- ERROR
```

## Common Use Cases

```sql
-- Temporary aggregation table during a complex ETL job
CREATE TEMPORARY TABLE IF NOT EXISTS hourly_totals (
  hour_bucket DATETIME NOT NULL,
  event_count INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (hour_bucket)
) ENGINE=MEMORY;

INSERT INTO hourly_totals (hour_bucket, event_count)
SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00'), COUNT(*)
FROM events
WHERE created_at >= NOW() - INTERVAL 24 HOUR
GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00');
```

## Summary

The MySQL MEMORY storage engine stores table data entirely in RAM, delivering fast access for temporary and frequently-read data. It uses table-level locking, hash indexes by default, and has no support for BLOB or TEXT columns. Data is lost on server restart, making it appropriate only for non-persistent data like caches, session state, and temporary intermediate results. For persistent in-memory needs, consider Redis or MySQL's InnoDB with a tuned buffer pool instead.
