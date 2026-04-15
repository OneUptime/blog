# How Projections Interact with Mutations in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Projection, Mutation, MergeTree, Data Management

Description: Learn how ClickHouse projections interact with UPDATE and DELETE mutations and what to expect when running mutations on tables with projections.

---

## Projections and Mutations Overview

In ClickHouse, mutations (`ALTER TABLE ... UPDATE`, `ALTER TABLE ... DELETE`) rewrite table parts. When a table has projections, every mutation must also rewrite the corresponding projection parts - which increases mutation execution time and resource usage.

## How Mutations Affect Projections

When you run a mutation, ClickHouse:
1. Reads and rewrites all affected base table parts
2. For each part, recomputes all defined projections
3. Replaces the old parts and projection parts atomically

```sql
-- This mutation rewrites both the base table parts AND all projection parts
ALTER TABLE http_logs
    UPDATE status_code = 0
    WHERE timestamp < '2024-01-01 00:00:00';
```

## Monitoring Mutations on Tables with Projections

```sql
SELECT
    command,
    parts_to_do,
    latest_fail_reason,
    is_done
FROM system.mutations
WHERE table = 'http_logs'
  AND is_done = 0;
```

Expect significantly longer mutation times compared to tables without projections.

## Estimating Mutation Time Impact

Run a test mutation on a small time range first:

```sql
ALTER TABLE http_logs
    DELETE WHERE timestamp < '2024-01-01 00:00:00'
    AND toDate(timestamp) = '2023-12-31';
```

Observe how long it takes relative to part size, then extrapolate for the full range.

## Projection Consistency During Mutations

ClickHouse ensures that mutations maintain projection consistency. You never see a state where the base table is updated but a projection reflects old data - both are updated atomically within each part.

## Lightweight DELETE and Projections

Lightweight deletes use a different mechanism (a deletion mask via the `_row_exists` column) but have an important limitation with projections: **by default, lightweight deletes on tables with projections will throw an error.** This is because materialized projection parts do not consult the `_row_exists` mask, so they would return stale data that includes deleted rows.

Since ClickHouse v24.7, you can control this behavior with the `lightweight_mutation_projection_mode` setting:

- `throw` (default) — raises an error, preventing the inconsistency
- `drop` — drops the affected projection parts; the delete is fast but those parts lose projection optimization until the next merge rebuilds them
- `rebuild` — rebuilds the affected projection parts to reflect the deletion; slower but preserves projection optimization

```sql
SET lightweight_mutation_projection_mode = 'drop';
DELETE FROM http_logs WHERE user_id = 'u-deleted-user';
```

If you use `drop` mode and need projections to be fully rebuilt, force a merge:

```sql
OPTIMIZE TABLE http_logs FINAL;
```

## Strategies to Minimize Mutation Impact

1. **Use TTL instead of DELETE mutations** - TTL-based expiry avoids manual mutations:

```sql
ALTER TABLE http_logs MODIFY TTL timestamp + INTERVAL 90 DAY;
```

2. **Partition pruning**: structure mutations to affect only one partition at a time

```sql
ALTER TABLE http_logs
    DELETE WHERE toYYYYMM(timestamp) = 202312
    AND user_id = 'test-user';
```

3. **Off-peak scheduling**: run large mutations during low-traffic windows to limit I/O contention

## Dropping a Projection Before a Large Mutation

For very large mutations on tables with many projections, it can be faster to:
1. Drop the projection
2. Run the mutation (no projection rebuild overhead)
3. Re-add and materialize the projection

```sql
ALTER TABLE http_logs DROP PROJECTION hourly_stats;
ALTER TABLE http_logs DELETE WHERE timestamp < '2022-01-01';
ALTER TABLE http_logs ADD PROJECTION hourly_stats (...);
ALTER TABLE http_logs MATERIALIZE PROJECTION hourly_stats;
```

## Summary

Projections in ClickHouse increase mutation cost because every mutation must rewrite projection parts alongside base table parts. Minimize this impact by preferring TTL-based data expiry over DELETE mutations, batching mutations by partition, and considering temporary projection removal for extremely large one-time mutations.
