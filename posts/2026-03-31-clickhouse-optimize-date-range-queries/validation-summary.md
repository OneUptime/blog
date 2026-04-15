# Validation Summary: How to Optimize ClickHouse Date Range Scan Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse SQL dialect (partition pruning, EXPLAIN, skipping indexes)
- ClickHouse date/time functions (toYYYYMM, toStartOfHour, toStartOfDay, toStartOfMonth, toMonday, today, now)

## Sources Consulted
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse EXPLAIN statement documentation: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse data skipping indexes documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse date/time functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse partition pruning documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key

## Issues Found
1. **Misleading text in "Align ts with Primary Key" section**: The introductory text stated "Put `ts` as a leading primary key column for best range scan performance" but the accompanying example showed `ORDER BY (project_id, ts)` where `ts` is the second column, not the leading one. The example itself is correct best practice (compound key with a dimension prefix followed by timestamp), but the text was misleading. Changed to: "Include `ts` early in the ORDER BY key so range scans can leverage the primary index:" to accurately match the example.

## Review Notes
- The claim that wrapping `ts` in functions like `toDate(ts)` "prevents index use" is accurate for the primary key index but slightly simplified — ClickHouse can sometimes still perform partition pruning even with function-wrapped columns when it can infer the partition from the function result. The range condition approach is still best practice and the advice is sound.
- The "10-100x" improvement claim in the summary is a reasonable ballpark for the difference between full table scans and partition-pruned + index-optimized queries, though actual results depend heavily on data volume and partition count.
- All SQL syntax verified as correct for modern ClickHouse (22.x+).
