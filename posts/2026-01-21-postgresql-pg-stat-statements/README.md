# How to Monitor PostgreSQL with pg_stat_statements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, pg_stat_statements, Monitoring, Performance, Query Analysis

Description: A comprehensive guide to using pg_stat_statements for PostgreSQL query performance monitoring, covering installation, configuration, analysis queries, and integration with monitoring tools.

---

pg_stat_statements is the most essential extension for PostgreSQL performance monitoring. It tracks execution statistics for all SQL statements, helping you identify slow queries, resource-intensive operations, and optimization opportunities. This guide covers everything from setup to advanced analysis.

## Prerequisites

- PostgreSQL 9.4+ (significantly improved in 13+)
- Superuser access for installation
- Understanding of query patterns

## Installation

### Enable the Extension

```sql
-- Create extension (requires superuser)
CREATE EXTENSION pg_stat_statements;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';
```

### Configure postgresql.conf

```conf
# Add to shared_preload_libraries (requires restart)
shared_preload_libraries = 'pg_stat_statements'

# Configuration options
pg_stat_statements.max = 10000           # Max statements to track
pg_stat_statements.track = all           # all, top, or none
pg_stat_statements.track_utility = on    # Track non-DML statements
pg_stat_statements.track_planning = on   # Track planning time (v13+)
pg_stat_statements.save = on             # Save stats across restarts
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

## Basic Usage

### View All Statements

```sql
SELECT * FROM pg_stat_statements LIMIT 10;
```

### Key Columns

| Column | Description |
|--------|-------------|
| `query` | Normalized query text |
| `calls` | Number of executions |
| `total_exec_time` | Total execution time (ms) |
| `mean_exec_time` | Average execution time (ms) |
| `rows` | Total rows returned |
| `shared_blks_hit` | Shared buffer hits |
| `shared_blks_read` | Shared blocks read from disk |
| `temp_blks_read` | Temp blocks read |
| `temp_blks_written` | Temp blocks written |

## Finding Problem Queries

### Slowest Queries by Total Time

```sql
SELECT
    round(total_exec_time::numeric, 2) AS total_ms,
    calls,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS pct,
    query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

### Slowest Queries by Average Time

```sql
SELECT
    calls,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_ms,
    round(min_exec_time::numeric, 2) AS min_ms,
    round(max_exec_time::numeric, 2) AS max_ms,
    query
FROM pg_stat_statements
WHERE calls > 100  -- Exclude rare queries
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Most Frequently Called Queries

```sql
SELECT
    calls,
    round(total_exec_time::numeric, 2) AS total_ms,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    rows,
    query
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 20;
```

### Queries with High I/O

```sql
SELECT
    calls,
    shared_blks_hit,
    shared_blks_read,
    round(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 2) AS hit_ratio,
    temp_blks_read + temp_blks_written AS temp_blks,
    query
FROM pg_stat_statements
WHERE shared_blks_read > 1000
ORDER BY shared_blks_read DESC
LIMIT 20;
```

### Queries Using Temp Space

```sql
SELECT
    calls,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    temp_blks_read,
    temp_blks_written,
    query
FROM pg_stat_statements
WHERE temp_blks_written > 0
ORDER BY temp_blks_written DESC
LIMIT 20;
```

## Advanced Analysis

### Cache Hit Ratio by Query

```sql
SELECT
    query,
    calls,
    shared_blks_hit,
    shared_blks_read,
    CASE
        WHEN shared_blks_hit + shared_blks_read = 0 THEN 0
        ELSE round(100.0 * shared_blks_hit / (shared_blks_hit + shared_blks_read), 2)
    END AS cache_hit_ratio,
    round(mean_exec_time::numeric, 2) AS mean_ms
FROM pg_stat_statements
WHERE calls > 10
ORDER BY shared_blks_read DESC
LIMIT 20;
```

### Planning vs Execution Time (PostgreSQL 13+)

```sql
SELECT
    query,
    calls,
    round(total_plan_time::numeric, 2) AS plan_ms,
    round(total_exec_time::numeric, 2) AS exec_ms,
    round((100.0 * total_plan_time / nullif(total_plan_time + total_exec_time, 0))::numeric, 2) AS plan_pct,
    round(mean_exec_time::numeric, 2) AS mean_exec_ms
FROM pg_stat_statements
WHERE calls > 100
ORDER BY total_plan_time DESC
LIMIT 20;
```

### Query Throughput Analysis

```sql
-- Queries per minute (approximate)
SELECT
    query,
    calls,
    round(total_exec_time / 60000, 2) AS total_minutes,
    round(calls * 60000.0 / total_exec_time, 2) AS calls_per_minute
FROM pg_stat_statements
WHERE total_exec_time > 0
ORDER BY calls DESC
LIMIT 20;
```

### Find Similar Queries (Normalize Analysis)

```sql
-- Group similar queries
SELECT
    left(query, 50) AS query_prefix,
    count(*) AS variations,
    sum(calls) AS total_calls,
    sum(total_exec_time) AS total_time
FROM pg_stat_statements
GROUP BY left(query, 50)
HAVING count(*) > 1
ORDER BY sum(total_exec_time) DESC
LIMIT 20;
```

## Reset Statistics

### Reset All Statistics

```sql
SELECT pg_stat_statements_reset();
```

### Reset Specific User (PostgreSQL 14+)

```sql
-- Reset for specific user
SELECT pg_stat_statements_reset(
    userid => (SELECT oid FROM pg_roles WHERE rolname = 'app_user'),
    dbid => 0,
    queryid => 0
);
```

## Integration with Monitoring

### Prometheus Exporter Query

```sql
-- Create view for prometheus exporter
CREATE VIEW pg_stat_statements_metrics AS
SELECT
    queryid,
    dbid,
    userid,
    calls,
    total_exec_time,
    mean_exec_time,
    rows,
    shared_blks_hit,
    shared_blks_read,
    local_blks_hit,
    local_blks_read,
    temp_blks_read,
    temp_blks_written
FROM pg_stat_statements;
```

### Periodic Snapshots

```sql
-- Create snapshot table
CREATE TABLE pg_stat_statements_history (
    snapshot_time TIMESTAMP DEFAULT NOW(),
    queryid BIGINT,
    dbid OID,
    userid OID,
    query TEXT,
    calls BIGINT,
    total_exec_time DOUBLE PRECISION,
    mean_exec_time DOUBLE PRECISION,
    rows BIGINT,
    shared_blks_hit BIGINT,
    shared_blks_read BIGINT
);

-- Take snapshot
INSERT INTO pg_stat_statements_history
SELECT
    NOW(),
    queryid, dbid, userid, query, calls,
    total_exec_time, mean_exec_time, rows,
    shared_blks_hit, shared_blks_read
FROM pg_stat_statements;

-- Compare snapshots
SELECT
    h1.query,
    h2.calls - h1.calls AS new_calls,
    h2.total_exec_time - h1.total_exec_time AS new_time_ms
FROM pg_stat_statements_history h1
JOIN pg_stat_statements_history h2
    ON h1.queryid = h2.queryid
WHERE h1.snapshot_time = '2026-01-20 00:00:00'
  AND h2.snapshot_time = '2026-01-21 00:00:00'
ORDER BY new_time_ms DESC
LIMIT 20;
```

## Best Practices

### Configuration Recommendations

```conf
# Track enough statements
pg_stat_statements.max = 10000

# Track all queries including nested
pg_stat_statements.track = all

# Track planning for optimization
pg_stat_statements.track_planning = on

# Save across restarts
pg_stat_statements.save = on
```

### Regular Analysis

```sql
-- Weekly: Top resource consumers
SELECT
    query,
    calls,
    round(total_exec_time::numeric / 1000, 2) AS total_seconds,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 50;

-- Reset after analysis (optional)
-- SELECT pg_stat_statements_reset();
```

### Security Considerations

```sql
-- Limit access to statistics
REVOKE SELECT ON pg_stat_statements FROM PUBLIC;
GRANT SELECT ON pg_stat_statements TO monitoring_role;

-- Create sanitized view (hide query text)
CREATE VIEW pg_stat_statements_safe AS
SELECT
    queryid,
    calls,
    total_exec_time,
    mean_exec_time,
    rows,
    shared_blks_hit,
    shared_blks_read
FROM pg_stat_statements;
```

## Troubleshooting

### Extension Not Loading

```sql
-- Check shared_preload_libraries
SHOW shared_preload_libraries;

-- Verify module is available
SELECT * FROM pg_available_extensions WHERE name = 'pg_stat_statements';
```

### No Statistics Appearing

```sql
-- Check track setting
SHOW pg_stat_statements.track;

-- Verify extension is created in current database
SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';
```

### High Memory Usage

```conf
# Reduce max statements if needed
pg_stat_statements.max = 5000
```

## Conclusion

pg_stat_statements is essential for PostgreSQL performance monitoring:

1. **Enable it** on all production systems
2. **Review regularly** for problem queries
3. **Track trends** with periodic snapshots
4. **Integrate** with your monitoring stack
5. **Reset periodically** to see recent patterns

Combined with EXPLAIN ANALYZE, pg_stat_statements gives you complete visibility into query performance.
