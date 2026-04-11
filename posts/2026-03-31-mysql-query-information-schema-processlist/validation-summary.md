# Validation Summary: How to Query INFORMATION_SCHEMA.PROCESSLIST in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (INFORMATION_SCHEMA.PROCESSLIST)
- MySQL Performance Schema (performance_schema.threads)

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA PROCESSLIST Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html
- MySQL 8.0 Reference Manual: SHOW PROCESSLIST Statement — https://dev.mysql.com/doc/refman/8.0/en/show-processlist.html
- MySQL 8.0 Reference Manual: The threads Table (Performance Schema) — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html
- MySQL 8.0 Reference Manual: KILL Statement — https://dev.mysql.com/doc/refman/8.0/en/kill.html

## Issues Found
- **INFO column truncation claim was incorrect.** The post stated the INFO column is "truncated to 65,535 chars." The INFO column in INFORMATION_SCHEMA.PROCESSLIST is of type LONGTEXT (up to ~4GB), not TEXT (65,535 bytes). The 65,535-byte limit applies to the TEXT data type, not LONGTEXT. The column was also described more accurately to note it is NULL when the thread is idle. Fixed the description to "Full SQL text (LONGTEXT; `NULL` if idle)."

## Review Notes
- INFORMATION_SCHEMA.PROCESSLIST is deprecated as of MySQL 8.0.22 and subject to removal in a future version. The post already recommends `performance_schema.threads` for production use, which is good. A future update could add an explicit deprecation notice.
- MySQL also provides `performance_schema.processlist` (available since MySQL 8.0.22 with `performance_schema_show_processlist` enabled) as a more direct drop-in replacement. The post mentions `performance_schema.threads` which is also valid but serves a slightly broader purpose.
- All SQL queries are syntactically correct and use valid column names.
- The Performance Schema query correctly filters on `TYPE = 'FOREGROUND'` to show only client connections.
- The advice about mutex-free implementation of performance_schema.threads is accurate.
