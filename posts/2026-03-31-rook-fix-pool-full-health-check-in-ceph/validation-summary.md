# Validation Summary: How to Fix POOL_FULL Health Check in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- RBD (RADOS Block Device)
- CephFS (Ceph Filesystem)
- Prometheus (monitoring/alerting)
- Kubernetes

## Sources Consulted
- Ceph Health Checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph Monitoring a Cluster documentation: https://docs.ceph.com/en/reef/rados/operations/monitoring/
- Ceph Monitor/OSD Interaction configuration: https://docs.ceph.com/en/reef/rados/configuration/mon-osd-interaction/
- Ceph RBD Block Device Commands: https://docs.ceph.com/en/reef/rbd/rados-rbd-cmds/
- Ceph RBD Snapshots documentation: https://docs.ceph.com/en/reef/rbd/rbd-snapshot/
- Ceph Pools documentation (quotas): https://docs.ceph.com/en/latest/rados/operations/pools/
- CephFS Top Utility documentation: https://docs.ceph.com/en/reef/cephfs/cephfs-top/
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Prometheus module source (metric definitions): https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found
1. **Incorrect use of `cephfs-top` for finding large files**: The post used `cephfs-top` under the heading "For CephFS, remove large files." However, `cephfs-top` is a curses-based real-time monitoring tool that displays CephFS **client activity metrics** (I/O throughput, latency, open files per client) — similar to the Unix `top` command. It does not display file sizes or help identify large files. Replaced the command with standard filesystem tools (`du -sh` and `find -size`) run from within a mounted CephFS volume, which is the correct approach for identifying large files to delete.

## Review Notes
- The `ceph health detail` example output uses `[ERR]` prefix and shows `(used 100.00%)`. The actual output format varies by Ceph version — modern versions typically show `HEALTH_ERR` as a top-level status and `pool 'rbd' is full` without a percentage. This is a minor cosmetic difference in an illustrative example and does not affect the usefulness of the guide.
- All Ceph CLI commands (`ceph osd set-full-ratio`, `ceph osd pool set-quota`, `ceph config get`, `rbd` commands) were verified as correct against official documentation.
- The Prometheus metric `ceph_pool_percent_used` was confirmed in the Ceph mgr prometheus module source code.
- The Rook CephCluster CR YAML structure and field names are correct per Rook documentation.
- The full/nearfull/backfillfull ratio values in the post (0.97, 0.90, 0.95) respect the required ordering (nearfull < backfillfull < full).
