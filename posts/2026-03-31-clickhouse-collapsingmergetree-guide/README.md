# What Is CollapsingMergeTree and When to Use It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CollapsingMergeTree, Storage Engine, Update, Analytics

Description: Learn how CollapsingMergeTree works in ClickHouse, how to insert cancellation rows to simulate updates, and when to prefer it over ReplacingMergeTree.

## Introduction

ClickHouse is an append-only database by design. It does not support in-place row updates. But many analytical use cases require tracking changing state: a user's current balance, the latest status of an order, or the current seat count in an event.

`CollapsingMergeTree` is ClickHouse's mechanism for simulating row-level mutations in an append-only system. Instead of updating a row, you write a new row that "cancels" the old one, then write another row with the new state. During background merges, ClickHouse collapses matching row pairs, keeping only the latest state.

## How CollapsingMergeTree Works

`CollapsingMergeTree` requires a column called a **sign column** (by convention named `sign`) of type `Int8`. Every row must have either `sign = 1` (a state row) or `sign = -1` (a cancellation row).

During a merge, ClickHouse groups rows by the sorting key (excluding the sign). If a group has one `+1` row and one `-1` row with the same sorting key, they collapse and both are deleted. Only unmatched rows survive.

```text
Before merge:
  (user_id='U1', balance=100, sign=1)   <- original state
  (user_id='U1', balance=100, sign=-1)  <- cancellation
  (user_id='U1', balance=150, sign=1)   <- new state

After merge:
  (user_id='U1', balance=150, sign=1)   <- only new state survives
```

## Creating a CollapsingMergeTree Table

```sql
CREATE TABLE user_balances
(
    user_id     String,
    currency    LowCardinality(String),
    balance     Decimal(18, 4),
    updated_at  DateTime,
    sign        Int8
)
ENGINE = CollapsingMergeTree(sign)
ORDER BY (user_id, currency);
```

The `sign` column name is passed as an argument to the engine.

## Inserting Initial State

```sql
INSERT INTO user_balances VALUES
('U-1001', 'USD', 1250.00, now(), 1),
('U-1002', 'USD',  875.50, now(), 1),
('U-1003', 'EUR', 3400.00, now(), 1);
```

## Updating State (Cancel + Insert)

To update a user's balance, first insert a cancellation row (identical to the current row but with `sign = -1`), then insert the new state:

```sql
-- Cancel the old state
INSERT INTO user_balances VALUES
('U-1001', 'USD', 1250.00, '2024-01-15 10:00:00', -1);

-- Insert the new state
INSERT INTO user_balances VALUES
('U-1001', 'USD', 1500.00, now(), 1);
```

It is critical that the cancellation row copies the state row's values for the sorting key and for any columns you aggregate with the sign (like `balance`). Only the `sign` value should flip from `1` to `-1`; otherwise the sign-weighted sums will not cancel cleanly. The new state row that follows is where you write the updated values.

## Querying CollapsingMergeTree Tables

Because merges happen asynchronously in the background, you cannot simply `SELECT * FROM user_balances` - you might get both the old and new rows before the merge collapses them.

Always use `sum(sign)` and `sumIf` to account for rows that have not yet been merged:

```sql
SELECT
    user_id,
    currency,
    sum(balance * sign)             AS current_balance,
    max(updated_at)                 AS last_updated
FROM user_balances
GROUP BY user_id, currency
HAVING sum(sign) = 1;
```

The `HAVING sum(sign) = 1` filter removes any user/currency combinations where the cancellation and state rows have not been merged yet (their signs sum to 0) or where no valid state exists.

## Common Mistake: Forgetting to Account for Unmerged Rows

Without the sign-aware query, you risk getting stale data:

```sql
-- WRONG: may return both old and new rows before merge
SELECT user_id, currency, balance
FROM user_balances
WHERE user_id = 'U-1001';

-- CORRECT: collapse manually in the query
SELECT
    user_id,
    currency,
    sum(balance * sign) AS balance
FROM user_balances
WHERE user_id = 'U-1001'
GROUP BY user_id, currency
HAVING sum(sign) > 0;
```

## CollapsingMergeTree vs ReplacingMergeTree

Both engines handle "upsert" semantics in ClickHouse but with different approaches:

| Feature | CollapsingMergeTree | ReplacingMergeTree |
|---|---|---|
| Mechanism | Cancel + insert pairs | Keeps row with highest version |
| Query pattern | Must use `sum(sign)` | Use `FINAL` or `argMax` |
| Storage before merge | Stores both old and new rows | Stores all versions |
| Deletion support | Can delete rows (sum of signs = 0) | Cannot delete (only replace) |
| Ordering key constraint | Must match exactly for cancellation | Just needs same key |

**Use `CollapsingMergeTree` when:**
- You need to support logical deletes (a row that should disappear entirely)
- You are computing running totals or aggregates where sign-based summation is natural
- The cancellation pattern fits your application logic well

**Use `ReplacingMergeTree` when:**
- You want simpler application code (just insert the new state, no need to track the old values)
- You only need the latest value per key, not deletion semantics
- You query with `FINAL` and can accept its performance trade-offs

## VersionedCollapsingMergeTree

The regular `CollapsingMergeTree` has a limitation: out-of-order inserts can cause incorrect collapsing. If the cancellation row arrives before the state row, both will be collapsed incorrectly.

`VersionedCollapsingMergeTree` solves this by adding a version column. Rows with the same primary key and version but opposite signs are collapsed:

```sql
CREATE TABLE user_balances_versioned
(
    user_id     String,
    currency    LowCardinality(String),
    balance     Decimal(18, 4),
    version     UInt32,
    sign        Int8
)
ENGINE = VersionedCollapsingMergeTree(sign, version)
ORDER BY (user_id, currency);
```

With this engine, insert both the cancellation and the new state with the same version number. The old state row had a different version, so it collapses only with its own cancellation:

```sql
-- Old state (version 1)
INSERT INTO user_balances_versioned VALUES ('U-1001', 'USD', 1250.00, 1, 1);

-- Cancel version 1
INSERT INTO user_balances_versioned VALUES ('U-1001', 'USD', 1250.00, 1, -1);

-- New state (version 2)
INSERT INTO user_balances_versioned VALUES ('U-1001', 'USD', 1500.00, 2, 1);
```

## Practical Example: Order Status Tracking

```sql
CREATE TABLE order_statuses
(
    order_id    String,
    status      LowCardinality(String),
    amount_usd  Decimal(12, 2),
    updated_at  DateTime,
    sign        Int8
)
ENGINE = CollapsingMergeTree(sign)
ORDER BY order_id;
```

Track an order moving through states:

```sql
-- Order placed
INSERT INTO order_statuses VALUES ('ORD-001', 'pending',   99.99, now(), 1);

-- Order confirmed: cancel pending, insert confirmed
INSERT INTO order_statuses VALUES
    ('ORD-001', 'pending',   99.99, '2024-01-01 10:00:00', -1),
    ('ORD-001', 'confirmed', 99.99, now(), 1);

-- Order shipped: cancel confirmed, insert shipped
INSERT INTO order_statuses VALUES
    ('ORD-001', 'confirmed', 99.99, '2024-01-01 10:05:00', -1),
    ('ORD-001', 'shipped',   99.99, now(), 1);
```

Query current order statuses:

```sql
SELECT
    order_id,
    argMaxIf(status, updated_at, sign = 1) AS current_status,
    sum(amount_usd * sign)                 AS current_amount
FROM order_statuses
GROUP BY order_id
HAVING sum(sign) > 0;
```

## Forcing a Merge for Testing

In development, you can trigger a merge manually to verify collapsing behavior:

```sql
OPTIMIZE TABLE user_balances FINAL;

-- Now a plain SELECT will show collapsed results
SELECT * FROM user_balances;
```

Never rely on `OPTIMIZE TABLE FINAL` in production. It locks parts and is very slow on large tables. Always write sign-aware queries.

## Conclusion

`CollapsingMergeTree` gives ClickHouse the ability to simulate mutable state in an append-only system. The cancel-plus-insert pattern lets you model updates and deletes without in-place mutations. The key operational discipline is always writing sign-aware queries that sum over the sign column to get correct results regardless of merge state. For cases where out-of-order delivery is a concern, prefer `VersionedCollapsingMergeTree`.

**Related Reading:**

- [What Is ClickHouse MergeTree and How It Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-mergetree-explained/view)
- [What Is FINAL Keyword and When to Use It in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-final-keyword-guide/view)
- [What Is the Difference Between Mutations and Lightweight Deletes in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-mutations-vs-lightweight-deletes/view)
