# Validation Summary: How to Add and Remove Table Indexes in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, data skipping indexes)
- SQL DDL (`ALTER TABLE ... ADD INDEX`, `MATERIALIZE INDEX`, `DROP INDEX`)
- Skipping index types: `minmax`, `set`, `bloom_filter`, `tokenbf_v1`, `ngrambf_v1`
- `EXPLAIN indexes = 1` and `system.mutations`
- `ON CLUSTER` distributed DDL

## Sources Consulted
- ClickHouse MergeTree skipping index documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ALTER TABLE skipping index docs: https://clickhouse.com/docs/en/sql-reference/statements/alter/skipping-index
- EXPLAIN statement docs: https://clickhouse.com/docs/en/sql-reference/statements/explain
- `system.mutations` system table docs: https://clickhouse.com/docs/en/operations/system-tables/mutations

## Issues Found
- **EXPLAIN output format**: The post originally told readers to look for the literal string `Condition: (response_ms > 1000), Filtered granules: X / Y` in `EXPLAIN indexes = 1` output. The actual output is a structured tree with a `Skip` block containing `Name`, `Description`, `Parts`, and `Granules` fields (granules shown as a fraction like `1/8`). Updated the instruction to describe the real output structure.

## Review Notes
- `bloom_filter(0.01)`, `tokenbf_v1(32768, 3, 0)`, and `set(10)` / `set(0)` semantics are correct per the current docs.
- The `minmax` index takes no parameters, and `GRANULARITY` usage matches the official syntax.
- `tokenbf_v1` does support `LIKE '%word%'` when `word` contains no delimiter characters, so the claim that it accelerates `LIKE '%timeout%'` is accurate — though for general substring matching `ngrambf_v1` is typically a better fit, which the table already notes.
- All referenced `system.mutations` columns (`mutation_id`, `command`, `is_done`, `parts_to_do`, `table`, `create_time`) exist.
- `ON CLUSTER '{cluster}'` syntax with the standard `{cluster}` macro is correct.
