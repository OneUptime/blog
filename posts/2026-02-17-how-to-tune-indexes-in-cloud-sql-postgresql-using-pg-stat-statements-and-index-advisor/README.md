# How to Tune Indexes in Cloud SQL PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, PostgreSQL, Index Tuning, Pg_stat_statements

Description: Learn how to use pg_stat_statements and Cloud SQL Index Advisor to identify missing indexes, drop unused ones, and optimize index strategy in PostgreSQL.

---

Indexes are the most impactful performance tool in PostgreSQL. A well-chosen index turns a multi-second query into a millisecond one. A missing index lets a simple lookup scan millions of rows. And unused indexes waste disk space and slow down writes. The challenge is knowing which indexes to create and which to remove. Cloud SQL PostgreSQL gives you two powerful tools for this: the pg_stat_statements extension for understanding your query workload, and the Index Advisor for getting specific index recommendations.

## Enabling pg_stat_statements

pg_stat_statements tracks execution statistics for all SQL statements. On Cloud SQL, it is a supported PostgreSQL extension. Create it in your database:

```sql
-- Create the extension in your database
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

## Finding the Most Expensive Queries

Start by identifying the queries that consume the most resources:

```sql
-- Top 20 queries by total execution time
-- These are your biggest opportunities for optimization
SELECT
  queryid,
  SUBSTR(query, 1, 100) AS query_preview,
  calls,
  ROUND(total_exec_time::numeric / 1000, 2) AS total_time_sec,
  ROUND(mean_exec_time::numeric, 2) AS avg_ms,
  ROUND(stddev_exec_time::numeric, 2) AS stddev_ms,
  rows,
  ROUND((shared_blks_hit::numeric / NULLIF(shared_blks_hit + shared_blks_read, 0)) * 100, 2) AS cache_hit_pct
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY total_exec_time DESC
LIMIT 20;
```

The most important column is `total_exec_time` because it combines frequency and duration. A query running 50,000 times at 20ms each uses more resources than one running once at 5 seconds.

## Identifying Queries That Need Indexes

Look for queries with a poor rows-to-blocks ratio, indicating full table scans:

```sql
-- Queries with high block reads relative to rows returned
-- These are likely doing full table scans
SELECT
  queryid,
  SUBSTR(query, 1, 120) AS query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) AS avg_ms,
  ROUND(rows::numeric / calls, 2) AS avg_rows_returned,
  shared_blks_read + shared_blks_hit AS total_blocks,
  ROUND(
    (shared_blks_read + shared_blks_hit)::numeric / NULLIF(rows, 0), 2
  ) AS blocks_per_row
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND calls > 100  -- Only consider queries that run frequently
  AND rows > 0
ORDER BY (shared_blks_read + shared_blks_hit)::numeric / NULLIF(rows, 0) DESC
LIMIT 20;
```

A high blocks_per_row value means the query is reading a lot of data to return each row. For point lookups, this should be in single digits. If it is in the hundreds or thousands, the query likely needs an index.

## Using Cloud SQL Index Advisor

Cloud SQL's Index Advisor analyzes your workload and suggests indexes. It requires a Cloud SQL Enterprise Plus instance with Query Insights and Index Advisor enabled. Access it through the Cloud SQL console or query the recommendations:

```sql
-- View index recommendations from the advisor
-- These are based on actual query patterns tracked by the advisor
SELECT
  index AS suggested_index,
  estimated_storage_size_in_mb,
  affected_queries
FROM google_db_advisor_recommended_indexes
ORDER BY affected_queries DESC;
```

The advisor looks at your actual query patterns and suggests specific indexes. Each recommendation includes a complete `CREATE INDEX` statement, the estimated storage required, and the number of queries that would benefit.

## Finding Unused Indexes

Indexes that are never used waste disk space and slow down every write operation:

```sql
-- Find indexes that have never been used since the last stats reset
-- Candidates for removal
SELECT
  schemaname,
  relname AS tablename,
  indexrelname AS indexname,
  idx_scan AS times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'  -- Keep primary keys
ORDER BY pg_relation_size(indexrelid) DESC;
```

Before dropping an index, check how long the stats have been collecting:

```sql
-- Check when statistics were last reset
SELECT stats_reset
FROM pg_stat_database
WHERE datname = current_database();
```

If stats were reset yesterday, an index with 0 scans might just not have been used today. Wait for at least a full business cycle (ideally a month) before dropping unused indexes.

## Finding Duplicate and Redundant Indexes

Duplicate indexes are wasteful. For B-tree indexes, if you have an index on (a, b) and another on (a), the first index already covers queries that filter on just (a):

```sql
-- Find potentially redundant indexes
-- An index on (a, b) makes a standalone index on (a) redundant
WITH index_info AS (
  SELECT
    t.relname AS table_name,
    i.relname AS index_name,
    array_to_string(ARRAY(
      SELECT a.attname
      FROM unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      ORDER BY k.ord
    ), ', ') AS index_columns,
    ARRAY(SELECT unnest(ix.indkey))::int2[] AS key_array,
    pg_relation_size(i.oid) AS index_size
  FROM pg_index ix
  JOIN pg_class t ON t.oid = ix.indrelid
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  JOIN pg_am am ON am.oid = i.relam
  WHERE n.nspname = 'public'
    AND am.amname = 'btree'
    AND ix.indexprs IS NULL
)
SELECT
  a.table_name,
  a.index_name AS redundant_index,
  a.index_columns AS redundant_columns,
  b.index_name AS covering_index,
  b.index_columns AS covering_columns,
  pg_size_pretty(a.index_size) AS wasted_space
FROM index_info a
JOIN index_info b ON a.table_name = b.table_name
  AND a.index_name != b.index_name
  AND a.key_array = b.key_array[1:array_length(a.key_array, 1)]  -- a's columns are a left-prefix of b's
ORDER BY a.index_size DESC;
```

## Index Usage Statistics

Get a comprehensive view of how your indexes are being used:

```sql
-- Index usage overview for each table
SELECT
  schemaname,
  relname AS table_name,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  CASE
    WHEN seq_scan + idx_scan = 0 THEN 'no scans'
    ELSE ROUND(idx_scan::numeric / (seq_scan + idx_scan) * 100, 1) || '%'
  END AS index_usage_pct
FROM pg_stat_user_tables
ORDER BY seq_scan DESC
LIMIT 20;
```

Tables with high seq_scan counts and low idx_scan counts are candidates for new indexes. A table with 90 percent sequential scans is being read without indexes most of the time.

## Creating Better Indexes

Once you have identified the problematic queries, create targeted indexes:

```sql
-- Partial index: only indexes rows matching a condition
-- Great for queries that always filter on status
CREATE INDEX idx_orders_active ON orders(customer_id, order_date)
WHERE status = 'active';

-- Covering index: includes extra columns to avoid table lookups
-- The INCLUDE columns are stored in the index but not part of the key
CREATE INDEX idx_orders_customer_covering ON orders(customer_id)
INCLUDE (order_date, total, status);

-- Expression index: index on a function result
-- Useful for queries that filter on transformed values
CREATE INDEX idx_users_lower_email ON users(LOWER(email));

-- Multicolumn index: column order matters!
-- Put the most selective column first, then the range column
CREATE INDEX idx_events_user_date ON events(user_id, event_date);
```

## Validating Index Effectiveness

After creating an index, verify it is being used:

```sql
-- Check if the new index is being picked up by the query planner
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders
WHERE customer_id = 42
  AND status = 'active'
ORDER BY order_date DESC
LIMIT 10;
```

Look for "Index Scan using idx_orders_active" in the output. If PostgreSQL ignores your new index, possible reasons include:

- The table is small enough that a sequential scan is cheaper
- Statistics are stale (run ANALYZE on the table)
- The query does not match the index structure

```sql
-- Update statistics after creating new indexes
ANALYZE orders;
```

## Monitoring After Changes

Reset pg_stat_statements after making index changes to get clean measurements:

```sql
-- Reset statistics to measure the impact of your changes
SELECT pg_stat_statements_reset();

-- Wait a day, then check the same expensive queries
-- Compare total_exec_time and mean_exec_time to before
SELECT
  SUBSTR(query, 1, 100) AS query_preview,
  calls,
  ROUND(total_exec_time::numeric / 1000, 2) AS total_time_sec,
  ROUND(mean_exec_time::numeric, 2) AS avg_ms
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY total_exec_time DESC
LIMIT 20;
```

## The Index Tuning Cycle

Index tuning is not a one-time activity. Here is the cycle I recommend:

1. Review pg_stat_statements weekly for the top expensive queries
2. Check Index Advisor recommendations monthly
3. Identify and drop unused indexes quarterly
4. After schema changes or new features, check for new indexing needs
5. Keep monitoring to catch regressions early

The combination of pg_stat_statements for understanding your workload and Index Advisor for actionable recommendations gives you a data-driven approach to index management. No more guessing, no more over-indexing, just targeted optimizations based on actual database behavior.
