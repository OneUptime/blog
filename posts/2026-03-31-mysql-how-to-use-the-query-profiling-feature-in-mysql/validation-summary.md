# Validation Summary: How to Use the Query Profiling Feature in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (8.0+)
- MySQL Slow Query Log
- MySQL Performance Schema
- MySQL sys Schema
- EXPLAIN ANALYZE
- mysqldumpslow CLI utility

## Sources Consulted
- MySQL 8.0 Reference Manual: The Slow Query Log — https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 Reference Manual: Performance Schema Statement Digests and Sampling — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-digests.html
- MySQL 8.0 Reference Manual: events_statements_summary_by_digest Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- MySQL 8.0 Reference Manual: sys Schema statement_analysis View — https://dev.mysql.com/doc/refman/8.0/en/sys-statement-analysis.html
- MySQL 8.0 Reference Manual: mysqldumpslow — https://dev.mysql.com/doc/refman/8.0/en/mysqldumpslow.html
- MySQL 8.0 Reference Manual: EXPLAIN ANALYZE — https://dev.mysql.com/doc/refman/8.0/en/explain.html

## Issues Found
1. **Incorrect comment on SET GLOBAL commands (line 27)**: The comment said "Enable for the current session" but the commands use `SET GLOBAL`, which affects the server globally (all new connections), not just the current session. Changed to "Enable dynamically (affects all new connections)".

2. **Incorrect mysqldumpslow sort description (line 62)**: The comment for `mysqldumpslow -s at` said "Top 10 by total time" but the `-s at` flag sorts by **average** query time, not total time (`-s t` already sorts by total query time). Changed to "Top 10 by average time".

## Review Notes
- The post correctly avoids recommending the deprecated `SHOW PROFILE` / `SHOW PROFILES` statements (deprecated since MySQL 5.6.7) and instead focuses on the modern Performance Schema-based approach.
- `EXPLAIN ANALYZE` was introduced in MySQL 8.0.18; the post does not mention this version requirement, which could be noted in a future update.
- Performance Schema timer values are correctly divided by 1e12 (picoseconds to seconds).
- All sys schema view names and Performance Schema table/column names are accurate.
