# Validation Summary: How to Set CPU Requests and Limits for Rook-Ceph OSD Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph OSD (Object Storage Daemon)
- Kubernetes resource requests and limits
- Prometheus / PromQL for monitoring
- Linux cgroups (CPU throttling detection)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph configuration reference for OSD recovery options: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Linux cgroup v1 cpu controller documentation (cpu.stat field names)
- cAdvisor / kubelet metrics reference for container CPU metrics

## Issues Found
1. **Incorrect cgroup cpu.stat field name in throttling check**: The command used `grep throttled_periods` but the actual field names in cgroup v1's `/sys/fs/cgroup/cpu/cpu.stat` are `nr_periods`, `nr_throttled`, and `throttled_time`. There is no field called `throttled_periods`. Changed to `grep nr_throttled` to correctly match the throttled period count.

## Review Notes
- The cgroup path `/sys/fs/cgroup/cpu/cpu.stat` is specific to cgroup v1. On systems using cgroup v2 (increasingly common on modern Linux distributions and Kubernetes nodes), the path is `/sys/fs/cgroup/cpu.stat` and the field names differ slightly (`throttled_usec` instead of `throttled_time`). The `2>/dev/null` redirect handles the missing file gracefully, but users on cgroup v2 systems should adjust the path.
- The `osd_recovery_threads` setting to 1 is the default value in modern Ceph, making that specific command a no-op. It's not incorrect, but users should be aware the default is already 1.
- The `spec.resources.osd` and `spec.resources.prepareosd` paths in the CephCluster CRD are correct per Rook documentation.
- All Prometheus queries use standard cAdvisor metrics and are syntactically correct.
- The CPU sizing recommendations in the table are reasonable general guidelines, though actual requirements will vary by workload.
