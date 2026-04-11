# How to Query INFORMATION_SCHEMA.ROUTINES in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, INFORMATION_SCHEMA, Stored Procedure, Stored Function, Metadata

Description: Learn how to query INFORMATION_SCHEMA.ROUTINES in MySQL to list stored procedures and functions, inspect their definitions, and audit routine metadata.

---

## Overview

`INFORMATION_SCHEMA.ROUTINES` provides metadata about all stored procedures and stored functions in MySQL. It allows you to list, inspect, and audit routines without using the `SHOW PROCEDURE STATUS` or `SHOW FUNCTION STATUS` commands.

## Basic Query

```sql
SELECT
  ROUTINE_SCHEMA,
  ROUTINE_NAME,
  ROUTINE_TYPE,
  DATA_TYPE,
  CREATED,
  LAST_ALTERED,
  DEFINER,
  SECURITY_TYPE
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'myapp'
ORDER BY ROUTINE_TYPE, ROUTINE_NAME;
```

## Key Columns

| Column | Description |
|--------|-------------|
| `ROUTINE_SCHEMA` | Database name |
| `ROUTINE_NAME` | Procedure or function name |
| `ROUTINE_TYPE` | PROCEDURE or FUNCTION |
| `DATA_TYPE` | Return type for functions |
| `ROUTINE_BODY` | SQL (always SQL in MySQL) |
| `ROUTINE_DEFINITION` | Full SQL body |
| `DEFINER` | user@host of creator |
| `SECURITY_TYPE` | DEFINER or INVOKER |
| `SQL_MODE` | SQL mode at creation time |
| `CREATED` | Creation timestamp |
| `LAST_ALTERED` | Last modification timestamp |
| `IS_DETERMINISTIC` | YES or NO |

## Listing All Stored Procedures

```sql
SELECT ROUTINE_NAME, CREATED, LAST_ALTERED, DEFINER
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'myapp'
  AND ROUTINE_TYPE = 'PROCEDURE'
ORDER BY ROUTINE_NAME;
```

## Listing All Stored Functions

```sql
SELECT ROUTINE_NAME, DATA_TYPE, IS_DETERMINISTIC, CREATED
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'myapp'
  AND ROUTINE_TYPE = 'FUNCTION'
ORDER BY ROUTINE_NAME;
```

## Reading a Routine Definition

```sql
SELECT ROUTINE_DEFINITION
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'myapp'
  AND ROUTINE_NAME = 'calculate_discount'
  AND ROUTINE_TYPE = 'FUNCTION'\G
```

## Finding Non-Deterministic Functions

Non-deterministic functions cannot be used in some replication configurations or with generated columns:

```sql
SELECT ROUTINE_NAME, IS_DETERMINISTIC, SECURITY_TYPE
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'myapp'
  AND ROUTINE_TYPE = 'FUNCTION'
  AND IS_DETERMINISTIC = 'NO';
```

## Finding Routines with DEFINER Security Type

DEFINER security means the routine runs with the creator's privileges, which can be a security risk:

```sql
SELECT
  ROUTINE_TYPE,
  ROUTINE_NAME,
  DEFINER,
  SECURITY_TYPE
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'myapp'
  AND SECURITY_TYPE = 'DEFINER'
ORDER BY DEFINER;
```

## Finding Recently Modified Routines

```sql
SELECT ROUTINE_TYPE, ROUTINE_NAME, LAST_ALTERED
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'myapp'
  AND LAST_ALTERED > DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY LAST_ALTERED DESC;
```

## Summary

`INFORMATION_SCHEMA.ROUTINES` is the central catalog for stored procedure and function management in MySQL. By querying it, you can audit routine ownership, inspect definitions, identify non-deterministic functions that may cause replication issues, and track schema change history by monitoring the `LAST_ALTERED` timestamp.
