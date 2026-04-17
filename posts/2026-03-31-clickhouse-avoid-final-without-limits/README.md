# Why You Should Avoid Using FINAL Without Limits in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, FINAL, ReplacingMergeTree, Query Optimization, Performance

Description: Explains the performance cost of the FINAL modifier in ClickHouse and how to use it responsibly with filters, sampling, or alternative deduplication strategies.

---

## What FINAL Does

ClickHouse's ReplacingMergeTree and CollapsingMergeTree engines remove duplicate rows during background merges. Until a merge runs, duplicates coexist on disk. The `FINAL` modifier forces ClickHouse to deduplicate at query time, guaranteeing correct results regardless of merge state.

```sql
-- Without FINAL: may return duplicates if merges are pending
SELECT user_id, name, status FROM users WHERE user_id = 42;

-- With FINAL: always returns deduplicated result
SELECT user_id, name, status FROM users FINAL WHERE user_id = 42;
```

## Why FINAL Is Expensive on Full Scans

`FINAL` makes ClickHouse:
1. Read parts in the queried data range (partition pruning and primary key filters still apply)
2. Sort and merge them to deduplicate matching rows
3. Evaluate predicates on non-key columns and GROUP BY on the merged result

On a table with 1 billion rows scanned by `FINAL`, this is a heavy merge step before aggregation runs.

```sql
-- BAD: FINAL on a full-scan aggregation
SELECT toStartOfDay(event_time) AS day, count() AS sessions
FROM user_sessions FINAL
GROUP BY day
ORDER BY day;
```

## Limiting FINAL's Scope with Partitions

Use partition-level queries to limit how much data `FINAL` needs to process:

```sql
-- BETTER: constrain to a recent partition
SELECT user_id, name, status
FROM users FINAL
WHERE toYYYYMM(updated_at) = toYYYYMM(today())
  AND user_id IN (42, 43, 44);
```

## Alternative: Query Without FINAL Using argMax

For read-heavy workloads, use `argMax` to get the latest value without `FINAL`:

```sql
-- Get latest state per user without FINAL
SELECT
  user_id,
  argMax(name, updated_at) AS name,
  argMax(status, updated_at) AS status
FROM users
WHERE event_date >= today() - 7
GROUP BY user_id;
```

## Trigger Merges Proactively

Run `OPTIMIZE TABLE` during low-traffic windows to ensure data is already merged:

```sql
-- Force merge for a partition so FINAL has less work
OPTIMIZE TABLE users PARTITION 202603 FINAL;
```

After optimization, `FINAL` queries on that partition are cheaper.

## Checking Deduplication State

```sql
-- Check how many active parts exist per partition
SELECT partition, count() AS parts
FROM system.parts
WHERE table = 'users' AND active = 1
GROUP BY partition
ORDER BY parts DESC;
```

Partitions with many parts benefit most from `OPTIMIZE`.

## Use FINAL Only When Correctness Is Required

For dashboards where approximate counts are acceptable, skip `FINAL` entirely and accept slight double-counting. Reserve `FINAL` for record lookups and correctness-critical queries with narrow WHERE clauses.

## Summary

`FINAL` in ClickHouse deduplicates data at query time by merging parts in memory, which is expensive on full-table scans. Limit its impact by combining it with narrow WHERE clauses or partition filters. Use `argMax` as a `FINAL`-free alternative for aggregations. Run `OPTIMIZE TABLE` on partitions to reduce active part counts so `FINAL` has less work to do.
