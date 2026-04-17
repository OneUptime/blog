# Validation Summary: How to Configure Dictionary Refresh Intervals in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (dictionary DDL, LIFETIME clause, system.dictionaries, SYSTEM RELOAD commands)
- ClickHouse dictionary sources (CLICKHOUSE, MYSQL)
- SQL

## Sources Consulted
- https://clickhouse.com/docs/sql-reference/statements/create/dictionary/lifetime
- https://clickhouse.com/docs/sql-reference/statements/create/dictionary/sources
- https://clickhouse.com/docs/sql-reference/statements/create/dictionary/sources/clickhouse
- https://clickhouse.com/docs/sql-reference/statements/create/dictionary/sources/mysql
- https://clickhouse.com/docs/operations/system-tables/dictionaries
- https://clickhouse.com/docs/sql-reference/statements/system#reload-dictionary

## Issues Found
No technical issues found.

All claims verified against official ClickHouse documentation:

- `LIFETIME(n)` with an integer value is treated as seconds — correct.
- `LIFETIME(MIN x MAX y)` — ClickHouse picks a uniformly random time within the range to spread source load; matches the official rationale.
- `LIFETIME(0)` disables automatic dictionary updates — explicitly documented.
- `INVALIDATE_QUERY` is placed inside the `SOURCE(...)` block (both examples in the post do this correctly).
- All `system.dictionaries` columns referenced (`name`, `last_successful_update_time`, `last_exception`, `loading_duration`, `status`, `bytes_allocated`, `element_count`) exist.
- `SYSTEM RELOAD DICTIONARY <name>` and `SYSTEM RELOAD DICTIONARIES` are both valid.
- The CLICKHOUSE and MYSQL source field names (HOST, PORT, USER, PASSWORD, DB, TABLE, INVALIDATE_QUERY) are valid. ClickHouse SQL is case-insensitive for these parameters.
- Time-unit conversions in the "Refresh Strategies" table are arithmetically correct (MIN 60 MAX 120 = 1–2 minutes, MIN 3600 MAX 7200 = 1–2 hours, etc.).

## Review Notes
- Stylistic note (non-blocking): the official ClickHouse docs use lowercase source parameter names (`host`, `port`, `user`, `password`, `db`, `table`, `invalidate_query`) in DDL examples. The post uses uppercase. ClickHouse SQL accepts both, so this is a convention preference rather than a correctness issue.
- The `formatReadableSize` function used in the last query is a real ClickHouse function and works correctly on `bytes_allocated`.
- The claim that each replica picks its own random refresh time under MIN/MAX is consistent with the documented "distribute the load... on a large number of servers" rationale.
