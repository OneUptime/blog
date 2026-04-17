# Validation Summary: How to Use Async INSERT in ClickHouse for High-Throughput Writes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (async INSERT feature)
- ClickHouse HTTP interface
- clickhouse-driver (Python client)
- ClickHouse system tables (`system.asynchronous_insert_log`)
- SQL

## Sources Consulted
- ClickHouse settings reference: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse `system.asynchronous_insert_log` docs: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_insert_log
- ClickHouse source (authoritative OSS defaults): https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Settings.cpp
- ClickHouse source (authoritative column list): https://github.com/ClickHouse/ClickHouse/blob/master/src/Interpreters/AsynchronousInsertLog.cpp
- ClickHouse docs on asynchronous inserts: https://clickhouse.com/docs/en/optimize/asynchronous-inserts
- clickhouse-driver (Python) docs: https://clickhouse-driver.readthedocs.io/

## Issues Found

1. **Incorrect default for `async_insert_max_data_size`.** Post claimed the default is `1MB`. The OSS default in current ClickHouse is `10485760` bytes (10 MiB); Cloud default is 100 MiB. Updated the bullet to read "default: 10 MiB".

2. **Wrong column names in `system.asynchronous_insert_log` query.** Post used `written_rows` and `written_bytes` (those column names belong to `system.query_log`). The actual columns in `system.asynchronous_insert_log` are `rows` and `bytes`. Updated the SELECT to use the correct column names.

## Review Notes

- `async_insert_busy_timeout_ms` is still valid (it is declared as an alias for the canonical `async_insert_busy_timeout_max_ms`). The OSS default of 200 ms shown in the post is correct. A future revision could mention the canonical name and the paired `async_insert_busy_timeout_min_ms` (default 50 ms) setting, but this is not an error.
- ClickHouse Cloud uses different defaults (100 MiB data size, 1000 ms timeout). The post's defaults are correct for self-managed/OSS ClickHouse; mentioning the Cloud distinction would be a nice-to-have.
- The clickhouse-driver (native TCP) example is syntactically valid; note that async INSERT was originally designed around the HTTP interface and the native protocol path has some caveats, but the snippet as shown will work.
- The "Too many parts" error description and the rationale for async INSERT are accurate.
