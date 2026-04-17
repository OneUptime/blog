# Validation Summary: How to Set allow_suspicious_low_cardinality_types in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- ClickHouse
- `LowCardinality` data type
- `allow_suspicious_low_cardinality_types` server/user setting
- MergeTree engine
- ClickHouse XML user profiles
- Mermaid diagrams

## Sources Consulted
- ClickHouse Settings Reference: https://clickhouse.com/docs/en/operations/settings/settings#allow_suspicious_low_cardinality_types
- ClickHouse LowCardinality Data Type: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse ErrorCodes.cpp: https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ErrorCodes.cpp
- ClickHouse Issue #4965 (Original feature request): https://github.com/ClickHouse/ClickHouse/issues/4965
- ClickHouse PR #5448 (Implementation): https://github.com/ClickHouse/ClickHouse/pull/5448
- ClickHouse Issue #57561 (LowCardinality(DateTime) prohibited by default): https://github.com/ClickHouse/ClickHouse/issues/57561
- Tinybird troubleshooting reference for SUSPICIOUS_TYPE_FOR_LOW_CARDINALITY: https://www.tinybird.co/troubleshooting/errors/SUSPICIOUS_TYPE_FOR_LOW_CARDINALITY

## Issues Found

1. **Incorrect error code (603 → 455).** The post showed `Code: 603` for the error thrown when creating a LowCardinality column of a fixed-size numeric type. The actual ClickHouse error code for `SUSPICIOUS_TYPE_FOR_LOW_CARDINALITY` is `455` (see `src/Common/ErrorCodes.cpp`). I corrected the error code and lightly adjusted the error message wording to match ClickHouse's real output ("is prohibited by default … Set setting allow_suspicious_low_cardinality_types = 1 in order to allow it.").

2. **Incorrect classification of `LowCardinality(DateTime)`.** The table stated that `LowCardinality(DateTime)` is not suspicious and that "ClickHouse allows it". This is wrong: `DateTime` is a fixed-size 4-byte type and is rejected by default with the same `SUSPICIOUS_TYPE_FOR_LOW_CARDINALITY` (code 455) error (confirmed by ClickHouse issue #57561 and official docs). I updated the row to indicate it is blocked by default.

3. **Imprecise classification of `LowCardinality(FixedString(N))`.** The table claimed this is never suspicious ("No - variable N, may be beneficial"). Per ClickHouse docs, the setting blocks `FixedString(N)` when N ≤ 8 bytes; larger N is allowed. I updated the row to "Yes if N <= 8 bytes; otherwise No".

## Review Notes

- The SQL in the `CREATE TABLE` examples is valid ClickHouse syntax, and the `SET allow_suspicious_low_cardinality_types = 1` session statement is correct.
- The storage comparison query using `system.parts` with `formatReadableSize`, `data_compressed_bytes`, and `data_uncompressed_bytes` is correct and matches current ClickHouse schema.
- The `rand() % 4 + 1` array-indexing trick works because ClickHouse arrays are 1-indexed.
- The XML user profiles snippet uses the correct shape for ClickHouse `users.xml` / `users.d/*.xml` profile configuration.
- The general guidance (LowCardinality benefits strings with up to ~10k distinct values; dictionary overhead outweighs benefit for small fixed-size numeric types) aligns with the official docs.
- UUID and `Decimal` are also flagged by this setting but are out of scope for this post; no change needed.
- The setting name, semantics, and default (0, i.e. restricted) are accurately described.
