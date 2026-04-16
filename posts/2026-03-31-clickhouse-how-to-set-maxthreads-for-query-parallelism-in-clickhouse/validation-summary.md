# Validation Summary: How to Set max_threads for Query Parallelism in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- ClickHouse (SQL database)
- ClickHouse settings system (`max_threads`, `max_final_threads`)
- ClickHouse XML profile configuration (`users.xml`)
- ClickHouse SQL-driven access control (`CREATE SETTINGS PROFILE`, `ALTER USER`)
- ClickHouse system tables (`system.query_log`, `system.metrics`)

## Sources Consulted
- ClickHouse Settings reference: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse ALTER USER statement: https://clickhouse.com/docs/sql-reference/statements/alter/user
- ClickHouse system.query_log: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.metrics: https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse `getSetting` function: https://clickhouse.com/docs/sql-reference/functions/other-functions#getSetting
- ClickHouse source: `src/Core/Settings.cpp` (max_threads declaration)
- ClickHouse source: `src/Common/CurrentMetrics.cpp` (metric names)

## Issues Found

1. **Incorrect metric name in `system.metrics` query.**
   - Original: `'ThreadsInOvercommit'`
   - Fixed to: `'ThreadsInOvercommitTracker'`
   - Reason: Per ClickHouse's `CurrentMetrics.cpp`, the actual built-in metric is named `ThreadsInOvercommitTracker` ("Number of waiting threads inside of OvercommitTracker"). The shortened form would silently return no rows.

2. **Missing quotes in `ALTER USER ... SETTINGS PROFILE` statement.**
   - Original: `ALTER USER analyst SETTINGS PROFILE analyst_profile;`
   - Fixed to: `ALTER USER analyst SETTINGS PROFILE 'analyst_profile';`
   - Reason: Per the ClickHouse `ALTER USER` grammar, the `SETTINGS ... PROFILE 'profile_name'` clause expects the profile name as a string literal in single quotes.

## Review Notes

- The statement that `max_threads` defaults to "the number of logical CPU cores" is a reasonable simplification. ClickHouse's actual behavior is nuanced: on x86 processors with SMT/HyperThreading and fewer than 32 CPU cores, it uses logical cores (2× physical cores); on other configurations it effectively uses physical cores. Since most servers today are x86-with-SMT, the post's phrasing is accurate enough for a general audience and was left as-is.
- `max_final_threads` applies to any MergeTree-family table used with the `FINAL` modifier (ReplacingMergeTree, CollapsingMergeTree, AggregatingMergeTree, SummingMergeTree, VersionedCollapsingMergeTree). The post narrows the explanation to ReplacingMergeTree, which is the most common case but not the exclusive one. This framing is common in ClickHouse examples and was left unchanged.
- `getSetting('max_threads')`, the `system.query_log` columns used (`query`, `read_rows`, `read_bytes`, `peak_memory_usage`, `query_duration_ms`, `type`, `event_time`), and the `CREATE SETTINGS PROFILE ... SETTINGS` syntax all verified against current ClickHouse documentation.
- The XML `<profiles>` snippet in `users.xml` is structurally correct; note that in production, profiles typically nest under a top-level `<clickhouse>` (or legacy `<yandex>`) root element, but the excerpt as shown is a valid partial illustration.
