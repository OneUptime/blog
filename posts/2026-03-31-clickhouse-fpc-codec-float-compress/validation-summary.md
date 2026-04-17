# Validation Summary: How to Use FPC Codec for Float Compression in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse FPC compression codec
- ClickHouse Gorilla compression codec
- ClickHouse ZSTD / LZ4 / Delta / DoubleDelta codecs
- MergeTree engine
- system.parts and system.columns metadata tables

## Sources Consulted
- ClickHouse official documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table (CREATE TABLE / Codecs section, including FPC parameters and supported types)
- ClickHouse source: src/Compression/CompressionCodecFPC.cpp (validated FPC supports both Float32 and Float64; `float_size` parameter accepts 4 or 8)
- ClickHouse PR #37553 (initial FPC codec implementation by koloshmet)
- Burtscher & Ratanaworabhan, "FPC: A High-Speed Compressor for Double-Precision Floating-Point Data" (https://userweb.cs.txstate.edu/~burtscher/papers/tc09.pdf) for algorithm description (FCM/DFCM predictors, XOR + leading-zero-byte encoding)

## Issues Found
- **FPC type support claim was incorrect.** The post stated "FPC operates only on `Float64` (double-precision) columns. It does not support `Float32`." The official ClickHouse docs and source code (`CompressionCodecFPC.cpp`) explicitly support both `Float32` and `Float64` via the `float_size` parameter (4 or 8, defaulting to `sizeof(type)`). Updated the introduction, syntax section, and summary to reflect Float32 + Float64 support.
- **Section "FPC Limitation: Float64 Only"** built on the same incorrect premise. Renamed to "Mixed Float Widths" and rewrote the accompanying example so both `Float32` and `Float64` columns use FPC. Kept a note that Float32 throughput/ratio with FPC may differ (matching the ClickHouse doc note: "for 32-bit values your mileage may vary").
- **Recommendation table** "Float32 sensor readings → Gorilla" was based on the same false constraint. Updated to "FPC or Gorilla (benchmark)".
- **Syntax section** did not document the second optional parameter. Added `CODEC(FPC(level, float_size))` form and a one-line description of `float_size`.

## Review Notes
- Algorithm description (FCM + DFCM predictors, XOR with actual value, leading-zero-byte encoding) matches the original Burtscher & Ratanaworabhan paper. The byte-level leading-zero count is correct; the 4-bit nibble packing in the actual implementation is metadata, not the leading-zero unit, so the post's wording is accurate.
- Level range (1–28) and default (12) match the official ClickHouse documentation.
- All SQL examples are syntactically valid ClickHouse SQL and consistent with current MergeTree / system table conventions.
- The benchmark queries against `system.parts` correctly use `active = 1` and `database = currentDatabase()`.
- `system.columns.compression_codec` is the correct column name as of current ClickHouse versions.
