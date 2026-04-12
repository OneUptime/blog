# Validation Summary: How to Avoid Using Temporary Tables in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (query optimizer, EXPLAIN output, internal temporary tables)
- SQL indexing (single-column and composite indexes)
- MySQL system variables (tmp_table_size, max_heap_table_size)
- MySQL status variables (Created_tmp_disk_tables, Created_tmp_tables)

## Sources Consulted
- MySQL 8.0 Reference Manual: Internal Temporary Table Use in MySQL — https://dev.mysql.com/doc/refman/8.0/en/internal-temporary-tables.html
- MySQL 8.0 Reference Manual: GROUP BY Optimization — https://dev.mysql.com/doc/refman/8.0/en/group-by-optimization.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: Server System Variables (tmp_table_size, max_heap_table_size) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: Server Status Variables (Created_tmp_disk_tables, Created_tmp_tables) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: UNION Clause — https://dev.mysql.com/doc/refman/8.0/en/union.html

## Issues Found

1. **ORDER BY Different From GROUP BY section — incorrect claim that temp table is unavoidable**: The post stated that when ORDER BY is on an aggregate column (different from the GROUP BY column), the temporary table is "unavoidable" and that adding an index only reduces the temp table size. This is incorrect. With an index on the GROUP BY column, MySQL performs streaming aggregation (reading the index in order and computing aggregates per group), which eliminates the temporary table entirely. Only a filesort remains for sorting the aggregated results by the computed column. Fixed the section to accurately describe that the index eliminates `Using temporary`, leaving only `Using filesort` for the aggregate-based sort. Also added the EXPLAIN query after the index creation to show the improved output.

2. **"write-heavy analytical queries" wording**: The comment `-- Increase for write-heavy analytical queries` was misleading. Temporary tables are created during SELECT (read) operations like GROUP BY, DISTINCT, and UNION — not during INSERT/UPDATE workloads. The term "write-heavy" could confuse readers into thinking this tuning applies to write workloads. Changed to "analytical queries".

## Review Notes
- The post does not specify a MySQL version. All corrections and validations are based on MySQL 8.0 behavior. In MySQL 5.7, GROUP BY implicitly adds ORDER BY on the grouped columns, which may produce slightly different EXPLAIN output in some cases.
- The EXPLAIN output shown in comments throughout the post is simplified for clarity (real EXPLAIN output includes multiple columns across rows). This is acceptable for a tutorial format.
- The DISTINCT section mentions "multiple columns without an index" in the causes list, but the example shows a single-column DISTINCT. Both cases can cause temporary tables; the list entry is not wrong but could be more precise.
- The < 5% ratio recommendation for Created_tmp_disk_tables / Created_tmp_tables is a widely cited guideline but not official MySQL documentation. It is reasonable as a rule of thumb.
- The post correctly notes that both `tmp_table_size` and `max_heap_table_size` must be set, as MySQL uses the minimum of the two to determine the maximum in-memory temporary table size.
