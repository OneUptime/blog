# Validation Summary: How to Optimize Recovery for Large Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (OSD recovery tuning, PG management, pool configuration)
- Rook (CephCluster CRD configuration)
- Prometheus (Ceph monitoring metrics and PromQL queries)
- Kubernetes (CRD-based cluster management)

## Sources Consulted
- Ceph official documentation for OSD recovery options (`osd_recovery_max_active`, `osd_max_backfills`, `osd_recovery_sleep_ssd`, `osd_recovery_max_chunk`, `osd_recovery_op_priority`) — https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph pool properties documentation (`recovery_priority` valid range -10 to 10) — https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph CLI reference for `ceph pg dump` subcommands — https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph PG autoscaler documentation — https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Rook CephCluster CRD specification (`spec.cephConfig`) — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph Manager Prometheus module metric names — https://docs.ceph.com/en/latest/mgr/prometheus/
- Cross-referenced with validated blog posts in this repository covering recovery priorities, OSD recovery settings, and Prometheus alerting

## Issues Found
1. **`recovery_priority` value out of range**: The post set `recovery_priority 20` for the critical pool, which exceeds the valid range of -10 to 10. Changed to `recovery_priority 10` (maximum valid value). Also changed the archival pool from `recovery_priority 1` to `recovery_priority -5` to better illustrate the contrast between high and low priority pools.

2. **Incorrect `ceph pg dump` command syntax**: The post used `ceph pg dump_pools` (with underscore), but the correct CLI syntax is `ceph pg dump pools` (with space). The `pools` argument is a positional parameter to the `ceph pg dump` subcommand.

## Review Notes
- The Prometheus metric names (`ceph_pg_recovering_bytes_per_sec`, `ceph_pg_degraded`) are consistent with the naming conventions used across this blog and the Ceph Manager Prometheus module. These are presented as illustrative PromQL examples; exact metric names may vary slightly depending on the Ceph version and exporter in use.
- The `ceph osd df tree | sort -k7 -n -r` command's column number (-k7) is dependent on the Ceph version's output format. Readers may need to adjust the column number for their specific version.
- The `ceph pg dump pools | awk '{print $1, $15}'` column reference ($15) is similarly version-dependent.
- All `ceph config set` options and values are valid and appropriate for the described use cases. The recommended values for NVMe clusters (osd_recovery_max_active=10, osd_max_backfills=4) are reasonable aggressive tuning for fast storage.
- The Rook CephCluster CRD YAML structure (`spec.cephConfig.osd`) follows the correct format for current Rook versions.
- The 16 MB chunk size (16777216 bytes) calculation is correct and appropriate for high-bandwidth cluster networks.
