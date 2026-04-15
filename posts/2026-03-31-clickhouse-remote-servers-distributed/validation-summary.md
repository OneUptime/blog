# Validation Summary: How to Configure ClickHouse Remote Servers for Distributed Queries

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (Distributed table engine, ReplicatedMergeTree, system.clusters)
- ClickHouse Keeper / ZooKeeper (referenced for replication coordination)
- XML-based ClickHouse server configuration (`remote_servers` section)

## Sources Consulted
- ClickHouse documentation on Distributed table engine: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse documentation on cluster configuration (`remote_servers`): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#remote_servers
- ClickHouse documentation on server settings (`connect_timeout`, `receive_timeout`, `send_timeout`): https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse documentation on `system.clusters` table: https://clickhouse.com/docs/en/operations/system-tables/clusters
- ClickHouse documentation on ReplicatedMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication

## Issues Found
1. **Timeout settings units were incorrect.** In the "Query Routing Settings" section, the comment stated timeout values were in "milliseconds" and used values of 5000, 30000, and 30000. ClickHouse's `connect_timeout`, `receive_timeout`, and `send_timeout` settings are all specified in **seconds**, not milliseconds. The original values would have resulted in timeouts of ~83 minutes and ~8.3 hours, which is clearly not the intended behavior. Fixed the comment to say "(seconds)" and changed the values to 5, 30, and 30 seconds respectively.

## Review Notes
- The post states that the `<secret>` tag was introduced in "ClickHouse 20.6+". The cluster-level `<secret>` for authenticating distributed queries was more likely introduced in ClickHouse 20.10. This is a minor version discrepancy and does not affect the correctness of the configuration syntax shown.
- The `<weight>` description mentions "round-robin or random sharding mode" specifically. In practice, shard weights affect the distribution of INSERTs through the Distributed table regardless of the sharding expression, not just round-robin or random modes. The explanation is close enough for a practical guide but slightly imprecise.
- All XML configuration snippets use correct element names and structure per the ClickHouse documentation.
- All SQL examples (CREATE TABLE, system.clusters queries, SETTINGS clauses) are syntactically correct and use valid column names and settings.
- The `{shard}` and `{replica}` macros in the ReplicatedMergeTree path are correctly used and would be resolved from the server's `<macros>` configuration at runtime.
