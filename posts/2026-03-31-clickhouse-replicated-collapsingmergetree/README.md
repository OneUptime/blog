# How to Use ReplicatedCollapsingMergeTree in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ReplicatedCollapsingMergeTree, Replication, Mutation, Storage Engine

Description: Learn how to use ReplicatedCollapsingMergeTree in ClickHouse to cancel rows via sign columns across replicated nodes, enabling efficient updates and deletes at scale.

---

`ReplicatedCollapsingMergeTree` combines `CollapsingMergeTree` semantics with ClickHouse replication. It uses a special `sign` column (values `+1` or `-1`) to mark rows as insertions or cancellations. During background merges, pairs of rows with the same `ORDER BY` key but opposite signs cancel each other out, effectively deleting or updating records without expensive mutations. Replication keeps all replicas synchronized. This engine is ideal for mutable fact tables, shopping carts, positions, and any scenario where rows frequently change state.

## Prerequisites: Macros Configuration

```xml
<!-- /etc/clickhouse-server/config.d/macros.xml -->
<clickhouse>
  <macros>
    <shard>01</shard>
    <replica>replica-01</replica>
  </macros>
</clickhouse>
```

## Creating a ReplicatedCollapsingMergeTree Table

```sql
CREATE TABLE user_cart
(
    user_id     UInt64,
    product_id  UInt32,
    quantity    UInt32,
    unit_price  Decimal(10, 2),
    added_at    DateTime,
    sign        Int8          -- +1 = active row, -1 = cancellation row
)
ENGINE = ReplicatedCollapsingMergeTree(
    '/clickhouse/tables/{shard}/user_cart',
    '{replica}',
    sign                       -- sign column name
)
PARTITION BY toYYYYMM(added_at)
ORDER BY (user_id, product_id);
```

## Inserting a Row (Sign = +1)

```sql
-- User adds item to cart
INSERT INTO user_cart VALUES
    (1001, 55, 2, 29.99, '2024-06-15 10:00:00', 1);
```

## Updating a Row (Cancel + Reinsert)

To "update" a row, insert a cancellation row (sign = -1) with identical `ORDER BY` key values, then insert the new state (sign = +1).

```sql
-- User changes quantity from 2 to 5
-- Step 1: cancel the old row (exact copy with sign = -1)
INSERT INTO user_cart VALUES
    (1001, 55, 2, 29.99, '2024-06-15 10:00:00', -1);

-- Step 2: insert the new state (sign = +1)
INSERT INTO user_cart VALUES
    (1001, 55, 5, 29.99, '2024-06-15 10:05:00', 1);
```

## Deleting a Row (Sign = -1 Only)

```sql
-- User removes item from cart
INSERT INTO user_cart VALUES
    (1001, 55, 5, 29.99, '2024-06-15 10:05:00', -1);
```

## Querying: Account for Sign in Aggregations

Before background merges collapse the sign pairs, you must account for the sign in queries.

```sql
-- Correct: multiply metrics by sign to net out cancellations
SELECT
    user_id,
    product_id,
    sum(sign * quantity)    AS net_quantity,
    sum(sign * unit_price * quantity) AS net_cart_value
FROM user_cart
WHERE user_id = 1001
GROUP BY user_id, product_id
HAVING net_quantity > 0
ORDER BY product_id;
```

```text
user_id  product_id  net_quantity  net_cart_value
1001     55          5             149.95
```

## Correct Total Cart Value

```sql
-- Active cart items across all users
SELECT
    user_id,
    count()                             AS line_items,
    sum(sign * quantity)                AS total_items,
    sum(sign * quantity * unit_price)   AS cart_total
FROM user_cart
GROUP BY user_id
HAVING total_items > 0
ORDER BY cart_total DESC
LIMIT 10;
```

## Collapsing With FINAL

`FINAL` forces collapse at query time. It is less performant than accounting for sign manually but produces naturally readable results.

```sql
SELECT
    user_id,
    product_id,
    quantity,
    unit_price,
    quantity * unit_price AS line_total
FROM user_cart FINAL
WHERE sign = 1
ORDER BY user_id, product_id;
```

## Insert Order Constraint

`CollapsingMergeTree` requires that for a given `ORDER BY` key, the cancellation row (-1) must be inserted **after** the original row (+1) - they must arrive in the correct order within the same partition. If a -1 row arrives before its corresponding +1 row within a part, both rows persist and the collapse does not happen.

```sql
-- Safe pattern: always insert the cancellation in the same batch as the new state
INSERT INTO user_cart VALUES
    (1001, 77, 3, 49.99, '2024-06-15 11:00:00', -1),  -- cancel old
    (1001, 77, 3, 44.99, '2024-06-15 11:00:00',  1);   -- new price
```

## Replication Status

```sql
SELECT
    replica_name,
    is_leader,
    absolute_delay AS lag_s,
    queue_size
FROM system.replicas
WHERE table = 'user_cart';
```

## Forcing a Collapse

```sql
OPTIMIZE TABLE user_cart PARTITION '202406' FINAL;
```

After this, all sign +1/-1 pairs within the partition are collapsed and only the net active rows remain.

## Practical Example: Open Positions Tracker

```sql
CREATE TABLE positions
(
    account_id  UInt64,
    symbol      LowCardinality(String),
    quantity    Int64,
    avg_price   Float64,
    opened_at   DateTime,
    sign        Int8
)
ENGINE = ReplicatedCollapsingMergeTree(
    '/clickhouse/tables/{shard}/positions',
    '{replica}',
    sign
)
ORDER BY (account_id, symbol);

-- Open a position
INSERT INTO positions VALUES (9001, 'AAPL', 100, 185.50, now(), 1);

-- Partially close: cancel old row, insert updated position
INSERT INTO positions VALUES
    (9001, 'AAPL', 100, 185.50, now(), -1),   -- cancel
    (9001, 'AAPL',  60, 185.50, now(),  1);    -- 40 shares sold

-- Net open positions
SELECT
    account_id,
    symbol,
    sum(sign * quantity) AS net_shares,
    sum(sign * quantity * avg_price) / nullif(sum(sign * quantity), 0) AS avg_cost
FROM positions
GROUP BY account_id, symbol
HAVING net_shares > 0;
```

## Limitations

- Order of inserts matters within a partition - cancellations must follow their corresponding rows.
- For arbitrary-order cancellations, use `VersionedCollapsingMergeTree` instead.
- Requires ZooKeeper/ClickHouse Keeper.
- Queries must account for sign until background merges complete.

## Summary

`ReplicatedCollapsingMergeTree` provides an efficient, replication-safe mechanism for mutable data using sign columns. Write +1 rows to add records and -1 rows to cancel them. Background merges collapse pairs, and queries should sum by sign to get correct results before merges run. For cases where insert order cannot be guaranteed, use `ReplicatedVersionedCollapsingMergeTree`.
