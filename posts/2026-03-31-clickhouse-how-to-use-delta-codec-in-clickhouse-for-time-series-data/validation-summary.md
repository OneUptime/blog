# Validation Summary: How to Use Delta Codec in ClickHouse for Time-Series Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- Delta compression codec
- DoubleDelta compression codec
- Gorilla compression codec
- LZ4 / ZSTD general-purpose codecs
- `system.parts` and `system.columns` system tables

## Sources Consulted
- ClickHouse Column Compression Codecs documentation: https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse `system.columns` documentation: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse `system.parts` documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse `ALTER TABLE ... MODIFY COLUMN` documentation: https://clickhouse.com/docs/sql-reference/statements/alter/column

## Issues Found
- **Incorrect default value for `Delta(N)`.** The post claimed "Default is 1" for `Delta(N)`. Per official ClickHouse documentation, the default `delta_bytes` is `sizeof(type)`, not `1`. For a `UInt64` column, the default is `8`; for `DateTime` (a 4-byte type), it's `4`. Fixed to: "The default is `sizeof(type)`, so for a `UInt64` column `Delta` alone is equivalent to `Delta(8)`." This also removes the now-redundant "Use `Delta(8)` for 64-bit integers" tip, which the updated sentence already conveys.

## Review Notes
- The `CODEC(Delta, LZ4)` applied to `cpu_pct Float32` in the first example is syntactically valid but not ideal in practice — Delta is designed for integer/monotonic data, and `Gorilla` is the float-specific codec in ClickHouse. The post does show correct `Gorilla` usage later for `Float64`, so this is a minor style inconsistency rather than a technical error and was left unchanged.
- Per recent ClickHouse release notes, specifying the `delta_bytes` argument to `Delta` is slated for deprecation in a future release. The post's use of `Delta(8)` still works today, so no change was made, but readers using very new ClickHouse versions may want to prefer the default `Delta` form.
- `OPTIMIZE TABLE ... FINAL` will recompress data into new parts using the current codec, which correctly matches the post's claim.
- The `compression_codec` column in `system.columns` exists and is the correct way to verify codec assignment.
- The DoubleDelta description as "second-order differences" is accurate; the ClickHouse docs phrase it as "delta of deltas," which is mathematically equivalent.
