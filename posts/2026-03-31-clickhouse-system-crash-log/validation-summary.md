# Validation Summary: How to Use system.crash_log in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables, crash diagnostics)
- SQL (ClickHouse dialect)
- Linux system administration (dmesg, journalctl, systemd)
- POSIX signals

## Sources Consulted
- ClickHouse official documentation for system.crash_log: https://clickhouse.com/docs/en/operations/system-tables/crash-log
- ClickHouse source code (`src/Interpreters/CrashLog.cpp` and `CrashLog.h`) for authoritative column schema
- POSIX signal number definitions (signal.h) for Linux x86_64

## Issues Found

### 1. Fabricated column `terminate_reason` (Critical)
- **What was wrong:** The post listed `terminate_reason` (String) as a column and used it in SQL queries. This column does not exist in `system.crash_log`.
- **What was changed:** Replaced `terminate_reason` with `signal_description` (String), which is the actual column providing a human-readable description of the signal.
- **Why:** Queries referencing `terminate_reason` would fail with a "column not found" error.

### 2. Fabricated column `stack_trace` (Critical)
- **What was wrong:** The post listed `stack_trace` (String) as a column and used it in multiple SQL queries. This column does not exist. The actual stack trace data is stored in `trace` (Array(UInt64)) for raw addresses and `trace_full` (Array(String)) for symbolized frames.
- **What was changed:** Updated the Key Columns table to list both `trace` and `trace_full` with correct types. Updated SQL queries to use `arrayStringConcat(trace_full, '\n') AS stack_trace` for readable output. Updated the Summary section reference.
- **Why:** Queries referencing `stack_trace` would fail. Using `arrayStringConcat` on `trace_full` provides the same readable output the author intended.

## Review Notes
- The Key Columns table omits several real columns (`hostname`, `signal_code`, `query`, `fault_address`, `fault_access_type`, `current_exception_trace_full`, `git_hash`, `architecture`). This is acceptable for a tutorial focused on the most useful columns, but readers should consult official docs for the full schema.
- The reference to `system.error_log` in the introduction should be verified — older ClickHouse versions may not have this table (the long-standing table is `system.errors`).
- Signal numbers are correct for Linux x86_64/ARM but may differ on exotic platforms; this is a reasonable assumption for a blog post.
- The JOIN between `system.crash_log` and `system.query_log` on `query_id` is valid, though note that if the crash killed the server mid-query, only a `QueryStart` entry (not `QueryFinish`) may exist in `query_log` — the query's filter correctly includes both types.
