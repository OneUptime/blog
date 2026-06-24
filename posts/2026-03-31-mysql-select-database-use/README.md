# How to Select a Database with USE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, DDL, Database, Administration

Description: Learn how to select and switch databases in MySQL using the USE statement, check the current database, and specify databases without switching using dot notation.

---

## What Is the USE Statement

The `USE` statement selects a database as the current (default) database for the session. After running `USE dbname`, all subsequent table references that do not include a database prefix are resolved in that database.

```mermaid
flowchart LR
    A[MySQL Session] --> B[USE myapp]
    B --> C[Current DB: myapp]
    C --> D[SELECT * FROM users\nresolves to myapp.users]
    C --> E[CREATE TABLE orders\ncreates myapp.orders]
```

## Syntax

```sql
USE database_name;
```

There is no output on success. On failure, MySQL returns an error if the database does not exist or the user lacks access.

## Basic Usage

```sql
-- Select a database before running queries
USE myapp;

-- All subsequent queries operate on myapp
SELECT COUNT(*) FROM users;
CREATE TABLE products (id INT PRIMARY KEY, name VARCHAR(100));
```

## Checking the Current Database

After selecting a database, confirm the active database with `DATABASE()` or `SCHEMA()`:

```sql
USE myapp;

SELECT DATABASE();
```

```text
+------------+
| DATABASE() |
+------------+
| myapp      |
+------------+
```

Both `DATABASE()` and `SCHEMA()` return the same result:

```sql
SELECT DATABASE(), SCHEMA();
```

```text
+------------+----------+
| DATABASE() | SCHEMA() |
+------------+----------+
| myapp      | myapp    |
+------------+----------+
```

## Switching Between Databases

You can switch databases at any point during a session:

```sql
USE myapp;
SELECT COUNT(*) FROM users;     -- queries myapp.users

USE myapp_analytics;
SELECT COUNT(*) FROM events;    -- queries myapp_analytics.events

USE myapp;                      -- switch back
```

## Checking Before USE: SHOW DATABASES

Always verify the database exists before selecting it in scripts:

```sql
SHOW DATABASES LIKE 'myapp%';
```

```text
+-------------------+
| Database (myapp%) |
+-------------------+
| myapp             |
| myapp_analytics   |
+-------------------+
```

```sql
USE myapp_analytics;
```

## USE When No Database Is Selected

If no database is selected, referencing a table without a prefix causes an error:

```sql
SELECT * FROM users;
-- ERROR 1046 (3D000): No database selected
```

Confirm there is no selected database:

```sql
SELECT DATABASE();
```

```text
+------------+
| DATABASE() |
+------------+
| NULL       |
+------------+
```

## Accessing Tables Without USE: Dot Notation

You can access any table in any database without switching, using `database_name.table_name` notation:

```sql
-- No USE statement required
SELECT u.name, COUNT(o.id) AS order_count
FROM myapp.users u
LEFT JOIN myapp.orders o ON o.user_id = u.id
GROUP BY u.id;

-- Cross-database join
SELECT a.user_id, a.event_type, u.name
FROM myapp_analytics.events a
JOIN myapp.users u ON u.id = a.user_id
LIMIT 10;
```

## Specifying Database at Connection Time

When connecting from the command line, pass the database name directly:

```bash
mysql -u appuser -p myapp
# or
mysql -u appuser -p --database=myapp
```

This is equivalent to running `USE myapp` immediately after connecting.

## USE in Application Code

Most MySQL drivers accept a database name in the connection string, which is the recommended approach rather than sending a `USE` statement manually.

```sql
-- Connection string examples (conceptual)
-- mysql://user:pass@host:3306/myapp
-- jdbc:mysql://host:3306/myapp

-- In a stored procedure, USE is not available inside the procedure body
-- Use fully qualified names instead:
CREATE PROCEDURE get_user_count()
BEGIN
    SELECT COUNT(*) FROM myapp.users;  -- fully qualified
END;
```

## Permissions Required

The user must have at least one privilege on the target database:

```sql
-- Grant SELECT privilege so user can USE the database
GRANT SELECT ON myapp.* TO 'readonly'@'localhost';
FLUSH PRIVILEGES;
```

After the grant, `readonly` can run `USE myapp`.

## Best Practices

- Always run `USE database_name` at the start of interactive sessions to avoid running queries against the wrong database.
- In SQL scripts, include `USE database_name;` as the first statement after any `CREATE DATABASE` statement.
- Use fully-qualified `database.table` notation in stored procedures because `USE` is not allowed inside procedure bodies.
- Specify the database in the connection string for application code rather than sending `USE` statements at runtime.
- Confirm the active database with `SELECT DATABASE();` when debugging session-level issues.

## Summary

The `USE database_name` statement selects a database for the current MySQL session, making it the default for subsequent queries. Use `SELECT DATABASE()` to verify the current database. You can access tables in any database at any time using `database_name.table_name` dot notation without switching. For application code, specify the database in the connection string. Stored procedures must use dot notation because `USE` is not supported inside procedure bodies.
