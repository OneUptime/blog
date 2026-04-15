# How to Handle Slowly Changing Dimensions Type 2 in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Slowly Changing Dimension, SCD Type 2, Data Warehouse, Historical Data

Description: Implement Slowly Changing Dimension Type 2 in ClickHouse to preserve full history of dimension changes for accurate point-in-time analysis.

---

## What Is SCD Type 2

SCD Type 2 preserves the full history of a dimension by creating a new row for each change and marking the old row as expired. This allows queries to retrieve the state of any dimension attribute at any point in time.

Use SCD Type 2 when:
- Historical accuracy matters (e.g., what plan was a user on when they made a purchase?)
- Regulatory requirements mandate change history
- Trend analysis on dimension attributes is needed

## SCD Type 2 Table Design

```sql
CREATE TABLE dim_users_scd2 (
    surrogate_key   UInt64,  -- synthetic key for this version
    user_id         UInt64,  -- natural key (same across versions)
    email           String,
    full_name       String,
    plan_type       LowCardinality(String),
    country         LowCardinality(String),
    valid_from      DateTime,
    valid_to        DateTime DEFAULT toDateTime('2105-12-31 23:59:59'),
    is_current      UInt8 DEFAULT 1
) ENGINE = MergeTree()
ORDER BY (user_id, valid_from);
```

## Inserting the Initial Record

```sql
INSERT INTO dim_users_scd2 VALUES
(1001, 42, 'alice@example.com', 'Alice Smith', 'free', 'US',
 '2026-01-01 00:00:00', '2105-12-31 23:59:59', 1);
```

## Processing a Dimension Change

When Alice upgrades from free to pro, expire the old row and insert a new one:

```sql
-- Step 1: Expire the current row
ALTER TABLE dim_users_scd2
    UPDATE
        valid_to = '2026-03-31 09:59:59',
        is_current = 0
    WHERE user_id = 42 AND is_current = 1;

-- Step 2: Insert the new version
INSERT INTO dim_users_scd2 VALUES
(1002, 42, 'alice@example.com', 'Alice Smith', 'pro', 'US',
 '2026-03-31 10:00:00', '2105-12-31 23:59:59', 1);
```

Note: ClickHouse `ALTER TABLE ... UPDATE` is an asynchronous mutation. The INSERT in Step 2 may execute before the mutation completes, creating a brief window where both rows have `is_current = 1`. You can check `system.mutations` to confirm completion before inserting. For high-throughput pipelines, use a staging + swap approach instead.

## Point-in-Time Query

Find what plan Alice was on when she made a purchase in February:

```sql
SELECT d.plan_type, f.order_id, f.total_cents
FROM fact_orders f
JOIN dim_users_scd2 d
    ON d.user_id = f.user_id
    AND f.created_at >= d.valid_from
    AND f.created_at < d.valid_to
WHERE f.user_id = 42
ORDER BY f.created_at;
```

## Current State Query

Get all current dimension values efficiently:

```sql
SELECT user_id, plan_type, country
FROM dim_users_scd2
WHERE is_current = 1
  AND user_id IN (42, 43, 44);
```

## Building SCD2 with dbt

Use dbt's `snapshot` feature with the ClickHouse adapter to automate SCD2 management:

```text
-- snapshots/users_snapshot.sql
{% snapshot users_snapshot %}
{{
    config(
      database='analytics',
      schema='snapshots',
      unique_key='user_id',
      strategy='timestamp',
      updated_at='updated_at',
    )
}}
SELECT * FROM {{ source('raw', 'users') }}
{% endsnapshot %}
```

## Summary

SCD Type 2 in ClickHouse uses a `valid_from`/`valid_to`/`is_current` pattern to preserve the full history of dimension changes, enabling accurate point-in-time joins between fact tables and historical dimension states.
