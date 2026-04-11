# How to Use Row Subqueries in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Subquery, Database, Query

Description: Learn how row subqueries work in MySQL, how to compare multiple columns at once using row constructors, and practical use cases for multi-column equality checks.

---

A row subquery returns exactly one row but can return multiple columns. MySQL compares the entire row at once using a row constructor: `(col1, col2) = (subquery)`. This is useful when you need to match on a composite key or multiple values simultaneously.

## Syntax

```sql
(expr1, expr2, ...) = (SELECT col1, col2, ... FROM ... WHERE ...)
```

The number of expressions in the row constructor must match the number of columns returned by the subquery. The subquery must return at most one row, otherwise MySQL raises an error.

## Basic example: find rows matching the latest record

```sql
CREATE TABLE sensor_readings (
    sensor_id  INT,
    recorded_at DATETIME,
    value       DECIMAL(8,2)
);

INSERT INTO sensor_readings VALUES
(1, '2026-03-30 10:00:00', 23.5),
(1, '2026-03-31 10:00:00', 24.1),
(2, '2026-03-30 09:00:00', 18.9),
(2, '2026-03-31 09:00:00', 19.3);

-- Find the reading matching sensor 1's most recent timestamp
-- Row subquery: returns one row with (sensor_id, max recorded_at)
SELECT *
FROM sensor_readings sr
WHERE (sr.sensor_id, sr.recorded_at) = (
    SELECT sensor_id, MAX(recorded_at)
    FROM sensor_readings
    WHERE sensor_id = 1
);
```

This matches only the row where both `sensor_id = 1` AND `recorded_at` equals the maximum.

## Matching a composite key

Row subqueries are natural for composite primary keys:

```sql
CREATE TABLE order_items (
    order_id   INT,
    product_id INT,
    quantity   INT,
    price      DECIMAL(10,2),
    PRIMARY KEY (order_id, product_id)
);

-- Find the item matching a specific composite key
SELECT *
FROM order_items
WHERE (order_id, product_id) = (SELECT 1001, 42);
```

Although this example is trivial (you could use `WHERE order_id = 1001 AND product_id = 42`), the pattern is powerful when the values come from a subquery.

## Row subquery with ORDER BY and LIMIT

```sql
CREATE TABLE employees (
    employee_id   INT PRIMARY KEY,
    department_id INT,
    hire_date     DATE,
    salary        DECIMAL(10,2)
);

-- Find employees who were hired on the same date and have the same salary
-- as the most recently hired employee in department 10
SELECT *
FROM employees e
WHERE (e.hire_date, e.salary) = (
    SELECT hire_date, salary
    FROM employees
    WHERE department_id = 10
    ORDER BY hire_date DESC
    LIMIT 1
);
```

## Comparison operators with row constructors

Row constructors support `=`, `<>`, `<`, `<=`, `>`, `>=`, and `IN`:

```sql
-- Not equal
SELECT * FROM order_items
WHERE (order_id, product_id) <> (SELECT 1001, 42);

-- Less than (lexicographic comparison)
SELECT * FROM order_items
WHERE (order_id, product_id) < (SELECT 2000, 0);
```

Lexicographic comparison: MySQL compares the first column first, then the second only if the first columns are equal.

## Row constructor with IN

`IN` accepts a list of row constructors:

```sql
-- Find specific (order_id, product_id) pairs
SELECT *
FROM order_items
WHERE (order_id, product_id) IN ((1001, 42), (1002, 55), (1003, 10));
```

This is equivalent to multiple `OR` conditions but more compact.

## Row subquery vs AND conditions

These two queries are equivalent:

```sql
-- Row subquery form
SELECT * FROM order_items
WHERE (order_id, product_id) = (SELECT MAX(order_id), 42 FROM order_items);

-- AND form
SELECT * FROM order_items
WHERE order_id = (SELECT MAX(order_id) FROM order_items)
  AND product_id = 42;
```

Use the row form when the values come from a single subquery that naturally returns multiple columns together.

## Error: subquery returns more than one row

If the subquery can return multiple rows, MySQL raises an error:

```sql
-- Error: subquery returns two rows (one per sensor_id)
SELECT *
FROM sensor_readings sr
WHERE (sr.sensor_id, sr.recorded_at) = (
    SELECT sensor_id, MAX(recorded_at)
    FROM sensor_readings
    GROUP BY sensor_id
);
```

Guard against this by ensuring the subquery always returns exactly one row, or use `IN` with a row constructor instead of `=`.

## Summary

Row subqueries return one row with multiple columns and allow you to compare multiple values simultaneously using a row constructor. They are useful for composite key lookups and multi-column equality checks where all values come from a single subquery. If the subquery might return more than one row, use `IN` with row constructors instead of `=`.
