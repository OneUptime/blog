# How to Use Lightweight UPDATE in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Lightweight Update, Update, Mutation, MergeTree, Data Management

Description: Learn how to use the lightweight UPDATE syntax in ClickHouse to modify rows without triggering full background mutations on large MergeTree tables.

---

ClickHouse has historically handled updates through heavy mutations that asynchronously rewrite entire data parts. Starting with newer versions, ClickHouse supports a lighter `UPDATE` approach that complements lightweight DELETE. Understanding the trade-offs helps you pick the right tool.

## Traditional Mutation-Based UPDATE

Before lightweight updates, the only option was `ALTER TABLE ... UPDATE`:

```sql
ALTER TABLE orders
UPDATE status = 'shipped'
WHERE order_id = 12345;
```

This is a mutation - it is asynchronous and rewrites the affected data parts in the background.

## Lightweight UPDATE Syntax

ClickHouse now supports standard `UPDATE` DML:

```sql
UPDATE orders
SET status = 'shipped', updated_at = now()
WHERE order_id = 12345;
```

Enable it with the experimental setting:

```sql
SET allow_experimental_lightweight_update = 1;
```

The table must also have block tracking columns enabled:

```sql
ALTER TABLE orders MODIFY SETTING
    enable_block_number_column = 1,
    enable_block_offset_column = 1;
```

## Batch UPDATE Example

```sql
UPDATE user_profiles
SET tier = 'gold'
WHERE total_spend > 10000
  AND signup_date < '2024-01-01';
```

Batch updates on filtered sets are more efficient than row-by-row operations.

## Checking Mutation Progress

Traditional `ALTER TABLE ... UPDATE` mutations can be monitored through the system table:

```sql
SELECT
    database,
    table,
    mutation_id,
    command,
    is_done,
    create_time
FROM system.mutations
WHERE is_done = 0
ORDER BY create_time DESC;
```

## Waiting for a Mutation to Complete

```sql
ALTER TABLE orders
UPDATE status = 'archived'
WHERE order_date < '2023-01-01'
SETTINGS mutations_sync = 1;
```

Setting `mutations_sync = 1` makes the operation synchronous - it blocks until the mutation finishes.

## UPDATE with Conditions on Primary Key

Updates that hit the primary key are more efficient because ClickHouse can target specific parts:

```sql
UPDATE events
SET processed = 1
WHERE event_date = today() AND event_type = 'click';
```

## Limitations

- UPDATE does not support subqueries in the `SET` clause
- Very frequent small updates should be handled via design patterns like `ReplacingMergeTree` rather than constant mutations
- Mutations cannot be rolled back

## Summary

Lightweight UPDATE in ClickHouse brings standard SQL DML syntax using patch parts rather than full mutation rewrites. For high-frequency state changes, consider append-based design with `ReplacingMergeTree`. For occasional corrections or bulk updates, the `UPDATE` statement is the cleanest approach.
