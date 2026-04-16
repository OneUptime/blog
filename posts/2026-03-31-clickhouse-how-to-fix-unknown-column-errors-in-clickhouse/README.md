# How to Fix 'Unknown column' Errors in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Schema, SQL Errors, Troubleshooting, DDL

Description: Fix ClickHouse 'Unknown column' errors caused by typos, schema mismatches, missing aliases, and column visibility in subqueries.

---

## Understanding the Error

ClickHouse raises this error when a query references a column that does not exist in the table or is not accessible in the current query scope:

```text
DB::Exception: Unknown column 'event_ts' in table 'events'. (UNKNOWN_IDENTIFIER)
```

## Common Causes

1. Column name typo or wrong case (ClickHouse column names are case-sensitive)
2. Column was renamed or dropped via a schema migration
3. Referencing an alias in WHERE that was defined in SELECT
4. Missing column in a subquery or CTE
5. Using a distributed table that has a different schema than the local table

## Diagnosing the Issue

### Verify Column Names

```sql
-- Check the exact column names and types
DESCRIBE TABLE analytics.events;

-- Search for columns by partial name (case-insensitive)
SELECT name, type, comment
FROM system.columns
WHERE table = 'events'
  AND database = 'analytics'
  AND lower(name) LIKE '%ts%';
```

### Check Column History (if using version tracking)

```sql
-- Look at recent ALTER TABLE commands on this table
SELECT
    event_time,
    user,
    query
FROM system.query_log
WHERE query LIKE '%ALTER TABLE%events%'
  AND event_time > now() - INTERVAL 30 DAY
ORDER BY event_time DESC
LIMIT 20;
```

## Fixing Column Name Errors

### Fix 1 - Correct Typos and Case

```sql
-- Wrong: event_ts does not exist
SELECT user_id, event_ts FROM analytics.events;

-- Correct: the column is event_time
SELECT user_id, event_time FROM analytics.events;
```

### Fix 2 - Use Aliases Correctly

In ClickHouse, aliases defined in SELECT cannot be used in WHERE in the same query level (unlike some other databases):

```sql
-- This fails - revenue alias is not visible in WHERE
SELECT
    user_id,
    sum(amount) AS revenue
FROM analytics.orders
WHERE revenue > 1000
GROUP BY user_id;

-- Fix 1: Use HAVING for aggregation conditions
SELECT
    user_id,
    sum(amount) AS revenue
FROM analytics.orders
GROUP BY user_id
HAVING revenue > 1000;

-- Fix 2: Use a subquery/CTE
WITH agg AS (
    SELECT user_id, sum(amount) AS revenue
    FROM analytics.orders
    GROUP BY user_id
)
SELECT * FROM agg WHERE revenue > 1000;
```

### Fix 3 - Column Missing from Subquery SELECT

```sql
-- Outer query references a column not in the inner SELECT
SELECT user_id, event_type
FROM (
    SELECT user_id
    FROM analytics.events
    -- event_type is not selected here
) AS t;

-- Fix: include the column in the subquery
SELECT user_id, event_type
FROM (
    SELECT user_id, event_type
    FROM analytics.events
) AS t;
```

### Fix 4 - Schema Divergence in Distributed Table

```sql
-- Check local vs distributed table schemas
DESCRIBE TABLE analytics.events_local;
DESCRIBE TABLE analytics.events_distributed;

-- If schemas differ, add the missing column to the local table first
ALTER TABLE analytics.events_local
ADD COLUMN event_category String DEFAULT '' AFTER event_type;
```

### Fix 5 - Column Added by ALTER but Not Yet Available

After `ALTER TABLE ADD COLUMN`, the column is available immediately but only for new parts. Old parts return the default value:

```sql
-- Add column with explicit default
ALTER TABLE analytics.events
ADD COLUMN user_segment String DEFAULT 'unknown';

-- The column is now accessible
SELECT user_id, user_segment FROM analytics.events LIMIT 5;
```

## Checking Column Availability Across Replicas

```sql
-- Verify the column exists on every replica by querying system.columns
-- across the cluster (replace 'default' with your cluster name).
SELECT
    hostName() AS host,
    database,
    table,
    name,
    type
FROM clusterAllReplicas('default', system.columns)
WHERE database = 'analytics'
  AND table = 'events'
ORDER BY host, name;
```

## Summary

"Unknown column" errors in ClickHouse are usually caused by column name typos (remember: case-sensitive), referencing SELECT aliases in WHERE clauses, or schema drift between local and distributed tables. Use `DESCRIBE TABLE` and `system.columns` to verify exact column names, fix alias references by moving conditions to HAVING or a CTE, and keep local/distributed table schemas in sync via coordinated ALTER TABLE statements.
