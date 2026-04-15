# Validation Summary: How to Monitor Lightweight Delete Progress in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (lightweight DELETE, MergeTree engine)
- ClickHouse system tables (`system.parts`, `system.merges`)
- SQL

## Sources Consulted
- ClickHouse DELETE statement docs: https://clickhouse.com/docs/en/sql-reference/statements/delete
- ClickHouse system.parts table docs: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse system.merges table docs: https://clickhouse.com/docs/en/operations/system-tables/merges
- ClickHouse OPTIMIZE statement docs: https://clickhouse.com/docs/en/sql-reference/statements/optimize

## Issues Found
No technical issues found.

## Review Notes
- The `DELETE FROM` syntax is correct for ClickHouse lightweight deletes (not to be confused with the older `ALTER TABLE ... DELETE` heavyweight mutation).
- The `has_lightweight_delete` column in `system.parts` is confirmed as `UInt8`, making `countIf(has_lightweight_delete)` and `has_lightweight_delete = 1` both valid usage patterns.
- All six columns used in the `system.merges` query (`database`, `table`, `elapsed`, `progress`, `num_parts`, `result_part_name`) are verified to exist.
- The explanation of how lightweight deletes work internally (mask via hidden `_row_exists` column, physical removal during subsequent merges) matches official documentation precisely.
- The caveat about ClickHouse not exposing exact bytes behind delete masks is accurate — `bytes_on_disk` reports total part size including both masked and unmasked rows, so the blog's approach of summing `bytes_on_disk` for parts with `has_lightweight_delete = 1` is a reasonable approximation.
- `OPTIMIZE TABLE events FINAL` is valid syntax for forcing merges to reclaim space.
