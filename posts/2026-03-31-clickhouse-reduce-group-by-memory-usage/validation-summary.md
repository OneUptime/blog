# Validation Summary: How to Reduce Memory Usage of GROUP BY in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect, settings, system tables, table engines)
- SummingMergeTree table engine
- ClickHouse system tables (system.processes, system.query_log)
- ClickHouse hash functions (URLHash)
- LowCardinality encoding

## Sources Consulted
- ClickHouse documentation: Restrictions on query complexity (group_by_overflow_mode, max_rows_to_group_by) — https://clickhouse.com/docs/operations/settings/query-complexity
- ClickHouse documentation: GROUP BY clause (max_bytes_before_external_group_by) — https://clickhouse.com/docs/sql-reference/statements/select/group-by
- ClickHouse documentation: SummingMergeTree — https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse documentation: Hash Functions (URLHash) — https://clickhouse.com/docs/sql-reference/functions/hash-functions
- ClickHouse documentation: Type Conversion Functions (toLowCardinality) — https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions
- ClickHouse documentation: system.processes — https://clickhouse.com/docs/operations/system-tables/processes
- ClickHouse documentation: system.query_log — https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse documentation: system.events (ProfileEvents) — https://clickhouse.com/docs/operations/system-tables/events
- ClickHouse GitHub issues and PRs for enable_memory_bound_merging_of_aggregation_results — https://github.com/ClickHouse/ClickHouse/pull/50319

## Issues Found

### 1. Incorrect "Spill to disk (ClickHouse 23.2+)" comment on `group_by_overflow_mode = 'any'`
- **What was wrong:** The post had a comment saying `group_by_overflow_mode = 'any'` enables spilling to disk and was introduced in ClickHouse 23.2+. Both claims are incorrect. `group_by_overflow_mode = 'any'` drops extra groups beyond a row limit (it does not spill to disk), and it has existed since well before ClickHouse 23.2 (at least since 2018). Spilling to disk is controlled by the separate `max_bytes_before_external_group_by` setting.
- **What was changed:** Replaced the incorrect comment with a correct example showing `max_rows_to_group_by` paired with `group_by_overflow_mode = 'any'` to properly demonstrate the overflow mode feature.

### 2. External aggregation section incorrectly paired with `group_by_overflow_mode = 'any'`
- **What was wrong:** The "Enable external aggregation to spill to disk" code block included `SET group_by_overflow_mode = 'any'` alongside `max_bytes_before_external_group_by`, implying both are required for disk spilling. These are independent mechanisms. External aggregation only requires `max_bytes_before_external_group_by` to be set to a non-zero value.
- **What was changed:** Removed the `group_by_overflow_mode = 'any'` line from the external aggregation example, keeping only `max_bytes_before_external_group_by`.

### 3. Incorrect use of `toLowCardinality()` inline in GROUP BY
- **What was wrong:** The post suggested `GROUP BY toLowCardinality(country)` as a memory optimization. While the function exists and the query would execute, wrapping a column in `toLowCardinality()` at query time does not provide the dictionary-encoding optimization that reduces memory. The benefit comes from defining the column as `LowCardinality(String)` in the table schema.
- **What was changed:** Replaced the inline `toLowCardinality()` call with a comment showing the correct approach: using `ALTER TABLE ... MODIFY COLUMN` to define the column as `LowCardinality(String)` in the schema, then grouping by the column normally.

## Review Notes
- The `SummingMergeTree(hit_count)` syntax is technically valid but the more explicit documented form is `SummingMergeTree((hit_count))` with a tuple. Both work in practice.
- The comment "Query without GROUP BY scan" above the SummingMergeTree query is slightly misleading since the query still uses `GROUP BY` — what it avoids is a full scan of the raw events table. This is a minor wording issue, not a technical error.
- The `enable_memory_bound_merging_of_aggregation_results` setting requires ClickHouse >= 22.12 on all cluster nodes; this version requirement is not mentioned in the post.
- All system table columns (`system.processes` and `system.query_log`) and ProfileEvents keys referenced in the monitoring queries were verified to be correct.
