# Validation Summary: How to Configure sort_buffer_size in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- MySQL Performance Schema
- MySQL sort_buffer_size system variable
- MySQL EXPLAIN FORMAT=JSON

## Sources Consulted
- MySQL 8.0 Reference Manual — sort_buffer_size system variable: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_sort_buffer_size
- MySQL 8.0 Reference Manual — Server Status Variables (Sort_merge_passes, Sort_range, Sort_rows, Sort_scan): https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format (using_filesort JSON property): https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — Performance Schema Statement Summary Tables (events_statements_summary_by_digest): https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html

## Issues Found
1. **Incorrect EXPLAIN JSON field name**: The post referenced `"filesort": false` as the JSON property to look for in EXPLAIN output. The correct MySQL EXPLAIN FORMAT=JSON property name is `"using_filesort"`. Fixed `"filesort": false` to `"using_filesort": false`.
2. **Inconsistent EXPLAIN command**: The post said to "Look for ... in EXPLAIN JSON output" but the code example used plain `EXPLAIN` (which produces tabular output, not JSON). Changed `EXPLAIN SELECT ...` to `EXPLAIN FORMAT=JSON SELECT ...` to match the JSON output reference in the text.

## Review Notes
- The default value of 262144 (256 KB) is correct for MySQL 8.0 and 8.4.
- All four Sort_ status variables (Sort_merge_passes, Sort_range, Sort_rows, Sort_scan) are correctly listed.
- The performance_schema.events_statements_summary_by_digest query uses valid column names (DIGEST_TEXT, SUM_SORT_MERGE_PASSES, SUM_SORT_ROWS, SUM_NO_GOOD_INDEX_USED).
- The per-session memory calculation (500 connections x 16 MB = 8 GB) is mathematically correct.
- The advice to prefer indexes over larger sort buffers is sound guidance.
