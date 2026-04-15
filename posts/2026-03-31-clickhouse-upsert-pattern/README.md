# How to Implement UPSERT Pattern in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Upsert, ReplacingMergeTree, Insert, Deduplication, Data Pattern

Description: Learn how to implement UPSERT semantics in ClickHouse using ReplacingMergeTree and insert-based patterns since ClickHouse lacks native INSERT OR UPDATE.

---

ClickHouse does not support traditional `INSERT OR UPDATE` (UPSERT) syntax found in PostgreSQL or MySQL. Instead, ClickHouse is designed around append-only ingestion with deduplication handled at merge time. This guide shows you the practical patterns for implementing UPSERT semantics.

## Pattern 1 - ReplacingMergeTree

The most common UPSERT pattern uses `ReplacingMergeTree`, which keeps the latest version of a row with the same sorting key (defined by `ORDER BY`):

```sql
CREATE TABLE user_profiles (
    user_id UInt64,
    name String,
    email String,
    updated_at DateTime
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY user_id;
```

To "upsert", just insert the new version:

```sql
INSERT INTO user_profiles VALUES
    (42, 'Alice', 'alice@example.com', now());

-- Update: insert a newer version
INSERT INTO user_profiles VALUES
    (42, 'Alice Smith', 'alice@example.com', now());
```

During merges, ClickHouse keeps only the row with the highest `updated_at` value.

## Reading Deduplicated Data

Because deduplication happens at merge time, you must use `FINAL` to get consistent results before a merge occurs:

```sql
SELECT * FROM user_profiles FINAL WHERE user_id = 42;
```

Or use a subquery approach for better performance at scale:

```sql
SELECT *
FROM (
    SELECT *, row_number() OVER (PARTITION BY user_id ORDER BY updated_at DESC) AS rn
    FROM user_profiles
)
WHERE rn = 1;
```

## Pattern 2 - CollapsingMergeTree

For write-heavy UPSERT workloads, `CollapsingMergeTree` lets you explicitly cancel old rows:

```sql
CREATE TABLE order_status (
    order_id UInt64,
    status String,
    sign Int8
) ENGINE = CollapsingMergeTree(sign)
ORDER BY order_id;

-- Insert original
INSERT INTO order_status VALUES (100, 'pending', 1);

-- Upsert: cancel old row, insert new
INSERT INTO order_status VALUES
    (100, 'pending', -1),
    (100, 'shipped', 1);
```

Collapsing happens during background merges. To get correct results before a merge, use aggregation:

```sql
SELECT order_id, argMax(status, sign) AS status
FROM order_status
GROUP BY order_id
HAVING sum(sign) > 0;
```

## Pattern 3 - Using INSERT with Dedup

For ClickHouse Keeper-backed replicated tables, enable `insert_deduplicate`:

```sql
SET insert_deduplicate = 1;
INSERT INTO events VALUES (1, 'click', '2024-01-15 10:30:00');
-- Re-inserting the same block is safe - it will be deduplicated
INSERT INTO events VALUES (1, 'click', '2024-01-15 10:30:00');
```

Note that deduplication works at the block level — two INSERT blocks with identical data are deduplicated. If the data differs (e.g., different timestamps), they are treated as separate blocks.

This prevents duplicate inserts but does not handle key-based replacement.

## Summary

ClickHouse UPSERT is best implemented via `ReplacingMergeTree` for key-based deduplication with version tracking, `CollapsingMergeTree` for explicit row cancellation, or insert deduplication for idempotent writes. Choose the pattern that fits your consistency requirements and query read patterns.
