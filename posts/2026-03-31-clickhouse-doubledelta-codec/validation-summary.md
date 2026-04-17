# Validation Summary: How to Use DoubleDelta Codec in ClickHouse

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- ClickHouse (column compression codecs)
- DoubleDelta codec
- Delta codec
- Gorilla codec
- LZ4 / ZSTD general-purpose compressors
- MergeTree table engine
- DateTime and DateTime64 data types
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official docs: Column Compression Codecs (https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec)
- ClickHouse docs: Specialized Codecs (DoubleDelta, Delta, Gorilla) (https://clickhouse.com/docs/en/sql-reference/statements/create/table#specialized-codecs)
- ClickHouse docs: DateTime64 (https://clickhouse.com/docs/en/sql-reference/data-types/datetime64)
- ClickHouse docs: system.parts table (https://clickhouse.com/docs/en/operations/system-tables/parts)
- ClickHouse docs: TTL for columns and tables (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl)
- Gorilla paper: "Gorilla: A Fast, Scalable, In-Memory Time Series Database", Pelkonen et al., VLDB 2015 (Facebook)
- ClickHouse `numbers()` table function documentation
- ClickHouse `formatReadableSize` function reference

## Issues Found
No technical issues found.

The mathematical explanation of DoubleDelta (second-order differences reducing uniformly-spaced sequences to near-zero residuals) is correct. The worked example (1000, 1010, 1020, 1030, 1040 → Delta: 1000, 10, 10, 10, 10 → DoubleDelta: 1000, 10, 0, 0, 0) accurately reflects how the codec stores the first value raw, the first delta, and then subsequent second-order differences.

The codec syntax `CODEC(DoubleDelta, LZ4)` and `CODEC(DoubleDelta, ZSTD(3))` matches ClickHouse's documented grammar. The `Delta(4)` parameterization (byte size) and DoubleDelta's parameter-less form (inferred from the column type) are both correct.

All SQL examples — `CREATE TABLE` with `MergeTree`, `INSERT ... SELECT FROM numbers(...)`, the `system.parts` aggregation query using `data_compressed_bytes` / `data_uncompressed_bytes` / `active`, and the `TTL ts + INTERVAL 1 YEAR DELETE` clause — are syntactically valid and use current (non-deprecated) APIs.

The Gorilla paper attribution (Facebook, 2015) is accurate; DoubleDelta-style timestamp compression was popularized by that paper.

## Review Notes
- The claim "DoubleDelta is a pure transform and must be followed by a compressor" is slightly stronger than strictly necessary — ClickHouse will not raise an error if DoubleDelta is used alone, and DoubleDelta itself performs variable-length binary encoding. However, in practice pairing it with LZ4/ZSTD is the universally recommended pattern, so the guidance remains sound and no change was made.
- The "20-40% better compression than Delta" figure for uniformly-spaced data is a reasonable ballpark; actual results vary by cardinality, stride, and subsequent compressor. The post appropriately frames this as a typical range rather than a guarantee.
- DoubleDelta is documented as working best on 1/2/4/8-byte integer-like types (including DateTime and DateTime64). All uses in the post conform to this.
