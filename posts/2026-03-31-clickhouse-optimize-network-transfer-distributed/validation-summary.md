# Validation Summary: How to Optimize Network Transfer in Distributed ClickHouse Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Distributed engine, MergeTree family)
- ClickHouse SQL dialect (PREWHERE, SAMPLE, toYYYYMM, formatReadableSize)
- ClickHouse system tables (system.settings, system.query_log)
- LZ4 and ZSTD compression for inter-shard network traffic

## Sources Consulted
- ClickHouse documentation on Distributed table engine: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse documentation on PREWHERE clause: https://clickhouse.com/docs/en/sql-reference/statements/select/prewhere
- ClickHouse documentation on SAMPLE clause: https://clickhouse.com/docs/en/sql-reference/statements/select/sample
- ClickHouse documentation on network_compression_method setting: https://clickhouse.com/docs/en/operations/settings/settings#network_compression_method
- ClickHouse documentation on system.query_log and ProfileEvents: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse documentation on formatReadableSize function: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize
- ClickHouse documentation on toYYYYMM function: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#toyyyymm
- ClickHouse source code (src/Common/ProfileEvents.cpp) for ProfileEvent names

## Issues Found
1. **PREWHERE used directly on a Distributed table**: The original post used an explicit `PREWHERE` clause on `dist_events`, which is a Distributed table. PREWHERE is only supported by MergeTree family tables and will throw `ILLEGAL_PREWHERE` on a Distributed table. Fixed by replacing the explicit PREWHERE with a standard WHERE clause and explaining that ClickHouse automatically applies PREWHERE optimization on each shard's local MergeTree table via the `optimize_move_to_prewhere` setting (enabled by default).

## Review Notes
- The `SAMPLE` clause requires the underlying local MergeTree tables to have been created with a sampling expression (e.g., `SAMPLE BY intHash32(user_id)`). The post does not mention this prerequisite. If the tables lack a sampling key, `SAMPLE 0.1` will fail. This is not incorrect per se, but readers may hit this issue in practice.
- The `SET network_compression_method` example is valid syntax, but this is typically configured at the client or server profile level rather than mid-session. It will affect subsequent queries in the session, so the example works, but readers should be aware it is more commonly set in configuration files or client startup flags.
- All ProfileEvent names (`NetworkSendBytes`, `NetworkReceiveBytes`) were verified against ClickHouse source code and are correct.
- The `toYYYYMM()` function correctly returns `UInt32`, making the comparison to integer `202501` valid.
- The `formatReadableSize()` function correctly accepts `UInt64` from the ProfileEvents map.
