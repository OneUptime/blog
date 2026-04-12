# Validation Summary: How to Use SHOW TABLES in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (SHOW TABLES, SHOW FULL TABLES)
- information_schema.tables
- MySQL CLI client (bash scripting)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW TABLES Statement — https://dev.mysql.com/doc/refman/8.0/en/show-tables.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: mysql Client Options — https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html
- MySQL 8.0 Reference Manual: DATE_SUB Function — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html

## Issues Found
No technical issues found.

## Review Notes
- The comparison table describes SHOW TABLES programmatic filtering as "Limited (LIKE only)", but SHOW TABLES (and SHOW FULL TABLES) also supports a WHERE clause, which the post itself demonstrates earlier. This is a reasonable simplification for the comparison context but could be more precise (e.g., "Limited (LIKE and basic WHERE)").
- The `update_time` column used in the "Finding Tables Modified Recently" query may be NULL for InnoDB tables in some configurations. This is not incorrect but users should be aware that results may vary by storage engine.
- The `-p"$DB_PASS"` syntax in the bash script works but will trigger a MySQL CLI warning about passing passwords on the command line. This is acceptable for a scripting example.
