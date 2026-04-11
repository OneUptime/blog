# Validation Summary: How to List All Tables in a MySQL Database

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (SHOW TABLES, SHOW FULL TABLES, LIKE/WHERE filtering)
- information_schema.tables (metadata queries)
- information_schema.table_constraints (primary key detection)
- information_schema.columns (column count queries)
- mysql CLI client (shell scripting with -e, --silent, --skip-column-names)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW TABLES Statement — https://dev.mysql.com/doc/refman/8.0/en/show-tables.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLE_CONSTRAINTS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-table-constraints-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL 8.0 Reference Manual: mysql Client Options — https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is correct and uses current, non-deprecated features.
- All information_schema column names (table_name, table_type, engine, table_rows, data_length, index_length, create_time, column_name, constraint_type, constraint_name) are valid.
- The note about `table_rows` being an estimate for InnoDB is accurate and important.
- The shell command examples correctly use `--silent` and `--skip-column-names` flags, and correctly distinguish between `-p` (prompt for password) and `-p"password"` (inline password).
- The `SHOW FULL TABLES WHERE \`Tables_in_myapp\` LIKE 'user%'` example assumes `myapp` is the current database; this is consistent with the earlier `USE myapp` context established in the post.
- The `DATABASE()` function tip in Best Practices is a good recommendation for portable scripts.
