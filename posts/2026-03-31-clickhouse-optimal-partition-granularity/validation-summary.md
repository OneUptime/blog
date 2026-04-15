# Validation Summary: How to Choose Optimal Partition Granularity in ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse SQL dialect (partitioning functions, system tables, EXPLAIN)
- ClickHouse schema design (PARTITION BY, ORDER BY)

## Sources Consulted
- ClickHouse official documentation on partitioning: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse official documentation on system.parts table: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse official documentation on MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse official documentation on EXPLAIN statement: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse official documentation on RENAME TABLE: https://clickhouse.com/docs/en/sql-reference/statements/rename
- ClickHouse official documentation on date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
No technical issues found.

## Review Notes
- All partition functions (`toYYYYMM`, `toDate`, `toYear`, `toMonday`, `toStartOfHour`) are valid ClickHouse functions and correctly used in PARTITION BY expressions.
- The `system.parts` queries use correct column names (`partition`, `rows`, `bytes_on_disk`, `active`) and valid functions (`formatReadableSize`, `count()`).
- The `CREATE TABLE ... AS ... ENGINE = ...` syntax for table migration is valid and correctly copies column definitions while applying a new engine configuration.
- The atomic `RENAME TABLE` swap pattern is a well-known ClickHouse technique and the syntax is correct.
- The claim that partitioning cannot be altered on an existing table is accurate.
- The `EXPLAIN ESTIMATE` reference in the summary is a valid ClickHouse feature for verifying partition pruning behavior.
- The volume-to-granularity recommendations in the table are reasonable and align with ClickHouse community best practices.
