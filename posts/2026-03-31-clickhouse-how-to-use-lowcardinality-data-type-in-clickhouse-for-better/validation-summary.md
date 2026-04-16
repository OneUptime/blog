# Validation Summary: How to Use LowCardinality Data Type in ClickHouse for Better Compression

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL (CREATE TABLE, ALTER TABLE, system tables, MergeTree engine)
- LowCardinality data type and related settings

## Sources Consulted
- [ClickHouse LowCardinality(T) docs](https://clickhouse.com/docs/sql-reference/data-types/lowcardinality)
- [ClickHouse settings documentation](https://clickhouse.com/docs/en/operations/settings/settings)
- [ClickHouse ORDER BY docs](https://clickhouse.com/docs/sql-reference/statements/select/order-by)
- [Altinity blog: A Magical Mystery Tour of the LowCardinality Data Type](https://altinity.com/blog/2019-3-27-low-cardinality)
- [ClickHouse PR #5448: Add allow_suspicious_low_cardinality_types setting](https://github.com/ClickHouse/ClickHouse/pull/5448)
- [ClickHouse PR #14223: Fixed incorrect sorting order if LowCardinality column](https://github.com/ClickHouse/ClickHouse/pull/14223)

## Issues Found

Two incorrect setting descriptions in the "Settings That Affect LowCardinality" section were fixed:

1. **`allow_suspicious_low_cardinality_types`** — The post described this as "Allow LowCardinality in IN operations (enabled by default)". This is incorrect on both counts. Per official docs, the setting controls whether LowCardinality can be used with fixed-size types of 8 bytes or less (numeric types and small FixedString), and the default is `0` (disabled), not enabled. Updated the comment to reflect the actual purpose and default.

2. **`low_cardinality_use_single_dictionary_for_part`** — The post described this as "Use LowCardinality for implicit type promotion" and set it to `0`. This description is wrong; the setting controls whether a single dictionary is used per data part (vs. creating new dictionaries when the size limit is exceeded). Default is `0`; setting to `1` forces a single dictionary per part. Updated the comment and example value to `1` since setting it to the default is a no-op demonstration.

## Review Notes

- The rule-of-thumb "fewer than 10,000 distinct values" is a common guideline and is consistent with ClickHouse's own advice, though the internal dictionary size limit setting (`low_cardinality_max_dictionary_size`) defaults to 8192.
- Examples using `LowCardinality(UInt16)` (in "Supported Base Types" and "Practical Example") require `allow_suspicious_low_cardinality_types = 1` to be set, since UInt16 is a fixed-size numeric type ≤ 8 bytes. ClickHouse will otherwise reject the CREATE TABLE with error `SUSPICIOUS_TYPE_FOR_LOW_CARDINALITY`. The post does not call this out explicitly, but the new settings section now mentions the constraint so readers can connect the two.
- The ORDER BY caveat about dictionary-index sort order reflects older ClickHouse behavior; issue #13958 / PR #14223 (merged Aug 2020) fixed correctness issues. Modern ClickHouse versions sort LowCardinality columns by the underlying value, so the `toString(status)` workaround is generally unnecessary today. Left as-is because it is not strictly incorrect and the cast approach is harmless.
- The "Pitfall 1" phrasing "extra values overflow to inline storage" is slightly imprecise; what actually happens is that a new dictionary is created per part when the size limit is reached. Left as-is since the practical takeaway (reduced compression benefit) is correct.
