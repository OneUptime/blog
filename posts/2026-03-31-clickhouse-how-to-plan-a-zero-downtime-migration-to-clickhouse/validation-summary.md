# Validation Summary: How to Plan a Zero-Downtime Migration to ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine, partitioning, LowCardinality types)
- Python with clickhouse-connect driver
- SQL (ClickHouse dialect and MySQL-like dialect for the "old system")
- Feature flags / percentage rollouts for gradual cutover

## Sources Consulted
- ClickHouse CREATE TABLE reference: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse ReplicatedMergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse LowCardinality data type: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse date/time functions (toYYYYMM, toDate, today): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- clickhouse-connect Python driver docs: https://clickhouse.com/docs/en/integrations/python
- ClickHouse parameterized query syntax ({name:Type}): https://clickhouse.com/docs/en/interfaces/cli#cli-queries-with-parameters

## Issues Found
No technical issues found.

- The `CREATE TABLE` statement uses valid ClickHouse syntax: `ReplicatedMergeTree` with the standard `{shard}`/`{replica}` macros, `PARTITION BY toYYYYMM(created_at)`, and a sensible `ORDER BY` key.
- `LowCardinality(String)` is correct for the categorical `event_type` column.
- The `clickhouse-connect` usage (`get_client(host=..., port=8123)`, `client.insert(table, rows)`, `client.query(...).result_rows`, `parameters={'uid': user_id}` with `{uid:String}`) matches the official driver API.
- The ClickHouse-side parity query (`toDate`, `count()`, `today() - 7`) and the MySQL-side query (`DATE()`, `NOW() - INTERVAL 7 DAY`) are both syntactically valid for their respective engines.
- The parity-check math is correct: `abs(ch - old) / max(old, 1) * 100` produces a percentage, and `diff_pct < 0.01` consistently matches the "0.01% variance" comment.

## Review Notes
- The 0.01% variance threshold in `check_parity` is quite strict for real-world production data (where tiny ordering/async-write drift is common). Readers may want to relax this to a larger tolerance (e.g., 0.1% or 1%) depending on their ingest latency characteristics. This is a design choice, not a technical error.
- The dual-write example swallows ClickHouse insert exceptions after logging. This is intentional per the post ("fire and forget") and aligns with the stated goal of non-blocking writes. Operators should ensure the `clickhouse.write.error` metric is alerted on, or backfill gaps will silently accumulate.
- `client.insert('analytics.events', [event])` in the dual-write snippet assumes the `event` dict's keys align with the table's column order or that `column_names` is passed; in real code using clickhouse-connect, callers typically pass `column_names=[...]` explicitly or use a sequence-of-sequences. The example is representative but slightly simplified — not incorrect for illustrative purposes.
- No deprecation or version-specific concerns as of ClickHouse 24.x and clickhouse-connect 0.7+.
