# How to Create a Database in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, DDL, Database

Description: Create MySQL databases with CREATE DATABASE, set character sets and collations, and manage database-level permissions for application users.

---

## How It Works

In MySQL the term "database" and "schema" are interchangeable. A database is a named container that holds tables, views, stored procedures, and other objects. Creating a database only reserves the name and sets default encoding options - no disk space is allocated until you create tables inside it.

```mermaid
flowchart LR
    A[CREATE DATABASE myapp] --> B[myapp directory\ncreated in datadir]
    B --> C[Metadata stored\nin data dictionary]
    C --> D[Ready for\nCREATE TABLE]
```

## Syntax

```sql
CREATE DATABASE [IF NOT EXISTS] database_name
    [CHARACTER SET charset_name]
    [COLLATE collation_name];
```

## Creating a Database with Default Settings

```sql
CREATE DATABASE myapp;
```

MySQL creates the database using the server's default character set and collation (typically `utf8mb4` and `utf8mb4_0900_ai_ci` on MySQL 8.0).

## Creating a Database with Explicit Character Set

Always set `utf8mb4` and a collation explicitly to avoid encoding issues with emojis and multi-byte characters.

```sql
CREATE DATABASE myapp
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

## IF NOT EXISTS

Use `IF NOT EXISTS` in scripts and automation to prevent an error if the database already exists.

```sql
CREATE DATABASE IF NOT EXISTS myapp
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

## Listing Databases

```sql
SHOW DATABASES;
```

```text
+--------------------+
| Database           |
+--------------------+
| information_schema |
| myapp              |
| mysql              |
| performance_schema |
| sys                |
+--------------------+
```

## Selecting a Database

After creating a database, switch to it so subsequent statements apply to it.

```sql
USE myapp;
```

Confirm the current database.

```sql
SELECT DATABASE();
```

```text
+------------+
| DATABASE() |
+------------+
| myapp      |
+------------+
```

## Inspecting Database Properties

```sql
SELECT schema_name,
       default_character_set_name,
       default_collation_name
FROM information_schema.schemata
WHERE schema_name = 'myapp';
```

```text
+-------------+----------------------------+------------------------+
| schema_name | default_character_set_name | default_collation_name |
+-------------+----------------------------+------------------------+
| myapp       | utf8mb4                    | utf8mb4_unicode_ci     |
+-------------+----------------------------+------------------------+
```

## Changing a Database's Character Set After Creation

```sql
ALTER DATABASE myapp
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

Note: This changes the default for new tables only. Existing tables retain their character set unless you also alter them.

## Creating a User and Granting Access to the New Database

```sql
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'SecurePass!1';
GRANT ALL PRIVILEGES ON myapp.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
```

## Creating Multiple Databases in a Script

```sql
CREATE DATABASE IF NOT EXISTS myapp_dev
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS myapp_test
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS myapp_staging
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

## Best Practices

- Always specify `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` to support the full Unicode range including emojis.
- Use `IF NOT EXISTS` in deployment scripts so they are idempotent.
- Create a dedicated MySQL user for each application database rather than using root.
- Use lowercase, underscore-separated names (`my_app`, `order_service`) for portability across case-sensitive file systems.
- Keep production, staging, and development databases on separate MySQL instances when possible to prevent accidental cross-environment queries.

## Summary

Creating a database in MySQL is a single SQL statement: `CREATE DATABASE`. The most important options are `CHARACTER SET utf8mb4` and `COLLATE utf8mb4_unicode_ci`, which ensure correct handling of all Unicode characters. After creation, use `USE database_name` to select the database and `GRANT` to give application users the appropriate access. Use `IF NOT EXISTS` in scripts to make them safe to run multiple times.
