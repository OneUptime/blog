# Validation Summary: How to Configure Tune OSD Memory in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (BlueStore OSD memory management)
- Kubernetes (resource limits, kubectl)

## Sources Consulted
- Ceph official documentation on BlueStore config options (osd_memory_target, osd_memory_cache_min, bluestore_cache_autotune, bluestore_cache_size_hdd)
- Ceph documentation on `ceph tell` vs `ceph daemon` admin socket commands
- Rook documentation on CephCluster CRD spec (resources, storage.config, storage.nodes)

## Issues Found
1. **`ceph daemon` used from toolbox pod (3 occurrences)**: `ceph daemon osd.0` requires access to the OSD process's admin socket, which only exists inside the OSD pod itself. The Rook toolbox pod does not have access to OSD admin sockets. Changed all `ceph daemon osd.0` commands to `ceph tell osd.0`, which communicates over the monitor connection and works from any pod with Ceph client access (including the toolbox).
2. **Incorrect grep target for cache usage**: In the "Apply Configuration via Ceph Toolbox" section, the command grepped for `"bluefs"` but the context was checking BlueStore cache usage. Changed to `"bluestore_cache"` to match the relevant perf counters for cache monitoring.

## Review Notes
- All byte value calculations are correct (4 GiB = 4294967296, 5 GiB = 5368709120, 8 GiB = 8589934592, 2 GiB = 2147483648, 512 MiB = 536870912, 1 GiB = 1073741824).
- The default `osd_memory_target` of 4 GiB is correct for modern Ceph releases (Nautilus+).
- The CephCluster CRD YAML structure is correct for current Rook versions.
- The recommended formula (K8s memory limit - 1 GiB overhead) is reasonable guidance.
- The workload sizing recommendations in the table are reasonable general guidelines.
