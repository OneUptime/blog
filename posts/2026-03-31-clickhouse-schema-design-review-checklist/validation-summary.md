# Validation Summary: ClickHouse Schema Design Review Checklist

## Status
validated

## Post Type
Reference / Checklist

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse data types (UInt8, Int8, LowCardinality, DateTime, DateTime64, Decimal, FixedString)
- ClickHouse compression codecs (LZ4, ZSTD, Delta, Gorilla)
- ClickHouse partitioning (toYYYYMM, toYYYYMMDD)
- ClickHouse materialized views and AggregatingMergeTree
- ClickHouse aggregate state combinators (-State suffix)

## Sources Consulted
- ClickHouse official documentation: Data Types (https://clickhouse.com/docs/en/sql-reference/data-types)
- ClickHouse official documentation: UInt8/Int8 ranges (https://clickhouse.com/docs/en/sql-reference/data-types/int-uint)
- ClickHouse official documentation: LowCardinality (https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality)
- ClickHouse official documentation: DateTime and DateTime64 (https://clickhouse.com/docs/en/sql-reference/data-types/datetime64)
- ClickHouse official documentation: Compression codecs (https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec)
- ClickHouse official documentation: Aggregate function combinators (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators)

## Issues Found
1. **Int8 range incorrectly stated as 0-255**: The original text read "UInt8/Int8 (0-255)", implying both types share the range 0-255. UInt8 is unsigned (0 to 255), but Int8 is signed (-128 to 127). Fixed to "UInt8 (0-255) / Int8 (-128 to 127)" to accurately reflect both ranges.

## Review Notes
- ClickHouse has a native `Bool` type (since v21.12) that is an alias for `UInt8`. The post recommends "Boolean values stored as UInt8, not String" which is still technically correct (Bool is UInt8 underneath), but modern schemas could use `Bool` directly for better readability.
- The default compression codec is LZ4 for self-managed ClickHouse, but ClickHouse Cloud defaults to ZSTD. The post states "LZ4 used for hot data (default)" which is correct for self-managed deployments but readers using ClickHouse Cloud should be aware of the difference.
- The sorting key guidance "Most selective filter columns come first in ORDER BY" could be read ambiguously. In standard database terminology, "selectivity" often means high-cardinality. However, the post correctly clarifies in a subsequent checklist item that low-cardinality columns should precede high-cardinality ones, which is the standard ClickHouse recommendation.
- All SQL examples are syntactically correct and follow ClickHouse best practices.
- Codec chain examples (Delta + LZ4, Gorilla + ZSTD) correctly demonstrate the pattern of a specialization codec followed by a general-purpose codec.
