# How to Use the Optimizer Trace in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Optimizer, Performance, Query, Optimization

Description: Learn how to enable and read MySQL's optimizer trace to understand why the query optimizer chose a particular execution plan and how costs are calculated.

---

## What Is the Optimizer Trace?

The MySQL optimizer trace is a detailed JSON record of every decision the query optimizer makes when planning a query. Unlike `EXPLAIN`, which shows the final execution plan, the optimizer trace shows the reasoning - cost calculations, index candidates considered, join order permutations evaluated, and why alternatives were rejected.

It is most useful when EXPLAIN shows an unexpected plan and you need to understand why the optimizer made its choice.

## Enabling the Optimizer Trace

```sql
-- Enable the optimizer trace for the current session
SET SESSION optimizer_trace = 'enabled=on';

-- Run the query you want to analyze
SELECT o.id, c.name, SUM(oi.amount)
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY o.id;

-- Read the trace output
SELECT * FROM information_schema.OPTIMIZER_TRACE\G
```

## Reading the Trace Output

The trace is a large JSON document. The most important sections are:

```json
{
  "steps": [
    {
      "join_preparation": { "select#": 1, "steps": [ "..." ] }
    },
    {
      "join_optimization": {
        "select#": 1,
        "steps": [
          {
            "rows_estimation": [
              {
                "table": "`orders` `o`",
                "range_analysis": {
                  "table_scan": { "rows": 500000, "cost": 100234 },
                  "potential_range_indexes": [
                    { "index": "idx_status", "usable": true, "key_parts": ["status"] }
                  ]
                }
              }
            ]
          },
          {
            "considered_execution_plans": [
              {
                "table": "`orders` `o`",
                "best_access_path": {
                  "considered_access_paths": [
                    { "access_type": "ref", "index": "idx_status", "rows": 25000, "cost": 5123, "chosen": true },
                    { "access_type": "scan", "cost": 100234, "chosen": false }
                  ]
                }
              }
            ]
          }
        ]
      }
    }
  ]
}
```

## Extracting Key Information

```sql
-- Limit trace size to avoid reading enormous output
SET SESSION optimizer_trace_max_mem_size = 1048576;  -- 1MB

-- Run query and extract just the optimization section
SELECT JSON_EXTRACT(TRACE, '$.steps[*].join_optimization')
FROM information_schema.OPTIMIZER_TRACE\G
```

## Understanding Cost Calculations

The trace shows the estimated cost for each access path. MySQL chooses the lowest cost path:

```text
table_scan cost: 100234  (reading all rows)
index ref cost:  5123    (using idx_status)
Chosen: index ref (lower cost)
```

When an index exists but is not used, the trace will show it was considered but had a higher estimated cost:

```json
{
  "potential_range_indexes": [
    { "index": "idx_region", "usable": false, "cause": "not applicable" },
    { "index": "idx_status", "usable": true }
  ]
}
```

## Tracing a Specific Query

```sql
-- Enable trace with compact formatting disabled (one_line=off is the default)
SET SESSION optimizer_trace = 'enabled=on,one_line=off';
SET SESSION optimizer_trace_limit = 1;  -- Keep only the most recent trace (this is the default)

-- Run the query
EXPLAIN SELECT * FROM products WHERE price BETWEEN 100 AND 500 ORDER BY name;

-- Disable trace after use
SET SESSION optimizer_trace = 'enabled=off';

-- Read output
SELECT TRACE FROM information_schema.OPTIMIZER_TRACE\G
```

## Finding Why an Index Was Not Used

The trace `potential_range_indexes` section shows all candidate indexes and why each was or was not selected:

```json
"potential_range_indexes": [
  {
    "index": "idx_price_name",
    "usable": true,
    "key_parts": ["price", "name"]
  },
  {
    "index": "idx_name",
    "usable": false,
    "cause": "not applicable"
  }
]
```

If `usable: false` appears for your expected index, the cause field explains why (wrong column order, data type mismatch, etc.).

## Always Disable After Use

```sql
-- Always turn off optimizer trace when done - it adds overhead
SET SESSION optimizer_trace = 'enabled=off';
```

## Summary

The MySQL optimizer trace provides complete visibility into the optimizer's decision-making process, including cost estimates for every access path and the reason each alternative was accepted or rejected. Use it when EXPLAIN shows an unexpected plan and you need to understand why an index was not used or why the join order differs from what you expect. Always disable the trace after debugging since it adds overhead to every query executed in the session.
