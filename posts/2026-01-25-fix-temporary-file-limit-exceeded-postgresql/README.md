# How to Fix 'temporary file limit exceeded' Errors in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Troubleshooting, Temporary Files, Memory, Performance

Description: Learn how to diagnose and fix 'temporary file limit exceeded' errors in PostgreSQL. This guide covers query optimization, memory tuning, and temp file management strategies.

---

The "temporary file limit exceeded" error in PostgreSQL occurs when a query needs more disk space for temporary files than allowed by the `temp_file_limit` setting. This typically happens during large sorts, hash joins, or other operations that exceed available memory and spill to disk. This guide will help you understand why this happens and how to fix it.

---

## Understanding the Error

When you see this error:

```
ERROR: temporary file size exceeds temp_file_limit (1048576kB)
```

It means:
1. A query needed more memory than `work_mem` allows
2. The query started writing temporary files to disk
3. The temporary files exceeded the `temp_file_limit`

---

## Check Current Settings

```sql
-- View temp file limit
SHOW temp_file_limit;  -- Default: -1 (unlimited)

-- View work_mem (operations spill to disk when exceeding this)
SHOW work_mem;  -- Default: 4MB

-- View where temp files are stored
SHOW temp_tablespaces;

-- Check temp file usage statistics
SELECT
    datname,
    temp_files,
    pg_size_pretty(temp_bytes) AS temp_bytes
FROM pg_stat_database
WHERE datname = current_database();
```

---

## Diagnosing the Problem

### Find Queries Using Temp Files

```sql
-- Check pg_stat_statements for temp file usage
SELECT
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    calls,
    temp_blks_read,
    temp_blks_written,
    pg_size_pretty((temp_blks_written * 8192)::bigint) AS temp_written,
    substring(query, 1, 100) AS query_preview
FROM pg_stat_statements
WHERE temp_blks_written > 0
ORDER BY temp_blks_written DESC
LIMIT 10;
```

### Analyze Query Execution Plan

```sql
-- Use EXPLAIN to see temp file usage
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM large_table
ORDER BY some_column;

-- Look for:
-- "Sort Method: external merge  Disk: 512000kB"
-- This indicates the sort spilled to disk
```

### Monitor Active Queries

```sql
-- Check for queries currently using temp files
SELECT
    pid,
    now() - query_start AS duration,
    temp_blks_read,
    temp_blks_written,
    query
FROM pg_stat_activity
WHERE temp_blks_written > 0
AND state = 'active';
```

---

## Solutions

### Solution 1: Increase temp_file_limit

```sql
-- Increase limit for current session
SET temp_file_limit = '10GB';

-- Or in postgresql.conf for all sessions
-- temp_file_limit = 10GB

-- Remove limit entirely (use with caution)
SET temp_file_limit = -1;
```

### Solution 2: Increase work_mem

More `work_mem` means less spilling to disk.

```sql
-- Increase for current session
SET work_mem = '256MB';
-- Run your query
RESET work_mem;

-- Calculate safe global setting
-- Formula: (Total RAM - shared_buffers) / (max_connections * 3)
-- For 16GB RAM, 4GB shared_buffers, 100 connections:
-- (16GB - 4GB) / (100 * 3) = 40MB
```

```ini
# postgresql.conf
# Be conservative - each operation can use this much memory
work_mem = 64MB
```

### Solution 3: Optimize the Query

Rewrite queries to avoid large sorts or hash operations:

```sql
-- Bad: Sort entire table
SELECT * FROM orders ORDER BY created_at DESC;

-- Better: Limit results
SELECT * FROM orders ORDER BY created_at DESC LIMIT 100;

-- Bad: Distinct on large result
SELECT DISTINCT customer_id FROM orders;

-- Better: Use EXISTS or subquery
SELECT id FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

### Solution 4: Add Indexes

Proper indexes can eliminate the need for sorts:

```sql
-- Before: Query does external sort
EXPLAIN ANALYZE SELECT * FROM orders ORDER BY created_at DESC LIMIT 100;
-- Sort Method: external merge  Disk: 500MB

-- Add index
CREATE INDEX idx_orders_created_desc ON orders (created_at DESC);

-- After: Index scan, no sort needed
EXPLAIN ANALYZE SELECT * FROM orders ORDER BY created_at DESC LIMIT 100;
-- Index Scan using idx_orders_created_desc
```

### Solution 5: Use Dedicated Temp Tablespace

Put temp files on a disk with more space:

```sql
-- Create tablespace for temp files
CREATE TABLESPACE temp_space LOCATION '/mnt/fast_disk/pg_temp';

-- Set as default for temp files
ALTER DATABASE mydb SET temp_tablespaces = 'temp_space';

-- Or for current session
SET temp_tablespaces = 'temp_space';
```

### Solution 6: Process Data in Batches

```sql
-- Instead of sorting entire table
-- Bad:
SELECT * FROM events ORDER BY event_time INTO OUTFILE '/tmp/events.csv';

-- Better: Process in batches
DO $$
DECLARE
    batch_start DATE;
    batch_end DATE;
BEGIN
    batch_start := '2025-01-01';

    WHILE batch_start < '2026-01-01' LOOP
        batch_end := batch_start + INTERVAL '1 month';

        -- Process one month at a time
        RAISE NOTICE 'Processing % to %', batch_start, batch_end;

        -- Export or process batch
        EXECUTE format(
            'COPY (SELECT * FROM events WHERE event_time >= %L AND event_time < %L ORDER BY event_time) TO %L',
            batch_start, batch_end, '/tmp/events_' || to_char(batch_start, 'YYYY_MM') || '.csv'
        );

        batch_start := batch_end;
    END LOOP;
END $$;
```

---

## Query Pattern Fixes

### Large Sorts

```sql
-- Problem: Sorting large result set
EXPLAIN SELECT * FROM users ORDER BY name;
-- Sort Method: external merge Disk: 500MB

-- Solution 1: Add index
CREATE INDEX idx_users_name ON users (name);

-- Solution 2: Limit results
SELECT * FROM users ORDER BY name LIMIT 100 OFFSET 0;

-- Solution 3: Use cursor for large results
BEGIN;
DECLARE user_cursor CURSOR FOR SELECT * FROM users ORDER BY name;
FETCH 1000 FROM user_cursor;
-- Process batch
CLOSE user_cursor;
COMMIT;
```

### Large Hash Joins

```sql
-- Problem: Hash join spills to disk
EXPLAIN ANALYZE
SELECT o.*, c.*
FROM orders o
JOIN customers c ON o.customer_id = c.id;
-- Hash Join (Batches: 4, Disk: 256MB)

-- Solution 1: Increase work_mem for this query
SET work_mem = '512MB';
SELECT o.*, c.* FROM orders o JOIN customers c ON o.customer_id = c.id;
RESET work_mem;

-- Solution 2: Ensure join columns are indexed
CREATE INDEX idx_orders_customer_id ON orders (customer_id);

-- Solution 3: Use LIMIT if you do not need all results
SELECT o.*, c.*
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.created_at > NOW() - INTERVAL '30 days';
```

### Large Aggregations

```sql
-- Problem: GROUP BY creates large hash table
EXPLAIN ANALYZE
SELECT customer_id, COUNT(*)
FROM orders
GROUP BY customer_id;
-- HashAggregate (Batches: 8, Disk: 128MB)

-- Solution 1: Add index for index-only scan
CREATE INDEX idx_orders_customer ON orders (customer_id);

-- Solution 2: Pre-aggregate with materialized view
CREATE MATERIALIZED VIEW order_counts AS
SELECT customer_id, COUNT(*) AS order_count
FROM orders
GROUP BY customer_id;

-- Solution 3: Use partial aggregation
SELECT customer_id, SUM(daily_count) AS total_count
FROM (
    SELECT customer_id, DATE(created_at) AS day, COUNT(*) AS daily_count
    FROM orders
    GROUP BY customer_id, DATE(created_at)
) daily
GROUP BY customer_id;
```

---

## Monitoring Temp File Usage

### Create Monitoring Query

```sql
-- Track temp file usage over time
CREATE TABLE temp_file_stats (
    collected_at TIMESTAMP DEFAULT NOW(),
    database_name TEXT,
    temp_files BIGINT,
    temp_bytes BIGINT
);

-- Collect stats periodically
INSERT INTO temp_file_stats (database_name, temp_files, temp_bytes)
SELECT datname, temp_files, temp_bytes
FROM pg_stat_database
WHERE datname = current_database();

-- Query historical usage
SELECT
    collected_at,
    temp_files,
    pg_size_pretty(temp_bytes) AS temp_size,
    temp_bytes - lag(temp_bytes) OVER (ORDER BY collected_at) AS bytes_change
FROM temp_file_stats
ORDER BY collected_at DESC
LIMIT 100;
```

### Alert on High Temp Usage

```sql
-- Alert query
SELECT
    datname,
    temp_files,
    pg_size_pretty(temp_bytes) AS temp_bytes,
    CASE
        WHEN temp_bytes > 10737418240 THEN 'CRITICAL'  -- 10GB
        WHEN temp_bytes > 1073741824 THEN 'WARNING'   -- 1GB
        ELSE 'OK'
    END AS status
FROM pg_stat_database
WHERE datname = current_database();
```

---

## Configuration Recommendations

### Conservative Settings

```ini
# postgresql.conf
work_mem = 64MB           # Per operation
temp_file_limit = 5GB     # Per session
maintenance_work_mem = 1GB  # For VACUUM, CREATE INDEX
```

### For Analytics Workloads

```ini
# postgresql.conf
work_mem = 256MB
temp_file_limit = 20GB
hash_mem_multiplier = 2.0  # PostgreSQL 13+
```

### For OLTP Workloads

```ini
# postgresql.conf
work_mem = 32MB            # Keep low due to many connections
temp_file_limit = 1GB      # Prevent runaway queries
```

---

## Best Practices

1. **Set temp_file_limit** - Prevent runaway queries from filling disk
2. **Monitor temp file usage** - Track trends and alert on spikes
3. **Optimize heavy queries** - Add indexes, rewrite queries
4. **Use EXPLAIN ANALYZE** - Identify queries spilling to disk
5. **Increase work_mem judiciously** - Balance memory vs connections
6. **Use dedicated temp tablespace** - Separate temp files from data
7. **Process large data in batches** - Avoid single massive operations

---

## Conclusion

Temporary file limit errors indicate that queries are using more resources than expected. The solutions are:

1. **Increase limits** - `temp_file_limit` and `work_mem`
2. **Optimize queries** - Add indexes, rewrite inefficient patterns
3. **Process in batches** - Avoid massive single operations
4. **Monitor usage** - Track temp file growth and set alerts

Finding the right balance between memory allocation and temp file limits is key to stable database operation.

---

*Need to monitor your PostgreSQL temp file usage? [OneUptime](https://oneuptime.com) provides comprehensive database monitoring including temp file tracking, query analysis, and resource alerts.*
