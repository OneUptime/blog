# Validation Summary: How ClickHouse Handles Replication Under the Hood

## Status
validated

## Post Type
Technical Guide / Reference

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine)
- ClickHouse Keeper
- Apache ZooKeeper
- ClickHouse system tables (system.replicas, system.replication_queue)

## Sources Consulted
- ClickHouse documentation on ReplicatedMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse documentation on system.replicas: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse documentation on system.replication_queue: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse documentation on ClickHouse Keeper: https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper
- ClickHouse documentation on SYSTEM statements: https://clickhouse.com/docs/en/sql-reference/statements/system

## Issues Found

1. **Incorrect claim about fetch URL visibility (line 54)**: The post stated "The fetch URL is visible in `system.replicas`." The `system.replicas` table contains replica metadata (queue size, lag, leader status, etc.) but does not show fetch URLs or source replica information. The `system.replication_queue` table is the correct place to see source replica information for GET_PART fetch operations. Changed to reference `system.replication_queue`.

2. **Inaccurate description of merge coordination (lines 85-89)**: The post stated "only one replica executes it - the leader" and that other replicas download from the leader or execute the merge if the download takes too long. This is incorrect. The leader's special role is *scheduling* merges (deciding which parts to merge and writing merge entries to the replication log in Keeper), not exclusively executing them. Each replica independently processes merge entries from its queue and either executes the merge locally or downloads the already-merged result from another replica that finished first. Fixed to accurately describe the leader's scheduling role and each replica's independent merge execution.

3. **Incorrect ClickHouse Keeper version (line 112)**: The post stated "ClickHouse 22.4+" ships ClickHouse Keeper. ClickHouse Keeper was introduced in version 21.8 (August 2021) as an experimental feature and became production-ready around 21.12. Changed to "21.8+".

## Review Notes
- The SQL queries for monitoring replication are correct. Column names (`queue_size`, `inserts_in_queue`, `merges_in_queue`, `log_pointer`, `log_max_index`, `is_leader`, `is_readonly`) are all valid columns in `system.replicas`. The `replication_lag` calculation (`log_max_index - log_pointer`) is a standard approach.
- The `SYSTEM RESTART REPLICA` and `SYSTEM SYNC REPLICA` commands use correct syntax.
- The ReplicatedMergeTree engine parameters (ZooKeeper path and replica macro) follow the recommended convention using `{shard}` and `{replica}` macros.
- The description of Keeper storing "a configurable number of log entries (default: a few thousand)" is vague but not incorrect. In practice, old replication log entries are cleaned up after all replicas have processed them, and there are settings like `cleanup_delay_period` that control this behavior.
- The bash code block for ClickHouse Keeper config is just comments with no actual code, which is fine as a placeholder but provides no actionable configuration example.
