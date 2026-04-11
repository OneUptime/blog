# How to Show the Definition of a View in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, View, SQL, DDL, Database, Schema

Description: Learn how to retrieve and display the definition of a MySQL view using SHOW CREATE VIEW and information_schema queries.

---

## Overview

A MySQL view is a stored query that behaves like a virtual table. When you need to inspect, document, or recreate a view, you need to retrieve its definition - the underlying `SELECT` statement that was used to create it. MySQL provides several ways to do this.

## Using SHOW CREATE VIEW

The simplest approach is the `SHOW CREATE VIEW` statement:

```sql
SHOW CREATE VIEW view_name;
```

Example:

```sql
SHOW CREATE VIEW active_customers;
```

MySQL returns a result set with columns including `View`, `Create View`, `character_set_client`, and `collation_connection`. The `Create View` column contains the full `CREATE VIEW` statement, including the `ALGORITHM`, `DEFINER`, and `SQL SECURITY` clauses.

To make the output more readable in the MySQL CLI, append `\G`:

```sql
SHOW CREATE VIEW active_customers\G
```

## Using information_schema.VIEWS

For programmatic access or to query multiple views at once, use `information_schema.VIEWS`:

```sql
SELECT
    TABLE_NAME       AS view_name,
    VIEW_DEFINITION  AS definition,
    IS_UPDATABLE,
    SECURITY_TYPE,
    DEFINER
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'shop'
ORDER BY TABLE_NAME;
```

To get the definition of a specific view:

```sql
SELECT VIEW_DEFINITION
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'shop'
  AND TABLE_NAME   = 'active_customers';
```

Note that `VIEW_DEFINITION` may not include the database prefix on column references, so compare both outputs when you need the exact original statement.

## Listing All Views in a Database

```sql
SHOW FULL TABLES IN shop WHERE Table_type = 'VIEW';
```

Or using `information_schema`:

```sql
SELECT TABLE_NAME
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'shop'
ORDER BY TABLE_NAME;
```

## Exporting View Definitions with mysqldump

To back up view definitions along with other DDL:

```bash
mysqldump --no-data --routines --triggers -u root -p shop > shop_structure.sql
```

The `--no-data` flag exports structure only. Views are included in the output automatically.

To export only views (no tables, triggers, or procedures):

```bash
mysqldump --no-data --no-create-info \
  --skip-triggers --skip-routines \
  -u root -p shop | grep -A 999 'CREATE.*VIEW'
```

## Recreating a View from Its Definition

Once you have the definition, you can recreate the view:

```sql
CREATE OR REPLACE VIEW active_customers AS
    SELECT id, name, email, created_at
    FROM customers
    WHERE active = 1
      AND deleted_at IS NULL;
```

## Checking View Metadata

```sql
SELECT
    TABLE_NAME,
    CHECK_OPTION,
    SECURITY_TYPE,
    DEFINER,
    CHARACTER_SET_CLIENT,
    COLLATION_CONNECTION
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'shop';
```

This is useful for auditing view security settings and character set configuration.

## Checking Whether a View Is Updatable

```sql
SELECT TABLE_NAME, IS_UPDATABLE
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'shop';
```

An updatable view allows `INSERT`, `UPDATE`, and `DELETE` operations to pass through to the underlying tables. Views with aggregations, `DISTINCT`, or `GROUP BY` are not updatable.

## Summary

Use `SHOW CREATE VIEW view_name` for a quick human-readable definition, or query `information_schema.VIEWS` for programmatic access to view metadata. Use `mysqldump --no-data` to export all view definitions as part of a schema backup. These techniques help you audit, document, and reproduce view definitions in any environment.
