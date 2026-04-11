# How to Query INFORMATION_SCHEMA.VIEWS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, INFORMATION_SCHEMA, View, Schema, Metadata

Description: Learn how to query INFORMATION_SCHEMA.VIEWS in MySQL to list all views, inspect their definitions, security settings, and updateability.

---

## Overview

`INFORMATION_SCHEMA.VIEWS` contains metadata about all views defined in your MySQL databases. Views can encapsulate complex queries, enforce row-level security, or provide a stable API layer over changing schema structures. This table lets you audit and manage all views from a single query.

## Basic Query

```sql
SELECT
  TABLE_SCHEMA,
  TABLE_NAME,
  VIEW_DEFINITION,
  CHECK_OPTION,
  IS_UPDATABLE,
  DEFINER,
  SECURITY_TYPE
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'myapp'
ORDER BY TABLE_NAME;
```

## Key Columns

| Column | Description |
|--------|-------------|
| `TABLE_SCHEMA` | Database containing the view |
| `TABLE_NAME` | View name |
| `VIEW_DEFINITION` | The SELECT statement defining the view |
| `CHECK_OPTION` | NONE, LOCAL, or CASCADED |
| `IS_UPDATABLE` | YES or NO - whether DML is allowed |
| `DEFINER` | user@host of creator |
| `SECURITY_TYPE` | DEFINER or INVOKER |
| `CHARACTER_SET_CLIENT` | Client charset at creation |
| `COLLATION_CONNECTION` | Connection collation at creation |

## Listing All Views

```sql
SELECT TABLE_NAME, IS_UPDATABLE, SECURITY_TYPE, DEFINER
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'myapp'
ORDER BY TABLE_NAME;
```

## Finding Non-Updatable Views

Non-updatable views use aggregates, DISTINCT, GROUP BY, or subqueries, so INSERT/UPDATE/DELETE fail:

```sql
SELECT TABLE_NAME, VIEW_DEFINITION
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'myapp'
  AND IS_UPDATABLE = 'NO'
ORDER BY TABLE_NAME;
```

## Finding Views with DEFINER Security

Views running with DEFINER security use the creator's privileges, which may grant unintended access:

```sql
SELECT
  TABLE_NAME,
  DEFINER,
  SECURITY_TYPE
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'myapp'
  AND SECURITY_TYPE = 'DEFINER'
ORDER BY TABLE_NAME;
```

## Reading a View Definition

```sql
SELECT VIEW_DEFINITION
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'myapp'
  AND TABLE_NAME = 'active_orders'\G
```

## Finding Views That Reference a Specific Table

Useful before dropping or renaming a table:

```sql
SELECT TABLE_NAME AS view_name
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'myapp'
  AND VIEW_DEFINITION LIKE '%orders%';
```

## Generating CREATE OR REPLACE VIEW Statements

```sql
SELECT
  CONCAT(
    'CREATE OR REPLACE DEFINER=`',
    SUBSTRING_INDEX(DEFINER, '@', 1),
    '`@`',
    SUBSTRING_INDEX(DEFINER, '@', -1),
    '` SQL SECURITY ', SECURITY_TYPE, ' ',
    'VIEW `', TABLE_SCHEMA, '`.`', TABLE_NAME, '` AS ',
    VIEW_DEFINITION, ';'
  ) AS create_view_sql
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'myapp'\G
```

## Finding Views with WITH CHECK OPTION

```sql
SELECT TABLE_NAME, CHECK_OPTION
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'myapp'
  AND CHECK_OPTION != 'NONE';
```

## Summary

`INFORMATION_SCHEMA.VIEWS` provides full visibility into the views defined in your MySQL databases. By auditing updatability, security type, and definition content, you can ensure your views are properly configured for their intended use cases and identify potential security issues with DEFINER-based access patterns.
