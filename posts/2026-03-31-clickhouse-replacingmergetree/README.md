# How to Use ReplacingMergeTree in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ReplacingMergeTree, Deduplication, Database, Engine, SQL

Description: Learn how to use the ReplacingMergeTree engine in ClickHouse to deduplicate rows with the same primary key, keeping only the latest version based on a version column.

---

ReplacingMergeTree is a ClickHouse table engine that automatically deduplicates rows sharing the same `ORDER BY` key during background merges. It keeps either the last inserted row or the row with the highest version value. This makes it the go-to engine for mutable datasets in ClickHouse where you need to update records over time.

## What Is ReplacingMergeTree?

In standard MergeTree, inserting a row with the same key as an existing row creates a duplicate - both rows coexist. ReplacingMergeTree addresses this by collapsing duplicates during merges, keeping only one "winner" row per key.

```sql
ENGINE = ReplacingMergeTree([ver [, is_deleted]])
```

- Without `ver`: the last inserted row wins.
- With `ver`: the row with the highest version value wins. If values are equal, the last inserted wins.
- With `is_deleted` (since ClickHouse 23.2): rows where `is_deleted = 1` are physically removed during merges.

## Creating a ReplacingMergeTree Table

```sql
CREATE TABLE user_profiles
(
    user_id      UInt64,
    username     String,
    email        String,
    plan         LowCardinality(String),
    updated_at   DateTime,
    version      UInt64
)
ENGINE = ReplacingMergeTree(version)
ORDER BY user_id;
```

## Inserting and Updating Records

```sql
-- Initial insert
INSERT INTO user_profiles VALUES (1, 'alice', 'alice@example.com', 'free', '2026-01-01 00:00:00', 1);
INSERT INTO user_profiles VALUES (2, 'bob',   'bob@example.com',   'pro',  '2026-01-01 00:00:00', 1);

-- Update user 1's plan (insert a new version)
INSERT INTO user_profiles VALUES (1, 'alice', 'alice@example.com', 'pro', '2026-03-01 00:00:00', 2);
```

After the background merge, only the row with `version = 2` survives for `user_id = 1`.

## The FINAL Keyword: Query Deduplicated Data

Merges happen in the background and are not guaranteed to be complete. Use `FINAL` to force deduplication at query time:

```sql
-- Without FINAL: may return duplicates if merges are pending
SELECT * FROM user_profiles WHERE user_id = 1;

-- With FINAL: always returns exactly one row per key
SELECT * FROM user_profiles FINAL WHERE user_id = 1;
```

```text
-- Result with FINAL:
┌─user_id─┬─username─┬─email─────────────┬─plan─┬──────────updated_at─┬─version─┐
│       1 │ alice    │ alice@example.com │ pro  │ 2026-03-01 00:00:00 │       2 │
└─────────┴──────────┴───────────────────┴──────┴─────────────────────┴─────────┘
```

## Using Version Columns Effectively

The version should be a monotonically increasing value. Common choices:

```sql
-- Unix timestamp as version (good for event-driven updates)
CREATE TABLE orders
(
    order_id      UInt64,
    status        LowCardinality(String),
    total_amount  Float64,
    updated_at    DateTime,
    version       UInt64  -- use toUnixTimestamp(updated_at) on insert
)
ENGINE = ReplacingMergeTree(version)
ORDER BY order_id;

INSERT INTO orders
SELECT
    order_id,
    status,
    total_amount,
    updated_at,
    toUnixTimestamp(updated_at) AS version
FROM source_orders;
```

## Handling Deletions with is_deleted

Since ClickHouse 23.2, ReplacingMergeTree supports a native `is_deleted` column parameter. Rows with `is_deleted = 1` are physically removed during background merges:

```sql
CREATE TABLE products
(
    product_id   UInt64,
    name         String,
    price        Float64,
    is_deleted   UInt8,   -- 0 = active, 1 = deleted
    version      UInt64
)
ENGINE = ReplacingMergeTree(version, is_deleted)
ORDER BY product_id;

-- Mark as deleted (insert with higher version and is_deleted=1)
INSERT INTO products VALUES (42, 'Old Product', 0.0, 1, 9999999999);

-- Query active rows (deleted rows are also removed during merges)
SELECT * FROM products FINAL WHERE is_deleted = 0;
```

## CDC (Change Data Capture) Pattern

ReplacingMergeTree is ideal for syncing relational database changes into ClickHouse:

```sql
CREATE TABLE customers
(
    customer_id  UInt64,
    name         String,
    email        String,
    country      LowCardinality(String),
    is_active    UInt8,
    db_updated_at DateTime,
    sign         Int8,    -- 1 for inserts/updates, -1 for logical deletes
    version      UInt64
)
ENGINE = ReplacingMergeTree(version)
ORDER BY customer_id;

-- Sync update from source DB
INSERT INTO customers VALUES
(100, 'Alice Smith', 'alice@new.com', 'US', 1, '2026-03-31 10:00:00', 1, toUnixTimestamp('2026-03-31 10:00:00'));

-- Query current state
SELECT customer_id, name, email, country
FROM customers FINAL
WHERE is_active = 1
ORDER BY customer_id;
```

## Performance: FINAL vs GROUP BY Deduplication

`FINAL` is convenient but can be slow on large tables. For dashboards, a `GROUP BY` approach can be faster:

```sql
-- Using FINAL (simple but can be slow)
SELECT plan, count() AS users
FROM user_profiles FINAL
GROUP BY plan;

-- Using argMax to deduplicate explicitly (often faster)
SELECT
    plan,
    count() AS users
FROM (
    SELECT
        user_id,
        argMax(plan, version) AS plan
    FROM user_profiles
    GROUP BY user_id
)
GROUP BY plan;
```

## Combining with PARTITION BY

Partitioning works well with ReplacingMergeTree. Deduplication only happens within the same partition:

```sql
CREATE TABLE user_events
(
    ts        DateTime,
    user_id   UInt64,
    event_id  UInt64,
    data      String,
    version   UInt64
)
ENGINE = ReplacingMergeTree(version)
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id, event_id);
```

Important: if the same `event_id` appears in two different partitions (e.g., due to a timestamp correction), ReplacingMergeTree will NOT deduplicate across them. Keep the partition key stable for mutable records.

## Optimizing Small Tables

For tables under a few hundred million rows, you can force a merge for immediate deduplication during development:

```sql
OPTIMIZE TABLE user_profiles FINAL;

-- Then verify
SELECT count() FROM user_profiles;
```

Never do this in production at scale - let background merges handle it.

## Monitoring Duplicate State

Check how many duplicates exist before merges complete:

```sql
-- Total rows (includes duplicates)
SELECT count() FROM user_profiles;

-- Deduplicated count (uses FINAL, slower)
SELECT count() FROM user_profiles FINAL;

-- Difference tells you how many duplicates are pending merge
SELECT
    (SELECT count() FROM user_profiles) AS raw_count,
    (SELECT count() FROM user_profiles FINAL) AS deduped_count,
    raw_count - deduped_count AS duplicate_count;
```

## When to Use ReplacingMergeTree

Use ReplacingMergeTree when:
- You need mutable records (update a user profile, order status, product price).
- You're implementing CDC from a relational database.
- You need deduplication based on a natural key with version tracking.

Do NOT use it when:
- You need all historical versions of a record (use plain `MergeTree`).
- You need accumulating aggregations (use `SummingMergeTree` or `AggregatingMergeTree`).
- You need precise collapse accounting (use `CollapsingMergeTree` or `VersionedCollapsingMergeTree`).

## Summary

ReplacingMergeTree brings upsert semantics to ClickHouse's append-only architecture. Key points:

- Rows with the same `ORDER BY` key are collapsed during merges, keeping the highest-version row.
- Use `FINAL` in queries to force deduplication at read time.
- For performance on large tables, use `argMax(col, version)` patterns instead of `FINAL`.
- Combine with a soft `is_deleted` flag to handle logical deletes.
- Keep partition keys stable for mutable records to ensure deduplication works correctly.
