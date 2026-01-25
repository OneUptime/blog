# How to Use pg_stat_statements for Query Analysis in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Performance, Query Analysis, pg_stat_statements, Monitoring, Optimization

Description: Learn how to use pg_stat_statements to identify slow queries and optimize PostgreSQL performance. This guide covers setup, analysis queries, and performance tuning strategies.

---

pg_stat_statements is PostgreSQL's built-in extension for tracking query execution statistics. It records information about every query executed, including execution time, number of calls, and resource usage. This makes it invaluable for identifying slow queries, finding optimization opportunities, and understanding your database workload.

---

## Setting Up pg_stat_statements

### Install the Extension

```ini
# postgresql.conf
# Add to shared_preload_libraries (requires restart)
shared_preload_libraries = 'pg_stat_statements'

# Optional configuration
pg_stat_statements.max = 10000        # Max number of statements to track
pg_stat_statements.track = all        # Track all statements
pg_stat_statements.track_utility = on # Track utility commands (CREATE, ALTER, etc.)
pg_stat_statements.track_planning = on # Track planning time (PostgreSQL 13+)
```

Restart PostgreSQL and create the extension:

```bash
sudo systemctl restart postgresql
```

```sql
-- Create the extension in each database you want to monitor
CREATE EXTENSION pg_stat_statements;

-- Verify installation
SELECT * FROM pg_stat_statements LIMIT 1;
```

---

## Basic Query Analysis

### Find Slowest Queries

```sql
-- Top 10 slowest queries by total execution time
SELECT
    round(total_exec_time::numeric, 2) AS total_time_ms,
    calls,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percentage,
    substring(query, 1, 100) AS query_preview
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

### Find Most Frequently Called Queries

```sql
-- Top 10 most called queries
SELECT
    calls,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    rows,
    substring(query, 1, 100) AS query_preview
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;
```

### Find Queries with Highest Average Time

```sql
-- Queries with highest average execution time (minimum 100 calls)
SELECT
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_ms,
    calls,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    substring(query, 1, 100) AS query_preview
FROM pg_stat_statements
WHERE calls >= 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Advanced Analysis

### Resource Usage Analysis

```sql
-- Queries consuming the most resources
SELECT
    round(total_exec_time::numeric, 2) AS total_time_ms,
    round(total_plan_time::numeric, 2) AS plan_time_ms,
    calls,
    shared_blks_hit AS cache_hits,
    shared_blks_read AS disk_reads,
    round(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 2) AS cache_hit_ratio,
    temp_blks_written AS temp_writes,
    substring(query, 1, 80) AS query_preview
FROM pg_stat_statements
WHERE calls > 10
ORDER BY shared_blks_read DESC
LIMIT 10;
```

### Find Queries with Low Cache Hit Ratio

```sql
-- Queries doing excessive disk reads
SELECT
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    calls,
    shared_blks_hit AS cache_hits,
    shared_blks_read AS disk_reads,
    round(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 2) AS cache_hit_pct,
    substring(query, 1, 100) AS query_preview
FROM pg_stat_statements
WHERE shared_blks_hit + shared_blks_read > 1000
AND shared_blks_hit < shared_blks_read  -- More disk reads than cache hits
ORDER BY shared_blks_read DESC
LIMIT 10;
```

### Find Queries Using Temp Files

```sql
-- Queries writing to temp files (potential memory issues)
SELECT
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    calls,
    temp_blks_read,
    temp_blks_written,
    substring(query, 1, 100) AS query_preview
FROM pg_stat_statements
WHERE temp_blks_written > 0
ORDER BY temp_blks_written DESC
LIMIT 10;

-- These queries might benefit from increased work_mem
```

---

## Query Classification

### Group Queries by Type

```sql
-- Classify queries by operation type
SELECT
    CASE
        WHEN query ~* '^select' THEN 'SELECT'
        WHEN query ~* '^insert' THEN 'INSERT'
        WHEN query ~* '^update' THEN 'UPDATE'
        WHEN query ~* '^delete' THEN 'DELETE'
        ELSE 'OTHER'
    END AS query_type,
    count(*) AS query_count,
    round(sum(total_exec_time)::numeric, 2) AS total_time_ms,
    sum(calls) AS total_calls
FROM pg_stat_statements
GROUP BY 1
ORDER BY total_time_ms DESC;
```

### Identify Problem Tables

```sql
-- Extract table names and find problematic tables
-- Note: This is a heuristic approach
SELECT
    regexp_matches(query, 'FROM\s+(\w+)', 'i') AS table_name,
    count(*) AS query_count,
    round(sum(total_exec_time)::numeric, 2) AS total_time_ms,
    sum(calls) AS total_calls
FROM pg_stat_statements
WHERE query ~* 'FROM\s+\w+'
GROUP BY 1
ORDER BY total_time_ms DESC
LIMIT 20;
```

---

## Performance Comparison

### Before and After Optimization

```sql
-- Save current stats for comparison
CREATE TABLE query_stats_snapshot AS
SELECT
    queryid,
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    now() AS snapshot_time
FROM pg_stat_statements;

-- After making changes, compare:
SELECT
    current.queryid,
    substring(current.query, 1, 60) AS query,
    previous.calls AS old_calls,
    current.calls AS new_calls,
    round(previous.mean_exec_time::numeric, 2) AS old_mean_ms,
    round(current.mean_exec_time::numeric, 2) AS new_mean_ms,
    round((previous.mean_exec_time - current.mean_exec_time)::numeric, 2) AS improvement_ms,
    round(100 * (previous.mean_exec_time - current.mean_exec_time) / previous.mean_exec_time, 2) AS improvement_pct
FROM pg_stat_statements current
JOIN query_stats_snapshot previous USING (queryid)
WHERE previous.mean_exec_time > current.mean_exec_time
ORDER BY improvement_pct DESC
LIMIT 20;
```

---

## Automated Analysis Views

### Create Monitoring Views

```sql
-- Create a view for easy monitoring
CREATE VIEW slow_queries AS
SELECT
    queryid,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    calls,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_ms,
    rows,
    round(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 2) AS cache_hit_pct,
    temp_blks_written > 0 AS uses_temp,
    query
FROM pg_stat_statements
WHERE calls >= 10
ORDER BY mean_exec_time DESC;

-- Create a summary view
CREATE VIEW query_stats_summary AS
SELECT
    count(*) AS total_query_types,
    sum(calls) AS total_calls,
    round(sum(total_exec_time)::numeric / 1000, 2) AS total_time_seconds,
    round(avg(mean_exec_time)::numeric, 2) AS avg_query_time_ms,
    round(max(mean_exec_time)::numeric, 2) AS max_avg_time_ms,
    round(100.0 * sum(shared_blks_hit) /
        nullif(sum(shared_blks_hit + shared_blks_read), 0), 2) AS overall_cache_hit_pct
FROM pg_stat_statements;
```

---

## Regular Maintenance

### Reset Statistics

```sql
-- Reset all statistics (do this periodically for fresh data)
SELECT pg_stat_statements_reset();

-- Reset stats for specific user/database
SELECT pg_stat_statements_reset(
    userid => (SELECT oid FROM pg_roles WHERE rolname = 'myuser'),
    dbid => (SELECT oid FROM pg_database WHERE datname = 'mydb'),
    queryid => 0
);
```

### Automated Stats Collection

```sql
-- Create a table to store historical stats
CREATE TABLE query_stats_history (
    collected_at TIMESTAMP DEFAULT NOW(),
    queryid BIGINT,
    query TEXT,
    calls BIGINT,
    total_exec_time DOUBLE PRECISION,
    mean_exec_time DOUBLE PRECISION,
    rows BIGINT,
    shared_blks_hit BIGINT,
    shared_blks_read BIGINT,
    temp_blks_written BIGINT
);

-- Create a function to collect stats
CREATE OR REPLACE FUNCTION collect_query_stats()
RETURNS void AS $$
BEGIN
    INSERT INTO query_stats_history (
        queryid, query, calls, total_exec_time,
        mean_exec_time, rows, shared_blks_hit,
        shared_blks_read, temp_blks_written
    )
    SELECT
        queryid, query, calls, total_exec_time,
        mean_exec_time, rows, shared_blks_hit,
        shared_blks_read, temp_blks_written
    FROM pg_stat_statements
    WHERE calls > 100;  -- Only track significant queries

    -- Clean up old data
    DELETE FROM query_stats_history
    WHERE collected_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron
SELECT cron.schedule('collect_stats', '0 * * * *', 'SELECT collect_query_stats()');
```

---

## Optimization Workflow

### Step 1: Identify Candidates

```sql
-- Find optimization candidates
SELECT
    queryid,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    calls,
    round(total_exec_time::numeric, 2) AS total_ms,
    substring(query, 1, 200) AS query_preview
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Queries taking > 100ms
AND calls > 100             -- Called frequently
ORDER BY total_exec_time DESC
LIMIT 5;
```

### Step 2: Analyze with EXPLAIN

```sql
-- Get the full query
SELECT query FROM pg_stat_statements WHERE queryid = 123456789;

-- Run EXPLAIN ANALYZE on the query
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT ...  -- paste query here with sample parameters
```

### Step 3: Implement Fix

```sql
-- Common fixes:
-- 1. Add missing index
CREATE INDEX idx_orders_customer_date ON orders (customer_id, order_date);

-- 2. Rewrite query
-- Before: SELECT * FROM orders WHERE date_part('year', order_date) = 2026
-- After:  SELECT * FROM orders WHERE order_date >= '2026-01-01' AND order_date < '2027-01-01'

-- 3. Increase work_mem for specific query
SET work_mem = '256MB';
SELECT ...;
RESET work_mem;
```

### Step 4: Verify Improvement

```sql
-- Reset stats and let queries run
SELECT pg_stat_statements_reset();

-- Wait for sufficient samples, then check
SELECT
    round(mean_exec_time::numeric, 2) AS mean_ms,
    calls,
    substring(query, 1, 100) AS query_preview
FROM pg_stat_statements
WHERE queryid = 123456789;
```

---

## Integration with Monitoring

### Prometheus Metrics

```sql
-- Export metrics for Prometheus
SELECT
    'pg_stat_statements_total_time_seconds{database="' || d.datname || '"} ' ||
    round(sum(s.total_exec_time) / 1000, 2) AS metric
FROM pg_stat_statements s
JOIN pg_database d ON s.dbid = d.oid
GROUP BY d.datname;
```

### Alert Queries

```sql
-- Alert if any query averages over 1 second
SELECT
    queryid,
    mean_exec_time,
    query
FROM pg_stat_statements
WHERE mean_exec_time > 1000  -- 1 second
AND calls > 10
ORDER BY mean_exec_time DESC;

-- Alert if cache hit ratio drops
SELECT
    round(100.0 * sum(shared_blks_hit) /
        nullif(sum(shared_blks_hit + shared_blks_read), 0), 2) AS cache_hit_pct
FROM pg_stat_statements
HAVING round(100.0 * sum(shared_blks_hit) /
    nullif(sum(shared_blks_hit + shared_blks_read), 0), 2) < 95;
```

---

## Best Practices

1. **Reset stats periodically** - Weekly or after major changes
2. **Track before/after** - Save snapshots when optimizing
3. **Focus on total time** - High call count with moderate time can matter more than one slow query
4. **Check cache hit ratio** - Low ratio indicates need for more shared_buffers or better indexing
5. **Monitor temp usage** - Temp file writes indicate memory pressure
6. **Use queryid** - Stable identifier even when parameters change
7. **Filter noise** - Exclude pg_stat queries from analysis

---

## Conclusion

pg_stat_statements is essential for PostgreSQL performance tuning:

- **Identify slow queries** by total time, mean time, or call count
- **Analyze resource usage** including cache hits and temp file usage
- **Track improvements** by comparing before/after statistics
- **Automate monitoring** with scheduled collection and alerting

Regular analysis of pg_stat_statements data will help you maintain optimal database performance.

---

*Need to monitor your PostgreSQL query performance? [OneUptime](https://oneuptime.com) provides comprehensive database monitoring with automatic slow query detection, performance trending, and optimization recommendations.*
