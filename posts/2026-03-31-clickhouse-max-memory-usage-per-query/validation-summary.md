# Validation Summary: How to Set max_memory_usage per Query in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (query settings, memory management, system tables)
- SQL (ClickHouse SQL dialect)
- XML configuration (users.xml profiles)

## Sources Consulted
- ClickHouse documentation — Restrictions on query complexity: https://clickhouse.com/docs/operations/settings/query-complexity
- ClickHouse documentation — Server configuration parameters (max_server_memory_usage): https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse documentation — system.processes: https://clickhouse.com/docs/operations/system-tables/processes
- ClickHouse documentation — system.query_log: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse documentation — GROUP BY clause (external aggregation): https://clickhouse.com/docs/sql-reference/statements/select/group-by
- ClickHouse documentation — formatReadableSize function: https://clickhouse.com/docs/sql-reference/functions/other-functions
- ClickHouse documentation — Date and time functions (today): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse knowledgebase — Memory limit exceeded for query: https://clickhouse.com/docs/knowledgebase/memory-limit-exceeded-for-query

## Issues Found
1. **Incorrect server-level setting name**: The post originally referred to "the server-level `max_memory_usage` (in `config.xml`)" as the setting that controls memory for the entire ClickHouse process. This is incorrect. The server-level memory setting is `max_server_memory_usage`, not `max_memory_usage`. The `max_memory_usage` setting is exclusively a per-query setting (configurable in user profiles, sessions, or inline). Fixed both the introductory paragraph and the "Understanding Per-Query vs Server-Level Memory Limits" section to use the correct `max_server_memory_usage` name.

## Review Notes
- All SQL examples are syntactically correct and use valid ClickHouse functions and system table columns.
- Error code 241 (MEMORY_LIMIT_EXCEEDED) is accurate.
- The `system.processes` table columns (`query_id`, `user`, `memory_usage`, `query`) and `system.query_log` columns (`query_id`, `user`, `memory_usage`, `query`, `type`, `event_date`) are all confirmed correct.
- `formatReadableSize()` is a valid built-in function.
- `type = 'QueryFinish'` and `event_date = today()` are valid query patterns for `system.query_log`.
- The `max_bytes_before_external_group_by` setting name and behavior description are correct. The ClickHouse docs recommend setting it to roughly half of `max_memory_usage` — the blog's example of 5 GB external group by with 10 GB max_memory_usage aligns with this recommendation.
- The `users.xml` profile configuration format is correct.
