# How to View All Stored Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Function, Information Schema, SHOW, Metadata

Description: Learn how to list all stored functions in MySQL using SHOW FUNCTION STATUS, SHOW CREATE FUNCTION, and the information_schema.ROUTINES table.

---

MySQL stores function definitions in the `information_schema.ROUTINES` table and exposes them through `SHOW` statements. Knowing how to query this metadata is essential for auditing, documentation, and troubleshooting.

## List All Functions with SHOW FUNCTION STATUS

`SHOW FUNCTION STATUS` returns a row for every stored function the current user has access to:

```sql
SHOW FUNCTION STATUS;
```

To filter by database:

```sql
SHOW FUNCTION STATUS WHERE Db = 'mydb';
```

To search by name pattern:

```sql
SHOW FUNCTION STATUS LIKE '%tax%';
```

The output includes columns such as `Db`, `Name`, `Type`, `Definer`, `Modified`, `Created`, `Security_type`, `Comment`, and `character_set_client`.

## View the Source Code of a Function

`SHOW CREATE FUNCTION` returns the complete `CREATE FUNCTION` statement:

```sql
SHOW CREATE FUNCTION mydb.calculate_tax;
```

The result includes the function body, return type, and all characteristics (`DETERMINISTIC`, `READS SQL DATA`, etc.), which is useful when you need to recreate or audit a function.

## Query information_schema.ROUTINES

For scripting or more flexible filtering, query the `information_schema` directly:

```sql
SELECT
    ROUTINE_SCHEMA     AS db_name,
    ROUTINE_NAME       AS function_name,
    DATA_TYPE          AS return_type,
    ROUTINE_DEFINITION AS body,
    DEFINER,
    CREATED,
    LAST_ALTERED,
    IS_DETERMINISTIC,
    SECURITY_TYPE,
    SQL_DATA_ACCESS
FROM information_schema.ROUTINES
WHERE ROUTINE_TYPE = 'FUNCTION'
  AND ROUTINE_SCHEMA = 'mydb'
ORDER BY ROUTINE_NAME;
```

To find functions created or modified in the last 7 days:

```sql
SELECT ROUTINE_SCHEMA, ROUTINE_NAME, LAST_ALTERED
FROM information_schema.ROUTINES
WHERE ROUTINE_TYPE = 'FUNCTION'
  AND LAST_ALTERED >= NOW() - INTERVAL 7 DAY;
```

## Count Functions Per Database

```sql
SELECT ROUTINE_SCHEMA, COUNT(*) AS function_count
FROM information_schema.ROUTINES
WHERE ROUTINE_TYPE = 'FUNCTION'
GROUP BY ROUTINE_SCHEMA
ORDER BY function_count DESC;
```

## Find Functions That Reference a Specific Table

Useful for impact analysis before dropping a table:

```sql
SELECT ROUTINE_SCHEMA, ROUTINE_NAME
FROM information_schema.ROUTINES
WHERE ROUTINE_TYPE = 'FUNCTION'
  AND ROUTINE_DEFINITION LIKE '%orders%';
```

Note that `ROUTINE_DEFINITION` may be `NULL` if the current user lacks the `SHOW_ROUTINE` or `SELECT` privilege on the function.

## Check Privileges Required

To see function definitions in `information_schema.ROUTINES`, the querying user needs either:
- The `SHOW_ROUTINE` privilege (MySQL 8.0.20+)
- The same definer account, or
- The `SELECT` privilege on `mysql.proc` (older MySQL 5.x)

```sql
GRANT SHOW_ROUTINE ON *.* TO 'analyst'@'localhost';
```

## Summary

Use `SHOW FUNCTION STATUS LIKE 'pattern'` for a quick overview and `SHOW CREATE FUNCTION` to inspect source code. For scripted audits and cross-database searches, query `information_schema.ROUTINES` with `ROUTINE_TYPE = 'FUNCTION'` and filter by schema, name, or modification date.
