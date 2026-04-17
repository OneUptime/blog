# Validation Summary: How to Add a New Replica to a ClickHouse Cluster

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- ClickHouse (clickhouse-server, clickhouse-client)
- ZooKeeper (for ReplicatedMergeTree coordination)
- systemd (systemctl, journalctl)
- APT / Debian packaging
- SSH / SCP

## Sources Consulted
- ClickHouse official documentation — Replication: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse official documentation — ReplicatedMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication#creating-replicated-tables
- ClickHouse official documentation — system.replicas: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse official documentation — system.parts: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse official documentation — clusterAllReplicas table function: https://clickhouse.com/docs/en/sql-reference/table-functions/cluster
- ClickHouse official documentation — Distributed engine virtual columns (`_shard_num`): https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse official documentation — Server configuration (remote_servers, macros): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse network ports reference (9000 native TCP, 8123 HTTP, 9009 inter-server replication)

## Issues Found

1. **Invalid column `shard_num` in cluster query**
   - Location: Step 7, "Verify row counts match across replicas" query.
   - Problem: `WHERE shard_num = 1` — `system.replicas` has no `shard_num` column. The column exposed by `clusterAllReplicas` (inherited from the Distributed engine) for filtering by shard is the virtual column `_shard_num`.
   - Fix: Changed filter to `WHERE _shard_num = 1` and added `hostName() AS host` to the projection/GROUP BY so each physical replica's row is distinguishable.

2. **Invalid virtual column `_replica_name` in cluster query**
   - Location: Step 7, "Check part counts match for a specific table" query.
   - Problem: `_replica_name` is not a virtual column in ClickHouse. `system.parts` has no `replica_name` column, and `clusterAllReplicas`/Distributed engines do not synthesize `_replica_name`. The query would fail with an "unknown identifier" error.
   - Fix: Replaced `_replica_name` with the `hostName()` function (aliased to `host`), which is the documented way to identify the physical server producing each row in a distributed/cluster query.

## Review Notes

- The port list (9000 native, 8123 HTTP, 9009 inter-server replication, 2181 ZooKeeper) is correct for a default install.
- Use of `<clickhouse>` as the config root element is correct for modern ClickHouse releases (the legacy `<yandex>` root is still accepted but deprecated).
- `internal_replication=true` is the right setting when inserts target `Replicated*MergeTree` tables so that the Distributed engine writes to one replica and lets replication fan out.
- `ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')` DDL is syntactically current; the `{shard}`/`{replica}` macros resolve from `macros.xml` as described.
- `system.replicas` has `replica_name` as a real column (value of `{replica}` macro), so using it in the first cluster query is valid after the `_shard_num` fix.
- `is_leader` is still a valid column in `system.replicas`, though with multi-leader replication it is largely informational in recent versions.
- `systemctl reload clickhouse-server` is supported (the packaged unit maps reload to SIGHUP). ClickHouse also auto-detects changes in `config.d/` without a manual reload, but an explicit reload is a safe belt-and-suspenders step.
- The post assumes the ClickHouse APT repository is already configured on the new host; a first-time installer would need to add the repository before `apt-get install` succeeds. This is a minor omission rather than a correctness issue.
