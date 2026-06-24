# How to Fix ERROR 1136 Column Count Doesn't Match Value Count in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Error Handling, Troubleshooting, INSERT Errors

Description: Learn how to diagnose and fix MySQL ERROR 1136 'Column count doesn't match value count' in INSERT and SELECT INTO statements.

---

## What is ERROR 1136

MySQL ERROR 1136 appears as:

```text
ERROR 1136 (21S01): Column count doesn't match value count at row 1
```

This error occurs in `INSERT` statements when the number of columns specified does not match the number of values provided. It can also appear in `INSERT ... SELECT` statements when the SELECT returns a different number of columns than the target table expects.

## Cause 1 - Mismatched Column and Value Lists

```sql
-- Wrong: 3 columns but 2 values
INSERT INTO employees (name, department, salary)
VALUES ('Alice', 'Engineering');
-- ERROR 1136

-- Correct: equal columns and values
INSERT INTO employees (name, department, salary)
VALUES ('Alice', 'Engineering', 95000.00);
```

## Cause 2 - No Column List - Table Has More Columns

When you omit the column list, MySQL expects a value for every column in the table:

```sql
-- employees table has: id, name, department, salary, created_at
INSERT INTO employees VALUES ('Alice', 'Engineering', 95000.00);
-- ERROR 1136: only 3 values, but table has 5 columns

-- Correct: provide all values (even NULL or DEFAULT)
INSERT INTO employees VALUES (NULL, 'Alice', 'Engineering', 95000.00, NOW());

-- Better: always specify column names
INSERT INTO employees (name, department, salary)
VALUES ('Alice', 'Engineering', 95000.00);
```

## Cause 3 - Multi-row INSERT Inconsistency

```sql
-- Wrong: row 2 has only 2 values
INSERT INTO employees (name, department, salary) VALUES
  ('Alice', 'Engineering', 95000.00),
  ('Bob', 'Marketing');  -- missing salary
-- ERROR 1136 at row 2

-- Correct: all rows have equal values
INSERT INTO employees (name, department, salary) VALUES
  ('Alice', 'Engineering', 95000.00),
  ('Bob', 'Marketing', 72000.00);
```

## Cause 4 - INSERT ... SELECT Column Mismatch

```sql
-- employees_backup has fewer columns than employees
INSERT INTO employees
SELECT * FROM employees_backup;
-- ERROR 1136 if column counts differ

-- Correct: explicitly specify columns
INSERT INTO employees (name, department)
SELECT name, department FROM employees_backup;
```

## Cause 5 - CREATE TABLE ... SELECT Pitfall

In MySQL, `CREATE TABLE ... SELECT` merges defined columns with columns from the SELECT by name. Extra SELECT columns are appended to the table definition, so a column count mismatch does **not** produce ERROR 1136:

```sql
-- This does NOT produce ERROR 1136
-- MySQL adds the unmatched 'salary' column to the table automatically
CREATE TABLE archive (id INT, name VARCHAR(100))
SELECT id, name, salary FROM employees;
-- Result: table with 3 columns (id, name, salary)

-- To control all column types explicitly, define them all:
CREATE TABLE archive (id INT, name VARCHAR(100), salary DECIMAL(10,2))
SELECT id, name, salary FROM employees;
```

However, using `INSERT INTO ... SELECT` with a column mismatch **will** produce ERROR 1136 (see Cause 4).

## Checking Table Structure

Always verify the actual column count before writing INSERT statements:

```sql
DESCRIBE employees;

-- Or count columns
SELECT COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'employees';
```

## Best Practices to Avoid ERROR 1136

Always name columns in INSERT statements:

```sql
-- Good practice: always list columns
INSERT INTO orders (user_id, product_id, quantity, total_price)
VALUES (10, 42, 3, 149.97);
```

This way, adding or reordering columns in the table will not break existing INSERT statements.

## Fixing in Application Code

```python
# Wrong - fragile if table changes
cursor.execute("INSERT INTO employees VALUES (%s, %s, %s)", (name, dept, salary))

# Correct - explicit column names
cursor.execute(
    "INSERT INTO employees (name, department, salary) VALUES (%s, %s, %s)",
    (name, dept, salary)
)
```

## Summary

ERROR 1136 in MySQL always means the number of values in an INSERT does not match the number of columns expected. Fix it by ensuring the column list and value list are the same length, always specifying column names in INSERT statements, and verifying table structure with `DESCRIBE` before writing queries.
