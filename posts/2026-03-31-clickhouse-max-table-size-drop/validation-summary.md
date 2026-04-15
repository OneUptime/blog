# Validation Summary: How to Configure ClickHouse Max Table Size to Drop

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (server configuration, safety settings)
- ClickHouse system tables (`system.parts`, `system.query_log`)
- ClickHouse XML configuration format (`config.d`)

## Sources Consulted
- ClickHouse Server Settings documentation — https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse `system.parts` documentation — https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse `system.query_log` documentation — https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse Configuration Files documentation — https://clickhouse.com/docs/operations/configuration-files
- ClickHouse source code: `src/Common/ErrorCodes.cpp` (error code definitions)
- ClickHouse source code: `src/Interpreters/Context.cpp` (flag file logic and `checkCanBeDropped`)
- ClickHouse source code: `src/Interpreters/InterpreterDropQuery.cpp` (TRUNCATE handling)
- ClickHouse source code: `src/Storages/MergeTree/MergeTreeData.cpp` (partition vs table size checks)

## Issues Found

1. **Incorrect error code**: The error message example showed `Code: 62`, but error code 62 is `SYNTAX_ERROR`. The correct error code for exceeding the max drop size is **359** (`TABLE_SIZE_EXCEEDS_MAX_DROP_SIZE_LIMIT`). Fixed the error code in the example output.

2. **Fabricated "5 minutes" time limit on flag file**: The post claimed the `force_drop_table` flag file must be used within 5 minutes. No such time limit exists in the ClickHouse source code — the `checkCanBeDropped` function simply checks if the file exists and removes it upon a successful drop. There is no timestamp or modification-time validation. Removed all "within 5 minutes" references.

3. **Misleading mermaid diagram**: The flowchart routed both DROP TABLE and DROP PARTITION through a single `max_table_size_to_drop` check. In reality, `DROP TABLE` and `TRUNCATE TABLE` are checked against `max_table_size_to_drop`, while `DROP PARTITION` is checked against `max_partition_size_to_drop` via a separate code path (`checkPartitionCanBeDropped`). Updated the diagram to show both paths correctly.

## Review Notes
- The default values (50 GB / 53,687,091,200 bytes), the 500 GB calculation (536,870,912,000 bytes), and the behavior of setting the value to 0 are all correct.
- The XML configuration format using `<clickhouse>` as the root element is current and correct.
- The `system.parts` query using `bytes_on_disk` and `active` filter is correct.
- The `system.query_log` query using `type = 'QueryFinish'` and `query_kind` is correct.
- The flag file path `/var/lib/clickhouse/flags/force_drop_table` and its auto-removal behavior are confirmed by the source code.
- TRUNCATE TABLE being checked against `max_table_size_to_drop` is confirmed by the source code.
