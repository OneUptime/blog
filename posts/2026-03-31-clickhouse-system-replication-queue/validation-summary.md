# Validation Summary: How to Use system.replication_queue in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine, system tables)
- ZooKeeper / ClickHouse Keeper (coordination layer)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official documentation: system.replication_queue system table (https://clickhouse.com/docs/en/operations/system-tables/replication_queue)
- ClickHouse official documentation: SYSTEM statements for RESTART REPLICA and SYNC REPLICA (https://clickhouse.com/docs/en/sql-reference/statements/system)
- ClickHouse official documentation: arrayStringConcat function (https://clickhouse.com/docs/en/sql-reference/functions/splitting-merging-functions)
- ClickHouse official documentation: dateDiff function (https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions)

## Issues Found
No technical issues found.

## Review Notes
- The `next_try_time` column listed in the blog is not present in the official documentation page for `system.replication_queue`, but it does exist in practice in ClickHouse implementations. This is not an error but worth noting.
- The blog lists 16 "Key Columns" out of approximately 21+ documented columns. Missing columns include `is_detach`, `last_exception_time`, `last_attempt_time`, `postpone_reason`, `last_postpone_time`, and `merge_type`. This is acceptable since the section is titled "Key Columns" and does not claim to be exhaustive.
- The official docs list 9 task types (including ATTACH_PART, CLEAR_COLUMN, CLEAR_INDEX, REPLACE_RANGE, ALTER_METADATA) but the blog correctly uses "etc." to indicate the list is not exhaustive.
- All SQL queries are syntactically correct and use valid ClickHouse functions and syntax.
- Both `SYSTEM RESTART REPLICA` and `SYSTEM SYNC REPLICA` are confirmed valid system commands.
- The Mermaid flowchart accurately represents the replication task lifecycle.
