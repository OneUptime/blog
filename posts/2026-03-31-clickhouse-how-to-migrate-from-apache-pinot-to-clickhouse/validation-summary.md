# Validation Summary: How to Migrate from Apache Pinot to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Apache Pinot (schema, query API, SQL functions, star-tree index)
- ClickHouse (MergeTree, AggregatingMergeTree, materialized views, `file()` table function, time/date functions)
- jq, curl (for data export plumbing)

## Sources Consulted
- Apache Pinot docs — Schema reference: https://docs.pinot.apache.org/configuration-reference/schema
- Apache Pinot docs — Query API and broker: https://docs.pinot.apache.org/users/api/querying-pinot-using-standard-sql
- Apache Pinot docs — DateTime functions (`dateTrunc`, `FromDateTime`, `ToDateTime`): https://docs.pinot.apache.org/users/user-guide-query/supported-transformations
- Apache Pinot docs — Cluster architecture (Controller, Broker, Server, Minion): https://docs.pinot.apache.org/basics/architecture
- ClickHouse docs — `AggregatingMergeTree`: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse docs — Materialized views: https://clickhouse.com/docs/en/sql-reference/statements/create/view
- ClickHouse docs — `file()` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/file
- ClickHouse docs — Date/time functions (`fromUnixTimestamp64Milli`, `toStartOfHour`, `toYYYYMM`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found

1. **Step 1, first curl + jq pipeline was inconsistent with the INSERT in Step 3.** The original jq filter `{cols: .}` would emit objects of the form `{"cols": [<row array>]}`, which does not match the named-column `JSONEachRow` input expected by the subsequent `INSERT ... SELECT tsMillis, page, userId, views FROM file(...)` in Step 3. Pinot's `/query/sql` response returns `resultTable.rows` as arrays of scalar values (not objects), so the jq transform must map positional fields to column names. Fixed by making the `SELECT` column list explicit and rewriting the jq filter to `{tsMillis: .[0], page: .[1], userId: .[2], views: .[3]}` so the emitted JSONL lines contain the keys that the downstream `SELECT` reads.

2. **Step 1, second curl used an invalid Pinot time filter.** The original `WHERE datetrunc('MONTH', tsMillis) = '${MONTH}'` has two problems: (a) Pinot's `dateTrunc` requires at least three arguments (`unit`, `timeValue`, `inputTimeUnit`) — no 2-arg form exists; (b) even with the third argument it returns a long (epoch in the input unit), which cannot be compared to the string literal `'2024-01'`. Replaced with `WHERE ToDateTime(tsMillis, 'yyyy-MM') = '${MONTH}'`, which uses Pinot's `ToDateTime(timeInMillis, pattern)` to format the epoch value as a string that matches the loop variable.

## Review Notes

- `OPTION(timeoutMs=60000)` is still accepted by current Pinot releases but is a legacy form; Pinot now recommends the `SET timeoutMs=60000;` prefix syntax. Left as-is because both forms are still valid and the change would not improve correctness.
- The Pinot dateTime format `"1:MILLISECONDS:EPOCH"` is the legacy 3-token simple-date-format spec. It is still supported but Pinot now also accepts the pipe-delimited form `"EPOCH|MILLISECONDS|1"`. The legacy form is fine for a migration post where users are reading pre-existing schemas.
- `file('/tmp/pinot_export.jsonl', 'JSONEachRow')` in Step 3 relies on the file being accessible to the ClickHouse server process. In server mode, non-privileged users can only read from `user_files_path` (default `/var/lib/clickhouse/user_files/`); `/tmp` works when using `clickhouse-local` or `clickhouse-client` with an appropriate setup. Not a correctness error in the post, but something a reader may hit.
- The star-tree vs. `AggregatingMergeTree` mapping in the "Key Differences" table is a reasonable high-level analogy — they serve the same pre-aggregation role, though the mechanics differ (star-tree is an on-disk index inside a segment; `AggregatingMergeTree` is a separate table materialized via a view).
