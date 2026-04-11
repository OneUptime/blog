# How to Use QUOTE() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn how MySQL's QUOTE() function safely wraps a string in single quotes and escapes special characters for safe use in dynamically constructed SQL.

---

## What is QUOTE()?

The `QUOTE()` function in MySQL returns a string value enclosed in single quotes, with all special characters properly escaped so the result can be safely embedded in a SQL statement. It is primarily used when building dynamic SQL strings inside stored procedures, where you need to construct `WHERE` clause values programmatically.

The syntax is:

```sql
QUOTE(str)
```

`QUOTE()` escapes the following characters: single quote (`'`), backslash (`\`), ASCII NUL (null bytes), and Control+Z (ASCII 26). It also wraps the entire result in single quotes.

## Basic Examples

```sql
SELECT QUOTE('hello');
-- Result: 'hello'

SELECT QUOTE("it's a test");
-- Result: 'it\'s a test'

SELECT QUOTE('back\\slash');
-- Result: 'back\\slash'

SELECT QUOTE(NULL);
-- Result: NULL  (the word NULL, not SQL NULL)
```

## Difference Between QUOTE() and Manual Escaping

Without `QUOTE()`, building a dynamic SQL string from user input requires careful manual escaping. `QUOTE()` handles this automatically:

```sql
SET @username = "O'Brien";
SET @sql = CONCAT('SELECT * FROM users WHERE name = ', QUOTE(@username));
SELECT @sql;
-- Result: SELECT * FROM users WHERE name = 'O\'Brien'
```

## Using QUOTE() in Stored Procedures

A common pattern is building dynamic `SELECT` or `INSERT` statements:

```sql
DELIMITER //
CREATE PROCEDURE find_user(IN p_name VARCHAR(100))
BEGIN
  SET @stmt = CONCAT('SELECT * FROM users WHERE name = ', QUOTE(p_name));
  PREPARE stmt FROM @stmt;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END //
DELIMITER ;

CALL find_user("O'Brien");
```

The `QUOTE()` call ensures that if `p_name` contains a single quote, the constructed statement remains valid.

## NULL Handling

When the input is `NULL`, `QUOTE()` returns the word `NULL` without enclosing single quotes, rather than the SQL `NULL` value. This makes it suitable for direct embedding into dynamic SQL:

```sql
SET @val = NULL;
SET @sql = CONCAT('INSERT INTO t (name) VALUES (', QUOTE(@val), ')');
SELECT @sql;
-- Result: INSERT INTO t (name) VALUES (NULL)
```

## Using QUOTE() for Export Scripts

When generating INSERT statements for data export via stored procedures or event-based automation:

```sql
SELECT
  CONCAT(
    'INSERT INTO archive_users (id, name, email) VALUES (',
    id, ', ',
    QUOTE(name), ', ',
    QUOTE(email),
    ');'
  ) AS insert_statement
FROM users
WHERE status = 'inactive';
```

This produces ready-to-execute SQL rows for each inactive user.

## Important Security Note

`QUOTE()` is a useful tool inside stored procedures for constructing safe dynamic SQL. However, for application-layer database access, always prefer parameterized queries (prepared statements via your database driver) rather than constructing SQL strings in application code. `QUOTE()` is a server-side SQL utility, not a replacement for client-side parameterization.

## Summary

`QUOTE()` wraps a string in single quotes and escapes single quotes, backslashes, ASCII NUL, and Control+Z, making it safe to embed values into dynamically constructed SQL strings within stored procedures. For `NULL` input, it returns the unquoted word `NULL` (not the SQL NULL value), which integrates directly into dynamic SQL. Use it in stored procedures when building dynamic statements with `PREPARE`/`EXECUTE`. Always complement it with prepared statements in application code for robust SQL injection prevention.
