# Validation Summary: How to Use Delta Codec in ClickHouse for Numeric Time Series

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- ClickHouse
- Delta codec (data-preparation codec)
- LZ4 and ZSTD compressors
- Gorilla codec (mentioned for floats)
- MergeTree engine
- DateTime and DateTime64 types
- SQL (CREATE TABLE, ALTER TABLE, system tables)

## Sources Consulted
- ClickHouse specialized codecs docs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#specialized-codecs
- ClickHouse ALTER COLUMN docs: https://clickhouse.com/docs/en/sql-reference/statements/alter/column#modify-column
- ClickHouse system.columns docs: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse DateTime / DateTime64 type docs

## Issues Found
- **Byte mapping table error**: The table listed `DateTime` under the 8-byte row alongside `UInt64`, `Int64`, `Float64`. DateTime in ClickHouse is internally a 32-bit (4-byte) Unix timestamp, so it belongs in the 4-byte row. This contradicted the post's own code examples which correctly use `CODEC(Delta(4), LZ4)` for DateTime columns. Fixed by moving `DateTime` to the 4-byte row and adding `DateTime64` (which is the 64-bit variant) to the 8-byte row.

## Review Notes
- All code examples use valid ClickHouse SQL syntax and current codec expressions.
- Delta is correctly described as a transform that must be paired with a general-purpose compressor.
- Valid `bytes` parameter values (1, 2, 4, 8) match the official documentation.
- The Gorilla codec reference for float compression is accurate and remains valid as of current ClickHouse versions.
- The `system.columns.compression_codec` column reference is correct.
- Using `Delta(8)` on `order_id` when the table is `ORDER BY (created_at, order_id)` will only produce all-1s deltas if there is exactly one order per `created_at` second; in practice deltas remain small and compress well, so the example is still reasonable.
- The "3-5x better compression" claim on monotonic sequences is a reasonable ballpark that depends on data characteristics.
