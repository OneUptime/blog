# How to Use FINAL Keyword Efficiently in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ReplacingMergeTree, Query Optimization, Performance

Description: Learn when and how to use the FINAL keyword in ClickHouse ReplacingMergeTree queries, and strategies to avoid its performance costs.

---

## What Is FINAL?

The `FINAL` keyword forces ClickHouse to apply merge logic at query time, returning deduplicated or aggregated results as if all background merges had completed. It is primarily used with `ReplacingMergeTree` and `CollapsingMergeTree` tables.

```sql
-- Without FINAL: may return multiple versions of the same row
SELECT user_id, name, email FROM users ORDER BY user_id;

-- With FINAL: returns only the latest version per primary key
SELECT user_id, name, email FROM users FINAL ORDER BY user_id;
```

## When You Need FINAL

`FINAL` is necessary when:

- You use `ReplacingMergeTree` and need accurate deduplicated reads
- You use `CollapsingMergeTree` and need collapsed results
- You cannot wait for background merges to complete
- You need consistent point-in-time reads

## Performance Impact

`FINAL` can be expensive because it:

- Applies merge logic across all relevant parts at query time
- Reads more data and deduplicates in memory
- May reduce effective parallelism compared to non-FINAL queries unless parallel FINAL settings are tuned

Check the impact:

```sql
-- Measure rows before and after FINAL
SELECT count() FROM users;         -- raw rows (may include duplicates)
SELECT count() FROM users FINAL;   -- deduplicated rows

-- See query performance difference
SELECT query, query_duration_ms, read_rows
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%users FINAL%'
ORDER BY event_time DESC
LIMIT 5;
```

## Enabling Parallel FINAL (ClickHouse 22.6+)

Since ClickHouse 22.6, `FINAL` supports parallel processing:

```sql
-- Enable parallel FINAL globally
SET max_threads = 8;
SET do_not_merge_across_partitions_select_final = 1;

-- Or per query
SELECT *
FROM users FINAL
SETTINGS
    max_threads = 8,
    do_not_merge_across_partitions_select_final = 1;
```

## Strategy 1 - Use FINAL Only for Small Tables

For large tables, avoid FINAL in production queries. Reserve it for:

- Administrative queries
- Data validation
- Small lookup tables

```sql
-- OK for admin validation
SELECT count(), countDistinct(user_id) FROM users FINAL;

-- Avoid for hot production queries on tables with billions of rows
```

## Strategy 2 - Use optimize_on_insert

Configure inserts to trigger a merge immediately:

```sql
-- Force merge on insert to reduce duplicates over time
INSERT INTO users
SETTINGS optimize_on_insert = 1
VALUES (1001, 'Alice', 'alice@example.com', now());
```

Or use OPTIMIZE TABLE to trigger merges manually:

```sql
-- Merge a specific partition
OPTIMIZE TABLE users PARTITION '202401';

-- Force final merge (use carefully in production)
OPTIMIZE TABLE users FINAL;
```

## Strategy 3 - Use a Materialized View for Pre-Aggregated Results

Instead of querying with FINAL, maintain a separate aggregated table:

```sql
-- Source table with ReplacingMergeTree
CREATE TABLE users (
    user_id UInt64,
    name String,
    email String,
    version UInt64
) ENGINE = ReplacingMergeTree(version)
ORDER BY user_id;

-- Pre-aggregated summary table (no FINAL needed)
CREATE TABLE user_stats (
    date Date,
    active_users UInt64
) ENGINE = SummingMergeTree()
ORDER BY date;

-- Materialized view populates stats
CREATE MATERIALIZED VIEW mv_user_stats TO user_stats AS
SELECT today() AS date, 1 AS active_users
FROM users;
```

## Strategy 4 - Use LIMIT with FINAL

Adding LIMIT can dramatically reduce FINAL's overhead if you only need top results:

```sql
-- FINAL with LIMIT is much cheaper than FINAL on the full table
SELECT user_id, name, email
FROM users FINAL
ORDER BY created_at DESC
LIMIT 100;
```

## Strategy 5 - Partition-Level Optimization

Since parallel FINAL works per partition, use narrow partition filters:

```sql
-- FINAL only across 1 partition is much faster than the full table
SELECT *
FROM users FINAL
WHERE toYYYYMM(created_at) = 202401;
```

## Checking How Many Duplicates Exist

Before deciding on a FINAL strategy, measure duplication:

```sql
SELECT
    count() AS total_rows,
    countDistinct(user_id) AS unique_users,
    total_rows - unique_users AS duplicates
FROM users;
```

If `duplicates` is near zero, background merges are keeping up and FINAL may not be necessary.

## Summary

The `FINAL` keyword in ClickHouse forces deduplication at query time for ReplacingMergeTree and CollapsingMergeTree tables. Use it selectively - it is expensive on large tables because it forces a single-threaded merge. Enable parallel FINAL in ClickHouse 22.6+ with `do_not_merge_across_partitions_select_final = 1`, use partition pruning to narrow the merge scope, and consider OPTIMIZE TABLE or pre-aggregated Materialized Views as alternatives.
