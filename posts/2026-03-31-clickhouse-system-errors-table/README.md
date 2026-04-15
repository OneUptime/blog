# How to Use system.errors Table in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.errors, Error Monitoring, Observability, System Table, Debugging

Description: Query system.errors to get a count of each error code encountered since server startup and find the most recent error message for each type in ClickHouse.

---

When ClickHouse encounters errors - from network failures and bad queries to replication issues - they are tracked internally by error code. The `system.errors` table aggregates these into a per-error-code count with the most recent occurrence and message, making it a fast first stop for error investigation.

## What is system.errors?

`system.errors` contains one row per error code that has occurred since the server started (or since counters were last reset). Key columns:

- `name` - error name (e.g., `MEMORY_LIMIT_EXCEEDED`, `TOO_MANY_PARTS`)
- `code` - numeric error code
- `value` - total count of this error since server start
- `last_error_time` - when this error last occurred
- `last_error_message` - full message from the most recent occurrence
- `last_error_trace` - stack trace from the last occurrence (array of memory addresses)
- `remote` - whether the error was from a remote server

## Basic Error Overview

```sql
SELECT
    name,
    code,
    value    AS total_count,
    last_error_time,
    last_error_message
FROM system.errors
WHERE value > 0
ORDER BY value DESC
LIMIT 30;
```

## Finding Recent Errors

```sql
SELECT
    name,
    value,
    last_error_time,
    last_error_message
FROM system.errors
WHERE last_error_time > now() - INTERVAL 1 HOUR
ORDER BY last_error_time DESC;
```

## Checking for Critical Error Types

```sql
SELECT
    name,
    value,
    last_error_time,
    last_error_message
FROM system.errors
WHERE name IN (
    'MEMORY_LIMIT_EXCEEDED',
    'TOO_MANY_PARTS',
    'CANNOT_READ_ALL_DATA',
    'CORRUPTED_DATA',
    'KEEPER_EXCEPTION',
    'REPLICA_IS_ALREADY_ACTIVE',
    'TABLE_IS_READ_ONLY'
)
  AND value > 0
ORDER BY value DESC;
```

## Monitoring Remote Errors

Errors from distributed queries on remote shards:

```sql
SELECT
    name,
    value,
    remote,
    last_error_time,
    last_error_message
FROM system.errors
WHERE remote = 1
  AND value  > 0
ORDER BY last_error_time DESC;
```

## Getting the Stack Trace

For debugging a specific error type:

```sql
SELECT
    name,
    last_error_message,
    arrayStringConcat(arrayMap(x -> demangle(addressToSymbol(x)), last_error_trace), '\n') AS stack_trace
FROM system.errors
WHERE name = 'MEMORY_LIMIT_EXCEEDED';
```

## Comparing with system.query_log

`system.errors` shows aggregated error counts by type. For individual query failures with full context, use `system.query_log`:

```sql
SELECT
    query_id,
    event_time,
    exception_code,
    exception,
    query
FROM system.query_log
WHERE type IN ('ExceptionBeforeStart', 'ExceptionWhileProcessing')
  AND event_time > now() - INTERVAL 1 HOUR
ORDER BY event_time DESC
LIMIT 20;
```

## Resetting Error Counters

Error counters reset on server restart. There is no SQL command to reset individual counters without restarting.

## Summary

`system.errors` provides a quick aggregated view of all error types that have occurred since server startup in ClickHouse. Use it to identify the most frequent error types, check for critical failures like `TOO_MANY_PARTS` or `MEMORY_LIMIT_EXCEEDED`, and get the latest stack trace for debugging. Pair it with `system.query_log` for per-query error details.
