# Validation Summary: How to Use EXPLAIN for UPDATE and DELETE Queries in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.6+, 5.7, 8.0)
- MySQL EXPLAIN statement for DML (UPDATE, DELETE)
- InnoDB locking behavior
- MySQL indexing (B-tree indexes)

## Sources Consulted
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: EXPLAIN Statement — https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual: Optimizing Queries with EXPLAIN — https://dev.mysql.com/doc/refman/8.0/en/using-explain.html
- MySQL 5.6 Release Notes (EXPLAIN for DML support added in 5.6.3) — https://dev.mysql.com/doc/relnotes/mysql/5.6/en/news-5-6-3.html
- MySQL 8.0 Reference Manual: InnoDB Locking — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html

## Issues Found
No technical issues found.

## Review Notes
- The `select_type` values `UPDATE` and `DELETE` shown in EXPLAIN output are correct for what MySQL actually outputs, though the official reference manual's `select_type` enumeration does not explicitly list these as possible values. This is a documentation gap in MySQL, not an error in the post.
- The locking explanation is slightly simplified — InnoDB holds locks until transaction commit, not just "for the duration of the scan" — but this simplification is appropriate for the post's scope and does not lead to incorrect conclusions.
- MySQL 8.0.13+ introduced functional indexes (`CREATE INDEX idx ON t ((YEAR(col)))`) which could address the `YEAR(last_active)` example without rewriting the query. The post's advice to use a range comparison is still the better and more portable approach, but this could be mentioned as an alternative in a future update.
- The post correctly distinguishes that `INSERT ... SELECT` is supported with EXPLAIN while plain `INSERT ... VALUES()` is not.
