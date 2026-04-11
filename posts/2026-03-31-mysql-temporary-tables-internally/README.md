# How MySQL Handles Temporary Tables Internally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Temporary Table, InnoDB, TempTable, Internal

Description: Learn how MySQL creates and manages temporary tables internally for sorting, GROUP BY, and subqueries, including the TempTable engine and disk spill behavior.

---

## When MySQL Creates Temporary Tables

MySQL creates internal temporary tables automatically during query execution for:

- `GROUP BY` on non-indexed columns
- `ORDER BY` with `DISTINCT`
- `UNION` (always) and `UNION ALL` (when combined with `ORDER BY` or `LIMIT`)
- Derived tables and subqueries in the FROM clause
- Window functions that need materialized partitions
- Queries with `SQL_BUFFER_RESULT`

You can detect temporary table creation in `EXPLAIN`:

```sql
EXPLAIN SELECT user_id, COUNT(*) FROM orders GROUP BY user_id\G
-- Extra = Using temporary; Using filesort
```

## The TempTable Storage Engine (MySQL 8.0+)

In MySQL 8.0, the default in-memory temporary table engine is `TempTable`, replacing the older `MEMORY` engine. TempTable supports variable-length columns (`VARCHAR`, `TEXT`, `BLOB`) natively without converting them to fixed-length:

```sql
SHOW VARIABLES LIKE 'internal_tmp_mem_storage_engine';
-- TempTable (MySQL 8.0 default)

SHOW VARIABLES LIKE 'temptable_max_ram';
-- 1073741824 (1 GB) - maximum RAM for all TempTable instances
```

## Memory vs. Disk Temporary Tables

TempTable starts in memory. When a temporary table exceeds the memory limit, it spills to disk in InnoDB format:

```sql
SHOW VARIABLES LIKE 'temptable_use_mmap';
-- ON: spill to memory-mapped files (faster) before going to InnoDB
-- OFF: spill directly to InnoDB on-disk session temporary tablespace
-- Note: deprecated in MySQL 8.0.26. Use temptable_max_mmap instead.

SHOW VARIABLES LIKE 'temptable_max_mmap';
-- Memory-mapped file size limit before InnoDB spill (default 1 GB)
-- Setting to 0 is equivalent to temptable_use_mmap = OFF
```

Monitor disk spills:

```sql
SELECT variable_value
FROM performance_schema.global_status
WHERE variable_name = 'Created_tmp_disk_tables';

SELECT variable_value
FROM performance_schema.global_status
WHERE variable_name = 'Created_tmp_tables';
```

A high `Created_tmp_disk_tables / Created_tmp_tables` ratio indicates frequent spills. Increase `temptable_max_ram` or optimize queries to reduce temporary table size.

## Explicit Temporary Tables

Users can create explicit temporary tables that are visible only within their session:

```sql
CREATE TEMPORARY TABLE session_summary (
  user_id    INT UNSIGNED NOT NULL,
  order_count INT NOT NULL,
  total_spent DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (user_id)
);

INSERT INTO session_summary
SELECT user_id, COUNT(*), SUM(total)
FROM orders
WHERE created_at >= CURDATE() - INTERVAL 30 DAY
GROUP BY user_id;

-- Use in subsequent queries
SELECT s.*, u.email
FROM session_summary s
JOIN users u ON u.id = s.user_id
ORDER BY s.total_spent DESC;

-- Automatically dropped at session end
DROP TEMPORARY TABLE IF EXISTS session_summary;
```

## The InnoDB Temporary Tablespace

Since MySQL 8.0.16, on-disk internal temporary tables and user-created temporary tables are stored in **session temporary tablespaces** (files like `temp_1.ibt` in the `#innodb_temp` directory), not in the global temporary tablespace. The global temporary tablespace (`ibtmp1`) stores only rollback segments for changes to user-created temporary tables:

```sql
SHOW VARIABLES LIKE 'innodb_temp_data_file_path';
-- ibtmp1:12M:autoextend (global temp tablespace for rollback segments)
```

To monitor session temporary tablespace usage:

```sql
SELECT * FROM information_schema.INNODB_SESSION_TEMP_TABLESPACES;
-- Shows ID, SPACE, PATH, SIZE, STATE, and PURPOSE for each session
```

To identify which sessions are using temporary tables:

```sql
SELECT t.*, s.processlist_user, s.processlist_host
FROM information_schema.INNODB_TEMP_TABLE_INFO t
JOIN performance_schema.threads s ON s.thread_id = t.THREAD_ID;
-- Note: INNODB_TEMP_TABLE_INFO only tracks user-created temporary tables
```

## Reducing Temporary Table Usage

To avoid temporary tables:

- Add indexes on `GROUP BY` and `ORDER BY` columns
- Rewrite correlated subqueries as joins
- Use CTEs to materialize intermediate results explicitly with control over size

```sql
-- Instead of a subquery creating an implicit temp table:
SELECT user_id, AVG(total) FROM orders WHERE status = 'completed' GROUP BY user_id;

-- Ensure this index exists:
CREATE INDEX idx_orders_status_user ON orders (status, user_id, total);
```

## Summary

MySQL creates internal temporary tables automatically for GROUP BY, UNION, sorting, and subquery materialization. The TempTable engine (MySQL 8.0+) keeps data in RAM and spills to disk when limits are exceeded. Monitor `Created_tmp_disk_tables` to detect frequent spills and tune `temptable_max_ram`. Since MySQL 8.0.16, on-disk temporary tables (both internal and user-created) are stored in session temporary tablespaces in the `#innodb_temp` directory, while `ibtmp1` holds only rollback segments. Add indexes on GROUP BY columns and prefer joins over subqueries to reduce temporary table creation.
