# Validation Summary: How to Use mysqldumpslow for Slow Query Analysis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL slow query log
- mysqldumpslow command-line utility
- mysqladmin (for log rotation)
- MySQL server configuration (my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual — mysqldumpslow: https://dev.mysql.com/doc/refman/8.0/en/mysqldumpslow.html
- MySQL 8.0 Reference Manual — Server Log Maintenance: https://dev.mysql.com/doc/refman/8.0/en/log-file-maintenance.html
- MySQL 8.0 Reference Manual — Slow Query Log: https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html

## Issues Found
1. **Incorrect default sort order**: The post claimed `-s t` (total query time) is the default sort. The actual default is `-s at` (average query time). Fixed by moving the "(default)" annotation to the `-s at` line.

2. **"Rows examined" vs. "rows sent"**: The post referred to the `Rows` field in mysqldumpslow output as "rows examined" in multiple places (Basic Usage bullet, sorting comment, Interpreting Results, Summary). mysqldumpslow actually reports and sorts by "rows sent" (rows returned to the client), not rows examined. Fixed all occurrences.

3. **Log rotation command order**: The post had `mysqladmin flush-logs` before `mv`, which is incorrect. The correct procedure is to rename the log file first, then run `flush-logs` so MySQL closes the old file descriptor and opens a fresh file at the configured path. Fixed by swapping the command order.

## Review Notes
- The `-g` flag uses a case-insensitive regular expression match against the abstracted query text (after N/S substitution). The post's examples are correct but readers should be aware the match is case-insensitive.
- The `EXPLAIN` example in the Interpreting Results section is good general advice, though it is not a mysqldumpslow feature itself.
- The post does not mention `pt-query-digest` from Percona Toolkit, which is a more full-featured alternative. This is fine for scope but could be a useful follow-up topic.
