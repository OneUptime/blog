# How to Use CollapsingMergeTree for State Updates in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CollapsingMergeTree, State Updates, MergeTree, Data Modeling

Description: Learn how to use CollapsingMergeTree in ClickHouse to efficiently update mutable state by inserting cancellation rows instead of expensive mutations.

---

## What Is CollapsingMergeTree

`CollapsingMergeTree` is a ClickHouse table engine designed for tracking mutable state. Instead of updating rows (which requires expensive mutations), you insert new rows with a sign column:

- `sign = 1`: Insert a row (new state)
- `sign = -1`: Cancel a previous row (old state)

During background merges, pairs of +1 and -1 rows with identical keys are collapsed (removed) from storage.

## Creating a CollapsingMergeTree Table

```sql
CREATE TABLE user_sessions (
    session_id  String,
    user_id     UInt64,
    status      LowCardinality(String),
    page_views  UInt32,
    duration_s  UInt32,
    sign        Int8
) ENGINE = CollapsingMergeTree(sign)
ORDER BY (user_id, session_id);
```

The `sign` column must be the last argument to `CollapsingMergeTree()`.

## Inserting Initial State

```sql
-- Insert a new session (sign = 1)
INSERT INTO user_sessions VALUES
    ('sess_001', 1001, 'active', 5, 120, 1),
    ('sess_002', 1002, 'active', 3, 60, 1);
```

## Updating State (Cancel + Re-Insert Pattern)

To update a row, insert the old state with sign = -1, then insert the new state with sign = 1:

```sql
-- Cancel the old state
INSERT INTO user_sessions VALUES
    ('sess_001', 1001, 'active', 5, 120, -1);

-- Insert the new state
INSERT INTO user_sessions VALUES
    ('sess_001', 1001, 'completed', 22, 840, 1);
```

Both rows must have identical values in all ORDER BY key columns. Only `sign` and the changed columns differ.

## Querying with Correct Aggregation

Before merge happens, both +1 and -1 rows exist. Use `sum(sign)` to get correct counts:

```sql
-- Correct way to count active sessions
SELECT
    status,
    sum(sign) AS session_count
FROM user_sessions
GROUP BY status
HAVING sum(sign) > 0;

-- Correct way to get page views per user
SELECT
    user_id,
    sum(page_views * sign) AS total_page_views
FROM user_sessions
GROUP BY user_id
HAVING sum(sign) > 0;
```

## Using FINAL to Force Collapse

`FINAL` forces collapse of sign pairs during query time, giving correct results even before merges:

```sql
SELECT
    user_id,
    session_id,
    status,
    page_views,
    duration_s
FROM user_sessions FINAL
WHERE user_id = 1001;
```

Note: `FINAL` is slower than regular queries. Use it for low-frequency lookups, not analytics.

## Real-World Example - Shopping Cart

```sql
CREATE TABLE shopping_cart (
    cart_id     String,
    user_id     UInt64,
    item_id     UInt64,
    quantity    UInt32,
    price       Decimal(10, 2),
    sign        Int8
) ENGINE = CollapsingMergeTree(sign)
ORDER BY (user_id, cart_id, item_id);

-- Add item to cart
INSERT INTO shopping_cart VALUES
    ('cart_A', 1001, 5001, 2, 29.99, 1);

-- Update quantity (cancel old + insert new)
INSERT INTO shopping_cart VALUES
    ('cart_A', 1001, 5001, 2, 29.99, -1),
    ('cart_A', 1001, 5001, 4, 29.99,  1);

-- Get current cart contents
SELECT
    cart_id,
    item_id,
    sum(quantity * sign) AS quantity,
    sum(quantity * price * sign) AS total_price
FROM shopping_cart
WHERE user_id = 1001
GROUP BY cart_id, item_id
HAVING sum(sign) > 0;
```

## Limitations of CollapsingMergeTree

1. Collapsing only happens during merge - queries need `sum(sign)` or `FINAL`
2. If rows arrive out of order across separate inserts, merging may not collapse them correctly
3. The key must remain identical between the cancellation and new row
4. Not suitable for concurrent updates without application-level ordering

## Checking Uncollapsed Rows

```sql
SELECT
    session_id,
    count() AS versions,
    sum(sign) AS net
FROM user_sessions
GROUP BY session_id
HAVING count() > 1;
```

## Summary

`CollapsingMergeTree` enables efficient state mutation in ClickHouse without expensive background mutations. The pattern is: always insert a -1 cancellation row with the exact same key values before inserting a new +1 row with updated values. Use `sum(column * sign)` in aggregations and `FINAL` for point lookups to handle not-yet-merged pairs. For concurrent writes, consider `VersionedCollapsingMergeTree` which handles out-of-order inserts more reliably.
