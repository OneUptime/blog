# Validation Summary: Groundcover Retention with ClickHouse, VictoriaMetrics, and Object Storage

## Status
validated

## Post Type
Technical operations guide

## Technologies Covered
- Groundcover BYOC
- ClickHouse
- VictoriaMetrics
- Kubernetes persistent volumes and StorageClasses
- Object storage
- OpenTelemetry and eBPF telemetry collection

## Sources Consulted
- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover custom data retention](https://docs.groundcover.com/customization/customize-usage/custom-data-retention)
- [Groundcover log management](https://docs.groundcover.com/capabilities/log-management)
- [Groundcover custom storage](https://docs.groundcover.com/customization/customize-usage/custom-storage)
- [Groundcover BYOC disaster recovery](https://docs.groundcover.com/architecture/byoc/disaster-recovery)
- [Groundcover metric backup and restore](https://docs.groundcover.com/use-groundcover/backup-and-restore-metrics)
- [Groundcover custom log collection](https://docs.groundcover.com/customization/customize-usage/custom-logs-collection)
- [Groundcover eBPF sampling controls](https://docs.groundcover.com/customization/customize-usage/controlling-the-ebpf-sampling-mechanism)
- [Groundcover tracing payload size](https://docs.groundcover.com/customization/customize-usage/customize-tracing-payload-size)
- [ClickHouse data TTL](https://clickhouse.com/docs/guides/developer/ttl)
- [ClickHouse storage documentation](https://clickhouse.com/docs/operations/storing-data)
- [VictoriaMetrics single-node capacity and retention](https://docs.victoriametrics.com/victoriametrics/single-server-victoriametrics/)
- [Kubernetes persistent-volume expansion](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#expanding-persistent-volumes-claims)
- [Kubernetes StorageClass volume expansion](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-expansion)

## Issues Found
- The trace-retention table referred generally to filtering by service, although Groundcover documents exact-match trace fields such as `workload`. Changed the wording to “selected workloads” to match the supported field terminology.
- The overlapping-rule example used an abstract sensitive-data rule that could imply content-based matching. Replaced it with documented exact-match fields (`env` and `namespace`) while preserving the shorter-retention-wins example.
- The capacity formula could double-count replication when daily compressed growth was measured across the whole replicated deployment. Defined the input as per-replica growth and added a warning not to multiply again when the measurement already includes all replicas.
- The object-storage and recovery wording overstated the documented role of object storage. Groundcover documents daily database-volume snapshots and offloading older logs, traces, and events to object storage; the text now uses those documented terms.
- The monitoring guidance could imply that expired records disappear exactly at the retention cutoff. Added the documented caveat that ClickHouse TTL deletion is merge-driven and VictoriaMetrics retention cleanup is eventual.

## Review Notes
- Groundcover's official pages currently conflict on the default log-retention value: the custom-retention page says 30 days for BYOC, while the log-management page says 3 days. The post correctly calls out this inconsistency and advises verifying the effective deployment configuration.
- Groundcover currently supports advanced exact-match retention overrides for logs, traces, and events, but only global retention for metrics through Groundcover's supported retention model.
- All external links in the post returned successful HTTP responses during validation.
