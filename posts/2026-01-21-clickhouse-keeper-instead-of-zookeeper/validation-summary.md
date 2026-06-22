# Validation Summary: How to Use ClickHouse Keeper Instead of ZooKeeper

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- ClickHouse
- ClickHouse Keeper
- Apache ZooKeeper
- Docker Compose
- Kubernetes StatefulSet and Service resources
- Prometheus metrics
- Linux systemd, rsync, netcat, and shell commands

## Sources Consulted
- ClickHouse Keeper official documentation: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- ClickHouse replication and Keeper deployment guide: https://clickhouse.com/docs/architecture/cluster-deployment
- ClickHouse Keeper client utility documentation: https://clickhouse.com/docs/operations/utilities/clickhouse-keeper-client
- ClickHouse network ports documentation: https://clickhouse.com/docs/guides/sre/network-ports
- ClickHouse configuration file substitution documentation: https://clickhouse.com/docs/operations/configuration-files
- Apache ZooKeeper CLI documentation: https://zookeeper.apache.org/doc/r3.7.2/zookeeperCLI.html

## Issues Found
- The comparison table said ClickHouse Keeper logs were human-readable. ClickHouse documentation states Keeper snapshots and logs use a Keeper-specific format that is incompatible with ZooKeeper, so the table now describes the formats as native and not interchangeable.
- The ZooKeeper backup example used `zkCli.sh ... getAll /`, but `getAll` is not an Apache ZooKeeper CLI command. It was replaced with `ls -R /` for tree comparison and a filesystem backup of ZooKeeper's `version-2` logs/snapshots.
- The migration converter example wrote to `/var/lib/clickhouse-keeper`; ClickHouse documentation shows the converter output should be placed in the Keeper snapshots directory. The command and rsync examples now use `/var/lib/clickhouse-keeper/snapshots`.
- The migration sequence omitted required operational steps from the official process: stopping ingestion/background tasks, stopping ZooKeeper before conversion, restarting ClickHouse after updating Keeper endpoints, and resuming background tasks after validation. These steps were added to the command block.
- The Kubernetes StatefulSet set `KEEPER_SERVER_ID` from `metadata.name`, which produces a pod name rather than the numeric `server_id` ClickHouse Keeper requires, and the official image does not treat that variable as a complete configuration by itself. The misleading environment variable block was removed.
- The Prometheus configuration was nested under `<keeper_server>`, but ClickHouse Keeper Prometheus settings are configured as a top-level `<prometheus>` section. The XML snippet was corrected and now enables metrics, events, and asynchronous metrics.
- The storage compression settings were shown directly under `<keeper_server>`. ClickHouse documents `compress_logs` and `compress_snapshots_with_zstd_format` as Keeper coordination settings, so they were moved under `<coordination_settings>`.

## Review Notes
The guide remains intentionally high-level. In production, the Kubernetes example still needs a complete ConfigMap strategy that supplies a unique numeric `server_id` per Keeper pod, and cluster reconfiguration should be planned carefully because dynamic reconfiguration requires quorum and may require `keeper_server.enable_reconfiguration`.
