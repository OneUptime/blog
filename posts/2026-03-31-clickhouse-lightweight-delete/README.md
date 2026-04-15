# How to Use Lightweight DELETE in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Lightweight Delete, Delete, Data Management, MergeTree, Performance

Description: Learn how to use ClickHouse lightweight DELETE to remove rows efficiently without triggering heavy background mutations on MergeTree tables.

---

Traditional `DELETE` operations in ClickHouse used mutations, which rewrote entire data parts asynchronously. Lightweight DELETE was introduced as a faster alternative that marks rows as deleted immediately using a hidden delete mask, deferring actual data removal to a later merge.

## Basic Lightweight DELETE Syntax

```sql
DELETE FROM events WHERE user_id = 42;
```

This looks like standard SQL but behaves differently under the hood. ClickHouse writes a delete mask rather than rewriting the data part immediately.

## Deleting with Complex Conditions

```sql
DELETE FROM logs
WHERE event_date < today() - INTERVAL 90 DAY
  AND severity = 'DEBUG';
```

Multiple conditions work as expected. ClickHouse filters the rows using the delete mask on all subsequent reads.

## Checking Lightweight Delete Support

Lightweight DELETE requires `allow_experimental_lightweight_delete = 1` on older versions. On ClickHouse 23.3+ it is generally available:

```sql
SET allow_experimental_lightweight_delete = 1;

DELETE FROM orders WHERE status = 'cancelled' AND order_date < '2024-01-01';
```

## Verifying the Delete

After a `DELETE`, the rows become invisible to queries immediately, even before the background merge physically removes them:

```sql
SELECT count() FROM orders WHERE status = 'cancelled' AND order_date < '2024-01-01';
-- Returns 0
```

## When Rows Are Physically Removed

The deleted rows are physically removed when ClickHouse merges the affected data part. You can trigger this manually:

```sql
OPTIMIZE TABLE orders FINAL;
```

## Limitations

- Lightweight DELETE does not work on tables with projections by default (see the `lightweight_mutation_projection_mode` setting to change this)
- Large volumes of lightweight deletes can negatively affect `SELECT` query performance
- Very large deletes on high-cardinality columns can still put pressure on merges

## Monitoring Pending Deletes

```sql
SELECT
    database,
    table,
    name,
    has_lightweight_delete
FROM system.parts
WHERE has_lightweight_delete = 1 AND active = 1;
```

## Summary

Lightweight DELETE in ClickHouse provides SQL-compatible row removal that is immediately consistent for reads while deferring physical cleanup to background merges. It is the preferred approach over traditional mutations for most operational delete workloads.
