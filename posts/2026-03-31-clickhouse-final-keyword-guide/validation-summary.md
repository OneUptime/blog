# Validation Summary: What Is FINAL Keyword and When to Use It in ClickHouse

## Status
validated

## Post Type
Technical guide / reference post about a ClickHouse SQL modifier.

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine family)
- ReplacingMergeTree, CollapsingMergeTree, SummingMergeTree
- ClickHouse FINAL modifier and related settings (`max_final_threads`, `final`, `apply_deleted_mask`)
- Lightweight deletes (`_row_exists`)
- `argMax` aggregation pattern

## Sources Consulted
- ClickHouse SELECT FROM / FINAL docs: https://clickhouse.com/docs/sql-reference/statements/select/from#final-modifier
- ClickHouse ReplacingMergeTree docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse settings reference: https://clickhouse.com/docs/operations/settings/settings (specifically `apply_deleted_mask`)
- ClickHouse `system.parts` table documentation (confirming `active`, `partition`, and `rows` columns)

## Issues Found
1. **Incorrect version for parallel FINAL.** The original text claimed FINAL was "single-threaded in older ClickHouse versions (pre-22.8)". `max_final_threads` and parallel FINAL execution have existed since well before 22.8 (added in the 20.x series). Rewrote the sentence to say FINAL was historically single-threaded and modern ClickHouse runs it in parallel via `max_final_threads`, without citing a specific cutoff version.
2. **Mislabelled "Materialized View" example.** The section titled "Materialized View for Latest State" actually used `CREATE TABLE ... AS SELECT`, which creates a one-time snapshot — not a materialized view and not a periodic refresh on its own. Renamed the section to "Snapshot Table for Latest State", clarified that an external refresh mechanism is required (e.g., a scheduled `INSERT INTO ... SELECT ... FINAL` or a refreshable materialized view on ClickHouse 23.12+), and added a note calling out the snapshot semantics.

## Review Notes
- All other SQL examples verified: `ReplacingMergeTree(updated_at)` syntax, `OPTIMIZE TABLE ... FINAL`, `SET final = 1`, `argMax(col, ver)` pattern, and the `system.parts` diagnostic query are all correct.
- Behavioural claims for each engine family (`ReplacingMergeTree` keeps highest version, `CollapsingMergeTree` cancels sign pairs, `SummingMergeTree` sums numeric columns) match the official engine docs.
- `apply_deleted_mask` default of `1` (enabled) is correct.
- The "5–20x slower" figure for FINAL on tables with many unmerged parts is an informal rule of thumb rather than a documented number, but it is a reasonable order-of-magnitude estimate for the general case and is presented as such in the post.
