# How to Fix 'Stack overflow' in Complex ClickHouse Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Stack Overflow, Query Optimization, Troubleshooting, Performance

Description: Learn how to diagnose and fix stack overflow errors in ClickHouse caused by deeply recursive query structures and overly complex expressions.

---

## Understanding the Error

A stack overflow in ClickHouse occurs when query evaluation exhausts the thread's call stack. The error looks like:

```text
DB::Exception: Stack size too large. Stack address: 0x..., frame address: 0x..., stack size: ..., maximum stack size: ... (TOO_DEEP_RECURSION)
```

Unlike typical stack overflows in application code, this one is triggered inside ClickHouse's query processing pipeline, usually by:
- Extremely deep recursive CTEs
- Hundreds of UNION ALL branches
- Very long chains of nested functions
- Complex query rewrites by the optimizer

## Common Triggers

### Deeply Recursive CTEs

```sql
-- This type of recursive expansion blows the stack
WITH RECURSIVE numbers AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM numbers WHERE n < 10000
)
SELECT * FROM numbers;
```

### Long UNION ALL Chains

Auto-generated queries sometimes union hundreds of subqueries:

```sql
-- Each branch adds a stack frame during planning
SELECT 'shard_1' AS source, count() FROM shard1.events
UNION ALL
SELECT 'shard_2' AS source, count() FROM shard2.events
UNION ALL
-- ... 500 more branches
SELECT 'shard_500' AS source, count() FROM shard500.events;
```

### Deeply Nested Lambda Functions

```sql
-- Chaining arrayMap/arrayFilter too deeply
SELECT
    arrayMap(x -> arrayMap(y -> arrayMap(z -> z * 2,
        arrayFilter(z -> z > 0, array(z))),
        arrayFilter(y -> y > 0, array(y))),
        arrayFilter(x -> x > 0, arr))
FROM my_table;
```

## Fix 1 - Adjust Recursion-Related Query Limits

ClickHouse does not expose the OS thread stack size through `config.xml`; that is controlled by the OS/ulimit. What you can tune are the per-query limits that govern how deep the parser and AST can recurse before ClickHouse raises `TOO_DEEP_RECURSION`. Lowering these is often the right call to fail fast on pathological queries; raising them can provide headroom for legitimately complex ones.

```sql
-- Session-level overrides (defaults: max_parser_depth=1000, max_ast_depth=1000)
SET max_parser_depth = 2000;
SET max_ast_depth = 2000;
```

You can also set these as defaults in `users.xml` under a profile:

```xml
<profiles>
    <default>
        <max_parser_depth>2000</max_parser_depth>
        <max_ast_depth>2000</max_ast_depth>
    </default>
</profiles>
```

## Fix 2 - Break UNION ALL Into Batches

Instead of one massive UNION ALL, materialize intermediate results:

```bash
#!/bin/bash
# Process shards in batches
for shard in $(seq 1 500); do
    clickhouse-client --query "
        INSERT INTO analytics.combined_events
        SELECT '$shard' AS source, *
        FROM shard${shard}.events
        WHERE event_date = today()
    "
done
```

Or use a distributed table instead of manual unions:

```sql
-- Use a Distributed table engine to avoid manual UNION ALL
CREATE TABLE analytics.events_distributed AS analytics.events_local
ENGINE = Distributed('my_cluster', 'analytics', 'events_local', rand());

SELECT source, count() FROM analytics.events_distributed GROUP BY source;
```

## Fix 3 - Flatten Nested Array Operations

Replace deep lambda chains with intermediate columns:

```sql
-- Break the computation into multiple steps with CTEs
WITH
    filtered_raw AS (
        SELECT arrayFilter(x -> x > 0, arr) AS positive_vals
        FROM my_table
    ),
    doubled AS (
        SELECT arrayMap(x -> x * 2, positive_vals) AS doubled_vals
        FROM filtered_raw
    )
SELECT doubled_vals FROM doubled;
```

## Fix 4 - Rewrite Recursive CTEs With Window Functions

ClickHouse does not natively support recursive CTEs efficiently. Rewrite them using window functions or pre-computed data:

```sql
-- Instead of recursive CTE to compute cumulative sums:
SELECT
    day,
    sum(revenue) OVER (ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM daily_sales
ORDER BY day;
```

## Monitoring Stack Issues

```sql
-- Find queries that terminated with stack overflow
SELECT
    query_id,
    query_duration_ms,
    exception_code,
    exception,
    query
FROM system.query_log
WHERE exception_code = 306 -- TOO_DEEP_RECURSION
  AND event_time > now() - INTERVAL 7 DAY
ORDER BY event_time DESC;
```

## Summary

Stack overflow errors in ClickHouse arise from deeply recursive query structures that exhaust thread stack space during planning or execution. The best fixes are structural: replace massive UNION ALL chains with Distributed tables, rewrite recursive CTEs using window functions, and break nested lambda chains into CTE steps. Tuning `max_parser_depth` and `max_ast_depth` can provide short-term relief but does not address the underlying query complexity.
