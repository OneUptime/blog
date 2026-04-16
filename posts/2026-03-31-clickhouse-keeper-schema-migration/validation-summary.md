# Validation Summary: How to Use ClickHouse Keeper for Schema Migration Coordination

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- ClickHouse (replicated tables, ON CLUSTER DDL)
- ClickHouse Keeper / ZooKeeper coordination
- `system.distributed_ddl_queue`, `system.replicas`, `system.replication_queue`
- `clickhouse-keeper-client` CLI
- `distributed_ddl_task_timeout` setting

## Sources Consulted
- ClickHouse `system.distributed_ddl_queue` reference: https://clickhouse.com/docs/en/operations/system-tables/distributed_ddl_queue
- ClickHouse `clickhouse-keeper-client` utility docs: https://clickhouse.com/docs/en/operations/utilities/clickhouse-keeper-client
- ClickHouse session settings (`distributed_ddl_task_timeout`): https://clickhouse.com/docs/operations/settings/settings
- Altinity Knowledge Base — DDLWorker and DDL queue problems: https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-ddlworker/
- ClickHouse `system.replicas` and `system.replication_queue` references on clickhouse.com/docs

## Issues Found
1. **Wrong column name `entry_time`** in two queries on `system.distributed_ddl_queue`. The actual column is `query_create_time`. Replaced both occurrences (Step 3 monitoring query and the "Cancelling a Stuck DDL Task" query).
2. **Non-existent columns `num_hosts_total`, `num_hosts_finished`, `num_hosts_active`** referenced in the "Fields of interest" bullets and the Step 3 SELECT list. The `system.distributed_ddl_queue` table has one row per host per query and does not have these aggregate columns. Rewrote the field list to describe `host`/`port` semantics and rewrote the Step 3 query to select `host`, `port`, `status`, `exception_code`, and `exception_text`. Also reworded the "Handling a Stuck DDL" lead-in to use the actual per-row status indicator.
3. **Incorrect `status` enum values.** The post listed `Active`, `Finished`, `Failed`. The real enum is `Inactive`, `Active`, `Finished`, `Removing`, `Unknown`; failures appear as `Finished` rows with a non-zero `exception_code`. Updated the bullet point accordingly.
4. **Wrong `clickhouse-keeper-client` port (2181).** The default Keeper client port is `9181` (port 2181 is the ZooKeeper default). Changed both `--port 2181` invocations to `--port 9181`.
5. **Incorrect default for `distributed_ddl_task_timeout`.** The post claimed ClickHouse "waits indefinitely" by default. The default is 180 seconds; `0` means no wait and a negative value means wait forever. Updated the wording to reflect this.

## Review Notes
- `system.replicas` query columns (`database`, `table`, `is_leader`, `total_replicas`, `active_replicas`, `is_readonly`) are all valid.
- `system.replication_queue` `type = 'ALTER_METADATA'` and `create_time` are valid.
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ... CODEC(LZ4) AFTER country` and `MODIFY COLUMN IF EXISTS` syntaxes are valid in current ClickHouse.
- The default Keeper DDL queue path `/clickhouse/task_queue/ddl` is correct (it can be overridden via the `<distributed_ddl><path>` server setting).
- `clickhouse-keeper-client` documents short flags `-h` / `-p`; the long forms `--host` / `--port` work in current builds, so left as-is for readability.
- The `rmr` command exists in `clickhouse-keeper-client` and recursively deletes a subtree, but it requires the subtree size to be under a safety limit; the post's caveat to only remove tasks after manually applying the DDL is appropriate.
