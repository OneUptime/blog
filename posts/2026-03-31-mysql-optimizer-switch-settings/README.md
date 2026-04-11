# How to Configure MySQL Optimizer Switch Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Optimizer, Query Optimization, Configuration, Performance

Description: Learn how to use MySQL optimizer_switch to enable or disable specific query optimization strategies to improve query performance or work around optimizer bugs.

---

## Overview

MySQL's `optimizer_switch` system variable contains a set of flags that control which optimization strategies the query optimizer uses. Understanding and tuning these flags lets you guide the optimizer toward better execution plans for specific workloads.

## Viewing Current Optimizer Switch Settings

```sql
-- View all optimizer_switch flags
SHOW VARIABLES LIKE 'optimizer_switch';

-- Format for readability
SELECT REPLACE(@@optimizer_switch, ',', '\n') AS flags;
```

The output shows a comma-separated list of flag=on/off pairs:

```text
index_merge=on
index_merge_union=on
index_merge_sort_union=on
index_merge_intersection=on
engine_condition_pushdown=on
index_condition_pushdown=on
mrr=on
mrr_cost_based=on
block_nested_loop=on
batched_key_access=off
materialization=on
semijoin=on
loosescan=on
firstmatch=on
duplicateweedout=on
subquery_materialization_cost_based=on
use_index_extensions=on
condition_fanout_filter=on
derived_merge=on
```

## Key Optimizer Flags Explained

```text
index_merge             - Combine multiple indexes for one query
index_condition_pushdown - Push WHERE conditions into index scans (ICP)
mrr                     - Multi-Range Read: read primary key rows in disk order
batched_key_access      - BKA join algorithm (usually off by default)
materialization         - Materialize subquery results as temporary tables
semijoin                - Optimize IN/EXISTS subqueries as semijoins
derived_merge           - Merge derived tables into outer query
hash_join               - Use hash join for non-indexed joins (MySQL 8.0.18–8.0.19 only; removed in 8.0.20)
```

## Enabling or Disabling Specific Flags

```sql
-- Enable batched key access (often improves range scans with joins)
SET GLOBAL optimizer_switch = 'batched_key_access=on';

-- Disable block nested loop (in MySQL 8.0.20+, this also disables hash join)
SET GLOBAL optimizer_switch = 'block_nested_loop=off';

-- Multiple changes at once (mrr_cost_based=off is required for BKA to work)
SET SESSION optimizer_switch = 'mrr=on,mrr_cost_based=off,batched_key_access=on';
```

Changes can be made at the session level (affects only current connection) or globally (affects new connections):

```sql
-- Session level (preferred for testing)
SET SESSION optimizer_switch = 'derived_merge=off';

-- Global level (affects all new connections)
SET GLOBAL optimizer_switch = 'derived_merge=off';
```

## Practical Example: Fixing a Bad Execution Plan

Suppose a query uses a full table scan instead of an index due to optimizer miscalculation:

```sql
-- Check the execution plan
EXPLAIN SELECT o.id, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending'
  AND c.region = 'US';

-- If the optimizer chooses a bad plan, try enabling BKA
SET SESSION optimizer_switch = 'batched_key_access=on,mrr=on,mrr_cost_based=off';

-- Re-check the plan
EXPLAIN SELECT o.id, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending'
  AND c.region = 'US';
```

## Using Optimizer Hints Instead

For targeted control without changing global settings, use optimizer hints:

```sql
-- Force an index
SELECT /*+ INDEX(orders idx_status) */ id, customer_id
FROM orders
WHERE status = 'pending';

-- Disable hash join for a specific query (MySQL 8.0.18–8.0.19 only; use NO_BNL in 8.0.20+)
SELECT /*+ NO_BNL(o, c) */ o.id, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id;

-- Set specific optimizer flags for a query
SELECT /*+ SET_VAR(optimizer_switch='derived_merge=off') */
    sub.total_amount
FROM (
    SELECT customer_id, SUM(amount) AS total_amount
    FROM orders
    GROUP BY customer_id
) sub;
```

## Persisting Optimizer Switch Settings

```text
[mysqld]
optimizer_switch = "index_merge=on,batched_key_access=on,mrr=on,mrr_cost_based=off"
```

## Summary

MySQL `optimizer_switch` provides fine-grained control over query optimization strategies. Use session-level changes to test optimizer flag impacts before applying globally. For production, prefer optimizer hints over global changes when only specific queries need different behavior. Key flags to consider enabling are `batched_key_access` with `mrr=on` and `mrr_cost_based=off` for join-heavy workloads. Hash joins are available by default in MySQL 8.0.18+ for large non-indexed joins (no optimizer_switch flag needed in 8.0.20+). Always validate execution plan changes with EXPLAIN before deploying to production.
