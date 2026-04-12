# Validation Summary: How to Identify Missing Indexes in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (EXPLAIN, slow query log, performance_schema, sys schema, online DDL)
- Percona Toolkit (pt-query-digest)
- mysqldumpslow

## Sources Consulted
- MySQL 8.4 Statement Summary Tables: https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html
- MySQL 8.4 sys.statements_with_full_table_scans: https://dev.mysql.com/doc/refman/8.4/en/sys-statements-with-full-table-scans.html
- MySQL 8.0 ALTER TABLE / Online DDL Operations: https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 mysqldumpslow: https://dev.mysql.com/doc/refman/8.0/en/mysqldumpslow.html
- Percona Toolkit pt-query-digest: https://docs.percona.com/percona-toolkit/pt-query-digest.html
- MySQL 8.4 Performance Schema Event Timing: https://dev.mysql.com/doc/refman/8.4/en/performance-schema-timing.html

## Issues Found
1. **Incorrect column name in sys schema query**: The query referenced `avg_latency` from `sys.statements_with_full_table_scans`, but this view does not have an `avg_latency` column. It has `total_latency`. Changed `avg_latency` to `total_latency`.
2. **Misleading description of performance_schema results**: The explanation stated "High `avg_rows_examined` with low `COUNT_STAR` rows returned" which incorrectly implies `COUNT_STAR` represents rows returned. `COUNT_STAR` is the execution count (number of times the digest was executed), not the number of rows returned. Rewrote the sentence to remove the incorrect reference.

## Review Notes
- All SQL syntax (EXPLAIN, SET GLOBAL, ALTER TABLE with ALGORITHM/LOCK) is correct.
- The picosecond-to-seconds conversion (`/ 1e12`) for performance_schema timers is accurate.
- The `mysqldumpslow -s t` flag and `pt-query-digest --limit 20` syntax are both correct per official documentation.
- The covering index explanation and expected EXPLAIN output (`Using index`) are accurate.
- ALGORITHM=INPLACE, LOCK=NONE for adding secondary B-tree indexes is supported on InnoDB (MySQL 5.6+).
