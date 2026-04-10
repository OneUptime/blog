# Validation Summary: How to Choose Between HDD, SSD, and NVMe for Ceph Workloads

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- BlueStore (Ceph OSD backend)
- CRUSH rules (Ceph data placement)
- Kubernetes CRDs (CephCluster)

## Sources Consulted
- Ceph official documentation: OSD pool commands (`ceph osd pool create`, `ceph osd pool set`) — https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph official documentation: CRUSH device classes and rules — https://docs.ceph.com/en/latest/rados/operations/crush-map/#device-classes
- Ceph official documentation: BlueStore configuration (WAL/DB devices) — https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Rook official documentation: CephCluster CRD storage configuration — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#storage-configuration
- General storage hardware specifications for HDD, SATA SSD, and NVMe performance baselines

## Issues Found
No technical issues found.

## Review Notes
- The performance table provides reasonable ballpark figures suitable for a comparison guide. Actual numbers vary by specific drive model, workload profile, and queue depth. NVMe power consumption (5-8W) reflects consumer/low-power enterprise models; high-performance enterprise NVMe drives can draw 15-25W under sustained load.
- The Decision Framework section creates pools without assigning CRUSH rules to them, meaning they would use the default rule rather than targeting specific device classes. This is not an error since the full CRUSH rule workflow is demonstrated in the earlier sections, but readers following only the Decision Framework commands would not get device-class-specific pools.
- Modern Ceph clusters (Nautilus+) have pg_autoscaler enabled by default, which can automatically tune PG counts. The post manually specifies PG counts, which is still valid but the autoscaler may override them if enabled.
