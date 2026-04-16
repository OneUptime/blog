# Validation Summary: How to Handle Duplicate Events in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, table engines)
- ReplacingMergeTree
- CollapsingMergeTree
- OPTIMIZE ... DEDUPLICATE
- FINAL modifier
- `uniq` aggregate function

## Sources Consulted
- ClickHouse ReplacingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse CollapsingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/collapsingmergetree
- ClickHouse OPTIMIZE statement: https://clickhouse.com/docs/en/sql-reference/statements/optimize
- ClickHouse SELECT ... FINAL: https://clickhouse.com/docs/en/sql-reference/statements/select/from#final-modifier
- ClickHouse uniq aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse DISTINCT clause: https://clickhouse.com/docs/en/sql-reference/statements/select/distinct

## Issues Found
No technical issues found.

- `ReplacingMergeTree(ingested_at)` with `ORDER BY event_id` is correct; rows with the maximum version value are retained per sort key during merges.
- `CollapsingMergeTree(sign)` requires `sign` to be `Int8`, which matches the example. The cancel pattern (inserting a `sign=-1` row with matching column values followed by a `sign=1` row with new values) is the documented approach.
- `FINAL` performs merge at read time, which matches the stated behavior of "consistent reads immediately."
- `OPTIMIZE TABLE ... DEDUPLICATE BY <expr>` is a valid clause and collapses rows equal on the specified expression.
- `uniq(event_id)` is a valid approximate unique count aggregate.
- `today() - 1` returns the previous Date, which can be compared against a `DateTime` column.

## Review Notes
- `OPTIMIZE TABLE ... DEDUPLICATE` works on replicated tables as well (not strictly "non-replicated"), but the post's framing is a reasonable simplification given its cost on large tables. Not a technical error.
- `uniq` is an approximate count (HyperLogLog-based). For exact counts, `uniqExact` is available — worth noting in a future revision but not an error here.
- `SELECT ... FINAL` can be expensive on large tables; the post correctly presents it as a consistency trade-off.
- The CollapsingMergeTree example is correct but relies on insert ordering and merge timing; aggregations should typically use `sum(value * sign)` patterns, which are outside the post's scope.
