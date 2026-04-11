# Validation Summary: How to Set Up MySQL with PHP using PDO

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PHP (PDO extension)
- MySQL
- pdo_mysql driver
- Prepared statements (named and positional placeholders)
- PDO transactions

## Sources Consulted
- PHP PDO documentation: https://www.php.net/manual/en/book.pdo.php
- PHP PDO::__construct: https://www.php.net/manual/en/pdo.construct.php
- PHP PDOStatement::fetchAll: https://www.php.net/manual/en/pdostatement.fetchall.php
- MySQL CREATE TABLE DEFAULT values: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL CURRENT_TIMESTAMP: https://dev.mysql.com/doc/refman/8.0/en/timestamp-initialization.html
- PHP PDO predefined constants: https://www.php.net/manual/en/pdo.constants.php
- MySQL SQLSTATE codes: https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html

## Issues Found

1. **`DEFAULT NOW()` in CREATE TABLE statement** (line 70): `DEFAULT NOW()` is not valid MySQL syntax for column defaults. Prior to MySQL 8.0.13, only `CURRENT_TIMESTAMP` (not arbitrary function calls) was allowed as a default for DATETIME/TIMESTAMP columns. In MySQL 8.0.13+, expression defaults require parentheses: `DEFAULT (NOW())`. Changed to `DEFAULT CURRENT_TIMESTAMP`, which is the standard, portable form supported across all modern MySQL versions.

2. **Incorrect comment on FETCH_COLUMN example** (line 197): The comment read `// Column 0 only:` but the code passed column index `1` to `PDO::FETCH_COLUMN`, which fetches the `name` column (the second column in `SELECT id, name, email`). Changed the comment to `// Name column (index 1):` to accurately describe what the code does.

## Review Notes
- The Fetch Modes section shows multiple `fetchAll()` calls on the same `$stmt` object sequentially. After the first `fetchAll()`, the cursor is exhausted and subsequent calls would return empty arrays. This is a common documentation convention for showing alternative approaches, but readers running the code as-is may be confused. A future improvement could add a note that these are alternative examples, not meant to run sequentially.
- The singleton/static-variable pattern in `getDb()` works for single-request PHP lifecycles but would not be appropriate for long-running processes (e.g., ReactPHP, Swoole) where connection health should be checked. This is a minor caveat not worth fixing in the current context.
