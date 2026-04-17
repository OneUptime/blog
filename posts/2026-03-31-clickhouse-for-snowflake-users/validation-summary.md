# Validation Summary: ClickHouse for Snowflake Users - Key Differences

## Status
validated

## Post Type
Guide / Migration comparison

## Technologies Covered
- ClickHouse (SQL, MergeTree, ReplacingMergeTree, JSON type, SETTINGS, LowCardinality)
- Snowflake (Virtual Warehouses, VARIANT type, Clustering Keys, Time Travel, DATEADD / DATE_TRUNC)
- SQL (ANSI date functions, DDL)

## Sources Consulted
- ClickHouse docs - SQL Reference, SETTINGS clause: https://clickhouse.com/docs/en/sql-reference/statements/select/
- ClickHouse docs - max_threads setting: https://clickhouse.com/docs/en/operations/settings/settings#max_threads
- ClickHouse docs - JSON type: https://clickhouse.com/docs/en/sql-reference/data-types/newjson
- ClickHouse docs - MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse docs - date/time functions (toStartOfHour, now): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- Snowflake docs - USE WAREHOUSE: https://docs.snowflake.com/en/sql-reference/sql/use-warehouse
- Snowflake docs - VARIANT and path-based access: https://docs.snowflake.com/en/sql-reference/data-types-semistructured
- Snowflake docs - DATEADD / DATE_TRUNC: https://docs.snowflake.com/en/sql-reference/functions/dateadd
- Snowflake docs - Clustering keys: https://docs.snowflake.com/en/user-guide/tables-clustering-keys
- Snowflake docs - Time Travel (up to 90 days on Enterprise+): https://docs.snowflake.com/en/user-guide/data-time-travel

## Issues Found
- **Invalid ClickHouse hint syntax**: The post included `SELECT /*+ MAX_THREADS(16) */ count() FROM events;`. ClickHouse does not support Oracle/MySQL-style optimizer hint comments; `/*+ ... */` is treated as a regular comment and the setting is ignored. Replaced with the correct `SELECT count() FROM events SETTINGS max_threads = 16;` syntax, which is the documented per-query override mechanism in ClickHouse.
- **Misleading Snowflake warehouse example**: `USE WAREHOUSE LARGE;` paired with the comment "set warehouse size per session" could imply `LARGE` is a size keyword. `USE WAREHOUSE` takes a warehouse *name*, not a size. Renamed the warehouse identifier to `ANALYTICS_LARGE` and updated the comment to "switch to a named warehouse for the session" to accurately reflect Snowflake semantics.
- **JSON type version claim**: The post said the dot-access syntax works with "ClickHouse 22.6+". While the experimental `Object('json')` type landed in 22.x, the production-ready new `JSON` data type (which supports the dot-path access shown) was generally available from ClickHouse 24.8. Updated the comment to "production-ready in ClickHouse 24.8+" for accuracy.

## Review Notes
- The Snowflake Time Travel claim of "up to 90 days" is correct for Enterprise Edition and above; the Standard Edition limit is 1 day. The post does not explicitly mention this edition distinction, but the 90-day figure is the maximum, so the statement is not inaccurate.
- Cost comparisons ("3-10x cheaper") are directional and workload-dependent; there is no authoritative single source, but the range aligns with commonly cited benchmarks for continuous high-throughput analytical workloads and is a reasonable generalization.
- All other code examples (Snowflake DATEADD/DATE_TRUNC, ClickHouse `now() - INTERVAL 7 DAY`, `toStartOfHour`, `JSONExtractString`, Snowflake VARIANT `:path::TYPE` notation, `ALTER TABLE ... CLUSTER BY`, ClickHouse `MergeTree` `ORDER BY` DDL, `LowCardinality(String)`, `UInt32`, `DateTime`) are syntactically correct and current.
