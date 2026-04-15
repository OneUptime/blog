# How to Use VersionedCollapsingMergeTree in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, VersionedCollapsingMergeTree, Collapsing, Database, Engine, SQL, CDC

Description: Learn how to use VersionedCollapsingMergeTree in ClickHouse to handle mutable data with out-of-order updates using sign and version columns for accurate state management.

---

VersionedCollapsingMergeTree is a ClickHouse table engine that solves the problem of tracking mutable records in an append-only system - even when updates and deletes arrive out of order. It extends the CollapsingMergeTree engine by adding version-aware collapse logic, making it the most robust engine for CDC (Change Data Capture) and mutable state tracking.

## The Problem It Solves

In ClickHouse, data is immutable once written. To "update" a record, you insert a cancellation row (sign = -1) for the old state and a new row (sign = 1) for the new state. But if rows arrive out of order (the new state arrives before the cancellation), a simple `CollapsingMergeTree` fails.

`VersionedCollapsingMergeTree` handles out-of-order updates correctly: it pairs rows by `(sorting_key, version)` - matching each positive row with its negative counterpart regardless of insertion order.

## Basic Syntax

```sql
ENGINE = VersionedCollapsingMergeTree(sign_column, version_column)
```

| Parameter        | Type   | Description |
|------------------|--------|-------------|
| `sign_column`    | `Int8` | `1` = insert/new state, `-1` = cancel/old state |
| `version_column` | `UInt*`| Monotonically increasing version; higher version = newer state |

## Creating a VersionedCollapsingMergeTree Table

```sql
CREATE TABLE order_states
(
    order_id     UInt64,
    status       LowCardinality(String),
    total_amount Float64,
    updated_at   DateTime,
    sign         Int8,
    version      UInt64
)
ENGINE = VersionedCollapsingMergeTree(sign, version)
PARTITION BY toYYYYMM(updated_at)
ORDER BY (order_id, updated_at);
```

## How Rows Collapse

During merges, the engine cancels out pairs of rows that have:
- The same `ORDER BY` key values.
- The same `version` value.
- Opposite `sign` values (+1 and -1).

Rows without a matching cancel row are kept. The result is the current state of each key.

## Inserting Initial and Updated States

```sql
-- Initial state: order 100 is 'pending'
INSERT INTO order_states VALUES (100, 'pending', 150.00, '2026-03-01 10:00:00', 1, 1);

-- Order 100 transitions to 'shipped':
-- Cancel the old state (sign=-1, same version=1)
INSERT INTO order_states VALUES (100, 'pending', 150.00, '2026-03-01 10:00:00', -1, 1);
-- Insert the new state (sign=1, new version=2)
INSERT INTO order_states VALUES (100, 'shipped', 150.00, '2026-03-01 14:00:00',  1, 2);
```

After a merge:
- The two `version=1` rows (sign +1 and -1) cancel out.
- Only the `version=2` row with sign `+1` remains.

## Querying Current State

Use `sum(sign)` to filter to currently active rows. Rows that have been cancelled sum to 0 and are excluded:

```sql
SELECT
    order_id,
    status,
    total_amount,
    updated_at
FROM order_states
GROUP BY order_id, status, total_amount, updated_at
HAVING sum(sign) > 0
ORDER BY order_id;
```

This is the canonical query pattern - always use `HAVING sum(sign) > 0` to see only non-cancelled records.

## Out-of-Order Updates (The Key Advantage)

VersionedCollapsingMergeTree handles cases where the cancel row arrives after the replacement:

```sql
-- Suppose the cancel arrives AFTER the new state (out of order)

-- New state arrives first (version=2)
INSERT INTO order_states VALUES (200, 'delivered', 75.00, '2026-03-02 09:00:00', 1, 2);

-- Old state cancel arrives later (version=1)
INSERT INTO order_states VALUES (200, 'shipped',   75.00, '2026-03-01 14:00:00', -1, 1);

-- Original insert (version=1, eventually)
INSERT INTO order_states VALUES (200, 'shipped',   75.00, '2026-03-01 14:00:00',  1, 1);
```

The engine correctly pairs the `sign=1, version=1` with `sign=-1, version=1`, leaving only `sign=1, version=2` as the current state - regardless of insertion order.

## Full CDC Pipeline Example

```sql
-- Source of truth table
CREATE TABLE product_catalog
(
    product_id    UInt64,
    name          String,
    price         Float64,
    category      LowCardinality(String),
    in_stock      UInt8,
    last_modified DateTime,
    sign          Int8,
    version       UInt64
)
ENGINE = VersionedCollapsingMergeTree(sign, version)
PARTITION BY toYYYYMM(last_modified)
ORDER BY (product_id, last_modified);

-- Insert initial products
INSERT INTO product_catalog VALUES
(1, 'Laptop Pro',   1299.99, 'Electronics', 1, '2026-01-01 00:00:00', 1, 1),
(2, 'Office Chair', 399.00,  'Furniture',   1, '2026-01-01 00:00:00', 1, 1),
(3, 'USB Hub',       29.99,  'Electronics', 1, '2026-01-01 00:00:00', 1, 1);

-- Update product 1 price: cancel old + insert new
INSERT INTO product_catalog VALUES
(1, 'Laptop Pro', 1299.99, 'Electronics', 1, '2026-01-01 00:00:00', -1, 1),  -- cancel
(1, 'Laptop Pro', 1199.99, 'Electronics', 1, '2026-03-15 10:00:00',  1, 2);   -- new state

-- Query current catalog
SELECT
    product_id,
    name,
    price,
    category,
    in_stock
FROM product_catalog
GROUP BY product_id, name, price, category, in_stock, last_modified
HAVING sum(sign) > 0
ORDER BY product_id;
```

## Deleting Records

To logically delete a record, insert a cancel row for its current version:

```sql
-- Delete product 3 (last known version is 1)
INSERT INTO product_catalog VALUES
(3, 'USB Hub', 29.99, 'Electronics', 1, '2026-01-01 00:00:00', -1, 1);

-- After merge, product 3 will not appear in HAVING sum(sign) > 0 queries
```

## Computing Aggregates Over Current State

```sql
-- Total inventory value across current (non-cancelled) products
SELECT
    category,
    count()       AS products,
    sum(price)    AS total_value,
    sum(in_stock) AS in_stock_count
FROM product_catalog
GROUP BY category, product_id, price, in_stock
HAVING sum(sign) > 0
-- Outer aggregation
```

For cleaner aggregation, use a subquery:

```sql
SELECT
    category,
    count()        AS products,
    round(sum(price), 2) AS total_value
FROM (
    SELECT product_id, price, category
    FROM product_catalog
    GROUP BY product_id, price, category, name, in_stock, last_modified
    HAVING sum(sign) > 0
)
GROUP BY category
ORDER BY total_value DESC;
```

## Using FINAL as an Alternative

For small tables, `FINAL` forces the engine to collapse rows at query time:

```sql
SELECT product_id, name, price, category
FROM product_catalog FINAL
WHERE sign = 1
ORDER BY product_id;
```

`FINAL` is slower on large tables. Prefer `GROUP BY + HAVING sum(sign) > 0` for production queries.

## Monitoring Uncollapsed Rows

```sql
-- Check how many sign=-1 rows are awaiting collapse
SELECT
    sign,
    count() AS row_count
FROM order_states
GROUP BY sign
ORDER BY sign;
```

A healthy table has few or no `sign=-1` rows after merges. If `-1` rows persist, either:
- The corresponding `+1` state row has not been inserted.
- Merges are lagging - check `system.merges`.

## VersionedCollapsingMergeTree vs CollapsingMergeTree

| Feature | CollapsingMergeTree | VersionedCollapsingMergeTree |
|---|---|---|
| Out-of-order tolerance | No | Yes |
| Version column required | No | Yes |
| Suitable for CDC | Risky | Yes |
| Query complexity | `HAVING sum(sign) > 0` | Same |

Use `VersionedCollapsingMergeTree` whenever updates may arrive out of order - which is almost always the case in distributed CDC pipelines.

## Summary

VersionedCollapsingMergeTree is the most robust engine for tracking mutable state in ClickHouse. Key points:

- Pairs `sign=+1` and `sign=-1` rows by `(key, version)` to cancel out old states.
- Handles out-of-order arrivals correctly - the key differentiator from CollapsingMergeTree.
- Always query with `HAVING sum(sign) > 0` to see only current (non-cancelled) records.
- Use for CDC pipelines, mutable product catalogs, order state tracking, and any dataset where records are updated.
- Logical deletes are implemented by inserting a `sign=-1` row matching the current version.
