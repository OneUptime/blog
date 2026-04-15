# How to Model Stateful Entities with ReplacingMergeTree in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ReplacingMergeTree, Stateful Entity, Upsert, Schema Design, Deduplication

Description: Learn how to model mutable, stateful entities in ClickHouse using ReplacingMergeTree to implement upsert semantics for entities that change over time.

---

ClickHouse is primarily designed for append-only analytics, but many real-world entities have state that changes over time: user profiles, subscription status, order states. `ReplacingMergeTree` provides a mechanism to keep only the latest version of each entity.

## How ReplacingMergeTree Works

`ReplacingMergeTree` deduplicates rows with the same sorting key (`ORDER BY` columns), keeping the row with the highest value in the specified version column. Deduplication happens asynchronously during merges, not immediately on insert.

```sql
CREATE TABLE user_profiles (
    user_id UInt64,
    email String,
    name String,
    plan LowCardinality(String),
    country LowCardinality(String),
    is_active Bool,
    updated_at DateTime
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY user_id;
```

## Inserting and Updating

Insert a new user:

```sql
INSERT INTO user_profiles VALUES (1001, 'alice@example.com', 'Alice', 'free', 'US', true, '2025-01-01 00:00:00');
```

"Update" by inserting a new row with a newer `updated_at`:

```sql
INSERT INTO user_profiles VALUES (1001, 'alice@example.com', 'Alice', 'pro', 'US', true, '2025-06-15 12:00:00');
```

## Querying with FINAL

Without FINAL, you may see duplicate rows (before the background merge runs):

```sql
-- Might return 2 rows for user_id=1001
SELECT * FROM user_profiles WHERE user_id = 1001;

-- Always returns 1 row (forces deduplication)
SELECT * FROM user_profiles FINAL WHERE user_id = 1001;
```

## Forcing a Merge

For testing or one-off cleanup:

```sql
OPTIMIZE TABLE user_profiles FINAL;
```

After this, FINAL is not needed for correctness, but it is still good practice.

## Versioning with a Numeric Counter

For updates where you track revision numbers:

```sql
CREATE TABLE orders (
    order_id String,
    status LowCardinality(String),
    amount Decimal64(2),
    version UInt32
) ENGINE = ReplacingMergeTree(version)
ORDER BY order_id;

INSERT INTO orders VALUES ('ord-001', 'pending', 99.99, 1);
INSERT INTO orders VALUES ('ord-001', 'paid',    99.99, 2);
INSERT INTO orders VALUES ('ord-001', 'shipped', 99.99, 3);
```

The row with version=3 is kept.

## Combining with CollapsingMergeTree for Counters

For entities that also need aggregate counts, combine with CollapsingMergeTree:

```sql
CREATE TABLE subscription_events (
    user_id UInt64,
    plan LowCardinality(String),
    sign Int8  -- +1 for subscribe, -1 for cancel
) ENGINE = CollapsingMergeTree(sign)
ORDER BY user_id;

-- Subscribe
INSERT INTO subscription_events VALUES (1001, 'pro', 1);
-- Cancel
INSERT INTO subscription_events VALUES (1001, 'pro', -1);

-- Count active pro subscribers
SELECT plan, sum(sign) AS active_count
FROM subscription_events
GROUP BY plan
HAVING active_count > 0;
```

## Using argMax as an Alternative

If you need the latest value without `FINAL`, use `argMax` at query time:

```sql
SELECT
    user_id,
    argMax(plan, updated_at) AS current_plan,
    argMax(country, updated_at) AS current_country,
    max(updated_at) AS last_updated
FROM user_profiles
GROUP BY user_id;
```

This works correctly even with duplicate rows.

## Summary

`ReplacingMergeTree` enables mutable entity modeling in ClickHouse by keeping the latest version of each sorting key. Use `FINAL` or `OPTIMIZE TABLE FINAL` to force deduplication, or use `argMax` as a query-time alternative. For counters and state changes with cancellation semantics, `CollapsingMergeTree` is the right tool.
