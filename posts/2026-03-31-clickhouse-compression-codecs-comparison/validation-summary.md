# Validation Summary: ClickHouse Compression Codecs Feature Comparison

## Status
validated

## Post Type
Reference / Feature comparison guide

## Technologies Covered
- ClickHouse
- Compression codecs: LZ4, LZ4HC, ZSTD, NONE
- Encoding codecs: Delta, DoubleDelta, Gorilla, T64, FPC
- LowCardinality data type
- MergeTree engine
- system.columns introspection

## Sources Consulted
- ClickHouse official docs – Column Compression Codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec
- ClickHouse official docs – CREATE TABLE syntax: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse official docs – system.columns table: https://clickhouse.com/docs/en/operations/system-tables/columns

## Issues Found
- **Invalid codec name "DEFLATE"**: The byte compression codecs table listed `DEFLATE` as a compatibility-with-gzip option. ClickHouse does not have a codec named `DEFLATE`. The only related codec is `DEFLATE_QPL` (requires Intel QPL hardware acceleration), which is documented as obsolete and not supported in ClickHouse Cloud. Fix: removed the `DEFLATE` row from the byte compression codecs table. The current valid general-purpose codecs in ClickHouse are `NONE`, `LZ4`, `LZ4HC`, and `ZSTD`, all of which remain in the table.

## Review Notes
- `CODEC(encoder, compressor)` syntax and the chained example (`DoubleDelta, ZSTD(1)`, `Gorilla, LZ4`) are correct.
- ZSTD level range is [1-22] (default 1) — the levels mentioned (1, 3, 19) are all valid.
- LZ4HC level range is [1-12] (default 9) — `LZ4HC(9)` is valid.
- FPC is a real ClickHouse codec (predictive floating-point, levels [1-28], default 12).
- T64, Delta, DoubleDelta, and Gorilla names and semantics match the official docs. Delta and DoubleDelta are preprocessing codecs that work on fixed-width integer-like types (including Date/DateTime, which are internally integers).
- `system.columns` query is syntactically correct; `data_compressed_bytes` and `data_uncompressed_bytes` are valid columns.
- The LowCardinality recommendation (< ~10,000 distinct values) matches ClickHouse's official guidance.
- Compression ratio numbers in the example table are illustrative and clearly labeled as "typical" / data-dependent — reasonable for a comparison post.
- Other codecs exist that weren't covered (GCD, ALP — experimental, AES encryption codecs); not listing them is fine for a practical comparison post.
