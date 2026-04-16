# How to Use ReplacingMergeTree Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ReplacingMergeTree, Table Engine, Deduplication, SQL

Description: Learn how to use ReplacingMergeTree in ClickHouse to deduplicate rows with the same primary key, keeping only the latest version of each record.

---

## Overview

`ReplacingMergeTree` is a ClickHouse table engine that removes duplicate rows sharing the same sorting key during background merges. It is designed for use cases where you ingest updates as new rows and want ClickHouse to eventually converge to one row per entity. It is commonly used for upsert-style pipelines.

## Creating a ReplacingMergeTree Table

```sql
CREATE TABLE user_states
(
    user_id     UInt64,
    name        String,
    status      String,
    updated_at  DateTime
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY user_id;
```

The optional parameter `updated_at` is the version column - ClickHouse keeps the row with the highest value of this column when deduplicating rows with the same `ORDER BY` key.

## Inserting Updates

```sql
INSERT INTO user_states VALUES
(1, 'Alice', 'active',   '2024-06-01 10:00:00'),
(2, 'Bob',   'inactive', '2024-06-01 10:00:00');

-- Later update: Bob became active
INSERT INTO user_states VALUES
(2, 'Bob', 'active', '2024-06-02 08:00:00');
```

Both rows for `user_id = 2` exist until a merge runs.

## Reading with FINAL

Use `FINAL` to get deduplicated results before a merge has occurred:

```sql
SELECT user_id, name, status, updated_at
FROM user_states FINAL
ORDER BY user_id
```

Output:

```text
user_id | name  | status | updated_at
1       | Alice | active | 2024-06-01 10:00:00
2       | Bob   | active | 2024-06-02 08:00:00
```

`FINAL` is slower than a regular scan because it performs deduplication on the fly.

## Forcing a Merge

In development, force a merge to see the deduplicated state:

```sql
OPTIMIZE TABLE user_states FINAL;
```

After this, reading without `FINAL` will show deduplicated rows.

## Version Column Behavior

Without a version column, `ReplacingMergeTree()` keeps the most recently inserted row among duplicates participating in a merge:

```sql
-- No version column: arbitrary winner
CREATE TABLE events_v1
(
    id      UInt64,
    payload String
)
ENGINE = ReplacingMergeTree()
ORDER BY id;
```

With a version column, the row with the highest version value wins:

```sql
-- With version: row with highest version wins
ENGINE = ReplacingMergeTree(version_number)
```

## Soft Deletes with is_deleted

A common pattern is adding an `is_deleted` flag for logical deletes:

```sql
CREATE TABLE products
(
    product_id  UInt64,
    name        String,
    price       Float64,
    is_deleted  UInt8,
    updated_at  DateTime
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY product_id;

-- Soft delete a product
INSERT INTO products VALUES (42, 'Widget', 9.99, 1, now());

-- Query excluding deleted
SELECT * FROM products FINAL WHERE is_deleted = 0
```

## Partition Design

Combine with partitioning for faster merges and easier data management:

```sql
CREATE TABLE order_states
(
    order_id    UInt64,
    status      String,
    updated_at  DateTime
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(updated_at)
ORDER BY order_id;
```

## Limitations

- Physical merges (background and `OPTIMIZE TABLE`) only occur within a single partition, so duplicates of the same sorting key that land in different partitions are never permanently collapsed. `SELECT ... FINAL` does reconcile duplicates across partitions at query time by default, but this is expensive; the `do_not_merge_across_partitions_select_final` setting disables it. Best practice is to choose a partition key such that the same sorting key never appears in more than one partition.
- Reading with `FINAL` adds latency - optimize for read-heavy workloads by triggering regular `OPTIMIZE TABLE` operations.
- Not suitable for high-frequency per-row updates at very high throughput. Consider ClickHouse's CollapsingMergeTree or an external upsert buffer.

## Summary

`ReplacingMergeTree` is the standard ClickHouse engine for implementing upsert semantics. Insert all versions of a row and use a version column to declare which row wins. Query with `FINAL` for always-correct deduplicated reads, or run `OPTIMIZE TABLE` to materialize the merge and reduce read overhead in production.
