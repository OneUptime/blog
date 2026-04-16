# Validation Summary: How to Use hypothesis Skip Index in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree family, data skipping indices)
- SQL (ClickHouse dialect)
- ClickHouse `hypothesis` skip index
- ClickHouse `set` skip index (for comparison)
- ClickHouse `system.data_skipping_indices` system table
- Materialized columns

## Sources Consulted
- [ClickHouse MergeTree engine docs](https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)
- [ClickHouse skipping indexes guide](https://clickhouse.com/docs/optimize/skipping-indexes)
- ClickHouse GitHub PR #48381 (Hypothesis index in the analyzer)
- ClickHouse GitHub issue #79123 (Materialize hypothesis index)
- [ClickHouse inverted indices blog](https://clickhouse.com/blog/clickhouse-search-with-inverted-indices)

## Issues Found
- **Conflation of `hypothesis` and `inverted` index types in the intro.** The original text said the hypothesis index is "also referred to... as the `hypothesis` or inverted index type depending on the version." This is inaccurate — the hypothesis index and the inverted/full-text text index are distinct features in ClickHouse that serve different purposes (hypothesis: condition pruning via logical inference; inverted/text: tokenized full-text search). Rewrote the intro sentence and the following note to remove the conflation and clarify the distinction.

## Review Notes
- The `hypothesis` skip index is experimental in ClickHouse and may require enabling experimental index settings on some versions (e.g., `allow_experimental_hypothesis_index`). The post does not mention this; users running the examples on recent versions may need to enable the flag. This was not added to the post per the guidance to limit changes to technical corrections.
- The three-state description (`0`, `1`, `unknown`) is a reasonable simplification. Internally, the hypothesis index uses logical inference (CNF conversion) to decide whether granules can be skipped based on implication between the hypothesis expression and the query predicate. The practical outcome for the simple boolean-column examples in the post is consistent with the simplified description.
- All SQL syntax examples (CREATE TABLE, INDEX DDL, `ALTER TABLE ... MATERIALIZE INDEX`, `EXPLAIN indexes = 1`, materialized column syntax, `system.data_skipping_indices` query with `data_compressed_bytes` / `formatReadableSize` / `currentDatabase()`) are syntactically valid for current ClickHouse.
- The `set(2)` vs `hypothesis` comparison is accurate: `set(N)` stores up to N distinct values per block, and for a binary flag both approaches will prune effectively.
- The random data INSERT uses `rand() % 10 = 0` (UInt8 result), `rand() / 4294967295.0 * 100` (Float64), and `now() - rand() % 2592000` (DateTime minus seconds), all of which are valid ClickHouse expressions.
