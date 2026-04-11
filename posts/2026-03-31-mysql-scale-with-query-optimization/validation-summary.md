# Validation Summary: How to Scale MySQL with Query Optimization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (server configuration, EXPLAIN, indexes, Performance Schema)
- Percona Toolkit (pt-query-digest)
- SQL (query optimization patterns)

## Sources Consulted
- MySQL 8.0 Reference Manual: Slow Query Log — https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: EXPLAIN Join Types — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html#explain-join-types
- MySQL 8.0 Reference Manual: CREATE INDEX / covering indexes — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: Performance Schema Statement Summary Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- MySQL 8.0 Reference Manual: Performance Schema Timer Representation — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html
- Percona Toolkit: pt-query-digest documentation — https://docs.percona.com/percona-toolkit/pt-query-digest.html

## Issues Found
- **EXPLAIN `type: ref` mislabeled as "index range scan"**: The post grouped `ref` and `range` together under the label "index range scan (good)." In MySQL's EXPLAIN output, `ref` is an index equality lookup (all rows matching a single value are read), while `range` is an index range scan (rows within a given range are retrieved). Since the post is specifically teaching readers how to interpret EXPLAIN output, this distinction matters. Fixed by splitting into two separate bullet points with accurate descriptions: `ref` as "index lookup by value" and `range` as "index range scan."

## Review Notes
- The covering index `idx_created_user (created_at, user_id, id, amount)` explicitly includes `id`, which is redundant in InnoDB since secondary indexes implicitly append the primary key. This is harmless and not incorrect — just slightly redundant.
- The Performance Schema timer conversion (`AVG_TIMER_WAIT / 1e9 AS avg_ms`) is correct: Performance Schema timers are in picoseconds, and dividing by 1e9 yields milliseconds.
- The slow query log configuration, pt-query-digest usage, correlated subquery rewrite, and all SQL syntax are correct.
- The claim that modern MySQL can sometimes optimize correlated subqueries automatically is true (MySQL 8.0+ has subquery materialization and semi-join optimizations), but the advice to write explicit JOINs remains sound practice.
