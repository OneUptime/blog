# Validation Summary: How to Optimize Subquery Performance in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect, query execution engine)
- ClickHouse distributed query processing (GLOBAL IN)
- ClickHouse Materialized Views with Set engine
- ClickHouse EXPLAIN query plans

## Sources Consulted
- ClickHouse official documentation: WITH clause / CTEs — https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse official documentation: IN operators and GLOBAL IN — https://clickhouse.com/docs/en/sql-reference/operators/in
- ClickHouse official documentation: Set table engine — https://clickhouse.com/docs/en/engines/table-engines/special/set
- ClickHouse official documentation: EXPLAIN statement — https://clickhouse.com/docs/en/sql-reference/statements/explain

## Issues Found
1. **CTE "evaluated once" claim was incorrect.** The original post stated that CTEs (WITH clause) are "evaluated once" and framed them as a performance optimization over derived tables. This is wrong for ClickHouse — CTEs are inlined by default, meaning each reference re-executes the subquery (unlike PostgreSQL where CTEs were historically materialized). The section title was changed from "Pre-Computing Subquery Results" to "Organizing Complex Queries with CTEs", the introductory text was corrected to note that ClickHouse inlines CTEs, and the SQL comments were updated to accurately describe the behavior as improving readability rather than guaranteeing single evaluation.

## Review Notes
- The `GLOBAL IN` section is accurate but could mention that large result sets from GLOBAL IN can saturate network bandwidth, and that adding `DISTINCT` to the inner query is recommended to minimize data transfer. This is a minor optimization tip, not an error.
- The Materialized View with `ENGINE = Set()` example is correct, but readers should be aware that materialized views in ClickHouse only process new inserts to the source table — existing rows in `users` at the time of view creation will not be included in the Set. A `INSERT INTO premium_user_ids SELECT ...` backfill would be needed for existing data.
- All SQL syntax is valid ClickHouse SQL. `count()` without arguments is the idiomatic ClickHouse form (equivalent to `count(*)`).
