# How to Find the Nth Highest Value in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Query, Window Function, Subquery

Description: Learn multiple ways to find the Nth highest value in a MySQL column using subqueries, LIMIT/OFFSET, DENSE_RANK, and window functions.

---

## What Is the Nth Highest Value Problem

Finding the Nth highest value is a classic SQL interview question and a practical reporting need. For example, you may need the second highest salary, the third most expensive order, or the fifth largest account balance. MySQL provides several approaches depending on the MySQL version and query complexity.

## Using LIMIT and OFFSET (Simple Approach)

The simplest method uses `ORDER BY` with `LIMIT` and `OFFSET` to skip the top N-1 rows:

```sql
SELECT salary
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;
```

`OFFSET 1` skips the highest value and returns the second highest. For the Nth highest, use `OFFSET N-1`:

```sql
-- 3rd highest salary
SELECT salary
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 2;
```

Limitation: this approach does not handle ties correctly. If two employees share the highest salary, `OFFSET 1` still skips only one row.

## Using a Subquery

The traditional approach uses a correlated or nested subquery to count distinct values above the target:

```sql
SELECT MAX(salary) AS third_highest
FROM employees
WHERE salary < (
  SELECT MAX(salary)
  FROM employees
  WHERE salary < (
    SELECT MAX(salary)
    FROM employees
  )
);
```

This works for any N but becomes unwieldy. A cleaner subquery version for arbitrary N:

```sql
SELECT MAX(salary) AS nth_highest
FROM employees
WHERE salary NOT IN (
  SELECT DISTINCT salary
  FROM employees
  ORDER BY salary DESC
  LIMIT 2  -- replace with N-1
);
```

Note: MySQL versions before 8.0.19 do not allow `LIMIT` in subqueries used with `IN`. Use a derived table instead for broad compatibility:

```sql
SELECT MAX(salary) AS third_highest
FROM employees
WHERE salary NOT IN (
  SELECT salary FROM (
    SELECT DISTINCT salary
    FROM employees
    ORDER BY salary DESC
    LIMIT 2
  ) top_values
);
```

## Using DENSE_RANK (Recommended for MySQL 8.0+)

The cleanest and most readable solution uses the `DENSE_RANK()` window function, which handles ties correctly:

```sql
SELECT salary
FROM (
  SELECT
    salary,
    DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) ranked
WHERE rnk = 3;
```

`DENSE_RANK()` assigns the same rank to ties and does not skip ranks. For example, if two employees share the highest salary, both get rank 1, and the next distinct salary gets rank 2.

Use `RANK()` if you want to skip ranks for ties (so if two people share rank 1, the next rank is 3):

```sql
SELECT salary
FROM (
  SELECT
    salary,
    RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) ranked
WHERE rnk = 2;
```

## Find Nth Highest Per Group

To find the Nth highest value within each department:

```sql
SELECT department, salary, rnk
FROM (
  SELECT
    department,
    salary,
    DENSE_RANK() OVER (
      PARTITION BY department
      ORDER BY salary DESC
    ) AS rnk
  FROM employees
) ranked
WHERE rnk = 2;
```

This returns the second highest salary in each department.

## Create a Reusable Stored Function

Encapsulate the logic in a stored function for reuse:

```sql
DELIMITER $$
CREATE FUNCTION nth_highest_salary(n INT)
RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
  DECLARE result DECIMAL(10,2);
  SELECT salary INTO result
  FROM (
    SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM employees
  ) ranked
  WHERE rnk = n
  LIMIT 1;
  RETURN result;
END$$
DELIMITER ;
```

Call it as:

```sql
SELECT nth_highest_salary(3);
```

## Performance Considerations

For large tables, ensure the column being ranked has an index:

```sql
CREATE INDEX idx_employees_salary ON employees(salary);
```

Check the query plan to confirm the index is used:

```sql
EXPLAIN SELECT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) ranked WHERE rnk = 3;
```

## Summary

The best way to find the Nth highest value in MySQL 8.0+ is with `DENSE_RANK()` window functions, which correctly handles tied values and is easy to read. For older MySQL versions, use a derived table with `LIMIT N-1` in a `NOT IN` subquery. For per-group analysis, add `PARTITION BY` to the window function.
