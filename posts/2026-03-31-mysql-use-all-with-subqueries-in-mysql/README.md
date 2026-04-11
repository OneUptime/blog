# How to Use ALL with Subqueries in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, All Operator, Subquery, SQL, Database

Description: Learn how to use the ALL operator with subqueries in MySQL to compare a value against every row returned by a subquery, with practical examples.

---

## Introduction

The `ALL` operator in MySQL compares a value to every value returned by a subquery. The outer condition is true only if the comparison is true for ALL values in the subquery result set. It works with any comparison operator: `>`, `<`, `>=`, `<=`, `=`, `!=`.

## Basic Syntax

```sql
value comparison_operator ALL (subquery)
```

Returns TRUE only if the comparison holds for every single value in the subquery's result.

## ALL with > (Greater Than All)

Find employees who earn more than every employee in the "Junior" grade:

```sql
SELECT name, salary
FROM employees
WHERE salary > ALL (
  SELECT salary FROM employees WHERE grade = 'Junior'
);
```

This is equivalent to finding employees whose salary exceeds the maximum Junior salary:

```sql
-- Equivalent using MAX
SELECT name, salary FROM employees
WHERE salary > (SELECT MAX(salary) FROM employees WHERE grade = 'Junior');
```

## ALL with < (Less Than All)

Find products cheaper than every premium product:

```sql
SELECT product_name, price
FROM products
WHERE price < ALL (
  SELECT price FROM products WHERE tier = 'premium'
);
```

This returns products priced below the cheapest premium product.

## ALL with >= and <=

```sql
-- Find items with rating >= every competitor's rating
SELECT product_name, rating
FROM our_products
WHERE rating >= ALL (
  SELECT rating FROM competitor_products WHERE category = 'laptops'
);
```

## ALL with = (Rarely Useful)

```sql
-- True only if value equals every value in the subquery
-- This is rarely useful unless the subquery returns one value
SELECT name FROM configs
WHERE version = ALL (SELECT required_version FROM requirements);
```

## ALL with != (Not Equal to All - Equivalent to NOT IN)

```sql
-- Equivalent to NOT IN
SELECT id, name FROM employees
WHERE department != ALL (SELECT department FROM excluded_departments);

-- Equivalent to
SELECT id, name FROM employees
WHERE department NOT IN (SELECT department FROM excluded_departments);
```

Note: `!= ALL` has the same NULL trap as `NOT IN` — if the subquery contains any NULL values, no rows are returned.

## Edge Cases

### Empty Subquery

If the subquery returns no rows, `ALL` evaluates to TRUE (vacuous truth):

```sql
-- If no 'premium' products exist, this returns ALL employees
SELECT name, salary FROM employees
WHERE salary > ALL (SELECT salary FROM employees WHERE grade = 'nonexistent_grade');
-- Returns all rows because "greater than all of nothing" is vacuously true
```

### NULL in Subquery

If the subquery contains any NULL, the `ALL` comparison returns UNKNOWN for rows that would otherwise return TRUE against non-NULL values, effectively filtering them out.

```sql
-- If any salary in the subquery is NULL, this likely returns no rows
SELECT name FROM employees
WHERE salary > ALL (SELECT salary FROM bonus_recipients);
```

To handle NULLs safely:

```sql
SELECT name FROM employees
WHERE salary > ALL (
  SELECT salary FROM bonus_recipients WHERE salary IS NOT NULL
);
```

## Practical Example: Finding Maximum Performers

Find departments where every employee earns above the company average:

```sql
SELECT department
FROM employees
GROUP BY department
HAVING MIN(salary) > ALL (
  SELECT AVG(salary) FROM employees GROUP BY department
);
```

Wait - this compares MIN salary of a dept against ALL department averages. More precisely:

```sql
-- Departments where the lowest-paid employee earns above every other dept's average
SELECT department, MIN(salary) AS min_salary
FROM employees e
GROUP BY department
HAVING MIN(salary) > ALL (
  SELECT AVG(salary) FROM employees WHERE department != e.department GROUP BY department
);
```

## ALL vs ANY Summary

| Operator | Returns TRUE when |
|----------|------------------|
| `> ALL` | Greater than the maximum value |
| `< ALL` | Less than the minimum value |
| `> ANY` | Greater than the minimum value |
| `< ANY` | Less than the maximum value |
| `= ANY` | Equal to any value (like IN) |
| `!= ALL` | Not equal to any value (like NOT IN) |

## Using EXPLAIN

```sql
EXPLAIN
SELECT name, salary FROM employees
WHERE salary > ALL (SELECT salary FROM employees WHERE department = 'Sales');
```

Check if MySQL rewrites it as a MAX subquery or processes it differently.

## Summary

`ALL` requires a comparison to be true for every value in the subquery result. It is equivalent to comparing against `MAX()` for `>` and against `MIN()` for `<`. Be careful with NULL values in the subquery and empty subquery results (vacuous truth). For clarity and predictability, consider rewriting `ALL` comparisons using `MIN()` or `MAX()` aggregate functions.
