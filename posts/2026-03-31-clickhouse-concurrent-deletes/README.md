# How to Handle Concurrent Deletes in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Concurrent Delete, Mutation, Lightweight Delete, Concurrency, MergeTree

Description: Learn how ClickHouse handles concurrent DELETE operations, how mutations queue up, and best practices for safe parallel delete workloads.

---

ClickHouse is designed for analytical workloads, but production systems often need to delete data concurrently - purging expired records, removing GDPR data, and pruning old logs all at the same time. Understanding how ClickHouse manages concurrency for deletes prevents conflicts and surprises.

## How Mutations Are Queued

Traditional `ALTER TABLE ... UPDATE/DELETE` mutations run sequentially per table. If you submit multiple mutations at once, ClickHouse queues them:

```sql
ALTER TABLE events DELETE WHERE user_id = 1;
ALTER TABLE events DELETE WHERE user_id = 2;
ALTER TABLE events DELETE WHERE user_id = 3;
```

These mutations run one after another on each data part, not in parallel. You can observe the queue:

```sql
SELECT mutation_id, command, create_time, is_done
FROM system.mutations
WHERE table = 'events'
ORDER BY create_time;
```

## Lightweight DELETEs and Concurrency

Lightweight DELETEs (the `DELETE FROM` syntax) are still implemented as mutations, but they are much faster because they only mark rows as deleted via a hidden `_row_exists` mask column instead of rewriting whole parts:

```sql
DELETE FROM events WHERE user_id = 1;
DELETE FROM events WHERE user_id = 2;
```

Multiple lightweight deletes still queue sequentially on the same table, but each completes much faster than a rewrite-based mutation, so the backlog drains quickly and they do not block concurrent inserts.

## Avoiding Mutation Accumulation

Too many pending mutations degrade read performance. Monitor the backlog:

```sql
SELECT count() AS pending_mutations
FROM system.mutations
WHERE is_done = 0;
```

If this grows large, avoid issuing new mutations until existing ones complete.

## Batch Deletes to Reduce Concurrency Pressure

Instead of thousands of individual deletes, batch them into a single operation:

```sql
-- Avoid: thousands of separate deletes
DELETE FROM events WHERE user_id = 101;
DELETE FROM events WHERE user_id = 102;

-- Better: one combined delete
DELETE FROM events WHERE user_id IN (101, 102, 103, 104, 105);
```

## Using ReplacingMergeTree to Avoid Deletes

For GDPR and soft-delete patterns, consider using a flag column with `ReplacingMergeTree` instead of concurrent deletes:

```sql
CREATE TABLE users (
    user_id UInt64,
    name String,
    deleted UInt8 DEFAULT 0,
    version UInt64
) ENGINE = ReplacingMergeTree(version)
ORDER BY user_id;

INSERT INTO users VALUES (42, 'Alice', 1, 2);
```

Queries filter on `deleted = 0` without needing actual deletes.

## Summary

ClickHouse serializes mutations per table — including lightweight DELETEs — but lightweight DELETEs drain the queue much faster because they only update a mask column instead of rewriting parts. Batch your delete predicates to reduce mutation count, monitor `system.mutations` to avoid queue buildup, and consider logical soft-deletes via `ReplacingMergeTree` for high-frequency removal patterns.
