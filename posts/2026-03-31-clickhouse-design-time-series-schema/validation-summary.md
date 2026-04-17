# Validation Summary: How to Design a Time-Series Schema in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree engines)
- ClickHouse SQL DDL (CREATE TABLE, CREATE MATERIALIZED VIEW)
- ClickHouse data types (DateTime, DateTime64, LowCardinality, Map, UUID, Bool, Float64, UInt64, UInt16)
- ClickHouse codecs (Delta, Gorilla, ZSTD)
- ClickHouse aggregate function combinators (`-State`)
- Time-series schema design, partitioning, TTL

## Sources Consulted
- ClickHouse MergeTree docs — https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse primary key selection guidance — https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree#selecting-a-primary-key
- ClickHouse column compression codecs — https://clickhouse.com/docs/sql-reference/statements/create/table#column_compression_codec
- ClickHouse MergeTree settings — https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse AggregateFunction combinators — https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse Boolean type — https://clickhouse.com/docs/sql-reference/data-types/boolean
- ClickHouse DateTime64 type — https://clickhouse.com/docs/sql-reference/data-types/datetime64

## Issues Found

1. **ORDER BY cardinality guidance was backwards.** The "Core Principles" bullet read: "Put high-cardinality filter dimensions before timestamp in ORDER BY". Official ClickHouse guidance is the opposite: order primary-key columns from low cardinality to high cardinality so the sparse primary index can prune granules efficiently. This also contradicted the post's own examples (`ORDER BY (service, host, metric_name, timestamp)` — low cardinality first). Changed to: "Put low-cardinality filter dimensions before timestamp in ORDER BY (order ascending by cardinality)".

2. **`Delta(4)` codec argument incorrect for `DateTime64(3)`.** `DateTime64` is stored internally as `Int64` (8 bytes), so a 4-byte delta granularity mismatches the value size. In addition, the explicit `delta_bytes` argument to `Delta(...)` is deprecated and scheduled for removal — current guidance is to write bare `Delta`, which defaults to `sizeof(type)`. Changed `CODEC(Delta(4), ZSTD(3))` to `CODEC(Delta, ZSTD(3))` on the timestamp column.

## Review Notes
- `TTL toDateTime(timestamp) + INTERVAL …` where `timestamp` is `DateTime64(3)` still works, but the `toDateTime()` wrapper is legacy defensive code — modern ClickHouse accepts `DateTime64` directly in TTL expressions. The wrapper also silently drops sub-second precision (harmless for a 90-day / 30-day TTL). Not incorrect, so left as-is.
- `index_granularity = 8192` is the default for MergeTree; setting it explicitly is redundant but harmless.
- `min_bytes_for_wide_part = 10485760` (10 MiB) is also the default — explicit but not wrong.
- For monotonically increasing timestamps, `DoubleDelta` often compresses slightly better than `Delta`; `Delta` is still a correct and widely-used choice, so no change was needed.
- `Bool` type requires ClickHouse 22.4+ (April 2022). Any currently-supported version is fine.
