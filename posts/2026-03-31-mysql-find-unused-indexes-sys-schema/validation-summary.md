# Validation Summary: How to Find Unused Indexes with sys Schema in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.7.9+ / 8.0+)
- MySQL sys schema (`schema_unused_indexes` view)
- MySQL Performance Schema (`table_io_waits_summary_by_index_usage` table)
- MySQL `performance_schema.setup_instruments` and `setup_consumers` configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: sys.schema_unused_indexes view — https://dev.mysql.com/doc/refman/8.0/en/sys-schema-unused-indexes.html
- MySQL 8.0 Reference Manual: table_io_waits_summary_by_index_usage table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-io-waits-summary-by-index-usage-table.html
- MySQL sys schema source (GitHub mysql/mysql-sys) — view definition for `schema_unused_indexes`
- MySQL 8.0 Reference Manual: Performance Schema setup_instruments and setup_consumers tables

## Issues Found
1. **Incorrect description of what the view checks**: The post stated the view identifies "indexes with zero reads since the last server restart." The actual `sys.schema_unused_indexes` view filters on `COUNT_STAR = 0`, which means zero total operations (no reads AND no writes), not just zero reads. Changed to "indexes with zero usage (no read or write events) since the last server restart."

2. **Underlying data query used wrong column**: The "Viewing the Underlying Data" query used `COUNT_READ = 0` and selected `COUNT_READ, COUNT_WRITE`. The actual sys view filters on `COUNT_STAR = 0`. An index with `COUNT_READ = 0` but `COUNT_WRITE > 0` (being maintained via DML but never queried) would appear in the blog's original query but would NOT appear in the actual sys view results. Fixed to use `COUNT_STAR = 0` and select `COUNT_STAR`.

3. **Missing system schema filter in underlying query**: The actual `sys.schema_unused_indexes` view excludes `OBJECT_SCHEMA = 'mysql'`, but the blog's underlying data query did not include this filter. Added `AND OBJECT_SCHEMA != 'mysql'` to match the view's behavior.

## Review Notes
- The "Generating Drop Statements" query wisely filters out all four system schemas (`mysql`, `sys`, `performance_schema`, `information_schema`), which is broader than what the sys view itself filters (only `mysql`). This is good practice.
- The caveats section is well-written and covers the key risks. In MySQL 8.0.0+, the sys view definition may also join with `information_schema.STATISTICS` to filter by `NON_UNIQUE = 1`, excluding unique indexes from results. This could be worth noting in a future update.
- The instrumentation setup commands are correct. In MySQL 8.0, `wait/io/table/sql/handler` and `global_instrumentation` are enabled by default, so these commands are mainly needed if someone has explicitly disabled them.
- The EXPLAIN verification advice is sound but limited — a single EXPLAIN only validates one query pattern. The post correctly notes in the caveats that all workload types should be covered.
