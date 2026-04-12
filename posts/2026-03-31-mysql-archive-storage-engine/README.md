# What Is the ARCHIVE Storage Engine in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Storage Engine, Archive, Compression, Log

Description: The MySQL ARCHIVE storage engine is designed for storing large volumes of compressed, rarely-accessed historical or log data with minimal disk space usage.

---

## Overview

The ARCHIVE storage engine is a specialized MySQL engine designed for one specific use case: storing large amounts of historical or log data that is written once and rarely read. ARCHIVE compresses rows using zlib as they are inserted, achieving significant storage savings compared to InnoDB or MyISAM for text-heavy data.

The name reflects its intended purpose - archiving data that must be retained but is seldom queried. Think audit logs, application event streams, telemetry data, or compliance records.

## Core Characteristics

ARCHIVE tables support only `INSERT`, `REPLACE`, and `SELECT` operations. You cannot `UPDATE` or `DELETE` individual rows in an ARCHIVE table. This write-once, read-many model simplifies the engine's design and enables aggressive compression.

```sql
CREATE TABLE audit_log (
  log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_time DATETIME NOT NULL,
  user_id INT UNSIGNED,
  action VARCHAR(100) NOT NULL,
  target_table VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(45),
  PRIMARY KEY (log_id)
) ENGINE=ARCHIVE;
```

Rows are compressed individually using zlib when inserted. Typical compression ratios range from 3:1 to 10:1 for text data, making ARCHIVE substantially more space-efficient than other engines for the same dataset.

## Inserting and Reading Data

```sql
-- Insert works normally
INSERT INTO audit_log (event_time, user_id, action, target_table, new_value, ip_address)
VALUES (NOW(), 42, 'UPDATE', 'products', '{"price": 29.99}', '192.168.1.100');

-- SELECT with filtering works
SELECT log_id, event_time, action, user_id
FROM audit_log
WHERE event_time >= '2026-01-01 00:00:00'
  AND event_time < '2026-02-01 00:00:00'
ORDER BY event_time;

-- UPDATE is not supported - this will fail
UPDATE audit_log SET action = 'INSERT' WHERE log_id = 1; -- ERROR
```

## Index Limitations

ARCHIVE tables support only one optional index: an `AUTO_INCREMENT` primary key. There are no secondary indexes. This means all queries other than primary key lookups require a full table scan.

```sql
-- Only AUTO_INCREMENT primary key is supported
CREATE TABLE server_metrics (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  collected_at DATETIME NOT NULL,
  server_id INT NOT NULL,
  cpu_pct FLOAT,
  mem_pct FLOAT,
  PRIMARY KEY (id)
  -- No secondary indexes allowed
) ENGINE=ARCHIVE;
```

For this reason, ARCHIVE tables are not suitable for workloads that need fast lookups by arbitrary columns. If you need to query historical data efficiently, consider partitioned InnoDB tables or a dedicated analytical store.

## Checking Compression Savings

```sql
-- Compare data size vs index size to see compression in action
SELECT
  TABLE_NAME,
  TABLE_ROWS,
  ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb,
  ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mydb' AND ENGINE = 'ARCHIVE';
```

## When to Use ARCHIVE

ARCHIVE is appropriate when you need to retain large volumes of immutable records - compliance logs, security audit trails, sensor readings, or application event histories - and storage cost is a concern. It is not appropriate when you need to update records, query by non-primary-key columns efficiently, or support transactions.

```sql
-- Check if ARCHIVE engine is available on your server
SHOW ENGINES;
```

## Summary

The MySQL ARCHIVE storage engine provides compressed, append-only storage for historical and log data. It supports only INSERT, REPLACE, and SELECT, with no UPDATE or DELETE support, and offers only an AUTO_INCREMENT primary key index. Its zlib compression delivers significant space savings over transactional engines for write-once data. ARCHIVE is a specialized tool for compliance logs, audit trails, and historical records where storage efficiency matters more than query flexibility.
