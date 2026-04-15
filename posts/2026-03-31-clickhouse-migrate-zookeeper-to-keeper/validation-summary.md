# Validation Summary: How to Migrate from ZooKeeper to ClickHouse Keeper

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- ClickHouse
- ClickHouse Keeper
- Apache ZooKeeper
- clickhouse-keeper-converter CLI tool
- clickhouse-keeper-client CLI tool

## Sources Consulted
- ClickHouse Keeper documentation: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- clickhouse-keeper-client utility docs: https://clickhouse.com/docs/operations/utilities/clickhouse-keeper-client
- system.zookeeper_connection table docs: https://clickhouse.com/docs/operations/system-tables/zookeeper_connection
- clusterAllReplicas function docs: https://clickhouse.com/docs/sql-reference/table-functions/cluster
- ZooKeeper Administrator's Guide (4-letter commands): https://zookeeper.apache.org/doc/current/zookeeperAdmin.html
- ClickHouse GitHub Issue #64780 (keeper-converter flag compatibility)

## Issues Found

1. **Invalid ZooKeeper "version" command**: The post used `echo "version" | nc zk1.internal 2181` to check the ZooKeeper version. "version" is not a valid ZooKeeper four-letter-word (4lw) command. Changed to `echo "srvr"`, which returns server details including the version string.

2. **Invalid ZooKeeper "snap" command**: The post used `echo "snap" | nc zk1.internal 2181` to trigger a ZooKeeper snapshot. "snap" is not a valid 4lw command; ZooKeeper has no manual snapshot trigger via the 4lw protocol. ZooKeeper creates snapshots automatically based on the `snapCount` configuration. Removed the invalid command and updated the text to explain that snapshots are created automatically and the user should locate the most recent one.

3. **Incorrect `<root>/clickhouse</root>` in AFTER config**: The BEFORE config showed no `<root>` element, but the AFTER config added `<root>/clickhouse</root>`. This would prepend `/clickhouse` to all ZooKeeper paths, causing ClickHouse to look for `/clickhouse/clickhouse/tables/...` instead of `/clickhouse/tables/...`, breaking replication after migration. Removed the `<root>` line to match the original configuration.

## Review Notes
- The `clickhouse-keeper-converter` CLI flags (`--zookeeper-logs-dir`, `--zookeeper-snapshots-dir`, `--output-dir`) are correct for the documented versions, but ClickHouse GitHub Issue #64780 reports that these flags may produce "Unknown option" errors in some recent versions (24.3.1+). Users should verify against their specific ClickHouse version.
- The claim that `systemctl reload clickhouse-server` can reload ZooKeeper connection settings without restart is version-dependent. In older versions, changes to the `<zookeeper>` section may require a full restart. Users should test this on their specific version.
- The `system.zookeeper_connection` table, `clusterAllReplicas` function, `system.replicas` table usage, and `clickhouse-keeper-client` tool are all verified as correct.
- The overall migration workflow (snapshot → convert → deploy Keeper → verify → switch config → verify replication → decommission ZK) follows the recommended approach from ClickHouse documentation.
