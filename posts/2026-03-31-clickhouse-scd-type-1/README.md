# How to Handle Slowly Changing Dimensions Type 1 in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Slowly Changing Dimension, SCD Type 1, Data Warehouse, Dimension Table

Description: Implement Slowly Changing Dimension Type 1 in ClickHouse using ReplacingMergeTree to overwrite old values with the latest record on dimension updates.

---

## What Is SCD Type 1

Slowly Changing Dimensions (SCDs) describe how dimension table values change over time. In SCD Type 1, when a dimension attribute changes, the old value is simply overwritten with the new value. No history is kept.

Use SCD Type 1 when:
- Historical accuracy of the dimension is not required
- The old value is genuinely wrong (a correction, not a business change)
- Storage efficiency is a priority

## Implementing SCD Type 1 with ReplacingMergeTree

`ReplacingMergeTree` is the natural fit for SCD Type 1 in ClickHouse. It keeps only the latest version of each row based on the ORDER BY key:

```sql
CREATE TABLE dim_users (
    user_id         UInt64,
    email           String,
    full_name       String,
    country         LowCardinality(String),
    plan_type       LowCardinality(String),
    company_name    String,
    updated_at      DateTime
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY user_id;
```

The `updated_at` column is the version key. When two rows have the same `user_id`, ClickHouse keeps the one with the higher `updated_at` value during background merges.

## Inserting Updates

To update a dimension record, simply insert a new row with the new values:

```sql
-- Original record
INSERT INTO dim_users VALUES (42, 'alice@old.com', 'Alice Smith', 'US', 'free', 'Startup Inc', '2026-01-01 00:00:00');

-- Update: Alice upgraded her plan
INSERT INTO dim_users VALUES (42, 'alice@old.com', 'Alice Smith', 'US', 'pro', 'Startup Inc', '2026-03-31 10:00:00');
```

After background merge, only the second row remains.

## Querying with FINAL

Before merges complete, duplicate rows may exist. Use `FINAL` to get the deduplicated view:

```sql
SELECT user_id, email, plan_type
FROM dim_users FINAL
WHERE user_id = 42;
```

For high-throughput serving, avoid `FINAL` on large tables. Instead, use the `argMax` pattern for point lookups:

```sql
SELECT
    user_id,
    argMax(email, updated_at) AS email,
    argMax(plan_type, updated_at) AS plan_type,
    argMax(country, updated_at) AS country
FROM dim_users
WHERE user_id = 42
GROUP BY user_id;
```

## Batch Updates via CDC

When syncing dimension changes from a transactional database via CDC, each change event becomes an insert into `dim_users`. The ReplacingMergeTree handles deduplication automatically.

```sql
-- Insert batch of updates from CDC stream
INSERT INTO dim_users
SELECT user_id, email, full_name, country, plan_type, company_name, updated_at
FROM staging_user_changes
WHERE event_type IN ('INSERT', 'UPDATE');
```

## Forcing a Merge

After large batch updates, force a merge to reclaim space from replaced rows:

```sql
OPTIMIZE TABLE dim_users FINAL;
```

Do this during off-peak hours as it is resource-intensive.

## When Not to Use SCD Type 1

If you need to analyze how dimension attributes changed over time (e.g., how many users upgraded from free to pro in Q1), use SCD Type 2 instead, which preserves history.

## Summary

SCD Type 1 in ClickHouse is implemented with `ReplacingMergeTree`, where inserting a new row with the same primary key and a higher version value eventually replaces the old row - providing a simple, low-overhead way to maintain current-state dimension tables.
