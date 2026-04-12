# How to Fix ERROR 1054 Unknown Column in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Error Handling, Troubleshooting, SQL Errors

Description: Learn how to diagnose and fix MySQL ERROR 1054 'Unknown column' caused by typos, missing aliases, scope issues, and schema mismatches.

---

## What is ERROR 1054

MySQL ERROR 1054 appears as:

```text
ERROR 1054 (42S22): Unknown column 'column_name' in 'field list'
```

This error occurs when MySQL cannot find a column referenced in your query. The message includes where the unknown column was referenced: `field list`, `where clause`, `order clause`, `on clause`, etc.

## Common Cause 1 - Typo in Column Name

The most frequent cause is a simple typo:

```sql
-- Wrong
SELECT fist_name, last_name FROM employees;
-- ERROR 1054: Unknown column 'fist_name' in 'field list'

-- Correct
SELECT first_name, last_name FROM employees;
```

Verify actual column names:

```sql
DESCRIBE employees;
SHOW COLUMNS FROM employees;
```

## Common Cause 2 - Using Alias in WHERE Clause

MySQL does not allow using a column alias in the same SELECT's `WHERE` clause:

```sql
-- Wrong
SELECT salary * 1.1 AS adjusted_salary
FROM employees
WHERE adjusted_salary > 100000;
-- ERROR 1054: Unknown column 'adjusted_salary' in 'where clause'

-- Correct: use a subquery or repeat the expression
SELECT * FROM (
    SELECT salary * 1.1 AS adjusted_salary, name
    FROM employees
) sub
WHERE adjusted_salary > 100000;

-- Or repeat the expression
SELECT salary * 1.1 AS adjusted_salary, name
FROM employees
WHERE salary * 1.1 > 100000;
```

## Common Cause 3 - Missing Table Prefix in JOIN

```sql
-- Wrong: ambiguous or missing table prefix
SELECT name, department_name
FROM employees e
JOIN departments d ON id = department_id;
-- ERROR 1054: Unknown column 'id' in 'on clause'

-- Correct: qualify with table alias
SELECT e.name, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.id;
```

## Common Cause 4 - Column Not in the Table

You may be querying a column that does not exist yet or was dropped:

```sql
SELECT email FROM users;
-- ERROR 1054: Unknown column 'email' in 'field list'
```

Check the actual table structure:

```sql
SHOW CREATE TABLE users;
```

Add the missing column if needed:

```sql
ALTER TABLE users ADD COLUMN email VARCHAR(255);
```

## Common Cause 5 - ORDER BY with Invalid Alias in UNION

In a UNION, column names are determined by the first SELECT statement. Using a column name from a later SELECT that is not in the first will fail:

```sql
-- Wrong: 'title' is only in the second SELECT
SELECT id, name FROM employees
UNION
SELECT id, title FROM contractors
ORDER BY title;
-- ERROR 1054: Unknown column 'title' in 'order clause'

-- Correct: use the column name from the first SELECT
SELECT id, name FROM employees
UNION
SELECT id, title FROM contractors
ORDER BY name;

-- Or use column position
SELECT id, name FROM employees
UNION
SELECT id, title FROM contractors
ORDER BY 2;
```

## Common Cause 6 - INSERT with Wrong Column List

```sql
-- Wrong
INSERT INTO employees (fist_name, last_name) VALUES ('Alice', 'Smith');
-- ERROR 1054: Unknown column 'fist_name' in 'field list'

-- Correct
INSERT INTO employees (first_name, last_name) VALUES ('Alice', 'Smith');
```

## Checking Schema in the Right Database

You may be connected to the wrong database:

```sql
SELECT DATABASE();
USE your_correct_database;
SHOW TABLES;
DESCRIBE employees;
```

## Debugging the Error

```sql
-- Check all columns in a table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'employees'
ORDER BY ordinal_position;
```

## Summary

ERROR 1054 in MySQL means MySQL cannot resolve a column reference in your query. The most common causes are typos, using an alias in a WHERE clause (use a subquery instead), missing table prefixes in JOINs, and querying columns that do not exist. Use `DESCRIBE table_name` or query `information_schema.columns` to verify the actual column names.
