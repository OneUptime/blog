# Why You Should Avoid Frequent ALTERs in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ALTER TABLE, Schema Migration, Performance, Best Practice

Description: Learn why frequent ALTER TABLE operations are expensive in ClickHouse and how to plan schema changes to minimize impact on production workloads.

---

## How ALTER Works in ClickHouse

Unlike row-oriented databases where ALTER TABLE can be a metadata-only change, many ClickHouse ALTER operations are heavyweight. Depending on the change type, ClickHouse may need to rewrite data parts, block merges, or propagate changes to replicas.

## Types of ALTER and Their Costs

```sql
-- Fast: metadata-only on MergeTree (no data rewrite)
ALTER TABLE events ADD COLUMN session_id String DEFAULT '';

-- Fast: metadata update, applied lazily on part read/write
ALTER TABLE events ADD COLUMN flags UInt8 DEFAULT 0;

-- SLOW: rewrites all data parts
ALTER TABLE events MODIFY COLUMN user_id String;  -- changing type

-- SLOW on large tables: rewrites affected parts asynchronously as a mutation
ALTER TABLE events DELETE WHERE user_id = 12345;

-- SLOW: rewrites parts to update values
ALTER TABLE events UPDATE status = 'inactive' WHERE last_seen < '2025-01-01';
```

## Mutations Block and Queue

`ALTER TABLE ... UPDATE` and `ALTER TABLE ... DELETE` create mutations. Mutations process asynchronously but:

- Are applied to each part in the order they were submitted
- Block some partition-level operations
- Read and rewrite every affected part

Check pending mutations:

```sql
SELECT table, command, create_time, is_done, parts_to_do
FROM system.mutations
WHERE is_done = 0
ORDER BY create_time;
```

## Schema Design to Reduce ALTERs

Plan for extensibility upfront.

```sql
-- Add a flexible JSON/Map column for future attributes
CREATE TABLE events (
  event_id   UInt64,
  event_type String,
  user_id    UInt64,
  event_time DateTime,
  properties Map(String, String)   -- absorbs future fields
) ENGINE = MergeTree()
ORDER BY (user_id, event_time);

-- Future fields stored without schema change
INSERT INTO events VALUES (
  1, 'purchase', 42, now(),
  map('currency', 'USD', 'amount', '99.99')
);
```

## Batching Multiple ALTERs

Combine multiple changes into a single `ALTER TABLE` statement to reduce the number of part rewrites.

```sql
-- WRONG: two separate rewrites
ALTER TABLE events ADD COLUMN region String DEFAULT '';
ALTER TABLE events ADD COLUMN platform String DEFAULT '';

-- BETTER: one operation, applied together
ALTER TABLE events
  ADD COLUMN region   String DEFAULT '',
  ADD COLUMN platform String DEFAULT '';
```

## Using the MATERIALIZE Mutation Sparingly

Materializing a new column populates existing parts, which is a full data rewrite. Only do this when necessary.

```sql
-- Adds column lazily (default value served from metadata, not stored)
ALTER TABLE events ADD COLUMN is_mobile UInt8 DEFAULT 0;

-- Triggers full rewrite of all parts - avoid on large tables
ALTER TABLE events MATERIALIZE COLUMN is_mobile;
```

## Summary

Frequent `ALTER TABLE` operations in ClickHouse cause background mutations that rewrite data parts and queue behind each other, degrading performance for concurrent queries and merges. Design schemas with `Map` columns for future flexibility, batch multiple `ADD COLUMN` changes into a single statement, avoid type-changing `MODIFY COLUMN` on large tables, and prefer soft-delete patterns over `ALTER TABLE DELETE`.
