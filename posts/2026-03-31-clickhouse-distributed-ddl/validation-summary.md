# Validation Summary: How to Use distributed_ddl_task_timeout in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (distributed DDL, `ON CLUSTER` DDL operations)
- ClickHouse server/profile configuration (XML)
- ZooKeeper (as DDL task queue backend)
- `ReplicatedMergeTree` table engine
- ClickHouse system tables (`system.settings`, `system.distributed_ddl_queue`, `system.clusters`)

## Sources Consulted
- [ClickHouse docs — system.distributed_ddl_queue](https://clickhouse.com/docs/en/operations/system-tables/distributed_ddl_queue)
- [ClickHouse docs — Session Settings (distributed_ddl_task_timeout, distributed_ddl_output_mode)](https://clickhouse.com/docs/operations/settings/settings)
- [ClickHouse docs — system.clusters](https://clickhouse.com/docs/operations/system-tables/clusters)
- [ClickHouse docs — Server Configuration Parameters](https://clickhouse.com/docs/operations/server-configuration-parameters/settings)
- [Altinity KB — DDLWorker and DDL queue problems](https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-ddlworker/)
- [ClickHouse PR #60340 — Add none_only_active DDL output mode](https://github.com/ClickHouse/ClickHouse/pull/60340)

## Issues Found

1. **Wrong column name on `system.distributed_ddl_queue`.** The post queried a column named `exception`, but the actual column in the `system.distributed_ddl_queue` table is `exception_text` (along with `exception_code`). Fixed both SQL snippets (the monitoring query and the "check unresponsive hosts" query) to use `exception_text`.

2. **Non-existent setting referenced in a section header.** The section titled "Configuring max_distributed_ddl_wait_for_first_replica" referenced a setting that does not exist in ClickHouse. The accompanying code actually uses `distributed_ddl_output_mode = 'none_only_active'`. Additionally, the prose ("Wait only for the first replica to complete (non-blocking)") mischaracterized what `none_only_active` does — it returns no result set and does not wait for *inactive* replicas of a Replicated database; it is not a "first replica" mode. Renamed the section to "Configuring distributed_ddl_output_mode" and corrected the description.

## Review Notes

- The default of 180 seconds for `distributed_ddl_task_timeout` and support for `-1` as an infinite-wait sentinel are both correct per current ClickHouse docs. Note: 0 means async mode, and the documented allowed range is -1 to 1800 (though many deployments set it higher via profiles/config).
- The server-level `<distributed_ddl>` cleanup options (`cleanup_delay_period`, `max_tasks_in_queue`, `task_max_lifetime`) and their defaults (60s, 1000, 604800s) match the documented values.
- The `system.clusters` columns (`host_name`, `is_local`, `errors_count`) used in the troubleshooting query are valid.
- The Mermaid sequence diagram is a reasonable high-level approximation; in reality each worker node polls the ZooKeeper task queue rather than being actively "notified", but this level of abstraction is appropriate for a tutorial.
- The `distributed_ddl_output_mode = 'none_only_active'` mode (along with `throw_only_active` and `null_status_on_timeout_only_active`) was introduced in ClickHouse 24.1 (Feb 2024), so readers on older versions will need to upgrade to use that example.
