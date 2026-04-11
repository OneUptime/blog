# Validation Summary: How MySQL Statistics and Histograms Work

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- MySQL Query Optimizer
- MySQL column histograms
- information_schema views

## Sources Consulted
- MySQL 8.0 ANALYZE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html
- MySQL 8.0 COLUMN_STATISTICS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-column-statistics-table.html
- MySQL 8.0 Optimizer Statistics: https://dev.mysql.com/doc/refman/8.0/en/optimizer-statistics.html
- MySQL 8.0 STATISTICS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Configuring Persistent Optimizer Statistics: https://dev.mysql.com/doc/refman/8.0/en/innodb-persistent-stats.html
- MySQL 8.0 Non-Persistent Optimizer Statistics: https://dev.mysql.com/doc/refman/8.0/en/innodb-statistics-estimation.html
- MySQL 8.0.2 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-2.html

## Issues Found
- **Misleading `innodb_stats_on_metadata` suggestion**: The "Triggering Manual Statistics Refresh" section presented `SET GLOBAL innodb_stats_on_metadata = ON;` as a general alternative for refreshing statistics. However, this variable only has effect when `innodb_stats_persistent = OFF` (non-persistent statistics mode). Since the blog earlier configures `innodb_stats_persistent = ON`, this suggestion would have no practical effect in that context. Fixed by adding a comment clarifying that `innodb_stats_on_metadata` only applies when using non-persistent statistics.

## Review Notes
- All SQL syntax (`ANALYZE TABLE`, `UPDATE HISTOGRAM`, `DROP HISTOGRAM`, JSON extraction operators) is correct for MySQL 8.0+.
- The histogram type descriptions (singleton vs equi-height) are accurate.
- All `information_schema` table and column names are correct.
- All InnoDB variables (`innodb_stats_persistent`, `innodb_stats_persistent_sample_pages`, `innodb_stats_auto_recalc`, `innodb_stats_on_metadata`) exist with the default values stated.
- The `mysql.innodb_table_stats` and `mysql.innodb_index_stats` tables are real and correctly described.
- Histograms were indeed introduced in MySQL 8.0 (specifically 8.0.2).
- The post is well-structured and technically solid overall, with only a minor clarification needed.
