# Validation Summary: How to Configure Rook-Ceph Resource Limits and Requests

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (mon, mgr, osd, mds, rgw daemons)
- Kubernetes (resource requests/limits, QoS classes, kubectl)
- Ceph BlueStore memory auto-tuning

## Sources Consulted
- Rook CephCluster CR documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#cluster-settings
- Rook CephFilesystem CR documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CephObjectStore CR documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Ceph OSD memory auto-tuning documentation: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Kubernetes QoS classes documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes resource management: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found
1. **Incorrect OSD workload type in rollout command (line 191)**: The post used `kubectl -n rook-ceph rollout status daemonset/rook-ceph-osd` to watch OSD pods after a resource patch. Rook-Ceph deploys each OSD as a separate **Deployment** (e.g., `rook-ceph-osd-0`, `rook-ceph-osd-1`), not as a DaemonSet. Changed the command to `kubectl -n rook-ceph get deployment -l app=rook-ceph-osd -w` which watches all OSD deployments for changes.

## Review Notes
- The `osd_memory_target` value (4294967296 = 4 GiB) is set alongside `osd_memory_target_autotune true`. When autotune is enabled, Ceph derives the target from the cgroup memory limit automatically, so setting `osd_memory_target` manually is redundant but not harmful. The comment "should match the Kubernetes limit" is slightly misleading since the actual BlueStore cache target is typically lower than the full container memory limit to leave headroom for non-cache OSD memory usage. With autotune enabled, Ceph handles this correctly regardless.
- The CephCluster example uses Burstable QoS settings (requests < limits) for mon, mgr, and osd, while the QoS section later recommends Guaranteed QoS for these daemons. This is not technically wrong (the examples serve different purposes), but readers may notice the inconsistency. A production deployment following the Guaranteed QoS advice would set requests equal to limits for those daemons.
- The resource recommendation table values are reasonable and align with common community guidance, though Ceph does not publish official minimum resource requirements — actual needs vary significantly by workload.
