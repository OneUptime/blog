# Validation Summary: How to Use ANALYZE TABLE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- ANALYZE TABLE statement
- MySQL query optimizer and index statistics
- information_schema.STATISTICS
- InnoDB persistent and transient statistics
- mysqlcheck CLI utility

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Persistent Statistics: https://dev.mysql.com/doc/refman/8.0/en/innodb-persistent-stats.html
- MySQL 8.0 Reference Manual — InnoDB Non-Persistent Statistics: https://dev.mysql.com/doc/refman/8.0/en/innodb-statistics-estimation.html
- MySQL 8.0 Reference Manual — InnoDB Parameters: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0.0 Release Notes (removal of innodb_stats_sample_pages): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-0.html
- MySQL 8.0 Reference Manual — ANALYZE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html
- MySQL 8.0 Reference Manual — mysqlcheck: https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html

## Issues Found

1. **Deprecated variable `innodb_stats_sample_pages`**: The post used `innodb_stats_sample_pages` in both the configuration snippet and the `SET GLOBAL` example. This variable was deprecated in MySQL 5.6.3 and removed in MySQL 8.0.0. Replaced all references with `innodb_stats_persistent_sample_pages`, which is the correct variable for the default persistent statistics mode discussed in the post.

2. **Misleading automatic statistics trigger**: The post stated InnoDB recalculates statistics "when the table is first opened after a restart" without qualification. This behavior only applies to transient (non-persistent) statistics. With `innodb_stats_persistent = ON` (the default since MySQL 5.6.6), statistics are stored on disk and loaded from disk on restart — no recalculation occurs. Added clarification that this trigger applies to transient statistics only.

## Review Notes
- The EXPLAIN before/after examples are illustrative and correctly demonstrate how stale statistics can cause the optimizer to choose a full table scan (type=ALL) instead of an index lookup (type=ref). These are representative examples, not exact reproducible output.
- The `information_schema.STATISTICS` query and column names are correct.
- The `mysqlcheck` commands use correct flags and syntax.
- The post correctly identifies the default values for `innodb_stats_auto_recalc` (ON) and `innodb_stats_persistent` (ON).
