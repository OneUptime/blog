# How to Write Recursive CTEs in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CTE, SQL, Hierarchical Data

Description: Learn how to write recursive CTEs in MySQL to traverse hierarchical data, generate number sequences, and process tree structures with WITH RECURSIVE.

---

## What Is a Recursive CTE?

A Common Table Expression (CTE) is a named subquery defined with `WITH`. A recursive CTE references itself, allowing it to iterate until a termination condition is met. MySQL 8.0+ supports recursive CTEs using `WITH RECURSIVE`.

## Basic Syntax

```sql
WITH RECURSIVE cte_name AS (
    -- Anchor member (non-recursive base case)
    SELECT ...

    UNION ALL

    -- Recursive member (references cte_name)
    SELECT ...
    FROM cte_name
    WHERE <termination_condition>
)
SELECT * FROM cte_name;
```

MySQL evaluates the anchor first, then repeatedly evaluates the recursive member using the previous iteration's results until the recursive member returns no rows.

## Generating a Number Sequence

```sql
WITH RECURSIVE numbers AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM numbers WHERE n < 10
)
SELECT n FROM numbers;
```

Output:

```text
n
--
 1
 2
 3
 ...
10
```

## Generating a Date Series

```sql
WITH RECURSIVE date_series AS (
    SELECT DATE('2024-01-01') AS dt
    UNION ALL
    SELECT DATE_ADD(dt, INTERVAL 1 DAY)
    FROM date_series
    WHERE dt < '2024-01-07'
)
SELECT dt FROM date_series;
```

This is useful for generating a complete date range to fill gaps in time-series data.

## Traversing a Hierarchical Table (Employee Org Chart)

```sql
CREATE TABLE employees (
    id         INT PRIMARY KEY,
    name       VARCHAR(50),
    manager_id INT
);

INSERT INTO employees VALUES
  (1, 'CEO',     NULL),
  (2, 'CTO',     1),
  (3, 'CFO',     1),
  (4, 'Eng Lead',2),
  (5, 'Engineer',4),
  (6, 'Engineer',4),
  (7, 'Analyst', 3);
```

Traverse the hierarchy from the root:

```sql
WITH RECURSIVE org_chart AS (
    -- Anchor: start from the root (no manager)
    SELECT id, name, manager_id, 0 AS depth, CAST(name AS CHAR(1000)) AS path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive: join children to the current level
    SELECT e.id, e.name, e.manager_id, oc.depth + 1,
           CONCAT(oc.path, ' > ', e.name)
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT id, name, depth, path
FROM org_chart
ORDER BY path;
```

Output:

```text
id | name      | depth | path
---+-----------+-------+-----------------------------------
 1 | CEO       |     0 | CEO
 3 | CFO       |     1 | CEO > CFO
 7 | Analyst   |     2 | CEO > CFO > Analyst
 2 | CTO       |     1 | CEO > CTO
 4 | Eng Lead  |     2 | CEO > CTO > Eng Lead
 5 | Engineer  |     3 | CEO > CTO > Eng Lead > Engineer
 6 | Engineer  |     3 | CEO > CTO > Eng Lead > Engineer
```

## Finding All Subordinates of a Specific Manager

```sql
WITH RECURSIVE subordinates AS (
    SELECT id, name, manager_id
    FROM employees
    WHERE id = 2  -- start from CTO

    UNION ALL

    SELECT e.id, e.name, e.manager_id
    FROM employees e
    JOIN subordinates s ON e.manager_id = s.id
)
SELECT * FROM subordinates;
```

## Avoiding Infinite Loops

Always include a termination condition in the recursive member's `WHERE` clause. You can also set:

```sql
SET SESSION cte_max_recursion_depth = 100;
```

The default `cte_max_recursion_depth` is 1000. If recursion exceeds this, MySQL throws an error.

## Summary

Recursive CTEs in MySQL 8.0+ use `WITH RECURSIVE` to define iterative queries with an anchor member and a recursive member connected by `UNION ALL`. They are ideal for traversing hierarchical data like org charts, category trees, and bill of materials, as well as generating sequences and date ranges. Always include a termination condition in the recursive member to prevent infinite loops, and configure `cte_max_recursion_depth` for deep hierarchies.
