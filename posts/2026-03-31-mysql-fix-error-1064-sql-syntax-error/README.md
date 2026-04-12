# How to Fix ERROR 1064 SQL Syntax Error in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL Syntax Error, Troubleshooting, Debugging

Description: Learn how to diagnose and fix MySQL ERROR 1064 SQL syntax errors by reading the error message, checking reserved words, and validating SQL statements.

---

`ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '...' at line N` is a parse-time error. MySQL could not understand the SQL statement you sent.

## Reading the Error Message

```text
ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that
corresponds to your MySQL server version for the right syntax to use near
'order INT NOT NULL' at line 3
```

The key is `near '...'` - MySQL shows you the first character where it got confused. The actual error is often just before that point.

## Common Cause 1 - Reserved Word Used as Identifier

```sql
-- ERROR: 'order' is a reserved word
CREATE TABLE orders (
    id    INT NOT NULL AUTO_INCREMENT,
    order INT NOT NULL,     -- reserved word!
    PRIMARY KEY (id)
);

-- FIX: backtick-quote the reserved word
CREATE TABLE orders (
    id      INT NOT NULL AUTO_INCREMENT,
    `order` INT NOT NULL,
    PRIMARY KEY (id)
);
```

Check whether a word is reserved:

```sql
-- List MySQL reserved words (MySQL 8.0+)
SELECT WORD FROM information_schema.KEYWORDS WHERE RESERVED = 1 ORDER BY WORD;
```

## Common Cause 2 - Missing Comma or Parenthesis

```sql
-- ERROR: missing comma after id column
CREATE TABLE users (
    id    INT UNSIGNED NOT NULL AUTO_INCREMENT
    email VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);

-- FIX: add the comma
CREATE TABLE users (
    id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);
```

## Common Cause 3 - Wrong Quote Type

```sql
-- ERROR: with ANSI_QUOTES enabled, double quotes are identifier quotes, not string delimiters
SET sql_mode = 'ANSI_QUOTES';
SELECT * FROM users WHERE email = "alice@example.com";  -- treated as a column name, not a string

-- FIX: use single quotes for strings (works in all sql_mode settings)
SELECT * FROM users WHERE email = 'alice@example.com';
```

Note: In MySQL's default `sql_mode`, double quotes do work as string delimiters. However, if `ANSI_QUOTES` is enabled (common in environments that follow the SQL standard), double quotes become identifier quotes and will cause ERROR 1064 when used around string values.

## Common Cause 4 - MySQL Version Feature Not Supported

```sql
-- ERROR in MySQL 5.7: VALUES ROW() is not supported
INSERT INTO users VALUES ROW(1, 'alice@example.com');

-- FIX: standard VALUES syntax
INSERT INTO users VALUES (1, 'alice@example.com');
```

Check your MySQL version:

```sql
SELECT VERSION();
```

## Common Cause 5 - Typo in Keyword

```sql
-- ERROR: SELCT is not a keyword
SELCT id, email FROM users;

-- FIX
SELECT id, email FROM users;
```

## Debugging Technique: Simplify the Query

Reduce the failing query to its simplest form and add complexity until the error reappears:

```sql
-- Start simple
SELECT id FROM users;

-- Add complexity one piece at a time
SELECT id, email FROM users WHERE id = 1;
SELECT id, email FROM users WHERE id = 1 AND deleted_at IS NULL;
-- Continue until the error appears
```

## Validating SQL Without Running It

```sql
EXPLAIN SELECT id FROM users WHERE email = 'a@b.com';
-- If EXPLAIN succeeds, syntax is valid
```

## Summary

ERROR 1064 is always a syntax problem. Read the `near '...'` part of the message to locate the issue. Common causes are reserved words used as identifiers (fix with backticks), missing commas, wrong quote types, and MySQL version differences. Simplify the failing query to isolate the error, and use `EXPLAIN` to validate syntax without executing.
