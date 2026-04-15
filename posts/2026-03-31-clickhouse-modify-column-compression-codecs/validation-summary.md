# Validation Summary: How to Modify Column Compression Codecs in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (column-oriented OLAP database)
- SQL DDL (ALTER TABLE, CREATE TABLE)
- ClickHouse compression codecs (LZ4, LZ4HC, ZSTD, Delta, DoubleDelta, Gorilla, FPC, T64, NONE)
- ClickHouse system tables (system.columns, system.parts_columns, system.merges)

## Sources Consulted
- ClickHouse ALTER TABLE COLUMN documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse CREATE TABLE column compression codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column-compression-codecs
- ClickHouse system.columns documentation: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse system.parts_columns documentation: https://clickhouse.com/docs/en/operations/system-tables/parts_columns
- ClickHouse OPTIMIZE TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/optimize

## Issues Found

### 1. Incorrect use of MATERIALIZE COLUMN for codec recompression (MAJOR)
- **What was wrong:** The post recommended using `ALTER TABLE ... MATERIALIZE COLUMN` to apply a new codec to existing data parts. `MATERIALIZE COLUMN` is specifically for materializing DEFAULT or MATERIALIZED value expressions, not for recompressing data with a new codec. It would not rewrite existing column data to use the updated codec.
- **What was changed:** Replaced the entire "Applying Codecs to Existing Data with MATERIALIZE COLUMN" section with guidance to use `OPTIMIZE TABLE ... FINAL`, which forces a merge of all parts and rewrites them with the current codec settings. Also replaced the `system.mutations` tracking query with a `system.merges` query since `OPTIMIZE TABLE` triggers a merge, not a mutation. Updated all other references to `MATERIALIZE COLUMN` throughout the post (intro paragraph, "Defining Codecs at Table Creation" section, and Summary) to reference `OPTIMIZE TABLE ... FINAL` instead.
- **Why:** Per official ClickHouse documentation, `MATERIALIZE COLUMN` "rewrites existing column data after a DEFAULT or MATERIALIZED expression has been added or updated" — it has no effect on codec settings. `OPTIMIZE TABLE ... FINAL` is the correct mechanism for forcing a rewrite of data parts with updated codec metadata.

## Review Notes
- The `Delta(bytes)` parameter syntax (e.g., `Delta(8)`) used in the post is deprecated per ClickHouse documentation: "Specifying delta_bytes as an argument is deprecated and support will be removed in a future release." Without the argument, Delta defaults to `sizeof(type)`, which for UInt64 is 8 bytes anyway. The current syntax still works but may need updating in a future revision.
- The T64 description says it "transposes 64-bit integer blocks" — the actual mechanism is that it "crops unused high bits of values" using a block transposition approach. The description is a simplification but not inaccurate enough to warrant a change.
- All SQL syntax, system table column names (`compression_codec` in `system.columns`, `column_data_compressed_bytes`/`column_data_uncompressed_bytes` in `system.parts_columns`), codec parameters (FPC, ZSTD levels, etc.), and codec chaining behavior were verified as correct.
