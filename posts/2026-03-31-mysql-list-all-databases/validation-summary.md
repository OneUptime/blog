# Validation Summary: How to List All Databases in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (8.0+)
- SQL (SHOW DATABASES, information_schema queries)
- mysql CLI client
- Shell scripting with mysql

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW DATABASES Statement — https://dev.mysql.com/doc/refman/8.0/en/show-databases.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA SCHEMATA Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-schemata-table.html
- MySQL 8.0 Reference Manual: SHOW DATABASES Filtering — https://dev.mysql.com/doc/refman/8.0/en/extended-show.html
- MySQL 8.0 Reference Manual: mysql Client Options — https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html

## Issues Found
No technical issues found.

## Review Notes
- `FLUSH PRIVILEGES` after `GRANT` is unnecessary in modern MySQL (the server automatically reloads grant tables after GRANT/REVOKE), but including it is not incorrect — it is a common practice and does no harm.
- The `information_schema` database showing charset `utf8` (rather than `utf8mb3`) in the sample output is accurate — this is what MySQL 8.0 actually displays, even though `utf8` is an alias for `utf8mb3` and the alias was deprecated in MySQL 8.0.28.
- All SQL queries are syntactically correct and use current, non-deprecated patterns.
- The CLI examples correctly demonstrate both interactive (`-p` prompting) and scripted (`-p"password"` with no space) password usage.
