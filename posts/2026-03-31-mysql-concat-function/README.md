# How to Use CONCAT() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn how to use MySQL's CONCAT() function to join two or more strings together, handle NULL values, and build dynamic output in queries.

---

## What is CONCAT()?

The `CONCAT()` function in MySQL concatenates two or more string arguments into a single string. It is one of the most commonly used string functions when building formatted output, combining name fields, constructing dynamic messages, or assembling URL paths from stored columns.

The basic syntax is:

```sql
CONCAT(str1, str2, ..., strN)
```

If any argument is `NULL`, the entire result is `NULL`. This is a key behavior to understand before using `CONCAT()` in production queries.

## Basic Usage

```sql
SELECT CONCAT('Hello', ', ', 'World') AS greeting;
-- Result: Hello, World

SELECT CONCAT('MySQL', ' ', '8.0') AS version_string;
-- Result: MySQL 8.0
```

## Combining Table Columns

A very common use case is combining first and last name columns:

```sql
SELECT CONCAT(first_name, ' ', last_name) AS full_name
FROM employees;
```

You can also build formatted identifiers:

```sql
SELECT CONCAT('EMP-', employee_id) AS emp_code
FROM employees;
```

## Handling NULL Values

If any argument passed to `CONCAT()` is `NULL`, the function returns `NULL`:

```sql
SELECT CONCAT('Hello', NULL, 'World');
-- Result: NULL
```

To avoid this, use `COALESCE()` or `IFNULL()` to substitute a default:

```sql
SELECT CONCAT(first_name, ' ', COALESCE(middle_name, ''), ' ', last_name) AS full_name
FROM employees;
```

Alternatively, use `CONCAT_WS()` which skips NULL arguments automatically.

## Using CONCAT() in WHERE Clause

You can use `CONCAT()` in `WHERE` clauses or as part of conditions:

```sql
SELECT *
FROM users
WHERE CONCAT(first_name, ' ', last_name) = 'Jane Doe';
```

Note: using a function on a column in `WHERE` prevents index usage on that column. Consider using a generated (stored) column with a regular index, or restructuring the query to filter on individual columns, for better performance on large tables.

## Using CONCAT() with UPDATE

`CONCAT()` is useful for appending content to existing column values:

```sql
UPDATE products
SET description = CONCAT(description, ' - Now on sale!')
WHERE category = 'Electronics';
```

## Combining Numbers and Strings

MySQL automatically converts numbers to strings in `CONCAT()`:

```sql
SELECT CONCAT('Order #', order_id, ' placed on ', order_date) AS order_summary
FROM orders
LIMIT 5;
```

## Practical Example - Building a Full Address

```sql
SELECT
  customer_name,
  CONCAT(street, ', ', city, ', ', state, ' ', zip_code) AS full_address
FROM customers
WHERE country = 'US';
```

## CONCAT() vs CONCAT_WS()

Use `CONCAT_WS()` when you have a consistent separator and want NULL values silently skipped. Use `CONCAT()` when you need precise control over exactly what is appended at each position.

```sql
-- CONCAT_WS skips NULL arguments
SELECT CONCAT_WS(', ', 'Alice', NULL, 'Bob');
-- Result: Alice, Bob

-- CONCAT returns NULL if any arg is NULL
SELECT CONCAT('Alice', NULL, 'Bob');
-- Result: NULL
```

## Summary

`CONCAT()` is a foundational MySQL string function that joins multiple string values into one. Key points: any NULL argument returns NULL for the entire expression, numbers are auto-converted to strings, and it works in SELECT, WHERE, and UPDATE contexts. For separator-based concatenation with NULL tolerance, prefer `CONCAT_WS()`. Always wrap nullable columns with `COALESCE()` or `IFNULL()` when using `CONCAT()` to avoid unexpected NULL results.
