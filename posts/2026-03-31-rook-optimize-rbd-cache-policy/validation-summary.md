# Validation Summary: How to Optimize RBD Cache Policy in Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (RADOS Block Device / librbd)
- RBD client-side caching (writeback and writethrough modes)
- Ceph CLI (`ceph config`, `rbd config`)
- Rook (Ceph operator for Kubernetes)
- Kubernetes StorageClass and CSI driver (ceph-csi)

## Sources Consulted
- Ceph official documentation on RBD client-side caching and librbd configuration options (https://docs.ceph.com/en/latest/rbd/rbd-config-ref/)
- Ceph configuration reference for `rbd_cache*` parameters (https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/)
- Rook documentation on Ceph toolbox and cluster configuration (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)
- ceph-csi documentation on StorageClass parameters and ConfigMap format (https://github.com/ceph/ceph-csi)

## Issues Found

1. **Misleading Rook StorageClass / CSI ConfigMap section**: The original section title "Configuring in Rook StorageClass" and its introductory text claimed to show how to set RBD cache parameters in the StorageClass and pass librbd options via the CSI ConfigMap. However, neither YAML example actually configured any cache settings — the StorageClass was a standard RBD provisioning config, and the CSI ConfigMap only contained cluster/monitor identification. RBD cache parameters are set at the Ceph cluster level using `ceph config set`, not in the StorageClass or CSI ConfigMap. Fixed by rewriting the section to correctly explain that cache config is done at the cluster level via the Rook toolbox pod, and repositioning the StorageClass YAML as reference rather than a cache configuration mechanism. Removed the misleading CSI ConfigMap example entirely.

2. **Incorrect terminology "image features"**: The text said "disable per-image using image features" when describing the `rbd config image set` command. Image features in Ceph refer to capabilities like `layering`, `exclusive-lock`, `object-map`, etc. The `rbd config image set` command sets a per-image configuration override, not an image feature. Fixed the wording to "per-image configuration override."

## Review Notes
- The default values listed in the parameter table (rbd_cache_size = 32 MiB, rbd_cache_max_dirty = 24 MiB, rbd_cache_target_dirty = 16 MiB, rbd_cache_max_dirty_age = 1.0s, rbd_cache_writethrough_until_flush = true) are correct for current Ceph releases.
- The `ceph daemon client.<id> perf dump` monitoring command is correct in approach, though the specific perf counter names (`librbd.cache_reads`, `librbd.cache_read_hits`) are presented as hints rather than exact references. The actual counter namespace format is `librbd-<image_id>-<pool_name>`, and counter names may vary by Ceph version.
- The `ceph.conf` format correctly uses spaces instead of underscores for config key names, which is the expected format for that file.
- All byte values in the configuration commands are arithmetically correct (67108864 = 64 MiB, 50331648 = 48 MiB, 33554432 = 32 MiB).
