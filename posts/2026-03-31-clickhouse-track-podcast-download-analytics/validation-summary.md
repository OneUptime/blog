# Validation Summary: How to Track Podcast Download Analytics in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, partitioning, aggregate functions)
- SQL (DDL and analytical queries)
- IAB podcast download measurement concepts

## Sources Consulted
- ClickHouse documentation: `uniqExact` aggregate function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse documentation: `uniq` (approximate) aggregate function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse documentation: `cityHash64` function — https://clickhouse.com/docs/en/sql-reference/functions/hash-functions#cityhash64
- ClickHouse documentation: `IPv4` data type — https://clickhouse.com/docs/en/sql-reference/data-types/ipv4
- ClickHouse documentation: `LowCardinality` encoding — https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse documentation: `MergeTree` engine and partitioning — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: `formatReadableSize` function — https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize
- ClickHouse documentation: Date/time functions (`toYYYYMMDD`, `toStartOfWeek`, `toStartOfMonth`, `toDayOfWeek`, `toDate`) — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- IAB Podcast Measurement Technical Guidelines v2.2 — https://iabtechlab.com/standards/podcast-measurement-guidelines/

## Issues Found

1. **Intro text incorrectly described distinct counts as "approximate"**: The intro paragraph stated ClickHouse handles deduplication "using approximate distinct counts," but every query in the post uses `uniqExact`, which is an exact (not approximate) distinct count function. Changed "approximate distinct counts" to "hash-based distinct counts" to accurately reflect the code.

2. **IAB deduplication description claimed "24-hour window" but code uses calendar-day truncation**: The text before the IAB query said "Deduplicate the same IP within a 24-hour window per episode" but the code uses `toDate(ts)` which truncates to calendar-day boundaries, not a rolling 24-hour window. Changed to "within the same calendar day" to match the actual implementation.

3. **Summary paragraph referenced "approximate distinct functions" despite all queries using exact counts**: The summary advised to "use approximate distinct functions for large-scale listener counts" which could confuse readers since no approximate functions were demonstrated. Rewrote to explicitly recommend replacing `uniqExact` with `uniq` for performance at scale, making the trade-off clear.

## Review Notes
- All SQL syntax is valid ClickHouse SQL. The schema uses appropriate types: `IPv4` for IPs, `LowCardinality(FixedString(2))` for country codes, `UInt8` for the boolean-like `completed` flag.
- The `PARTITION BY toYYYYMMDD(ts)` strategy is appropriate for time-range queries on download data.
- The `ORDER BY (show_id, episode_id, ts)` key aligns well with the query patterns, which all filter by `show_id` and often group by `episode_id`.
- The IAB deduplication uses calendar-day boundaries (`toDate(ts)`) rather than a true rolling 24-hour window as specified by IAB guidelines. This is a common and reasonable simplification, but readers implementing strict IAB compliance should be aware of this distinction.
- The `cityHash64(toString(client_ip), toDate(ts))` approach for deduplication has a negligible but non-zero collision probability. For strict IAB compliance, counting distinct `(client_ip, toDate(ts))` tuples directly would be more precise, though the hash-based approach is functionally equivalent at practical scales.
- ClickHouse's `HAVING` clause correctly supports aliases from the `SELECT` list, so `HAVING total_downloads > 100` is valid.
