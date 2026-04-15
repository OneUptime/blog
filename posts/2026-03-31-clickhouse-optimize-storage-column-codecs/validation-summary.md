# Validation Summary: How to Optimize Storage Size with Column Codecs in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (columnar database)
- Column compression codecs: Delta, Gorilla, T64, LZ4, ZSTD
- LowCardinality type modifier
- MergeTree engine
- system.columns introspection table

## Sources Consulted
- ClickHouse official documentation — system.columns: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse official documentation — Column Compression Codecs: https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse official documentation — ALTER COLUMN: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse official documentation — Compression in ClickHouse: https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- ClickHouse blog — Optimize with Codecs and Compression: https://clickhouse.com/blog/optimize-clickhouse-codecs-compression-schema

## Issues Found

1. **T64 codec description was inaccurate**: The post described T64 as "removing leading zero bits." In reality, T64 crops unused high bits based on the min/max value range within each data block (it places 64 values into a 64x64 bit matrix, transposes it, and removes bit rows that don't differ). Changed to: "cropping unused high bits based on the min/max value range in each data block."

2. **Delta byte-size parameter is deprecated**: The post used `Delta(4)` for DateTime and `Delta(8)` for UInt64. The ClickHouse documentation explicitly states that specifying `delta_bytes` as an argument is deprecated and support will be removed in a future release. Plain `Delta` auto-detects the byte size from the column type. Changed all instances of `Delta(4)` and `Delta(8)` to `Delta`.

## Review Notes
- The post's description of the two-stage codec pipeline (encoding transform + compression) is a useful simplification. Technically, LZ4 is a dictionary-based compressor rather than an "entropy" compressor, but this is an acceptable simplification for the target audience.
- The summary section lists `LowCardinality` alongside codecs like Delta and Gorilla. LowCardinality is technically a type modifier, not a codec, but the post correctly describes it as a "type" in its dedicated section, so the summary phrasing is acceptable in context.
- The `OPTIMIZE TABLE FINAL` advice is correct but worth noting that it can be very expensive on large tables as it forces a full rewrite of all data parts.
