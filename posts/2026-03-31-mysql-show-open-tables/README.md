# How to Use SHOW OPEN TABLES in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Table, Administration

Description: Learn how to use SHOW OPEN TABLES in MySQL to view which tables are currently cached in the table cache and how actively they are being used.

---

## What Is SHOW OPEN TABLES

`SHOW OPEN TABLES` lists the tables that are currently open in the MySQL table cache. MySQL maintains a table cache (controlled by the `table_open_cache` variable) to avoid reopening tables on every query. `SHOW OPEN TABLES` shows you which tables are currently cached, whether they are locked by an ongoing operation, and how many table locks or lock requests exist for each table.

```sql
SHOW OPEN TABLES;
SHOW OPEN TABLES FROM database_name;
SHOW OPEN TABLES LIKE 'pattern';
SHOW OPEN TABLES WHERE condition;
```

## Basic Usage

```sql
SHOW OPEN TABLES;
```

```text
+----------+------------------+--------+-------------+
| Database | Table            | In_use | Name_locked |
+----------+------------------+--------+-------------+
| myapp_db | users            |      0 |           0 |
| myapp_db | orders           |      2 |           0 |
| myapp_db | products         |      0 |           0 |
| sys      | sys_config       |      0 |           0 |
+----------+------------------+--------+-------------+
```

## Output Columns Explained

- **Database**: The database containing the table
- **Table**: The table name
- **In_use**: The number of table locks or lock requests for the table. A value greater than 0 means the table has active locks held or pending lock requests from other sessions.
- **Name_locked**: Whether the table name is locked (e.g., during a `DROP TABLE` or `RENAME TABLE` operation). Usually 0 in normal operation.

## Filtering Results

```sql
-- Show only tables from a specific database
SHOW OPEN TABLES FROM myapp_db;

-- Show only tables currently in use
SHOW OPEN TABLES WHERE In_use > 0;

-- Show tables matching a pattern
SHOW OPEN TABLES LIKE 'order%';

-- Find locked tables
SHOW OPEN TABLES WHERE Name_locked > 0;
```

## Checking Tables in Active Use

The most practical use of `SHOW OPEN TABLES` is finding tables with ongoing activity:

```sql
-- Which tables are being queried right now?
SHOW OPEN TABLES WHERE In_use > 0;
```

This is useful when you are waiting to acquire a lock or run maintenance and want to see which tables have active sessions.

## Table Cache Monitoring

Monitor the table cache to ensure it is sized appropriately:

```sql
-- Check current open table count
SHOW STATUS LIKE 'Open_tables';

-- Check table cache size setting
SHOW VARIABLES LIKE 'table_open_cache';

-- Check how often tables had to be evicted from cache
SHOW STATUS LIKE 'Opened_tables';
```

If `Opened_tables` is growing rapidly compared to `Open_tables`, the cache is too small and tables are being frequently evicted and reopened. Increase `table_open_cache`:

```sql
SET GLOBAL table_open_cache = 4000;
```

## Comparing with SHOW STATUS

`SHOW OPEN TABLES` shows the current state, while `SHOW STATUS` provides cumulative counters:

```sql
-- Current snapshot
SHOW OPEN TABLES WHERE In_use > 0;

-- Historical counter
SHOW STATUS LIKE 'Open_tables';       -- current open count
SHOW STATUS LIKE 'Opened_tables';     -- total opens since startup
```

## FLUSH TABLES and SHOW OPEN TABLES

You can use `SHOW OPEN TABLES` to verify that a `FLUSH TABLES` has completed:

```sql
-- Before flush
SHOW OPEN TABLES FROM myapp_db;

-- Flush the table cache
FLUSH TABLES;

-- After flush - should be empty or nearly empty
SHOW OPEN TABLES FROM myapp_db;
```

## Summary

`SHOW OPEN TABLES` provides a real-time snapshot of which tables are cached in the MySQL table cache, how many active queries are using each table, and whether any tables have name locks. Use it to identify contention before maintenance operations, check whether `FLUSH TABLES` completed, and monitor table cache utilization. Combine it with `SHOW STATUS LIKE 'table_open_cache%'` to tune the cache size for your workload.
