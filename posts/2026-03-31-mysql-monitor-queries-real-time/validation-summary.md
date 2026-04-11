# Validation Summary: How to Monitor MySQL Queries in Real Time

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SHOW PROCESSLIST, Performance Schema, slow query log)
- Percona Toolkit (pt-query-digest)
- MySQL Enterprise Monitor Query Analyzer

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW PROCESSLIST — https://dev.mysql.com/doc/refman/8.0/en/show-processlist.html
- MySQL 8.0 Reference Manual: KILL Statement — https://dev.mysql.com/doc/refman/8.0/en/kill.html
- MySQL 8.0 Reference Manual: Performance Schema threads Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html
- MySQL 8.0 Reference Manual: events_statements_current Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-statements-current-table.html
- MySQL 8.0 Reference Manual: events_statements_summary_by_digest Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- MySQL 8.0 Reference Manual: Slow Query Log — https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- Percona Toolkit: pt-query-digest — https://docs.percona.com/percona-toolkit/pt-query-digest.html

## Issues Found
1. **Mismatched table name in intro text (Section: "Finding the Most Expensive Recent Queries")**: The introductory text referenced `events_statements_history_long` and described it as storing "the last 10,000 statements," but the actual SQL query uses `performance_schema.events_statements_summary_by_digest`, which is a completely different table. The summary-by-digest table aggregates statistics per normalized query pattern (digest), not individual recent statements. Fixed the intro text to correctly reference `events_statements_summary_by_digest` and describe its purpose as aggregating statistics for each normalized query pattern.

## Review Notes
- The Performance Schema timer values are stored in picoseconds. The post correctly divides by 1e9 to convert to milliseconds.
- The `SHOW FULL PROCESSLIST` truncation limit of 100 characters for the non-FULL variant is correct.
- The `KILL QUERY` syntax (as opposed to `KILL CONNECTION`) is correctly used for killing a running query without dropping the connection.
- The slow query log configuration using `SET GLOBAL` is correct and the advice to disable it after investigation is good practice.
- The post could mention that `performance_schema` must be enabled (it is by default in MySQL 5.6.6+), but this is a minor omission, not an error.
