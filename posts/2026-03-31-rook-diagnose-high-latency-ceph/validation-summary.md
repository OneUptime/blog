# Validation Summary: How to Diagnose High Latency Issues in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (RADOS, OSD, BlueStore, RocksDB)
- Rook (Ceph operator for Kubernetes)
- iostat (sysstat)
- Prometheus alerting
- mtr / ping (network diagnostics)

## Sources Consulted
- Ceph official documentation: BlueStore internals and perf counters (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- Ceph official documentation: OSD configuration reference for recovery and scrub settings (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph `perf dump` output format documentation (https://docs.ceph.com/en/latest/dev/perf_counters/)
- Ceph MGR Prometheus module metrics (https://docs.ceph.com/en/latest/mgr/prometheus/)
- sysstat/iostat man page for command syntax and output columns
- Prometheus alerting rules syntax (https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)

## Issues Found

1. **BlueStore perf counter script printed wrong field**: The Python script extracting BlueStore latency counters was printing `avgcount` (the number of operations sampled) and labeling it `avg`. This is misleading -- `avgcount` is a count, not a latency value. Changed to print `avgtime` instead, which is the average latency per operation and is the relevant metric for diagnosing latency issues.

2. **Incorrect description of `state_finishing_lat`**: The table described `state_finishing_lat` as "Total write path latency." In reality, this counter measures only the post-KV-commit finalization phase (deferred completions, callbacks, cleanup) -- one specific stage of the write path, not the total. Changed description to "Post-commit finalization latency."

## Review Notes
- The `svctm` column shown in the `iostat` example output has been deprecated in newer versions of sysstat (v12+) and will be removed in a future release. The blog's example output is still representative of what many users will see, but readers on newer systems may not see this column.
- The replication latency explanation ("a write must complete on all 3 replicas before acknowledging") is correct for the normal case when all replicas are up. Ceph's `min_size` setting governs whether writes are accepted when replicas are down, not the acknowledgment threshold during normal operation.
- All `ceph config set` options (`osd_recovery_max_active_hdd`, `osd_max_backfills`, `osd_recovery_op_priority`, `osd_scrub_begin_hour`, `osd_scrub_end_hour`) are valid configuration keys in current Ceph releases.
- The Prometheus alert rule syntax and metric name (`ceph_osd_commit_latency_ms`) are correct for the Ceph MGR Prometheus module.
