# Validation Summary: How to Analyze Authentication Logs with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, table functions)
- SQL (DDL, CTEs, JOINs, aggregations)
- JSON log parsing
- Authentication / security log analysis (SIEM-style use cases)

## Sources Consulted
- ClickHouse official docs — MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse official docs — `LowCardinality` data type: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse official docs — `IPv4` data type and `toIPv4`: https://clickhouse.com/docs/en/sql-reference/data-types/domains/ipv4
- ClickHouse official docs — `file()` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/file
- ClickHouse official docs — JSON functions (`JSONExtractString`): https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- ClickHouse official docs — Date/time functions (`parseDateTimeBestEffort`, `toStartOfHour`, `dateDiff`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse official docs — Aggregate functions (`count`, `countIf`, `uniq`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse official docs — CTEs (`WITH` clause): https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse official docs — TTL for columns and tables: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl

## Issues Found
No technical issues found.

All SQL is syntactically valid ClickHouse:

- `CREATE TABLE` with `LowCardinality(String)`, `IPv4`, `DateTime`, `MergeTree()`, `PARTITION BY toYYYYMM(...)`, `ORDER BY`, and `TTL event_time + INTERVAL 1 YEAR` all match current ClickHouse syntax.
- The `file('/path', 'JSONEachRow', 'raw String')` call uses the correct `file(path, format, structure)` signature.
- `parseDateTimeBestEffort`, `JSONExtractString`, `toIPv4`, `toStartOfHour`, `dateDiff('second', ...)`, `countIf`, `uniq`, and `count()` are all real, non-deprecated ClickHouse functions used correctly.
- `WITH name AS (subquery)` CTEs with `JOIN ... USING (...)` are supported in ClickHouse (available since 20.1).
- `INTERVAL 24 HOUR`, `INTERVAL 1 HOUR`, `INTERVAL 7 DAY`, `INTERVAL 1 YEAR` are all valid interval forms.

## Review Notes
- The `file()` table function in ClickHouse only reads files located under the configured `user_files_path` (default `/var/lib/clickhouse/user_files/`) when invoked by non-privileged users. Reading `/var/log/auth_events.jsonl` directly will work for the `default`/admin user or if the path is explicitly allowed, but readers running with stricter configs may need to copy the file into `user_files_path` or adjust config. This is a common ClickHouse operational caveat rather than a technical error in the post.
- The `ORDER BY (outcome, user_name, event_time)` choice optimizes the shown queries (which filter on `outcome`) but is unusual for time-series data; a future iteration could mention the trade-off vs. ordering by `event_time` first.
- The credential-stuffing CTE would also benefit from a comment that ClickHouse does not enforce referential correlation between the two subqueries — the `s.success_time > f.last_fail` predicate is what enforces ordering; this is already done correctly in the post.
- No version-specific caveats beyond the CTE availability (ClickHouse 20.1+), which is well below any reasonable current deployment.
