# Validation Summary: How to Build a Machine Learning Feature Store with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, ReplacingMergeTree, TTL, window functions, conditional aggregates)
- Machine Learning feature store concepts (offline store, online store, point-in-time joins)
- MLOps (feature drift detection, feature coverage analysis, training dataset generation)

## Sources Consulted
- ClickHouse documentation: ReplacingMergeTree engine — https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse documentation: Arithmetic functions (division returns Float64) — https://clickhouse.com/docs/sql-reference/functions/arithmetic-functions
- ClickHouse documentation: groupUniqArray — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/groupuniqarray
- ClickHouse documentation: ALTER TABLE TTL — https://clickhouse.com/docs/sql-reference/statements/alter/ttl
- ClickHouse documentation: Window functions (row_number) — https://clickhouse.com/docs/sql-reference/window-functions/row_number
- ClickHouse documentation: Functions for Nullable values (isNull, IS NULL) — https://clickhouse.com/docs/sql-reference/functions/functions-for-nulls
- ClickHouse documentation: countIf aggregate function — https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators#-if

## Issues Found

### 1. `groupArray` should be `groupUniqArray` in Feature Coverage Analysis
- **What was wrong:** The feature coverage query used `groupArray(feature_name)` to collect features present for each entity. If an entity has multiple rows for the same feature name within the 7-day window (which is expected in a feature store with time-series values), `groupArray` includes duplicates. This makes `length(present_features)` overcount the number of distinct features, giving a misleading `feature_count`.
- **What was changed:** Replaced `groupArray(feature_name)` with `groupUniqArray(feature_name)` so the array contains only distinct feature names, making both `has()` checks and `length()` accurate.

### 2. TTL description text did not match the SQL
- **What was wrong:** The prose stated "Feature values older than 2 years are rarely needed for training but can be moved to cold storage" but the SQL rule moves to cold storage after 1 year and deletes after 3 years. Neither threshold matched the "2 years" mentioned.
- **What was changed:** Reworded the text to "Old feature values can be moved to cold storage after a year and deleted after three years" to accurately describe the TTL rules in the SQL.

## Review Notes
- All SQL syntax is valid and idiomatic for modern ClickHouse (23.x+). CREATE TABLE statements, INSERT, CTEs, window functions, conditional aggregates (`maxIf`, `countIf`), quantile functions, and TTL rules are all correct.
- The `countIf(value_float IS NULL) / count()` expression in the Feature Statistics query works correctly in ClickHouse because the `/` operator on integers returns Float64 (unlike many other SQL dialects that do integer truncation).
- The point-in-time join pattern using `row_number() OVER (PARTITION BY ... ORDER BY ... DESC)` with `WHERE rn = 1` is a well-known and correct approach for preventing data leakage in ML training datasets.
- The `ReplacingMergeTree(updated_at)` with `DateTime64(3)` as the version column is valid. The note about querying with `FINAL` for deduplicated results is accurate.
- The feature drift z-score calculation `abs(c.mean - b.mean) / nullIf(b.std, 0)` is a reasonable approximation. The `nullIf` correctly prevents division by zero when baseline standard deviation is 0.
- The TTL `TO DISK 'cold_storage'` syntax assumes that a storage policy with a disk named `cold_storage` has been configured in the ClickHouse server config. This is expected for a guide-level post and does not need further elaboration.
