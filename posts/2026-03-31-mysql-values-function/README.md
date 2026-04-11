# How to Use VALUES Statement in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Statement, Query

Description: Learn how to use the VALUES statement in MySQL 8 as a standalone table value constructor for testing, unions, and data generation.

---

## What Is the VALUES Statement in MySQL 8

MySQL 8.0.19 introduced the `VALUES` statement as a standalone SQL construct that acts as a table value constructor. Unlike the `VALUES` clause inside `INSERT`, the standalone `VALUES` statement returns a result set you can query, join, or combine with other statements. It is useful for generating inline test data, performing unions, and building lookup tables without needing a real table.

The syntax is straightforward:

```sql
VALUES ROW(val1, val2, ...), ROW(val1, val2, ...);
```

Each `ROW(...)` defines one row of the result. Column names are automatically assigned as `column_0`, `column_1`, and so on.

## Basic Usage

You can run a `VALUES` statement on its own to produce a result set:

```sql
VALUES ROW(1, 'Alice', 'admin'),
       ROW(2, 'Bob', 'editor'),
       ROW(3, 'Carol', 'viewer');
```

This returns a three-row result with columns named `column_0`, `column_1`, and `column_2`. You can use `ORDER BY` and `LIMIT` with the result. Note that `LIMIT` was silently ignored in MySQL 8.0.19 and 8.0.20 due to a bug and works correctly from 8.0.21 onward:

```sql
VALUES ROW(3, 'Carol'),
       ROW(1, 'Alice'),
       ROW(2, 'Bob')
ORDER BY column_0
LIMIT 2;
```

## Using VALUES in a UNION

The `VALUES` statement can be combined with `SELECT` using `UNION` or `UNION ALL`. This is helpful when you want to append static rows to a query result:

```sql
SELECT id, name FROM users
UNION ALL
VALUES ROW(999, 'Test User'),
       ROW(1000, 'Another User');
```

The column count and types must be compatible between the `SELECT` and the `VALUES` clause.

## Using VALUES as a Derived Table

You can use `VALUES` as a derived table (subquery in the `FROM` clause), giving you the ability to alias columns:

```sql
SELECT v.user_id, v.username, v.role
FROM (
  VALUES ROW(1, 'Alice', 'admin'),
         ROW(2, 'Bob', 'editor')
) AS v(user_id, username, role);
```

This technique lets you name columns explicitly, making the result easier to work with in outer queries.

## Joining VALUES with Existing Tables

A powerful use case is joining inline data from a `VALUES` statement with a real table:

```sql
SELECT u.id, u.email, v.discount_pct
FROM users u
JOIN (
  VALUES ROW(1, 10),
         ROW(2, 20),
         ROW(3, 5)
) AS v(user_id, discount_pct)
ON u.id = v.user_id;
```

This avoids creating a temporary table just for a quick lookup or transformation.

## Inserting with VALUES Constructor

The `VALUES` statement can also be used inside `INSERT ... TABLE` and `INSERT ... SELECT`:

```sql
INSERT INTO staging_users (id, name, role)
SELECT column_0, column_1, column_2
FROM (
  VALUES ROW(10, 'Dave', 'analyst'),
         ROW(11, 'Eve', 'engineer')
) AS v(column_0, column_1, column_2);
```

## Practical Example - Seeding Test Data

When writing integration tests or populating a staging environment, `VALUES` lets you avoid scripting complex inserts:

```sql
INSERT INTO permissions (user_id, action)
SELECT v.uid, v.action
FROM (
  VALUES ROW(1, 'read'),
         ROW(1, 'write'),
         ROW(2, 'read')
) AS v(uid, action)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p
  WHERE p.user_id = v.uid AND p.action = v.action
);
```

## Summary

The `VALUES` statement in MySQL 8 is a versatile tool for generating inline result sets without temporary tables. It supports `ORDER BY`, `LIMIT`, `UNION`, derived table aliasing, and joins with real tables. Use it to simplify test data generation, seed scripts, and quick in-query lookups.
