# Validation Summary: How to Troubleshoot Rook-Ceph Network Latency Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes (kubectl debug, exec)
- Multus CNI (multiple network interfaces)
- Prometheus (alerting rules)
- iperf3 (network performance testing)
- Linux networking (sysctl TCP tuning, NIC interrupt affinity, irqbalance)

## Sources Consulted
- Kubernetes official documentation for `kubectl debug node/` command: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Ceph documentation for `ceph osd perf` output fields: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Rook documentation for Multus network configuration: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/#multus
- Ceph Prometheus metrics reference: https://docs.ceph.com/en/latest/mgr/prometheus/
- Linux kernel TCP tuning documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html

## Issues Found
1. **All `kubectl debug node/` commands were missing required `-it` and `--image` flags.** The `kubectl debug node/` command requires an `--image` flag to specify the container image for the ephemeral debug pod, and `-it` for interactive terminal access. Without these flags, the commands would fail. Fixed by adding `-it --image=busybox` to all seven `kubectl debug node/` invocations (Steps 3, 4, and 5). Since the commands use `chroot /host` to access host tools, a minimal image like `busybox` is sufficient.

## Review Notes
- The Ceph commands (`ceph health detail`, `ceph osd perf`) and their output field names (`apply_latency_ms`, `commit_latency_ms`) are correct.
- The 20ms latency threshold mentioned as a problem indicator is a reasonable general guideline, though actual thresholds depend on storage media (NVMe/SSD should be well under 5ms; HDD may be higher).
- The TCP tuning values (128MB buffer sizes, BBR congestion control) are sensible for high-throughput Ceph workloads.
- The Multus network configuration YAML matches the current Rook CephCluster CRD spec.
- The Prometheus alert metric `ceph_osd_apply_latency_ms` is correct per the Ceph Prometheus module.
- The `netstat` command used in Step 3 is deprecated on many modern Linux distributions in favor of `ss`, but since the command runs via `chroot /host`, availability depends on the host OS. This is acceptable as-is.
