# Validation Summary: How to Chain Multiple Codecs in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (column-level compression codecs)
- Compression codecs: Delta, DoubleDelta, Gorilla, T64
- Compressors: LZ4, ZSTD
- ClickHouse system tables (`system.parts`, `system.columns`)
- MergeTree table engine

## Sources Consulted
- ClickHouse CREATE TABLE / Codecs documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table#codecs
- ClickHouse Settings documentation (allow_suspicious_codecs): https://clickhouse.com/docs/en/operations/settings/settings
- General ClickHouse codec reference (Delta, DoubleDelta, Gorilla, T64 type compatibility)

## Issues Found
- The "Avoiding Counterproductive Chains" section originally stated `Gorilla is ignored on DateTime` for the example `ts DateTime CODEC(Gorilla, LZ4)`. This is incorrect: ClickHouse does not silently ignore mismatched codecs. Instead, it raises a suspicious codec error and refuses the column definition unless the `allow_suspicious_codecs` setting is enabled. Updated the inline comment to reflect this behavior accurately.

## Review Notes
- The codec syntax examples (e.g., `Delta(8)`, `Delta(4)`, `DoubleDelta`, `ZSTD(3)`, `Gorilla`, `T64`) are syntactically correct and use valid argument forms (Delta accepts byte sizes 1, 2, 4, or 8).
- The codec pipeline mechanics description (transforms applied first during writes, reversed during reads) matches ClickHouse's documented behavior.
- The transform-to-type compatibility table is consistent with current ClickHouse documentation: Delta/DoubleDelta for integers and DateTime, Gorilla for floating-point types, T64 for integers/Date/DateTime.
- The benchmarking SQL (CREATE TABLE, INSERT INTO ... numbers(), system.parts query) is valid ClickHouse SQL and would run as written.
- The `system.columns` inspection query correctly references the `compression_codec` column, which is part of the documented schema.
- Note for future updates: the post says Gorilla "only works on float types" — this matches modern ClickHouse behavior, though much older versions allowed Gorilla on integer types. Worth revisiting if the post's audience targets pre-22.x ClickHouse installations.
