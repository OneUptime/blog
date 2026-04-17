# Validation Summary: How to Configure Distributed DDL in ClickHouse Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (server, distributed DDL, ON CLUSTER syntax)
- ClickHouse Keeper (and ZooKeeper as the alternative)
- ReplicatedMergeTree engine
- `clickhouse-keeper-client` CLI
- `system.distributed_ddl_queue` system table

## Sources Consulted
- [ClickHouse Docs — system.distributed_ddl_queue](https://clickhouse.com/docs/en/operations/system-tables/distributed_ddl_queue)
- [ClickHouse Docs — Server Configuration: distributed_ddl](https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#distributed_ddl)
- [ClickHouse Docs — clickhouse-keeper-client utility](https://clickhouse.com/docs/en/operations/utilities/clickhouse-keeper-client)
- [ClickHouse Docs — Session Settings (distributed_ddl_task_timeout)](https://clickhouse.com/docs/en/operations/settings/settings)
- [Altinity KB — DDLWorker and DDL queue problems](https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-ddlworker/)

## Issues Found
1. **Invalid configuration parameter `cleanup_max_deleted_entries`** — this is not a documented ClickHouse `<distributed_ddl>` setting. Replaced with `max_tasks_in_queue` (default 1000), which is the actual queue-bounding setting documented for the section. Updated both the XML snippet and the bullet description.
2. **Wrong column name `exception` in `system.distributed_ddl_queue`** — the actual column is `exception_text` (alongside `exception_code`). Updated the SELECT statement accordingly.
3. **Invalid status value `'Waiting'`** — the `status` column is an Enum8 with values `Inactive`, `Active`, `Finished`, `Removing`, `Unknown`. Updated the explanatory sentence to use `'Inactive'`, which per the docs means "loaded to the queue, but not yet executed" — matching the author's intent.
4. **Invalid `clickhouse-keeper-client` command `deleteall`** — that is a `zkCli.sh` (ZooKeeper) command, not a `clickhouse-keeper-client` command. The correct recursive-removal command is `rmr` (or `rm` for non-recursive). Replaced `deleteall` with `rmr`, and also wrapped the commands in `-q "..."` form which is the standard non-interactive invocation for `clickhouse-keeper-client`.

## Review Notes
- The DDL path `/clickhouse/task_queue/ddl`, the `path`, `cleanup_delay_period`, and `task_max_lifetime` defaults are correct.
- `pool_size` with default 1 controls how many `ON CLUSTER` queries can run concurrently on a node; setting it to 0 to "disable" the DDL worker is a workaround that does prevent task processing, but it is not formally documented as a disable mechanism. A cleaner approach for maintenance is removing the node from the cluster definition. Left as-is because the post's description is technically accurate.
- The default of `distributed_ddl_task_timeout` is 180 seconds (the post sets it to 300 explicitly, which is fine and not a default claim).
- `rmr` requires confirmation by default and has a subtree-size safety limit (default 100); operators should be aware of the prompt when running it interactively.
