# Validation Summary: How to Use system.distribution_queue in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables, Distributed table engine)
- SQL
- `system.distribution_queue` system table
- `SYSTEM FLUSH DISTRIBUTED` command

## Sources Consulted
- [system.distribution_queue | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/distribution_queue)
- [Distributed Table Engine | ClickHouse Docs](https://clickhouse.com/docs/engines/table-engines/special/distributed)
- [SYSTEM Statements | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/system)
- [Session Settings | ClickHouse Docs](https://clickhouse.com/docs/operations/settings/settings)

## Issues Found

### 1. Incorrect column names throughout all SQL queries (Critical)
Six out of ten column names used in the post do not exist in `system.distribution_queue`:

| Blog Used | Corrected To | Notes |
|---|---|---|
| `is_currently_sending` | `is_blocked` | Semantics also differ: `is_blocked` means sending is blocked, not that it's actively sending |
| `num_tries` | `error_count` | Tracks number of errors, not delivery attempts |
| `last_attempt_time` | `last_exception_time` | Only exception timestamp exists |
| `next_attempt_time` | *(removed)* | Column does not exist in the table at all |
| `rows` | *(removed)* | No row-count column exists; used `data_files` instead |
| `bytes` | `data_compressed_bytes` | The actual column tracks compressed bytes |

All SQL queries in the post were updated to use the correct column names. The "Basic Query", "Monitor Queue Depth", "Identify Failed Deliveries", "Check Currently Sending Files", and "Understanding Retry Logic" sections were all affected.

### 2. Section title and description mismatch due to `is_blocked` semantics
The "Check Currently Sending Files" section was renamed to "Check Blocked Deliveries" since `is_blocked = 1` indicates sending is blocked (e.g., due to errors), not that files are actively in transit. The description was updated accordingly.

### 3. Deprecated setting names
The settings `distributed_directory_monitor_sleep_time_ms` and `distributed_directory_monitor_batch_inserts` are legacy names. Updated to the current names:
- `distributed_directory_monitor_sleep_time_ms` -> `distributed_background_insert_sleep_time_ms`
- `distributed_directory_monitor_batch_inserts` -> `distributed_background_insert_batch`

### 4. Removed incorrect claim about exponential backoff
The post stated ClickHouse uses "exponential backoff" for retries. Changed to "retries automatically" since the exact retry strategy is implementation-dependent and the table doesn't expose a `next_attempt_time` column.

### 5. Removed `next_attempt_time` from retry logic table
The column does not exist in `system.distribution_queue`, so it was removed from the reference table in the "Understanding Retry Logic" section.

## Review Notes
- The `SYSTEM FLUSH DISTRIBUTED` command syntax is correct.
- The overall structure and advice in the post is sound -- monitoring the distribution queue is genuinely useful for ClickHouse cluster operations.
- The old setting names (`distributed_directory_monitor_*`) still work as aliases for backward compatibility, but the post now uses the current names to follow best practices.
- The `Monitor Queue Depth` query was simplified to use `sum(data_files)` and `sum(data_compressed_bytes)` since per-row granularity columns (`rows`) don't exist; each row in `system.distribution_queue` represents a directory entry per shard, not individual files.
