# Validation Summary: How to Find the Most Recent Row Per Group in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, ReplacingMergeTree engines)
- ClickHouse `argMax` aggregate function
- ClickHouse window functions (`row_number()`)
- ClickHouse `FINAL` modifier

## Sources Consulted
- [argMax | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/argmax)
- [Tuple functions | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/functions/tuple-functions)
- [ClickHouse SQL Syntax (Aliases) | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/syntax)
- [ReplacingMergeTree | ClickHouse Docs](https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree)
- [Working with ReplacingMergeTree | ClickHouse Docs](https://clickhouse.com/docs/guides/replacing-merge-tree)
- [row_number | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/window-functions/row_number)
- [JOIN Clause | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/select/join)
- [FINAL clause speed | Altinity Knowledge Base](https://kb.altinity.com/altinity-kb-queries-and-syntax/altinity-kb-final-clause-speed/)
- [argMax and Nullables - GitHub Issue #35472](https://github.com/ClickHouse/ClickHouse/issues/35472)

## Issues Found

1. **Method 3 self-join: alias collision between column and table alias.** The identifier `latest` was used as both a column alias (`max(updated_at) AS latest`) and the subquery table alias (`...) latest ON ...`). ClickHouse can produce ambiguous identifier errors when the same name is used for both (documented in GitHub issues #7781 and #14978). Additionally, `d.*` is documented as only working when joining tables, not subqueries. Fixed by: renaming the column alias to `max_updated_at`, the table alias to `latest_ts`, and replacing `d.*` with explicit column names.

2. **Performance table: FINAL timing was exaggerated.** The post claimed FINAL on 100M rows takes 0.1s and described it as "fastest reads." Official ClickHouse benchmarks on ~123M rows show FINAL taking ~1-2.3s depending on partitioning. FINAL adds query-time deduplication overhead and is not faster than argMax. Fixed by: changing 0.1s to 1.0s and updating the note to "Query-time dedup, fast after merge optimizations" instead of "Pre-merged, fastest reads."

## Review Notes
- The argMax tuple pattern `(argMax((col1, col2), comparator) AS t).1` is valid but uses `updated_at` as both a source column name and an output alias, which could confuse readers. This is not technically incorrect but could be noted as a style issue.
- The post does not mention that `argMax` skips rows where `arg` is NULL, which can produce incorrect results with nullable columns. Using the tuple form `argMax((col1, col2), comparator)` avoids this because a tuple containing NULL is not itself NULL. This is a useful subtlety that could be mentioned in a future update.
- FINAL performance has improved significantly across ClickHouse versions (parallel execution in v20.5+, smart range optimization in v23.12+, vertical deduplication in v24.1+), so the actual performance will vary by version and data characteristics.
