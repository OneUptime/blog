# Validation Summary: How to Read and Interpret ClickHouse Error Messages

## Status
validated

## Post Type
Reference / Troubleshooting Guide

## Technologies Covered
- ClickHouse (error handling, system tables, server logging)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse source code `src/Common/ErrorCodes.cpp` — https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ErrorCodes.cpp
- ClickHouse system.query_log documentation — https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse system.errors documentation — https://clickhouse.com/docs/en/operations/system-tables/errors
- ClickHouse default server config (`programs/server/config.xml`) — https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml

## Issues Found
- **Wrong error code for TOO_LARGE_SIZE_COMPRESSED**: The post listed error code 70 as `TOO_LARGE_SIZE_COMPRESSED`. Code 70 is actually `CANNOT_CONVERT_TYPE`. The correct code for `TOO_LARGE_SIZE_COMPRESSED` is **39**. Fixed the heading, error code in the example message, and surrounding text from `Code: 70` to `Code: 39`.

## Review Notes
- All other error codes (62 SYNTAX_ERROR, 60 UNKNOWN_TABLE, 241 MEMORY_LIMIT_EXCEEDED, 159 TIMEOUT_EXCEEDED, 202 TOO_MANY_SIMULTANEOUS_QUERIES, 516 AUTHENTICATION_FAILED) are correct per the ClickHouse source.
- The `system.query_log` query is correct: columns `event_time`, `exception_code`, `exception`, `query` all exist, and `'ExceptionWhileProcessing'` is a valid value for the `type` enum.
- The `system.errors` query is correct: columns `name`, `code`, `value`, `last_error_time`, `last_error_message` all exist.
- The default error log path `/var/log/clickhouse-server/clickhouse-server.err.log` is correct per the default `config.xml`.
