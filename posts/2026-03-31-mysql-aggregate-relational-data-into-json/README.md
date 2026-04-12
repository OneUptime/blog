# How to Aggregate Relational Data into JSON in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, JSON, Aggregate Function

Description: Learn how to use JSON_ARRAYAGG() and JSON_OBJECTAGG() to fold relational rows into JSON documents, simplifying API responses and reducing round trips.

---

## Why Aggregate to JSON?

Relational databases store data across normalized tables, but APIs and frontends often need hierarchical JSON. Fetching related data as separate queries and merging in application code adds round trips and complexity. MySQL's JSON aggregate functions let you build hierarchical documents entirely in SQL.

## Sample Schema

```sql
CREATE TABLE departments (id INT PRIMARY KEY, name VARCHAR(50));
CREATE TABLE employees (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  salary DECIMAL(10,2),
  dept_id INT,
  FOREIGN KEY (dept_id) REFERENCES departments(id)
);

INSERT INTO departments VALUES (1, 'Engineering'), (2, 'Marketing');
INSERT INTO employees VALUES
  (1, 'Alice', 95000, 1),
  (2, 'Bob', 87000, 1),
  (3, 'Carol', 72000, 2),
  (4, 'Dave', 68000, 2);
```

## JSON_ARRAYAGG() - Rows to Array

Collect all employees per department into a JSON array:

```sql
SELECT
  d.name AS department,
  JSON_ARRAYAGG(e.name) AS employee_names
FROM departments d
JOIN employees e ON d.id = e.dept_id
GROUP BY d.id, d.name;
```

Note: unlike `GROUP_CONCAT()`, `JSON_ARRAYAGG()` does not support an `ORDER BY` clause inside the function call. The order of elements in the resulting array is undefined. To get a deterministic order, sort the rows in a subquery before aggregation.

Result (element order may vary):

```text
+-------------+-----------------------+
| department  | employee_names        |
+-------------+-----------------------+
| Engineering | ["Alice", "Bob"]      |
| Marketing   | ["Carol", "Dave"]     |
+-------------+-----------------------+
```

## Building Arrays of Objects

Use `JSON_OBJECT()` inside `JSON_ARRAYAGG()` to produce arrays of structured objects:

```sql
SELECT
  d.name AS department,
  JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', e.id,
      'name', e.name,
      'salary', e.salary
    )
  ) AS employees
FROM departments d
JOIN employees e ON d.id = e.dept_id
GROUP BY d.id, d.name;
```

## JSON_OBJECTAGG() - Rows to Key-Value Map

Build an object mapping employee name to salary:

```sql
SELECT
  d.name AS department,
  JSON_OBJECTAGG(e.name, e.salary) AS salary_map
FROM departments d
JOIN employees e ON d.id = e.dept_id
GROUP BY d.id, d.name;
```

Result:

```json
{"Alice": 95000.00, "Bob": 87000.00}
```

## Full Nested Document

Combine aggregation at multiple levels using a subquery:

```sql
SELECT JSON_OBJECTAGG(
  dept_name,
  dept_employees
) AS org_chart
FROM (
  SELECT
    d.name AS dept_name,
    JSON_ARRAYAGG(
      JSON_OBJECT('id', e.id, 'name', e.name, 'salary', e.salary)
    ) AS dept_employees
  FROM departments d
  JOIN employees e ON d.id = e.dept_id
  GROUP BY d.id, d.name
) sub;
```

Result:

```json
{
  "Engineering": [{"id": 1, "name": "Alice", "salary": 95000.00}, {"id": 2, "name": "Bob", "salary": 87000.00}],
  "Marketing": [{"id": 3, "name": "Carol", "salary": 72000.00}, {"id": 4, "name": "Dave", "salary": 68000.00}]
}
```

## Handling One-to-Many with GROUP BY

When a parent row has zero children, use a `LEFT JOIN` to preserve parent rows:

```sql
SELECT
  d.name AS department,
  IF(
    COUNT(e.id) = 0,
    JSON_ARRAY(),
    JSON_ARRAYAGG(e.name)
  ) AS employees
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id
GROUP BY d.id, d.name;
```

Without this check, departments with no employees return `[null]` (an array containing a JSON null element) rather than an empty array. This happens because the `LEFT JOIN` still produces a row with NULL column values, and `JSON_ARRAYAGG` aggregates that NULL into the array. Since `[null]` is a valid JSON value and not SQL `NULL`, `COALESCE` would not catch it — using `IF` with `COUNT` is the correct approach.

## Performance Considerations

- `JSON_ARRAYAGG()` does not guarantee element order. If deterministic ordering is required, sort rows in a subquery or CTE before aggregation.
- For very large groups, consider limiting aggregation scope with `LIMIT` in subqueries.
- Avoid aggregating millions of rows into a single JSON document - result size can exceed `max_allowed_packet`.

## Summary

`JSON_ARRAYAGG()` and `JSON_OBJECTAGG()` fold multiple rows into compact JSON structures in a single query pass. Combining them with `JSON_OBJECT()` and subqueries allows constructing fully nested API-ready documents from normalized relational data.
