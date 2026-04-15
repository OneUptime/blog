# Validation Summary: How to Use ON CLUSTER Clause for Distributed DDL in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (distributed DDL, ON CLUSTER clause)
- ZooKeeper (DDL task queue coordination)
- ReplicatedMergeTree engine
- Distributed table engine
- Atomic database engine (EXCHANGE TABLES)

## Sources Consulted
- ClickHouse source code `src/Core/Settings.cpp` — confirmed `distributed_ddl_task_timeout` default of 180 and `distributed_ddl_output_mode` default of `throw` (https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Settings.cpp)
- ClickHouse official docs — Distributed DDL Queries (https://clickhouse.com/docs/sql-reference/distributed-ddl)
- ClickHouse official docs — system.distributed_ddl_queue table (https://clickhouse.com/docs/operations/system-tables/distributed_ddl_queue)
- ClickHouse official docs — EXCHANGE statement (https://clickhouse.com/docs/sql-reference/statements/exchange)
- ClickHouse official docs — TRUNCATE statement (https://clickhouse.com/docs/managing-data/truncate)
- Altinity Knowledge Base — DDLWorker (https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-ddlworker/)

## Issues Found

1. **`distributed_ddl_task_timeout` default value was wrong**: The blog stated the default is `task_max_lifetime` in a SQL comment. The actual default is **180 seconds**, confirmed from ClickHouse source code (`DECLARE(Int64, distributed_ddl_task_timeout, 180, ...)`). Fixed the comment to reflect the correct default.

2. **Handling Failures section inaccurately described default behavior**: The blog stated "By default, ON CLUSTER waits for all nodes but continues if some fail." The actual default behavior (with `distributed_ddl_output_mode = throw`) is to **throw an exception** if any node fails or if the timeout is exceeded. Rewrote the section to accurately describe the timeout-based behavior and exception throwing.

3. **`distributed_ddl_task_timeout = 0` description was misleading**: The blog described setting it to 0 as "Continue even if some nodes fail or are unreachable" and "fire and forget." The actual behavior is **async mode** — the statement returns immediately without waiting for any node to complete. The DDL is still queued and executed by nodes in the background. Clarified the description to accurately reflect async mode.

4. **EXCHANGE TABLES version claim was inaccurate**: The blog stated "ClickHouse 22.6+" for EXCHANGE TABLES. This feature was introduced alongside the Atomic database engine (available well before 22.6, default since 21.12). Replaced the version claim with the actual requirement: "requires Atomic database engine." Also added a note that Atomic has been the default database engine since ClickHouse 21.12.

## Review Notes
- The `distributed_ddl_output_mode` setting (default `throw`) controls how failures are reported and could be mentioned for completeness, but the current level of detail is appropriate for a tutorial.
- The JSON column type used in the `MODIFY COLUMN properties JSON` example is technically valid but version-dependent — it became the `JSON` type in newer ClickHouse versions (24.1+). In older versions, the equivalent was `Object('json')` which was experimental. This is acceptable for a current tutorial.
- The `system.distributed_ddl_queue` column names and status enum values (`Active`, `Finished`) were verified as correct against official documentation.
- All SQL syntax (CREATE, ALTER, DROP, TRUNCATE, RENAME with ON CLUSTER) was verified as valid.
- The XML configuration structure for `distributed_ddl` is correct with valid parameter names.
