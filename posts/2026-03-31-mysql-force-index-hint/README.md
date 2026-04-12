# How to Use FORCE INDEX Hint in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, Query Optimization, Performance, Hint

Description: Learn how to use the FORCE INDEX hint in MySQL to make the optimizer use a specific index, overriding its cost-based decision.

---

## Overview

MySQL's query optimizer automatically selects indexes based on cost estimates. Sometimes the optimizer picks a suboptimal index or performs a full table scan when a specific index would be faster. The `FORCE INDEX` hint instructs MySQL to use a particular index and only fall back to a full table scan if the index cannot be used at all.

## Basic FORCE INDEX Syntax

```sql
SELECT * FROM orders FORCE INDEX (idx_customer_id)
WHERE customer_id = 42;
```

The hint is placed after the table name. MySQL will use `idx_customer_id` even if its cost estimate suggests another approach.

## FORCE INDEX vs USE INDEX

`USE INDEX` is a weaker hint - it tells the optimizer to consider only the listed indexes but still allows a full table scan if the optimizer prefers it. `FORCE INDEX` is stronger - it makes a full table scan very expensive in the optimizer's cost model, so a scan is used only if the named index cannot be used at all:

```sql
-- Weaker: optimizer may still choose full scan
SELECT * FROM orders USE INDEX (idx_customer_id)
WHERE customer_id = 42;

-- Stronger: full scan only if index cannot be used
SELECT * FROM orders FORCE INDEX (idx_customer_id)
WHERE customer_id = 42;
```

## Forcing an Index for ORDER BY or GROUP BY

You can target `FORCE INDEX` specifically to ORDER BY or GROUP BY operations:

```sql
-- Force index for the WHERE clause filtering
SELECT * FROM orders FORCE INDEX FOR JOIN (idx_created_at)
WHERE created_at > '2024-01-01';

-- Force index for ORDER BY
SELECT * FROM orders FORCE INDEX FOR ORDER BY (idx_created_at)
ORDER BY created_at DESC;

-- Force index for GROUP BY
SELECT customer_id, COUNT(*) FROM orders FORCE INDEX FOR GROUP BY (idx_customer_id)
GROUP BY customer_id;
```

## When to Use FORCE INDEX

Use `FORCE INDEX` when:
- EXPLAIN shows the optimizer choosing a poor index or a full table scan
- Statistics are stale and `ANALYZE TABLE` has not yet been run
- You are testing whether a specific index improves performance
- A known query pattern consistently performs better with a specific index

## Verifying with EXPLAIN

Always use EXPLAIN to confirm the hint is working:

```sql
EXPLAIN SELECT * FROM orders FORCE INDEX (idx_customer_id)
WHERE customer_id = 42;
```

Check the `key` column in the output - it should show `idx_customer_id`.

## Forcing a Primary Key

You can force the use of the primary key:

```sql
SELECT * FROM orders FORCE INDEX (PRIMARY)
WHERE id BETWEEN 1000 AND 2000;
```

## Risks of FORCE INDEX

Forcing an index can degrade performance if:
- The index is not selective enough for the data being queried
- The table data distribution changes over time
- A newer, better index is added later

Use `FORCE INDEX` as a short-term fix and investigate why the optimizer is making a suboptimal choice. Running `ANALYZE TABLE` often resolves the issue without needing hints.

```sql
ANALYZE TABLE orders;
```

## Summary

`FORCE INDEX` overrides MySQL's optimizer to use a specific index, making full table scans a last resort. It is stronger than `USE INDEX` and useful when the optimizer makes poor choices due to stale statistics. Always verify with EXPLAIN and treat it as a temporary measure while addressing the root cause.
