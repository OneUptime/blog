# How to Delete Rows with DELETE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Delete, DML, WHERE, Safety

Description: Learn the MySQL DELETE statement syntax, how to safely target specific rows with WHERE, and best practices to avoid accidental full-table deletions.

---

## The DELETE Statement

`DELETE` removes rows from a table permanently. The basic syntax is:

```sql
DELETE FROM table_name
WHERE condition;
```

Without a `WHERE` clause, every row in the table is deleted - the table structure remains, but all data is gone. Always include a `WHERE` clause unless a full-table wipe is intentional.

## Deleting a Single Row by Primary Key

The safest pattern targets one row by its primary key:

```sql
DELETE FROM users
WHERE id = 42;
```

Because `id` is unique, at most one row is removed. Confirm with:

```sql
SELECT ROW_COUNT();
```

## Deleting Multiple Rows with a Condition

Delete all rows matching a condition by broadening the `WHERE` clause:

```sql
DELETE FROM sessions
WHERE expires_at < NOW();
```

This removes all expired sessions in a single statement.

## Previewing Before Deleting

Before running a `DELETE`, use a matching `SELECT` to verify which rows will be removed:

```sql
SELECT id, email, created_at
FROM users
WHERE created_at < '2020-01-01' AND last_login IS NULL;
```

Once satisfied, replace `SELECT id, email, created_at` with `DELETE`:

```sql
DELETE FROM users
WHERE created_at < '2020-01-01' AND last_login IS NULL;
```

## Safe Update Mode

If `sql_safe_updates` is enabled (common in MySQL Workbench), a `DELETE` without a key condition in the `WHERE` clause or a `LIMIT` clause raises an error:

```sql
-- Will fail with safe updates enabled:
DELETE FROM logs WHERE level = 'debug';

-- Workaround (disable temporarily):
SET sql_safe_updates = 0;
DELETE FROM logs WHERE level = 'debug';
SET sql_safe_updates = 1;
```

## Deleting with a Subquery

Use a subquery to delete rows based on a condition from another table:

```sql
DELETE FROM orders
WHERE customer_id IN (
  SELECT id FROM customers WHERE status = 'banned'
);
```

Note: MySQL does not allow you to reference the same table in a subquery that you are deleting from. Use a derived table to work around this:

```sql
DELETE FROM orders
WHERE id IN (
  SELECT id FROM (
    SELECT id FROM orders WHERE total < 1.00
  ) AS sub
);
```

## Returning Affected Row Count in Application Code

In Python using `mysql-connector-python`:

```python
import mysql.connector

conn = mysql.connector.connect(host='localhost', user='root', database='shop')
cursor = conn.cursor()

cursor.execute(
    'DELETE FROM cart_items WHERE session_id = %s AND added_at < %s',
    ('sess_abc123', '2026-01-01')
)
conn.commit()
print(f'Deleted {cursor.rowcount} rows')

cursor.close()
conn.close()
```

## Summary

The MySQL `DELETE` statement is powerful but irreversible. Always use a `WHERE` clause, preview changes with a matching `SELECT` first, use primary key conditions when deleting a specific row, and confirm the number of deleted rows with `ROW_COUNT()` or the driver's `rowcount` property.
