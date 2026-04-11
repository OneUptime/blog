# What Is INFORMATION_SCHEMA in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, INFORMATION_SCHEMA, Metadata, Database Introspection, DDL

Description: INFORMATION_SCHEMA is a MySQL virtual database that exposes metadata about all databases, tables, columns, indexes, and privileges through standard SQL queries.

---

## Overview

`INFORMATION_SCHEMA` is a special read-only database present in every MySQL installation. It contains views that return metadata about the server's databases, tables, columns, stored routines, events, triggers, user privileges, and more. The data is derived from MySQL's internal data dictionary at query time -- there is no physical storage on disk. You query it with standard `SELECT` statements just like any other database.

## Discovering Databases and Tables

```sql
-- List all databases
SELECT SCHEMA_NAME, DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
FROM information_schema.SCHEMATA;

-- List tables in a specific database with row counts and sizes
SELECT
  TABLE_NAME,
  TABLE_ROWS,
  ROUND(DATA_LENGTH / 1048576, 2) AS data_mb,
  ROUND(INDEX_LENGTH / 1048576, 2) AS index_mb,
  ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mydb'
ORDER BY DATA_LENGTH DESC;
```

## Inspecting Columns

```sql
-- All columns in a table with their data types and defaults
SELECT
  COLUMN_NAME,
  ORDINAL_POSITION,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME = 'orders'
ORDER BY ORDINAL_POSITION;
```

## Finding Indexes and Foreign Keys

```sql
-- All indexes on a table
SELECT
  INDEX_NAME,
  COLUMN_NAME,
  SEQ_IN_INDEX,
  NON_UNIQUE,
  INDEX_TYPE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME = 'orders';

-- All foreign keys referencing a specific table
SELECT
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_SCHEMA = 'mydb'
  AND REFERENCED_TABLE_NAME = 'customers';
```

## Listing Stored Routines

```sql
-- All stored procedures and functions
SELECT
  ROUTINE_NAME,
  ROUTINE_TYPE,
  CREATED,
  LAST_ALTERED,
  DEFINER
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'mydb'
ORDER BY ROUTINE_TYPE, ROUTINE_NAME;
```

## User Privileges

```sql
-- Privileges granted to users
SELECT
  GRANTEE,
  TABLE_CATALOG,
  PRIVILEGE_TYPE,
  IS_GRANTABLE
FROM information_schema.USER_PRIVILEGES;

-- Table-level privileges
SELECT * FROM information_schema.TABLE_PRIVILEGES
WHERE TABLE_SCHEMA = 'mydb';
```

## Triggers and Events

```sql
-- All triggers in a database
SELECT
  TRIGGER_NAME,
  EVENT_MANIPULATION,
  EVENT_OBJECT_TABLE,
  ACTION_TIMING,
  CREATED
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'mydb';

-- Scheduled events
SELECT EVENT_NAME, EVENT_TYPE, STATUS, INTERVAL_VALUE, INTERVAL_FIELD
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = 'mydb';
```

## InnoDB-Specific Views

```sql
-- Active InnoDB transactions
SELECT * FROM information_schema.INNODB_TRX;

-- Current row-level locks (MySQL 8.0+)
SELECT * FROM performance_schema.data_locks;

-- Lock wait relationships (MySQL 8.0+)
SELECT * FROM performance_schema.data_lock_waits;
```

## INFORMATION_SCHEMA vs SHOW Statements

Many `SHOW` statements (like `SHOW TABLES`, `SHOW COLUMNS`, `SHOW INDEX`) are shorthand for INFORMATION_SCHEMA queries. INFORMATION_SCHEMA queries are more flexible because you can `JOIN`, `WHERE`, `ORDER BY`, and aggregate across all databases at once.

## Summary

INFORMATION_SCHEMA is MySQL's metadata catalog, giving programmatic access to schema structure, object definitions, privileges, and InnoDB internals through standard SQL. It is essential for generating DDL scripts, auditing schemas, building documentation, and writing administrative automation. Because it reflects the live data dictionary, queries always return current metadata.
