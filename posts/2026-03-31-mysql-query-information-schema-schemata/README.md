# How to Query INFORMATION_SCHEMA.SCHEMATA in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, INFORMATION_SCHEMA, Schema, Database Administration, Metadata

Description: Learn how to query the INFORMATION_SCHEMA.SCHEMATA table in MySQL to list all databases, their character sets, collations, and default encryption settings.

---

## What Is INFORMATION_SCHEMA.SCHEMATA?

The `INFORMATION_SCHEMA.SCHEMATA` table is a read-only view in MySQL that provides metadata about every database (schema) accessible to the current user. Each row represents one database and includes details such as its name, default character set, default collation, and (in MySQL 8.0+) default encryption. This view is the programmatic equivalent of the `SHOW DATABASES` command but with richer column detail.

## Columns in INFORMATION_SCHEMA.SCHEMATA

The key columns are:

- `CATALOG_NAME` - always `def` in MySQL
- `SCHEMA_NAME` - the database name
- `DEFAULT_CHARACTER_SET_NAME` - the default character set
- `DEFAULT_COLLATION_NAME` - the default collation
- `SQL_PATH` - always NULL
- `DEFAULT_ENCRYPTION` - `YES` or `NO` (MySQL 8.0+)

## Basic Queries

List all databases visible to your user:

```sql
SELECT SCHEMA_NAME
FROM INFORMATION_SCHEMA.SCHEMATA
ORDER BY SCHEMA_NAME;
```

Show each database along with its character set and collation:

```sql
SELECT
    SCHEMA_NAME,
    DEFAULT_CHARACTER_SET_NAME,
    DEFAULT_COLLATION_NAME
FROM INFORMATION_SCHEMA.SCHEMATA
ORDER BY SCHEMA_NAME;
```

## Filtering System Databases

When auditing user databases, filter out built-in system schemas:

```sql
SELECT
    SCHEMA_NAME,
    DEFAULT_CHARACTER_SET_NAME,
    DEFAULT_COLLATION_NAME
FROM INFORMATION_SCHEMA.SCHEMATA
WHERE SCHEMA_NAME NOT IN (
    'information_schema',
    'performance_schema',
    'mysql',
    'sys'
)
ORDER BY SCHEMA_NAME;
```

## Finding Databases with Non-UTF8 Character Sets

A common audit task is finding databases that are not yet using `utf8mb4`:

```sql
SELECT
    SCHEMA_NAME,
    DEFAULT_CHARACTER_SET_NAME,
    DEFAULT_COLLATION_NAME
FROM INFORMATION_SCHEMA.SCHEMATA
WHERE DEFAULT_CHARACTER_SET_NAME != 'utf8mb4'
  AND SCHEMA_NAME NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys');
```

## Checking Encryption Status (MySQL 8.0+)

In MySQL 8.0, you can check which databases have encryption enabled:

```sql
SELECT
    SCHEMA_NAME,
    DEFAULT_ENCRYPTION
FROM INFORMATION_SCHEMA.SCHEMATA
WHERE SCHEMA_NAME NOT IN (
    'information_schema', 'performance_schema', 'mysql', 'sys'
);
```

## Counting Total Databases

```sql
SELECT COUNT(*) AS total_databases
FROM INFORMATION_SCHEMA.SCHEMATA
WHERE SCHEMA_NAME NOT IN (
    'information_schema', 'performance_schema', 'mysql', 'sys'
);
```

## Generating ALTER DATABASE Statements

You can use SCHEMATA to generate SQL for migrating all databases to `utf8mb4`:

```sql
SELECT
    CONCAT(
        'ALTER DATABASE `', SCHEMA_NAME, '` '
        'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
    ) AS alter_statement
FROM INFORMATION_SCHEMA.SCHEMATA
WHERE DEFAULT_CHARACTER_SET_NAME != 'utf8mb4'
  AND SCHEMA_NAME NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys');
```

Copy the output and run it to standardize character sets across all databases.

## Required Privileges

Any MySQL user can query `INFORMATION_SCHEMA.SCHEMATA`, but each user sees only the databases on which they hold at least one privilege. Users with any global privilege (such as `SHOW DATABASES`) can see all databases.

## Summary

`INFORMATION_SCHEMA.SCHEMATA` is a concise but powerful table for auditing database-level metadata in MySQL. It helps you quickly identify character set inconsistencies, track encryption status in MySQL 8.0+, and generate bulk DDL statements for standardizing database configurations across environments.
