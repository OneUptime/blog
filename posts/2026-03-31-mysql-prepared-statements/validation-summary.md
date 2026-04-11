# Validation Summary: How to Use MySQL Prepared Statements

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- SQL prepared statements (PREPARE / EXECUTE / DEALLOCATE PREPARE)
- Python mysql-connector-python
- Node.js mysql2
- PHP PDO
- Java JDBC

## Sources Consulted
- MySQL 8.0 Reference Manual — Prepared Statements: https://dev.mysql.com/doc/refman/8.0/en/sql-prepared-statements.html
- MySQL 8.0 Reference Manual — PREPARE Statement: https://dev.mysql.com/doc/refman/8.0/en/prepare.html
- MySQL 8.0 Reference Manual — EXECUTE Statement: https://dev.mysql.com/doc/refman/8.0/en/execute.html
- MySQL 8.0 Reference Manual — DEALLOCATE PREPARE Statement: https://dev.mysql.com/doc/refman/8.0/en/deallocate-prepare.html
- MySQL 8.0 Reference Manual — CREATE TABLE (expression defaults): https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- mysql-connector-python documentation: https://dev.mysql.com/doc/connector-python/en/
- mysql2 npm package documentation: https://github.com/sidorares/node-mysql2
- PHP PDO documentation: https://www.php.net/manual/en/book.pdo.php
- Java JDBC PreparedStatement documentation: https://docs.oracle.com/javase/8/docs/api/java/sql/PreparedStatement.html

## Issues Found

1. **Incorrect claim about query plan caching (intro paragraph)**: The post stated "MySQL parses and optimizes the query plan once, then reuses the compiled plan for each execution." This is inaccurate — MySQL parses and validates the statement once during PREPARE, but the optimizer runs at each EXECUTE call. Query plan reuse is a feature of databases like SQL Server and PostgreSQL, not MySQL. Fixed to: "MySQL parses and validates the query during PREPARE, then reuses the parsed representation for each EXECUTE."

2. **Incorrect performance benefit description**: The post listed "parsing and optimization cost is paid once" as the performance benefit. Since MySQL re-optimizes at each EXECUTE, this was changed to "parsing and validation cost is paid once."

3. **Mermaid diagram inaccuracy**: The diagram showed MySQL returning a "Statement handle (compiled plan)" after PREPARE. Since no execution plan is compiled or cached at PREPARE time, the parenthetical "(compiled plan)" was removed.

4. **Inaccurate claim about driver behavior in summary**: The post stated that all major MySQL drivers "support parameterized queries that map to server-side prepared statements." This is not universally true — Python's mysql-connector-python uses client-side parameter substitution by default (not server-side prepared statements), and PHP PDO has PDO::ATTR_EMULATE_PREPARES enabled by default for MySQL. Changed to "support parameterized queries that provide equivalent protection against SQL injection."

## Review Notes
- The `DEFAULT (CURDATE())` expression syntax in the CREATE TABLE requires MySQL 8.0.13+. This is fine since MySQL 8.0 is the current supported version, but readers on older versions may encounter errors.
- The SQL injection example uses pseudo-code (`user_input` without the `@` prefix) to illustrate the unsafe pattern. This is intentional and clearly marked as illustrative, though it would not execute as-is in MySQL.
- The client-side prepared statement examples are shown as SQL comments, which is a reasonable presentation choice for a MySQL-focused tutorial. The code snippets for Python, Node.js, PHP, and Java are syntactically correct.
- Python's mysql-connector-python requires `cursor = conn.cursor(prepared=True)` to use actual server-side prepared statements; the default `cursor.execute()` with parameters does client-side substitution. This is a nuance the post doesn't cover but is acceptable for a tutorial focused on SQL-level prepared statements.
