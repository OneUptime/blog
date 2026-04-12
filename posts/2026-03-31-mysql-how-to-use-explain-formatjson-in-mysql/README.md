# How to Use EXPLAIN FORMAT=JSON in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query Optimization, Performance, SQL

Description: Learn how to use EXPLAIN FORMAT=JSON in MySQL to get detailed, structured execution plan data including cost estimates and optimizer decisions.

---

## What Is EXPLAIN FORMAT=JSON?

`EXPLAIN FORMAT=JSON` outputs the query execution plan as a JSON document instead of the standard tabular format. The JSON output is more verbose and includes additional details that the tabular format omits, such as cost breakdowns, access predicates, and nested subquery information.

## Basic Syntax

```sql
EXPLAIN FORMAT=JSON SELECT ...;
```

## Simple Example

```sql
EXPLAIN FORMAT=JSON
SELECT * FROM users WHERE email = 'alice@example.com';
```

Output:

```json
{
  "query_block": {
    "select_id": 1,
    "cost_info": {
      "query_cost": "0.35"
    },
    "table": {
      "table_name": "users",
      "access_type": "const",
      "possible_keys": ["idx_email"],
      "key": "idx_email",
      "used_key_parts": ["email"],
      "key_length": "1022",
      "ref": ["const"],
      "rows_examined_per_scan": 1,
      "rows_produced_per_join": 1,
      "filtered": "100.00",
      "cost_info": {
        "read_cost": "0.00",
        "eval_cost": "0.10",
        "prefix_cost": "0.00",
        "data_read_per_join": "168"
      },
      "used_columns": ["id", "username", "email", "is_active", "created_at"]
    }
  }
}
```

## Key Fields in the JSON Output

```text
query_cost          - total estimated cost of the query
access_type         - how the table is accessed (same as type in tabular)
key                 - index chosen
key_length          - bytes of the index used
rows_examined_per_scan - estimated rows examined per scan
filtered            - % of rows passing the WHERE filter
cost_info.read_cost - cost to read rows
cost_info.eval_cost - cost to evaluate the WHERE clause
used_columns        - columns accessed from this table
attached_condition  - the WHERE condition applied at this node
```

## Multi-Table JOIN Example

```sql
EXPLAIN FORMAT=JSON
SELECT o.id, u.username, o.total
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'shipped'\G
```

The JSON structure shows a nested `nested_loop` object:

```json
{
  "query_block": {
    "select_id": 1,
    "cost_info": {
      "query_cost": "320.75"
    },
    "nested_loop": [
      {
        "table": {
          "table_name": "o",
          "access_type": "ref",
          "key": "idx_status",
          "cost_info": {
            "read_cost": "300.00",
            "eval_cost": "20.00",
            "prefix_cost": "320.50",
            "data_read_per_join": "4K"
          }
        }
      },
      {
        "table": {
          "table_name": "u",
          "access_type": "eq_ref",
          "key": "PRIMARY",
          "cost_info": {
            "read_cost": "0.00",
            "eval_cost": "0.25",
            "prefix_cost": "320.75",
            "data_read_per_join": "168"
          }
        }
      }
    ]
  }
}
```

## Using Python to Parse EXPLAIN FORMAT=JSON

```python
import subprocess
import json

def explain_query(query, db, user, password):
    explain_sql = f"EXPLAIN FORMAT=JSON {query}"
    result = subprocess.run(
        ['mysql', '-u', user, f'-p{password}', db, '-e', explain_sql, '--batch', '--skip-column-names'],
        capture_output=True, text=True
    )
    return json.loads(result.stdout.strip())

plan = explain_query("SELECT * FROM orders WHERE user_id = 5", "myapp", "root", "pass")
query_cost = plan['query_block']['cost_info']['query_cost']
print(f"Query cost: {query_cost}")
```

## Comparing FORMAT=JSON vs Tabular

```sql
-- Tabular format (default)
EXPLAIN SELECT * FROM orders WHERE user_id = 5;

-- JSON format (more detail)
EXPLAIN FORMAT=JSON SELECT * FROM orders WHERE user_id = 5;

-- Tree format (MySQL 8.0+)
EXPLAIN FORMAT=TREE SELECT * FROM orders WHERE user_id = 5;
```

Use tabular for quick checks, JSON for programmatic analysis, and TREE (or `EXPLAIN ANALYZE`) for deep dives.

## Finding the attached_condition Field

JSON output includes the exact predicate used at each node:

```json
"attached_condition": "(`myapp`.`orders`.`status` = 'shipped') and (`myapp`.`orders`.`created_at` > '2024-01-01')"
```

This shows exactly which conditions are applied at each table access step. To verify Index Condition Pushdown (ICP), look for `"message": "Using index condition"` in the table's JSON output.

## Subqueries in JSON Format

Subqueries appear as nested `query_block` objects, making it easy to analyze their independent costs:

```sql
EXPLAIN FORMAT=JSON
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders WHERE total > 1000);
```

The JSON output shows a separate `query_block` for the subquery with its own `cost_info`.

## Summary

`EXPLAIN FORMAT=JSON` in MySQL provides a richly structured execution plan with cost breakdowns, access predicates, and nested query details not available in the standard tabular format. Use it for programmatic analysis of execution plans, detailed cost inspection, and understanding complex queries with subqueries or multiple joins. For real execution metrics, use `EXPLAIN ANALYZE` in MySQL 8.0.18+ (which outputs in TREE format).
