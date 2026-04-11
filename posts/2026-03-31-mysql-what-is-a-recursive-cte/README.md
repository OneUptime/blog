# What Is a Recursive CTE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Recursive CTE, Hierarchical Data, SQL, Common Table Expression

Description: A recursive CTE in MySQL is a WITH clause query that references itself to process hierarchical or iterative data like trees, graphs, and number sequences.

---

## Overview

A recursive CTE is a Common Table Expression that references itself in its definition, allowing the query to process hierarchical or iterative data in a loop. MySQL 8.0 introduced support for recursive CTEs using the `WITH RECURSIVE` syntax. They are the standard way to traverse parent-child relationships (org charts, category trees, file paths) and generate sequences without using stored procedures or application-side loops.

## Structure of a Recursive CTE

A recursive CTE must have two parts connected by `UNION ALL`:

1. **Anchor member**: A non-recursive SELECT that produces the starting rows.
2. **Recursive member**: A SELECT that references the CTE name and builds on the previous iteration.

```sql
WITH RECURSIVE cte AS (
  -- Anchor: starting condition
  SELECT initial_row

  UNION ALL

  -- Recursive: join CTE back to itself
  SELECT next_row
  FROM cte
  JOIN source_table ON join_condition
  WHERE stopping_condition
)
SELECT * FROM cte;
```

## Traversing a Category Tree

A classic use case is traversing a self-referential table:

```sql
CREATE TABLE categories (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  parent_id INT NULL REFERENCES categories(id)
);

-- Find all descendants of category 1
WITH RECURSIVE category_tree AS (
  -- Anchor: start at the root
  SELECT id, name, parent_id, 0 AS depth
  FROM categories
  WHERE id = 1

  UNION ALL

  -- Recursive: join children to current level
  SELECT c.id, c.name, c.parent_id, ct.depth + 1
  FROM categories c
  JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree ORDER BY depth, name;
```

## Generating a Number Sequence

```sql
WITH RECURSIVE numbers AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM numbers WHERE n < 100
)
SELECT n FROM numbers;
```

## Generating a Date Series

```sql
WITH RECURSIVE date_series AS (
  SELECT '2026-01-01' AS dt
  UNION ALL
  SELECT DATE_ADD(dt, INTERVAL 1 DAY)
  FROM date_series
  WHERE dt < '2026-12-31'
)
SELECT dt FROM date_series;
```

This is particularly useful for filling in gaps in time-series reports.

## Bill of Materials (BOM)

Recursively expand a product's components:

```sql
CREATE TABLE components (
  component_id INT,
  parent_component_id INT NULL,
  name VARCHAR(100),
  quantity INT
);

WITH RECURSIVE bom AS (
  SELECT component_id, name, quantity, 0 AS level
  FROM components
  WHERE parent_component_id IS NULL AND component_id = 10

  UNION ALL

  SELECT c.component_id, c.name, c.quantity, b.level + 1
  FROM components c
  JOIN bom b ON c.parent_component_id = b.component_id
)
SELECT CONCAT(REPEAT('  ', level), name) AS indented_name, quantity
FROM bom;
```

## Preventing Infinite Loops

MySQL limits recursion with `cte_max_recursion_depth` (default 1000):

```sql
-- Increase limit if needed
SET SESSION cte_max_recursion_depth = 5000;
```

Always include a `WHERE` condition in the recursive member to terminate:

```sql
-- Include a depth limit as a safety guard
WHERE depth < 50
```

## Summary

Recursive CTEs in MySQL use `WITH RECURSIVE` to process hierarchical and iterative data by repeatedly joining a query back to itself. They enable tree traversal, sequence generation, and graph exploration directly in SQL. The key structure is an anchor member for the base case and a recursive member that builds on the previous result, terminated by a stopping condition. MySQL 8.0 introduced this feature and limits recursion depth by default to 1000 iterations.
