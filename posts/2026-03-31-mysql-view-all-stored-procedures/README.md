# How to View All Stored Procedures in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Procedure, Administration, Information Schema, SQL

Description: Learn how to list, view, and inspect all stored procedures in MySQL using SHOW PROCEDURE STATUS, information_schema, and SHOW CREATE PROCEDURE.

---

When managing a MySQL database, you frequently need to audit existing stored procedures - listing them, checking their definitions, or finding procedures with specific characteristics. MySQL provides several ways to inspect stored procedures.

## Listing All Stored Procedures

```sql
-- List all procedures in the current database
SHOW PROCEDURE STATUS WHERE Db = DATABASE();

-- List all procedures across all databases
SHOW PROCEDURE STATUS;

-- Filter by database name
SHOW PROCEDURE STATUS WHERE Db = 'mydb';
```

The output includes the database, procedure name, definer, creation time, last modified time, and security type.

## Querying information_schema for More Detail

The `information_schema.ROUTINES` table provides detailed metadata:

```sql
-- List all stored procedures with key details
SELECT
    ROUTINE_SCHEMA AS db_name,
    ROUTINE_NAME AS procedure_name,
    DEFINER,
    SECURITY_TYPE,
    CREATED,
    LAST_ALTERED,
    SQL_MODE
FROM information_schema.ROUTINES
WHERE ROUTINE_TYPE = 'PROCEDURE'
  AND ROUTINE_SCHEMA = 'mydb'
ORDER BY ROUTINE_NAME;
```

## Viewing Procedure Source Code

```sql
-- View the full definition of a specific procedure
SHOW CREATE PROCEDURE mydb.calculate_order_stats;
```

The output includes the `CREATE PROCEDURE` statement, character set, collation, and SQL mode used when the procedure was created.

To view the body only via `information_schema`:

```sql
SELECT ROUTINE_DEFINITION
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'mydb'
  AND ROUTINE_NAME = 'calculate_order_stats'
  AND ROUTINE_TYPE = 'PROCEDURE';
```

Note: The `ROUTINE_DEFINITION` column may be `NULL` if the user lacks sufficient privileges. In MySQL 8.0+, the user needs the `SHOW_ROUTINE` global privilege, the `CREATE ROUTINE`, `ALTER ROUTINE`, or `EXECUTE` privilege for the routine, or must be the routine `DEFINER`. In MySQL 5.7 and earlier, the `SELECT` privilege on `mysql.proc` is required.

## Finding Procedures by Content

Search for procedures that reference a specific table or string:

```sql
-- Find procedures that reference a specific table
SELECT ROUTINE_SCHEMA, ROUTINE_NAME
FROM information_schema.ROUTINES
WHERE ROUTINE_TYPE = 'PROCEDURE'
  AND ROUTINE_DEFINITION LIKE '%orders%';

-- Find procedures using a specific function
SELECT ROUTINE_SCHEMA, ROUTINE_NAME
FROM information_schema.ROUTINES
WHERE ROUTINE_TYPE = 'PROCEDURE'
  AND ROUTINE_DEFINITION LIKE '%LAST_INSERT_ID%';
```

## Checking Procedure Parameters

```sql
-- List parameters for all procedures in a database
SELECT
    SPECIFIC_NAME AS procedure_name,
    PARAMETER_NAME,
    PARAMETER_MODE,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    ORDINAL_POSITION
FROM information_schema.PARAMETERS
WHERE SPECIFIC_SCHEMA = 'mydb'
ORDER BY SPECIFIC_NAME, ORDINAL_POSITION;

-- Parameters for a specific procedure
SELECT
    PARAMETER_NAME,
    PARAMETER_MODE,
    DATA_TYPE
FROM information_schema.PARAMETERS
WHERE SPECIFIC_SCHEMA = 'mydb'
  AND SPECIFIC_NAME = 'calculate_order_stats'
ORDER BY ORDINAL_POSITION;
```

## Finding Procedures by Definer

```sql
-- Find procedures owned by a specific user
SELECT ROUTINE_SCHEMA, ROUTINE_NAME, CREATED, LAST_ALTERED
FROM information_schema.ROUTINES
WHERE ROUTINE_TYPE = 'PROCEDURE'
  AND DEFINER LIKE 'app_user%'
ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME;
```

## Checking Procedure Privileges

```sql
-- Check who has privileges on a procedure
SELECT User, Host, Routine_name, Proc_priv
FROM mysql.procs_priv
WHERE Db = 'mydb'
  AND Routine_name = 'calculate_order_stats';
```

## Exporting Procedure Definitions

Use `mysqldump` to export all stored procedures from a database:

```bash
# Export only routines (no table data)
mysqldump --no-data --routines --no-create-info mydb > routines.sql

# Export everything including routines
mysqldump --routines mydb > full_backup.sql
```

Note that `mysqldump` does not include routines by default - you must specify `--routines`.

## Summary

Use `SHOW PROCEDURE STATUS WHERE Db = 'mydb'` for a quick overview. Query `information_schema.ROUTINES` with `ROUTINE_TYPE = 'PROCEDURE'` for detailed metadata and to search procedure definitions. Use `SHOW CREATE PROCEDURE proc_name` to view the full source code. Check `information_schema.PARAMETERS` to inspect parameter signatures. Always include `--routines` in `mysqldump` commands to back up stored procedures.
