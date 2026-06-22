# Validation Summary: How to Upgrade ClickHouse Without Downtime

## Status
validated

## Post Type
Technical guide / operations tutorial

## Technologies Covered
- ClickHouse
- ClickHouse replication and distributed clusters
- clickhouse-client SQL
- clickhouse-backup
- Debian/Ubuntu and RPM package management
- Kubernetes StatefulSets and PodDisruptionBudgets
- Helm
- Prometheus alerting

## Sources Consulted
- ClickHouse self-managed upgrade documentation: https://clickhouse.com/docs/operations/update
- ClickHouse Debian/Ubuntu installation documentation: https://clickhouse.com/docs/install/debian_ubuntu
- ClickHouse RPM installation documentation: https://clickhouse.com/docs/install/redhat
- ClickHouse compatibility setting documentation: https://clickhouse.com/docs/operations/settings/settings#compatibility
- ClickHouse replicated table engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication
- ClickHouse ATTACH statement documentation: https://clickhouse.com/docs/sql-reference/statements/attach
- ClickHouse ALTER statement documentation: https://clickhouse.com/docs/sql-reference/statements/alter
- ClickHouse system.warnings documentation: https://clickhouse.com/docs/operations/system-tables/system_warnings
- ClickHouse system.replicas documentation: https://clickhouse.com/docs/operations/system-tables/replicas
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse Prometheus protocol documentation: https://clickhouse.com/docs/interfaces/prometheus
- Altinity clickhouse-backup manual: https://github.com/Altinity/clickhouse-backup/blob/master/Manual.md

## Issues Found
- The post stated "Never skip more than two minor versions in one upgrade." ClickHouse documentation recommends incremental upgrades for larger jumps and notes downgrade support is generally limited to recent versions if no new features were used. I changed this to a less rigid, documentation-aligned warning about incremental upgrades and downgrade boundaries.
- The package upgrade examples installed only `clickhouse-server` for Debian/Ubuntu. ClickHouse documentation says specific-version installs should pin `clickhouse-server`, `clickhouse-client`, and `clickhouse-common-static` to the same version. I updated the upgrade and rollback commands accordingly.
- The direct `.deb` installation example installed only the server package and used a hard-coded package filename. I changed it to download and install the matching common-static, client, and server packages using a target version variable.
- The rollback examples downgraded only `clickhouse-server`. I updated them to downgrade the server, client, and common-static packages together.
- The schema migration example used `ALTER TABLE ... MODIFY ENGINE`, which is not a valid ClickHouse engine-conversion syntax. I replaced it with the documented `DETACH TABLE`, `ATTACH TABLE ... AS REPLICATED`, and `SYSTEM RESTORE REPLICA` flow for converting a detached MergeTree table to ReplicatedMergeTree.
- The Prometheus replication lag alert used a non-built-in metric name. I changed it to `ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay`, which matches the built-in ClickHouse Prometheus endpoint when asynchronous metrics are enabled, and added a note that third-party exporters may use different names.
- The version policy labeled `24.4` as the current stable version, which is time-sensitive and no longer safe as a general recommendation. I changed it to an example target while preserving the author's intended guidance.

## Review Notes
The post is technically relevant and generally accurate after the fixes. Some examples remain intentionally operational and environment-specific, such as load balancer draining, Kubernetes manifest context, and exporter-specific Prometheus version mismatch alerts; readers should adapt those to their deployment tooling.
