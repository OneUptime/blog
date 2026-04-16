# How to Use VersionedCollapsingMergeTree Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, VersionedCollapsingMergeTree, Table Engine, Update, SQL

Description: Learn how to use VersionedCollapsingMergeTree in ClickHouse to implement mutable row semantics with out-of-order inserts using sign and version columns.

---

## Overview

`VersionedCollapsingMergeTree` extends `CollapsingMergeTree` by adding a version column. Pairs of rows with the same sorting key - one with `sign=1` (insert) and one with `sign=-1` (cancel) - are collapsed during merges. The version column ensures that out-of-order inserts are handled correctly, making this engine suitable for distributed systems where updates may arrive out of sequence.

## How It Works

Each row carries two special columns:
- `sign` (Int8): `+1` for an insert, `-1` for a cancellation
- `version` (UInt*): monotonically increasing version number

During merges, ClickHouse groups rows by sorting key and cancels pairs with matching versions.

## Creating a VersionedCollapsingMergeTree Table

```sql
CREATE TABLE order_states
(
    order_id     UInt64,
    status       String,
    amount       Float64,
    updated_at   DateTime,
    sign         Int8,
    version      UInt64
)
ENGINE = VersionedCollapsingMergeTree(sign, version)
ORDER BY (order_id);
```

## Inserting Initial State

Insert the first version of a record with `sign=1` and `version=1`:

```sql
INSERT INTO order_states VALUES
(1001, 'pending', 99.99, '2024-06-01 10:00:00', 1, 1),
(1002, 'pending', 49.99, '2024-06-01 10:01:00', 1, 1);
```

## Updating a Record

To update an order, insert a cancellation row (sign=-1) for the old version and a new row (sign=1) for the new version:

```sql
INSERT INTO order_states VALUES
-- Cancel old state (v1)
(1001, 'pending',   99.99, '2024-06-01 10:00:00', -1, 1),
-- Insert new state (v2)
(1001, 'confirmed', 99.99, '2024-06-01 11:00:00',  1, 2);
```

## Reading Current State with FINAL

```sql
SELECT order_id, status, amount, updated_at
FROM order_states FINAL
WHERE sign = 1
ORDER BY order_id
```

Output:

```text
order_id | status    | amount | updated_at
1001     | confirmed | 99.99  | 2024-06-01 11:00:00
1002     | pending   | 49.99  | 2024-06-01 10:01:00
```

## Reading Before OPTIMIZE

Before merges run, both positive and negative rows may coexist. Sum the `sign` column to get effective counts:

```sql
SELECT
    order_id,
    argMaxIf(status, version, sign = 1) AS current_status,
    sum(sign) AS row_balance
FROM order_states
GROUP BY order_id
HAVING row_balance > 0
```

## Deleting a Record

To soft-delete, insert a cancellation without a corresponding positive row:

```sql
INSERT INTO order_states VALUES
(1002, 'pending', 49.99, '2024-06-01 10:01:00', -1, 1);
-- Now order 1002 is effectively deleted
```

## Out-of-Order Handling

The key advantage over `CollapsingMergeTree`: sign=-1 rows for future versions can arrive before the sign=+1 rows (due to distributed system race conditions), and the engine handles them correctly because version ordering resolves conflicts:

```sql
-- Version 1 cancellation arrives before version 1 state in distributed scenario
INSERT INTO order_states VALUES
(1003, 'pending', 200.0, now(), -1, 1);  -- arrives first

INSERT INTO order_states VALUES
(1003, 'pending', 200.0, now(), 1, 1),      -- original state
(1003, 'processing', 200.0, now(), 1, 2);   -- update
```

After merge, only version 2 remains active.

## When to Choose This Engine

- Use `VersionedCollapsingMergeTree` over `CollapsingMergeTree` when inserts from distributed nodes may arrive out of order
- Prefer `ReplacingMergeTree` for simpler upsert semantics without needing to track sign/version yourself
- Use this engine for financial ledger-style data where exact cancellation semantics matter

## Summary

`VersionedCollapsingMergeTree` implements mutable rows via sign/version pairs. Positive-sign rows represent current state and negative-sign rows cancel previous versions. The version column enables correct out-of-order handling in distributed environments. Query with `FINAL` or aggregate with `sum(sign)` to retrieve current effective rows before background merges complete.
