# Validation Summary: How to Configure RBD Caching for Performance

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- Rook (Ceph operator for Kubernetes)
- librbd in-process cache (writeback/writethrough)
- RBD persistent write log cache (PWL)
- Kubernetes CSI StorageClass
- Ceph CLI (`ceph config set`, `rbd config image set`, `rbd perf image iostat`)

## Sources Consulted
- Ceph official documentation: RBD Config Reference (docs.ceph.com/en/latest/rbd/rbd-config-ref/) — cache option names, defaults, and descriptions
- Ceph official documentation: RBD Persistent Write Log Cache (docs.ceph.com/en/latest/rbd/rbd-persistent-write-log-cache/) — persistent cache setup, required plugins, and valid modes
- Ceph source code: `src/tools/rbd/action/Perf.cc` — valid `rbd perf image` subcommands and output field names
- ceph-csi project StorageClass examples — verifying which parameters are supported in CSI StorageClass

## Issues Found

1. **Incorrect CLI command `rbd perf image stats`**: This is not a valid user-facing CLI command. The correct command is `rbd perf image iostat`. Fixed the command in the Monitoring section.

2. **Wrong output field names `rd_bytes` and `rd_wr_bytes`**: The actual `rbd perf image iostat` output columns are `read_bytes` and `write_bytes` (displayed as `RD_BYTES` and `WR_BYTES`). There is no field called `rd_wr_bytes`. Fixed the field names and corrected the interpretation.

3. **Misleading StorageClass section text**: The original text stated "Pass cache parameters via CSI storage class to apply per-PVC" but the YAML contained no cache parameters. RBD cache settings (`rbd_cache_*`) are Ceph-level config options and cannot be passed through Kubernetes StorageClass parameters. Fixed the intro text to clarify that RBD caching is configured at the Ceph config level and the StorageClass provides complementary filesystem mount options (`noatime`, `nodiratime`).

4. **Missing required `rbd_plugins` setting for persistent cache**: The persistent cache section omitted the prerequisite `ceph config set client rbd_plugins pwl_cache` command. Without this plugin enabled, the persistent cache will not activate regardless of the other settings. Added the missing command.

## Review Notes
- `rbd_cache` defaults to `true` in Ceph, so the first command (`ceph config set client rbd_cache true`) is technically redundant. However, explicitly setting it is a valid defensive practice and was left as-is.
- The persistent cache also requires the `exclusive-lock` image feature on the RBD image. The post does not mention this, but the default `imageFeatures: layering` in the StorageClass would need to be updated to include `exclusive-lock` for persistent cache to work. This is not fixed since it's an enhancement rather than an error in the existing content.
- The persistent cache `rbd_persistent_cache_path` and `rbd_persistent_cache_size` settings are shown using `rbd config image set` (per-image), but the cache path is a node-local filesystem setting that is more appropriately set globally via `ceph config set client`. This is not strictly wrong (the command works) but could be misleading in practice.
