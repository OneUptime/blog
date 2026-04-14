# How to Create a Table from a SELECT Query in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DDL, SQL, Data Migration

Description: Learn how to create a new MySQL table from a SELECT query using CREATE TABLE AS SELECT (CTAS) to copy data and structure efficiently.

---

## CREATE TABLE AS SELECT (CTAS)

MySQL lets you create a new table and populate it with data from an existing query in one statement. This is commonly called CTAS (Create Table As Select).

## Basic Syntax

```sql
CREATE TABLE new_table AS
SELECT column1, column2, ...
FROM existing_table
[WHERE condition];
```

## Simple Copy of an Entire Table

```sql
CREATE TABLE users_backup AS
SELECT * FROM users;
```

This creates `users_backup` with the same columns and data as `users`. However, it does NOT copy indexes, primary keys, foreign keys, or constraints.

## Copy with Column Selection

```sql
CREATE TABLE user_emails AS
SELECT id, username, email, created_at
FROM users;
```

## Copy with WHERE Filter

```sql
CREATE TABLE active_users AS
SELECT *
FROM users
WHERE is_active = 1;
```

## Copy with Computed Columns

```sql
CREATE TABLE order_summary AS
SELECT
    user_id,
    COUNT(*)               AS total_orders,
    SUM(total)             AS total_spent,
    AVG(total)             AS avg_order_value,
    MAX(created_at)        AS last_order_date
FROM orders
GROUP BY user_id;
```

## CREATE TABLE IF NOT EXISTS ... SELECT

```sql
CREATE TABLE IF NOT EXISTS users_backup AS
SELECT * FROM users;
```

Prevents an error if the table already exists. If the table already exists, no data is inserted - the entire statement is effectively a no-op and MySQL issues a note instead of an error.

## Copy Structure Only (No Data)

Use `WHERE 1=0` to create an empty table with the same structure:

```sql
CREATE TABLE users_empty AS
SELECT * FROM users WHERE 1 = 0;
```

This is useful for creating staging tables.

## Adding Constraints After CTAS

Since CTAS does not copy constraints, add them afterward:

```sql
CREATE TABLE users_backup AS SELECT * FROM users;

-- Add primary key after creation
ALTER TABLE users_backup
    MODIFY id INT NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (id);

-- Add index
ALTER TABLE users_backup
    ADD INDEX idx_email (email);
```

## CTAS with a JOIN

```sql
CREATE TABLE order_details_report AS
SELECT
    o.id          AS order_id,
    u.username,
    u.email,
    o.total,
    o.status,
    o.created_at
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'shipped';
```

## CTAS vs INSERT INTO ... SELECT

```text
CTAS (CREATE TABLE AS SELECT):
- Creates the table and inserts data in one step
- Does not copy constraints or indexes
- Errors if the table already exists (without IF NOT EXISTS)

INSERT INTO ... SELECT:
- Requires the target table to already exist
- Preserves the target table's constraints and indexes
- Appends data to an existing table
```

```sql
-- INSERT INTO ... SELECT (table must exist)
INSERT INTO users_backup SELECT * FROM users WHERE created_at >= '2024-01-01';
```

## Temporary Tables from SELECT

```sql
CREATE TEMPORARY TABLE temp_top_customers AS
SELECT user_id, SUM(total) AS total_spent
FROM orders
GROUP BY user_id
ORDER BY total_spent DESC
LIMIT 100;
```

Temporary tables are session-scoped and auto-dropped when the connection closes.

## Summary

`CREATE TABLE AS SELECT` in MySQL creates a new table and populates it from a query in a single step, making it ideal for backups, archiving, reporting tables, and staging. It copies column structure and data but not constraints or indexes, which must be added separately with `ALTER TABLE`. Use `WHERE 1=0` to create an empty copy of a table's structure, and `CREATE TEMPORARY TABLE AS SELECT` for session-scoped working tables.
