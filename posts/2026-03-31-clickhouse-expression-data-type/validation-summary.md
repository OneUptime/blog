# Validation Summary: How to Use Expression Data Type in ClickHouse Columns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, schema DDL)
- SQL (CREATE TABLE, INSERT, SELECT, ALTER TABLE)
- ClickHouse computed column types: `MATERIALIZED`, `ALIAS`
- ClickHouse functions: `toDate`, `toHour`, `toDayOfWeek`, `domain`, `path`, `lower`, `trim`, `multiIf`
- ClickHouse types: `Date`, `DateTime`, `DateTime64(3)`, `UInt8/UInt64`, `Float32/Float64`, `String`, `LowCardinality(String)`

## Sources Consulted
- ClickHouse docs — CREATE TABLE / column default expressions: https://clickhouse.com/docs/en/sql-reference/statements/create/table#default_values
- ClickHouse docs — Default expression types (DEFAULT, MATERIALIZED, EPHEMERAL, ALIAS): https://clickhouse.com/docs/en/sql-reference/statements/create/table#default-values
- ClickHouse docs — ALTER TABLE ... MATERIALIZE COLUMN: https://clickhouse.com/docs/en/sql-reference/statements/alter/column#materialize-column
- ClickHouse docs — ALTER TABLE ... MODIFY COLUMN: https://clickhouse.com/docs/en/sql-reference/statements/alter/column#modify-column
- ClickHouse docs — URL functions (`domain`, `path`): https://clickhouse.com/docs/en/sql-reference/functions/url-functions
- ClickHouse docs — Date/Time functions (`toDate`, `toHour`, `toDayOfWeek`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse docs — Conditional functions (`multiIf`): https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions
- ClickHouse docs — String functions (`lower`, `trim`): https://clickhouse.com/docs/en/sql-reference/functions/string-functions

## Issues Found
No technical issues found.

## Review Notes
- The expected-output comment after the first `SELECT ... ORDER BY visited_at` query only shows a single row (the 14:32 entry) rather than all three inserted rows. This is a common shorthand in tutorial posts and is not technically incorrect, but readers might initially expect the first listed row to correspond to the earliest timestamp (08:10:45, `docs.example.com`). No fix required.
- `tax_rate Float32 DEFAULT 0.08` is used in the `orders` example. Because `0.08` cannot be represented exactly in Float32, the computed `tax_amount` for a `subtotal` of 100.0 may display with a very small floating-point delta depending on the client formatter, though most ClickHouse clients round to a clean `8` for display. Nothing to change; this is an inherent floating-point caveat rather than a correctness issue.
- The "Available in ORDER BY" row in the comparison table refers to the table-level MergeTree `ORDER BY` / sort key (not `SELECT ... ORDER BY`). In a `SELECT ... ORDER BY` clause, `ALIAS` columns can still be used because the alias is substituted into the query. Not incorrect in context, but worth noting for readers.
- ClickHouse's behavior around MATERIALIZED columns and `ALTER TABLE ... UPDATE` can be nuanced across versions (the stored MATERIALIZED value is not automatically re-evaluated when an unrelated `UPDATE` mutation rewrites a part, unless the MATERIALIZED expression depends on an updated column, in which case it is re-evaluated during the mutation). The post's summary ("No (computed at insert)") reflects the common expectation and is accurate for the typical case.
