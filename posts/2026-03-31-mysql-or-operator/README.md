# How to Use the OR Operator in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, OR Operator, WHERE Clause

Description: Learn how to use the MySQL OR operator to match rows meeting any of multiple conditions, and how OR interacts with AND, IN, and index usage.

---

The `OR` operator in MySQL returns TRUE when at least one of the combined conditions is TRUE. It broadens the filter set rather than narrowing it, and is commonly used to match rows belonging to multiple categories or status values.

## Basic OR Usage

```sql
-- Find employees in either Engineering or Marketing
SELECT employee_id, name, department
FROM employees
WHERE department = 'Engineering'
   OR department = 'Marketing';
```

## OR with Different Columns

```sql
-- Find orders that are either high-value or flagged for review
SELECT order_id, total, flagged
FROM orders
WHERE total > 10000
   OR flagged = 1;
```

Both conditions apply to the same table, and a row is returned if either is true (or both).

## OR vs IN

When testing the same column against multiple values, `IN` is cleaner and often faster:

```sql
-- Using OR
SELECT * FROM products
WHERE category = 'Laptops'
   OR category = 'Tablets'
   OR category = 'Phones';

-- Equivalent and cleaner with IN
SELECT * FROM products
WHERE category IN ('Laptops', 'Tablets', 'Phones');
```

Both produce the same results. MySQL often optimizes them identically, but `IN` is easier to read and maintain.

## OR Precedence vs AND

`AND` has higher precedence than `OR`. Without parentheses, `AND` conditions are grouped first:

```sql
-- Interpreted as: (status = 'shipped' AND total > 100) OR (status = 'pending')
SELECT * FROM orders
WHERE status = 'shipped' AND total > 100
   OR status = 'pending';

-- Explicit grouping for clarity
SELECT * FROM orders
WHERE (status = 'shipped' AND total > 100)
   OR status = 'pending';

-- Different intent: both statuses must have total > 100
SELECT * FROM orders
WHERE (status = 'shipped' OR status = 'pending')
  AND total > 100;
```

## OR with NULL

Similar to `AND`, `OR` follows three-valued logic with NULL:

```sql
SELECT TRUE OR NULL;   -- Returns 1 (TRUE)
SELECT FALSE OR NULL;  -- Returns NULL
SELECT NULL OR NULL;   -- Returns NULL
```

`TRUE OR NULL` is TRUE because the result is true regardless of the unknown value.

## OR in HAVING

```sql
-- Departments with fewer than 3 employees OR average salary below 40000
SELECT department, COUNT(*) AS headcount, AVG(salary) AS avg_salary
FROM employees
GROUP BY department
HAVING headcount < 3
    OR avg_salary < 40000;
```

## Index Usage with OR

OR conditions on the same indexed column can use an index merge:

```sql
-- MySQL may use index merge for this
SELECT * FROM orders
WHERE customer_id = 42 OR customer_id = 99;

-- Better: use IN which is more index-friendly
SELECT * FROM orders WHERE customer_id IN (42, 99);

-- OR across different columns: often causes full scan
SELECT * FROM orders WHERE customer_id = 42 OR status = 'pending';
```

For OR across different columns, consider adding separate indexes on each column (to enable index merge) or rewriting as a `UNION`:

```sql
SELECT * FROM orders WHERE customer_id = 42
UNION
SELECT * FROM orders WHERE status = 'pending';
```

## Summary

The `OR` operator returns rows where at least one condition is TRUE. When testing the same column against multiple values, prefer `IN` over multiple `OR` conditions for readability and index efficiency. Remember that `AND` has higher precedence than `OR` - always use parentheses when mixing them. OR across different columns can prevent index use; in those cases, consider rewriting as a `UNION` to allow each branch to use its own index.
