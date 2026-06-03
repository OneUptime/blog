# Validation Summary: Deploy ScyllaDB on Kubernetes with the Scylla Operator for Low-Latency Workloads

## Status
validated

## Post Type
Tutorial / Kubernetes deployment guide

## Technologies Covered
- ScyllaDB
- ScyllaDB Operator
- ScyllaDB Manager
- Kubernetes
- cert-manager
- Prometheus Operator / ScyllaDBMonitoring
- CQL

## Sources Consulted
- ScyllaDB Operator install with GitOps: https://operator.docs.scylladb.com/stable/installation/gitops.html
- ScyllaCluster API reference: https://operator.docs.scylladb.com/stable/reference/api/groups/scylla.scylladb.com/scyllaclusters.html
- ScyllaDBMonitoring setup guide: https://operator.docs.scylladb.com/stable/management/monitoring/setup.html
- ScyllaDB precomputed I/O properties guide: https://operator.docs.scylladb.com/master/operate/configure-io-properties.html
- ScyllaDB Manager integration: https://operator.docs.scylladb.com/master/understand/manager.html
- ScyllaDB Manager task API reference: https://operator.docs.scylladb.com/stable/reference/api/groups/scylla.scylladb.com/scylladbmanagertasks.html
- ScyllaDB Operator restore from backup guide: https://operator.docs.scylladb.com/stable/operate/restore-from-backup.html
- ScyllaDB Manager sctool backup reference: https://manager.docs.scylladb.com/stable/sctool/backup.html
- ScyllaDB Manager sctool restore reference: https://manager.docs.scylladb.com/stable/sctool/restore.html
- ScyllaDB CQL consistency levels: https://docs.scylladb.com/manual/stable/cql/consistency.html
- ScyllaDB CQL SELECT reference: https://docs.scylladb.com/manual/stable/cql/dml/select.html
- ScyllaDB compaction reference: https://docs.scylladb.com/manual/stable/cql/compaction.html
- ScyllaDB metrics reference: https://docs.scylladb.com/manual/stable/reference/metrics.html
- ScyllaDB repair documentation: https://docs.scylladb.com/manual/stable/operating-scylla/procedures/maintenance/repair.html

## Issues Found
- The operator install commands used a generic latest release manifest and an incomplete cert-manager readiness check. Updated them to the documented v1.21 GitOps manifests and rollout checks.
- The ScyllaCluster example used `dnsPolicy: ClusterFirstWithHostNet` while host networking was disabled, and included an unsupported `monitoring.enabled` field. Changed DNS policy to `ClusterFirst` and removed the invalid monitoring field.
- The low-latency configuration manually passed generated networking and I/O flags through `scyllaArgs`. Reworked the I/O properties example to use a ConfigMap mounted through rack `volumes` and `volumeMounts`, which is the documented operator flow.
- The multi-datacenter section only added racks in one datacenter. Renamed it to multi-AZ replication and adjusted the explanatory text.
- The monitoring example used a hand-written `ServiceMonitor`. Replaced it with the documented `ScyllaDBMonitoring` custom resource pattern and corrected the cache hit ratio expression.
- The backup configuration used the wrong API version and wrong backup task field shapes. Updated inline ScyllaCluster backup fields to use `cron`, string-based `rateLimit`, `snapshotParallel`, and `uploadParallel`, and clarified that retention is a backup count.
- The restore commands used `scylla-manager-cli` from a ScyllaDB pod. Updated them to execute `sctool` in the ScyllaDB Manager deployment and to restore schema before table data.
- The CQL examples used invalid `SELECT ... USING CONSISTENCY` syntax and deprecated/unsupported read repair table options. Replaced them with cqlsh `CONSISTENCY` commands and guidance to run or schedule repairs.

## Review Notes
- The post still uses ScyllaDB 5.4.0 and Manager Agent 3.2.0 as example versions. Those are older than the versions shown in current Operator examples, but the corrected syntax is valid for the documented ScyllaCluster API.
- The performance claims are workload-dependent. The post now avoids tying latency monitoring to stale metric names, but production latency should still be validated with ScyllaDB Monitoring dashboards, client-side metrics, and workload-specific benchmarks.
