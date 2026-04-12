# Validation Summary: How to Check Index Cardinality in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- MySQL information_schema views (STATISTICS, TABLES)
- MySQL index cardinality and statistics system
- ANALYZE TABLE statement
- InnoDB persistent statistics configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/show-index.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual: ANALYZE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html
- MySQL 8.0 Reference Manual: Configuring Persistent Optimizer Statistics Parameters — https://dev.mysql.com/doc/refman/8.0/en/innodb-persistent-stats.html
- MySQL 8.0 Reference Manual: innodb_stats_persistent_sample_pages — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_stats_persistent_sample_pages

## Issues Found
No technical issues found.

## Review Notes
- The `SHOW INDEX` output example truncates the column name `Non_unique` to `Non_uniq` and omits several columns (Sub_part, Packed, Null, Index_type, Comment, Index_comment, Visible, Expression) for brevity. This is acceptable for illustration.
- The claim that `ANALYZE TABLE` "does not block reads or writes" is a simplification. It does briefly acquire a flush lock, which can interact with long-running transactions. For practical purposes this is accurate since the lock is extremely brief for InnoDB.
- The comment "Global default (MySQL 8.0+)" for `innodb_stats_persistent_sample_pages` is slightly narrow — this variable has been available since MySQL 5.6.3 when persistent statistics were introduced. It is not wrong (it does work on 8.0+), but readers on 5.6/5.7 could also use it.
- The 5-10% selectivity threshold mentioned as a rule of thumb is a reasonable general guideline, though the actual optimizer decision depends on many additional factors (buffer pool size, table size, query structure, etc.).
