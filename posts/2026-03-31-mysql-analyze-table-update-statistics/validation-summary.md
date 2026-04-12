# Validation Summary: How to Use MySQL ANALYZE TABLE to Update Statistics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (ANALYZE TABLE, EXPLAIN, CREATE EVENT)
- information_schema.STATISTICS
- mysqlcheck CLI tool
- MySQL Event Scheduler

## Sources Consulted
- MySQL 8.0 Reference Manual: ANALYZE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html
- MySQL 8.0 Reference Manual: InnoDB Persistent Statistics — https://dev.mysql.com/doc/refman/8.0/en/innodb-persistent-stats.html
- MySQL 8.0 Reference Manual: innodb_stats_persistent_sample_pages — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_stats_persistent_sample_pages
- MySQL 8.0 Reference Manual: innodb_stats_sample_pages (removed) — https://dev.mysql.com/doc/refman/5.7/en/innodb-parameters.html#sysvar_innodb_stats_sample_pages
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual: mysqlcheck — https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html
- MySQL 8.0 Reference Manual: CREATE EVENT — https://dev.mysql.com/doc/refman/8.0/en/create-event.html

## Issues Found

1. **Deprecated variable `innodb_stats_sample_pages`**: The post used `innodb_stats_sample_pages` in the SHOW VARIABLES command and SET GLOBAL statement. This variable was deprecated in MySQL 5.6.3 and removed in MySQL 8.0. Replaced with `innodb_stats_persistent_sample_pages` (the correct variable for persistent statistics, which is the default mode). Also corrected the default value from 8 to 20, and changed the example SET value from 20 to 40 (since 20 is already the default, setting it to 20 would be a no-op). The same variable name was also corrected in the Best Practices section.

2. **Mismatched column header in sample output**: The query selects `TABLE_NAME` from `information_schema.STATISTICS`, but the sample output table showed `TABLE` as the column header. MySQL displays column headers matching the selected column names, so corrected it to `TABLE_NAME`.

## Review Notes
- The ANALYZE TABLE syntax, output format, and general explanations are all accurate.
- The ELT() function usage for random data generation is correct.
- The information_schema.STATISTICS query and column names are correct.
- The InnoDB auto-recalc threshold of ~10% of rows is accurate.
- The CREATE EVENT syntax is correct for a single-statement event body.
- The mysqlcheck commands and flags are correct.
- The per-table STATS_SAMPLE_PAGES via ALTER TABLE is correct syntax.
- The post covers both MySQL 5.7 and 8.0 concepts well overall, with the deprecated variable being the only version-specific gap.
