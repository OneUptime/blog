# How to Monitor PostgreSQL Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PostgreSQL, Database, Performance, Monitoring, DBA

Description: Learn how to monitor PostgreSQL performance using built-in tools, pg_stat views, EXPLAIN ANALYZE, and external monitoring solutions.

---

PostgreSQL ships with a robust set of monitoring tools that most developers never fully explore. If your queries are slowing down or your database is eating up resources, you need visibility into what's happening under the hood. This guide walks you through the essential monitoring techniques that will help you identify bottlenecks and keep your PostgreSQL instance running smoothly.

## Why Performance Monitoring Matters

Database performance issues rarely announce themselves gracefully. They start small - a query that takes 200ms instead of 50ms - and gradually escalate until your application grinds to a halt. Proactive monitoring helps you catch these problems early, before they impact users.

## Monitoring Active Queries with pg_stat_activity

The `pg_stat_activity` view is your first stop when troubleshooting performance. It shows every connection to your database and what each one is doing right now.

```sql
-- Find currently running queries and their duration
SELECT
    pid,
    usename,
    application_name,
    state,
    query,
    now() - query_start AS duration,
    wait_event_type,
    wait_event
FROM pg_stat_activity
WHERE state = 'active'
  AND pid != pg_backend_pid()  -- Exclude this query
ORDER BY duration DESC;
```

| Column | What It Tells You |
|--------|-------------------|
| pid | Process ID you can use with pg_terminate_backend() |
| state | active, idle, idle in transaction |
| duration | How long the current query has been running |
| wait_event | What the process is waiting on (locks, I/O, etc.) |

To kill a runaway query:

```sql
-- Gracefully cancel a query
SELECT pg_cancel_backend(12345);

-- Force terminate if cancel doesn't work
SELECT pg_terminate_backend(12345);
```

## Tracking Query Performance with pg_stat_statements

The `pg_stat_statements` extension is essential for identifying slow queries over time. Unlike `pg_stat_activity` which shows the current moment, this extension aggregates statistics across all executions.

First, enable the extension:

```sql
-- Enable the extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

Add this to your `postgresql.conf`:

```ini
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
```

Now you can find your slowest queries:

```sql
-- Top 10 queries by total execution time
SELECT
    substring(query, 1, 80) AS short_query,
    calls,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    round(mean_exec_time::numeric, 2) AS avg_time_ms,
    round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percent_total
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

| Metric | Why It Matters |
|--------|----------------|
| calls | High call count with moderate time = optimization candidate |
| mean_exec_time | Identifies consistently slow queries |
| total_exec_time | Shows cumulative impact on your database |

## Analyzing Query Plans with EXPLAIN ANALYZE

When you've identified a slow query, `EXPLAIN ANALYZE` shows you exactly where time is being spent.

```sql
-- Always use ANALYZE to get actual execution times
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.order_id, c.name, p.product_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN products p ON o.product_id = p.id
WHERE o.created_at > '2026-01-01'
  AND c.region = 'US';
```

Key things to look for in the output:

- **Seq Scan** on large tables - usually means a missing index
- **Nested Loop** with high row counts - might need a different join strategy
- **Buffers: shared hit** vs **shared read** - high reads indicate cache misses

```sql
-- Compare estimated vs actual rows - large differences indicate stale statistics
EXPLAIN ANALYZE
SELECT * FROM orders WHERE status = 'pending';

-- If estimates are way off, update statistics
ANALYZE orders;
```

## Monitoring Index Usage

Indexes that aren't being used waste disk space and slow down writes. Here's how to find them:

```sql
-- Find unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelid NOT IN (
      SELECT conindid FROM pg_constraint WHERE contype IN ('p', 'u')
  )
ORDER BY pg_relation_size(indexrelid) DESC;
```

Check if your queries are hitting indexes:

```sql
-- Index hit ratio - should be above 95% for most workloads
SELECT
    relname,
    idx_scan,
    seq_scan,
    CASE WHEN idx_scan + seq_scan > 0
         THEN round(100.0 * idx_scan / (idx_scan + seq_scan), 2)
         ELSE 0
    END AS idx_hit_ratio
FROM pg_stat_user_tables
WHERE seq_scan + idx_scan > 100  -- Only tables with meaningful activity
ORDER BY seq_scan DESC;
```

## Vacuum and Autovacuum Monitoring

PostgreSQL's MVCC architecture requires regular vacuuming to reclaim dead tuples. Poor vacuum performance leads to table bloat and transaction ID wraparound issues.

```sql
-- Check vacuum status for all tables
SELECT
    schemaname,
    relname,
    n_live_tup,
    n_dead_tup,
    round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_ratio,
    last_vacuum,
    last_autovacuum,
    last_analyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

Monitor autovacuum workers:

```sql
-- See currently running autovacuum processes
SELECT
    pid,
    relid::regclass AS table_name,
    phase,
    heap_blks_scanned,
    heap_blks_total,
    round(100.0 * heap_blks_scanned / NULLIF(heap_blks_total, 0), 2) AS progress_pct
FROM pg_stat_progress_vacuum;
```

## Connection Monitoring

Running out of connections is a common production issue. Monitor your connection usage:

```sql
-- Current connection counts by state
SELECT
    state,
    usename,
    application_name,
    count(*) AS connections
FROM pg_stat_activity
GROUP BY state, usename, application_name
ORDER BY connections DESC;

-- Check against your max_connections limit
SELECT
    count(*) AS current_connections,
    current_setting('max_connections')::int AS max_allowed,
    round(100.0 * count(*) / current_setting('max_connections')::int, 2) AS usage_percent
FROM pg_stat_activity;
```

If you're regularly hitting connection limits, consider using PgBouncer or the built-in connection pooling in your application framework.

## Setting Up Alerting Thresholds

Based on the queries above, here are reasonable alerting thresholds to start with:

| Metric | Warning | Critical |
|--------|---------|----------|
| Connection usage | > 70% | > 90% |
| Index hit ratio | < 95% | < 90% |
| Dead tuple ratio | > 10% | > 20% |
| Query duration | > 5s | > 30s |
| Replication lag | > 30s | > 5min |

## Integration with External Monitoring

While PostgreSQL's built-in tools are powerful, you'll want to feed these metrics into your monitoring stack. Tools like OneUptime can query these pg_stat views on a schedule and alert you when thresholds are exceeded.

The key metrics to export:

```sql
-- Quick health check query for monitoring systems
SELECT
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') AS active_queries,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction') AS idle_in_txn,
    (SELECT sum(n_dead_tup) FROM pg_stat_user_tables) AS total_dead_tuples,
    (SELECT sum(xact_commit + xact_rollback) FROM pg_stat_database WHERE datname = current_database()) AS total_transactions;
```

## Wrapping Up

PostgreSQL gives you the tools to understand exactly what's happening inside your database. Start with `pg_stat_activity` for immediate troubleshooting, use `pg_stat_statements` to identify patterns over time, and dig into query plans with `EXPLAIN ANALYZE` when you need to optimize specific queries. Combine these with regular monitoring of vacuum health and connection usage, and you'll catch performance issues before they become outages.

The queries in this post can be scheduled to run periodically and feed into your alerting system. Set up dashboards for the key metrics, establish baselines for your workload, and you'll have visibility into your PostgreSQL performance that most teams lack.
