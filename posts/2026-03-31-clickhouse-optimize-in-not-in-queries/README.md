# How to Optimize IN and NOT IN Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, IN, NOT IN, Query Optimization, Subquery, Performance

Description: Learn how to write efficient IN and NOT IN queries in ClickHouse, avoid common pitfalls with distributed tables, and use alternatives like semi-joins.

---

`IN` and `NOT IN` are commonly used in analytical SQL but behave differently in ClickHouse than in traditional databases. Understanding their execution model prevents subtle bugs and severe performance problems.

## How IN Works in ClickHouse

For a literal value list, `IN` is fast - ClickHouse builds a small hash set at planning time:

```sql
SELECT count() FROM events WHERE status IN ('error', 'timeout', 'rejected');
```

For a subquery, ClickHouse executes the subquery first, builds a hash set in memory, then scans the outer table:

```sql
SELECT count() FROM events
WHERE user_id IN (SELECT user_id FROM blocked_users);
```

The subquery result must fit in memory. Use `max_rows_in_set` to cap it.

## Avoid Large IN Lists

Lists with hundreds of thousands of values are slow to parse and build. Use a temporary table or dictionary instead:

```sql
-- Use a dictionary for large lookup sets
CREATE DICTIONARY blocked_users_dict (
    user_id UInt64,
    reason  String
) PRIMARY KEY user_id
SOURCE(CLICKHOUSE(TABLE 'blocked_users'))
LAYOUT(HASHED())
LIFETIME(MIN 60 MAX 120);

SELECT count() FROM events
WHERE dictHas('blocked_users_dict', user_id);
```

## IN with Distributed Tables

On distributed tables, a subquery in `IN` is executed on each shard independently by default. This means the subquery runs N times (once per shard) and the right-hand data is not broadcast:

```sql
-- This runs the subquery on every shard separately
SELECT count() FROM events_distributed
WHERE user_id IN (SELECT user_id FROM blocked_users_distributed);
```

Use `GLOBAL IN` to execute the subquery once on the initiating node and broadcast the result:

```sql
SELECT count() FROM events_distributed
WHERE user_id GLOBAL IN (SELECT user_id FROM blocked_users_distributed);
```

## NOT IN and NULL Handling

`NOT IN` returns no rows when the right-hand set contains NULL. This is a common SQL gotcha:

```sql
-- Returns 0 rows if blocked_users has any NULL user_id
SELECT count() FROM events
WHERE user_id NOT IN (SELECT user_id FROM blocked_users);

-- Safe version: exclude NULLs from the subquery
SELECT count() FROM events
WHERE user_id NOT IN (SELECT user_id FROM blocked_users WHERE user_id IS NOT NULL);
```

## Use Anti-JOIN Instead of NOT IN

For large NOT IN sets, a `LEFT ANTI JOIN` is more memory-efficient:

```sql
SELECT e.event_id
FROM events AS e
LEFT ANTI JOIN blocked_users AS b ON e.user_id = b.user_id;
```

## Tune Memory Limits for IN Subqueries

```sql
SET max_rows_in_set = 10000000;     -- max rows in IN hash set
SET max_bytes_in_set = 500000000;   -- max bytes in IN hash set
SET transform_null_in = 1;          -- enable NULL = NULL matching in IN clauses
```

## Summary

Optimizing IN and NOT IN in ClickHouse requires using `GLOBAL IN` on distributed tables to avoid per-shard subquery re-execution, replacing large value lists with dictionaries, and using `LEFT ANTI JOIN` instead of `NOT IN` for large exclusion sets. Always handle NULL carefully in NOT IN to avoid silently empty result sets.
