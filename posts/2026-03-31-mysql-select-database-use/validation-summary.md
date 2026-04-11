# Validation Summary: How to Select a Database with USE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (USE statement, DATABASE()/SCHEMA() functions, SHOW DATABASES, dot notation)
- SQL (session management, cross-database queries)
- MySQL CLI client (connection-time database selection)

## Sources Consulted
- MySQL 8.0 Reference Manual — USE statement: https://dev.mysql.com/doc/refman/8.0/en/use.html
- MySQL 8.0 Reference Manual — DATABASE() function: https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_database
- MySQL 8.0 Reference Manual — SHOW DATABASES: https://dev.mysql.com/doc/refman/8.0/en/show-databases.html
- MySQL 8.0 Reference Manual — GRANT statement: https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual — Stored routines and USE: https://dev.mysql.com/doc/refman/8.0/en/stored-programs-logging.html

## Issues Found
- **Incorrect DDL tag**: The post was tagged with "DDL" (Data Definition Language), but the `USE` statement is not a DDL statement. DDL refers to statements that define or modify database object structure (CREATE, ALTER, DROP, TRUNCATE). `USE` is a utility/session management statement. Removed "DDL" from the tags.

## Review Notes
- The post states "There is no output on success" for the USE statement. While the statement itself returns no result set, the `mysql` CLI client does display "Database changed" upon success. This is technically acceptable since it refers to the SQL statement's output rather than the client's behavior, but readers using the interactive client may notice the discrepancy.
- The `FLUSH PRIVILEGES` after `GRANT` in the permissions section is unnecessary in MySQL 5.7+ since the server automatically re-reads the grant tables after GRANT/REVOKE. It's not incorrect, but it's a common cargo-cult practice. Left as-is since it does no harm.
- The GROUP BY query (`GROUP BY u.id` while selecting `u.name`) is valid assuming `id` is the primary key, since MySQL recognizes functional dependency on primary keys with `ONLY_FULL_GROUP_BY` mode (default since MySQL 5.7.5). The example is reasonable.
