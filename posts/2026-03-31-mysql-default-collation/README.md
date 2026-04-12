# How to Set the Default Collation in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, Collation, Character Set, Database

Description: Set the default MySQL collation globally in my.cnf, at the database, table, and column level, and understand the differences between common utf8mb4 collations.

---

## How It Works

A collation defines how string values are compared and sorted. MySQL applies collations at four levels: server, database, table, and column. The lower levels override the higher ones. The server-level default is set in `my.cnf` and affects all new databases that do not specify a collation explicitly.

```mermaid
flowchart LR
    A[Server default collation in my.cnf] --> B[Database-level collation]
    B --> C[Table-level collation]
    C --> D[Column-level collation]
    D --> E[String comparison and ORDER BY behavior]
```

## Common utf8mb4 Collations

```text
utf8mb4_unicode_ci       MySQL 5.7 / 8.0 - case-insensitive, UCA 4.0.0 sorting
utf8mb4_general_ci       Legacy - fast but less accurate Unicode sorting
utf8mb4_0900_ai_ci       MySQL 8.0 default - Unicode 9.0, accent+case insensitive
utf8mb4_0900_as_cs       MySQL 8.0 - Unicode 9.0, accent+case sensitive
utf8mb4_bin              Binary comparison - fully case and accent sensitive
```

## Check the Current Default Collation

```sql
SHOW VARIABLES LIKE 'collation_%';
```

```text
+----------------------+--------------------+
| Variable_name        | Value              |
+----------------------+--------------------+
| collation_connection | utf8mb4_0900_ai_ci |
| collation_database   | utf8mb4_0900_ai_ci |
| collation_server     | utf8mb4_0900_ai_ci |
+----------------------+--------------------+
```

## Setting the Server-Level Default in my.cnf

Edit the MySQL configuration file.

```bash
# Ubuntu / Debian
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# RHEL-based
sudo nano /etc/my.cnf
```

```ini
[mysqld]
character-set-server = utf8mb4
collation-server     = utf8mb4_unicode_ci
```

Restart MySQL.

```bash
sudo systemctl restart mysql
```

Verify.

```sql
SHOW VARIABLES LIKE 'collation_server';
```

## Setting the Collation at the Database Level

When creating a new database:

```sql
CREATE DATABASE myapp
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

To change the collation of an existing database:

```sql
ALTER DATABASE myapp
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

Note: Changing the database collation does not change existing tables. You must convert them separately.

## Setting the Collation at the Table Level

```sql
CREATE TABLE products (
    id    INT AUTO_INCREMENT PRIMARY KEY,
    name  VARCHAR(200) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

To change an existing table:

```sql
ALTER TABLE products
    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Setting the Collation at the Column Level

A column collation overrides the table collation.

```sql
CREATE TABLE messages (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    subject VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    body    TEXT         CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
);
```

Using `utf8mb4_bin` on the `body` column makes searches case-sensitive and accent-sensitive for that column specifically.

## Checking the Collation of Existing Tables

```sql
SELECT TABLE_NAME, TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'myapp';
```

```text
+----------+--------------------+
| TABLE_NAME | TABLE_COLLATION  |
+----------+--------------------+
| users    | utf8mb4_unicode_ci |
| products | utf8mb4_0900_ai_ci |
+----------+--------------------+
```

## Checking Column Collations

```sql
SELECT COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'myapp'
  AND TABLE_NAME   = 'users';
```

## Case Sensitivity in Queries

With a case-insensitive collation (`_ci`), these queries return the same result.

```sql
SELECT * FROM users WHERE email = 'Alice@Example.com';
SELECT * FROM users WHERE email = 'alice@example.com';
```

With a case-sensitive or binary collation, they return different results.

```sql
-- Force binary comparison for a single query
SELECT * FROM users WHERE email = BINARY 'alice@example.com';
```

## Changing the Session Collation

Override the collation for the current session without changing `my.cnf`.

```sql
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Or change it for a specific connection.

```sql
SET collation_connection = utf8mb4_bin;
```

## Collation Compatibility Between MySQL 5.7 and 8.0

MySQL 8.0 changed the default collation from `utf8mb4_general_ci` to `utf8mb4_0900_ai_ci`. If you are migrating from MySQL 5.7, set the collation explicitly in `my.cnf` to `utf8mb4_unicode_ci` to preserve sort order compatibility.

```ini
[mysqld]
collation-server = utf8mb4_unicode_ci
```

## Summary

MySQL collation determines how string comparisons and sorting work. Set the server-level default in `my.cnf` with `collation-server`, and override it at the database, table, or column level as needed. For new MySQL 8.0 deployments, `utf8mb4_0900_ai_ci` is the best default. For compatibility with MySQL 5.7 applications, use `utf8mb4_unicode_ci`. Use `utf8mb4_bin` for columns that require exact, case-sensitive matching such as tokens or password hashes.
