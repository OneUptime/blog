# Validation Summary: How to Handle Partial Results from Failed Shards in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Distributed table engine, cluster configuration)
- ClickHouse `skip_unavailable_shards` setting
- ClickHouse `system.clusters` system table
- ClickHouse remote_servers XML configuration (shard/replica topology)

## Sources Consulted
- ClickHouse system.clusters documentation — https://clickhouse.com/docs/operations/system-tables/clusters
- ClickHouse Distributed table engine docs — https://clickhouse.com/docs/engines/table-engines/special/distributed
- ClickHouse Session Settings — https://clickhouse.com/docs/operations/settings/settings
- ClickHouse horizontal scaling / cluster config — https://clickhouse.com/docs/architecture/horizontal-scaling
- ClickHouse ErrorCodes.cpp source — https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ErrorCodes.cpp
- ClickHouse Settings.h source — https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Settings.h
- Altinity Knowledge Base (client timeouts) — https://kb.altinity.com/altinity-kb-setup-and-maintenance/client-timeouts/

## Issues Found
1. **Inaccurate description of `estimated_recovery_time`**: The post stated "If estimated_recovery_time > 0, that shard is considered unavailable." This is misleading. The `estimated_recovery_time` column represents the seconds remaining until the replica's error count is zeroed — it indicates the replica has recently experienced errors, not that it is currently unreachable. A replica with a non-zero value may have already recovered but still be in the error-counter cooldown period. Changed to: "If estimated_recovery_time > 0, that replica has recently experienced errors and ClickHouse has not yet reset its error counter — treat it as potentially degraded."

## Review Notes
- The `connect_timeout` and `receive_timeout` settings are technically valid in a query-level SETTINGS clause, but their practical effectiveness depends on connection lifecycle. For distributed sub-queries that open new connections to remote shards, they work as expected. For best results, these timeouts should also be set in the default user profile in `users.xml`.
- The `skip_unavailable_shards` setting accepts Bool values (`0`/`1` or `false`/`true`). The blog uses `1`, which is correct.
- All six `system.clusters` columns used in queries (`shard_num`, `replica_num`, `host_name`, `errors_count`, `estimated_recovery_time`, `is_local`) are confirmed to exist in official documentation.
- Error code 279 (`ALL_CONNECTION_TRIES_FAILED`) is confirmed in the ClickHouse source code.
- The remote_servers XML structure with nested `<shard>` and `<replica>` elements is correct per official documentation.
