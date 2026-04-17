# Validation Summary: How to Use ClickHouse for Feature Stores

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree family)
- ReplacingMergeTree table engine
- ClickHouse aggregate combinators (argMax, argMaxIf, maxIf)
- LowCardinality data type
- INTO OUTFILE / Parquet export
- Machine learning feature store patterns (point-in-time correctness, online/offline serving)

## Sources Consulted
- ClickHouse ReplacingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse aggregate function reference (argMax, argMaxIf, maxIf): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse combinators (-If suffix): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse LowCardinality docs: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse INTO OUTFILE docs: https://clickhouse.com/docs/en/sql-reference/statements/select/into-outfile
- ClickHouse FINAL modifier docs: https://clickhouse.com/docs/en/sql-reference/statements/select/from#final-modifier

## Issues Found
- **Pivoting query used `maxIf` instead of `argMaxIf`**: the original query used `maxIf(feature_val, feature_name = ...)` to build a feature vector. `maxIf` returns the maximum numeric value of `feature_val` matching the condition, not the latest value by `computed_at`. For non-monotonic features like `avg_order_value`, this would surface the highest historical value rather than the current/latest one — incorrect semantics for a feature store. Replaced with `argMaxIf(feature_val, computed_at, feature_name = ...)`, which returns the `feature_val` corresponding to the maximum `computed_at` for the matching feature, consistent with the `argMax` pattern used elsewhere in the post.

## Review Notes
- The `ReplacingMergeTree(computed_at)` schema with `ORDER BY (entity_type, entity_id, feature_name)` is correct: the version column resolves duplicates on the sort key.
- `argMax(feature_val, computed_at)` without FINAL is the idiomatic pattern for latest-value reads in ClickHouse and is correctly described.
- The point-in-time query uses `LEFT JOIN` followed by `WHERE f.entity_type = 'user'` — this effectively degrades to an inner join (filtering out unmatched left-side rows). For training sets where labels should be retained even when no feature data exists, callers may want to push this predicate into the join condition or into `argMaxIf`. Left as-is since the semantics are acceptable for typical use cases where feature coverage is expected.
- `today() - 30` compared against a `DateTime` column relies on implicit Date-to-DateTime conversion (midnight), which ClickHouse handles; acceptable but explicit `now() - INTERVAL 30 DAY` would be clearer.
- `INTO OUTFILE` is a clickhouse-client (and clickhouse-local) feature; it does not work via the HTTP interface or most language drivers. Worth noting for users running the batch export in a server context.
