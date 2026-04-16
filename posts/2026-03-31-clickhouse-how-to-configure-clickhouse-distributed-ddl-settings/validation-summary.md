# Validation Summary: How to Configure ClickHouse Distributed DDL Settings

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- ClickHouse (distributed DDL, `ON CLUSTER`)
- ZooKeeper / ClickHouse Keeper (DDL task queue coordination)
- ReplicatedMergeTree / MergeTree table engines
- `system.distributed_ddl_queue` system table
- `<distributed_ddl>` and `<remote_servers>` server configuration sections

## Sources Consulted
- [system.distributed_ddl_queue | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/distributed_ddl_queue)
- [Server Settings | ClickHouse Docs](https://clickhouse.com/docs/operations/server-configuration-parameters/settings)
- [Replicating data | ClickHouse Docs](https://clickhouse.com/docs/architecture/replication)
- [Replication + scaling | ClickHouse Docs](https://clickhouse.com/docs/architecture/cluster-deployment)
- [DDLWorker and DDL queue problems | Altinity KB](https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-ddlworker/)

## Issues Found

1. **Wrong column names in `system.distributed_ddl_queue` queries.** The post used `create_time` and `finish_time`, but the actual ClickHouse columns are `query_create_time` and `query_finish_time`. Fixed in all three SELECT examples (Monitoring, Check for failed tasks, Handling DDL on Unavailable Nodes).

2. **Inaccurate description of `task_max_lifetime`.** The post described it as "How long to wait for all cluster nodes to complete DDL", but this setting is actually the TTL for entries in the DDL task queue — tasks older than this are deleted during cleanup. Updated the inline comment to reflect the correct meaning.

3. **Invalid session setting `allow_distributed_ddl`.** The "Disabling Distributed DDL for a Session" section showed `SET allow_distributed_ddl = 0;`, but there is no such session-level setting in ClickHouse. The correct way to run local-only DDL is simply to omit `ON CLUSTER`. To block distributed DDL for a specific cluster, the cluster-level XML setting is `<allow_distributed_ddl_queries>false</allow_distributed_ddl_queries>` inside `<remote_servers>`. Rewrote the section to show both approaches correctly and renamed it from "for a Session" to "for a Cluster".

## Review Notes
- The `<distributed_ddl>` keys used (`path`, `task_max_lifetime`, `max_tasks_in_queue`, `cleanup_delay_period`) and their default values (604800, 1000, 60) are correct per ClickHouse documentation.
- The `distributed_ddl_task_timeout` session setting is correct and commonly used.
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` idempotent DDL patterns are valid ClickHouse syntax.
- The ZooKeeper task queue default path `/clickhouse/task_queue/ddl` matches ClickHouse defaults, and advice about using distinct paths when sharing a ZooKeeper ensemble across clusters is sound.
- Future improvement: the post could mention `pool_size` (number of DDL worker threads) in the `<distributed_ddl>` block, and the `distributed_ddl_output_mode` setting which controls how per-host results are returned to the client. These were not incorrect omissions, just additional useful settings.
