# Validation Summary: How to Optimize RBD for Boot Volume Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- CephBlockPool CRD (ceph.rook.io/v1)
- RBD image features (layering, exclusive-lock, object-map, fast-diff)
- RBD clone-based provisioning (snapshots, COW clones)
- librbd client-side caching (rbd_cache, rbd_cache_size)
- librbd QoS (rbd_qos_iops_limit, rbd_qos_read_iops_limit)
- systemd-analyze (boot profiling)
- ceph osd perf (OSD latency monitoring)

## Sources Consulted
- Rook CephBlockPool CRD documentation and examples across the blog repository (confirmed `spec.deviceClass`, `spec.parameters.pg_num`, `spec.parameters.compression_mode` as valid fields)
- Ceph RBD documentation for `rbd create --image-feature` flags (layering, exclusive-lock, object-map, fast-diff are valid features)
- Ceph RBD documentation for `rbd snap create`, `rbd snap protect`, `rbd clone` syntax
- Ceph RBD configuration documentation for `rbd config image set` syntax and valid config keys (`rbd_cache`, `rbd_cache_size`, `rbd_qos_iops_limit`, `rbd_qos_read_iops_limit`)
- Cross-referenced `ceph osd perf` output format and sort column usage across 15+ other blog posts in this repository, including explicit column comments in `rook-configure-all-hdd-clusters` post confirming `-k3` = apply_latency

## Issues Found
1. **Incorrect sort column in `ceph osd perf` command**: The monitoring command used `sort -k4 -rn` but `ceph osd perf` outputs only 3 columns (osd, commit_latency_ms, apply_latency_ms). Column 4 does not exist, so the sort would have no effect. Changed `-k4` to `-k3` to correctly sort by apply_latency in descending order, which is the most relevant metric for client-visible I/O latency during boot. This was confirmed by cross-referencing 12+ other posts in this repository that consistently use `-k3` for this command.

## Review Notes
- The writeback cache configuration (`rbd_cache`, `rbd_cache_size`) is set via `rbd config image set`, which stores the settings as image-level metadata read by librbd clients. The cache operates client-side (on the hypervisor/VM host), not on the OSD. The post doesn't explicitly state this, but the configuration is correct.
- The 67108864 byte value correctly equals 64 MB (64 × 1024 × 1024).
- The QoS parameters (`rbd_qos_iops_limit`, `rbd_qos_read_iops_limit`) are valid librbd QoS config options introduced in Ceph Nautilus.
- The clone workflow (snap create → snap protect → clone) follows the correct required sequence for RBD clone-based provisioning.
- The CephBlockPool YAML structure is correct and matches the Rook CRD specification.
