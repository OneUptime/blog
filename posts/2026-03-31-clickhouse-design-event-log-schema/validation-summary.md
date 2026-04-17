# Validation Summary: How to Design an Event Log Schema in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- SQL (ClickHouse dialect)
- Data types: `DateTime`, `DateTime64`, `LowCardinality(String)`, `Map(String, String)`, `IPv4`, `UInt64`, `UInt16`
- Skipping indexes (`tokenbf_v1`)
- TTL expressions and partitioning

## Sources Consulted
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data types (LowCardinality, DateTime64, Map, IPv4): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse skipping indexes (`tokenbf_v1`): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse TTL for columns and tables: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse date/time functions (`toYYYYMMDD`, `toYYYYMM`, `toStartOfMinute`, `toDateTime`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse aggregate functions (`countIf`, `uniq`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference

## Issues Found
No technical issues found.

All `CREATE TABLE` definitions use valid ClickHouse syntax and types. The `MergeTree` engine, partitioning expressions (`toYYYYMMDD`, `toYYYYMM`), `ORDER BY` clauses, and TTL expressions are syntactically correct. The `tokenbf_v1(32768, 3, 0) GRANULARITY 4` skipping-index declaration matches the documented signature `tokenbf_v1(size_of_bloom_filter_in_bytes, number_of_hash_functions, random_seed)`. Query helpers (`countIf`, `uniq`, `toStartOfMinute`, `now() - INTERVAL ...`) are all standard ClickHouse functions used correctly.

## Review Notes
- `toDateTime(timestamp)` inside TTL expressions where `timestamp` is already `DateTime64(3)` is not strictly required on modern ClickHouse (TTL accepts `DateTime64` directly), but it remains valid and is a common compatibility pattern from earlier versions. No change needed.
- `index_granularity = 8192` is the default; the `SETTINGS` line is explicit but not harmful.
- `toYYYYMMDD` daily partitioning can produce many parts at extremely high ingest volumes; for multi-TB/day workloads, monthly partitioning or a custom expression may be preferable. The post's guidance is appropriate for typical event-log scales.
