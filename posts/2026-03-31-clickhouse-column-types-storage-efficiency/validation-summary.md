# Validation Summary: How to Optimize Column Types for Storage Efficiency in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (data types: Int/UInt, LowCardinality, Decimal, Date/DateTime/DateTime64, Enum8/Enum16)
- ClickHouse compression codecs (LZ4, ZSTD)
- ClickHouse system tables (`system.columns`)
- MergeTree engine

## Sources Consulted
- ClickHouse Decimal: https://clickhouse.com/docs/en/sql-reference/data-types/decimal
- ClickHouse Int/UInt: https://clickhouse.com/docs/en/sql-reference/data-types/int-uint
- ClickHouse Date: https://clickhouse.com/docs/en/sql-reference/data-types/date
- ClickHouse DateTime: https://clickhouse.com/docs/en/sql-reference/data-types/datetime
- ClickHouse DateTime64: https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- ClickHouse LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse Enum: https://clickhouse.com/docs/en/sql-reference/data-types/enum
- ClickHouse system.columns: https://clickhouse.com/docs/en/operations/system-tables/columns

## Issues Found
- **Decimal64(2) range was incorrect.** The post claimed "up to ~9.2 quadrillion". Per ClickHouse docs, `Decimal64(S)` has a range of `(-1 * 10^(18-S), 1 * 10^(18-S))`, so `Decimal64(2)` max is approximately 10^16 ≈ **10 quadrillion**, not 9.2. The 9.2 figure likely came from confusing it with the underlying Int64 max (~9.22 × 10^18). Fixed the comment to "up to ~10 quadrillion".

## Review Notes
- All integer type ranges (UInt8: 0–255, UInt32: ~4.29B, UInt64: ~18.4Q) are correct.
- Date (2 bytes), DateTime (4 bytes), DateTime64 (8 bytes) sizes are accurate.
- Enum8 (1 byte) and Enum16 (2 bytes) sizes are accurate.
- LowCardinality 1-byte index for ≤256 distinct dictionary entries is correct (per-part dictionary, default `low_cardinality_max_dictionary_size = 8192`); the 50 distinct values example is fine.
- The `system.columns` query is valid — both `data_compressed_bytes` and `data_uncompressed_bytes` are available there.
- The "~10GB to ~50MB" LowCardinality compression estimate is plausible as a rough order-of-magnitude figure; actual ratios depend on LZ4/ZSTD effectiveness and data distribution.
- ZSTD codec syntax `CODEC(ZSTD(level))` with levels 3 and 6 is valid.
