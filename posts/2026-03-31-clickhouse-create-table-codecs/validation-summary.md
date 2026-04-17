# Validation Summary: How to Create Tables with Codecs for Compression in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL DDL (CREATE TABLE, ALTER TABLE)
- MergeTree engine
- Compression codecs: LZ4, LZ4HC, ZSTD, NONE, Delta, DoubleDelta, Gorilla, T64
- system.columns system table

## Sources Consulted
- ClickHouse CREATE TABLE docs: https://clickhouse.com/docs/en/sql-reference/statements/create/table/
- ClickHouse column compression codec reference (column-compression-codecs section)
- ClickHouse system.columns docs

## Issues Found
- **Deprecated `Delta(delta_bytes)` parameter**: The post included examples using explicit byte-width values such as `CODEC(Delta(4), ZSTD(1))` and `CODEC(Delta(8), ZSTD(1))`, and a dedicated subsection stating "Delta accepts an optional byte width parameter (1, 2, 4, 8)". Per the current ClickHouse documentation, specifying `delta_bytes` as an argument is deprecated and support will be removed in a future release. Updated the post to use `Delta` without an argument (ClickHouse infers the byte width from the column type), and rewrote the subsection accordingly. Affected locations: the "Delta Codec" section, the "Codec Chaining" example, and the "Complete Production Table Example".

## Review Notes
- All other codec claims verified as correct: LZ4 default, ZSTD levels 1-22, LZ4HC levels 1-12, Gorilla XOR-based for floats, DoubleDelta delta-of-deltas, T64 high-bit cropping via 64x64 bit-matrix transpose, codec chaining syntax, `ALTER TABLE ... MODIFY COLUMN ... CODEC(...)` syntax, and the `compression_codec` column in `system.columns`.
- ClickHouse Cloud uses ZSTD as the default column codec rather than LZ4; the post's statement that LZ4 is "the default for most columns" is accurate for self-managed installations but a Cloud-specific caveat could be added in a future revision.
- The T64 description ("transposes a 64-row block and strips common high bits") is a simplified paraphrase of the official 64x64 bit-matrix transpose description; technically accurate and acceptable for an introductory tutorial.
- Gorilla and DoubleDelta are "data-preparation" codecs that must be chained with a general-purpose codec unless `allow_suspicious_codecs` is enabled; every example in the post correctly chains them with LZ4 or ZSTD.
