# Validation Summary: How to Use system.query_log for Query Auditing in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system.query_log table)
- ClickHouse server configuration (config.xml)
- ClickHouse SQL (aggregate functions, arrayJoin, ILIKE, clusterAllReplicas)
- MergeTree engine (TTL, partitioning)

## Sources Consulted
- ClickHouse official documentation: system.query_log table (https://clickhouse.com/docs/en/operations/system-tables/query_log)
- ClickHouse source code: `src/Interpreters/QueryLog.cpp` — column definitions and types
- ClickHouse source code: `programs/server/config.xml` — default query_log configuration
- ClickHouse source code: `src/Parsers/IAST.h` — QueryKind enum values
- ClickHouse official documentation: clusterAllReplicas() table function
- ClickHouse official documentation: server configuration parameters for query_log

## Issues Found

### 1. Incorrect column name: `peak_memory_usage` (schema table and slow queries SQL)
- **What was wrong:** The post referenced a column `peak_memory_usage` in the schema table and in the "Find slow queries" SQL example. The actual column in `system.query_log` is `memory_usage` (UInt64).
- **What was changed:** Replaced `peak_memory_usage` with `memory_usage` in the schema table (line 35) and in the slow queries SQL (line 101). Updated the description from "Peak RAM used" to "Memory consumed by the query" to match the official documentation.
- **Why:** Using `peak_memory_usage` would cause an "Unknown column" error. The correct column has always been `memory_usage` in `system.query_log`.

### 2. Incorrect column name: `client_address` (schema table and 3 SQL queries)
- **What was wrong:** The post referenced a column `client_address` (IPv6) in the schema table and in three SQL queries (Who ran queries, DDL audit, INSERT audit). The actual column in `system.query_log` is `address` (IPv6). ClickHouse has `client_hostname` and `client_name` but the IP address column is simply `address`.
- **What was changed:** Replaced `client_address` with `address` in the schema table (line 29) and all three SQL queries (lines 66, 73, 148, 169). Updated the description from "Client IP address" to "IP address used to make the query" to match the official documentation.
- **Why:** Using `client_address` would cause an "Unknown column" error. The correct column is `address`.

## Review Notes
- The schema table lists types as simplified forms (e.g., `String` instead of `LowCardinality(String)`, `Array(String)` instead of `Array(LowCardinality(String))`). This is an acceptable simplification for a tutorial-level post.
- The `type` column is listed as `Enum` but is technically `Enum8` in ClickHouse. This is a minor simplification that does not affect correctness.
- The DDL audit query uses `ILIKE` patterns on the `query` column to filter DDL statements. ClickHouse also provides a `query_kind` column (with values like `Create`, `Alter`, `Drop`, `Rename`) that would be a more robust alternative for this use case. This is not an error but a potential improvement.
- Columns `written_bytes` and `event_date` are used in SQL queries but not listed in the "Key columns" schema table. This is acceptable since the table is explicitly labeled as "Key columns," not a complete schema reference.
- The `countDistinct()` function works in ClickHouse via the aggregate function combinator mechanism, mapping to `uniqExact()` by default. This is correct.
- All configuration XML options (`flush_interval_milliseconds`, `max_size_rows`, `reserved_size_rows`, `buffer_size_rows_flush_threshold`, `flush_on_crash`, `ttl`) are verified as valid for the `<query_log>` section in recent ClickHouse versions.
