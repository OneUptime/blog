# Validation Summary: How to Use ScyllaDB for Low-Latency Workloads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ScyllaDB
- Apache Cassandra-compatible CQL
- ScyllaDB service levels and workload prioritization
- ScyllaDB configuration and setup scripts
- Prometheus and Grafana monitoring
- Python monitoring scripts
- OneUptime alert webhooks

## Sources Consulted
- ScyllaDB Workload Prioritization: https://docs.scylladb.com/manual/stable/features/workload-prioritization.html
- ScyllaDB Service Levels CQL reference: https://docs.scylladb.com/manual/stable/cql/service-levels.html
- ScyllaDB Configuration Parameters: https://docs.scylladb.com/manual/stable/reference/configuration-parameters.html
- ScyllaDB System Configuration Files and Scripts: https://docs.scylladb.com/manual/stable/getting-started/system-configuration.html
- ScyllaDB Admin REST API: https://docs.scylladb.com/manual/stable/operating-scylla/rest.html
- ScyllaDB Metrics Reference: https://docs.scylladb.com/manual/stable/reference/metrics.html
- ScyllaDB Node-to-Node Encryption: https://docs.scylladb.com/manual/stable/operating-scylla/security/node-node-encryption.html
- ScyllaDB Monitoring Stack install guide: https://monitoring.docs.scylladb.com/stable/install/monitoring-stack.html
- ScyllaDB Compaction Advisor: https://monitoring.docs.scylladb.com/stable/use-monitoring/advisor/heavyCompaction.html
- ScyllaDB Python Driver shard-awareness docs: https://python-driver.docs.scylladb.com/stable/scylla-specific.html
- ScyllaDB protocol documentation for shard-aware ports: https://github.com/scylladb/scylladb/blob/master/docs/dev/protocols.md
- ScyllaDB `scylla_io_setup` source: https://github.com/scylladb/scylladb/blob/master/dist/common/scripts/scylla_io_setup
- ScyllaDB storage proxy metrics source: https://github.com/scylladb/scylladb/blob/master/service/storage_proxy.cc
- ScyllaDB metrics development notes: https://github.com/scylladb/scylladb/blob/master/docs/dev/metrics.md

## Issues Found
- The sharding explanation used `token % num_shards`, which is not ScyllaDB's real shard-aware routing logic. Updated it to clarify that real clients should use ScyllaDB shard-aware drivers and server-provided shard metadata.
- The post claimed ScyllaDB eliminates cross-core communication and keeps tail latency tight during all background work. Softened these claims to account for shard-aware routing, workload control, and operational tuning.
- The shard inspection commands used `nodetool info | grep "Native Transport"` and described `cfstats` as per-shard statistics. Replaced them with `cpuset.conf`, `nodetool tablestats`, and the Prometheus metrics endpoint.
- The hardware section recommended disabling filesystem journaling. Replaced that with ScyllaDB-supported XFS data directories and avoidance of unsupported filesystem tweaks.
- The commitlog comments said batch mode lowers latency and periodic mode favors throughput. Corrected the description and example to use periodic sync for lower-latency acknowledgment behavior.
- The `scylla_io_setup --dev /dev/nvme0n1` command was not current. Replaced it with `sudo scylla_io_setup` and noted both generated I/O configuration files.
- The service-level CQL used `CREATE SERVICE LEVEL` and `GRANT`, but ScyllaDB uses `CREATE SERVICE_LEVEL` and `ATTACH SERVICE_LEVEL`. Updated the CQL examples and list commands.
- The scheduling group examples used undocumented REST endpoints and an invalid JSON POST for `compaction_static_shares`. Replaced them with Prometheus metrics checks and a `system.config` update example.
- The monitoring Python script called non-current REST endpoints. Reworked it to read ScyllaDB's Prometheus metrics endpoint and parse scheduler queue length and pending compaction metrics.
- The Docker Compose example referenced a non-standard `scylladb/scylla-monitoring:latest` image. Replaced it with a note to install the official ScyllaDB Monitoring Stack from the official repository.
- The compaction pending Prometheus metric name was incorrect. Updated it to `scylla_compaction_manager_pending_compactions`.
- The repair best practice said incremental repairs have no latency impact. Reworded it to recommend scheduled repairs with monitoring.
- The alerting script used `datetime.utcnow()`. Updated it to a timezone-aware UTC timestamp.

## Review Notes
The ScyllaDB Prometheus metric surface has changed across versions, so production alert rules should be checked against the exact `/metrics` output from the deployed ScyllaDB version.
