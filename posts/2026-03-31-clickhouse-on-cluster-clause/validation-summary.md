# Validation Summary: How to Use ON CLUSTER Clause in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (ON CLUSTER clause, Distributed DDL)
- ReplicatedMergeTree engine
- Distributed table engine
- ZooKeeper / ClickHouse Keeper
- system.clusters table

## Sources Consulted
- ClickHouse documentation on Distributed DDL: https://clickhouse.com/docs/en/sql-reference/distributed-ddl
- ClickHouse documentation on CREATE TABLE: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse documentation on ALTER TABLE: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse documentation on ReplicatedMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse documentation on Distributed engine: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse documentation on system.clusters: https://clickhouse.com/docs/en/operations/system-tables/clusters
- ClickHouse 20.4 changelog (RENAME COLUMN introduction)

## Issues Found
- **Incorrect version for RENAME COLUMN**: The post stated RENAME COLUMN was available from "ClickHouse 22.x+" but the feature was introduced in ClickHouse 20.4 (released in 2020). Corrected the comment to "ClickHouse 20.4+".

## Review Notes
- The `ReplicatedMergeTree(...)` placeholder in the timeout section is clearly pseudocode and acceptable in context.
- The post correctly advises dropping Distributed tables before local tables, which is good operational guidance.
- The macros reference mentions `macros.xml` specifically; macros can also be defined in other config files or the main config, but `macros.xml` is the conventional location, so this is acceptable.
- The `distributed_ddl_task_timeout` default is 180 seconds; the post's suggestion of 600 seconds for large clusters is reasonable.
