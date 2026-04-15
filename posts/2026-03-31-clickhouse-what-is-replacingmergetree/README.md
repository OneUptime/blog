# What Is ReplacingMergeTree and When to Use It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ReplacingMergeTree, Deduplication, Upsert, MergeTree

Description: Learn what ReplacingMergeTree is in ClickHouse, how it deduplicates rows during merges, and when to use it for upsert-style workloads.

---

`ReplacingMergeTree` is a MergeTree variant that removes duplicate rows with the same sorting key (`ORDER BY` columns) during background merges. It is the standard approach for implementing upserts in ClickHouse, where the latest version of a record should replace earlier versions.

## How ReplacingMergeTree Works

When ClickHouse merges parts that contain rows with the same sorting key, `ReplacingMergeTree` keeps only one row per key - either the one with the highest version value or the most recently inserted row.

```sql
CREATE TABLE user_profiles (
  user_id  UInt64,
  name     String,
  email    String,
  updated  DateTime
) ENGINE = ReplacingMergeTree(updated)  -- use 'updated' as version column
ORDER BY user_id;
```

The `updated` column is the version key. When two rows have the same `user_id`, the one with the higher `updated` value is kept.

Without a version column, the last row from the most recently inserted part is kept.

## Inserting Updates

```sql
-- Initial insert
INSERT INTO user_profiles VALUES (1, 'Alice', 'alice@example.com', '2024-01-01 10:00:00');

-- Update: insert a newer version
INSERT INTO user_profiles VALUES (1, 'Alice', 'alice@new.com', '2024-01-15 12:00:00');
```

Before merges run, both rows exist. After a merge, only the row with `updated = '2024-01-15'` remains.

## The Critical Caveat: Deduplication Is Not Immediate

Deduplication only happens during background merges. A query run immediately after an insert may see both the old and new versions.

```sql
-- Force a merge to deduplicate immediately (not recommended in production)
OPTIMIZE TABLE user_profiles FINAL;

-- Or query with FINAL to deduplicate on read
SELECT * FROM user_profiles FINAL WHERE user_id = 1;
```

The `FINAL` modifier deduplicates at query time. It is slower than a regular scan but returns consistent results even before merges run.

## When to Use ReplacingMergeTree

Use `ReplacingMergeTree` when:
- You need to update records but want to append-only insert
- The most recent version of a record is always correct
- Queries can tolerate `FINAL` or you batch reads after merges

Common use cases:
- User profile tables updated from CDC (Change Data Capture)
- Status tables where state changes frequently
- Dimension tables that need periodic refreshes

## When Not to Use ReplacingMergeTree

Avoid `ReplacingMergeTree` when:
- You need immediate consistency on reads (use PostgreSQL or MySQL instead)
- The primary key is not unique per logical entity
- You need to track the full history of changes (use `CollapsingMergeTree` or a plain `MergeTree` with a version column)

## Checking for Unmerged Duplicates

```sql
SELECT user_id, count() AS versions
FROM user_profiles
GROUP BY user_id
HAVING versions > 1
ORDER BY versions DESC
LIMIT 20;
```

If this query returns rows, background merges have not yet deduplicated them.

## Summary

`ReplacingMergeTree` provides eventual deduplication by keeping the highest-version row per sorting key during merges. Use it for upsert-style workloads with a version or timestamp column. Always use the `FINAL` modifier or force a merge before querying when immediate consistency is required. It is not a substitute for transactional UPSERT semantics but is an efficient pattern for high-throughput dimension table updates.
